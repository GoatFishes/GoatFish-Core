/**
 * Calculates the margin in BTC 
 *
 * @param {float} orderQty float Amount of ontracts for a given position
 * @param {float} price  Price at which the order was executed
 * @param {integer} leverage  Leverage the order was sent at
 * @param {float} fee_type  Market or limit fee deping on whether theorder dded or removed liquidity from the order book
 * 
 * @returns {integer} margin defined in BTC with eight decimal points
 */
const marginFormula = async (params) => {
    const margin = ((1 / parseInt(params.leverage)) * (parseInt(params.orderQty) / params.price))
    return margin
}

module.exports = { marginFormula }
