const Koa = require('koa')
const route = require('koa-route')
const uuid = require('uuid-random')
const logEvent = require('../utils/logger')
const ExceptionHandler = require('../utils/ExceptionHandler')
const { LOG_LEVELS, RESPONSE_CODES } = require('../utils/constants')
const { kafkaProduce } = require('../utils/kafkaProducer')
const { getCurrentTime } = require('../utils/timeHandler')
const { selectKeysByBotId, selectLatestPriceHistory, insertPriceHistory } = require('../utils/database/db')

sleep = m => new Promise(r => setTimeout(r, m))


module.exports = async () => {
    const app = new Koa()

    /**
     * Summary    Query the historic price of a specific asset for a given time_frame.
     * @param {string} bin_size bin_size of the candles: 1m, 15m, 1h, 1d 
     * @param {string} end_time The time you would like to stop retriving the price data  
     * @param {string} symbol The asset we want to retrive the historic data of
     * @param {string} bot_id The bot we will be using the historic data on
     */
    app.use(route.post('/price', async (ctx) => {
        let uuid_process = await uuid()

        try {
            let order
            let progress
            let end_time
            let start_time
            let progressObjectString
            let progressTopic = "requestState"

            logEvent(LOG_LEVELS.info, RESPONSE_CODES.LOG_MESSAGE_ONLY, `Validating the payload`)
            const payload = ctx.checkPayload(ctx, 'backtest')
            if (!payload) {
                throw new ExceptionHandler(RESPONSE_CODES.APPLICATION_ERROR, 'PAYLOAD ISSUE : ' + global.jsonErrorMessage)
            }

            let backtest = new Promise(async (resolve, reject) => {
                let keys = await selectKeysByBotId([payload.bot_id])
                const exchangeModule = require(`../exchanges/${keys[0].exchange}/${keys[0].exchange}`)

                //****************************//
                //        Time structure      //
                //          ISO 8601          //
                //****************************//

                let priceHistory = await selectLatestPriceHistory([payload.bin_size, payload.symbol, keys[0].exchange])

                if (priceHistory.length) {
                    start_time = (priceHistory[0]._timestamp).toISOString();
                } else { start_time = "2017-01-01T12:30:00.000Z" }

                if (payload.end_time != null) { end_time = payload.end_time } else { end_time = await getCurrentTime() }

                // Set a refereence to the start date since this will change through out the lifecycle of the request
                let timeRef = start_time

                logEvent(LOG_LEVELS.info, RESPONSE_CODES.LOG_MESSAGE_ONLY, `Process with UIID: ${uuid_process} has started the backtesting task`)

                while (start_time < end_time) {

                    let params = {
                        keys: keys[0].bot_key,
                        bin_size: payload.bin_size,
                        start_time: start_time,
                        end_time: end_time,
                        symbol: payload.symbol
                    }

                    order = await exchangeModule.getHistory(params)

                    for (let i = 0; i < order.length; i++) {
                        await insertPriceHistory([params.symbol, payload.bin_size, keys[0].exchange, order[i].timestamp, order[i].open, order[i].close, order[i].high, order[i].low, order[i].volume])
                    }

                    progress = ((start_time - timeRef) / (end_time - timeRef) * 100).toFixed(2)
                    progressObjectString = { progress: progress, uuid: uuid_process }
                    await kafkaProduce(progressTopic, progressObjectString)
                    start_time = order[order.length - 1].timestamp
                }

                progressObjectString = { progress: 100, uuid: uuid_process }
                await kafkaProduce(progressTopic, progressObjectString)
                logEvent(LOG_LEVELS.info, RESPONSE_CODES.LOG_MESSAGE_ONLY, `Process with UIID: ${uuid_process} has completed the backtesting task`)
                resolve()
            })

            backtest

        } catch (e) { throw new ExceptionHandler(RESPONSE_CODES.APPLICATION_ERROR, 'Backtesting failed with fatal error: ' + e) }

        ctx.status = 202
        ctx.body = {
            data: {
                uuid: uuid_process,
                message: "Processing the backtest"
            }
        }
    }))

    return app
}
