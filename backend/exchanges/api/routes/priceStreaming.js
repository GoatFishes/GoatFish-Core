// Import the WebFramework for routing
const Koa = require('koa')
const route = require('koa-route')
const logEvent = require('../utils/logger')
const { selectKeysByExchange, insertWebsocket } = require('../utils/database/db')
const ExceptionHandler = require('../utils/ExceptionHandler')
const { LOG_LEVELS, RESPONSE_CODES } = require('../utils/constants')


module.exports = async () => {
    const app = new Koa()
    
    /**
     * Summary    Endpoint to watch additional coin pairings for a specific exchange
     * @param {string} exchange Exchange the api keys belong to
     * @param {string} asset Name of the pair we want to start watching
     * @param {string} time_frame candle size and frequency we want to watch for the specified asset
     */
    app.use(route.post('/add', async (ctx) => {
        const payload = ctx.checkPayload(ctx, 'priceStreaming')
        try {
            logEvent(LOG_LEVELS.info, RESPONSE_CODES.LOG_MESSAGE_ONLY, `Validating the payload`)
            if (!payload) {
                throw new ExceptionHandler(RESPONSE_CODES.APPLICATION_ERROR, 'PAYLOAD ISSUE : ' + global.jsonErrorMessage)
            }

            let status = await insertWebsocket([payload.exchange, payload.asset, payload.time_frame])
            if (status == true) {
                logEvent(LOG_LEVELS.info, RESPONSE_CODES.LOG_MESSAGE_ONLY, `Retrieving exchange keys`)
                exchangeInfo = await selectKeysByExchange([payload.exchange])

                logEvent(LOG_LEVELS.info, RESPONSE_CODES.LOG_MESSAGE_ONLY, `Loading exchange module`)
                exchangeModule = require(`../exchanges/${exchangeInfo[0].exchange}/${exchangeInfo[0].exchange}`)

                logEvent(LOG_LEVELS.info, RESPONSE_CODES.LOG_MESSAGE_ONLY, `Calling the initiliazation of price stream for ${payload.time_frame}${payload.asset}`)
                params = { "keys": exchangeInfo[0].exchange_key, "time_frame": payload.time_frame, "asset": payload.asset }
                exchangeModule.streamPrice(params)

            }
            else { throw new ExceptionHandler(RESPONSE_CODES.APPLICATION_ERROR, 'Backtesting failed with fatal error: Websocket already exists') }

        } catch (e) { throw new ExceptionHandler(RESPONSE_CODES.APPLICATION_ERROR, 'Websocket addition failed with fatal error:' + e) }

        ctx.status = 200,
            ctx.body = {
                data: {
                    asset: payload.asset,
                    time_frame: payload.time_frame,
                    exchange: payload.exchange
                }
            }
    }))

    return app
}