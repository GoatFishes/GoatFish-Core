const chai = require('chai')
const chaiHttp = require('chai-http')
const expect = chai.expect
chai.use(chaiHttp)

const { main } = require('./bot_manager/app')
let server


const { fetchLink, fetchLinkBody } = require('./utils/fetcher')
const {
    // Keys
    insertBotKeys,
    selectAllKeys,
    selectKeysByBotId,

    // Bots
    insertBotStrategy,
    selectBotByBotId,

    // Margin
    insertMargin,
    updateBotMargin,
    selectMargin,

    // Orders
    insertOrder,
    selectOrders,
    selectOrdersByStatus,
    updateOrderStatus,
    updateOrderPositionId,

    // Positions
    insertPosition,
    selectPositions,

    // Paper Orders
    insertPaperOrder,
    selectPaperOrders,
    selectPaperOrdersByStatus,
    updatePaperOrderStatus,
    updatePaperOrderPositionId,

    // Paper Positions
    insertPaperPosition,
    selectPaperPositions,

    // Testing
    TruncateTables

} = require('./utils/database/db')

const kafka = require('kafka-node'),
    Producer = kafka.Producer,
    client = new kafka.KafkaClient({ kafkaHost: 'kafka:9092' }),
    producer = new Producer(client)

const keys = {
    "apiKeyID": "QVBBDR7W4YdKi1bYB-p1Ml7O",
    "apiKeySecret": "K4HFi8AQjk2PDytPh_V6gtX3KciIMuXtyn5iQ8UhRT-U41Hs"
}

sleep = m => new Promise(r => setTimeout(r, m))

describe('Bots API', () => {
    before(async () => {
        const app = await main()
        server = app.listen(3000)
    })

    after(() => {
        server.close()
    })

    describe('healthcheck', () => {
        var res

        before(async () => {
            res = await chai
                .request(server)
                .get('/bot_manager/healthcheck')
        })

        it('Should return 200 when calling /healthcheck for the container', async () => {
            expect(res).to.have.status(200)
        })

        it('Should return the correct message', () => {
            expect(res.text).to.eql('{"data":"OK"}');
        })
    })
})

//     describe('management', () => {
//         describe('/upload', async () => {
//             // Upload a new bot
//             let res
//             const body = {
//                 "botId": "defaultKeys",
//                 "strategy":
//                     `const strategy = async (params) => {
// let strategyObject = {
//     execute: false						// Identifies whether we will be making an order
//     , symbol: "XBTUSD"				// Identifies the asset that will be makin an order
//     , leverage: "10"					// Identifies leverage used for the order
//     , side: "Buy"						// Buy v. sell 
//     , orderQty: "10"						// Amount of contracts
//     , price: "755"						// Price at which to buy
//     , orderType: "Limit"						// Always limit
//     , timeInForce: "GoodTillCancel"						// Always goodTillCancelled
//     , timestamp: null
// }
// if (params[params.length - 1].open < 977) {
//     strategyObject.execute = true
//     strategyObject.price = params[params.length - 1].open
//     strategyObject.timestamp = params[params.length - 1].timestamp
// }
// else if (params[params.length - 1].open > 977) {
//     strategyObject.execute = true
//     strategyObject.price = params[params.length - 1].open
//     strategyObject.side = "Sell"
//     strategyObject.timestamp = params[params.length - 1].timestamp
// }
// return strategyObject
// }
// module.exports = { strategy }
// `
//                 , "apiKeyId": keys.apiKeyID, "apiKeySecret": keys.apiKeySecret, "exchange": "bitmex", "portNumber": 3009, "assets": `["1mXBTUSD", "5mXBTUSD"]`
//             }

//             before(async () => {
//                 res = await chai
//                     .request(server)
//                     .post('/bot_manager/management/upload')
//                     .set('content-type', 'application/json')
//                     .send(body)
//                     .catch(err => {
//                         console.log(err)
//                     })

//             })

//             it('Should return 200 when calling /upload for the container', async () => {
//                 expect(res).to.have.status(200)
//             })

//             it('Should return the correct message', () => {
//                 expect(res.text).to.eql('{"data":{"botId":"defaultKeys","upload":"OK"}}');
//             })

//             it('Should persist a new bot to the database', async () => {
//                 let tradePersistance = await selectBotByBotId(['defaultKeys'])
//                 expect(tradePersistance[0].bot_id).to.eql(body.botId);
//             })

//             after(async () => {
//                 await TruncateTables()
//             })
//         })
//     })



    //     describe('/initiliaze', async () => {
    //         var res
    //         let body = { "botId": "defaultKeys" }

    //         let port = 3009

    //         before(async () => {
    //             await insertBotKeys(["defaultKeys", keys, "bitmex"])
    //             await insertBotStrategy(["defaultKeys", "", 0.0, 0.0, port, `["1mXBTUSD", "5mXBTUSD"]`, 'Stop'])

    //             res = await chai
    //                 .request(server)
    //                 .post('/bot_manager/management/upload')
    //                 .set('content-type', 'application/json')
    //                 .send(body)
    //         })
    //     })

    //     it('Should succesfully call the /initiliaze endpoint', async () => {
    //         expect(res).to.have.status(200)
    //     })

    //     it('Should return the correct message', () => {
    //         expect(JSON.stringify(res)).to.eql(`{"data":{"botId":"defaultKeys","status":"Stop"}}`);
    //     })

    //     it('Should return 200 when calling /healthcheck for the container', async () => {
    //         await sleep(2000);
    //         res = await fetchLink(`http://${body.botId}:${port}/healthcheck`, "GET")
    //         expect(JSON.stringify(res)).to.eql('{"data":"OK"}');
    //     })

    //     after(async () => {
    //         await TruncateTables()
    //     })
    // })
    //     describe('margin', () => {
    //         describe('/', async () => {
    //             before(async () => {
    //                 let topic = "margin"
    //                 await insertBotKeys(["defaultKeys", keys, "bitmex"])
    //                 await insertBotStrategy(["defaultKeys", "", 0.0, 0.0, 3009, null, 'Stop'])

    //                 payloads = [
    //                     { topic: topic, messages: '{"botId":"defaultKeys","exchange":"bitmex","data":{"account":1180512,"currency":"XBt","prevDeposited":274515,"prevWithdrawn":0,"prevTransferIn":0,"prevTransferOut":0,"prevAmount":1308,"prevTimestamp":"2019-11-25T12:00:00.000Z","deltaDeposited":0,"deltaWithdrawn":0,"deltaTransferIn":0,"deltaTransferOut":0,"deltaAmount":0,"deposited":274515,"withdrawn":0,"transferIn":0,"transferOut":0,"amount":1308,"pendingCredit":0,"pendingDebit":0,"confirmedDebit":0,"timestamp":"2019-11-26T12:00:02.877Z","addr":"3BMEXVK5Jypn8yS8eMZqNg6MtFWaQzwcta","script":"534104220936c3245597b1513a9a7fe96d96facf1a840ee21432a1b73c2cf42c1810284dd730f21ded9d818b84402863a2b5cd1afe3a3d13719d524482592fb23c88a3410472225d3abc8665cf01f703a270ee65be5421c6a495ce34830061eb0690ec27dfd1194e27b6b0b659418d9f91baec18923078aac18dc19699aae82583561fefe541048a1c80f418e2e0ed444c7cf868094598a480303aec840f4895b207b813a8b700e0960a513f567724a7e467101a608c5b20be10de103010bb66fec4d0d2c8cb8b4104a24db5c0e8ed34da1fd3b6f9f797244981b928a8750c8f11f9252041daad7b2d95309074fed791af77dc85abdd8bb2774ed8d53379d28cd49f251b9c08cab7fc54ae","withdrawalLock":[]}}', partition: 0 }
    //                 ]
    //                 await producer.send(payloads, async function (err, data) {
    //                 })
    //             })
    //             let res
    //             it('Should succesfully call the / endpoint', async () => {
    //                 res = await fetchLink("http://bot_manager:3002/bot_manager/margin", "GET")
    //             })

    //             it('Should return the correct response', () => {
    //                 expect(res).to.have.property('data');
    //                 expect(res.data).to.have.property('marginResponseObject');
    //                 expect(res.data.marginResponseObject).to.have.property('bitmex');
    //                 expect(res.data.marginResponseObject.bitmex[0]).to.have.property('botId');
    //                 expect(res.data.marginResponseObject.bitmex[0]).to.have.property('amount');
    //             })

    //             it('Should persit the correct margin to the bots table', async () => {
    //                 let botInfo = await selectBotByBotId(['defaultKeys'])
    //                 expect(botInfo[0].margin).to.eql(1308);
    //             })

    //             it('Should persit the correct margin and date to the margin table', async () => {
    //                 let today = new Date()
    //                 let date = today.getFullYear() + '-' + (today.getMonth() + 1) + '-' + today.getDate()

    //                 let marginStats = await selectMargin([1308, date])

    //                 expect(marginStats[0].amount).to.eql(1308);
    //             })

    //             after(async () => {
    //                 await TruncateTables()
    //             })
    //         })
    //     })

    //     describe('orders', () => {
    //         describe('/get', async () => {
    //             before(async () => {
    //                 let topic = "orders"
    //                 await insertBotStrategy(["defaultKeys", "", 0.0, 0.0, 3009, null, 'Stop'])
    //                 payloads = [
    //                     { topic: topic, messages: '{"bot_id":"defaultKeys","exchange":"bitmex","data":[{"orderID":"ab7ae2nf-c828-76fc-3190-a35883804599","clOrdID":"","clOrdLinkID":"","account":1180512,"symbol":"XBTUSD","side":"Sell","simpleOrderQty":null,"orderQty":100,"price":11948,"displayQty":null,"stopPx":null,"pegOffsetValue":null,"pegPriceType":"","currency":"USD","settlCurrency":"XBt","ordType":"Limit","timeInForce":"GoodTillCancel","execInst":"","contingencyType":"","exDestination":"XBME","ordStatus":"Filled","triggered":"","workingIndicator":false,"ordRejReason":"","simpleLeavesQty":null,"leavesQty":0,"simpleCumQty":null,"cumQty":100,"avgPx":11949,"multiLegReportingType":"SingleSecurity","text":"Submission from www.bitmex.com","transactTime":"2019-08-08T01:04:28.939Z","timestamp":"2019-08-08T01:04:28.939Z"}]}', partition: 0 }
    //                 ]
    //                 await producer.send(payloads, async function (err, data) {
    //                 })

    //                 await insertOrder(["defaultKeys", "bitmex", "ab7ae2nf-c828-76fc-3190-a35883804599", null, "2019-08-08T01:04:28.939Z", "Open", "Buy", 1000, 8000, 4000, 10, "Limit", null])
    //             })
    //             // Upload a new bot
    //             var res
    //             it('Should succesfully call the /get endpoint', async () => {
    //                 res = await fetchLink("http://bot_manager:3002/bot_manager/orders/get", "GET")
    //             })

    //             it('Should return the correct response', () => {
    //                 expect(res).to.have.property("data")
    //                 expect(res.data[0]).to.have.property("bot_id")
    //                 expect(res.data[0]).to.have.property("orders")
    //                 expect(res.data[0].orders).to.have.property("filled")
    //                 expect(res.data[0].orders).to.have.property("open")
    //                 expect(res.data[0].orders.filled[0]).to.have.property("bot_id")
    //                 expect(res.data[0].orders.filled[0]).to.have.property("exchange")
    //                 expect(res.data[0].orders.filled[0]).to.have.property("order_id")
    //                 expect(res.data[0].orders.filled[0]).to.have.property("position_ref")
    //                 expect(res.data[0].orders.filled[0]).to.have.property("_timestamp")
    //                 expect(res.data[0].orders.filled[0]).to.have.property("order_status")
    //                 expect(res.data[0].orders.filled[0]).to.have.property("side")
    //                 expect(res.data[0].orders.filled[0]).to.have.property("size")
    //                 expect(res.data[0].orders.filled[0]).to.have.property("_price")
    //                 expect(res.data[0].orders.filled[0]).to.have.property("margin")
    //                 expect(res.data[0].orders.filled[0]).to.have.property("leverage")
    //                 expect(res.data[0].orders.filled[0]).to.have.property("average_price")
    //             })

    //             it('Should perist a new order to the database', async () => {
    //                 let orderPersistance = await selectOrders()
    //                 expect(orderPersistance[0].order_id).to.eql('ab7ae2nf-c828-76fc-3190-a35883804599');
    //             })

    //             after(async () => {
    //                 await TruncateTables()
    //             })
    //         })
    //     })

    //     describe('positions', () => {
    //         describe('/', async () => {
    //             before(async () => {
    //                 await insertBotStrategy(["defaultKeys", "", 0.0, 0.0, 3009, null, 'Stop'])
    //                 await insertOrder(["defaultKeys", "bitmex", "ab7ae2nf-c828-76fc-3190-a35883804599", null, "2019-08-08T01:04:28.939Z", "Filled", "Buy", 1000, 8000, 4000, 10, "Limit", 200])
    //                 await insertOrder(["defaultKeys", "bitmex", "ab7ae2nf-c824-76fc-3190-a35883804599", null, "2019-08-08T01:04:29.939Z", "Filled", "Sell", 1000, 8000, 4000, 10, "Limit", 200])
    //             })
    //             // Upload a new bot
    //             var res
    //             it('Should succesfully call the /get endpoint with a null type', async () => {
    //                 res = await fetchLink("http://bot_manager:3002/bot_manager/positions?type=null", "GET")
    //             })

    //             it('Should return the correct response', () => {
    //                 expect(res).to.have.property("data")
    //                 expect(res.data[0]).to.have.property("botId")
    //                 expect(res.data[0]).to.have.property("positions")
    //                 expect(res.data[0].positions).to.have.property("long")
    //                 expect(res.data[0].positions).to.have.property("short")
    //                 expect(res.data[0].positions.long[0]).to.have.property("position_id")
    //                 expect(res.data[0].positions.long[0]).to.have.property("bot_id")
    //                 expect(res.data[0].positions.long[0]).to.have.property("entry_price")
    //                 expect(res.data[0].positions.long[0]).to.have.property("init_margin")
    //                 expect(res.data[0].positions.long[0]).to.have.property("start_time")
    //                 expect(res.data[0].positions.long[0]).to.have.property("end_time")
    //                 expect(res.data[0].positions.long[0]).to.have.property("side")
    //                 expect(res.data[0].positions.long[0]).to.have.property("size")
    //                 expect(res.data[0].positions.long[0]).to.have.property("profit_loss")
    //                 expect(res.data[0].positions.long[0]).to.have.property("roe")
    //                 expect(res.data[0].positions.long[0]).to.have.property("leverage")
    //                 expect(res.data[0].positions.long[0]).to.have.property("average_price")
    //             })

    //             it('Should perist the new position_id to orders table in the databse', async () => {
    //                 let orderPersistance = await selectPaperOrders()
    //                 for (let i = 0; i < orderPersistance.length; i++) {
    //                     expect(orderPersistance[i].position_ref).to.not.be.null;
    //                 }
    //             })

    //             it('Should perist a new position to the database', async () => {
    //                 let positionPersistance = await selectPaperPositions()
    //                 for (let i = 0; i < positionPersistance.length; i++) {
    //                     expect(positionPersistance[i].position_id).to.not.be.null;
    //                 }
    //             })

    //             it('Should succesfully call the /get endpoint with type PaperTrade', async () => {
    //                 await insertPaperOrder(["defaultKeys", "bitmex", "ab7ae2nf-c828-76fc-3190-a35883804599", null, "2019-08-08T01:04:28.939Z", "Filled", "Buy", 1000, 8000, 4000, 10, "Limit", 200])
    //                 await insertPaperOrder(["defaultKeys", "bitmex", "ab7ae2nf-c824-76fc-3190-a35883804599", null, "2019-08-08T01:04:29.939Z", "Filled", "Sell", 1000, 8000, 4000, 10, "Limit", 200])
    //                 res = await fetchLink("http://bot_manager:3002/bot_manager/positions?type=paperTrade", "GET")
    //             })

    //             it('Should return the correct response', () => {
    //                 expect(res).to.have.property("data")
    //                 expect(res.data[0]).to.have.property("botId")
    //                 expect(res.data[0]).to.have.property("positions")
    //                 expect(res.data[0].positions).to.have.property("long")
    //                 expect(res.data[0].positions).to.have.property("short")
    //                 expect(res.data[0].positions.long[0]).to.have.property("position_id")
    //                 expect(res.data[0].positions.long[0]).to.have.property("bot_id")
    //                 expect(res.data[0].positions.long[0]).to.have.property("entry_price")
    //                 expect(res.data[0].positions.long[0]).to.have.property("init_margin")
    //                 expect(res.data[0].positions.long[0]).to.have.property("start_time")
    //                 expect(res.data[0].positions.long[0]).to.have.property("end_time")
    //                 expect(res.data[0].positions.long[0]).to.have.property("side")
    //                 expect(res.data[0].positions.long[0]).to.have.property("size")
    //                 expect(res.data[0].positions.long[0]).to.have.property("profit_loss")
    //                 expect(res.data[0].positions.long[0]).to.have.property("roe")
    //                 expect(res.data[0].positions.long[0]).to.have.property("leverage")
    //                 expect(res.data[0].positions.long[0]).to.have.property("average_price")
    //             })

    //             it('Should perist the new position_id to orders table in the databse', async () => {
    //                 let orderPersistance = await selectPaperOrders()
    //                 for (let i = 0; i < orderPersistance.length; i++) {
    //                     expect(orderPersistance[i].position_ref).to.not.be.null;
    //                 }
    //             })

    //             it('Should perist a new position to the database', async () => {
    //                 let positionPersistance = await selectPaperPositions()
    //                 for (let i = 0; i < positionPersistance.length; i++) {
    //                     expect(positionPersistance[i].position_id).to.not.be.null;
    //                 }
    //             })
    //             after(async () => {
    //                 await TruncateTables()
    //             })
    //         })
    //     })

    //     describe('database', () => {
    //         describe('keys', () => {
    //             it('Should upload the keys of a bot to the databse', async () => {
    //                 await insertBotKeys(["defaultKeys", keys, "bitmex"])
    //                 let res = await selectAllKeys()
    //                 expect(res.length).to.equal(1)
    //             })

    //             it('Should not allow duplicated bot_id entries', async () => {
    //                 await insertBotKeys(["defaultKeys", keys, "bitmex"])
    //                 let res = await selectAllKeys()
    //                 expect(res.length).to.equal(1)
    //             })

    //             it('Should be able to check all persited information to the database', async () => {
    //                 let res = await selectAllKeys()
    //                 expect(res.length).to.equal(1)
    //                 expect(res[0]).to.have.property("id")
    //                 expect(res[0]).to.have.property("bot_id")
    //                 expect(res[0]).to.have.property("bot_key")
    //                 expect(res[0]).to.have.property("exchange")
    //                 expect(res[0].bot_key).to.have.property("apiKeyID")
    //                 expect(res[0].bot_key).to.have.property("apiKeySecret")
    //                 expect(res[0].id).to.not.be.null
    //                 expect(res[0].bot_id).to.not.be.null
    //                 expect(res[0].bot_key).to.not.be.null
    //                 expect(res[0].exchange).to.not.be.null
    //                 expect(res[0].bot_key.apiKeyID).to.not.be.null
    //                 expect(res[0].bot_key.apiKeySecret).to.not.be.null
    //             })

    //             it('Should be able to check all persited information to the database filtering by bot_id', async () => {
    //                 let res = await selectKeysByBotId(["defaultKeys"])
    //                 expect(res.length).to.equal(1)
    //                 expect(res[0]).to.have.property("id")
    //                 expect(res[0]).to.have.property("bot_id")
    //                 expect(res[0]).to.have.property("bot_key")
    //                 expect(res[0]).to.have.property("exchange")
    //                 expect(res[0].bot_key).to.have.property("apiKeyID")
    //                 expect(res[0].bot_key).to.have.property("apiKeySecret")
    //                 expect(res[0].id).to.not.be.null
    //                 expect(res[0].bot_id).to.not.be.null
    //                 expect(res[0].bot_key).to.not.be.null
    //                 expect(res[0].exchange).to.not.be.null
    //                 expect(res[0].bot_key.apiKeyID).to.not.be.null
    //                 expect(res[0].bot_key.apiKeySecret).to.not.be.null
    //             })

    //             after(async () => {
    //                 await TruncateTables()
    //             })
    //         })

    //         describe('bot_manager', () => {
    //             let res
    //             it('Should upload the a new bot to the databse', async () => {

    //                 await insertBotStrategy(["defaultKeys", `const strategy = async (params) => {console.log(params)}`, 0.0, 0.0, 3009, null, 'Stop'])
    //                 res = await selectBotByBotId(["defaultKeys"])
    //                 expect(res.length).to.equal(1)
    //             })

    //             it('Should not allow duplicated bot_id entries', async () => {
    //                 await insertBotStrategy(["defaultKeys", "", 0.0, 0.0, 3009, null])
    //                 res = await selectBotByBotId(["defaultKeys"])
    //                 expect(res.length).to.equal(1)
    //             })

    //             it('Should update the margin column of a bot record in the databse', async () => {
    //                 await updateBotMargin([2.0, "defaultKeys"])
    //                 res = await selectBotByBotId(["defaultKeys"])
    //                 expect(res.length).to.equal(1)
    //                 expect(res[0].margin).to.equal(2.0)
    //             })

    //             it('Should be able to check all persited information to the database', async () => {
    //                 res = await selectBotByBotId(["defaultKeys"])
    //                 expect(res.length).to.equal(1)
    //                 expect(res[0]).to.have.property("id")
    //                 expect(res[0]).to.have.property("bot_id")
    //                 expect(res[0]).to.have.property("strategy")
    //                 expect(res[0]).to.have.property("performance")
    //                 expect(res[0]).to.have.property("margin")
    //                 expect(res[0]).to.have.property("port_n")
    //                 expect(res[0].id).to.not.be.null
    //                 expect(res[0].bot_id).to.not.be.null
    //                 expect(res[0].strategy).to.not.be.null
    //                 expect(res[0].performance).to.not.be.null
    //                 expect(res[0].margin).to.not.be.null
    //                 expect(res[0].port_n).to.not.be.null
    //             })

    //             after(async () => {
    //                 await TruncateTables()
    //             })
    //         })

    //         describe('margin', () => {
    //             let date
    //             let res
    //             before(async () => {
    //                 today = new Date()
    //                 date = today.getFullYear() + '-' + (today.getMonth() + 1) + '-' + today.getDate()
    //             })

    //             it('Should insert a new margin record to the databse', async () => {
    //                 await insertMargin([0, "defaultKeys", date])
    //                 res = await selectMargin([0, date])
    //                 expect(res.length).to.equal(1)
    //             })

    //             it('Should select all margin records to the databse', async () => {
    //                 res = await selectMargin([0, date])
    //                 expect(res.length).to.equal(1)
    //                 expect(res[0]).to.have.property("id")
    //                 expect(res[0]).to.have.property("bot_id")
    //                 expect(res[0]).to.have.property("amount")
    //                 expect(res[0]).to.have.property("_timestamp")
    //                 expect(res[0].id).to.not.be.null
    //                 expect(res[0].bot_id).to.not.be.null
    //                 expect(res[0].amount).to.not.be.null
    //                 expect(res[0]._timestamp).to.not.be.null
    //             })

    //             after(async () => {
    //                 await TruncateTables()
    //             })
    //         })

    //         describe('orders', () => {
    //             let res
    //             it('Should upload a new order to the databse', async () => {
    //                 await insertOrder(["defaultKeys", "bitmex", "ab7ae2nf-c828-76fc-3190-a35883804599", null, "2019-08-08T01:04:28.939Z", "Open", "Buy", 1000, 8000, 4000, 10, "Limit", "10"])
    //                 res = await selectOrders()
    //                 expect(res.length).to.equal(1)
    //             })

    //             it('Should select an order by status Open', async () => {
    //                 res = await selectOrdersByStatus(["Open"])
    //                 expect(res.length).to.equal(1)
    //             })

    //             it('Should update the order status in the databse', async () => {
    //                 await updateOrderStatus(["Closed", "ab7ae2nf-c828-76fc-3190-a35883804599"])
    //                 res = await selectOrdersByStatus(["Closed"])
    //                 expect(res[0].order_status).to.equal("Closed")
    //             })

    //             it('Should update the order position_ref in the databse', async () => {
    //                 await updateOrderPositionId(["123456532-se24243-zred143452123", "ab7ae2nf-c828-76fc-3190-a35883804599"])
    //                 res = await selectOrders()
    //                 expect(res[0].position_ref).to.equal("123456532-se24243-zred143452123")
    //             })

    //             it('Should select all orders in the databse', async () => {
    //                 res = await selectOrders()
    //                 expect(res.length).to.equal(1)
    //                 expect(res[0]).to.have.property("id")
    //                 expect(res[0]).to.have.property("bot_id")
    //                 expect(res[0]).to.have.property("exchange")
    //                 expect(res[0]).to.have.property("order_id")
    //                 expect(res[0]).to.have.property("position_ref")
    //                 expect(res[0]).to.have.property("_timestamp")
    //                 expect(res[0]).to.have.property("order_status")
    //                 expect(res[0]).to.have.property("side")
    //                 expect(res[0]).to.have.property("size")
    //                 expect(res[0]).to.have.property("_price")
    //                 expect(res[0]).to.have.property("margin")
    //                 expect(res[0]).to.have.property("leverage")
    //                 expect(res[0]).to.have.property("order_type")
    //                 expect(res[0]).to.have.property("average_price")
    //                 expect(res[0].id).to.not.be.null
    //                 expect(res[0].bot_id).to.not.be.null
    //                 expect(res[0].exchange).to.not.be.null
    //                 expect(res[0].order_id).to.not.be.null
    //                 expect(res[0].position_ref).to.not.be.null
    //                 expect(res[0]._timestamp).to.not.be.null
    //                 expect(res[0].order_status).to.not.be.null
    //                 expect(res[0].side).to.not.be.null
    //                 expect(res[0].size).to.not.be.null
    //                 expect(res[0]._price).to.not.be.null
    //                 expect(res[0].margin).to.not.be.null
    //                 expect(res[0].leverage).to.not.be.null
    //                 expect(res[0].order_type).to.not.be.null
    //                 expect(res[0].average_price).to.not.be.null
    //             })

    //             after(async () => {
    //                 await TruncateTables()
    //             })
    //         })

    //         describe('positions', () => {
    //             let res
    //             it('Should upload a new position to the databse', async () => {
    //                 await insertPosition(["1234567890-0765-'sdf12345d123", "defaultKeys", 10, 2.0, "2017-01-01T12:30:00.000Z", "2017-01-01T12:31:00.000Z", "Buy", 100, 0.0, 0.0, 10, 120])
    //                 res = await selectPositions()
    //                 expect(res.length).to.equal(1)
    //             })

    //             it('Should Select all positions in the database', async () => {
    //                 res = await selectPositions()
    //                 expect(res.length).to.equal(1)
    //                 expect(res[0]).to.have.property("id")
    //                 expect(res[0]).to.have.property("position_id")
    //                 expect(res[0]).to.have.property("bot_id")
    //                 expect(res[0]).to.have.property("entry_price")
    //                 expect(res[0]).to.have.property("init_margin")
    //                 expect(res[0]).to.have.property("start_time")
    //                 expect(res[0]).to.have.property("end_time")
    //                 expect(res[0]).to.have.property("side")
    //                 expect(res[0]).to.have.property("size")
    //                 expect(res[0]).to.have.property("profit_loss")
    //                 expect(res[0]).to.have.property("roe")
    //                 expect(res[0]).to.have.property("leverage")
    //                 expect(res[0]).to.have.property("average_price")
    //                 expect(res[0].id).to.not.be.null
    //                 expect(res[0].position_id).to.not.be.null
    //                 expect(res[0].bot_id).to.not.be.null
    //                 expect(res[0].init_margin).to.not.be.null
    //                 expect(res[0].entry_price).to.not.be.null
    //                 expect(res[0].start_time).to.not.be.null
    //                 expect(res[0].end_time).to.not.be.null
    //                 expect(res[0].side).to.not.be.null
    //                 expect(res[0].size).to.not.be.null
    //                 expect(res[0].profit_loss).to.not.be.null
    //                 expect(res[0].roe).to.not.be.null
    //                 expect(res[0].leverage).to.not.be.null
    //                 expect(res[0].average_price).to.not.be.null
    //             })
    //             after(async () => {
    //                 await TruncateTables()
    //             })
    //         })


    //         describe('paper orders', () => {
    //             it('Should upload a new order to the databse', async () => {
    //                 await insertPaperOrder(["defaultKeys", "bitmex", "ab7ae2nf-c828-76fc-3190-a35883804599", null, "2019-08-08T01:04:28.939Z", "Open", "Buy", 1000, 8000, 4000, 10, "Limit", "10"])
    //                 let res = await selectPaperOrders()
    //                 expect(res.length).to.equal(1)
    //             })

    //             it('Should select an order by status Open', async () => {
    //                 let res = await selectPaperOrdersByStatus(["Open"])
    //                 expect(res.length).to.equal(1)
    //             })

    //             it('Should update the order status in the databse', async () => {
    //                 await updatePaperOrderStatus(["Closed", "ab7ae2nf-c828-76fc-3190-a35883804599"])
    //                 let res = await selectPaperOrdersByStatus(["Closed"])
    //                 expect(res[0].order_status).to.equal("Closed")
    //             })

    //             it('Should update the order position_ref in the databse', async () => {
    //                 await updatePaperOrderPositionId(["123456532-se24243-zred143452123", "ab7ae2nf-c828-76fc-3190-a35883804599"])
    //                 res = await selectPaperOrders()
    //                 expect(res[0].position_ref).to.equal("123456532-se24243-zred143452123")
    //             })

    //             it('Should select all orders in the databse', async () => {
    //                 res = await selectPaperOrders()
    //                 expect(res.length).to.equal(1)
    //                 expect(res[0]).to.have.property("id")
    //                 expect(res[0]).to.have.property("bot_id")
    //                 expect(res[0]).to.have.property("exchange")
    //                 expect(res[0]).to.have.property("order_id")
    //                 expect(res[0]).to.have.property("position_ref")
    //                 expect(res[0]).to.have.property("_timestamp")
    //                 expect(res[0]).to.have.property("order_status")
    //                 expect(res[0]).to.have.property("side")
    //                 expect(res[0]).to.have.property("size")
    //                 expect(res[0]).to.have.property("_price")
    //                 expect(res[0]).to.have.property("margin")
    //                 expect(res[0]).to.have.property("leverage")
    //                 expect(res[0]).to.have.property("order_type")
    //                 expect(res[0]).to.have.property("average_price")
    //                 expect(res[0].id).to.not.be.null
    //                 expect(res[0].bot_id).to.not.be.null
    //                 expect(res[0].exchange).to.not.be.null
    //                 expect(res[0].order_id).to.not.be.null
    //                 expect(res[0].position_ref).to.not.be.null
    //                 expect(res[0]._timestamp).to.not.be.null
    //                 expect(res[0].order_status).to.not.be.null
    //                 expect(res[0].side).to.not.be.null
    //                 expect(res[0].size).to.not.be.null
    //                 expect(res[0]._price).to.not.be.null
    //                 expect(res[0].margin).to.not.be.null
    //                 expect(res[0].leverage).to.not.be.null
    //                 expect(res[0].order_type).to.not.be.null
    //                 expect(res[0].average_price).to.not.be.null
    //             })

    //             after(async () => {
    //                 await TruncateTables()
    //             })
    //         })

    //         describe('paper positions', () => {
    //             let res
    //             it('Should upload a new position to the databse', async () => {
    //                 await insertPaperPosition(["1234567890-0765-'sdf12345d123", "defaultKeys", 10, 2.0, "2017-01-01T12:30:00.000Z", "2017-01-01T12:35:00.000Z", "Buy", 100, 0.0, 0.0, 10, 120])
    //                 res = await selectPaperPositions()
    //                 expect(res.length).to.equal(1)
    //             })

    //             it('Should Select all positions in the database', async () => {
    //                 res = await selectPaperPositions()
    //                 expect(res.length).to.equal(1)
    //                 expect(res[0]).to.have.property("id")
    //                 expect(res[0]).to.have.property("position_id")
    //                 expect(res[0]).to.have.property("bot_id")
    //                 expect(res[0]).to.have.property("entry_price")
    //                 expect(res[0]).to.have.property("init_margin")
    //                 expect(res[0]).to.have.property("start_time")
    //                 expect(res[0]).to.have.property("end_time")
    //                 expect(res[0]).to.have.property("side")
    //                 expect(res[0]).to.have.property("size")
    //                 expect(res[0]).to.have.property("profit_loss")
    //                 expect(res[0]).to.have.property("roe")
    //                 expect(res[0]).to.have.property("leverage")
    //                 expect(res[0]).to.have.property("average_price")
    //                 expect(res[0].id).to.not.be.null
    //                 expect(res[0].position_id).to.not.be.null
    //                 expect(res[0].bot_id).to.not.be.null
    //                 expect(res[0].init_margin).to.not.be.null
    //                 expect(res[0].entry_price).to.not.be.null
    //                 expect(res[0].start_time).to.not.be.null
    //                 expect(res[0].end_time).to.not.be.null
    //                 expect(res[0].side).to.not.be.null
    //                 expect(res[0].size).to.not.be.null
    //                 expect(res[0].profit_loss).to.not.be.null
    //                 expect(res[0].roe).to.not.be.null
    //                 expect(res[0].leverage).to.not.be.null
    //                 expect(res[0].average_price).to.not.be.null
    //             })

    //             after(async () => {
    //                 await TruncateTables()
    //             })
    //         })
    //     })
//  })



