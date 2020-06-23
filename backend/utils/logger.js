var log4js = require('log4js');

// Import global variables
const { LOG_LEVELS, RESPONSE_CODES } = require('./constants')

try {
    log4js.configure({
        appenders: {
            logging: { type: 'dateFile', filename: '../logs/logs.log', category: 'default', pattern: '.yyyy-MM-dd-hh', compress: true },
            console: { type: 'console' }
        },
        categories: { default: { appenders: ['logging','console'], level: 'info'} }
    });
    global.logger = log4js.getLogger('logging')

    global.logger.info('LOGGING ACTIVATED')
} catch (error) {
    console.log('LOGGING CAN NOT BE ACTIVATED : ' + error)
}

/**
* Creates Event Logs
* This is called by developers for logging messages according to given error code, logging level and passed arguments
* USAGE and LEVELS examples :
* logger.log(LOG_LEVELS.trace, RESPONSE_CODES.SUCCESS,'Entering cheese testing',)
* logger.log(LOG_LEVELS.debug, RESPONSE_CODES.SUCCESS, 'Got cheese.');
* logger.log(LOG_LEVELS.info, RESPONSE_CODES.SUCCESS, 'Cheese is Comté.');
* logger.log(LOG_LEVELS.warn, RESPONSE_CODES.SUCCESS, 'Cheese is quite smelly.');
* logger.log(LOG_LEVELS.error, RESPONSE_CODES.SUCCESS, 'Cheese is too ripe!');
* logger.log(LOG_LEVELS.fatal, RESPONSE_CODES.SUCCESS, 'Cheese was breeding ground for listeria.');
* @param {LOG_LEVELS} log_level Log level
* @param {RESPONSE_CODES} response_code Response Code
* @param {any} message Event Message
* @param {any[]} args Event Message - dynamic text arguments
*/
const logEvent = async (log_level, response_code, message, args) => {
    try {
        (args === undefined) ? args = '' : args = args
        let initial = response_code === RESPONSE_CODES.LOG_MESSAGE_ONLY ? '' : 'RESPONSE CODE : ' + response_code + ' - '

        switch (log_level) {
            case LOG_LEVELS.trace: await global.logger.trace(initial + 'EVENT MESSAGE : ' + message + args); break;
            case LOG_LEVELS.debug: await global.logger.debug(initial + 'EVENT MESSAGE : ' + message + args); break;
            case LOG_LEVELS.info:  await global.logger.info (initial + 'EVENT MESSAGE : ' + message + args); break;
            case LOG_LEVELS.warn:  await global.logger.warn (initial + 'EVENT MESSAGE : ' + message + args); break;
            case LOG_LEVELS.error: await global.logger.error(initial + 'EVENT MESSAGE : ' + message + args); break;
            case LOG_LEVELS.fatal: await global.logger.fatal(initial + 'EVENT MESSAGE : ' + message + args); break;
            default: break;
        }
    } catch (error) {
        console.log(error)
    }
}

module.exports = logEvent