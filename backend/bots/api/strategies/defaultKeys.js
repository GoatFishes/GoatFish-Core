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
	if (params[params.length - 1].open < 977) {
        strategyObject.execute = true
        strategyObject.price = params[params.length - 1].open
		strategyObject.timestamp = params[params.length - 1].timestamp
	}
	else if (params[params.length - 1].open > 977) {
        strategyObject.execute = true
        strategyObject.price = params[params.length - 1].open
		strategyObject.side = "Sell"
		strategyObject.timestamp = params[params.length - 1].timestamp
	}
	return strategyObject
}
module.exports = { strategy }
