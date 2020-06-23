// Import the WebFramework for routing
const Koa = require('koa')
const route = require('koa-route')
const logEvent = require('../utils/logger')
const { consumer } = require('../utils/kafkaConsumer')
const ExceptionHandler = require('../utils/ExceptionHandler')
const { LOG_LEVELS, RESPONSE_CODES } = require('../utils/constants')
const { selectMargin, insertMargin, updateBotMargin } = require('../utils/database/db')

let date
let parsedMessage
let exchange_list = []
let margin_response_object = {}

module.exports = async () => {
    const app = new Koa()

    /**
     * Summary    Get the margin for all the aggregated bots or any given, by reading from kafka
     */
    app.use(route.get('/', async (ctx) => {
        try {
            logEvent(LOG_LEVELS.info, RESPONSE_CODES.LOG_MESSAGE_ONLY, `Validating the payload`)
            const payload = ctx.checkPayload(ctx, 'margin')
            if (!payload) {
                throw new ExceptionHandler(RESPONSE_CODES.APPLICATION_ERROR, 'PAYLOAD ISSUE : ' + global.jsonErrorMessage)
            }
            
            logEvent(LOG_LEVELS.info, RESPONSE_CODES.LOG_MESSAGE_ONLY, `Detemine current day`)
            today = new Date()
            date = today.getFullYear() + '-' + (today.getMonth() + 1) + '-' + today.getDate()
            
            logEvent(LOG_LEVELS.info, RESPONSE_CODES.LOG_MESSAGE_ONLY, `Initialise Kafka consumer`)
            let messages = await consumer("margin")

            logEvent(LOG_LEVELS.info, RESPONSE_CODES.LOG_MESSAGE_ONLY, `Processing Kafka respose`)
            await processMargin(messages)
            console.log(4)

        } catch (e) { throw new ExceptionHandler(RESPONSE_CODES.APPLICATION_ERROR, 'Fatal error on margin retrieval : ' + e) }
    
        ctx.status = 200
        ctx.body = {
            data: {
                margin_response_object
            }
        }
    }))

    return app
}

processMargin = async (message) => {
    for (let i = 0; i < message.length; i++) {
        parsedMessage = JSON.parse(message[i].value)

        logEvent(LOG_LEVELS.info, RESPONSE_CODES.LOG_MESSAGE_ONLY, `Update bot Margin`)
        await updateBotMargin([parsedMessage.data.amount, parsedMessage.bot_id])

        console.log(1)

        logEvent(LOG_LEVELS.info, RESPONSE_CODES.LOG_MESSAGE_ONLY, `Log the Margin difference and price difference if it exists`)
        let currentMargin = await selectMargin([parsedMessage.data.amount, date])
        if (currentMargin == null) {
            await insertMargin([parsedMessage.data.amount, parsedMessage.bot_id, date])
        }

        console.log(2)

        logEvent(LOG_LEVELS.info, RESPONSE_CODES.LOG_MESSAGE_ONLY, `Build margin_response by grouping bots by their exchange`)
        if (!exchange_list.includes(parsedMessage.exchange)) {
            exchange_list.push(parsedMessage.exchange)
            exchange = parsedMessage.exchange
            margin_response_object[exchange] = []
            margin_response_object[exchange].push({ bot_id: `${parsedMessage.bot_id}`, amount: `${parsedMessage.data.amount}` })
        }        
        else if (exchange_list.includes(parsedMessage.exchange)) {
            exchange = parsedMessage.exchange
            margin_response_object[exchange] = []
            margin_response_object[exchange].push({ bot_id: `${parsedMessage.bot_id}`, amount: `${parsedMessage.data.amount}` })
        }
        console.log(3)

    }
}