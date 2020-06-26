const BTC_STD_DEV = 69.46
const BTC_MEAN_RETURN = 21.60
const { insertPerformance } = require('./database/db') 

/**
 * Calculates the margin in BTC 
 *
 * @param {float} orderQty float Amount of ontracts for a given position
 * @param {float} price  Price at which the order was executed
 * @param {integer} leverage  Leverage the order was sent at
 * @param {float} fee_type  Market or limit fee deping on whether theorder dded or removed liquidity from the order book
 * 
 * @returns {integer} margin defined in BTC with eight decimal points
 */
const marginFormula = async (params) => {
    const margin = ((1 / parseInt(params.leverage)) * (parseInt(params.orderQty) / params.price))
    return margin
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
    const BUY = "Buy"
    const LONG = "Long"
    const SHORT = "Short"
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

module.exports = { marginFormula, avgReturn, avgTime, setVars }
