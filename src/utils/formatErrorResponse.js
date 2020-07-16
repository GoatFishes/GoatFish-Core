const { RESPONSE_CODES, LOG_LEVELS } = require('./constants')
const logEvent = require('./logger')

const formatErrorResponse = (err, href) => {
    let statusCode
    let message
    let logMessage = ''

    if (err.response_code) {
        logMessage = ` ${href} ENDPOINT CALL ENDED WITH ERROR : ${err.error}`

        logEvent(LOG_LEVELS.error, err.response_code, logMessage)

        statusCode = err.response_code
        message = err.error
    } else {
        logEvent(LOG_LEVELS.error, err.status, `${href} ENDPOINT CALL ENDED WITH INTERNAL SERVER ERROR : ${err.message}`)
        statusCode = err.status || RESPONSE_CODES.SERVER_ERROR
        message = 'SERVER ERROR'
    }

    return {
        status: statusCode,
        body: {
            response_code: JSON.stringify(statusCode),
            response_message: message
        }
    }
}

module.exports = { formatErrorResponse }
