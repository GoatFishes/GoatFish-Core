let { keys, exchange } = require('../../api_key/keys')
let { insertBotKeys } = require('../../utils/database/db')

/**
 * Summary    Function to upload a default set of keys to retrieve live data
 */
defaultKeysUpload = async () => {
    await insertBotKeys(["defaultKeys", keys, exchange])
    return
}

module.exports = { defaultKeysUpload };

