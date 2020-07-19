const chai = require("chai")
const expect = chai.expect
const { consumer } = require('./utils/kafkaConsumer')
const { fetchLink, fetchLinkBody } = require('./utils/fetcher')
const { insertExchangeKeys, selectKeysByExchange, selectKeysByBotId, selectAllKeys, insertBotKeys, selectWebsocketByExchange, insertWebsocket, selectOrdersByStatus, insertOrder, selectAllPriceHistory, TruncateTables } = require('./utils/database/db')

const keys = {
    "apiKeyID": "QVBBDR7W4YdKi1bYB-p1Ml7O",
    "apiKeySecret": "K4HFi8AQjk2PDytPh_V6gtX3KciIMuXtyn5iQ8UhRT-U41Hs"
}

const { main } = require('./exchange_engine/app')
let server

sleep = m => new Promise(r => setTimeout(r, m))

let orderId

describe('Bitmex API', () => {
    before(async () => {
        const app = await main()
        server = app.listen(3001)
    })

    after(() => {
        server.close()
    })

    describe('healthcheck', () => {
        var res

        before(async () => {
            res = await chai
                .request(server)
                .get('/exchange_engine/healthcheck')
        })

        it('Should return 200 when calling /healthcheck for the container', async () => {
            expect(res).to.have.status(200)
        })

        it('Should return the correct message', () => {
            expect(res.text).to.eql('{"data":"OK"}');
        })
    })
})

//     describe('price stream', () => {
//         describe('Init script', () => {
//             it('Should push the correct data to Kafka', async () => {
//                 let msg = await consumer("bitmexPriceStream")
//                 let parsedMsg = JSON.parse(msg[0].value)
//                 expect(parsedMsg).to.have.property("timestamp")
//                 expect(parsedMsg).to.have.property("symbol")
//                 expect(parsedMsg).to.have.property("open")
//                 expect(parsedMsg).to.have.property("close")
//                 expect(parsedMsg).to.have.property("high")
//                 expect(parsedMsg).to.have.property("low")
//                 expect(parsedMsg).to.have.property("volume")
//             })
//             after(async () => {
//                 await TruncateTables()
//             })
//         })

//         describe('Should add a second price stream', async () => {
//             before(async () => {
//                 //Add a memeber to the bots databse so we can compare results 
//                 await insertExchangeKeys(["bitmex", keys])
//             })

//             it('Should succesfully call the /pricestream/add endpoint', async () => {
//                 let body = { "exchange": "bitmex", "asset": "XBTUSD", "timeFrame": "5m" }
//                 res = await fetchLinkBody("http://exchange_engine:3003/exchange_engine/pricestream/add", body, "POST")
//             })

//             it('Should contain the correct status', async () => {
//                 expect(res).to.have.property('data');
//                 expect(res.data).to.have.property('exchange');
//                 expect(res.data).to.have.property('asset');
//                 expect(res.data).to.have.property('timeFrame');
//             })

//             after(async () => {
//                 await TruncateTables()
//             })
//         })
//     })

//     describe('backtest', () => {
//         describe('/price', async () => {
//             before(async () => {
//                 //Add a memeber to the bots databse so we can compare results 
//                 await insertBotKeys(["defaultKeys", keys, "bitmex"])
//             })

//             // Upload a new bot
//             var res
//             it('Should succesfully call the / endpoint', async () => {
//                 let body = { "binSize": "1m", "endTime": "2017-01-01T12:35:00.000Z", "symbol": "XBT", "botId": "defaultKeys" }
//                 res = await fetchLinkBody("http://exchange_engine:3003/exchange_engine/backtest/price", body, "POST")
//             })

//             it('Should persist the information to the database', async () => {
//                 await sleep(500)
//                 let data = await selectAllPriceHistory(["1m", "XBT", "bitmex"])
//                 expect(data[0]).to.have.property('pair');
//                 expect(data[0]).to.have.property('time_frame');
//                 expect(data[0]).to.have.property('exchange');
//                 expect(data[0]).to.have.property('_timestamp');
//                 expect(data[0]).to.have.property('_open');
//                 expect(data[0]).to.have.property('_close');
//                 expect(data[0]).to.have.property('_high');
//                 expect(data[0]).to.have.property('_low');
//                 expect(data[0]).to.have.property('_volume');
//             })

//             it('Should contain the correct status', async () => {
//                 expect(res).to.have.property('data');
//                 expect(res.data).to.have.property('uuid');
//                 expect(res.data).to.have.property('message');
//             })

//             after(async () => {
//                 await TruncateTables()
//             })
//         })
//     })

//     describe('keys', () => {
//         describe('/upload/bots', () => {
//             let res
//             let body
//             it('Should succesfully call the /keys endpoint', async () => {
//                 body = { "botId": "defaultKeys", "apiKeyId": keys.apiKeyID, "apiKeySecret": keys.apiKeySecret, "exchange": "bitmex" }
//                 res = await fetchLinkBody("http://exchange_engine:3003/exchange_engine/key/upload/bots", body, "POST")
//             })

//             it('Should persist the new key to the database', async () => {
//                 let botInfo = await selectAllKeys()
//                 expect(body.botId).to.eql(botInfo[0].bot_id);
//                 //await botInfo[0].key.socket.instance._events.close("1000")
//             })

//             it('Should return the correct message', () => {
//                 expect(JSON.stringify(res)).to.eql('{"data":"OK"}');
//             })

//             after(async () => {
//                 await TruncateTables()
//             })
//         })
//         describe('/upload/exchange', () => {
//             let res
//             let body
//             it('Should succesfully call the /keys endpoint', async () => {
//                 body = { "apiKeyId": keys.apiKeyID, "apiKeySecret": keys.apiKeySecret, "exchange": "bitmex" }
//                 res = await fetchLinkBody("http://exchange_engine:3003/exchange_engine/key/upload/exchange", body, "POST")
//             })

//             it('Should persist the new key to the database', async () => {
//                 let botInfo = await selectKeysByExchange([body.exchange])
//                 expect(body.exchange).to.eql(botInfo[0].exchange);
//             })

//             it('Should return the correct message', () => {
//                 expect(JSON.stringify(res)).to.eql('{"data":"OK"}');
//             })

//             after(async () => {
//                 await TruncateTables()
//             })
//         })
//     })

//     describe('margin', () => {
//         describe('/', () => {
//             before(async () => {
//                 //Add a memeber to the bots databse so we can compare results 
//                 await insertBotKeys(["defaultKeys", keys, "bitmex"])
//             })

//             let res
//             it('Should succesfully call the /current endpoint', async () => {
//                 res = await fetchLink("http://exchange_engine:3003/exchange_engine/margin?bot_id=null", "GET")
//             })

//             it('Should push the correct data to Kafka', async () => {
//                 let msg = await consumer("margin")
//                 let parsedMsg = JSON.parse(msg[0].value)

//                 expect(parsedMsg).to.have.property("botId")
//                 expect(parsedMsg).to.have.property("exchange")
//                 expect(parsedMsg.data).to.have.property("account")
//                 expect(parsedMsg.data).to.have.property("currency")
//                 expect(parsedMsg.data).to.have.property("prevTimestamp")
//             })

//             it('Should return the correct message', () => {
//                 expect(JSON.stringify(res)).to.eql('{"data":"OK"}');
//             })

//             after(async () => {
//                 await TruncateTables()
//             })
//         })
//     })

//     describe('orders', () => {
//         describe('/', () => {
//             before(async () => {
//                 //Add a memeber to the bots databse so we can compare results 
//                 await insertBotKeys(["defaultKeys", keys, "bitmex"])
//             })

//             let res
//             it('Should succesfully call the / endpoint', async () => {
//                 res = await fetchLink("http://exchange_engine:3003/exchange_engine/orders?bot_id=defaultKeys&type=filled", "GET")
//             }).timeout(6000)

//             it('Should push the correct data to Kafka', async () => {
//                 let msg = await consumer("orders")
//                 let parsedMsg = JSON.parse(msg[0].value)

//                 expect(parsedMsg).to.have.property('bot_id');
//                 expect(parsedMsg).to.have.property('exchange');
//                 expect(parsedMsg).to.have.property('data');
//             })

//             it('Should return the correct message', () => {
//                 expect(JSON.stringify(res)).to.eql('{"data":"OK"}');
//             })

//             after(async () => {
//                 await TruncateTables()
//             })
//         })

//         describe('/set', () => {
//             before(async () => {
//                 //Add a memeber to the bots databse so we can compare results 
//                 await insertBotKeys(["defaultKeys", keys, "bitmex"])
//                 body = {
//                     "botId": "defaultKeys",
//                     "symbol": "XBTUSD",
//                     "orderType": "Limit",
//                     "timeInForce": "GoodTillCancel",
//                     "price": 8000,
//                     "orderQty": 10,
//                     "side": "Buy"
//                 }
//             })

//             let res
//             it('Should succesfully call the / endpoint', async () => {
//                 res = await fetchLinkBody("http://exchange_engine:3003/exchange_engine/orders/set", body, "POST")
//             })

//             it('Should push the correct order to the exchange', async () => {
//                 orderId = res.data.orderId
//                 expect(res.data).to.have.property('exchange');
//                 expect(res.data).to.have.property('orderId');
//                 expect(res.data).to.have.property('timeStamp');
//                 expect(res.data).to.have.property('orderStatus');
//                 expect(res.data).to.have.property('side');
//                 expect(res.data).to.have.property('orderQuantity');
//                 expect(res.data).to.have.property('price');
//             })

//             after(async () => {
//                 await TruncateTables()
//             })
//         })

//         describe('/cancel', () => {
//             before(async () => {
//                 //Add a memeber to the bots databse so we can compare results 
//                 await insertBotKeys(["defaultKeys", keys, "bitmex"])
//                 await insertOrder(["defaultKeys", "bitmex", orderId, null, "2019-08-08T01:04:28.939Z", "Open", "Buy", 1000, 8000, 4000, 10, "Limit", "10"])

//                 body = { "botId": "defaultKeys", "orderId": orderId }
//             })

//             let res
//             it('Should succesfully call the / endpoint', async () => {
//                 res = await fetchLinkBody("http://exchange_engine:3003/exchange_engine/orders/cancel", body, "POST")
//             })

//             it('Should push the correct order to the exchange', async () => {
//                 expect(res.data).to.have.property('exchange');
//                 expect(res.data).to.have.property('orderId');
//                 expect(res.data).to.have.property('timeStamp');
//                 expect(res.data).to.have.property('orderStatus');
//                 expect(res.data).to.have.property('side');
//                 expect(res.data).to.have.property('orderQuantity');
//                 expect(res.data).to.have.property('price');
//                 expect(res.data.order_status).to.eql('Canceled');
//             })

//             it('Should update the state of the order', async () => {
//                 let orderInfo = await selectOrdersByStatus(['Canceled'])
//                 expect(orderInfo[0].orderId).to.eql(orderId)
//             })

//             after(async () => {
//                 await TruncateTables()
//             })
//         })
//     })

//     describe('position', () => {
//         describe('/', () => {
//             before(async () => {
//                 //Add a memeber to the bots databse so we can compare results 
//                 await insertBotKeys(["defaultKeys", keys, "bitmex"])
//             })

//             let res
//             it('Should succesfully call the / endpoint', async () => {
//                 res = await fetchLink("http://exchange_engine:3003/exchange_engine/positions?bot_id=defaultKeys&symbol=XBTUSD", "GET")
//             })

//             it('Should push the correct data to Kafka', async () => {
//                 // Import Kafka
//                 let msg = await consumer("positions")
//                 let parsedMsg = JSON.parse(msg[0].value)

//                 expect(parsedMsg).to.have.property("bot_id")
//                 expect(parsedMsg).to.have.property("data")
//                 expect(parsedMsg.data).to.have.property("account")
//                 expect(parsedMsg.data).to.have.property("marginCallPrice")
//                 expect(parsedMsg.data).to.have.property("symbol")
//             })

//             it('Should return the correct message', () => {
//                 expect(JSON.stringify(res)).to.eql('{"data":"OK"}');
//             })

//             after(async () => {
//                 await TruncateTables()
//             })
//         })

//         describe('/leverage', () => {
//             before(async () => {
//                 //Add a memeber to the bots databse so we can compare results 
//                 await insertBotKeys(["defaultKeys", keys, "bitmex"])
//             })

//             let res
//             it('Should succesfully call the /leverage endpoint', async () => {
//                 body = { "botId": "defaultKeys", "symbol": "XBTUSD", "leverage": 1 }
//                 res = await fetchLinkBody("http://exchange_engine:3003/exchange_engine/positions/leverage", body, "POST")
//             })

//             it('Should push the correct data to Kafka', async () => {
//                 expect(res.data.leverage).to.have.eql(body.leverage)
//             })
//         })
//     })

//     describe('database', () => {
//         describe('exchange_engine', () => {
//             it('Should upload the keys of an exchange to the databse', async () => {
//                 await insertExchangeKeys(["bitmex", keys])
//                 let res = await selectAllKeys()
//                 expect(res.length).to.equal(1)
//             })

//             it('Should select the keys of an exchange to the databse', async () => {
//                 let res = await selectKeysByExchange(["bitmex"])
//                 expect(res.length).to.equal(1)
//                 expect(res[0]).to.have.property("id")
//                 expect(res[0]).to.have.property("exchange")
//                 expect(res[0]).to.have.property("exchange_key")
//             })

//             it('Should not insert a second key into the database', async () => {
//                 let res = await insertExchangeKeys(["bitmex", keys])
//                 res = await selectKeysByExchange(["bitmex"])
//                 expect(res.length).to.equal(1)
//             })
//         })
//         describe('orders', () => {

//         })

//         describe('bots', () => {
//             it('Should upload the keys of an exchange to the databse', async () => {
//                 await insertBotKeys(["defaultKeys", keys, "bitmex"])
//                 let res = await selectAllKeys()
//                 expect(res.length).to.equal(1)
//             })

//             it('Should select the keys of an exchange to the databse', async () => {
//                 let res = await selectKeysByBotId(["defaultKeys"])
//                 expect(res.length).to.equal(1)
//                 expect(res[0]).to.have.property("id")
//                 expect(res[0]).to.have.property("bot_id")
//                 expect(res[0]).to.have.property("bot_key")
//                 expect(res[0]).to.have.property("exchange")
//             })

//             it('Should not insert a second key into the database', async () => {
//                 let res = await insertExchangeKeys(["bitmex", keys])
//                 res = await selectKeysByExchange(["bitmex"])
//                 expect(res.length).to.equal(1)
//             })
//         })

//         describe('websockets', () => {
//             it('Should upload a new websocket to the databse', async () => {
//                 await insertWebsocket(["bitmex", "1m", "XBTUSD"])
//                 let res = await selectWebsocketByExchange(["bitmex"])
//                 expect(res.length).to.equal(1)
//             })

//             it('Should select the keys of an exchange to the databse', async () => {
//                 let res = await selectWebsocketByExchange(["bitmex"])
//                 expect(res.length).to.equal(1)
//                 expect(res[0]).to.have.property("exchange")
//                 expect(res[0]).to.have.property("asset")
//                 expect(res[0]).to.have.property("time_frame")
//             })

//             it('Should not insert a second websocket into the database', async () => {
//                 await insertWebsocket(["bitmex", "1m", "XBTUSD"])
//                 let res = await selectWebsocketByExchange(["bitmex"])
//                 expect(res.length).to.equal(1)
//                 expect(res[0]).to.have.property("exchange")
//                 expect(res[0]).to.have.property("asset")
//                 expect(res[0]).to.have.property("time_frame")
//             })
//         })
//     })
// })
