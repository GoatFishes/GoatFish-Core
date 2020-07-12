const Koa = require('koa')
const route = require('koa-route')
const logEvent = require('../utils/logger')
const ExceptionHandler = require('../utils/ExceptionHandler')
const { kafkaProduce } = require('../utils/kafkaProducer')
const { LOG_LEVELS, RESPONSE_CODES } = require('../utils/constants')
const { selectAllKeys, selectKeysByBotId, selectLatestOrder, updateOrderStatus } = require('../utils/database/db')

module.exports = async () => {
    const app = new Koa()

    /**
     * Retrive all the orders from Bitmex and and commit the results to kafka
     * 
     * @param {string} botId Unique name to identifyt the bot
     * @param {string} type determine the type of order we want to retrieve
     * 
     * @returns A success message for the retrieval and pushing of the orders into kafka
     */
    app.use(route.get('/', async (ctx) => {
        try {
            let order = []
            const total = []
            const type = await ctx.request.query.type
            const botId = await ctx.request.query.botId

            logEvent(LOG_LEVELS.info, RESPONSE_CODES.LOG_MESSAGE_ONLY, `Validating the payload`)
            ctx.checkPayload(ctx, 'empty')

            let keys
            logEvent(LOG_LEVELS.info, RESPONSE_CODES.LOG_MESSAGE_ONLY, `Select bot keys`)
            if (botId === "null") {
                keys = await selectAllKeys()
            } else {
                keys = await selectKeysByBotId([botId])
            }

            for (let i = 0; i < keys.length; i += 1) {
                logEvent(LOG_LEVELS.info, RESPONSE_CODES.LOG_MESSAGE_ONLY, `Loading the ${keys[i].exchange} module`)

                const exchangeModule = require(`../exchanges/${keys[i].exchange}/${keys[i].exchange}`)

                logEvent(LOG_LEVELS.info, RESPONSE_CODES.LOG_MESSAGE_ONLY, `Getting the latest order for ${keys[i].exchange}`)

                let date = await selectLatestOrder([botId])

                if (!date) {
                    logEvent(LOG_LEVELS.info, RESPONSE_CODES.LOG_MESSAGE_ONLY, `Assigning default date`)
                    date = "2017-01-01T12:30:00.000Z"
                }

                logEvent(LOG_LEVELS.info, RESPONSE_CODES.LOG_MESSAGE_ONLY, `Retrieve bot keys`)
                const key = keys[i].bot_key

                logEvent(LOG_LEVELS.info, RESPONSE_CODES.LOG_MESSAGE_ONLY, `Get orders from ${keys[i].exchange}`)
                const orderResponse = await ordersRecursion({ keys: key, date, type, exchangeModule, total })
                order = order.concat.apply([], orderResponse.total)

                logEvent(LOG_LEVELS.info, RESPONSE_CODES.LOG_MESSAGE_ONLY, `Make order call`)
                const orderObject = {
                    botId: keys[i].bot_id,
                    exchange: keys[i].exchange,
                    data: order
                }

                logEvent(LOG_LEVELS.info, RESPONSE_CODES.LOG_MESSAGE_ONLY, `Push order call results to Kafka`)
                await kafkaProduce("orders", orderObject)
            }
            logEvent(LOG_LEVELS.info, RESPONSE_CODES.LOG_MESSAGE_ONLY, `Await for all orders to be registered`)

            ctx.status = 200
            ctx.body = {
                data: "OK"
            }
        } catch (e) { throw new ExceptionHandler(RESPONSE_CODES.APPLICATION_ERROR, `Order retrieval failed with fatal error: ${e}`) }
    }))


    /**
     * Set an order in the exchange
     * 
     * @param {string}  botId Unique name to identify the bot
     * @param {string}  symbol Order pair
     * @param {integer}  orderQty Order quantity in units of the instrument
     * @param {string} side Order side. Valid options: Buy, Sell
     * @param {string} orderType Order type. Valid options: Market, Limit, Stop, StopLimit, MarketIfTouched, LimitIfTouched, Pegged
     * @param {string} timeInForce Time in force. Valid options: Day, GoodTillCancel, ImmediateOrCancel, FillOrKill
     * @param {string} execInstructions Optional execution instructions. Valid options: ParticipateDoNotInitiate, AllOrNone, MarkPrice, IndexPrice, LastPrice, Close, ReduceOnly, Fixed 
     * @param {float} stopPrice Optional trigger price for 'Stop', 'StopLimit', 'MarketIfTouched', and 'LimitIfTouched' orders
     * @param {float} price Optional limit price for 'Limit', 'StopLimit', and 'LimitIfTouched' orders
     * 
     * @returns An object specifying all the details for the correct setting of an order
     */
    app.use(route.post('/set', async (ctx) => {
        try {
            logEvent(LOG_LEVELS.info, RESPONSE_CODES.LOG_MESSAGE_ONLY, `Validating the payload`)
            const payload = ctx.checkPayload(ctx, 'setOrder')
            const keys = await selectKeysByBotId([payload.botId])

            logEvent(LOG_LEVELS.info, RESPONSE_CODES.LOG_MESSAGE_ONLY, `Loading the ${keys[0].exchange} module`)
            const exchangeModule = require(`../exchanges/${keys[0].exchange}/${keys[0].exchange}`)

            const key = keys[0].bot_key

            logEvent(LOG_LEVELS.info, RESPONSE_CODES.LOG_MESSAGE_ONLY, `Setting an order for the ${payload.botId} strategy, on the ${payload.symbol} pair with a quantity of ${payload.orderQty}`)
            const params = { keys: key, symbol: payload.symbol, execInstructions: payload.execInstructions, orderType: payload.orderType, timeInForce: payload.timeInForce, stopPrice: payload.stopPrice, price: payload.price, orderQty: payload.orderQty, side: payload.side }

            const order = await exchangeModule.setOrders(params)

            ctx.status = 200
            ctx.body = {
                data: {
                    botId: payload.botId
                    , exchange: keys[0].exchange
                    , orderId: order.orderID
                    , timeStamp: order.timestamp
                    , orderStatus: order.ordStatus
                    , side: order.side
                    , orderQuantity: order.orderQty
                    , price: order.price
                }
            }

        } catch (e) { throw new ExceptionHandler(RESPONSE_CODES.APPLICATION_ERROR, `Order setting failed with fatal error: ${e}`) }
    }))

    /**
     * Cancel a given Order
     * 
     * @param {string}  botId Unique name to identify the bot
     * @param {string}  orderId Order side
     * 
     * @returns An Object specifying all the details for the correct cancellation of an order
     */
    app.use(route.post('/cancel', async (ctx) => {
        try {
            logEvent(LOG_LEVELS.info, RESPONSE_CODES.LOG_MESSAGE_ONLY, `Validating the payload`)
            const payload = ctx.checkPayload(ctx, 'cancelOrder')

            const keys = await selectKeysByBotId([payload.botId])

            logEvent(LOG_LEVELS.info, RESPONSE_CODES.LOG_MESSAGE_ONLY, `Loading the ${keys[0].exchange} module`)

            const exchangeModule = require(`../exchanges/${keys[0].exchange}/${keys[0].exchange}`)

            const key = keys[0].bot_key

            logEvent(LOG_LEVELS.info, RESPONSE_CODES.LOG_MESSAGE_ONLY, `Cancelling an order for the ${payload.botId} strategy, with order id ${payload.orderId}`)
            const params = { keys: key, orderId: payload.orderId }

            const order = await exchangeModule.cancelOrders(params)
            await updateOrderStatus([order[0].ordStatus, payload.orderId])

            ctx.status = 200
            ctx.body = {
                data: {
                    botId: payload.botId
                    , exchange: keys[0].exchange
                    , orderId: order[0].orderID
                    , timeStamp: order[0].timestamp
                    , orderStatus: order[0].ordStatus
                    , side: order[0].side
                    , orderQuantity: order[0].orderQty
                    , price: order[0].price
                }
            }
        } catch (e) { throw new ExceptionHandler(RESPONSE_CODES.APPLICATION_ERROR, `Order cancellation failed with fatal error: ${e}`) }
    }))

    return app
}


/**
 * Set an order in the exchange
 * 
 * @param {string} key An object containing the api key id and secret
 * @param {date} date Date from which we wish to retrive an order
 * @param {string} exchangeModule The loded module to make the order calls
 * @param {Array} total An array persisted trhough out the rescursion keeping track of all the orders retrieved
 * 
 * @returns An object specifying all the given orders
 */
const ordersRecursion = async (params) => {
    const { keys, date, exchangeModule, total } = params

    let orders = await exchangeModule.getOrders({ keys, date })
    const ordersLength = orders.length
    const latest = orders[ordersLength - 1].timestamp
    orders = [].concat(orders)
    total.push(orders)

    // 500 is the maximum length allowed by the API. This nuber will default to the LCM of all the exhanges.
    if (ordersLength < 500) {
        logEvent(LOG_LEVELS.info, RESPONSE_CODES.LOG_MESSAGE_ONLY, `All orders retrived`)
        return orders
    }

    logEvent(LOG_LEVELS.info, RESPONSE_CODES.LOG_MESSAGE_ONLY, `Call for more orders`)
    await ordersRecursion({ date: latest, keys })

    const updatedValues = {
        orders,
        total
    }

    return updatedValues
}
