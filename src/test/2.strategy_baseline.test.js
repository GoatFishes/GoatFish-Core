// const chai = require("chai")
// const expect = chai.expect
// const { fetchLinkBody, fetchLink } = require('./utils/fetcher')
// const { insertBotKeys, insertBotStrategy, selectPerformance, selectOrders, selectPaperOrders, TruncateTables } = require('./utils/database/db')

// const { main } = require('./strategy_baseline/app')
// let server

// const kafka = require('kafka-node'),
//     Producer = kafka.Producer,
//     client = new kafka.KafkaClient({ kafkaHost: 'kafka:9092' }),
//     producer = new Producer(client)

// const keys = {
//     "apiKeyID": "QVBBDR7W4YdKi1bYB-p1Ml7O",
//     "apiKeySecret": "K4HFi8AQjk2PDytPh_V6gtX3KciIMuXtyn5iQ8UhRT-U41Hs"
// }

// sleep = m => new Promise(r => setTimeout(r, m))


// describe('Strategy Baseline', async () => {
//     before(async () => {
//         const app = await main()
//         server = app.listen(3001)
//     })

//     after(() => {
//         server.close()
//     })

//     describe('healthcheck', () => {
//         var res

//         before(async () => {
//             res = await chai
//                 .request(server)
//                 .get('/bot_manager/healthcheck')
//         })

//         it('Should return 200 when calling /healthcheck for the container', async () => {
//             expect(res).to.have.status(200)
//             expect(res.text).to.eql('{"data":"OK"}');
//         })

//         it('Should return the correct message', () => {
//             expect(res.text).to.eql('{"data":"OK"}');
//         })
//     })
// })

//     describe('Set status', async () => {
//         before(async () => {
//             await insertBotStrategy(["defaultKeys", "", 0.0, 0.0, port, `["1mXBTUSD", "5mXBTUSD"]`, 'Stop'])
//             await insertBotKeys(["defaultKeys", keys, "bitmex"])
//         })
//         describe('LiveTrade', async () => {
//             before(async () => {
//             })

//             it('Call /setstatus with status LiveTrade', async () => {
//                 res = await fetchLink(`http://${body.botId}:${port}/setstatus?status=LiveTrade`, "POST")
//                 expect(JSON.stringify(res)).to.eql('{"data":{"botId":"defaultKeys","message":"Status updated to LiveTrade"}}');
//                 await sleep(2500)
//             })

//             it('Ensure order has been pushed to exchange and database', async () => {
//                 let topic = "bitmexPriceStream"
//                 payloads = [
//                     { topic: topic, messages: '{"timestamp":"2020-05-29T07:25:00.000Z", "symbol":"1mXBTUSD", "open":776, "close":777,"high":777, "low":776, "volume":20 }', partition: 0 },
//                 ]
//                 await producer.send(payloads, async function (err, data) { })
//                 await sleep(1500)
//                 let orders = await selectOrders()
//                 expect(orders[0]).to.have.property("botId");
//                 expect(orders[0]).to.have.property("exchange");
//                 expect(orders[0]).to.have.property("order_id");
//                 expect(orders[0]).to.have.property("position_ref");
//                 expect(orders[0]).to.have.property("_timestamp");
//                 expect(orders[0]).to.have.property("order_status");
//                 expect(orders[0]).to.have.property("side");
//                 expect(orders[0]).to.have.property("size");
//                 expect(orders[0]).to.have.property("_price");
//                 expect(orders[0]).to.have.property("margin");
//                 expect(orders[0].margin).to.eql(0.00382450331125828);
//                 expect(orders[0]).to.have.property("leverage");
//                 expect(orders[0]).to.have.property("order_type");
//                 expect(orders[0]).to.have.property("average_price");
//             })
//         })

//         describe('PaperTrade', async () => {
//             before(async () => {
//                 // Pass kafka info here
//             })

//             it('Call /setstatus with status PaperTrade', async () => {
//                 res = await fetchLink(`http://${body.botId}:${port}/setstatus?status=PaperTrade`, "POST")
//                 expect(JSON.stringify(res)).to.eql('{"data":{"botId":"defaultKeys","message":"Status updated to PaperTrade"}}');
//                 await sleep(2500)
//             })

//             it('Ensure order has been pushed to exchange and database', async () => {
//                 let topic = "bitmexPriceStream"
//                 payloads = [
//                     { topic: topic, messages: '{"timestamp":"2020-05-29T07:25:00.000Z", "symbol":"1mXBTUSD", "open":776, "close":777,"high":777, "low":776, "volume":20 }', partition: 0 },
//                 ]
//                 await producer.send(payloads, async function (err, data) { })
//                 await sleep(1000)
//                 let orders = await selectPaperOrders()
//                 expect(orders[0]).to.have.property("bot_id");
//                 expect(orders[0]).to.have.property("exchange");
//                 expect(orders[0]).to.have.property("order_id");
//                 expect(orders[0]).to.have.property("position_ref");
//                 expect(orders[0]).to.have.property("_timestamp");
//                 expect(orders[0]).to.have.property("order_status");
//                 expect(orders[0]).to.have.property("side");
//                 expect(orders[0]).to.have.property("size");
//                 expect(orders[0]).to.have.property("_price");
//                 expect(orders[0]).to.have.property("margin");
//                 expect(orders[0].margin).to.eql(0.00128865979381443);
//                 expect(orders[0]).to.have.property("leverage");
//                 expect(orders[0]).to.have.property("order_type");
//                 expect(orders[0]).to.have.property("average_price");
//             })
//         })

//         describe('Backtest', async () => {
//             let res

//             before(async () => {
//                 let body = { "binSize": "1m", "endTime": "2017-01-01T12:35:00.000Z", "symbol": "XBT", "botId": "defaultKeys" }
//                 await fetchLinkBody("http://exchange_engine:3003/exchange_engine/backtest/price", body, "POST")
//                 await sleep(1000)
//             })

//             it('Call /setstatus with status Backtest', async () => {
//                 reqBody = { "timeFrame": "1m", "symbol": "XBT", "exchange": "bitmex" }
//                 res = await fetchLinkBody(`http://${body.botId}:${port}/setstatus?status=Backtest`, reqBody, "POST")
//                 expect(JSON.stringify(res)).to.eql('{"data":{"botId":"defaultKeys","message":"Status updated to Backtest"}}');
//             })

//             it('Persist results to the database', async () => {
//                 await sleep(1000)
//                 let data = await selectPerformance()
//                 // Ensure forma integrity
//                 expect(data[0]).to.have.property("avg_time")
//                 expect(data[0]).to.have.property("average_profit")
//                 expect(data[0]).to.have.property("overall_profit")
//                 expect(data[0]).to.have.property("number_of_trades")
//                 expect(data[0]).to.have.property("sharpe_ratio")
//                 expect(data[0]).to.have.property("longest_trade")
//                 expect(data[0]).to.have.property("shortest_trade")
//                 expect(data[0]).to.have.property("best_trade")
//                 expect(data[0]).to.have.property("worst_trade")

//                 // Ensure Ciorrectness of calcs
//                 expect(data[0].average_profit).to.eql(-0.05)
//                 expect(data[0].overall_profit).to.eql(-0.16)
//                 expect(data[0].number_of_trades).to.eql(6)
//                 expect(data[0].sharpe_ratio).to.eql(-0.31)
//                 expect(data[0].avg_time).to.eql(1.5)
//                 expect(data[0].longest_trade).to.eql(2)
//                 expect(data[0].shortest_trade).to.eql(1)
//                 expect(data[0].best_trade).to.eql(0.15)
//                 expect(data[0].worst_trade).to.eql(-0.16)
//             })
//         })
//     })
//     after(async () => {
//         await TruncateTables()
//     })
// })
