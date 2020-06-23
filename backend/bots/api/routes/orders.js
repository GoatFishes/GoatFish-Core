const Koa = require('koa')
const route = require('koa-route')
const logEvent = require('../utils/logger')
const { consumer } = require('../utils/kafkaConsumer')
const ExceptionHandler = require('../utils/ExceptionHandler')
const { LOG_LEVELS, RESPONSE_CODES } = require('../utils/constants')
const { selectOrders, updateOrderStatus } = require('../utils/database/db')

let orderInfo
let botPosition
let orderObject
let botSet = []
let ordersID = []
let orderSet = []



module.exports = async () => {
    const app = new Koa()

    /**
     * Summary    Get the Orders for all the aggregated bots or any given id, by reading from kafka
     */
    app.use(route.get('/get', async (ctx) => {
        try {
            logEvent(LOG_LEVELS.info, RESPONSE_CODES.LOG_MESSAGE_ONLY, `Validating the payload`)
            const payload = ctx.checkPayload(ctx, 'orders')
            if (!payload) {
                throw new ExceptionHandler(RESPONSE_CODES.APPLICATION_ERROR, 'PAYLOAD ISSUE : ' + global.jsonErrorMessage)
            }

            logEvent(LOG_LEVELS.info, RESPONSE_CODES.LOG_MESSAGE_ONLY, `Fetching all orders from the database`)
            orderInfo = await selectOrders()
            for (let i = 0; i < orderInfo.length; i++) {
                ordersID.push(orderInfo[i].order_id)
            }


            logEvent(LOG_LEVELS.info, RESPONSE_CODES.LOG_MESSAGE_ONLY, `Initialising Kafka consumer`)
            messages = await consumer("orders")

            logEvent(LOG_LEVELS.info, RESPONSE_CODES.LOG_MESSAGE_ONLY, `Processing Kafka respose`)
            await processOrder(messages)

            orderInfo = await selectOrders()

            logEvent(LOG_LEVELS.info, RESPONSE_CODES.LOG_MESSAGE_ONLY, `Building response object`)
            for (let i = 0; i < orderInfo.length; i++) {
                if (!botSet.includes(orderInfo[i].botId)) {
                    botSet.push(orderInfo[i].botId)
                    botPosition = botSet.indexOf(orderInfo[i].botId);
                    orderSet.push({ bot_id: orderInfo[i].bot_id, orders: { open: [], filled: [] } })

                    if (orderInfo[i].order_status == "Filled") {
                        orderSet[botPosition].orders.filled.push(orderInfo[i])
                    }
                    else if (orderInfo[i].order_status == "Open") {
                        orderSet[botPosition].orders.open.push(orderInfo[i])
                    }
                }
                else if (botSet.includes(orderInfo[i].botId)) {
                    botPosition = botSet.indexOf(orderInfo[i].botId);
                    if (orderInfo[i].order_status == "Filled") {
                        orderSet[botPosition].orders.filled.push(orderInfo[i])
                    }
                    else if (orderInfo[i].order_status == "Open") {
                        orderSet[botPosition].orders.open.push(orderInfo[i])
                    }
                }
            }
        } catch (e) { throw new ExceptionHandler(RESPONSE_CODES.APPLICATION_ERROR, 'Fatal error on order retrieval : ' + e) }


        ctx.status = 200,
            ctx.body = {
                data: orderSet
            }
    }))

    return app
}

processOrder = async (message) => {
    logEvent(LOG_LEVELS.info, RESPONSE_CODES.LOG_MESSAGE_ONLY, `Parsing kafka messages`)
    for (let i = 0; i < message.length; i++) {
        orderObject = JSON.parse(message[i].value)

        // We dont add orders here, since this is meant exclusively as a getter 
        // For reference orders should be added to the table **exclusively** when they are sent to the exchange
        for (let i = 0; i < orderObject.data.length; i++) {
            if ((ordersID.includes(orderObject.data[i].orderID)) && (orderObject.data[i].ordStatus != orderInfo[i].order_status)) {
                logEvent(LOG_LEVELS.info, RESPONSE_CODES.LOG_MESSAGE_ONLY, `Updating orders table`)
                await updateOrderStatus([orderObject.data[i].ordStatus, orderObject.data[i].orderID])
            }
        }
    }
}
