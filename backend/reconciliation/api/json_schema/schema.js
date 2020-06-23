const Ajv = require('ajv')

module.exports = async (schemas, options) => {
  const ajv = new Ajv(options)
  Object.keys(schemas).forEach((k) => {
    ajv.addSchema(schemas[k], k)
  })
  const checkPayload = (ctx, schema) => {
    const valid = ajv.validate(schema, ctx.request.body)
    if (!valid) {
      ctx.status = 400
      ctx.body = {}
      global.jsonErrorMessage = ''
      ajv.errors.forEach((e) => {
        global.jsonErrorMessage += e.message + ' '
        ctx.body[e.dataPath] = e.message
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
