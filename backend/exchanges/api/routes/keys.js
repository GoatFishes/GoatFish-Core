const Koa = require('koa')
const route = require('koa-route')
const logEvent = require('../utils/logger')
const ExceptionHandler = require('../utils/ExceptionHandler')
const { LOG_LEVELS, RESPONSE_CODES } = require('../utils/constants')
let { insertBotKeys, insertExchangeKeys } = require('../utils/database/db')

module.exports = async () => {
    const app = new Koa()

    /**
     * Summary    Uploads an set of default bitmex API keys to the database for miscellaneous operation.
     * @param {string} bot_id Unique name for the bot
     * @param {string} api_key_id Key id for the API
     * @param {string} api_key_secret Secret for the API
     * @param {string} exchange Exchange the api keys belong to
     */
    app.use(route.post('/upload/bots', async (ctx) => {
        try {
            logEvent(LOG_LEVELS.info, RESPONSE_CODES.LOG_MESSAGE_ONLY, `Validating the payload`)
            const payload = ctx.checkPayload(ctx, 'keyBotUpload')
            if (!payload) {
                throw new ExceptionHandler(RESPONSE_CODES.APPLICATION_ERROR, 'PAYLOAD ISSUE : ' + global.jsonErrorMessage)
            }

            let api = {
                apiKeyID: payload.api_key_id,
                apiKeySecret: payload.api_key_secret
            }

            logEvent(LOG_LEVELS.info, RESPONSE_CODES.LOG_MESSAGE_ONLY, `Inserting bot keys into the database`)
            await insertBotKeys([payload.bot_id, api, payload.exchange])
        }
        catch (e) { throw new ExceptionHandler(RESPONSE_CODES.APPLICATION_ERROR, 'UPLOAD ISSUE : ' + global.jsonErrorMessage) }
        ctx.status = 200
        ctx.body = {
            data: "OK"
        }
    }))

    /**
     * Summary    Uploads an set of default bitmex API keys to the database for miscellaneous operation.
     * @param {string} exchange Exchange the api keys belong to
     * @param {string} api_key_id Key id for the API
     * @param {string} api_key_secret Secret for the API
     */
    app.use(route.post('/upload/exchange', async (ctx) => {
        try {
            logEvent(LOG_LEVELS.info, RESPONSE_CODES.LOG_MESSAGE_ONLY, `Validating the payload`)
            const payload = ctx.checkPayload(ctx, 'keyExchangeUpload')
            if (!payload) {
                throw new ExceptionHandler(RESPONSE_CODES.APPLICATION_ERROR, 'PAYLOAD ISSUE : ' + global.jsonErrorMessage)
            }

            let api = {
                apiKeyID: payload.api_key_id,
                apiKeySecret: payload.api_key_secret
            }

            logEvent(LOG_LEVELS.info, RESPONSE_CODES.LOG_MESSAGE_ONLY, `Inserting exchange keys into the database`)
            await insertExchangeKeys([payload.exchange, api])
        }
        catch (e) { throw new ExceptionHandler(RESPONSE_CODES.APPLICATION_ERROR, 'UPLOAD ISSUE : ' + global.jsonErrorMessage) }

        ctx.status = 200
        ctx.body = {
            data: "OK"
        }
    }))

    return app
}
