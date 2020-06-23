const strategy = async (params) => {
	let strategyObject = {
		execute: false						// Identifies whether we will be making an order
		, symbol: "XBTUSD"				// Identifies the asset that will be makin an order
		, leverage: "10"					// Identifies leverage used for the order
		, side: "Buy"						// Buy v. sell 
		, orderQty: "10"						// Amount of contracts
		, price: "755"						// Price at which to buy
		, orderType: "Limit"						// Always limit
		, timeInForce: "GoodTillCancel"						// Always goodTillCancelled
		, timestamp: null
	}
	if (params.open[params.open.length - 1] < 977) {
        strategyObject.execute = true
        strategyObject.price = params.open[params.open.length - 1]
		strategyObject.timestamp = params.timestamp[params.timestamp.length - 1]
	}
	else if (params.open[params.open.length - 1] > 977) {
        strategyObject.execute = true
        strategyObject.price = params.open[params.open.length - 1]
		strategyObject.side = "Sell"
		strategyObject.timestamp = params.timestamp[params.timestamp.length - 1]
	}
	return strategyObject
}
module.exports = { strategy }
