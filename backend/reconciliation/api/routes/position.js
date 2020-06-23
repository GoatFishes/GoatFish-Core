const Koa = require('koa')
const route = require('koa-route')
const { updatePositions } = require('../utils/positionsUpdate')

module.exports = async () => {
    const app = new Koa()

    // Retrive all the open positions from all the bots in the system accepts a param that allows the user to get historic data or open positions
    // TODO: get the oders processed to determine the position they belong to. 
    app.use(route.get('/', async (ctx) => {
        let id = ctx.request.query.id
        let response

        response = await updatePositions(id)
        // Response
        ctx.status = 200
        ctx.body = {
            data: response
        }
    }))

    app.use(route.post('/stats', async (ctx) => {
        let type = ctx.request.body.type //open or close
        let id = ctx.request.body.id // id of the bot we want an analysis on

        await updatePositions(id)

        let amountOfPositions = response.data.position.length
        let ethereumCounter = 0
        let bitcoinCounter = 0
        let adaCounter = 0
        let eosCounter = 0
        let xrpCounter = 0 
        let longPositionCounter = 0
        let shortPositionCounter = 0
        let profitArr = []
        let lossArr = []
        let consecutiveCounter  = { count : 0, win: true }
        let consecutiveWinCount = []
        let consecutiveLossCount = []


        for(let i; i<amountOfPositions;i++){
            // Calculate the total amount of positions for each symbol
            if(response.data.position[i].symbol=="ETH"){ethereumCounter++}
            if(response.data.position[i].symbol=="BTC"){bitcoinCounter++}
            if(response.data.position[i].symbol=="ADA"){adaCounter++}
            if(response.data.position[i].symbol=="EOS"){eosCounter++}
            if(response.data.position[i].symbol=="XRP"){xrpCounter++}


            // Calculate the side for all the positions
            if(response.data.position[i].side=="Buy"){longPositionCounter++} else{shortPositionCounter++}
            if(response.data.position[i].realisedPnl>0){profitArr.push(response.data.position[i].realisedPnl), consecutiveCounter.count++} else{lossArr.push(response.data.position[i].realisedPnl)}


        }
        let profitCount = profitArr.length()
        let lossCount = lossArr.length()
        let longToShortRatio  = (longPositionCounter/shortPositionCounter).toFixed(2)
        let profitToLossRatio  = (profitCount/lossCount).toFixed(2)


        // Response
        ctx.status = 200
        ctx.body = {
            data:
            {
                total_number: amountOfPositions,
                asset_percetages : {
                    ethereum : ethereumCounter,
                    bitcoin : bitcoinCounter,
                    ada : adaCounter,
                    eos : eosCounter,
                    xrp : xrpCounter
                },
                side : {
                    long: longPositionCounter,
                    short : shortPositionCounter,
                    ratio : longToShortRatio
                },
                pnl : {
                    average : 0,
                    overall : 0,
                    highest : 0,
                    lowest : 0
                },

                trades :{
                    wins : profitCount,
                    loses : lossCount,
                    ratio : profitToLossRatio,
                    maxWinInRow : 0,
                    maxLossInRow : 0,
                }
            }
        }
    }))

    return app
}