const logEvent = require('../../utils/logger')
const { pauseConsumer } = require('../../utils/kafkaConsumer')
const { selectBotByBotId } = require('../../utils/database/db')
const { LOG_LEVELS, RESPONSE_CODES } = require('../../utils/constants')

/**
 * Watches the kafka topic of its exchange by using a consumer group to process all the pairs at the same time
 */
const stop = async () => {
    logEvent(LOG_LEVELS.INFO, RESPONSE_CODES.LOG_MESSAGE_ONLY, `Retrieving all parameters to stop the previous process`)
    const botStats = await selectBotByBotId([process.env.BOTNAME])
    const botStatus = botStats[0]._status

    logEvent(LOG_LEVELS.info, RESPONSE_CODES.LOG_MESSAGE_ONLY, `Current status = ${botStatus}`)
    switch (botStatus) {
        case 'Backtest':
            break;
        case 'PaperTrade':
            await pauseConsumer(`${process.env.BOTNAME}PaperTradeGroup`)
            break;
        case 'LiveTrade':
            await pauseConsumer(`${process.env.BOTNAME}Group`)
            break;
        case 'Stop':
            break;
        default:
            logEvent(LOG_LEVELS.error, RESPONSE_CODES.LOG_MESSAGE_ONLY, `Invalid Status`)
    }
}

module.exports = { stop }
