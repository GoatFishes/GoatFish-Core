var fs = require('fs');
const Koa = require('koa')
const route = require('koa-route')
const { exec } = require('child_process');
const logEvent = require('../utils/logger')
const ExceptionHandler = require('../utils/ExceptionHandler')
const { LOG_LEVELS, RESPONSE_CODES } = require('../utils/constants')
const { insertBotKeys, insertBotStrategy, selectBotByBotId } = require('../utils/database/db')

module.exports = async () => {
    const app = new Koa()

    /**
     * Summary    Uploads all the information sorrounding a bot. 
     * @param {string} bot_id Unique name for the bot
     * @param {string} strategy Strategy the bot should execute. 
     * @param {string} api_key_id Key id for the API
     * @param {string} api_key_secret Secret for the API
     * @param {string} exchange Exchange the api keys belong to
     * @param {string} port_number Port the bot will be accessible at
     * @param {string} pair An array of strings specifying the time_frame-pair this bot will watch. Defaults to all. Strings should be structured like 1mXBTUSD[time_framePair].
     */
    app.use(route.post('/upload', async (ctx) => {
        let bot_id
        try {
            logEvent(LOG_LEVELS.info, RESPONSE_CODES.LOG_MESSAGE_ONLY, `Validating the payload`)
            const payload = ctx.checkPayload(ctx, 'upload')
            if (!payload) {
                throw new ExceptionHandler(RESPONSE_CODES.APPLICATION_ERROR, 'PAYLOAD ISSUE : ' + global.jsonErrorMessage)
            }

            bot_id = payload.bot_id
            let strategy = payload.strategy
            let apiKeyID = payload.api_key_id
            let apiKeySecret = payload.api_key_secret
            let exchange = payload.exchange
            let port = payload.port_number
            let pair = payload.pair

            let key = {
                apiKeyID: apiKeyID,
                apiKeySecret: apiKeySecret
            }

            logEvent(LOG_LEVELS.info, RESPONSE_CODES.LOG_MESSAGE_ONLY, `Inserting bot keys into the database`)
            await insertBotKeys([bot_id, key, exchange])

            logEvent(LOG_LEVELS.info, RESPONSE_CODES.LOG_MESSAGE_ONLY, `Uploading a new bot strategy`)
            await insertBotStrategy([bot_id, strategy, 0.0, 0.0, port, pair, "Stop"])

            logEvent(LOG_LEVELS.info, RESPONSE_CODES.LOG_MESSAGE_ONLY, `Copy startegy into a js file`)
            await fs.writeFile(`/usr/src/app/strategies/${bot_id}.js`, strategy, function (err) {
                if (err) { throw new ExceptionHandler(RESPONSE_CODES.APPLICATION_ERROR, 'Fatal error copying the file : ' + err) }
            });
        } catch (e) { throw new ExceptionHandler(RESPONSE_CODES.APPLICATION_ERROR, 'UPLOAD ISSUE : ' + e) }

        ctx.status = 200
        ctx.body = {
            data: {
                bot_id: bot_id,
                upload: "OK"
            }
        }
    }))

    /**
     * Summary    Bring up a bot container 
     * @param {string} bot_id Unique name for the bot 
     */
    app.use(route.post('/initiliaze', async (ctx) => {
        let BOT_ID
        try {
            logEvent(LOG_LEVELS.info, RESPONSE_CODES.LOG_MESSAGE_ONLY, `Validating the payload`)

            const payload = ctx.checkPayload(ctx, 'execute')
            if (!payload) {
                throw new ExceptionHandler(RESPONSE_CODES.APPLICATION_ERROR, 'PAYLOAD ISSUE : ' + global.jsonErrorMessage)
            }

            BOT_ID = payload.bot_id

            logEvent(LOG_LEVELS.info, RESPONSE_CODES.LOG_MESSAGE_ONLY, `Retrieving the bitmex API keys for a given Bot`)

            // Taken from the db
            let botInfo = await selectBotByBotId([BOT_ID])
            let pair = botInfo[0].pair
            let PORT = botInfo[0].port_n
            let PAIR = pair.join()

            logEvent(LOG_LEVELS.info, RESPONSE_CODES.LOG_MESSAGE_ONLY, `Setting up containerised bot`)
            exec(`curl --unix-socket /var/run/docker.sock -H "Content-Type: application/json" -d '{ "Image": "strategy_baseline", "ExposedPorts": { "${PORT}/tcp": {} }, "HostConfig": { "Binds": ["database:/usr/src/app/utils/database","utils:/usr/src/app/utils:delegated","${process.env.CURRENT_PATH}/backend/bots/api/strategies/${BOT_ID}.js:/usr/src/app/strategies/${BOT_ID}.js"], "NetworkMode": "titan_backend", "PortBindings": { "${PORT}/tcp": [{ "HostPort": "${PORT}" }]}}, "Env": ["BOTNAME=${BOT_ID}", "PORT=${PORT}", "PAIR=${PAIR}"]}' -X POST http:/v1.4/containers/create?name=${BOT_ID}`,
                (err, stdout, stderr) => {
                    console.log(stdout)
                    console.log(stderr)
                    if (err) {
                        reject(err)
                        return;
                    }
                    exec(`curl --unix-socket /var/run/docker.sock -X POST http:/v1.4/containers/${BOT_ID}/start`, (err, stdout, stderr) => {
                        if (err) {
                            reject(err)
                            return;
                        }
                    });
                });
        } catch (e) { throw new ExceptionHandler(RESPONSE_CODES.APPLICATION_ERROR, 'Initialization fatal error : ' + e) }

        ctx.status = 200
        ctx.body = {
            data: {
                bot_id: BOT_ID,
                status: "Stop"
            }
        }
    }))

    return app
}
