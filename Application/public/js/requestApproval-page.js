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
    if (selectors === undefined) return null
  } else {
    return null
  }
  return Object.assign(selectors, Array.prototype, (type, event) => {
    document.addEventListener(type, event)
  })
}

// メッセージ文字数確認
$('#inputMsg').addEventListener('keyup', function () {
  $('#msgCount').innerText = '(' + $('#inputMsg').value.length + '/1500)'
  console.log($('#inputMsg').value.length)

  if ($('#inputMsg').value.length > 1500) {
    $('#inputMsg').value($('#inputMsg').value.substring(0, 1500))
    $('#msgCount').innerText = '1500/1500'
  }
})

// 承認ルートモーダルの内の検索ボタン
$('#btnSearchApproveRoute').addEventListener('click', function () {
  const approveRoute = $('#searchModalApproveRoute').value

  const $this = this
  // モーダル初期化
  deleteApproveRouteResultDisplayModal()

  // 初期化されたキーワードを入力
  $('#searchModalApproveRoute').value = approveRoute

  // サーバーからデータ取得
  const getApproveRoute = new XMLHttpRequest()
  getApproveRoute.open('POST', '/requestApproval/approveRoute')
  getApproveRoute.setRequestHeader('Content-Type', 'application/json')
  getApproveRoute.onreadystatechange = function () {
    if (getApproveRoute.readyState === getApproveRoute.DONE) {
      switch (getApproveRoute.status) {
        case 200: {
          const result = JSON.parse(getApproveRoute.response)
          if (result.length !== 0) {
            displayResultForApproveRoute(result)
          } else {
            displayNoApproveRoute()
          }
          break
        }
        default: {
          deleteApproveRouteResultDisplayModal()
          break
        }
      }
    }
    $this.classList.remove('is-loading')
  }
  $this.classList.add('is-loading')
  getApproveRoute.send(
    JSON.stringify({
      approveRoute: approveRoute
    })
  )
})

// 承認ルート再検索の時、前の結果を消す
const deleteApproveRouteResultDisplayModal = function () {
  const displayFieldResultBody = $('#displayFieldApproveRouteResultBody')
  if (displayFieldResultBody.children.length !== 0) {
    const chidrenItem = []
    Array.prototype.forEach.call(displayFieldResultBody.children, (item) => {
      chidrenItem.push(item)
    })
    chidrenItem.forEach((item) => {
      displayFieldResultBody.removeChild(item)
    })
  }

  $('#searchModalApproveRoute').value = ''

  $('#approveRouteResultDisplayInvisible').classList.add('is-invisible')
}

// 承認ルート検索結果を画面に表示
const displayResultForApproveRoute = function (codeArr) {
  const displayFieldApproveRouteResultBody = $('#displayFieldApproveRouteResultBody')
  const searchResultApproveRoute = $('#searchResultApproveRoute')
  codeArr.forEach((item) => {
    console.log(item)
    const cloneSearchResultApproveRouteTemplate = document.importNode(searchResultApproveRoute.content, true)
    cloneSearchResultApproveRouteTemplate.querySelector('.rowApproveRoute').dataset.target = '#approveRoute-modal'
    cloneSearchResultApproveRouteTemplate.querySelector('.rowApproveRoute').dataset.approveRoute = item.uuid
    cloneSearchResultApproveRouteTemplate.querySelector('.columnNoApproveRouteMessage').classList.add('is-invisible')
    cloneSearchResultApproveRouteTemplate.querySelector('.columnNumber').innerText = item.No
    cloneSearchResultApproveRouteTemplate.querySelector('.columnApproveRoute').innerText = item.approveRouteName
    cloneSearchResultApproveRouteTemplate.querySelector('.columnApproveRouteUserCount').innerText = item.approverCount
    displayFieldApproveRouteResultBody.appendChild(cloneSearchResultApproveRouteTemplate)
  })
  $('.rowApproveRoute').forEach((row) => {
    row.addEventListener('click', function () {
      $(this.dataset.target).classList.remove('is-active')
      const inputTarget = $(this.dataset.target).dataset.info
      $(`#${inputTarget}_departmentCode`).value = this.dataset.departmentCode
      $('#btn-confirm').removeAttribute('disabled')
      deleteApproveRouteResultDisplayModal()
    })
    row.addEventListener('mouseover', function () {
      this.classList.add('is-selected')
    })
    row.addEventListener('mouseout', function () {
      this.classList.remove('is-selected')
    })
  })
  $('#approveRouteResultDisplayInvisible').classList.remove('is-invisible')
}

// 承認ルート検索結果がない場合
const displayNoApproveRoute = function () {
  const displayFieldApproveRouteResultBody = $('#displayFieldApproveRouteResultBody')
  const searchResultApproveRoute = $('#searchModalApproveRoute')
  const cloneSearchResultApproveRouteTemplate = document.importNode(searchResultApproveRoute.content, true)
  cloneSearchResultApproveRouteTemplate.querySelector('.columnNoApproveRouteMessage').classList.remove('is-invisible')
  cloneSearchResultApproveRouteTemplate.querySelector('.columnNoApproveRouteMessage').setAttribute('colspan', '2')
  cloneSearchResultApproveRouteTemplate.querySelector('.columnNoApproveRouteMessage').innerText =
    '該当する部門データが存在しませんでした。'
  displayFieldApproveRouteResultBody.appendChild(cloneSearchResultApproveRouteTemplate)
  $('#approveRouteResultDisplayInvisible').classList.remove('is-invisible')
}
