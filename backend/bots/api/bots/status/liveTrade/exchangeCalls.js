const chai = require("chai")
const logEvent = require('../../utils/logger')
const { fetchLinkBody } = require('../../utils/fetcher')
const { marginFormula } = require('../../utils/analytics')
const { insertOrder } = require('../../utils/database/db')
const ExceptionHandler = require('../../utils/ExceptionHandler')
const { LOG_LEVELS, RESPONSE_CODES } = require('../../utils/constants')

/**
 * Make the appropriate exchange calls to execute the strategy
 * 
 * @param {object} strategyObject Contains all the necessary information to execute the trades [execute, symbol, leverage, side, orderQty, price, orderType, timeInForce]
 * @param {object} liveLeverageObject Contains a mapping of a pair to its current leverage
 * @param {object} side Direction of the order [Long/Short]
 * @param {object} price Price of the order is USD
 * @param {object} symbol Symbol of the pair the bot will submit the order for
 * @param {object} leverage Leverage amount the order will be submitted with 
 * @param {object} orderQty Amount of contracts to be traded
 * @param {object} orderType Order type [Limit/Market]
 * @param {object} timeInForce Determines how long the trade will be available
 * 
 * @returns {object} updated liveLeverageObject
 */
const exchangeCalls = async (params) => {
    try {
        const { side, price, symbol, leverage, orderQty, orderType, timeInForce, liveLeverageObject } = params.strategyObject

        logEvent(LOG_LEVELS.info, RESPONSE_CODES.LOG_MESSAGE_ONLY, `Keep track of all the symbol leverages`)
        if (!(symbol in liveLeverageObject)) { liveLeverageObject[symbol] = leverage }

        logEvent(LOG_LEVELS.info, RESPONSE_CODES.LOG_MESSAGE_ONLY, `Determine whether we have to modify leverage for the pair`)
        if (liveLeverageObject[symbol] !== leverage) {

            logEvent(LOG_LEVELS.info, RESPONSE_CODES.LOG_MESSAGE_ONLY, `Request a leverage modification to the exchange`)
            const leverageBody = { botId: process.env.BOTNAME, symbol, leverage: parseInt(leverage) }
            const updatedLeverage = await setLiveLeverage({ leverageBody, liveLeverageObject })
            liveLeverageObject[leverageBody.symbol] = updatedLeverage.leverage
        }

        logEvent(LOG_LEVELS.info, RESPONSE_CODES.LOG_MESSAGE_ONLY, `Submit order to the exchange`)
        const orderBody = { botId: process.env.BOTNAME, symbol, orderType, timeInForce, price, orderQty, side }
        await setLiveOrder({ orderBody, liveLeverageObject })

        return { liveLeverageObject }
    } catch (e) { throw new ExceptionHandler(RESPONSE_CODES.APPLICATION_ERROR, `Fatal error on live order setting : ${e}`) }
}

/**
 * A recursive function to ensure the new leverage for a given symbol is set correctly
 * 
 * @param {object} leverageBody Contains all the necessary information to execute the leverage change [symbol, leverage]
 * @param {object} liveLeverageObject Contains all the symbols and their respective leverage [botId, symbol, leverage]
 */
const setLiveLeverage = async (params) => {
    try {
        const { leverageBody, liveLeverageObject } = params
        const res = await fetchLinkBody('http://exchanges_api:3003/exchanges/positions/leverage', leverageBody, 'POST')
        if (chai.expect(res.data.leverage).to.eql(leverageBody.leverage)) {
            liveLeverageObject[leverageBody.symbol] = res.data.leverage
        }
        else {
            await setLiveLeverage(params)
        }
        return { leverage: res.data.leverage }
    } catch (e) { throw new ExceptionHandler(RESPONSE_CODES.APPLICATION_ERROR, `Fatal error on live leverage setting : ${e}`) }

}

/**
 * A recursive function to ensure the orderCall is executed
 * 
 * @param {object} orderBody Contains all the necessary information to execute the order [botId, symbol, orderType, timeInForce, price, orderQty, orderType, side]
 * @param {object} liveLeverageObject Object of arrays with the last 50 price points divided in HLOCV
 */
const setLiveOrder = async (params) => {
    try {

        const { orderBody, liveLeverageObject } = params

        const res = await fetchLinkBody('http://exchanges_api:3003/exchanges/orders/set', orderBody, 'POST')

        if (chai.expect(res.data).to.have.property('side') &&
            chai.expect(res.data).to.have.property('price') &&
            chai.expect(res.data).to.have.property('exchange') &&
            chai.expect(res.data).to.have.property('order_id') &&
            chai.expect(res.data).to.have.property('time_stamp') &&
            chai.expect(res.data).to.have.property('order_status') &&
            chai.expect(res.data).to.have.property('order_quantity')) {

            logEvent(LOG_LEVELS.info, RESPONSE_CODES.LOG_MESSAGE_ONLY, `Calculating margin for the order`)
            const margin = await marginFormula({ orderQty: orderBody.orderQty, price: orderBody.price, leverage: orderBody.leverage })

            logEvent(LOG_LEVELS.info, RESPONSE_CODES.LOG_MESSAGE_ONLY, `Insert succesful order placement into the database`)
            await insertOrder([process.env.BOTNAME, res.data.exchange, res.data.order_id, null, res.data.time_stamp, res.data.order_status, res.data.side, res.data.order_quantity, res.data.price, margin, liveLeverageObject[orderBody.symbol], orderBody.orderType, null])
        }
        else {
            await setLiveOrder(params)
        }
        return
    } catch (e) { throw new ExceptionHandler(RESPONSE_CODES.APPLICATION_ERROR, `Fatal error setting live order : ${e}`) }
}

module.exports = { exchangeCalls }
