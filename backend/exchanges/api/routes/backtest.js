const Koa = require('koa')
const route = require('koa-route')
const uuid = require('uuid-random')
const logEvent = require('../utils/logger')
const { kafkaProduce } = require('../utils/kafkaProducer')
const { getCurrentTime } = require('../utils/timeHandler')
const ExceptionHandler = require('../utils/ExceptionHandler')
const { LOG_LEVELS, RESPONSE_CODES } = require('../utils/constants')
const { selectKeysByBotId, selectLatestPriceHistory, insertPriceHistory } = require('../utils/database/db')

module.exports = async () => {
    const app = new Koa()

    /**
     * Query the historic price of a specific asset for a given time_frame
     * 
     * @param {string} bin_size bin_size of the candles: 1m, 15m, 1h, 1d 
     * @param {string} endTime The time you would like to stop retriving the price data  
     * @param {string} symbol The asset we want to retrive the historic data of
     * @param {string} bot_id The bot we will be using the historic data on
     * 
     * @returns 
     */
    app.use(route.post('/price', async (ctx) => {
        try {

            const uuidProcess = await uuid()
            let order
            let progress
            let endTime
            let startTime
            let progressObjectString
            const progressTopic = "requestState"

            logEvent(LOG_LEVELS.info, RESPONSE_CODES.LOG_MESSAGE_ONLY, `Validating the payload`)
            const payload = ctx.checkPayload(ctx, 'backtest')

            const keys = await selectKeysByBotId([payload.bot_id])
            const exchangeModule = require(`../exchanges/${keys[0].exchange}/${keys[0].exchange}`)

            // **************************** //
            //        Time structure        //
            //          ISO 8601            //
            // **************************** //

            const priceHistory = await selectLatestPriceHistory([payload.bin_size, payload.symbol, keys[0].exchange])

            if (priceHistory.length) {
                startTime = (priceHistory[0]._timestamp).toISOString();
            } else {
                startTime = "2017-01-01T12:30:00.000Z"
            }

            if (payload.endTime != null) {
                endTime = payload.endTime
            } else {
                endTime = await getCurrentTime()
            }

            // Set a refereence to the start date since this will change through out the lifecycle of the request
            const timeRef = startTime

            logEvent(LOG_LEVELS.info, RESPONSE_CODES.LOG_MESSAGE_ONLY, `Process with UIID: ${uuidProcess} has started the backtesting task`)

            while (startTime < endTime) {

                const params = {
                    keys: keys[0].bot_key,
                    bin_size: payload.bin_size,
                    startTime,
                    endTime,
                    symbol: payload.symbol
                }

                order = await exchangeModule.getHistory(params)

                for (let i = 0; i < order.length; i += 1) {
                    await insertPriceHistory([params.symbol, payload.bin_size, keys[0].exchange, order[i].timestamp, order[i].open, order[i].close, order[i].high, order[i].low, order[i].volume])
                }

                progress = ((startTime - timeRef) / (endTime - timeRef) * 100).toFixed(2)
                progressObjectString = { progress, uuid: uuidProcess }
                await kafkaProduce(progressTopic, progressObjectString)
                startTime = order[order.length - 1].timestamp
            }

            progressObjectString = { progress: 100, uuid: uuidProcess }
            await kafkaProduce(progressTopic, progressObjectString)
            logEvent(LOG_LEVELS.info, RESPONSE_CODES.LOG_MESSAGE_ONLY, `Process with UIID: ${uuidProcess} has completed the backtesting task`)

            ctx.status = 202
            ctx.body = {
                data: {
                    uuid: uuidProcess,
                    message: "Processing the backtest"
                }
            }
        } catch (e) { throw new ExceptionHandler(RESPONSE_CODES.APPLICATION_ERROR, 'Margin retrieval failed with fatal error:' + e) }
    }))

    return app
}
