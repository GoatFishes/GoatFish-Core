const logEvent = require('../../utils/logger')
const { paperTradeCalls } = require(`./paperTradeCalls`)
const { groupConsumer } = require('../../utils/kafkaConsumer')
const { selectKeysByBotId } = require('../../utils/database/db')
const ExceptionHandler = require('../../utils/ExceptionHandler')
const { strategy } = require(`../../strategies/${process.env.BOTNAME}`)
const { LOG_LEVELS, RESPONSE_CODES } = require('../../utils/constants')

/**
 * Watches the kafka topic of its exchange by using a consumer group to process all the pairs at the same time
 */
const paperTrade = async () => {
    try {
        let paperHistory = {}
        let paperLeverageObject = {}
        const paperFilter = process.env.PAIR
        const paperFilterArr = paperFilter.split(',')

        logEvent(LOG_LEVELS.info, RESPONSE_CODES.LOG_MESSAGE_ONLY, `Retrieve the exchange of the bot and assign a topic accordingly`)
        const botInfo = await selectKeysByBotId([process.env.BOTNAME])
        const topic = `${botInfo[0].exchange}PriceStream`

        logEvent(LOG_LEVELS.info, RESPONSE_CODES.LOG_MESSAGE_ONLY, `Instantiate group consumer`)
        const consumer = await groupConsumer(`${process.env.BOTNAME}PaperTradeGroup`, topic)

        consumer.on('message', async (message) => {
            const paperParsedMessage = JSON.parse(message.value)
            const paperPairTag = paperParsedMessage.symbol
            logEvent(LOG_LEVELS.info, RESPONSE_CODES.LOG_MESSAGE_ONLY, `Keeping track of paperHistory`)
            if (paperFilter === null) {
                const res = await paperHistoryTracker({ paperPairTag, paperHistory, paperParsedMessage })
                paperHistory = res.paperHistory
            }
            if (paperFilterArr.includes(paperPairTag)) {
                const res = await paperHistoryTracker({ paperPairTag, paperHistory, paperParsedMessage })
                paperHistory = res.paperHistory
            }
            
            logEvent(LOG_LEVELS.info, RESPONSE_CODES.LOG_MESSAGE_ONLY, `Declutering paperHistory to 50 price points`)
            if (paperHistory[paperPairTag].open.length >= 50) {
                paperHistory[paperPairTag].open.shift()
                paperHistory[paperPairTag].close.shift()
                paperHistory[paperPairTag].high.shift()
                paperHistory[paperPairTag].low.shift()
                paperHistory[paperPairTag].volume.shift()
                paperHistory[paperPairTag].timestamp.shift()
            }

            logEvent(LOG_LEVELS.info, RESPONSE_CODES.LOG_MESSAGE_ONLY, `Running Strategy for ${process.env.BOTNAME}`)
            const strategyObject = await strategy(paperHistory[paperPairTag])

            if (strategyObject.execute) {
                logEvent(LOG_LEVELS.info, RESPONSE_CODES.LOG_MESSAGE_ONLY, `Prepping to place orders in ${botInfo[0].exchange}`)
                const res = await paperTradeCalls({ strategyObject, paperLeverageObject })
                paperLeverageObject = res.paperLeverageObject
            }
        })
    } catch (e) { throw new ExceptionHandler(RESPONSE_CODES.APPLICATION_ERROR, `Fatal error setting paper order : ${e}`) }
}

/**
 * Organizes the history by pair and time_frame ina single object
 * 
 * @param {string} paperPairTag  Name of the symbol we are keeping track of
 * @param {string} paperParsedMessage JSON of the message to break down
 * @param {string} paperHistory Name of the symbol we are keeping track of
 * 
 * @returns {object} An updated object containing the array for the live history
 */
const paperHistoryTracker = async (params) => {
    try {
        const { paperHistory, paperPairTag, paperParsedMessage } = params
        if (paperPairTag in paperHistory) {
            paperHistory[paperPairTag].open.push(paperParsedMessage.open)
            paperHistory[paperPairTag].close.push(paperParsedMessage.close)
            paperHistory[paperPairTag].high.push(paperParsedMessage.high)
            paperHistory[paperPairTag].low.push(paperParsedMessage.low)
            paperHistory[paperPairTag].volume.push(paperParsedMessage.volume)
            paperHistory[paperPairTag].timestamp.push(paperParsedMessage.timestamp)
        }
        else {
            paperHistory[paperPairTag] = { open: [], close: [], high: [], low: [], volume: [], timestamp: [] }
            paperHistory[paperPairTag].open.push(paperParsedMessage.open)
            paperHistory[paperPairTag].close.push(paperParsedMessage.close)
            paperHistory[paperPairTag].high.push(paperParsedMessage.high)
            paperHistory[paperPairTag].low.push(paperParsedMessage.low)
            paperHistory[paperPairTag].volume.push(paperParsedMessage.volume)
            paperHistory[paperPairTag].timestamp.push(paperParsedMessage.timestamp)
        }
        return { paperHistory }

    } catch (e) { throw new ExceptionHandler(RESPONSE_CODES.APPLICATION_ERROR, `Fatal error setting paper order : ${e}`) }
}

module.exports = { paperTrade }
