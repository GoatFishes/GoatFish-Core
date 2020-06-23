const Koa = require('koa')
const route = require('koa-route')
const logEvent = require('../utils/logger')
const ExceptionHandler = require('../utils/ExceptionHandler')
const { LOG_LEVELS, RESPONSE_CODES } = require('../utils/constants')
const { selectAllKeys, selectKeysByBotId } = require('../utils/database/db')

module.exports = async () => {
    const app = new Koa()

    /**
     * Summary    Retrive all the positions from Bitmex and and commit the results to kafka
     * @param {string} bot_id Unique name to identify the bot
     * @param {string} symbol Identify the position we want to open a ws for
     */
    app.use(route.get('/', async (ctx) => {
        try {
            let keys
            let positions = []
            let bot_id = await ctx.request.query.bot_id
            let symbol = await ctx.request.query.symbol

            logEvent(LOG_LEVELS.info, RESPONSE_CODES.LOG_MESSAGE_ONLY, `Validating the payload`)
            const payload = ctx.checkPayload(ctx, 'positions')
            if (!payload) {
                throw new ExceptionHandler(RESPONSE_CODES.APPLICATION_ERROR, 'PAYLOAD ISSUE : ' + global.jsonErrorMessage)
            }

            let positionsCall = new Promise(async (resolve, reject) => {
                try {
                    logEvent(LOG_LEVELS.info, RESPONSE_CODES.LOG_MESSAGE_ONLY, `Retrieving bot keys`)
                    bot_id == "null" ? keys = await selectAllKeys() : keys = await selectKeysByBotId([bot_id])

                    for (let i = 0; i < keys.length; i++) {
                        logEvent(LOG_LEVELS.info, RESPONSE_CODES.LOG_MESSAGE_ONLY, `Loading the ${keys[i].exchange} module`)
                        exchangeModule = require(`../exchanges/${keys[i].exchange}/${keys[i].exchange}`)

                        let key = keys[i].bot_key
                        logEvent(LOG_LEVELS.info, RESPONSE_CODES.LOG_MESSAGE_ONLY, `Getting the open positions for ${keys[i].exchange}`)

                        positions = await exchangeModule.getPositions({ keys: key, bot_id: bot_id, symbol: symbol })
                    }

                    resolve()
                }
                catch (e) { reject(e) }
            })

            logEvent(LOG_LEVELS.info, RESPONSE_CODES.LOG_MESSAGE_ONLY, `Await for all open positions to be registered`)
            await positionsCall

        } catch (e) { throw new ExceptionHandler(RESPONSE_CODES.APPLICATION_ERROR, 'Position retrieval failed with fatal error: ' + e) }

        ctx.status = 200
        ctx.body = {
            data: "OK"
        }
    }))

    /**
     * Summary    Set the leverage for the positions
     * @param {string}  bot_id Unique name to identify the bot
     * @param {string}  symbol Identify the position we want to open a modify the leverage on
     * @param {integer} leverage Leverage change 
     */
    app.use(route.post('/leverage', async (ctx) => {
        try {

            const payload = ctx.checkPayload(ctx, 'leverage')
            if (!payload) {
                throw new ExceptionHandler(RESPONSE_CODES.APPLICATION_ERROR, 'PAYLOAD ISSUE : ' + global.jsonErrorMessage)
            }

            let keys
            let leverage

            let leverageSetting = new Promise(async (resolve, reject) => {
                try {
                    payload.bot_id == "null" ? keys = await selectAllKeys() : keys = await selectKeysByBotId([payload.bot_id])

                    for (let i = 0; i < keys.length; i++) {
                        logEvent(LOG_LEVELS.info, RESPONSE_CODES.LOG_MESSAGE_ONLY, `Loading the ${keys[i].exchange} module`)

                        exchangeModule = require(`../exchanges/${keys[i].exchange}/${keys[i].exchange}`)

                        let key = keys[i].bot_key

                        logEvent(LOG_LEVELS.info, RESPONSE_CODES.LOG_MESSAGE_ONLY, `Setting the desired leverage for ${payload.bot_id}, on the ${payload.symbol} pair`)

                        let params = {
                            "keys": key,
                            "symbol": payload.symbol,
                            "leverage": payload.leverage
                        }

                        leverage = await exchangeModule.setLeverage(params)
                    }

                    resolve(leverage)
                }
                catch (e) { reject(e) }
            })

            logEvent(LOG_LEVELS.info, RESPONSE_CODES.LOG_MESSAGE_ONLY, `Await for new leverage to be registered`)

            leverageData = await leverageSetting

        } catch (e) { throw new ExceptionHandler(RESPONSE_CODES.APPLICATION_ERROR, 'Leverage setting failed with fatal error: ' + e) }

        ctx.status = 200
        ctx.body = {
            data: {
                leverage: leverage.leverage
            }
        }
    }))

    return app
}
