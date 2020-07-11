const Koa = require('koa')
const route = require('koa-route')
const logEvent = require('../utils/logger')
const ExceptionHandler = require('../utils/ExceptionHandler')
const { LOG_LEVELS, RESPONSE_CODES } = require('../utils/constants')
const { selectKeysByExchange, insertWebsocket } = require('../utils/database/db')

module.exports = async () => {
    const app = new Koa()
    
    /**
     * Endpoint to watch additional coin pairings for a specific exchange
     * 
     * @param {string} exchange Exchange the api keys belong to
     * @param {string} asset Name of the pair we want to start watching
     * @param {string} time_frame candle size and frequency we want to watch for the specified asset
     * 
     * @returns An object specifying the websocket information that we just added
     */
    app.use(route.post('/add', async (ctx) => {
        try {
            logEvent(LOG_LEVELS.info, RESPONSE_CODES.LOG_MESSAGE_ONLY, `Validating the payload`)
            const payload = ctx.checkPayload(ctx, 'priceStreaming')


            const status = await insertWebsocket([payload.exchange, payload.asset, payload.timeFrame])
            if (status === true) {
                logEvent(LOG_LEVELS.info, RESPONSE_CODES.LOG_MESSAGE_ONLY, `Retrieving exchange keys`)
                const exchangeInfo = await selectKeysByExchange([payload.exchange])

                logEvent(LOG_LEVELS.info, RESPONSE_CODES.LOG_MESSAGE_ONLY, `Loading exchange module`)
                const exchangeModule = require(`../exchanges/${exchangeInfo[0].exchange}/${exchangeInfo[0].exchange}`)

                logEvent(LOG_LEVELS.info, RESPONSE_CODES.LOG_MESSAGE_ONLY, `Calling the initiliazation of price stream for ${payload.timeFrame}${payload.asset}`)
                const params = { "keys": exchangeInfo[0].exchange_key, "timeFrame": payload.timeFrame, "asset": payload.asset }
                exchangeModule.streamPrice(params)

            }
            else { throw new ExceptionHandler(RESPONSE_CODES.APPLICATION_ERROR, 'Failed with fatal error: Websocket already exists') }
            ctx.status = 200
            ctx.body = {
                data: {
                    asset: payload.asset,
                    timeFrame: payload.timeFrame,
                    exchange: payload.exchange
                }
            }
        } catch (e) { throw new ExceptionHandler(RESPONSE_CODES.APPLICATION_ERROR, `Websocket addition failed with fatal error: ${e}`) }
    }))

    return app
}