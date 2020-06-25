const BUY = "Buy"
const LONG = "Long"
const SHORT = "Short"
const BTC_STD_DEV = 69.46
const BTC_MEAN_RETURN = 21.60
const logEvent = require('../../utils/logger')
const { marginFormula } = require('../../utils/analytics')
const ExceptionHandler = require('../../utils/ExceptionHandler')
const { LOG_LEVELS, RESPONSE_CODES } = require('../../utils/constants')
const { selectAllTrades, insertPerformance } = require('../../utils/database/db') 

/**
 * Test the trades that for the bot strategy after feeding the data from the backtest
 */
const testStats = async () => {
    try {
        let endTime = 0
        let startTime = 0
        let orderTimes = []
        let assignedMargin = 0
        let liberatedMargin = 0
        let numberOfOrders = 0
        let orderDirection = null
        let contractZeroCounter = 0
        let percentagePerformanceAverage = []

        logEvent(LOG_LEVELS.info, RESPONSE_CODES.LOG_MESSAGE_ONLY, `Retrieve all orders the backtest performed`)
        const allOrders = await selectAllTrades()
        console.log(allOrders)

        logEvent(LOG_LEVELS.info, RESPONSE_CODES.LOG_MESSAGE_ONLY, `Loop through the orders to get the info`)
        for (let orderNumber = 0; orderNumber < allOrders.length; orderNumber+=1) {
            const averageReturn = await avgReturn({ percentagePerformanceAverage, order: allOrders[orderNumber], assignedMargin, liberatedMargin, orderDirection, contractZeroCounter })
            orderDirection = averageReturn.orderDirection
            assignedMargin = averageReturn.assignedMargin
            liberatedMargin = averageReturn.liberatedMargin
            contractZeroCounter = averageReturn.contractZeroCounter
            percentagePerformanceAverage = averageReturn.percentagePerformanceAverage

            // The zeroCounter var is kept track of in the averageReturn
            const averageTime = await avgTime({ order: allOrders[orderNumber], endTime, startTime, contractZeroCounter,  orderTimes, numberOfOrders })
            endTime = averageTime.endTime
            startTime = averageTime.startTime
            orderTimes = averageTime.orderTimes

            numberOfOrders+=1
        }

        logEvent(LOG_LEVELS.info, RESPONSE_CODES.LOG_MESSAGE_ONLY, `Return the analised data`)
        setVars({ orderTimes, percentagePerformanceAverage, numberOfOrders })
    } catch (e) { throw new ExceptionHandler(RESPONSE_CODES.APPLICATION_ERROR, `Fatal error on backtest analysing : ${e}`) }

}

/**
 * Calculate the average time per position
 * 
 * @param {array} order Order to be analysed for its live time
 * @param {date} startTime Time stamp of the first order in a position
 * @param {date} endTime Timestamp of the last order in a position
 * @param {integer} contractZeroCounter Counter keeping track of the number of open contracts in a position
 * @param {integer} numberOfOrders The number of orders processes from open to close of a position
 * 
 * @returns {object}  Object containing the updated startTime, endTime, orderTimes, contractZeroCounter
 */
const avgTime = async function (params) {
    try {
        const { numberOfOrders, order, orderTimes, contractZeroCounter } = params
        let { endTime, startTime } = params
        if (numberOfOrders === 0) {
            startTime = order._timestamp
        }

        if (contractZeroCounter === 0) {
            if (startTime === 0) {
                startTime = order._timestamp
            }
            else {
                endTime = order._timestamp
                orderTimes.push((endTime - startTime) / 1000)

                startTime = 0
                endTime = 0
            }
        }


        return {
            startTime,
            endTime,
            orderTimes
        }
    } catch (e) { throw new ExceptionHandler(RESPONSE_CODES.APPLICATION_ERROR, `Fatal error on average time analyser :  ${e}`) }
}

/**
 * Calculate the average return per position. We use al the orders to synthetically build positions calculating profits along the way
 * 
 * @param {integer} order Order information to analyse
 * @param {string} orderDirection Direction of the order [Buy, Sell] 
 * @param {float} assignedMargin how much margin the order has accumulated
 * @param {float} liberatedMargin How much margin the order has liberated
 * @param {integer} contractZeroCounter Counter keeping track of the number of open contracts in a position
 * @param {integer} percentagePerformanceAverage Array keeping track of the performance for each of the positions
 * 
 * @returns {object}  Object containing the updated orderDirection, assignedMargin, liberatedMargin, contractZeroCounter
 */
const avgReturn = async (params) => {
    try {
        const orderQty = params.order.order_qty
        const { side, price, leverage } = params.order
        const { percentagePerformanceAverage } = params
        let { orderDirection, contractZeroCounter, assignedMargin, liberatedMargin } = params

        if (contractZeroCounter === 0) {
            if (side === BUY) {
                orderDirection = LONG
                contractZeroCounter += orderQty
                assignedMargin += await marginFormula({ orderQty, price, leverage })
            }
            else {
                orderDirection = SHORT
                contractZeroCounter -= orderQty
                assignedMargin += await marginFormula({ orderQty, price, leverage })
            }
        }

        else if (orderDirection === LONG) {
            if (side === BUY) {
                contractZeroCounter += orderQty
                assignedMargin += await marginFormula({ orderQty, price, leverage })
            }
            else {
                contractZeroCounter -= orderQty
                liberatedMargin += await marginFormula({ orderQty, price, leverage })
            }
        }

        else if (orderDirection === SHORT) {
            if (side === BUY) {
                contractZeroCounter += orderQty
                liberatedMargin += await marginFormula({ orderQty, price, leverage })
            }
            else {
                contractZeroCounter -= orderQty
                assignedMargin += await marginFormula({ orderQty, price, leverage })
            }
        }

        if (contractZeroCounter === 0) {
            const percentagePerformance = ((liberatedMargin / assignedMargin) * 100) - 100

            percentagePerformanceAverage.push(percentagePerformance)

            orderDirection = null
            assignedMargin = 0
            liberatedMargin = 0
        }

        return {
            orderDirection,
            assignedMargin,
            liberatedMargin,
            contractZeroCounter,
            percentagePerformanceAverage
        }
    } catch (e) { throw new ExceptionHandler(RESPONSE_CODES.APPLICATION_ERROR, `Fatal error on average return analyser :  ${e}`) }

}

/**
 * Set all the vars, revert all of them to default values and upload the results to the db
 * 
 * @param {array} orderTimes All the times it has take to open and close each of the bots positions
 * @param {array} percentagePerformanceAverage All the performances for the bot positions
 * @param {integer} numberOfOrders Number of orders executed in the backtest
 */
const setVars = async (params) => {
    try {
        const { orderTimes, percentagePerformanceAverage, numberOfOrders } = params
        
        const overallPerformance = (percentagePerformanceAverage.reduce((a, b) => a + b)).toFixed(2)
        const averageReturn = (percentagePerformanceAverage.reduce((a, b) => a + b) / percentagePerformanceAverage.length).toFixed(2)
        const bestOrder = (percentagePerformanceAverage.reduce((max, val) => Math.max(max, val), percentagePerformanceAverage[0])).toFixed(2)
        const worstOrder = (percentagePerformanceAverage.reduce((min, val) => Math.min(min, val), percentagePerformanceAverage[0])).toFixed(2)
        const avgTimePerOrder = (((orderTimes.reduce((a, b) => a + b) / orderTimes.length) / 60)).toFixed(2)
        const shortestOrder = ((orderTimes.reduce((min, val) => Math.min(min, val),orderTimes[0]) / 60)).toFixed(2)
        const longestOrder = ((orderTimes.reduce((max, val) => Math.max(max, val), orderTimes[0]) / 60)).toFixed(2)
        const sharpeRatio = ((overallPerformance - BTC_MEAN_RETURN) / BTC_STD_DEV).toFixed(2)

        await insertPerformance([avgTimePerOrder, averageReturn, overallPerformance, numberOfOrders, sharpeRatio, longestOrder, shortestOrder, bestOrder, worstOrder])
    } catch (e) { throw new ExceptionHandler(RESPONSE_CODES.APPLICATION_ERROR, `Fatal error backtest stats calculations : ${e}`) }
}

module.exports = { testStats }
