const chai = require("chai")
const expect = chai.expect
const keys = require('./exchanges/api_key/keys')
const { consumer } = require('./utils/kafkaConsumer')

const { fetchLink, fetchLinkBody } = require('./utils/fetcher')
const {
    // Exchange Keys
    insertExchangeKeys,
    selectKeysByExchange,

    // Bot Keys
    selectKeysByBotId,
    selectAllKeys,
    insertBotKeys,

    // Websocket 
    selectWebsocketByExchange,
    insertWebsocket,

    // Orders
    selectOrdersByStatus,
    insertOrder,
    
    // PriceHistory
    selectAllPriceHistory,

    //All 
    TruncateTables
} = require('./utils/database/db')

let order_id

describe('Bitmex API', () => {
    describe('healthcheck', () => {
        it('Should return 200 when calling /healthcheck for the container', async () => {
            res = await fetchLink(`http://bots_api:3002/bots/healthcheck`, "GET")
            expect(JSON.stringify(res)).to.eql('{"data":"OK"}');
        })
    })

    describe('price stream', () => {
        describe('Init script', () => {
            it('Should push the correct data to Kafka', async () => {
                let msg = await consumer("bitmexPriceStream")
                let parsedMsg = JSON.parse(msg[0].value)

                expect(parsedMsg).to.have.property("timestamp")
                expect(parsedMsg).to.have.property("symbol")
                expect(parsedMsg).to.have.property("open")
                expect(parsedMsg).to.have.property("close")
                expect(parsedMsg).to.have.property("high")
                expect(parsedMsg).to.have.property("low")
                expect(parsedMsg).to.have.property("volume")
            })
            after(async () => {
                await TruncateTables()
            })
        })
        describe('Should add a second price stream', async () => {
            before(async () => {
                //Add a memeber to the bots databse so we can compare results 
                await insertExchangeKeys(["bitmex", keys.keys])
            })

            it('Should succesfully call the /pricestream/add endpoint', async () => {
                let body = { "exchange": "bitmex", "asset": "XBTUSD", "time_frame": "5m" }
                res = await fetchLinkBody("http://exchanges_api:3003/exchanges/pricestream/add", body, "POST")
            })

            it('Should contain the correct status', async () => {
                expect(res).to.have.property('data');
                expect(res.data).to.have.property('exchange');
                expect(res.data).to.have.property('asset');
                expect(res.data).to.have.property('time_frame');
            })

            after(async () => {
                await TruncateTables()
            })
        })
    })

    describe('backtest', () => {
        describe('/price', async () => {
            before(async () => {
                //Add a memeber to the bots databse so we can compare results 
                await insertBotKeys(["defaultKeys", keys.keys, "bitmex"])
            })

            // Upload a new bot
            var res
            it('Should succesfully call the / endpoint', async () => {
                let body = { "bin_size": "1m", "end_time": "2017-01-01T12:35:00.000Z", "symbol": "XBT", "bot_id": "defaultKeys" }
                res = await fetchLinkBody("http://exchanges_api:3003/exchanges/backtest/price", body, "POST")
            })

            it('Should persiste the information to the database', async () => {
                await sleep(500)
                let data = await selectAllPriceHistory(["1m", "XBT", "bitmex"])
                expect(data[0]).to.have.property('pair');
                expect(data[0]).to.have.property('time_frame');
                expect(data[0]).to.have.property('exchange');                
                expect(data[0]).to.have.property('_timestamp');
                expect(data[0]).to.have.property('_open');
                expect(data[0]).to.have.property('_close');                
                expect(data[0]).to.have.property('_high');
                expect(data[0]).to.have.property('_low');
                expect(data[0]).to.have.property('_volume');
            })

            it('Should contain the correct status', async () => {
                expect(res).to.have.property('data');
                expect(res.data).to.have.property('uuid');
                expect(res.data).to.have.property('message');
            })

            after(async () => {
                await TruncateTables()
            })
        })
    })

    describe('keys', () => {
        describe('/upload/bots', () => {
            let res
            let body
            it('Should succesfully call the /keys endpoint', async () => {
                body = { "bot_id": "defaultKeys", "api_key_id": keys.keys.apiKeyID, "api_key_secret": keys.keys.apiKeySecret, "exchange": "bitmex" }
                res = await fetchLinkBody("http://exchanges_api:3003/exchanges/key/upload/bots", body, "POST")
            })

            it('Should persist the new key to the database', async () => {
                let botInfo = await selectAllKeys()
                expect(body.bot_id).to.eql(botInfo[0].bot_id);
                //await botInfo[0].key.socket.instance._events.close("1000")
            })

            it('Should return the correct message', () => {
                expect(JSON.stringify(res)).to.eql('{"data":"OK"}');
            })

            after(async () => {
                await TruncateTables()
            })
        })
        describe('/upload/exchange', () => {
            let res
            let body
            it('Should succesfully call the /keys endpoint', async () => {
                body = { "api_key_id": keys.keys.apiKeyID, "api_key_secret": keys.keys.apiKeySecret, "exchange": "bitmex" }
                res = await fetchLinkBody("http://exchanges_api:3003/exchanges/key/upload/exchange", body, "POST")
            })

            it('Should persist the new key to the database', async () => {
                let botInfo = await selectKeysByExchange([body.exchange])
                expect(body.exchange).to.eql(botInfo[0].exchange);
            })

            it('Should return the correct message', () => {
                expect(JSON.stringify(res)).to.eql('{"data":"OK"}');
            })

            after(async () => {
                await TruncateTables()
            })
        })
    })

    describe('margin', () => {
        describe('/', () => {
            before(async () => {
                //Add a memeber to the bots databse so we can compare results 
                await insertBotKeys(["defaultKeys", keys.keys, "bitmex"])
            })

            let res
            it('Should succesfully call the /current endpoint', async () => {
                res = await fetchLink("http://exchanges_api:3003/exchanges/margin?bot_id=null", "GET")
            })

            it('Should push the correct data to Kafka', async () => {

                let msg = await consumer("margin")
                let parsedMsg = JSON.parse(msg[0].value)

                expect(parsedMsg).to.have.property("botId")
                expect(parsedMsg).to.have.property("exchange")
                expect(parsedMsg.data).to.have.property("account")
                expect(parsedMsg.data).to.have.property("currency")
                expect(parsedMsg.data).to.have.property("prevTimestamp")
            })

            it('Should return the correct message', () => {
                expect(JSON.stringify(res)).to.eql('{"data":"OK"}');
            })

            after(async () => {
                await TruncateTables()
            })
        })
    })

    describe('orders', () => {
        describe('/', () => {
            before(async () => {
                //Add a memeber to the bots databse so we can compare results 
                await insertBotKeys(["defaultKeys", keys.keys, "bitmex"])
            })

            let res
            it('Should succesfully call the / endpoint', async () => {
                res = await fetchLink("http://exchanges_api:3003/exchanges/orders?bot_id=defaultKeys&type=filled", "GET")
            }).timeout(6000)

            it('Should push the correct data to Kafka', async () => {
                let msg = await consumer("orders")
                let parsedMsg = JSON.parse(msg[0].value)

                expect(parsedMsg).to.have.property('bot_id');
                expect(parsedMsg).to.have.property('exchange');
                expect(parsedMsg).to.have.property('data');
            })

            it('Should return the correct message', () => {
                expect(JSON.stringify(res)).to.eql('{"data":"OK"}');
            })

            after(async () => {
                await TruncateTables()
            })
        })

        describe('/set', () => {
            before(async () => {
                //Add a memeber to the bots databse so we can compare results 
                await insertBotKeys(["defaultKeys", keys.keys, "bitmex"])
                body = {
                    "bot_id": "defaultKeys",
                    "symbol": "XBTUSD",
                    "order_type": "Limit",
                    "time_in_force": "GoodTillCancel",
                    "price": 8000,
                    "order_qty": 10,
                    "side": "Buy"
                }
            })

            let res
            it('Should succesfully call the / endpoint', async () => {
                res = await fetchLinkBody("http://exchanges_api:3003/exchanges/orders/set", body, "POST")
            })

            it('Should push the correct order to the exchange', async () => {
                order_id = res.data.order_id
                expect(res.data).to.have.property('exchange');
                expect(res.data).to.have.property('order_id');
                expect(res.data).to.have.property('time_stamp');
                expect(res.data).to.have.property('order_status');
                expect(res.data).to.have.property('side');
                expect(res.data).to.have.property('order_quantity');
                expect(res.data).to.have.property('price');
            })

            after(async () => {
                await TruncateTables()
            })
        })

        describe('/cancel', () => {
            before(async () => {
                //Add a memeber to the bots databse so we can compare results 
                await insertBotKeys(["defaultKeys", keys.keys, "bitmex"])
                await insertOrder(["defaultKeys", "bitmex", order_id, null, "2019-08-08T01:04:28.939Z", "Open", "Buy", 1000, 8000, 4000, 10, "Limit", "10"])

                body = {
                    "bot_id": "defaultKeys",
                    "order_id": order_id,
                }
            })

            let res
            it('Should succesfully call the / endpoint', async () => {
                res = await fetchLinkBody("http://exchanges_api:3003/exchanges/orders/cancel", body, "POST")
            })

            it('Should push the correct order to the exchange', async () => {
                expect(res.data).to.have.property('exchange');
                expect(res.data).to.have.property('order_id');
                expect(res.data).to.have.property('time_stamp');
                expect(res.data).to.have.property('order_status');
                expect(res.data).to.have.property('side');
                expect(res.data).to.have.property('order_quantity');
                expect(res.data).to.have.property('price');
                expect(res.data.order_status).to.eql('Canceled');
            })

            it('Should update the state of the order', async () => {
                let orderInfo = await selectOrdersByStatus(['Canceled'])
                expect(orderInfo[0].order_id).to.eql(order_id)
            })

            after(async () => {
                await TruncateTables()
            })
        })
    })

    describe('position', () => {
        describe('/', () => {
            before(async () => {
                //Add a memeber to the bots databse so we can compare results 
                await insertBotKeys(["defaultKeys", keys.keys, "bitmex"])
            })

            let res
            it('Should succesfully call the / endpoint', async () => {
                res = await fetchLink("http://exchanges_api:3003/exchanges/positions?bot_id=defaultKeys&symbol=XBTUSD", "GET")
            })

            it('Should push the correct data to Kafka', async () => {
                // Import Kafka
                let msg = await consumer("positions")
                let parsedMsg = JSON.parse(msg[0].value)

                expect(parsedMsg).to.have.property("bot_id")
                expect(parsedMsg).to.have.property("data")
                expect(parsedMsg.data).to.have.property("account")
                expect(parsedMsg.data).to.have.property("marginCallPrice")
                expect(parsedMsg.data).to.have.property("symbol")
            })

            it('Should return the correct message', () => {
                expect(JSON.stringify(res)).to.eql('{"data":"OK"}');
            })

            after(async () => {
                await TruncateTables()
            })
        })

        describe('/leverage', () => {
            before(async () => {
                //Add a memeber to the bots databse so we can compare results 
                await insertBotKeys(["defaultKeys", keys.keys, "bitmex"])
            })

            let res
            it('Should succesfully call the /leverage endpoint', async () => {
                body = { "bot_id": "defaultKeys", "symbol": "XBTUSD", "leverage": 1 }
                res = await fetchLinkBody("http://exchanges_api:3003/exchanges/positions/leverage", body, "POST")
            })

            it('Should push the correct data to Kafka', async () => {
                expect(res.data.leverage).to.have.eql(body.leverage)
            })
        })
    })

    describe('database', () => {
        describe('exchanges', () => {
            it('Should upload the keys of an exchange to the databse', async () => {
                await insertExchangeKeys(["bitmex", keys.keys])
                let res = await selectAllKeys()
                expect(res.length).to.equal(1)
            })

            it('Should select the keys of an exchange to the databse', async () => {
                let res = await selectKeysByExchange(["bitmex"])
                expect(res.length).to.equal(1)
                expect(res[0]).to.have.property("id")
                expect(res[0]).to.have.property("exchange")
                expect(res[0]).to.have.property("exchange_key")
            })

            it('Should not insert a second key into the database', async () => {
                let res = await insertExchangeKeys(["bitmex", keys.keys])
                res = await selectKeysByExchange(["bitmex"])
                expect(res.length).to.equal(1)
            })
        })
        describe('orders', () => {

        })

        describe('bots', () => {
            it('Should upload the keys of an exchange to the databse', async () => {
                await insertBotKeys(["defaultKeys", keys.keys, "bitmex"])
                let res = await selectAllKeys()
                expect(res.length).to.equal(1)
            })

            it('Should select the keys of an exchange to the databse', async () => {
                let res = await selectKeysByBotId(["defaultKeys"])
                expect(res.length).to.equal(1)
                expect(res[0]).to.have.property("id")
                expect(res[0]).to.have.property("bot_id")
                expect(res[0]).to.have.property("bot_key")
                expect(res[0]).to.have.property("exchange")
            })

            it('Should not insert a second key into the database', async () => {
                let res = await insertExchangeKeys(["bitmex", keys.keys])
                res = await selectKeysByExchange(["bitmex"])
                expect(res.length).to.equal(1)
            })
        })

        describe('websockets', () => {
            it('Should upload a new websocket to the databse', async () => {
                await insertWebsocket(["bitmex", "1m", "XBTUSD"])
                let res = await selectWebsocketByExchange(["bitmex"])
                expect(res.length).to.equal(1)
            })

            it('Should select the keys of an exchange to the databse', async () => {
                let res = await selectWebsocketByExchange(["bitmex"])
                expect(res.length).to.equal(1)
                expect(res[0]).to.have.property("exchange")
                expect(res[0]).to.have.property("asset")
                expect(res[0]).to.have.property("time_frame")
            })

            it('Should not insert a second websocket into the database', async () => {
                await insertWebsocket(["bitmex", "1m", "XBTUSD"])
                let res = await selectWebsocketByExchange(["bitmex"])
                expect(res.length).to.equal(1)
                expect(res[0]).to.have.property("exchange")
                expect(res[0]).to.have.property("asset")
                expect(res[0]).to.have.property("time_frame")
            })
        })
    })
})
