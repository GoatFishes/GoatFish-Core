const { LOG_LEVELS, RESPONSE_CODES } = require('../../utils/constants')
const { kafkaProduce } = require('../../utils/kafkaProducer')
const { errorHandling } = require('../../utils/errorHandling')
const BitMexPlus = require('bitmex-plus').BitMexPlus;
const logEvent = require('../../utils/logger')

/**
 * Summary   Get the current margin for any given exchange
 * @param keys An object containing the api_id and the api_secret
 */
getMargin = async (params) => {
    let margin

    let bitMexClient = await getClient(params.keys)
    let marginCall = new Promise(async (resolve, reject) => {
        try {
            logEvent(LOG_LEVELS.info, RESPONSE_CODES.LOG_MESSAGE_ONLY, `Retrieving Margin from Bitmex`)
            margin = await bitMexClient.makeRequest('GET', 'user/wallet')
        } catch (e) { reject(e) }
        finally { resolve(margin) }
    })

    await marginCall

    return margin
}

/**
 * Summary   Get the Orders for a bot filtered by whether they are open or closed
 * @param keys An object containing the api_id and the api_secret
 * @param date Retrive the orders from a speciic date
 * @param type Filters the orders by whether they are still opened or closed
 */
getOrders = async (params) => {
    let getOrders

    let bitMexClient = await getClient(params.keys)
    ordersCall = new Promise(async function (resolve, reject) {
        try {
            logEvent(LOG_LEVELS.info, RESPONSE_CODES.LOG_MESSAGE_ONLY, `Retrieving ${params.params.type} Orders from Bitmex`)
            getOrders = await bitMexClient.makeRequest('GET', 'order', {
                count: 500,
                start_time: params.date,
                filter: { "ordStatus": params.type },
                reverse: false
            })
        } catch (e) { reject(e) }
        finally { resolve(getOrders) }
    })

    await ordersCall

    // Fail safe to ensure that we can push data to kafka even if there are no orders to process
    if (!getOrders.length) {
        getOrders.push("empty")
    }

    return getOrders
}

/**
 * Summary   Get the Orders for a bot filtered by whether they are open or closed
 * @param keys An object containing the api_id and the api_secret
 * @param symbol The pairing we want to set the order in
 * @param side Specify of the order is meant to buy or sell
 * @param order_qty Amount of contracts the order should have
 * @param price Price at which the order should execute 
 * @param stop_price Stop price for a given order
 * @param order_type The order type, ussually Limit or Market
 * @param time_in_force How long the order will be in place ussually GoodTillCancelled or FillOrKill
 * @param exec_instructions Optional execution instructions. Valid options: ParticipateDoNotInitiate, AllOrNone, MarkPrice, IndexPrice, LastPrice, Close, ReduceOnly, Fixed. 
 */
setOrders = async (params) => {
    let postOrders

    let bitMexClient = await getClient(params.keys)
    setOrdersCall = new Promise(async function (resolve, reject) {
        try {
            logEvent(LOG_LEVELS.info, RESPONSE_CODES.LOG_MESSAGE_ONLY, `Setting a ${params.order_type} ${params.side} Order of ${params.symbol} for ${params.order_qty} @ $${params.price}`)
            postOrders = await bitMexClient.makeRequest('POST', 'order', {
                symbol: params.symbol,
                side: params.side,
                orderQty: params.order_qty,
                price: params.price,
                stopPx: params.stop_price,
                ordType: params.order_type,
                timeInForce: params.time_in_force,
                execInst: params.exec_instructions
            })
        } catch (e) { reject(e) }
        finally { resolve(postOrders) }
    })

    await setOrdersCall

    return postOrders
}

/**
 * Summary   Cancels an order when given and ID 
 * @param keys An object containing the api_id and the api_secret
 * @param order_id The id of the order we want to kill, ussualy stored in the db
 */
cancelOrders = async (params) => {
    let cancelOrders

    let bitMexClient = await getClient(params.keys)
    cacelOrdersCall = new Promise(async function (resolve, reject) {
        try {
            logEvent(LOG_LEVELS.info, RESPONSE_CODES.LOG_MESSAGE_ONLY, `Cancellin Order with ID: ${params.order_id}`)
            cancelOrders = await bitMexClient.makeRequest('DELETE', 'order', {
                orderID: params.order_id,
            })
        } catch (e) { reject(e) }
        finally { resolve(cancelOrders) }
    })

    await cacelOrdersCall

    return cancelOrders
}

/**
 * Summary   Modify the default leverage for a speicifc pairing 
 * @param keys An object containing the api_id and the api_secret
 * @param symbol Name of the symbol we want to modify the leverage for
 */
setLeverage = async (params) => {
    let bitMexClient = await getClient(params.keys)

    let leverage
    setLeverage = new Promise(async function (resolve, reject) {
        try {
            logEvent(LOG_LEVELS.info, RESPONSE_CODES.LOG_MESSAGE_ONLY, `Setting leverage of ${params.symbol} to ${params.leverage}x`)
            leverage = await bitMexClient.makeRequest('POST', 'position/leverage', {
                symbol: params.symbol,
                leverage: params.leverage,
            })
        } catch (e) { reject(e) }
        finally { resolve(leverage) }
    })

    await setLeverage

    return leverage
}

/**
 * Summary   A websocket that pulls live-trading information directly for  
 * @param keys An object containing the api_id and the api_secret
 * @param symbol Name of the symbol we want to modify the leverage on
 * @param leverage The actual leverage we wish to change to [1-100]
 */
getPositions = async (params) => {
    let bitMexClient = await getClient(params.keys)
    positionsCall = new Promise(async function (resolve, reject) {
        try {
            let topic = "positions"
            logEvent(LOG_LEVELS.info, RESPONSE_CODES.LOG_MESSAGE_ONLY, `Push ${params.symbol} position from ${params.bot_id} to Kafka`)
            await bitMexClient.monitorStream(`${params.symbol}`, "position", async (data) => {
                let positionObject = {
                    bot_id: params.bot_id,
                    data: data
                }
                await kafkaProduce(topic, positionObject)
            });
            resolve()
        } catch (e) { reject(e) }
    })

    await positionsCall
        .then(
            logEvent(LOG_LEVELS.info, RESPONSE_CODES.LOG_MESSAGE_ONLY, `Starting positions stream`)
        )
        .catch(async function (e) {
            await errorHandling(e)
        })

    return
}

/**
 * Summary   Pulls  historic Pricing information for a given asset
 * @param keys An object containing the api_id and the api_secret
 * @param bin_size Size of the candles we want to retriev the pricing info for
 * @param symbol The pairing we want to retrieve the info from
 * @param start_time The starting point to retrieve the pricing ino from
 * @param end_time The finishing point to retrieve the pricing ino from
 * @param leverage The actual leverage we wish to change to [1-100]
 */
getHistory = async (params) => {
    let pricePoint

    let bitMexClient = await getClient(params.keys)
    let backtestCall = new Promise(async function (resolve, reject) {
        logEvent(LOG_LEVELS.info, RESPONSE_CODES.LOG_MESSAGE_ONLY, `Retrieving PriceHistory from ${params.start_time} to ${params.end_time}`)
        try {
            pricePoint = await bitMexClient.makeRequest('GET', 'trade/bucketed', {
                binSize: params.bin_size,
                reverse: false,
                count: 750,
                startTime: params.start_time,
                endTime: params.end_time,
                symbol: params.symbol
            })
        } catch (e) { reject(e) }
        finally { resolve(pricePoint) }
    })

    await backtestCall

    return pricePoint
}

/**
 * Summary   Pulls current Pricing information for a given asset in a give time_frame
 * @param keys An object containing the api_id and the api_secret
 * @param asset Name of the symbol we want to retrieve the information of
 * @param time_frame The candle size the info return should contain
 */
streamPrice = async (params) => {
    let topic = "bitmexPriceStream"

    let bitMexClient = await getClient(params.keys)
    tradeBinStream = new Promise(async function (resolve, reject) {
        try {
            logEvent(LOG_LEVELS.info, RESPONSE_CODES.LOG_MESSAGE_ONLY, `Initialising stream for ${params.time_frame}${params.asset}`)
            await bitMexClient.monitorStream(params.asset, `tradeBin${params.time_frame}`, async (data, e) => {
                if (e) { reject(e) }
                let symbol = params.time_frame + data.symbol

                streamingObject = {
                    timestamp: data.timestamp,
                    symbol: symbol,
                    open: data.open,
                    close: data.close,
                    high: data.high,
                    low: data.low,
                    volume: data.volume
                }

                kafkaProduce(topic, streamingObject)
            });
            resolve()
        } catch (e) {
            reject(e)
        }
    })

    // No need to await the promise since this is meant to be running continuosly
    tradeBinStream
        .then(
            logEvent(LOG_LEVELS.info, RESPONSE_CODES.LOG_MESSAGE_ONLY, `Price stream for ${params.time_frame}${params.asset} started`)
        )
        .catch(async function (e) {
            await errorHandling(e)
        })

    return
}

/**
 * Summary   Instantiate a client for the exchange
 * @param keys An object containing the api_id and the api_secret
 */
getClient = async (params) => {
    logEvent(LOG_LEVELS.info, RESPONSE_CODES.LOG_MESSAGE_ONLY, `Creating a Bitmex client to retrieve data`)
    let client = new Promise(async function (resolve, reject) {
        try {
            let bitMexClient = new BitMexPlus({
                apiKeyID: params.apiKeyID,
                apiKeySecret: params.apiKeySecret
            })

            bitMexClient.on('end', async (code) => { reject(code) });
            bitMexClient.on('error', async (error) => { reject(error) });

            resolve(bitMexClient)
        }
        catch (e) { await errorHandling(e) }
    })

    let newClient = await client

    return newClient
}

module.exports = { getMargin, getOrders, setOrders, cancelOrders, getHistory, getPositions, setLeverage, streamPrice }
