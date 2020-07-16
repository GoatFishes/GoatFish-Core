const Koa = require('koa')
const cors = require('@koa/cors')
const mount = require('koa-mount')
const logger = require('koa-logger')
const keys = require('./routes/keys')
const orders = require('./routes/orders')
const logEvent = require('./utils/logger')
const margin = require('./routes/margin.js')
const bodyParser = require('koa-bodyparser')
const positions = require('./routes/positions')
const backtest = require('./routes/backtest.js')
const healthcheck = require('./routes/healthcheck.js')
const priceStreaming = require('./routes/priceStreaming.js')
const { LOG_LEVELS, RESPONSE_CODES } = require('./utils/constants')
const { formatErrorResponse } = require('./utils/formatErrorResponse')


// Init kafka 
const kafka = require('kafka-node')
const { Producer } = kafka
const client = new kafka.KafkaClient({ kafkaHost: 'kafka:9092' })
const producer = new Producer(client)


const main = async () => {
    const app = new Koa()

    const schema = require('./json_schema/schema')

    app.use(bodyParser())

    app.use(logger())

    app.use(cors({
        credentials: true
    }))

    // Middleware to catch errors
    app.use(async (ctx, next) => {
        try {
            await next()
        } catch (err) {
            ctx.status = err.status || 500
            ctx.body = err.message
            ctx.app.emit('error', err, ctx)
        }
    })

    // Generic endpoint handling
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
            backtest: require('./json_schema/schemas/backtest.json'),
            keyBotUpload: require('./json_schema/schemas/keyBotUpload.json'),
            keyExchangeUpload: require('./json_schema/schemas/keyExchangeUpload.json'),
            setOrder: require('./json_schema/schemas/setOrder.json'),
            leverage: require('./json_schema/schemas/positionLeverage.json'),
            empty: require('./json_schema/schemas/empty.json'),
            priceStreaming: require('./json_schema/schemas/priceStreaming.json'),
            cancelOrder: require('./json_schema/schemas/cancelOrder.json')
        }))

    app.use(mount('/exchanges/key', await keys()))
    app.use(mount('/exchanges/orders', await orders()))
    app.use(mount('/exchanges/margin', await margin()))
    app.use(mount('/exchanges/positions', await positions()))
    app.use(mount('/exchanges/backtest', await backtest()))
    app.use(mount('/exchanges/healthcheck', await healthcheck()))
    app.use(mount('/exchanges/pricestream', await priceStreaming()))


    return app
}

if (require.main === module) {
    main()
        .then((app) => app.listen(process.env.EXCHANGESPORT), logEvent(LOG_LEVELS.info, RESPONSE_CODES.LOG_MESSAGE_ONLY, `Listening On Port ${process.env.EXCHANGESPORT}`))
        .then(producer.on('ready', function () { logEvent(LOG_LEVELS.info, RESPONSE_CODES.LOG_MESSAGE_ONLY, `Kafka Broker Ready`) }))
}
