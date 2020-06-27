const logEvent = require('../../utils/logger')
const { tradeCalls } = require('./tradeCalls')
const { groupConsumer } = require('../../utils/kafkaConsumer')
const { selectKeysByBotId } = require('../../utils/database/db')
const ExceptionHandler = require('../../utils/ExceptionHandler')
const { strategy } = require(`../../strategies/${process.env.BOTNAME}`)
const { LOG_LEVELS, RESPONSE_CODES } = require('../../utils/constants')

/**
 * Watches the kafka topic of its exchange by using a consumer group to process all the pairs at the same time
 */
const trade = async (params) => {
    try {
        let pairTag
        let priceHistory = {}
        let leverageObject = {}
        const { type } = params
        const assetFilter = process.env.PAIR
        const assetFilterArr = assetFilter.split(',')

        logEvent(LOG_LEVELS.info, RESPONSE_CODES.LOG_MESSAGE_ONLY, `Retrieve the exchange of the bot and assign a topic accordingly`)
        const botInfo = await selectKeysByBotId([process.env.BOTNAME])
        const topic = `${botInfo[0].exchange}PriceStream`

        logEvent(LOG_LEVELS.info, RESPONSE_CODES.LOG_MESSAGE_ONLY, `Instantiate group consumer`)
        const consumer = await groupConsumer(`${process.env.BOTNAME}Group`, topic)

        consumer.on('message', async (message) => {
            logEvent(LOG_LEVELS.info, RESPONSE_CODES.LOG_MESSAGE_ONLY, `Parsing message`)
            const liveParsedMessage = JSON.parse(message.value)
            pairTag = liveParsedMessage.symbol

            logEvent(LOG_LEVELS.info, RESPONSE_CODES.LOG_MESSAGE_ONLY, `Keeping track of history`)
            if (assetFilter === "null") {
                const res = await priceHistoryTracker({ pairTag, liveParsedMessage, priceHistory })
                priceHistory = res.priceHistory
            }
            else if (assetFilterArr.includes(pairTag)) {
                const res = await priceHistoryTracker({ pairTag, liveParsedMessage, priceHistory })
                priceHistory = res.priceHistory
            }

            logEvent(LOG_LEVELS.info, RESPONSE_CODES.LOG_MESSAGE_ONLY, `Decluttering history to 50 price points`)
            if (priceHistory[pairTag].length >= 50) {
                priceHistory[pairTag].shift()
            }

            logEvent(LOG_LEVELS.info, RESPONSE_CODES.LOG_MESSAGE_ONLY, `Running Strategy for ${process.env.BOTNAME}`)
            const strategyObject = await strategy(priceHistory[pairTag])

            if (strategyObject.execute) {
                logEvent(LOG_LEVELS.info, RESPONSE_CODES.LOG_MESSAGE_ONLY, `Prepping to place orders in ${botInfo[0].exchange}`)
                const res = await tradeCalls({ strategyObject, leverageObject, type})
                leverageObject = res.leverageObject
            }
        })
    } catch (e) { throw new ExceptionHandler(RESPONSE_CODES.APPLICATION_ERROR, `Fatal error while live-trading : ${e}`) }
}

/**
 * Organizes the history by pair and time_frame in a single object
 * 
 * @param {string} pairTag Name of the symbol we are keeping track of
 * @param {string} liveParsedMessage JSON object of the message to break down
 * @param {string} priceHistory Object of arrays with the last 50 price points divided in HLOCV
 * 
 * @returns {object} An updated object containing the array for the live history
 */
const priceHistoryTracker = async (params) => {
    try {
        const { pairTag, priceHistory } = params
        const {open, close, high ,low, timestamp, volume} = params.liveParsedMessage

        if (pairTag in priceHistory) {
            priceHistory[pairTag].push({open, close, high, low, volume, timestamp})
        }
        else {
            priceHistory[pairTag] = []
            priceHistory[pairTag].push({open, close, high, low, volume, timestamp})
        }
        return { priceHistory }
    } catch (e) { throw new ExceptionHandler(RESPONSE_CODES.APPLICATION_ERROR, `Fatal error keeping history : ${e}`) }
}

module.exports = { trade }
