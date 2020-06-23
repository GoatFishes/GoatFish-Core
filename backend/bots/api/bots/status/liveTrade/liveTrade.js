const logEvent = require('../../utils/logger')
const { exchangeCalls } = require(`./exchangeCalls`)
const { groupConsumer } = require('../../utils/kafkaConsumer')
const { selectKeysByBotId } = require('../../utils/database/db')
const ExceptionHandler = require('../../utils/ExceptionHandler')
const { strategy } = require(`../../strategies/${process.env.BOTNAME}`)
const { LOG_LEVELS, RESPONSE_CODES } = require('../../utils/constants')

/**
 * Watches the kafka topic of its exchange by using a consumer group to process all the pairs at the same time
 */
const liveTrade = async () => {
    try {
        let livePairTag
        let liveHistory = {}
        let liveLeverageObject = {}
        const liveFilter = process.env.PAIR
        const liveFilterArr = liveFilter.split(',')

        logEvent(LOG_LEVELS.info, RESPONSE_CODES.LOG_MESSAGE_ONLY, `Retrieve the exchange of the bot and assign a topic accordingly`)
        const botInfo = await selectKeysByBotId([process.env.BOTNAME])
        const topic = `${botInfo[0].exchange}PriceStream`

        logEvent(LOG_LEVELS.info, RESPONSE_CODES.LOG_MESSAGE_ONLY, `Instantiate group consumer`)
        const consumer = await groupConsumer(`${process.env.BOTNAME}Group`, topic)

        consumer.on('message', async (message) => {
            logEvent(LOG_LEVELS.info, RESPONSE_CODES.LOG_MESSAGE_ONLY, `Parsing message`)
            const liveParsedMessage = JSON.parse(message.value)
            livePairTag = liveParsedMessage.symbol

            logEvent(LOG_LEVELS.info, RESPONSE_CODES.LOG_MESSAGE_ONLY, `Keeping track of history`)
            if (liveFilter === "null") {
                const res = await liveHistoryTracker({ livePairTag, liveParsedMessage, liveHistory })
                liveHistory = res.liveHistory
            }
            else if(liveFilterArr.includes(livePairTag)) {
                const res = await liveHistoryTracker({ livePairTag, liveParsedMessage, liveHistory })
                liveHistory = res.liveHistory
            }

            logEvent(LOG_LEVELS.info, RESPONSE_CODES.LOG_MESSAGE_ONLY, `Declutering history to 50 price points`)
            if (liveHistory[livePairTag].open.length >= 50) {
                liveHistory[livePairTag].open.shift()
                liveHistory[livePairTag].close.shift()
                liveHistory[livePairTag].high.shift()
                liveHistory[livePairTag].low.shift()
                liveHistory[livePairTag].volume.shift()
                liveHistory[livePairTag].timestamp.shift()
            }

            logEvent(LOG_LEVELS.info, RESPONSE_CODES.LOG_MESSAGE_ONLY, `Running Strategy for ${process.env.BOTNAME}`)
            const strategyObject = await strategy(liveHistory[livePairTag])

            if (strategyObject.execute) {
                logEvent(LOG_LEVELS.info, RESPONSE_CODES.LOG_MESSAGE_ONLY, `Prepping to place orders in ${botInfo[0].exchange}`)
                const res = await exchangeCalls({ strategyObject, liveLeverageObject })
                liveLeverageObject = res.liveLeverageObject
            }
        })
    } catch (e) { throw new ExceptionHandler(RESPONSE_CODES.APPLICATION_ERROR, `Fatal error while live-trading : ${e}`) }
}

/**
 * Organizes the history by pair and time_frame ina single object
 * 
 * @param {string} livePairTag Name of the symbol we are keeping track of
 * @param {string} liveParsedMessage JSON object of the message to break down
 * @param {string} liveHistory Object of arrays with the last 50 price points divided in HLOCV
 * 
 * @returns {object} An updated object containing the array for the live history
 */
const liveHistoryTracker = async (params) => {
    try {
        const{livePairTag,liveHistory, liveParsedMessage} = params
        if (livePairTag in liveHistory) {
            liveHistory[livePairTag].open.push(liveParsedMessage.open)
            liveHistory[livePairTag].close.push(liveParsedMessage.close)
            liveHistory[livePairTag].high.push(liveParsedMessage.high)
            liveHistory[livePairTag].low.push(liveParsedMessage.low)
            liveHistory[livePairTag].volume.push(liveParsedMessage.volume)
            liveHistory[livePairTag].timestamp.push(liveParsedMessage.timestamp)
        }
        else {
            liveHistory[livePairTag] = { open: [], close: [], high: [], low: [], volume: [], timestamp: [] }
            liveHistory[livePairTag].open.push(liveParsedMessage.open)
            liveHistory[livePairTag].close.push(liveParsedMessage.close)
            liveHistory[livePairTag].high.push(liveParsedMessage.high)
            liveHistory[livePairTag].low.push(liveParsedMessage.low)
            liveHistory[livePairTag].volume.push(liveParsedMessage.volume)
            liveHistory[livePairTag].timestamp.push(liveParsedMessage.timestamp)
        }
        return { liveHistory }
    } catch (e) { throw new ExceptionHandler(RESPONSE_CODES.APPLICATION_ERROR, `Fatal error keeping history : ${e}`) }
}

module.exports = { liveTrade }
