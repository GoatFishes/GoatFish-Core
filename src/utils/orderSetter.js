const uuid = require('uuid-random')
const { fetchLinkBody } = require('./fetcher')
const { marginFormula } = require('./analytics')
const ExceptionHandler = require('./ExceptionHandler')
const { LOG_LEVELS, RESPONSE_CODES } = require('./constants')
const { insertOrder, insertPaperOrder, selectKeysByBotId } = require('./database/db')

/**
 * A recursive function to ensure the new leverage for a given symbol is set correctly
 * 
 * @param {object} leverageBody Contains all the necessary information to execute the leverage change [symbol, leverage]
 * @param {object} leverageObject Contains all the symbols and their respective leverage [botId, symbol, leverage]
 */
const setLiveLeverage = async (params) => {
    try {
        const { leverageBody, leverageObject } = params
        const res = await fetchLinkBody('http://exchanges_api:3003/exchanges/positions/leverage', leverageBody, 'POST')
        if (res.data.leverage === leverageBody.leverage) {
            leverageObject[leverageBody.symbol] = res.data.leverage
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
 * @param {object} leverageObject Object of arrays with the last 50 price points divided in HLOCV
 */
const setLiveOrder = async (params) => {
    try {
        const { orderBody, leverageObject } = params
        const res = await fetchLinkBody('http://exchanges_api:3003/exchanges/orders/set', orderBody, 'POST')

        if (res.data.side != null &&
            res.data.price != null &&
            res.data.exchange != null &&
            res.data.orderId != null &&
            res.data.timeStamp != null &&
            res.data.orderStatus != null &&
            res.data.orderQuantity != null) {

            logEvent(LOG_LEVELS.info, RESPONSE_CODES.LOG_MESSAGE_ONLY, `Calculating margin for the order`)
            const margin = await marginFormula({ orderQty: orderBody.orderQty, price: orderBody.price, leverage: leverageObject[orderBody.symbol] })

            logEvent(LOG_LEVELS.info, RESPONSE_CODES.LOG_MESSAGE_ONLY, `Insert successful order placement into the database`)
            await insertOrder([process.env.BOTNAME, res.data.exchange, res.data.orderId, null, res.data.timeStamp, res.data.orderStatus, res.data.side, res.data.orderQuantity, res.data.price, margin, leverageObject[orderBody.symbol], orderBody.orderType, null])
        }
        else {
            await setLiveOrder(params)
        }
        return
    } catch (e) { throw new ExceptionHandler(RESPONSE_CODES.APPLICATION_ERROR, `Fatal error setting live order : ${e}`) }
}

/**
 * A recursive function to ensure the orderCall is persisted.
 * @param {object} orderBody Contains all the necessary information to execute the order [botId, symbol, orderType, price, orderQty, orderType, side]
 * @param {object} leverageObject Contains all the symbols and their respective leverage [botId, symbol, leverage]
 */
const setPaperOrder = async (params) => {
    const { timestamp, symbol, orderType, price, orderQty, side, botId } = params.orderBody
    const { leverageObject } = params

    const margin = await marginFormula({ orderQty, price, leverage: leverageObject[symbol] })
    
    const orderId = await uuid()
    const orderStatus = 'Filled'
    const botInfo = await selectKeysByBotId([botId])
    const { exchange } = botInfo[0]

    await insertPaperOrder([botId, exchange, orderId, null, timestamp, orderStatus, side, orderQty, price, margin, leverageObject[symbol], orderType, null])
}

/**
 * A recursive function to ensure the new leverage for a given symbol is set correctly
 * 
 * @param {object} leverageBody Contains all the necessary information to execute the leverage change [symbol, leverage]
 * @param {object} leverageObject Contains all the symbols and their respective leverage [botId, symbol, leverage]
 */
const setPaperLeverage = async (params) => {
    const { symbol, leverage } = params.orderBody
    const { leverageObject } = params.leverageObject

    leverageObject[symbol] = leverage
    return { leverage }
}

module.exports = { setLiveLeverage, setPaperLeverage, setLiveOrder, setPaperOrder }