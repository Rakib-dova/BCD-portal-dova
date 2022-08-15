'use stric'

/**
 * 分割したデータの処理を行う。
 * @param {array} items 対象データ
 * @param {object} fn 関数
 * @returns {array} 取得データ
 */
function series(items, fn) {
  const result = []
  return items
    .reduce((acc, item) => {
      acc = acc.then(() => {
        return fn(item).then((res) => result.push(res))
      })
      return acc
    }, Promise.resolve())
    .then(() => result)
}

/**
 * コントロールを呼び出す。
 * @param {object} req ユーザー情報
 * @param {object} key 対象データ
 * @param {object} contract 契約情報
 * @param {object} promiseAllArgs コントロール名、コントロール等のパラメータ
 * @returns {array} 取得データ
 */
function callController(req, key, contract, promiseAllArgs) {
  switch (promiseAllArgs.apiName) {
    case 'csvDownload': {
      return promiseAllArgs.controller.createInvoiceDataForDownload(req.user.accessToken, req.user.refreshToken, key)
    }
    case 'journalDownload': {
      return promiseAllArgs.controller.createInvoiceDataForDownload(
        req.user.accessToken,
        req.user.refreshToken,
        key,
        contract.contractId,
        promiseAllArgs.chkFinalapproval,
        req.user.userId
      )
    }
  }
}

/**
 * APIを呼び出す。
 * @param {string} key 対象データ
 * @param {object} promiseAllArgs API名、tradeshiftDTO等のパラメータ
 * @returns {array} 取得データ
 */
function callApi(key, promiseAllArgs) {
  switch (promiseAllArgs.apiName) {
    case 'getDocument': {
      return promiseAllArgs.tradeshiftDTO.getDocument(key.DocumentId)
    }
  }
}

/**
 * Promise.allを実行。（コントロールの場合）
 * @param {object} items 対象データ
 * @param {object} req ユーザー情報
 * @param {object} contract 契約情報
 * @param {object} promiseAllArgs コントロール名、コントロール等のパラメータ
 * @returns {array} 取得データ
 */
function all(items, req, contract, promiseAllArgs) {
  const promises = items.map((item) => callController(req, item, contract, promiseAllArgs))
  return Promise.all(promises)
}

/**
 * Promise.allを実行。（APIの場合）
 * @param {object} items 対象データ
 * @param {object} promiseAllArgs API名、tradeshiftDTO等のパラメータ
 * @returns {array} 取得データ
 */
function apiAll(items, promiseAllArgs) {
  const promises = items.map((item) => callApi(item, promiseAllArgs))
  return Promise.all(promises)
}

/**
 * 対象データを分割する。
 * @param {array} items 対象データ
 * @param {object} chunkSize 分割サイズ
 * @returns {array} 分割したデータ
 */
function splitToChunks(items, chunkSize = 5) {
  const result = []
  for (let i = 0; i < items.length; i += chunkSize) {
    result.push(items.slice(i, i + chunkSize))
  }

  return result
}

/**
 * コントロールのPromiseAllを実行。
 * @param {array} data 対象データ
 * @param {object} req ユーザー情報
 * @param {object} contract 契約情報
 * @param {object} promiseAllArgs コントロール名、コントロール等のパラメータ
 * @returns {array} 取得データ
 */
function controllerPromiseAll(data, req, contract, promiseAllArgs) {
  const chunkSize = promiseAllArgs.size
  const chunks = splitToChunks(data, chunkSize)
  let result = []
  return series(chunks, (chunk) => {
    return all(chunk, req, contract, promiseAllArgs).then((res) => (result = result.concat(res)))
  }).then(() => result)
}

/**
 * APIのPromiseAllを実行。
 * @param {array} data 対象データ
 * @param {object} promiseAllArgs API名、tradeshiftDTO等のパラメータ
 * @returns {array} 取得データ
 */
function apiPromiseAll(data, promiseAllArgs) {
  const chunkSize = promiseAllArgs.size
  const chunks = splitToChunks(data, chunkSize)
  let result = []
  return series(chunks, (chunk) => {
    return apiAll(chunk, promiseAllArgs).then((res) => (result = result.concat(res)))
  }).then(() => result)
}

module.exports = {
  series: series,
  callController: callController,
  all: all,
  splitToChunks: splitToChunks,
  controllerPromiseAll: controllerPromiseAll,
  apiPromiseAll: apiPromiseAll
}
