'use strict'

/**
 * 非同期ハンドラーを構成する
 */
const handler = (fn) => (req, res, next) => {
  console.log('== handler =================\n', req.method, req.baseUrl + req.path, req.query)
  fn(req, res, next).catch(next)
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
  currentTenantId,
  condition
}
