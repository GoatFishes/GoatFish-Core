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
     * @param {string} bot_id Unique name to identifyt the bot
     */
    app.use(route.get('/', async (ctx) => {
        try {
            let keys
            let margin
            let exchangeModule
            let topic = "margin"
            let bot_id = await ctx.request.query.bot_id

            logEvent(LOG_LEVELS.info, RESPONSE_CODES.LOG_MESSAGE_ONLY, `Validating the payload`)
            const payload = ctx.checkPayload(ctx, 'margin')
            if (!payload) {
                throw new ExceptionHandler(RESPONSE_CODES.APPLICATION_ERROR, 'PAYLOAD ISSUE : ' + global.jsonErrorMessage)
            }

            try {
                bot_id == "null" ? keys = await selectAllKeys() : keys = await selectKeysByBotId([bot_id])
                for (let i = 0; i < keys.length; i++) {

                    logEvent(LOG_LEVELS.info, RESPONSE_CODES.LOG_MESSAGE_ONLY, `Loading the ${keys[i].exchange} module`)
                    exchangeModule = require(`../exchanges/${keys[i].exchange}/${keys[i].exchange}`)

                    logEvent(LOG_LEVELS.info, RESPONSE_CODES.LOG_MESSAGE_ONLY, `Getting margin from ${keys[i].exchange} api`)
                    let params = {
                        "keys": keys[i].bot_key
                    }
                    margin = await exchangeModule.getMargin(params)

                    logEvent(LOG_LEVELS.info, RESPONSE_CODES.LOG_MESSAGE_ONLY, `Push information to kafka`)
                    let marginObject = {
                        bot_id: keys[i].bot_id,
                        exchange: keys[i].exchange,
                        data: margin
                    }
                    kafkaProduce(topic, marginObject)
                }
            } catch (e) { reject(e) }

        } catch (e) { throw new ExceptionHandler(RESPONSE_CODES.APPLICATION_ERROR, 'Margin retrieval failed with fatal error:' + e) }


        ctx.status = 200
        ctx.body = {
            data: "OK"
        }
    }))

    return app
}
