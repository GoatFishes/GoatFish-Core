const Ajv = require('ajv')
const { RESPONSE_CODES } = require('../utils/constants')
const ExceptionHandler = require('../utils/ExceptionHandler')

module.exports = async (schemas, options) => {
    const ajv = new Ajv(options)
    Object.keys(schemas).forEach((k) => {
        ajv.addSchema(schemas[k], k)
    })

    const checkPayload = (ctx, schema) => {
        const valid = ajv.validate(schema, ctx.request.body)
        if (!valid) {
            ajv.errors.forEach((e) => {
                throw new ExceptionHandler(RESPONSE_CODES.APPLICATION_ERROR, `PAYLOAD ISSUE : ${e}`)
            })
        } else {
            return ctx.request.body
        }
    }
    const ajvMiddleware = async (ctx, next) => {
        ctx.checkPayload = checkPayload
        await next()
    }
    return ajvMiddleware
}
