const Koa = require('koa')
const route = require('koa-route')
const logEvent = require('../utils/logger')
const { errorHandling } = require('../utils/errorHandling')
const ExceptionHandler = require('../utils/ExceptionHandler')
const { kafkaProduce } = require('../utils/kafkaProducer')
const { LOG_LEVELS, RESPONSE_CODES } = require('../utils/constants')
const { selectAllKeys, selectKeysByBotId, selectLatestOrder, updateOrderStatus } = require('../utils/database/db')


// Global vars for recursion purposes
let orders
let order = []
let total = []
let exchangeModule

module.exports = async () => {
    const app = new Koa()

    /**
     * Summary    Retrive all the orders from Bitmex and and commit the results to kafka
     * @param {string} bot_id Unique name to identifyt the bot
     * @param {string} type determine the type of order we want to retrieve
     */
    app.use(route.get('/', async (ctx) => {
        try {
            let type = await ctx.request.query.type
            let bot_id = await ctx.request.query.bot_id

            logEvent(LOG_LEVELS.info, RESPONSE_CODES.LOG_MESSAGE_ONLY, `Validating the payload`)
            const payload = ctx.checkPayload(ctx, 'orders')
            if (!payload) {
                throw new ExceptionHandler(RESPONSE_CODES.APPLICATION_ERROR, 'PAYLOAD ISSUE : ' + global.jsonErrorMessage)
            }

            let keys
            let topic = "orders"

            let orderCall = new Promise(async (resolve, reject) => {
                try {
                    logEvent(LOG_LEVELS.info, RESPONSE_CODES.LOG_MESSAGE_ONLY, `Select bot keys`)
                    bot_id == "null" ? keys = await selectAllKeys() : keys = await selectKeysByBotId([bot_id])
                    for (let i = 0; i < keys.length; i++) {
                        logEvent(LOG_LEVELS.info, RESPONSE_CODES.LOG_MESSAGE_ONLY, `Loading the ${keys[i].exchange} module`)

                        exchangeModule = require(`../exchanges/${keys[i].exchange}/${keys[i].exchange}`)

                        logEvent(LOG_LEVELS.info, RESPONSE_CODES.LOG_MESSAGE_ONLY, `Getting the latest order for ${keys[i].exchange}`)

                        let date = await selectLatestOrder([bot_id])

                        if (!date) {
                            logEvent(LOG_LEVELS.info, RESPONSE_CODES.LOG_MESSAGE_ONLY, `Assigning default date`)
                            date = "2017-01-01T12:30:00.000Z"
                        }

                        logEvent(LOG_LEVELS.info, RESPONSE_CODES.LOG_MESSAGE_ONLY, `Retrieve bot keys`)
                        let key = keys[i].bot_key

                        let exchangeOrderCall = new Promise(async (resolve, reject) => {
                            try {
                                logEvent(LOG_LEVELS.info, RESPONSE_CODES.LOG_MESSAGE_ONLY, `Get orders from ${keys[i].exchange}`)
                                order = await ordersRecursion({ keys: key, date: date, type: type })
                                order = order.concat.apply([], total)
                            } catch (e) { reject(e) }
                            finally { resolve(order) }
                        })

                        logEvent(LOG_LEVELS.info, RESPONSE_CODES.LOG_MESSAGE_ONLY, `Make order call`)
                        await exchangeOrderCall.then(async () => {
                            let orderObject = {
                                bot_id: keys[i].bot_id,
                                exchange: keys[i].exchange,
                                data: order
                            }
                            order = []
                            total = []

                            logEvent(LOG_LEVELS.info, RESPONSE_CODES.LOG_MESSAGE_ONLY, `Push order call results to Kafka`)
                            await kafkaProduce(topic, orderObject)

                        }).catch(async function (e) {
                            await errorHandling(e)
                        })
                    }
                    resolve()
                } catch (e) { reject(e) }
            })

            logEvent(LOG_LEVELS.info, RESPONSE_CODES.LOG_MESSAGE_ONLY, `Await for all orders to be registered`)

            await orderCall
        } catch (e) { throw new ExceptionHandler(RESPONSE_CODES.APPLICATION_ERROR, 'Order retrieval failed with fatal error: ' + e) }

        ctx.status = 200
        ctx.body = {
            data: "OK"
        }
    }))


    /**
     * Summary    Set an order in the exchange
     * @param {string}  bot_id Unique name to identify the bot
     * @param {string}  symbol Order pair
     * @param {integer} exec_instructions Optional execution instructions. Valid options: ParticipateDoNotInitiate, AllOrNone, MarkPrice, IndexPrice, LastPrice, Close, ReduceOnly, Fixed.     
     * @param {string}  order_type Order type. Valid options: Market, Limit, Stop, StopLimit, MarketIfTouched, LimitIfTouched, Pegged.
     * @param {string}  time_in_force Time in force. Valid options: Day, GoodTillCancel, ImmediateOrCancel, FillOrKill.
     * @param {integer} stop_price Optional trigger price for 'Stop', 'StopLimit', 'MarketIfTouched', and 'LimitIfTouched' orders.       
     * @param {string}  price Optional limit price for 'Limit', 'StopLimit', and 'LimitIfTouched' orders.
     * @param {string}  order_qty Order quantity in units of the instrument
     * @param {integer} side Order side. Valid options: Buy, Sell.      
     */
    app.use(route.post('/set', async (ctx) => {
        let keys
        let orderData

        try {
            logEvent(LOG_LEVELS.info, RESPONSE_CODES.LOG_MESSAGE_ONLY, `Validating the payload`)
            const payload = ctx.checkPayload(ctx, 'setOrder')
            if (!payload) {
                throw new ExceptionHandler(RESPONSE_CODES.APPLICATION_ERROR, 'PAYLOAD ISSUE : ' + global.jsonErrorMessage)
            }

            let setOrder = new Promise(async (resolve, reject) => {
                try {
                    keys = await selectKeysByBotId([payload.bot_id])

                    logEvent(LOG_LEVELS.info, RESPONSE_CODES.LOG_MESSAGE_ONLY, `Loading the ${keys[0].exchange} module`)
                    exchangeModule = require(`../exchanges/${keys[0].exchange}/${keys[0].exchange}`)

                    let key = keys[0].bot_key

                    logEvent(LOG_LEVELS.info, RESPONSE_CODES.LOG_MESSAGE_ONLY, `Setting an order for the ${payload.bot_id} strategy, on the ${payload.symbol} pair with a quantity of ${payload.order_qty}`)
                    let params = {
                        "keys": key,
                        "symbol": payload.symbol,
                        "exec_instructions": payload.exec_instructions,
                        "order_type": payload.order_type,
                        "time_in_force": payload.time_in_force,
                        "stop_price": payload.stop_price,
                        "price": payload.price,
                        "order_qty": payload.order_qty,
                        "side": payload.side
                    }

                    order = await exchangeModule.setOrders(params)
                    let data = {
                        exchange: keys[0].exchange
                        , order_id: order.orderID
                        , time_stamp: order.timestamp
                        , order_status: order.ordStatus
                        , side: order.side
                        , order_quantity: order.orderQty
                        , price: order.price
                    }

                    let setOrderObject = {
                        "bot_id": payload.bot_id,
                        "data": data
                    }

                    resolve(setOrderObject)
                } catch (e) { reject(e) }
            })

            logEvent(LOG_LEVELS.info, RESPONSE_CODES.LOG_MESSAGE_ONLY, `Await for new leverage to be registered`)
            orderData = await setOrder

        } catch (e) { throw new ExceptionHandler(RESPONSE_CODES.APPLICATION_ERROR, 'Order setting failed with fatal error: ' + e) }

        ctx.status = 200
        ctx.body = {
            data: {
                bot_id: orderData.bot_id
                , exchange: orderData.data.exchange
                , order_id: orderData.data.order_id
                , time_stamp: orderData.data.time_stamp
                , order_status: orderData.data.order_status
                , side: orderData.data.side
                , order_quantity: orderData.data.order_quantity
                , price: orderData.data.price
            }
        }
    }))

    /**
     * Summary    Cancel a given Order
     * @param {string}  bot_id Unique name to identify the bot
     * @param {string}  order_id Order side
     */
    app.use(route.post('/cancel', async (ctx) => {
        let orderData
        let keys
        try {
            logEvent(LOG_LEVELS.info, RESPONSE_CODES.LOG_MESSAGE_ONLY, `Validating the payload`)
            const payload = ctx.checkPayload(ctx, 'cancelOrder')
            if (!payload) {
                throw new ExceptionHandler(RESPONSE_CODES.APPLICATION_ERROR, 'PAYLOAD ISSUE : ' + global.jsonErrorMessage)
            }

            let cancelOrder = new Promise(async (resolve, reject) => {
                try {
                    keys = await selectKeysByBotId([payload.bot_id])

                    logEvent(LOG_LEVELS.info, RESPONSE_CODES.LOG_MESSAGE_ONLY, `Loading the ${keys[0].exchange} module`)

                    exchangeModule = require(`../exchanges/${keys[0].exchange}/${keys[0].exchange}`)

                    let key = keys[0].bot_key

                    logEvent(LOG_LEVELS.info, RESPONSE_CODES.LOG_MESSAGE_ONLY, `Cancelling an order for the ${payload.bot_id} strategy, with order id ${payload.order_id}`)

                    let params = {
                        "keys": key,
                        "order_id": payload.order_id,
                    }

                    order = await exchangeModule.cancelOrders(params)
                    await updateOrderStatus([order[0].ordStatus, payload.order_id])

                    let data = {
                        exchange: keys[0].exchange
                        , order_id: order[0].orderID
                        , time_stamp: order[0].timestamp
                        , order_status: order[0].ordStatus
                        , side: order[0].side
                        , order_quantity: order[0].orderQty
                        , price: order[0].price
                    }

                    let setOrderObject = {
                        "bot_id": payload.bot_id,
                        "data": data
                    }

                    resolve(setOrderObject)
                }
                catch (e) { reject(e) }
            })

            orderData = await cancelOrder
        } catch (e) { throw new ExceptionHandler(RESPONSE_CODES.APPLICATION_ERROR, 'Order cancellation failed with fatal error: ' + e) }

        ctx.status = 200
        ctx.body = {
            data: {
                bot_id: orderData.bot_id
                , exchange: orderData.data.exchange
                , order_id: orderData.data.order_id
                , time_stamp: orderData.data.time_stamp
                , order_status: orderData.data.order_status
                , side: orderData.data.side
                , order_quantity: orderData.data.order_quantity
                , price: orderData.data.price
            }
        }
    }))

    return app
}


/**
 * Summary    Set an order in the exchange
 * @param {string} key An object containing the api key id and secret
 * @param {date} date date from whihc we wish to retrive an order
 * @param {string} type The state oft he orde we will retrive Open/Closed          
 */
ordersRecursion = async (params) => {
    let orderCollection = new Promise(async (resolve, reject) => {
        try {
            orders = await exchangeModule.getOrders(params)

            let ordersLength = orders.length

            let latest = orders[ordersLength - 1].timestamp

            orders = [].concat.apply([], orders)

            total.push(orders)

            // 500 is the maximum length allowed by the API. This nuber will default to the LCM of all the exhanges.
            if (ordersLength < 500) {
                logEvent(LOG_LEVELS.info, RESPONSE_CODES.LOG_MESSAGE_ONLY, `All orders retrived`)
                resolve()
                return
            }
            let recursion = new Promise(async (resolve, reject) => {
                try {
                    logEvent(LOG_LEVELS.info, RESPONSE_CODES.LOG_MESSAGE_ONLY, `Call for more orders`)
                    await ordersRecursion(latest, params.keys)
                    resolve()
                }
                catch (e) { reject(e) }
                finally { resolve() }
            })
            await recursion

        }
        catch (e) { reject(e) }
        finally { resolve() }
    })

    await orderCollection

    return orders
}
