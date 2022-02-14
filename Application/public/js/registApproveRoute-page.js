'use strict'

// 承認順番
const approveUserNumbers = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十']
// document.getElementById、document.getElementsByClassName省略
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

  return Object.assign(selectors, Array.prototype, (type, event) => {
    document.addEventListener(type, event)
  })
}

// ローディング画面の初期化
window.onload = function () {
  // 勘定科目・補助科目の検索ボタン機能設定
  Array.prototype.forEach.call($('.BtnlineApproveRouteUserSearch'), function (btn) {
    btn.addEventListener('click', btnSearchMain())
  })
}

// 2番目以降の勘定科目・補助科目検索ボタンイベント
const btnSearchMain = function (searchModal) {
  return function () {
    if (searchModal) searchModal.classList.toggle('is-active')
    $('#approveRoute-modal').dataset.info = this.dataset.info
  }
}

// 承認者追加ボタンクリック時
$('#btnAddApproveRoute').addEventListener('click', function () {
  const target = $(this.dataset.target)
  addApproveUsers(target)
})

// マイナスボタン機能追加
const btnMinusApproveRoute = function () {
  const deleteTarget = this.dataset.target
  $(`#${deleteTarget}`).remove()
  const approveUserList = $('#bulkInsertNo1')
  approveUserList.querySelectorAll('.lineApproveRoute').forEach((item, idx) => {
    item.querySelector('.input-approveRouteUserNumber').innerText = `${approveUserNumbers[idx]}次承認`
  })
}

const addApproveUsers = function (target) {
  const lineApproveRouteLength = target.querySelectorAll('.lineApproveRoute').length
  if (lineApproveRouteLength < 10) {
    // 承認者のidを作成：lineNo明細詳細の順番_lineApproveRoute承認者の順番
    const tagetIdBase = `${target.id}_lineApproveRoute`
    const targetId = `${target.id}_lineApproveRoute${
      ~~document.querySelectorAll('.lineApproveRoute')[lineApproveRouteLength].id.replaceAll(tagetIdBase, '') + 1
    }`
    // templateから追加承認者追加作成
    const templateLineApproveRouteItem = $('#templateLineApproveRouteItem')
    const cloneApproveRouteItem = document.importNode(templateLineApproveRouteItem.content, true)
    cloneApproveRouteItem.querySelector('.lineApproveRoute').id = targetId
    // 承認者順番
    cloneApproveRouteItem.querySelector('.input-approveRouteUserNumber').setAttribute('name', `${targetId}_approveUserNumber${lineApproveRouteLength + 1}`)
    cloneApproveRouteItem.querySelector('.input-approveRouteUserNumber').innerText = `${approveUserNumbers[lineApproveRouteLength]}次承認`
    // 承認者名INPUT
    cloneApproveRouteItem.querySelector('.input-approveRouteUserName').setAttribute('name', `${targetId}_approveUserName`)
    cloneApproveRouteItem.querySelector('.input-approveRouteUserName').id = `${targetId}_approveUserName`
    // メールアドレスINPUT
    cloneApproveRouteItem
      .querySelector('.input-approveRouteUserMailAddress')
      .setAttribute('name', `${targetId}_approveUserMailAddress`)
    cloneApproveRouteItem.querySelector('.input-approveRouteUserMailAddress').id = `${targetId}_approveUserMailAddress`

    // 承認者削除ボタン
    cloneApproveRouteItem.querySelector('.btn-minus-approveRoute').dataset.target = targetId
    cloneApproveRouteItem.querySelector('.btn-minus-approveRoute').addEventListener('click', btnMinusApproveRoute)

    // 承認者検索ボタン
    cloneApproveRouteItem.querySelector('.btn-search-main').dataset.target = 'approveRoute-modal'
    cloneApproveRouteItem.querySelector('.btn-search-main').dataset.info = targetId
    cloneApproveRouteItem
      .querySelector('.btn-search-main')
      .addEventListener('click', btnSearchMain($('#approveRoute-modal')))
    const approveUserList = $('#bulkInsertNo1')
    if (lineApproveRouteLength < 1) {
      approveUserList.insertBefore(cloneApproveRouteItem, approveUserList.childNodes[0])
    } else {
      approveUserList.insertBefore(cloneApproveRouteItem, approveUserList.childNodes[lineApproveRouteLength])
    }
  }
}
