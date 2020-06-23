const Koa = require('koa')
const route = require('koa-route')
const logEvent = require('../utils/logger')
const { stop } = require(`../status/stop/stop`)
const { backtest } = require(`../status/backtest/backtest`)
const ExceptionHandler = require('../utils/ExceptionHandler')
const { liveTrade } = require(`../status/liveTrade/liveTrade`)
const { paperTrade } = require(`../status/paperTrade/paperTrade`)
const { updateBotStrategyStatus } = require('../utils/database/db')
const { LOG_LEVELS, RESPONSE_CODES } = require('../utils/constants')

module.exports = async () => {
    const app = new Koa()

    /**
     * Endpoint dedicated to changing or setting the state of the strategy
     * 
     * @param {string} status Determine the state of the strategy.
     * @param {string} [timeFrame] Candle size for the backtest
     * @param {string} [symbol] Backtesting pair
     * @param {string} [exchange] Exchange to execute the backtest on
     * 
     * @returns {object} Specifying the botId and the updated state of the bot 
     */
    app.use(route.post('/', async (ctx) => {
        try {
            const status = await ctx.request.query.status

            logEvent(LOG_LEVELS.info, RESPONSE_CODES.LOG_MESSAGE_ONLY, `Validating the payload`)
            const payload = ctx.checkPayload(ctx, 'status')
            const { timeFrame, symbol, exchange } = payload


            logEvent(LOG_LEVELS.info, RESPONSE_CODES.LOG_MESSAGE_ONLY, `Stop the bots actions before setting a new state`)
            await stop()

            logEvent(LOG_LEVELS.info, RESPONSE_CODES.LOG_MESSAGE_ONLY, `Update the state of the bot in the database`)
            await updateBotStrategyStatus([status, process.env.BOTNAME])

            logEvent(LOG_LEVELS.info, RESPONSE_CODES.LOG_MESSAGE_ONLY, `Updating bot status`)
            switch (status) {
                case 'Backtest':
                    backtest({ timeFrame, symbol, exchange })
                    break;
                case 'PaperTrade':
                    paperTrade()
                    break;
                case 'LiveTrade':
                    liveTrade()
                    break;
                case 'Stop':
                    break;
                default:
                    throw new ExceptionHandler(RESPONSE_CODES.BAD_REQUEST, 'No valid status provided')
            }
            ctx.status = 200
            ctx.body = {
                data: {
                    botId: process.env.BOTNAME,
                    message: `Status updated to ${status}`
                }
            }
        } catch (e) { throw new ExceptionHandler(RESPONSE_CODES.APPLICATION_ERROR, `Fatal error on status set : ${e}`) }
    }))

    return app
}
