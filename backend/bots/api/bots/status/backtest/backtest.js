const logEvent = require('../../utils/logger')
const ExceptionHandler = require('../../utils/ExceptionHandler')
const { testStats } = require(`./backtestAnalyser.js`)
const { strategy } = require(`../../strategies/${process.env.BOTNAME}`)
const { LOG_LEVELS, RESPONSE_CODES } = require('../../utils/constants')
const { addTrade, cleanTrade, selectAllPriceHistory } = require('../../utils/database/db')

/**
 * Cleans all the previous backtesting information first and the proceeds to perform a backtest based on the bots strategy
 * 
 * @param {string} timeFrame Binsize for the candles we will be retrieving
 * @param {string} symbol Symbol to watch
 * @param {string} exchange Exchnage from which we will be retrieving the calls
 * 
 * @todo Remove the clean trade, we want to keep the history of a backtest, we don't want to keep all the trades for a backtest also add and delete by botId
 */
const backtest = async (params) => {
    try {
        const { timeFrame, symbol, exchange } = params
        const low = []
        const high = []
        const open = []
        const close = []
        const timestamp = []

        let counter = 0
        let allTrades = []
        let strategyObject = {}

        logEvent(LOG_LEVELS.info, RESPONSE_CODES.LOG_MESSAGE_ONLY, `Clean backtest trade history`)
        await cleanTrade()

        logEvent(LOG_LEVELS.info, RESPONSE_CODES.LOG_MESSAGE_ONLY, `Select all past pricePoints already stored in the databse`)
        const pricePoints = await selectAllPriceHistory([timeFrame, symbol, exchange])

        logEvent(LOG_LEVELS.info, RESPONSE_CODES.LOG_MESSAGE_ONLY, `Populate arrays with the historic pricePoints and execute strategy`)
        for (let i = 0; i < pricePoints.length; i += 1) {
            open.push(pricePoints[i]._open)
            close.push(pricePoints[i]._close)
            high.push(pricePoints[i]._high)
            low.push(pricePoints[i]._low)

            timestamp.push((pricePoints[i]._timestamp).toISOString())
            strategyObject = await strategy({ open, close, high, low, timestamp })

            if (strategyObject.execute === true) {
                logEvent(LOG_LEVELS.info, RESPONSE_CODES.LOG_MESSAGE_ONLY, `Executing a trade`)
                allTrades.push(strategyObject)

                counter += 1

                if (counter === 1000) {
                    logEvent(LOG_LEVELS.info, RESPONSE_CODES.LOG_MESSAGE_ONLY, `Persisting a subset of trades`)
                    await addTrade(allTrades)
                    allTrades = []
                    counter = 0
                }
            }
        }
        logEvent(LOG_LEVELS.info, RESPONSE_CODES.LOG_MESSAGE_ONLY, `Persist remaining orders to the database`)
        await addTrade(allTrades)

        logEvent(LOG_LEVELS.info, RESPONSE_CODES.LOG_MESSAGE_ONLY, `Get analytics on all the trades the strategy has performed`)
        await testStats()

    } catch (e) { throw new ExceptionHandler(RESPONSE_CODES.APPLICATION_ERROR, `Fatal error on status set : ${e}`) }
}

module.exports = { backtest }
