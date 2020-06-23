const Koa = require('koa')
const route = require('koa-route')
const uuid = require('uuid-random')
const logEvent = require('../utils/logger')
const ExceptionHandler = require('../utils/ExceptionHandler')
const { LOG_LEVELS, RESPONSE_CODES } = require('../utils/constants')
const { selectOrdersByStatus, updateOrderPositionId, insertPosition, selectPositions, selectPaperOrdersByStatus, insertPaperPosition, selectPaperPositions, updatePaperOrderPositionId } = require('../utils/database/db')

const BUY = "Buy"
const NULL = null
const LONG = "Long"
const SHORT = "Short"
const TAKER_FEE = -0.00075        // -0,075%
const MAKER_FEE = 0.00025         // +0,025%

let botSet = []
let order_ids = []
let positionSet = []
let average_price = []
let average_leverage = []

let size = 0
let assignedMargin = 0
let liberatedMargin = 0
let contractZeroCounter = 0

let roe
let pnl
let side
let type
let bot_id
let endTime
let startTime
let positions
let entryPrice
let position_id
let initialMargin
let ordersDirection = NULL

module.exports = async () => {
    const app = new Koa()

    /**
     * Summary    Get the Orders for all the aggregated bots or any given id, by aggregating all the orders info from the db
     * @param type {string} specify the type of positions we are trying to build accepts options [liveOrder, paperTrade]. A null value will assume liveOrder. 
     */
    app.use(route.get('/', async (ctx) => {
        type = await ctx.request.query.type

        logEvent(LOG_LEVELS.info, RESPONSE_CODES.LOG_MESSAGE_ONLY, `Validating the payload`)
        const payload = ctx.checkPayload(ctx, 'positions')
        if (!payload) {
            throw new ExceptionHandler(RESPONSE_CODES.APPLICATION_ERROR, 'PAYLOAD ISSUE : ' + global.jsonErrorMessage)
        }

        try {
            logEvent(LOG_LEVELS.info, RESPONSE_CODES.LOG_MESSAGE_ONLY, `Determine position type and fetching all orders from the database`)
            if (type == "paperTrade") { orders = await selectPaperOrdersByStatus(["Filled"]) }
            else { orders = await selectOrdersByStatus(["Filled"]) }

            for (let i = 0; i < orders.length; i++) {
                logEvent(LOG_LEVELS.info, RESPONSE_CODES.LOG_MESSAGE_ONLY, `Processing orders into positions: ${i + 1}/${orders.length}`)
                await ordersRecursion(orders[i])
            }

            logEvent(LOG_LEVELS.info, RESPONSE_CODES.LOG_MESSAGE_ONLY, `Determine position type and build position response`)
            if (type == "paperTrade") { orders = await selectPaperPositions() }
            else { positions = await selectPositions() }

            for (let i = 0; i < positions.length; i++) {
                if (!botSet.includes(positions[i].bot_id)) {
                    botSet.push(positions[i].bot_id)
                    botPosition = botSet.indexOf(positions[i].bot_id);
                    positionSet.push({ bot_id: positions[i].bot_id, positions: { long: [], short: [] } })
                    if (positions[i].side == "Long") {
                        positionSet[botPosition].positions.long.push(positions[i])
                    }
                    else if (positions[i].side == "Short") {
                        positionSet[botPosition].positions.short.push(positions[i])
                    }
                }
                else if (botSet.includes(positions[i].botId)) {
                    botPosition = botSet.indexOf(positions[i].botId);
                    if (positions[i].side == "Long") {
                        positionSet[botPosition].positions.long.push(positions[i])
                    }
                    else if (positions[i].side == "Short") {
                        positionSet[botPosition].positions.short.push(positions[i])
                    }
                }
            }
        } catch (e) { throw new ExceptionHandler(RESPONSE_CODES.APPLICATION_ERROR, 'Fatal error on Positions building : ' + e) }

        ctx.status = 200,
            ctx.body = {
                data: positionSet
            }
    }))

    return app
}

ordersRecursion = async (orders) => {
    // vars
    let fee_type

    // Set the fee type
    orders.order_type == "Market" ?
        fee_type = TAKER_FEE
        :
        fee_type = MAKER_FEE

    order_ids.push(orders.order_id)

    // Determine whether this is a new position or a followup position
    contractZeroCounter == 0 ?
        (
            orders.side == BUY ?
                // If the trades is long
                (
                    ordersDirection = LONG,
                    side = "Long",
                    contractZeroCounter += orders.size,
                    size += orders.size,
                    assignedMargin += orders.margin,
                    entryPrice = orders.average_price,
                    startTime = orders._timestamp,
                    average_leverage.push(orders.leverage),
                    average_price.push(orders.average_price)
                )
                :
                // If the trade is short
                (
                    ordersDirection = SHORT,
                    side = "Short",
                    contractZeroCounter += orders.size,
                    size += orders.size,
                    assignedMargin += orders.margin,
                    entryPrice = orders.average_price,
                    startTime = orders._timestamp,
                    average_leverage.push(orders.leverage),
                    average_price.push(orders.average_price)
                )
        )
        :
        // If it is a follow up trade
        (
            // If the original side is long
            ordersDirection == LONG ?
                (
                    // Determine whether the follow up trade was meant to go long or short
                    orders.side == BUY ?
                        // If follow up trade is long
                        (
                            contractZeroCounter += orders.size,
                            size += orders.size,
                            assignedMargin += orders.margin,
                            average_leverage.push(orders.leverage),
                            average_price.push(orders.average_price)
                        )
                        :
                        // If follow up trade is short
                        (
                            contractZeroCounter -= orders.size,
                            liberatedMargin -= orders.margin,
                            average_leverage.push(orders.leverage),
                            average_price.push(orders.average_price)
                        )
                )
                :
                // If the trade is short
                (
                    orders.side == BUY ?
                        // If follow up trade is long
                        (
                            contractZeroCounter += orders.size,
                            liberatedMargin += orders.margin,
                            average_leverage.push(orders.leverage),
                            average_price.push(orders.average_price)
                        )
                        :
                        // If follow up trade is short
                        (
                            contractZeroCounter -= orders.size,
                            size += orders.size,
                            assignedMargin += orders.margin,
                            average_leverage.push(orders.leverage),
                            average_price.push(orders.average_price)
                        )
                )
        )

    if (contractZeroCounter == 0) {
        position_id = uuid()
        bot_id = orders.bot_id
        endTime = orders._timestamp
        initialMargin = assignedMargin
        pnl = liberatedMargin + assignedMargin
        roe = ((-liberatedMargin / assignedMargin) * 100) - 100
        average_price = average_price.reduce((a, b) => a + b, 0) / average_price.length
        average_leverage = average_leverage.reduce((a, b) => a + b, 0) / average_leverage.length

        logEvent(LOG_LEVELS.info, RESPONSE_CODES.LOG_MESSAGE_ONLY, `Adding position with id: ${position_id} to the databse`)
        if (type == "paperTrade") {
            await insertPaperPosition([position_id, bot_id, entryPrice, initialMargin, startTime, endTime, side, size, pnl, roe, average_leverage, average_price])
        }
        else {
            await insertPosition([position_id, bot_id, entryPrice, initialMargin, startTime, endTime, side, size, pnl, roe, average_leverage, average_price])
        }

        for (let i = 0; i < order_ids.length; i++) {
            logEvent(LOG_LEVELS.info, RESPONSE_CODES.LOG_MESSAGE_ONLY, `Updating the position_id for all related orders`)
            if (type == "paperTrade") {
                await updatePaperOrderPositionId([position_id, order_ids[i]])
            }
            else {
                await updateOrderPositionId([position_id, order_ids[i]])
            }
        }

        logEvent(LOG_LEVELS.info, RESPONSE_CODES.LOG_MESSAGE_ONLY, `Reseting persistance variables`)
        ordersDirection = NULL

        roe = 0
        pnl = 0
        initialMargin = 0
        assignedMargin = 0
        liberatedMargin = 0

        side = ""
        bot_id = ""
        endTime = ""
        position_id = ""

        order_ids = []
        average_price = []
        average_leverage = []
    }
}