const BUY = "Buy"
const LONG = "Long"
const SHORT = "Short"

const Koa = require('koa')
const route = require('koa-route')
const uuid = require('uuid-random')
const logEvent = require('../utils/logger')
const ExceptionHandler = require('../utils/ExceptionHandler')
const { LOG_LEVELS, RESPONSE_CODES } = require('../utils/constants')
const { selectOrdersByStatus, updateOrderPositionId, insertPosition, selectPositions, selectPaperOrdersByStatus, insertPaperPosition, selectPaperPositions, updatePaperOrderPositionId } = require('../utils/database/db')

module.exports = async () => {
    const app = new Koa()

    /**
     * Get the Orders for all the aggregated bots or any given id, by aggregating all the orders info from the db
     * 
     * @param type {string} specify the type of positions we are trying to build accepts options [liveOrder, paperTrade]. A null value will assume liveOrder.
     * 
     * @returns
     * 
     * @todo Fix the array.shift in line 199 doesnt work correctly for any give number of orders just happens to work now
     */
    app.use(route.get('/', async (ctx) => {
        try {
            const type = await ctx.request.query.type

            const orderIds = []
            let side = ""
            let size = 0
            let ordersDirection = ""
            let startTime
            let endTime
            let positions = ""
            let entryPrice = 0
            let assignedMargin = 0
            let liberatedMargin = 0
            let contractZeroCounter = 0

            logEvent(LOG_LEVELS.info, RESPONSE_CODES.LOG_MESSAGE_ONLY, `Validating the payload`)
            ctx.checkPayload(ctx, 'empty')

            logEvent(LOG_LEVELS.info, RESPONSE_CODES.LOG_MESSAGE_ONLY, `Determine position type and fetching all orders from the database`)
            let orders
            if (type === "paperTrade") {
                orders = await selectPaperOrdersByStatus(["Filled"])
            } else {
                orders = await selectOrdersByStatus(["Filled"])
            }

            // making the call to calcualte here
            for (let i = 0; i < orders.length; i += 1) {
                logEvent(LOG_LEVELS.info, RESPONSE_CODES.LOG_MESSAGE_ONLY, `Processing orders into positions: ${i + 1}/${orders.length}`)
                const positionUpdate = await ordersRecursion({ orderIds, orders: orders[i], side, startTime, endTime, entryPrice, assignedMargin, liberatedMargin, contractZeroCounter, ordersDirection, size, type })
                side = positionUpdate.side
                size = positionUpdate.size
                endTime = positionUpdate.endTime
                positions = positionUpdate.positions
                startTime = positionUpdate.startTime
                entryPrice = positionUpdate.entryPrice
                assignedMargin = positionUpdate.assignedMargin
                liberatedMargin = positionUpdate.liberatedMargin
                ordersDirection = positionUpdate.ordersDirection
                contractZeroCounter = positionUpdate.contractZeroCounter
            }

            logEvent(LOG_LEVELS.info, RESPONSE_CODES.LOG_MESSAGE_ONLY, `Determine position type and build position response`)
            if (type === "paperTrade") {
                positions = await selectPaperPositions()
            } else {
                positions = await selectPositions()
            }

            // Building the positions Object to return here
            const botSet = []
            let botPosition
            const positionSet = []
            for (let i = 0; i < positions.length; i += 1) {

                if (botSet.includes(positions[i].bot_id)) {
                    botPosition = botSet.indexOf(positions[i].bot_id);
                    if (positions[i].side === "Long") {

                        positionSet[botPosition].positions.long.push(positions[i])
                    } else if (positions[i].side === "Short") {
                        positionSet[botPosition].positions.short.push(positions[i])
                    }
                } else {
                    botSet.push(positions[i].bot_id)                
                    botPosition = botSet.indexOf(positions[i].bot_id);
                    positionSet.push({ botId: positions[i].bot_id, positions: { long: [], short: [] } })

                    if (positions[i].side === "Long") {
                        positionSet[botPosition].positions.long.push(positions[i])
                    } else if (positions[i].side === "Short") {
                        positionSet[botPosition].positions.short.push(positions[i])
                    }
                }
            }

            ctx.status = 200
            ctx.body = {
                data: positionSet
            }
        } catch (e) { throw new ExceptionHandler(RESPONSE_CODES.APPLICATION_ERROR, `Fatal error on Positions building : ${e}`) }
    }))

    return app
}

const ordersRecursion = async (params) => {
    const { orderIds, orders, type } = params
    let { side, startTime, entryPrice, assignedMargin, liberatedMargin, contractZeroCounter, ordersDirection, size } = params

    orderIds.push(orders.order_id)

    let averagePrice = []
    let averageLeverage = []

    if (contractZeroCounter === 0) {
        if (orders.side === BUY) {
            ordersDirection = LONG
            side = "Long"
            contractZeroCounter += orders.size
            size += orders.size
            assignedMargin += orders.margin
            entryPrice = orders.average_price
            startTime = orders._timestamp
            averageLeverage.push(orders.leverage)
            averagePrice.push(orders.averagePrice)
        } else {
            ordersDirection = SHORT
            side = "Short"
            contractZeroCounter += orders.size
            size += orders.size
            assignedMargin += orders.margin
            entryPrice = orders.average_price
            startTime = orders._timestamp
            averageLeverage.push(orders.leverage)
            averagePrice.push(orders.averagePrice)
        }
    } else if (ordersDirection === LONG) {
        if (orders.side === BUY) {
            contractZeroCounter += orders.size
            size += orders.size
            assignedMargin += orders.margin
            averageLeverage.push(orders.leverage)
            averagePrice.push(orders.averagePrice)
        } else {
            contractZeroCounter -= orders.size
            liberatedMargin -= orders.margin
            averageLeverage.push(orders.leverage)
            averagePrice.push(orders.averagePrice)
        }
    } else if (ordersDirection === SHORT) {
        if (orders.side === BUY) {
            contractZeroCounter -= orders.size
            liberatedMargin -= orders.margin
            averageLeverage.push(orders.leverage)
            averagePrice.push(orders.averagePrice)
        } else {
            contractZeroCounter += orders.size
            size += orders.size
            assignedMargin += orders.margin
            averageLeverage.push(orders.leverage)
            averagePrice.push(orders.averagePrice)
        }
    }

    if (contractZeroCounter === 0) {
        const positionId = uuid()
        const botId = orders.bot_id
        const endTime = orders._timestamp
        const initialMargin = assignedMargin
        const pnl = liberatedMargin + assignedMargin
        const roe = ((-liberatedMargin / assignedMargin) * 100) - 100
        averagePrice = averagePrice.reduce((a, b) => a + b, 0) / averagePrice.length
        averageLeverage = averageLeverage.reduce((a, b) => a + b, 0) / averageLeverage.length

        logEvent(LOG_LEVELS.info, RESPONSE_CODES.LOG_MESSAGE_ONLY, `Adding position with id: ${positionId} to the databse`)
        if (type === "paperTrade") {
            await insertPaperPosition([positionId, botId, entryPrice, initialMargin, startTime, endTime, side, size, pnl, roe, averageLeverage, averagePrice])
        } else {
            await insertPosition([positionId, botId, entryPrice, initialMargin, startTime, endTime, side, size, pnl, roe, averageLeverage, averagePrice])

        }

        for (let i = 0; i < orderIds.length; i += 1) {
            logEvent(LOG_LEVELS.info, RESPONSE_CODES.LOG_MESSAGE_ONLY, `Updating the orderId for all related orders`)
            if (type === "paperTrade") {
                await updatePaperOrderPositionId([positionId, orderIds[i]])

            } else {
                await updateOrderPositionId([positionId, orderIds[i]])
            }
        }

        orderIds.shift()

        logEvent(LOG_LEVELS.info, RESPONSE_CODES.LOG_MESSAGE_ONLY, `Reseting persistance variables`)
        ordersDirection = null
    }

    return { side, startTime, entryPrice, assignedMargin, liberatedMargin, contractZeroCounter, ordersDirection, size, orderIds, orders, type }
}