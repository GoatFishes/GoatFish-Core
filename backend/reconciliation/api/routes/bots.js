// Import the WebFramework for routing
const Koa = require('koa')
const route = require('koa-route')
var fs = require('fs');
const { exec } = require('child_process');
const ExceptionHandler = require('../utils/ExceptionHandler')
const { LOG_LEVELS, RESPONSE_CODES } = require('../utils/constants')
const logEvent = require('../utils/logger')

module.exports = async () => {
    const app = new Koa()

    // Retrive all the open positions from all the bots in the system
    app.use(route.get('/start', async (ctx) => {
        // Response
        ctx.status = 200
        ctx.body = {
            data : "ok",
        }
    }))

    // Retrive all the open positions from all the bots in the system
    app.use(route.get('/stop', async (ctx) => {
        // Response
        ctx.status = 200
        ctx.body = {
            data : "ok",
        }
    }))

    // Retrive all the open positions from all the bots in the system
    app.use(route.get('/backtest', async (ctx) => {
        // Response
        ctx.status = 200
        ctx.body = {
            data : "ok",
        }
    }))

    return app
}