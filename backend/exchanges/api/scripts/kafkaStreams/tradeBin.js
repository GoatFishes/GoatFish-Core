const { selectKeysByBotId } = require('../../utils/database/db')

/**
 * Summary   Fucntion to stream the a tradebin by default on start up
 * @param {string} asset Name of the pair we want to start watching
 * @param {string} time_frame candle size and frequency we want to watch for the specified asset
 */
tradeBin = async (time_frame, asset) => {
    let keys = await selectKeysByBotId(["defaultKeys"])
    exchangeModule = require(`../../exchanges/${keys[0].exchange}/${keys[0].exchange}`)
    exchangeModule.streamPrice({ keys: keys[0].bot_key, time_frame:time_frame, asset:asset })
}

module.exports = { tradeBin };
