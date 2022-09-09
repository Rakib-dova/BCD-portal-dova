// UserAgentで判定し
// IE以外は動的にスクリプトをロード
const modal = document.getElementById('request-progress-modal')
const ua = window.navigator.userAgent
if (ua.indexOf('MSIE ') === -1 && ua.indexOf('Trident') === -1) {
  const tag = document.createElement('script')
  tag.type = 'module'
  tag.src = '/js/loaded-portal-page.js'
  document.getElementsByTagName('body')[0].appendChild(tag)
} else {
  // IEはクリップボードコピーが機能しないのでコピーボタンを削除
  const elm = document.getElementById('copy-btn')
  if (elm) elm.parentNode.removeChild(elm)
}
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
function messageCheck(event) {
  // lfCnt linefeedのカウンター
  $('#inputMsg').addEventListener(event, function () {
    let msgLen = $('#inputMsg').value.length
    let lfCnt = 0

    for (const char of $('#inputMsg').value) {
      if (encodeURI(char) === '%0A') {
        msgLen++
        lfCnt++
      }
    }

    $('#msgCount').innerText = `(${msgLen}/1500)`

    if (msgLen > 1500) {
      $('#inputMsg').value = $('#inputMsg').value.substring(0, 1500 - lfCnt)
      msgLen = $('#inputMsg').value.length
      for (const char of $('#inputMsg').value) {
        if (encodeURI(char) === '%0A') {
          msgLen++
        }
      }
      $('#msgCount').innerText = `(${msgLen}/1500)`
    }
  })
}
messageCheck('keyup')
messageCheck('keydown')
messageCheck('paste')
messageCheck('focusin')
messageCheck('focusout')

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
  const elements = document.getElementsByName('_csrf')
  const csrf = elements.item(0).value
  getApproveRoute.open('POST', '/requestApproval/approveRoute')
  getApproveRoute.setRequestHeader('Content-Type', 'application/json')
  getApproveRoute.setRequestHeader('CSRF-Token', csrf)
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
    const cloneSearchResultApproveRouteTemplate = document.importNode(searchResultApproveRoute.content, true)
    cloneSearchResultApproveRouteTemplate.querySelector('.rowApproveRoute').dataset.target = '#approveRoute-modal'
    cloneSearchResultApproveRouteTemplate.querySelector('.rowApproveRoute').dataset.approveRoute = item.uuid
    cloneSearchResultApproveRouteTemplate.querySelector('.columnNoApproveRouteMessage').classList.add('is-invisible')
    cloneSearchResultApproveRouteTemplate.querySelector('.columnNumber').innerText = item.No
    cloneSearchResultApproveRouteTemplate.querySelector('.columnApproveRoute').innerText = item.approveRouteName
    cloneSearchResultApproveRouteTemplate.querySelector('.columnApproveRouteUserCount').innerText = item.approverCount
    cloneSearchResultApproveRouteTemplate.querySelector('.btnDetailApproveRoute').dataset.target = item.uuid
    cloneSearchResultApproveRouteTemplate.querySelector('.btnSelectApproveRoute').dataset.target = item.uuid
    displayFieldApproveRouteResultBody.appendChild(cloneSearchResultApproveRouteTemplate)
  })
  // 選択する行に色付ける
  $('.rowApproveRoute').forEach((row) => {
    row.addEventListener('mouseover', function () {
      this.classList.add('is-selected')
    })
    row.addEventListener('mouseout', function () {
      this.classList.remove('is-selected')
    })
  })
  $('.btnDetailApproveRoute').forEach((btnDetailApproveRoute) => {
    btnDetailApproveRoute.addEventListener('click', function () {
      getDetailApproveRoute(this.dataset.target, 'btnDetailApproveRoute')
    })
  })
  //
  $('.btnSelectApproveRoute').forEach((btnSelected) => {
    btnSelected.addEventListener('click', function () {
      const approveRouteId = this.dataset.target
      getDetailApproveRoute(approveRouteId, 'btnSelectApproveRoute')
    })
  })
  $('#approveRouteResultDisplayInvisible').classList.remove('is-invisible')
}

// 承認ルート検索結果がない場合
const displayNoApproveRoute = function () {
  const displayFieldApproveRouteResultBody = $('#displayFieldApproveRouteResultBody')
  const noResultElement = document.createElement('tr')
  const noResultElementRow = document.createElement('td')
  noResultElementRow.setAttribute('colspan', '6')
  noResultElementRow.innerText = '承認ルートがありません。事前に「承認ルート画面」から承認ルートを登録してください。'
  noResultElement.appendChild(noResultElementRow)
  displayFieldApproveRouteResultBody.appendChild(noResultElement)
  $('#approveRouteResultDisplayInvisible').classList.remove('is-invisible')
}

const getDetailApproveRoute = function (_approveRouteId, btnName) {
  const getDetailApproveRoute = new XMLHttpRequest()
  const elements = document.getElementsByName('_csrf')
  const csrf = elements.item(0).value
  getDetailApproveRoute.open('POST', '/requestApproval/detailApproveRoute', true)
  getDetailApproveRoute.setRequestHeader('Content-Type', 'application/json')
  getDetailApproveRoute.setRequestHeader('CSRF-Token', csrf)
  getDetailApproveRoute.onreadystatechange = function () {
    if (getDetailApproveRoute.readyState === getDetailApproveRoute.DONE) {
      let result = null
      switch (getDetailApproveRoute.status) {
        case 200:
          result = JSON.parse(getDetailApproveRoute.response)
          break
      }
      let attachBoard = null
      let targetModal = null
      switch (btnName) {
        case 'btnDetailApproveRoute':
          attachBoard = $('#display-detail-approveRoute')
          targetModal = $('#detail-approveRoute-modal')
          break
        case 'btnSelectApproveRoute':
          attachBoard = $('#displayRequestApprovaRoute')
          targetModal = $('#approveRoute-modal')
          break
      }
      displayDetailApproveRoute(result, attachBoard)
      targetModal.classList.toggle('is-active')
    }
  }

  getDetailApproveRoute.send(
    JSON.stringify({
      approveRouteId: _approveRouteId
    })
  )
}

const displayDetailApproveRoute = function (detailApproveRoute, blackboard) {
  while (blackboard.firstChild) {
    blackboard.removeChild(blackboard.firstChild)
  }

  const result = detailApproveRoute
  const approValNo = [
    '一次承認',
    '二次承認',
    '三次承認',
    '四次承認',
    '五次承認',
    '六次承認',
    '七次承認',
    '八次承認',
    '九次承認',
    '十次承認',
    '最終承認'
  ]
  const approver = result.users
  const template = $('#template-display-detail-approveRoute')
  const cloneTemplate = document.importNode(template.content, true)
  const approveRouteIdHidden = document.createElement('input')
  const approveRouteName = document.createElement('p')
  approveRouteIdHidden.setAttribute('name', 'approveRouteId')
  approveRouteIdHidden.setAttribute('type', 'hidden')
  approveRouteIdHidden.value = result.approveRouteId
  approveRouteName.innerText = result.name
  cloneTemplate.querySelector('#approveRouteName').appendChild(approveRouteName)
  cloneTemplate.querySelector('#approveRouteName').appendChild(approveRouteIdHidden)
  const createApproverRow = function (noText, name) {
    const element = document.createElement('div')
    const noElement = document.createElement('div')
    const nameElement = document.createElement('div')
    element.classList.add('columns')
    element.classList.add('m-0')
    element.classList.add('p-0')
    element.classList.add('is-max-width')
    noElement.classList.add('column')
    noElement.classList.add('is-one-third')
    noElement.classList.add('text-left')
    noElement.classList.add('is-border-right')
    nameElement.classList.add('column')
    nameElement.classList.add('text-left')
    nameElement.classList.add('is-border-right')
    noElement.innerText = noText
    nameElement.innerText = name
    element.appendChild(noElement)
    element.appendChild(nameElement)
    return element
  }
  const approverLen = approver.length
  const header = createApproverRow('承認順', '承認者')
  header.classList.add('is-border-left-top')
  header.querySelectorAll('.column')[0].classList.add('is-color-table-header')
  header.querySelectorAll('.column')[1].classList.add('is-color-table-header')
  cloneTemplate.querySelector('#displayDetailApproveRouteTable').appendChild(header)
  for (let idx = 0; idx < approverLen; idx++) {
    let no = null
    if (idx < approverLen - 1) {
      no = approValNo[idx]
    } else {
      no = approValNo.slice(-1)[0]
    }
    const rowLastApprover = createApproverRow(no, `${approver[idx].FirstName} ${approver[idx].LastName}`)

    if (no !== approValNo.slice(-1)[0]) {
      rowLastApprover.classList.add('is-border-left-top')
      rowLastApprover.classList.add('is-max-width')
    } else {
      rowLastApprover.classList.add('is-border-left-top-bottom')
      rowLastApprover.classList.add('is-max-width')
    }
    cloneTemplate.querySelector('#displayDetailApproveRouteTable').appendChild(rowLastApprover)
  }
  blackboard.appendChild(cloneTemplate)
}

$('#btn-confirm').addEventListener('click', function () {
  while ($('#journal-list').firstChild) {
    $('#journal-list').removeChild($('#journal-list').firstChild)
  }
  const invoiceList = $('.invoiceLine')
  if (!$('#journal-list').firstChild) {
    Array.prototype.forEach.call(invoiceList, (invoiceLine) => {
      const cloneInvoice = document.importNode(invoiceLine.parentNode, true)
      Array.prototype.forEach.call(cloneInvoice.querySelectorAll('input'), (input) => {
        input.removeAttribute('name')
      })
      $('#journal-list').appendChild(cloneInvoice)
    })
  }

  // 依頼者のメッセージの表示
  $('#text-requester-message').value = $('#inputMsg').value

  // 承認ルート各民モーダルに表示
  const checkApproveRoute = $('#check-request-approve-route')
  while (checkApproveRoute.firstChild) {
    checkApproveRoute.removeChild(checkApproveRoute.firstChild)
  }
  const displayRequestApprovaRoute = $('#displayRequestApprovaRoute')
  const cloneDiplay = document.importNode(displayRequestApprovaRoute, true)
  $('#check-request-approve-route').appendChild(cloneDiplay)
})

$('#btn-approval').addEventListener('click', (e) => {
  e.preventDefault()
  modal.classList.add('is-active')
  $('#approval').submit()
})

// 依頼者メッセージ詳細表示
Array.prototype.forEach.call(document.querySelectorAll('.moreMessage'), (item) => {
  item.addEventListener('click', () => {
    showMoreMessageModal(item)
  })
})

// 承認者メッセージ詳細表示
Array.prototype.forEach.call(document.querySelectorAll('.moreMessageUser'), (item) => {
  item.addEventListener('click', () => {
    showMoreMessageModal(item)
  })
})

const showMoreMessageModal = function (target) {
  while (document.getElementById('more-message-modal-body').firstChild) {
    document
      .getElementById('more-message-modal-body')
      .removeChild(document.getElementById('more-message-modal-body').firstChild)
  }

  const message = target.dataset.info
  console.log(message.length)
  if (message !== 'null') {
    console.log('11111')
    document.getElementById('more-message-modal').classList.add('is-active')
    console.log('22222')
    if (message.indexOf('\n') !== -1) {
      const messageLines = message.split('\n')
      messageLines.forEach((line, idx) => {
        const newChild = document.createElement('p')
        newChild.id = idx
        newChild.textContent = line
        document.getElementById('more-message-modal-body').appendChild(newChild)
      })
    } else {
      const newChild = document.createElement('p')
      newChild.textContent = message
      document.getElementById('more-message-modal-body').appendChild(newChild)
    }
  }
}
