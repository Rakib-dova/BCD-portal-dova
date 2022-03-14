'use strict'

/**
 * 非同期ハンドラーを構成する
 */
const handler = (fn) => (req, res, next) => {
  console.log(req.method, req.baseUrl + req.path, req.query)
  fn(req, res, next).catch(next)
}

/**
 * Ajax用非同期ハンドラーを構成する
 */
const api = (middleware, fn, message) => {
  const wrap = (mw) => (req, res, next) => {
    const original = res.redirect
    res.redirect = (arg1, arg2) => res.send({ status: 'redirect', url: arg2 ?? arg1 })
    try {
      return mw(req, res, next)
    } finally {
      res.redirect = original
    }
  }
  return [
    ...middleware.map(wrap),
    handler(fn),
    (err, req, res, next) => res.send({ status: 'ng', message: message ?? err.message })
  ]
}

/**
 * リクエストからログイン中のテナントIDを取り出す
 */
const currentTenantId = (req) => req.user.tenantId

/**
 * 奉行クラウドAPIのフィルターオブジェクトを構成する
 */
const condition = (itemKey, operator, value) => {
  return {
    itemKey: itemKey,
    operator: operator,
    value: value
  }
}

module.exports = {
  handler,
  api,
  currentTenantId,
  condition
}
