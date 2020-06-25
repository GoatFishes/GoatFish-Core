const logEvent = require('../../utils/logger')
const ExceptionHandler = require('../../utils/ExceptionHandler')
const { LOG_LEVELS, RESPONSE_CODES } = require('../../utils/constants')
const { setLiveLeverage, setPaperLeverage, setLiveOrder, setPaperOrder } = require('../../utils/orderSetter')

/**
 * Make the appropriate exchange calls to execute the strategy
 * 
 * @param {object} strategyObject Contains all the necessary information to execute the trades [execute, symbol, leverage, side, orderQty, price, orderType, timeInForce]
 * @param {object} leverageObject Contains a mapping of a pair to its current leverage
 * @param {object} type Determines whether the execution is paperTrading or LiveTrading
 * 
 * @returns {object} updated leverageObject
 */
const tradeCalls = async (params) => {
    try {
        const { side, price, symbol, leverage, orderQty, orderType, timeInForce, timestamp } = params.strategyObject

        const { leverageObject, type } = params

        logEvent(LOG_LEVELS.info, RESPONSE_CODES.LOG_MESSAGE_ONLY, `Keep track of all the symbol leverages`)
        if (!(symbol in leverageObject)) { 
            leverageObject[symbol] = leverage 
        }
        logEvent(LOG_LEVELS.info, RESPONSE_CODES.LOG_MESSAGE_ONLY, `Determine whether we have to modify leverage for the pair`)

        if (leverageObject[symbol] !== leverage) {

            logEvent(LOG_LEVELS.info, RESPONSE_CODES.LOG_MESSAGE_ONLY, `Request a leverage modification to the exchange`)
            const leverageBody = { botId: process.env.BOTNAME, symbol, leverage: parseInt(leverage) }
            if (type === "liveTrading") {
                const updatedLeverage = await setLiveLeverage({ leverageBody, leverageObject })
                leverageObject[leverageBody.symbol] = updatedLeverage.leverage

            } else {
                const updatedLeverage = await setPaperLeverage({ leverageBody, leverageObject })
                leverageObject[leverageBody.symbol] = updatedLeverage.leverage
            }
        }

        logEvent(LOG_LEVELS.info, RESPONSE_CODES.LOG_MESSAGE_ONLY, `Submit order to the exchange`)
        const orderBody = { botId: process.env.BOTNAME, symbol, orderType, timeInForce, price, orderQty, side, timestamp }

        if (type === "liveTrading") {
            await setLiveOrder({ orderBody, leverageObject })
        } else {
            await setPaperOrder({ orderBody, leverageObject })
        }
        return { leverageObject }
    } catch (e) { throw new ExceptionHandler(RESPONSE_CODES.APPLICATION_ERROR, `Fatal error on live order setting : ${e}`) }
}

module.exports = { tradeCalls }
