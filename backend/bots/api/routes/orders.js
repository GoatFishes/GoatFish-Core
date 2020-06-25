const Koa = require('koa')
const route = require('koa-route')
const logEvent = require('../utils/logger')
const { consumer } = require('../utils/kafkaConsumer')
const ExceptionHandler = require('../utils/ExceptionHandler')
const { LOG_LEVELS, RESPONSE_CODES } = require('../utils/constants')
const { selectOrders, updateOrderStatus } = require('../utils/database/db')





module.exports = async () => {
    const app = new Koa()

    /**
     * Get the orders for all the aggregated bots or any given id, by reading from kafka
     */
    app.use(route.get('/get', async (ctx) => {
        try {
            const ordersId = []
            logEvent(LOG_LEVELS.info, RESPONSE_CODES.LOG_MESSAGE_ONLY, `Validating the payload`)
            ctx.checkPayload(ctx, 'empty')

            logEvent(LOG_LEVELS.info, RESPONSE_CODES.LOG_MESSAGE_ONLY, `Fetching all orders from the database`)
            let orderInfo = await selectOrders()
            for (let i = 0; i < orderInfo.length; i += 1) {
                ordersId.push(orderInfo[i].order_id)
            }


            logEvent(LOG_LEVELS.info, RESPONSE_CODES.LOG_MESSAGE_ONLY, `Initialising Kafka consumer`)
            const messages = await consumer("orders")

            logEvent(LOG_LEVELS.info, RESPONSE_CODES.LOG_MESSAGE_ONLY, `Processing Kafka respose`)
            await processOrder({messages, orderInfo, ordersId})

            orderInfo = await selectOrders()

            logEvent(LOG_LEVELS.info, RESPONSE_CODES.LOG_MESSAGE_ONLY, `Building response object`)
            let botPosition
            const botSet = []
            const orderSet = []
            for (let i = 0; i < orderInfo.length; i += 1) {
                if (!botSet.includes(orderInfo[i].botId)) {
                    botSet.push(orderInfo[i].botId)
                    botPosition = botSet.indexOf(orderInfo[i].botId);
                    orderSet.push({ bot_id: orderInfo[i].bot_id, orders: { open: [], filled: [] } })

                    if (orderInfo[i].order_status === "Filled") {
                        orderSet[botPosition].orders.filled.push(orderInfo[i])
                    }
                    else if (orderInfo[i].order_status === "Open") {
                        orderSet[botPosition].orders.open.push(orderInfo[i])
                    }
                }
                else if (botSet.includes(orderInfo[i].botId)) {
                    botPosition = botSet.indexOf(orderInfo[i].botId);
                    if (orderInfo[i].order_status === "Filled") {
                        orderSet[botPosition].orders.filled.push(orderInfo[i])
                    }
                    else if (orderInfo[i].order_status === "Open") {
                        orderSet[botPosition].orders.open.push(orderInfo[i])
                    }
                }
            }
            ctx.status = 200
            ctx.body = {
                data: orderSet
            }
        } catch (e) { throw new ExceptionHandler(RESPONSE_CODES.APPLICATION_ERROR, `Fatal error on order retrieval : ${e}`) }
    }))

    return app
}

const processOrder = async (params) => {
    const {messages, ordersId, orderInfo} = params
    logEvent(LOG_LEVELS.info, RESPONSE_CODES.LOG_MESSAGE_ONLY, `Parsing kafka messages`)
    for (let i = 0; i < messages.length; i += 1) {
        const orderObject = JSON.parse(messages[i].value)

        // We dont add orders here, since this is meant exclusively as a getter 
        // For reference orders should be added to the table **exclusively** when they are sent to the exchange
        for (let j = 0; j < orderObject.data.length; j += 1) {
            if ((ordersId.includes(orderObject.data[j].orderID)) && (orderObject.data[j].ordStatus !== orderInfo[j].order_status)) {
                logEvent(LOG_LEVELS.info, RESPONSE_CODES.LOG_MESSAGE_ONLY, `Updating orders table`)
                await updateOrderStatus([orderObject.data[j].ordStatus, orderObject.data[j].orderID])
            }
        }
    }
}
