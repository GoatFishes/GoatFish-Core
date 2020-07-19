const { RESPONSE_CODES, LOG_LEVELS } = require('./constants')
const logEvent = require('./logger')
sleep = m => new Promise(r => setTimeout(r, m))

const errorHandling = async (e) => {
    let stringError = String(e)

    // Disconnected from the internet
    if (stringError.includes('ECONNREFUSED')) {
        logEvent(LOG_LEVELS.warn, RESPONSE_CODES.LOG_MESSAGE_ONLY, `exchange_engine has been disconnected, please wait 10 seconds`)
        await sleep(10000)
    }

    // No default keys set
    if (stringError.includes('No keys on record')) {
        logEvent(LOG_LEVELS.error, RESPONSE_CODES.LOG_MESSAGE_ONLY, `No keys on Record, please insert keys in ./api_key/and restart the application`)
    }

    // Too many requests
    if (stringError.includes('Too Many Requests')) {
        logEvent(LOG_LEVELS.error, RESPONSE_CODES.LOG_MESSAGE_ONLY, `Too many requests, please wait 10 seconds`)
        await sleep(10000)
    }

    // 443 error
    if (stringError.includes('443')) {
        logEvent(LOG_LEVELS.warn, RESPONSE_CODES.LOG_MESSAGE_ONLY, `exchange_engine has been disconnected, please wait 10 seconds`)
        await sleep(10000)
    }

    // 403
    if (stringError.includes('Forbidden')) {
        logEvent(LOG_LEVELS.error, RESPONSE_CODES.LOG_MESSAGE_ONLY, `IP has been banned, re-route or wait for ban to end`)
        await sleep(100000)
    }

    // 429 error
    if (stringError.includes('Rate limit exceeded')) {
        let errorDescription = await stringError.match(/Rate limit exceeded, retry in \d/)
        let timeout = errorDescription[0].match(/\d+/)
        await sleep(timeout[0] * 2000)
        logEvent(LOG_LEVELS.warn, RESPONSE_CODES.LOG_MESSAGE_ONLY, `exchange_engine has been rate limited for ${timeout} seconds`)
    }

    else {
        await sleep(5000)
        logEvent(LOG_LEVELS.warn, RESPONSE_CODES.LOG_MESSAGE_ONLY, `exchange_engine has been rate limited for 5 seconds`)
    }
    return
}

module.exports = { errorHandling }
