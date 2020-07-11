const db = require('./databaseManager')

//***************//
// Exchange Keys //
//***************//

/**
 * Insert exchnange Keys
 * 
 * @param {String} exchange Unique exchange name
 * @param {Object} exchange_key Object storing the API key and secret
 */
const insertExchangeKeys = async (params) => {
    let exchange = params[0]
    let { rows } = await db.query('SELECT * FROM exchange_keys WHERE exchange = $1', [exchange])

    if (!rows.length) {
        await db.query('INSERT INTO exchange_keys(exchange, exchange_key) VALUES ($1, $2)', params)
    }
    else {
        return ("Exchange already exists")
    }

    return
}

/**
 * Select the keys for a given exchange
 * 
 * @param {String} exchange Unique exchange name
 * 
 * @returns {Array} An array of objects containing all the rows in the exchange_keys table filtered by exchange name
 */
const selectKeysByExchange = async (params) => {
    let { rows } = await db.query('SELECT * FROM exchange_keys WHERE exchange = $1', params)
    if (!rows.length) {
        console.log("No exchanges on record")
    }

    return rows
}


//**********//
// Bot_Keys //
//**********//
/**
 * Select the API keys for a given bot
 * 
 * @param {String} exchange Unique exchange name
 * @param {Object} bot_key Object storing the API key and secret
 * @param {String} bot_id Object storing the API key and secret
 */
const insertBotKeys = async (params) => {
    let { rows } = await db.query('SELECT * FROM bot_keys WHERE bot_id = $1 AND bot_key = $2 AND exchange = $3', params)

    if (!rows.length) {
        await db.query('INSERT INTO bot_keys(bot_id, bot_key, exchange) VALUES ($1, $2, $3)', params)
    }
    return
}

/**
 * Insert the API keys for a unique Bot
 * 
 * @param {String} exchange Unique exchange name
 * @param {Object} bot_key Object storing the API key and secret
 * @param {String} bot_id Unique bot_id
 * 
 * @returns {Array} An array of objects containing all the rows in the bot_keys table filtered by bot_id
 */
const selectKeysByBotId = async (params) => {
    let { rows } = await db.query('SELECT * FROM bot_keys WHERE bot_id = $1', params)
    if (!rows.length) {
        console.log("No exchanges on record")
    }
    return rows
}

/**
 * Select all the API keys for the bot_keys table
 * 
 * @returns {Array} An array of objects containing all the rows in the bot_keys table
 */
const selectAllKeys = async () => {
    let { rows } = await db.query('SELECT * FROM bot_keys')
    if (!rows.length) {
        console.log("No exchanges on record")
    }

    return rows
}

//********//
// Orders //
//********//
/**
 * Insert a new order
 * 
 * @param {String} bot_id Unique bot_id 
 * @param {String} exchange Object storing the API key and secret
 * @param {String} order_id Unique identifier for an order
 * @param {String} position_ref Reference to the position id the order belogns to
 * @param {Date} _timestamp Timestamp the order was executed at
 * @param {String} order_status Status of the order  [ Submited, Filled, Open ]
 * @param {String} side Direction of the trade being made 
 * @param {Number} size Amount of contracts traded in the order
 * @param {Number} _price Price the contracts where bought at
 * @param {Number} margin Initial margin required to excute the trade
 * @param {Number} leverage Multiplier of borrowed capital aginst the initial margin to determine the size of the order
 * @param {String} order_type Order type [ Limit, Market ]
 * @param {Number} average_price Average price the order was filled at
 */
const insertOrder = async (params) => {
    await db.query('INSERT INTO orders(bot_id, exchange, order_id, position_ref, _timestamp, order_status, side, size, _price, margin, leverage, order_type, average_price) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)', params)
    return
}

/**
 * Select all orders
 * 
 * @returns {Array} An array of objects containing all the rows in the orders table
 */
const selectOrders = async () => {
    let { rows } = await db.query('SELECT * FROM orders')
    return rows
}

/**
 * Select the latest order for a given bot
 * 
 * @param {String} bot_id Unique identifier for a bot
 * 
 * @returns {Date} The latest saved date
 */
const selectLatestOrder = async (params) => {
    let defaultStart = "2007-01-01T00:00:00.000Z"
    let { rows } = await db.query('SELECT _timestamp FROM orders WHERE _timestamp = ( SELECT max ("_timestamp") FROM  orders ) AND bot_id = $1', params)
    if (!rows.length) {
        return defaultStart
    }
    return rows[0]._timestamp
}

/**
 * Select the latest order for a given bot
 * 
 * @param {String} bot_id Unique identifier for a bot
 * 
e */
const selectOrdersByStatus = async (params) => {
    let { rows } = await db.query('SELECT * FROM orders WHERE order_status = $1 AND position_ref IS NULL ORDER BY id ASC', params)

    return rows
}

/**
 * Update the a single order position_ref column
 * 
 * @param {String} order_id Unique identifier for an order
 * @param {String} position_ref Unique identifier for a position
 */
const updateOrderPositionId = async (params) => {
    await db.query('UPDATE orders SET position_ref=$1 WHERE order_id=$2', params)
    return
}

/**
 * Update the status of a single order
 * 
 * @param {String} order_id Unique identifier for an order
 * @param {String} order_status Updated status of an order
 */
const updateOrderStatus = async (params) => {
    await db.query('UPDATE orders SET order_status=$1 WHERE order_id=$2', params)
    return
}

//**************//
// Paper_Orders //
//**************//

/**
 * Select all paper orders
 * 
 * @returns {Array} An array of objects containing all the rows in the paper_orders table
 */
const selectPaperOrders = async () => {
    let { rows } = await db.query('SELECT * FROM paper_orders')
    return rows
}

/**
 * Select the latest order for a given bot
 * 
 * @param {String} bot_id Unique identifier for a bot
 * 
 * @returns {Array} An array of objects containing all the rows in the paper_orders table ordered by order_statu and  in ascending order
 */
const selectPaperOrdersByStatus = async (params) => {
    let { rows } = await db.query('SELECT * FROM paper_orders WHERE order_status = $1 AND position_ref IS NULL ORDER BY id ASC', (params))

    return rows
}

/**
 * Insert a new paper order
 * 
 * @param {String} bot_id Unique bot_id 
 * @param {String} exchange Object storing the API key and secret
 * @param {String} order_id Unique identifier for an order
 * @param {String} position_ref Reference to the position id the order belogns to
 * @param {Date} _timestamp Timestamp the order was executed at
 * @param {String} order_status Status of the order  [ Submited, Filled, Open ]
 * @param {String} side Direction of the trade being made 
 * @param {Number} size Amount of contracts traded in the order
 * @param {Number} _price Price the contracts where bought at
 * @param {Number} margin Initial margin required to excute the trade
 * @param {String} order_type Order type [ Limit, Market ]
 * @param {Number} leverage Multiplier of borrowed capital aginst the initial margin to determine the size of the order
 * @param {String} average_price Average price the order was filled at
 */
const insertPaperOrder = async (params) => {
    await db.query('INSERT INTO paper_orders(bot_id, exchange, order_id, position_ref, _timestamp, order_status, side, size, _price, margin, leverage, order_type, average_price) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)', params)
    return
}


/**
 * Update the status of a single paper order
 * 
 * @param {String} order_id Unique identifier for an order
 * @param {String} order_status Updated status of an order
 */
const updatePaperOrderStatus = async (params) => {
    await db.query('UPDATE paper_orders SET order_status=$1 WHERE order_id=$2', params)
    return
}

/**
 * Update the a single paper order position_ref column
 * 
 * @param {String} order_id Unique identifier for an order
 * @param {String} position_ref Unique identifier for a position
 */
const updatePaperOrderPositionId = async (params) => {
    await db.query('UPDATE paper_orders SET position_ref=$1 WHERE order_id=$2', params)
    return
}


//************//
// Websockets //
//************//

/**
 * Select all websockets for a given exchange
 * 
 * @param {String} exchange Name of the exchange we want to filter the wbsokcets by 
 * 
 * @returns {Array} An array of objects containing all the rows in the websockets table filtered by exchange
 */
const selectWebsocketByExchange = async (params) => {
    let { rows } = await db.query('SELECT * FROM websockets WHERE exchange = $1', params)
    if (!rows.length) {
        errorHandling("No exchanges on record")
    }

    return rows
}

/**
 * Insert a new websocket
 * 
 * @param {String} exchange Name of the exchange we want to filter the wbsokcets by 
 * @param {String} asset coin pair
 * @param {String} time_frame time frame for the pair
 * 
 * @returns {Boolean} A boolean specifying whether a given websocket exists
 */
const insertWebsocket = async (params) => {
    let { rows } = await db.query('SELECT * FROM websockets WHERE exchange = $1 AND asset = $2 AND time_frame = $3', params)

    if (!rows.length) {
        await db.query('INSERT INTO websockets(exchange, asset, time_frame) VALUES ($1, $2, $3)', params)
    }
    else { return false }

    return true
}


//***************//
// Price History //
//***************//

/**
 * Select the price history in ascending order  filtering by pair time frame and exchange
 * 
 * @param {String} exchange Name of the exchange we want to filter the wbsokcets by 
 * @param {String} pair coin pair
 * @param {String} time_frame time frame for the pair
 * 
 * @returns {Array} An array of objects containing all the rows in the websockets table filtered by exchange
 */
const selectAllPriceHistory = async (params) => {
    let { rows } = await db.query('SELECT * FROM price_history WHERE time_frame = $1 AND pair = $2 AND exchange = $3 ORDER BY _timestamp ASC', params)

    return rows
}

/**
 * Select the latest price history in descending order 
 * 
 * @param {String} exchange Name of the exchange we want to filter the wbsokcets by 
 * @param {String} pair coin pair
 * @param {String} time_frame time frame for the pair
 * 
* @returns {Array} An array of objects containing all the rows in the price_history table filtered by time_frame, pair and exchange and the _timestamp in descending time order
 */
const selectLatestPriceHistory = async (params) => {
    let { rows } = await db.query('SELECT _timestamp FROM price_history WHERE time_frame = $1 AND pair = $2 AND exchange = $3 ORDER BY _timestamp DESC', params)

    return rows
}

/**
 * Insert price history record 
 * 
 * @param {String} exchange Name of the exchange we want to filter the wbsokcets by 
 * @param {String} pair coin pair
 * @param {String} time_frame time frame for the candle
 * @param {Date} _timestamp timestamp for the candle
 * @param {Number} _open open of the candle
 * @param {Number} _close close of the candle
 * @param {Number} _high highest point of the candle
 * @param {Number} _low lowest point of the candle
 * @param {Number} _volume total volume for the candle 
 */
const insertPriceHistory = async (params) => {
    let { rows } = await db.query('INSERT INTO price_history(pair, time_frame, exchange, _timestamp, _open, _close, _high, _low, _volume) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)', params)

    return rows
}

//********//
// Margin //
//********//
/**
 * Insert the current margin into the db
 * 
 * @param {String} bot_id Unique id for the bot
 * @param {String} amount Margin amount for the bot
 * @param {Date} _timestamp Timestamp at which th margin was received
 */
const insertMargin = async (params) => {
    await db.query('INSERT INTO MARGIN(amount, bot_id, _timestamp) VALUES($1, $2, $3)', params)
    return
}

/**
 * Check whether the amount has already been persited for a given time
 * 
 * @param {String} bot_id Unique id for the bot
 * @param {String} amount Margin amount for the bot
 * @param {Date} _timestamp Timestamp at which th margin was received
 */
const selectMargin = async (params) => {
    let { rows } = await db.query('SELECT * FROM MARGIN WHERE AMOUNT = $1 AND _timestamp = $2', params)

    if (rows.length === 0) {
        return null
    }
    else {
        return rows
    }
}

//*****//
// Bot //
//*****//
/**
 * Update the performance of a specific bot
 * 
 * @param {String} bot_id Unique id for the bot
 * @param {String} strategy Strategy the bot will execute
 * @param {Number} performance Performance of the strategy
 * @param {Number} margin Margin available for the bot to execute trades
 * @param {Number} port_n port with which the 
 * @param {String} pair Array of coin pairs you wish to watch and execute the strategy on
 * @param {String} _status Current status of the bot
 */
const insertBotStrategy = async (params) => {
    let checkVar = params[0]
    let { rows } = await db.query('SELECT * FROM bots WHERE bot_id = $1', [checkVar])

    if (!rows.length) {
        await db.query('INSERT INTO bots(bot_id, strategy, performance, margin, port_n, pair, _status) VALUES($1, $2, $3, $4, $5, $6, $7)', params)
    }

    return
}

/**
 * Select the bot info filtering by a bot_id
 * 
 * @param {String} bot_id Unique id for the bot
 */
const selectBotByBotId = async (params) => {
    let { rows } = await db.query('SELECT * FROM bots WHERE bot_id = $1 ', params)
    return rows
}

/**
 * Update the status of a bot
 * 
 * @param {String} bot_id Unique id for the bot
 * @param {String} _status Status we want to update the bot to
 */
const updateBotStrategyStatus = async (params) => {
    let { rows } = await db.query('UPDATE bots SET _status = $1 WHERE bot_id = $2', params)
    return rows
}

/**
 * Update the status of a bot
 * 
 * @param {String} bot_id Unique id for the bot
 * @param {String} margin Most up to date margin of the bot
 */
const updateBotMargin = async (params) => {
    await db.query('UPDATE bots SET margin = $1 WHERE bot_id = $2', params)

    return
}


//***********//
// Positions //
//***********//
/**
 * Insert a new position into the database
 * 
 * @param {String} position_id Unique id for the position
 * @param {String} bot_id Unique id for the bot
 * @param {Number} entry_price Price entry point
 * @param {Number} init_margin Intial margin required to open the position
 * @param {Date} start_time Date time of the order that open the position was filled
 * @param {Date} end_time Date time of the order that closed the position was filled
 * @param {String} side The direction of the trade [ Buy, Sell ]
 * @param {String} size Number of contracts at the height of the positions
 * @param {Number} profit_loss Profitability of the position
 * @param {Number} roe Return on equity represented as a percentage
 * @param {Number} leverage Multiplier of borrowed capital aginst the initial margin to determine the size of the order
 * @param {Number} average_price Average price to build the position
 */
const insertPosition = async (params) => {
    await db.query('INSERT INTO position(position_id, bot_id, entry_price, init_margin, start_time, end_time, side, size, profit_loss, roe, leverage, average_price) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)', params)
    return
}

/**
 * Select all the rows from the position table
 *
 * @returns {Array} An array of objects containing all the rows in the position table
 */
const selectPositions = async () => {
    let { rows } = await db.query('SELECT * FROM position')
    return rows
}


//*****************//
// Paper Positions //
//*****************//
/**
 * Insert a new paper position into the database
 * 
 * @param {String} position_id Unique id for the position
 * @param {String} bot_id Unique id for the bot
 * @param {String} entry_price Price entry point
 * @param {Number} init_margin Intial margin required to open the position
 * @param {Date} start_time Date time of the order that open the position was filled
 * @param {String} end_time Date time of the order that closed the position was filled
 * @param {String} side The direction of the trade [ Buy, Sell ]
 * @param {Number} size Number of contracts at the height of the positions
 * @param {Number} profit_loss Profitability of the position
 * @param {Number} roe Return on equity represented as a percentage
 * @param {Number} leverage Multiplier of borrowed capital aginst the initial margin to determine the size of the order
 * @param {Number} average_price Average price to build the position
 */
const insertPaperPosition = async (params) => {
    await db.query('INSERT INTO paper_position(position_id, bot_id, entry_price, init_margin, start_time, end_time, side, size, profit_loss, roe, leverage, average_price) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)', params)
    return
}

/**
 * Select all the rows from the paper position table
 *
 * @returns {Array} An array of objects containing all the rows in the paper position table
 */
const selectPaperPositions = async () => {
    let { rows } = await db.query('SELECT * FROM paper_position')
    return rows
}

//************************//
//  Backtest Performance  //
//************************//
/**
 * Insert the performance of a backtest into the overall profits of a 
 *
 * @param {String} avg_time Average time it took the bot to carry out a trade
 * @param {String} average_profit Average profit for each position
 * @param {String} overall_profit Overall profit for the backtest
 * @param {Number} number_of_trades number of trades executed
 * @param {Date} longest_trade Longest trade in the entire backtest
 * @param {String} shortest_trade Shortest trade in the entire backtest
 * @param {String} best_trade Best performing trade
 * @param {String} worst_trade worst performing trade
 */
const insertPerformance = async (params) => {
    await db.query('INSERT INTO test_performance(avg_time, average_profit, overall_profit, number_of_trades, sharpe_ratio, longest_trade, shortest_trade, best_trade, worst_trade) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)', params)
    return
}

/**
 * Select all the rows from the performance
 *
 * @returns {Array} An array of objects containing all the rows in the paper position table
 */
const selectPerformance = async () => {
    let { rows } = await db.query(
        'SELECT * FROM test_performance'
    )

    return rows
}

//**********************//
//  Backtest Execution  //
//**********************//
/**
 * Truncate all the information in backtest_trade and test_performance
 */
const cleanTrade = async () => {
    await db.query('Truncate backtest_trade, test_performance')
}

/**
 * Insert the performance of a backtest into the overall profits of a 
 *
 * @param {String} symbol Asset pair the trade is executed on
 * @param {String} side Direction of the trade
 * @param {String} order_qty Size of the Order
 * @param {Number} price Price at which the order was executed 
 * @param {Date} order_type Type of order submitted
 * @param {String} time_in_force Time to live instructions of the order
 * @param {String} _timestamp Execution date time of the trade
 * @param {String} leverage Multiplier of borrowed capital aginst the initial margin to determine the size of the order
 */
const addTrade = async (params) => {
    for (let i = 0; i < params.length; i++) {
        await db.query(
            'INSERT INTO backtest_trade(symbol, side, order_qty, price, order_type, time_in_force, _timestamp, leverage) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
            [
                params[i].symbol
                , params[i].side
                , params[i].orderQty
                , params[i].price
                , params[i].orderType
                , params[i].timeInForce
                , params[i].timestamp
                , params[i].leverage
            ]
        )
    }
}

/**
 * Select all the rows from the backtest trades
 *
 * @returns {Array} An array of objects containing all the rows in the paper position table
 */
const selectAllTrades = async () => {
    let { rows } = await db.query(
        'SELECT * FROM backtest_trade'
    )
    return rows
}


//*********//
// Overall //
//*********//
/**
 * Truncate all the Tables in the database
 */
const TruncateTables = async () => {
    await db.query('Truncate bots, websockets, margin, bot_keys, exchange_keys, paper_position, paper_orders, position, orders, backtest_trade, test_performance, price_history')
    return
}



module.exports = {
    // Exchange Keys
    insertExchangeKeys,
    selectKeysByExchange,

    // Bot Keys
    insertBotKeys,
    selectAllKeys,
    selectKeysByBotId,

    // Orders
    insertOrder,
    selectLatestOrder,
    selectOrdersByStatus,
    selectOrders,
    updateOrderStatus,
    updateOrderPositionId,

    // Paper Orders
    insertPaperOrder,
    selectPaperOrders,
    selectPaperOrdersByStatus,
    updatePaperOrderStatus,
    updatePaperOrderPositionId,

    // Websocket 
    selectWebsocketByExchange,
    insertWebsocket,

    //PriceHistory
    selectAllPriceHistory,
    selectLatestPriceHistory,
    insertPriceHistory,

    // Bots
    selectBotByBotId,
    insertBotStrategy,
    updateBotStrategyStatus,
    updateBotMargin,

    // Positions
    insertPosition,
    selectPositions,

    // Paper Positions
    insertPaperPosition,
    selectPaperPositions,

    // Margin
    insertMargin,
    selectMargin,

    // Backtest Performance
    selectPerformance,
    insertPerformance,

    // Backtest Execution
    cleanTrade,
    addTrade,
    selectAllTrades,

    // Overall 
    TruncateTables
}