const { LOG_LEVELS, RESPONSE_CODES } = require('../../utils/constants')
const { kafkaProduce } = require('../../utils/kafkaProducer')
const { errorHandling } = require('../../utils/errorHandling')
const { BitMexPlus } = require('bitmex-plus');
const logEvent = require('../../utils/logger')

/**
 * Get the current margin for any given exchange
 * 
 * @param {object} keys An object containing the api_id and the api_secret
 * 
 * @returns Margin object returned from the exchange
 */
const getMargin = async (params) => {
    const bitMexClient = await getClient(params.keys)
    logEvent(LOG_LEVELS.info, RESPONSE_CODES.LOG_MESSAGE_ONLY, `Retrieving Margin from Bitmex`)
    const margin = await bitMexClient.makeRequest('GET', 'user/wallet')

    return margin
}

/**
 * Get the Orders for a bot filtered by whether they are open or closed
 * 
 * @param {object} keys An object containing the api_id and the api_secret
 * @param {date} date Retrive the orders from a speciic date
 * @param {string} type Filters the orders by whether they are still opened or closed
 * 
 * @returns Order object returned frol the exchange
 */
const getOrders = async (params) => {
    const bitMexClient = await getClient(params.keys)
    
    logEvent(LOG_LEVELS.info, RESPONSE_CODES.LOG_MESSAGE_ONLY, `Retrieving ${params.type} Orders from Bitmex`)
    const getOrder = await bitMexClient.makeRequest('GET', 'order', {
        count: 500,
        start_time: params.date,
        filter: { "ordStatus": params.type },
        reverse: false
    })

    // Fail safe to ensure that we can push data to kafka even if there are no orders to process
    if (!getOrder.length) {
        getOrder.push("empty")
    }

    return getOrder
}

/**
 * Get the Orders for a bot filtered by whether they are open or closed
 * 
 * @param {object} keys An object containing the api_id and the api_secret
 * @param {string} symbol The pairing we want to set the order in
 * @param {string} side Specify of the order is meant to buy or sell
 * @param {integer} orderQty Amount of contracts the order should have
 * @param {float} price Price at which the order should execute 
 * @param {float} stop_price Stop price for a given order
 * @param {string} order_type The order type, ussually Limit or Market
 * @param {string} time_in_force How long the order will be in place ussually GoodTillCancelled or FillOrKill
 * @param {string} exec_instructions Optional execution instructions. Valid options: ParticipateDoNotInitiate, AllOrNone, MarkPrice, IndexPrice, LastPrice, Close, ReduceOnly, Fixed. 
 * 
 * @returns Object with information related to the execution of the order we have just posted.
 */
const setOrders = async (params) => {
    const bitMexClient = await getClient(params.keys)

    logEvent(LOG_LEVELS.info, RESPONSE_CODES.LOG_MESSAGE_ONLY, `Setting a ${params.order_type} ${params.side} Order of ${params.symbol} for ${params.orderQty} @ $${params.price}`)
    const postOrders = await bitMexClient.makeRequest('POST', 'order', {
        symbol: params.symbol,
        side: params.side,
        orderQty: params.orderQty,
        price: params.price,
        stopPx: params.stopPrice,
        ordType: params.orderType,
        timeInForce: params.timeInForce,
        execInst: params.execInstructions
    })

    return postOrders
}

/**
 * Cancels an order when given and ID 
 * 
 * @param {object} keys An object containing the api_id and the api_secret
 * @param {stinrg} orderId The id of the order we want to kill, ussualy stored in the db
 * 
 * @returns Info
 */
const cancelOrders = async (params) => {
    const bitMexClient = await getClient(params.keys)
    logEvent(LOG_LEVELS.info, RESPONSE_CODES.LOG_MESSAGE_ONLY, `Cancellin Order with ID: ${params.orderId}`)
    const cancelOrder = await bitMexClient.makeRequest('DELETE', 'order', {
        orderID: params.orderId,
    })

    return cancelOrder
}

/**
 * Modify the default leverage for a speicifc pairing
 * 
 * @param {object}} keys An object containing the api_id and the api_secret
 * @param {string} symbol Name of the symbol we want to modify the leverage for
 * 
 * @returns Object returned from the exchnage specifying the current leverage
 */
const setLeverage = async (params) => {
    const bitMexClient = await getClient(params.keys)

    logEvent(LOG_LEVELS.info, RESPONSE_CODES.LOG_MESSAGE_ONLY, `Setting leverage of ${params.symbol} to ${params.leverage}x`)
    const leverage = await bitMexClient.makeRequest('POST', 'position/leverage', {
        symbol: params.symbol,
        leverage: params.leverage,
    })

    return leverage
}

/**
 * A websocket that pulls positioning information directly from the exchnage
 * 
 * @param keys An object containing the api_id and the api_secret
 * @param symbol Name of the symbol we want to modify the leverage on
 */
const getPositions = async (params) => {
    const bitMexClient = await getClient(params.keys)

    const topic = "positions"
    logEvent(LOG_LEVELS.info, RESPONSE_CODES.LOG_MESSAGE_ONLY, `Push ${params.symbol} position from ${params.bot_id} to Kafka`)
    await bitMexClient.monitorStream(`${params.symbol}`, "position", async (data) => {
        const positionObject = {
            bot_id: params.bot_id,
            data
        }
        await kafkaProduce(topic, positionObject)
    });
}

/**
 * Pulls historic Pricing information for a given asset
 * 
 * @param {object} keys An object containing the api_id and the api_secret
 * @param {string} bin_size Size of the candles we want to retriev the pricing info for
 * @param {string} symbol The pairing we want to retrieve the info from
 * @param {date} start_time The starting point to retrieve the pricing ino from
 * @param {date} end_time The finishing point to retrieve the pricing ino from
 * @param {string} leverage The actual leverage we wish to change to [1-100]
 * 
 * @returns The price points retrieved from the exchange
 */
const getHistory = async (params) => {
    const bitMexClient = await getClient(params.keys)

    logEvent(LOG_LEVELS.info, RESPONSE_CODES.LOG_MESSAGE_ONLY, `Retrieving PriceHistory from ${params.startTime} to ${params.endTime}`)
    const pricePoint = await bitMexClient.makeRequest('GET', 'trade/bucketed', {
        binSize: params.binSize,
        reverse: false,
        count: 750,
        startTime: params.startTime,
        endTime: params.endTime,
        symbol: params.symbol
    })

    return pricePoint
}

/**
 * Pulls trade-bin information for a given asset in a give time_frame
 * 
 * @param keys An object containing the api_id and the api_secret
 * @param asset Name of the symbol we want to retrieve the information of
 * @param timeFrame The candle size the info return should contain
 */
const streamPrice = async (params) => {
    const topic = "bitmexPriceStream"

    const bitMexClient = await getClient(params.keys)

    logEvent(LOG_LEVELS.info, RESPONSE_CODES.LOG_MESSAGE_ONLY, `Initialising stream for ${params.timeFrame}${params.asset}`)
    await bitMexClient.monitorStream(params.asset, `tradeBin${params.timeFrame}`, async (data, e) => {
        if (e) { 
            // Empty block 
         }
        const symbol = params.timeFrame + data.symbol

        const streamingObject = {
            timestamp: data.timestamp,
            symbol,
            open: data.open,
            close: data.close,
            high: data.high,
            low: data.low,
            volume: data.volume
        }

        kafkaProduce(topic, streamingObject)
    });
}

/**
 * Instantiate a client for the exchange
 * 
 * @param keys An object containing the api_id and the api_secret
 * 
 * @retuns A new client for the bot to connect
 */
const getClient = async (params) => {
        try {
            logEvent(LOG_LEVELS.info, RESPONSE_CODES.LOG_MESSAGE_ONLY, `Creating a Bitmex client to retrieve data`)
            const bitMexClient = new BitMexPlus({
                apiKeyID: params.apiKeyID,
                apiKeySecret: params.apiKeySecret
            })

            bitMexClient.on('end', async (code) => { throw(code) });
            bitMexClient.on('error', async (error) => { throw(error) });

            return bitMexClient
        }
        catch (e) { 
            await errorHandling(e)
        }
}

module.exports = { getMargin, getOrders, setOrders, cancelOrders, getHistory, getPositions, setLeverage, streamPrice }
