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
    if (this.dataset.info !== $('#accountCode-modal').dataset.info) {
      deleteDisplayModal()
    }
    if (searchModal) searchModal.classList.toggle('is-active')
    $('#accountCode-modal').dataset.info = this.dataset.info
  }
}

// 承認者再検索の時、前の結果を消す
const deleteDisplayModal = function () {
  const displayFieldResultBody = $('#displayFieldResultBody')
  if (displayFieldResultBody.children.length !== 0) {
    const chidrenItem = []
    Array.prototype.forEach.call(displayFieldResultBody.children, (item) => {
      chidrenItem.push(item)
    })
    chidrenItem.forEach((item) => {
      displayFieldResultBody.removeChild(item)
    })
  }


// 検索ボタンクリック時
$('#btnSearchApproveUser').addEventListener('click', function () {
  // 検索ボタンが非活性化の時は動作しない
  if (this.getAttribute('disabled') !== null) {
    return
  }
  const dataTarget = this.getAttribute('data-target')
  $(dataTarget).classList.add('is-active')
})

