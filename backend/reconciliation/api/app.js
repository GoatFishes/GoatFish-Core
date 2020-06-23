const Koa = require('koa')
const cors = require('@koa/cors')
const mount = require('koa-mount')
const logger = require('koa-logger')
const bodyParser = require('koa-bodyparser')
const bots = require('./routes/bots')
const { LOG_LEVELS, RESPONSE_CODES } = require('./utils/constants')
const { formatErrorResponse } = require('./utils/formatErrorResponse')
const logEvent = require('./utils/logger')





const main = async () => {

  const app = new Koa()

  //import schema
  const schema = require('./json_schema/schema')

  // Parse incoming requests data
  app.use(bodyParser())
  
  // Log Errors
  app.use(logger())
  
  // Allow CORS headers
  app.use(cors({
    credentials: true
  }))

  // Middlewarez to catch errors
  app.use(async (ctx, next) => {
    try {
      await next()
    } catch (err) {
      ctx.status = err.status || 500
      ctx.body = err.message
      ctx.app.emit('error', err, ctx)
    }
  })

   // error handling
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

  // JSON schema
  // app.use(
  //   await schema({
  //     backtest: require('./json_schema/schemas/backtest.json'),
  //     keyBotUpload: require('./json_schema/schemas/keyBotUpload.json'),
  // }))
  
  // Mounted Koa Routes
  app.use(mount('/api/bots', await bots()))


  return app

}

//Listen to the port 3001 where the backend is hosted
if (require.main === module) {
  main()
  .then(
    (app) => app.listen(process.env.RECONCILIATIONPORT), logEvent(LOG_LEVELS.info, RESPONSE_CODES.LOG_MESSAGE_ONLY, `Listening On Port ${process.env.RECONCILIATIONPORT}`)
  )
}
