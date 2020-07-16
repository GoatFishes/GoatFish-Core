const Koa = require('koa')
const cors = require('@koa/cors')
const mount = require('koa-mount')
const logger = require('koa-logger')
const margin = require('./routes/margin')
const orders = require('./routes/orders')
const logEvent = require('./utils/logger')
const bodyParser = require('koa-bodyparser')
const positions = require('./routes/positions')
const management = require('./routes/management')
const healthcheck = require('./routes/healthcheck')
const { LOG_LEVELS, RESPONSE_CODES } = require('./utils/constants')
const { formatErrorResponse } = require('./utils/formatErrorResponse')

const main = async () => {
    const app = new Koa()
    const schema = require('./json_schema/schema')
    app.use(bodyParser())
    app.use(logger())

    app.use(cors({
        credentials: true
    }))

    app.use(async (ctx, next) => {
        try {
            await next()
        } catch (err) {
            ctx.status = err.status || 500
            ctx.body = err.message
            ctx.app.emit('error', err, ctx)
        }
    })

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
            execute: require('./json_schema/schemas/executeBot.json'),
            upload: require('./json_schema/schemas/botUpload.json'),
            empty: require('./json_schema/schemas/empty.json'),
        }))

    app.use(mount('/bots/management', await management()))
    app.use(mount('/bots/margin', await margin()))
    app.use(mount('/bots/orders', await orders()))
    app.use(mount('/bots/positions', await positions()))
    app.use(mount('/bots/healthcheck', await healthcheck()))

    return app
}

if (require.main === module) {
    main().then(
        (app) => app.listen(process.env.BOTSPORT), logEvent(LOG_LEVELS.info, RESPONSE_CODES.LOG_MESSAGE_ONLY, `Listening On Port ${process.env.BOTSPORT}`)
    )
}

module.exports = { main }
