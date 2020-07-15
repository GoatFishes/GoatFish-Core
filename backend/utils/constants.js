// Database params
const DB_PGHOST = 'postgres'
const DB_PGPORT = 5432
const DB_PGUSER = 'postgres'
const DB_PGPASSWORD = 'postgres'
const DB_PGDATABASE = 'postgres'

module.exports = {
    DB_PGPORT,
    DB_PGHOST,
    DB_PGUSER,
    DB_PGPASSWORD,
    DB_PGDATABASE,
    LOG_LEVELS:{ 
        fatal: 'fatal', //0
        error: 'error', //1
        warn: 'warn', //2
        info: 'info', //3
        debug: 'debug', //4
        trace: 'trace' //5
      },
    RESPONSE_CODES:{
        LOG_MESSAGE_ONLY: 0,
        REFERENCE_CHECK: 1,
        SUCCESS: 200,
        BAD_REQUEST: 400,
        UNAUTHORIZED: 401,
        FORBIDDEN: 403,
        RESOURCE_NOT_FOUND: 404,
        REQUEST_TIMEOUT: 408,
        RECORD_ALREADY_EXIST: 409,
        KAFKA_NODE_DOWN: 510,
        SERVER_ERROR: 500,
        SERVICE_UNAVAILABLE: 503,
        APPLICATION_ERROR: 550,
        USER_DUPLICATION: 551,
        TRANSFER_BLOCKED: 552,
      }
}