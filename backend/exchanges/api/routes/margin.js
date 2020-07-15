const Koa = require('koa')
const route = require('koa-route')
const logEvent = require('../utils/logger')
const { kafkaProduce } = require('../utils/kafkaProducer')
const ExceptionHandler = require('../utils/ExceptionHandler')
const { LOG_LEVELS, RESPONSE_CODES } = require('../utils/constants')
const { selectAllKeys, selectKeysByBotId } = require('../utils/database/db')

module.exports = async () => {
    const app = new Koa()

    /**
     * Summary    Retrive The margin from all the different bots and commit the results to kafka
     * @param {string} botId Unique name to identifyt the bot
     */
    app.use(route.get('/', async (ctx) => {
        try {
            let keys
            let margin
            let exchangeModule
            const topic = "margin"
            const botId = await ctx.request.query.botId

            logEvent(LOG_LEVELS.info, RESPONSE_CODES.LOG_MESSAGE_ONLY, `Validating the payload`)
            ctx.checkPayload(ctx, 'empty')

            logEvent(LOG_LEVELS.info, RESPONSE_CODES.LOG_MESSAGE_ONLY, `Retrieving access keys`)
            if (botId === undefined){
                keys = await selectAllKeys()
            } else {
                keys = await selectKeysByBotId([botId])
            }

            for (let i = 0; i < keys.length; i += 1) {
                logEvent(LOG_LEVELS.info, RESPONSE_CODES.LOG_MESSAGE_ONLY, `Loading the ${keys[i].exchange} module`)
                exchangeModule = require(`../exchanges/${keys[i].exchange}/${keys[i].exchange}`)

                logEvent(LOG_LEVELS.info, RESPONSE_CODES.LOG_MESSAGE_ONLY, `Getting margin from ${keys[i].exchange} api`)
                const params = {
                    "keys": keys[i].bot_key
                }
                margin = await exchangeModule.getMargin(params)

                logEvent(LOG_LEVELS.info, RESPONSE_CODES.LOG_MESSAGE_ONLY, `Push information to kafka`)
                const marginObject = {
                    botId: keys[i].botId,
                    exchange: keys[i].exchange,
                    data: margin
                }
                kafkaProduce(topic, marginObject)
            }
            ctx.status = 200
            ctx.body = {
                data: "OK"
            }
        } catch (e) { throw new ExceptionHandler(RESPONSE_CODES.APPLICATION_ERROR, `Margin retrieval failed with fatal error: ${e}`) }
    }))

    return app
}
