const {tradeBin} = require('./kafkaStreams/tradeBin')
const {defaultKeysUpload} = require('./botManagement/defaultKeysUpload')

/**
 * Summary    Call an upload function followed by a streaming function
 */
startUpScripts = async () => {
    await defaultKeysUpload()
    await tradeBin('1m','XBTUSD')
}

module.exports = {startUpScripts}
