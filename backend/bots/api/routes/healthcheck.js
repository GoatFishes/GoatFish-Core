const Koa = require('koa')
const route = require('koa-route')
const logEvent = require('../utils/logger')
const ExceptionHandler = require('../utils/ExceptionHandler')
const { LOG_LEVELS, RESPONSE_CODES } = require('../utils/constants')

module.exports = async () => {
    const app = new Koa()
    /*
    * Summary    Endpoint dedicated to return the health of the container when queried
    */
    app.use(route.get('/', async (ctx) => {

        logEvent(LOG_LEVELS.info, RESPONSE_CODES.LOG_MESSAGE_ONLY, `Validating the payload`)
        const payload = ctx.checkPayload(ctx, 'healthcheck')
        if (!payload) {
            throw new ExceptionHandler(RESPONSE_CODES.APPLICATION_ERROR, 'PAYLOAD ISSUE : ' + global.jsonErrorMessage)
        }

        logEvent(LOG_LEVELS.info, RESPONSE_CODES.LOG_MESSAGE_ONLY, `Strategy container is running`)
        ctx.status = 200,
        ctx.body = {
            data: "OK"
        }
    }))

    return app
}