/**
 * document.getElementById、document.getElementsByClassName省略
 * @param {string} tagObjName タグID/クラス名
 * @returns エレメント
 */
// eslint-disable-next-line no-unused-vars
const $ = function (tagObjName) {
  const classNamePattern = '\\.+[a-zA-Z0-9]'
  const idNamePatten = '\\#+[a-zA-Z0-9]'
  const classNameReg = new RegExp(classNamePattern)
  const idNameReg = new RegExp(idNamePatten)
  let selectors

  if (classNameReg.test(tagObjName)) {
    selectors = document.querySelectorAll(tagObjName)
  } else if (idNameReg.test(tagObjName)) {
    selectors = document.querySelectorAll(tagObjName)[0]
  } else {
    return null
  }
  if (selectors === undefined) return null
  return Object.assign(selectors, Array.prototype, (type, event) => {
    document.addEventListener(type, event)
  })
}

/**
 * Post
 * @param {string} url URL
 * @param {object} postData POSTデータ
 * @param {function} callback コールバック
 */
// eslint-disable-next-line no-unused-vars
function doPost(url, postData, callback) {
  const httpRequest = new XMLHttpRequest()
  httpRequest.open('POST', url, true)
  httpRequest.setRequestHeader('Content-Type', 'application/json')
  httpRequest.onreadystatechange = function () {
    if (typeof callback !== 'undefined') {
      callback(httpRequest)
    }
  }
  httpRequest.send(JSON.stringify(postData))
}
