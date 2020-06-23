const uuid = require('uuid-random')
const logEvent = require('../../utils/logger')
const { marginFormula } = require('../../utils/analytics')
const { LOG_LEVELS, RESPONSE_CODES } = require('../../utils/constants')
const { insertPaperOrder, selectKeysByBotId } = require('../../utils/database/db')

/**
 * Make the appropriate exchange calls to execute the strategy
 * 
 * @param {object} strategyObject Contains all the necessary information to execute the trades [execute, symbol, leverage, side, orderQty, price, orderType, timeInForce]
 * @param {object} paperLeverageObject Contains a mapping of a pair to its current leverage
 */
const paperTradeCalls = async (params) => {
    const { symbol, leverage, side, orderQty, price, orderType, timestamp } = params.strategyObject
    const { paperLeverageObject } = params

    logEvent(LOG_LEVELS.info, RESPONSE_CODES.LOG_MESSAGE_ONLY, `Keep track of all the symbol leverages`)
    if (!(symbol in paperLeverageObject)) { paperLeverageObject[symbol] = leverage }

    logEvent(LOG_LEVELS.info, RESPONSE_CODES.LOG_MESSAGE_ONLY, `Determine whether we have to modify leverage for the pair`)
    if (paperLeverageObject[symbol] !== leverage) {
        logEvent(LOG_LEVELS.info, RESPONSE_CODES.LOG_MESSAGE_ONLY, `Request a leverage modification to the exchange`)
        const leverageBody = { botId: process.env.BOTNAME, symbol, leverage: parseInt(leverage) }
        await setPaperLeverage({ leverageBody, paperLeverageObject })
    }

    logEvent(LOG_LEVELS.info, RESPONSE_CODES.LOG_MESSAGE_ONLY, `Persist order in the database`)
    const orderBody = { botId: process.env.BOTNAME, timestamp, symbol, orderType, price, orderQty, side }
    await setPaperOrder({ orderBody, paperLeverageObject })
    return { paperLeverageObject }
}

/**
 * A recursive function to ensure the orderCall is persisted.
 * @param {object} orderBody Contains all the necessary information to execute the order [botId, symbol, orderType, price, orderQty, orderType, side]
 * @param {object} paperLeverageObject Contains all the symbols and their respective leverage [botId, symbol, leverage]
 */
const setPaperOrder = async (params) => {
    const { timestamp, symbol, orderType, price, orderQty, side, botId } = params.orderBody
    const { paperLeverageObject } = params

    const margin = await marginFormula({ orderQty: parseInt(orderQty), price, leverage: parseInt(paperLeverageObject[symbol]) })
    const orderId = await uuid()
    const orderStatus = 'Filled'
    const botInfo = await selectKeysByBotId([botId])
    const { exchange } = botInfo[0]

    await insertPaperOrder([botId, exchange, orderId, null, timestamp, orderStatus, side, orderQty, price, margin, paperLeverageObject[symbol], orderType, null])
}

/**
 * A recursive function to ensure the new leverage for a given symbol is set correctly
 * 
 * @param {object} leverageBody Contains all the necessary information to execute the leverage change [symbol, leverage]
 * @param {object} paperLeverageObject Contains all the symbols and their respective leverage [botId, symbol, leverage]
 */
const setPaperLeverage = async (params) => {
    const { symbol, leverage } = params.orderBody
    const { paperLeverageObject } = params.paperLeverageObject

    paperLeverageObject[symbol] = leverage
    return { leverage }
}

module.exports = { paperTradeCalls }
