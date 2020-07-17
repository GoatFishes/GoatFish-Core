const Koa = require('koa')
const route = require('koa-route')
const logEvent = require('../utils/logger')
const ExceptionHandler = require('../utils/ExceptionHandler')
const { LOG_LEVELS, RESPONSE_CODES } = require('../utils/constants')
const { insertBotKeys, insertExchangeKeys } = require('../utils/database/db')

module.exports = async () => {
    const app = new Koa()

    /**
     * Uploads a set of default bitmex API keys to the database for miscellaneous operation
     * 
     * @param {string} botId Unique name for the bot
     * @param {string} apiKeyId Key id for the API
     * @param {string} apiKeySecret Secret for the API
     * @param {string} exchange Exchange the api keys belong to
     * 
     * @returns Confirmation the keys have been added to the database
     */
    app.use(route.post('/upload/bots', async (ctx) => {
        try {
            logEvent(LOG_LEVELS.info, RESPONSE_CODES.LOG_MESSAGE_ONLY, `Validating the payload`)
            const payload = ctx.checkPayload(ctx, 'keyBotUpload')

            const api = {
                apiKeyID: payload.apiKeyId,
                apiKeySecret: payload.apiKeySecret
            }

            logEvent(LOG_LEVELS.info, RESPONSE_CODES.LOG_MESSAGE_ONLY, `Inserting bot keys into the database`)
            await insertBotKeys([payload.botId, api, payload.exchange])
        }
        catch (e) { throw new ExceptionHandler(RESPONSE_CODES.APPLICATION_ERROR, `Upload issue : ${e}`) }
        ctx.status = 200
        ctx.body = {
            data: "OK"
        }
    }))

    /**
     * Uploads a set of default bitmex API keys to the database for miscellaneous operation
     * 
     * @param {string} exchange Exchange the api keys belong to
     * @param {string} apiKeyId Key id for the API
     * @param {string} apiKeySecret Secret for the API
     * 
     * @returns Confirmation the keys have been added to the database
     */
    app.use(route.post('/upload/exchange', async (ctx) => {
        try {
            logEvent(LOG_LEVELS.info, RESPONSE_CODES.LOG_MESSAGE_ONLY, `Validating the payload`)
            const payload = ctx.checkPayload(ctx, 'keyExchangeUpload')

            const api = {
                apiKeyID: payload.apiKeyId,
                apiKeySecret: payload.apiKeySecret
            }

            logEvent(LOG_LEVELS.info, RESPONSE_CODES.LOG_MESSAGE_ONLY, `Inserting exchange keys into the database`)
            await insertExchangeKeys([payload.exchange, api])
        }
        catch (e) { throw new ExceptionHandler(RESPONSE_CODES.APPLICATION_ERROR, `UPLOAD ISSUE : ${e}`) }

        ctx.status = 200
        ctx.body = {
            data: "OK"
        }
    }))

    return app
}
