const Koa = require('koa')
const cors = require('@koa/cors')
const mount = require('koa-mount')
const logger = require('koa-logger')
const logEvent = require('./utils/logger')
const bodyParser = require('koa-bodyparser')
const schema = require('./json_schema/schema')
const setStatus = require('./routes/setStatus')
const healthcheck = require('./routes/healthcheck')
const { LOG_LEVELS, RESPONSE_CODES } = require('./utils/constants')
const { formatErrorResponse } = require('./utils/formatErrorResponse')

const main = async () => {
    const app = new Koa()

    app.use(bodyParser())
    app.use(logger())

    app.use(cors({
        credentials: true
    }))

    app.use(async (ctx, next) => {
        try {
            logEvent(LOG_LEVELS.info, RESPONSE_CODES.LOG_MESSAGE_ONLY, `${ctx.request.href} ENDPOINT CALLED`)
            await next()
        } catch (err) {
            const errorResponse = formatErrorResponse(err, ctx.request.href)
            ctx.status = errorResponse.status
            ctx.body = errorResponse.body

            ctx.app.emit('error', err, ctx)
        }
        finally {
            logEvent(LOG_LEVELS.info, RESPONSE_CODES.LOG_MESSAGE_ONLY, `${ctx.request.href} ENDPOINT CALL ENDED`)
        }
    })

    app.use(
        await schema({
            status: require('./json_schema/schemas/status.json'),
            healthcheck: require('./json_schema/schemas/healthcheck.json'),
        }))

    app.use(mount('/setstatus', await setStatus()))
    app.use(mount('/healthcheck', await healthcheck()))

    return app
}

if (require.main === module) {
    main().then(
        (app) => app.listen(process.env.PORT), logEvent(LOG_LEVELS.info, RESPONSE_CODES.LOG_MESSAGE_ONLY, `Listening On Port ${process.env.PORT}`)
    )
}
module.exports = { main }