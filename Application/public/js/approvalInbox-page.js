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

// UserAgentで判定し
// IE以外は動的にスクリプトをロード
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

// プラスボタンの機能
Array.prototype.forEach.call($('.btn-plus-accountCode'), (btnPlusAccount) => {
  btnPlusAccount.addEventListener('click', function () {
    const target = $(this.dataset.target)
    const lineAccountcodeLength = target.querySelectorAll('.lineAccountcode').length
    if (lineAccountcodeLength < 10) {
      // 仕訳情報のidを作成：lineNo明細詳細の順番_lineAccountCode仕訳情報の順番
      const tagetIdBase = `${target.id}_lineAccountCode`
      const targetId = `${target.id}_lineAccountCode${
        ~~target.querySelectorAll('.lineAccountcode')[lineAccountcodeLength - 1].id.replaceAll(tagetIdBase, '') + 1
      }`
      // templateから追加仕訳情報欄作成
      const templeAccountCodeItem = $('#templateLineAccountCodeItem')
      const cloneAccountCodeItem = document.importNode(templeAccountCodeItem.content, true)
      cloneAccountCodeItem.querySelector('.lineAccountcode').id = targetId
      // 名前の割り当て
      // 勘定科目コードINPUT
      cloneAccountCodeItem.querySelector('.lineAccountCode_accountCode').setAttribute('name', `${targetId}_accountCode`)
      cloneAccountCodeItem.querySelector('.lineAccountCode_accountCode').id = `${targetId}_accountCode`
      // 補助科目コードINPUT
      cloneAccountCodeItem
        .querySelector('.lineAccountCode_subAccountCode')
        .setAttribute('name', `${targetId}_subAccountCode`)
      cloneAccountCodeItem.querySelector('.lineAccountCode_subAccountCode').id = `${targetId}_subAccountCode`
      // 部門データINPUT
      cloneAccountCodeItem
        .querySelector('.lineAccountCode_departmentCode')
        .setAttribute('name', `${targetId}_departmentCode`)
      cloneAccountCodeItem.querySelector('.lineAccountCode_departmentCode').id = `${targetId}_departmentCode`
      // 計上金額
      cloneAccountCodeItem.querySelector('.inputInstallmentAmount').setAttribute('name', `${targetId}_input_amount`)
      cloneAccountCodeItem.querySelector('.inputInstallmentAmount').id = `${targetId}_input_amount`
      cloneAccountCodeItem
        .querySelector('.inputInstallmentAmount')
        .classList.add(`${targetId.split('_')[0]}_input_amount`)
      // 項目の計上金額の入力ボタン
      // 各ボタンあたりIDを割り当て
      // 計上金額の入力ボタン
      cloneAccountCodeItem.querySelector('.btn-insert-installmentAmount').id = `btn_${targetId}_installmentAmount`
      cloneAccountCodeItem.querySelector('.btn-insert-installmentAmount').dataset.target =
        'insert-installmentAmount-modal'
      cloneAccountCodeItem.querySelector('.btn-insert-installmentAmount').dataset.input = `${targetId}_input_amount`
      cloneAccountCodeItem
        .querySelector('.btn-insert-installmentAmount')
        .addEventListener('click', btnInstallmentAmount)

      // 仕訳情報設定削除ボタン
      cloneAccountCodeItem.querySelector('.btn-minus-accountCode').dataset.target = targetId
      cloneAccountCodeItem.querySelector('.btn-minus-accountCode').addEventListener('click', btnMinusAccount)

      // 勘定科目と補助科目検索ボタン
      cloneAccountCodeItem.querySelector('.btn-search-main').dataset.target = 'accountCode-modal'
      cloneAccountCodeItem.querySelector('.btn-search-main').dataset.info = targetId
      cloneAccountCodeItem
        .querySelector('.btn-search-main')
        .addEventListener('click', btnSearchMain($('#accountCode-modal')))
      // 部門データ検索ボタン
      cloneAccountCodeItem.querySelector('.btn-search-departmentCode').dataset.target = 'departmentCode-modal'
      cloneAccountCodeItem.querySelector('.btn-search-departmentCode').dataset.info = targetId
      cloneAccountCodeItem
        .querySelector('.btn-search-departmentCode')
        .addEventListener('click', btnSearchDepartmentCode($('#departmentCode-modal')))

      target.appendChild(cloneAccountCodeItem)
    }
  })
})

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

// 2番目以降の部門データ検索ボタンイベント
const btnSearchDepartmentCode = function (searchModal) {
  return function () {
    $('#searchDepartmentModalErrMsg').innerText = ''
    if (this.dataset.info !== $('#departmentCode-modal').dataset.info) {
      deleteDepartmentResultDisplayModal()
    }
    if (searchModal) searchModal.classList.toggle('is-active')
    $('#departmentCode-modal').dataset.info = this.dataset.info
  }
}

// 仕訳情報検索
// 勘定科目コード、補助科目検索
$('#btnSearchAccountCode').addEventListener('click', function () {
  const accountCode = $('#searchModalAccountCode').value
  const accountCodeName = $('#searchModalAccountCodeName').value
  const subAccountCode = $('#searchModalSubAccountCode').value
  const subAccountCodeName = $('#searchModalSubAccountCodeName').value

  const $this = this
  deleteDisplayModal()
  $('#searchModalAccountCode').value = accountCode
  $('#searchModalAccountCodeName').value = accountCodeName
  $('#searchModalSubAccountCode').value = subAccountCode
  $('#searchModalSubAccountCodeName').value = subAccountCodeName

  const getAccountCode = new XMLHttpRequest()
  getAccountCode.open('POST', '/inbox/getCode')
  getAccountCode.setRequestHeader('Content-Type', 'application/json')
  getAccountCode.onreadystatechange = function () {
    if (getAccountCode.readyState === getAccountCode.DONE) {
      switch (getAccountCode.status) {
        case 200: {
          const result = JSON.parse(getAccountCode.response)
          if (result.length !== 0) {
            displayResultForCode(result)
          } else {
            displayNoAccountCode()
          }
          break
        }
        default: {
          deleteDisplayModal()
          break
        }
      }
    }
    $this.classList.remove('is-loading')
  }
  $this.classList.add('is-loading')
  getAccountCode.send(
    JSON.stringify({
      accountCode: accountCode,
      accountCodeName: accountCodeName,
      subAccountCode: subAccountCode,
      subAccountCodeName: subAccountCodeName
    })
  )
})

// 部門データモーダルの内の検索ボタン
$('#btnSearchDepartmentCode').addEventListener('click', function () {
  const inputPatternEngNumKana = '^[a-zA-Z0-9ァ-ヶー　+]*$'
  const departmentCode = $('#searchModalDepartmentCode').value
  const departmentCodeName = $('#searchModalDepartmentCodeName').value
  const inputPatternEngNumKanaRegExp = new RegExp(inputPatternEngNumKana)

  const $this = this
  // モーダル初期化
  deleteDepartmentResultDisplayModal()

  // 部門コードのバリデーションチェック
  if (!inputPatternEngNumKanaRegExp.test(departmentCode)) {
    $('#searchDepartmentModalErrMsg').innerText = '入力値が間違いました。'
    $('#searchModalDepartmentCode').value = departmentCode
    $('#searchModalDepartmentCodeName').value = departmentCodeName
    return null
  }

  // 部門コードと部門名の桁数チェック
  if (departmentCode.length > 10 && departmentCodeName.length > 40) {
    $('#searchDepartmentModalErrMsg').innerText =
      '部門コードは10桁まで入力してください。 部門名は40桁まで入力してください。'
    $('#searchModalDepartmentCode').value = departmentCode
    $('#searchModalDepartmentCodeName').value = departmentCodeName
    return null
  }
  // 部門コードの桁数チェック
  if (departmentCode.length > 10) {
    $('#searchDepartmentModalErrMsg').innerText = '部門コードは10桁まで入力してください。'
    $('#searchModalDepartmentCode').value = departmentCode
    $('#searchModalDepartmentCodeName').value = departmentCodeName
    return null
  }
  // 部門名の桁数チェック
  if (departmentCodeName.length > 40) {
    $('#searchDepartmentModalErrMsg').innerText = '部門名は40桁まで入力してください。'
    $('#searchModalDepartmentCode').value = departmentCode
    $('#searchModalDepartmentCodeName').value = departmentCodeName
    return null
  }

  // 初期化されたキーワードを入力
  $('#searchModalDepartmentCode').value = departmentCode
  $('#searchModalDepartmentCodeName').value = departmentCodeName

  // サーバーからデータ取得
  const getAccountCode = new XMLHttpRequest()
  getAccountCode.open('POST', '/inbox/department')
  getAccountCode.setRequestHeader('Content-Type', 'application/json')
  getAccountCode.onreadystatechange = function () {
    if (getAccountCode.readyState === getAccountCode.DONE) {
      switch (getAccountCode.status) {
        case 200: {
          const result = JSON.parse(getAccountCode.response)
          if (result.length !== 0) {
            displayResultForDepartmentCode(result)
          } else {
            displayNoDepartmentCode()
          }
          break
        }
        default: {
          deleteDepartmentResultDisplayModal()
          break
        }
      }
    }
    $this.classList.remove('is-loading')
  }
  $this.classList.add('is-loading')
  getAccountCode.send(
    JSON.stringify({
      departmentCode: departmentCode,
      departmentCodeName: departmentCodeName
    })
  )
})

// 勘定科目コード、補助科目検索結果を画面に表示
const displayResultForCode = function (codeArr) {
  const displayFieldResultBody = $('#displayFieldResultBody')
  const searchResultCode = $('#searchResultCode')
  codeArr.forEach((item) => {
    const cloneSearchResultCodeTemplate = document.importNode(searchResultCode.content, true)
    cloneSearchResultCodeTemplate.querySelector('.rowAccountCode').dataset.target = '#accountCode-modal'
    cloneSearchResultCodeTemplate.querySelector('.rowAccountCode').dataset.accountCode = item.accountCode
    cloneSearchResultCodeTemplate.querySelector('.rowAccountCode').dataset.subAccountCode = item.subAccountCode
    cloneSearchResultCodeTemplate.querySelector('.columnNoAccountCodeMessage').classList.add('is-invisible')
    cloneSearchResultCodeTemplate.querySelector('.columnAccountCode').innerText = item.accountCode
    cloneSearchResultCodeTemplate.querySelector('.columnAccountCodeName').innerText = item.accountCodeName
    cloneSearchResultCodeTemplate.querySelector('.columnSubAccountCode').innerText = item.subAccountCode
    cloneSearchResultCodeTemplate.querySelector('.columnSubAccountCodeName').innerText = item.subAccountCodeName

    displayFieldResultBody.appendChild(cloneSearchResultCodeTemplate)
  })
  $('.rowAccountCode').forEach((row) => {
    row.addEventListener('click', function () {
      $(this.dataset.target).classList.remove('is-active')
      const inputTarget = $(this.dataset.target).dataset.info
      $(`#${inputTarget}_accountCode`).value = this.dataset.accountCode
      $(`#${inputTarget}_subAccountCode`).value = this.dataset.subAccountCode
      deleteDisplayModal()
    })
    row.addEventListener('mouseover', function () {
      this.classList.add('is-selected')
    })
    row.addEventListener('mouseout', function () {
      this.classList.remove('is-selected')
    })
  })
  $('#displayInvisible').classList.remove('is-invisible')
}

// 部門データ検索結果を画面に表示
const displayResultForDepartmentCode = function (codeArr) {
  const displayFieldDepartmentResultBody = $('#displayFieldDepartmentResultBody')
  const searchResultDepartmentCode = $('#searchResultDepartmentCode')
  codeArr.forEach((item) => {
    const cloneSearchResultDepartmentCodeTemplate = document.importNode(searchResultDepartmentCode.content, true)
    cloneSearchResultDepartmentCodeTemplate.querySelector('.rowDepartmentCode').dataset.target = '#departmentCode-modal'
    cloneSearchResultDepartmentCodeTemplate.querySelector('.rowDepartmentCode').dataset.departmentCode = item.code
    cloneSearchResultDepartmentCodeTemplate
      .querySelector('.columnNoDepartmentCodeMessage')
      .classList.add('is-invisible')
    cloneSearchResultDepartmentCodeTemplate.querySelector('.columnDepartmentCode').innerText = item.code
    cloneSearchResultDepartmentCodeTemplate.querySelector('.columnDepartmentCodeName').innerText = item.name
    displayFieldDepartmentResultBody.appendChild(cloneSearchResultDepartmentCodeTemplate)
  })
  $('.rowDepartmentCode').forEach((row) => {
    row.addEventListener('click', function () {
      $(this.dataset.target).classList.remove('is-active')
      const inputTarget = $(this.dataset.target).dataset.info
      $(`#${inputTarget}_departmentCode`).value = this.dataset.departmentCode
      $('#btn-confirm').removeAttribute('disabled')
      deleteDepartmentResultDisplayModal()
    })
    row.addEventListener('mouseover', function () {
      this.classList.add('is-selected')
    })
    row.addEventListener('mouseout', function () {
      this.classList.remove('is-selected')
    })
  })
  $('#departmentResultDisplayInvisible').classList.remove('is-invisible')
}

// 勘定科目コード検索結果がない場合
const displayNoAccountCode = function () {
  const displayFieldBody = $('#displayFieldResultBody')
  const searchResultCode = $('#searchResultCode')
  const cloneSearchResultCodeTemplate = document.importNode(searchResultCode.content, true)
  cloneSearchResultCodeTemplate.querySelector('.columnNoAccountCodeMessage').classList.remove('is-invisible')
  cloneSearchResultCodeTemplate.querySelector('.columnNoAccountCodeMessage').setAttribute('colspan', '4')
  cloneSearchResultCodeTemplate.querySelector('.noAccountCodeMessage').innerText =
    '該当する勘定科目が存在しませんでした。'
  displayFieldBody.appendChild(cloneSearchResultCodeTemplate)
  $('#displayInvisible').classList.remove('is-invisible')
}

// 部門データ検索結果がない場合
const displayNoDepartmentCode = function () {
  const displayFieldDepartmentResultBody = $('#displayFieldDepartmentResultBody')
  const searchResultDepartmentCode = $('#searchResultDepartmentCode')
  const cloneSearchResultDepartmentCodeTemplate = document.importNode(searchResultDepartmentCode.content, true)
  cloneSearchResultDepartmentCodeTemplate
    .querySelector('.columnNoDepartmentCodeMessage')
    .classList.remove('is-invisible')
  cloneSearchResultDepartmentCodeTemplate.querySelector('.columnNoDepartmentCodeMessage').setAttribute('colspan', '2')
  cloneSearchResultDepartmentCodeTemplate.querySelector('.noDepartmentCodeMessage').innerText =
    '該当する部門データが存在しませんでした。'
  displayFieldDepartmentResultBody.appendChild(cloneSearchResultDepartmentCodeTemplate)
  $('#departmentResultDisplayInvisible').classList.remove('is-invisible')
}

// 勘定科目コード、補助科目再検索の時、前の結果を消す
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

  $('#searchModalAccountCode').value = ''
  $('#searchModalAccountCodeName').value = ''
  $('#searchModalSubAccountCode').value = ''
  $('#searchModalSubAccountCodeName').value = ''

  $('#displayInvisible').classList.add('is-invisible')
}

// 部門データ再検索の時、前の結果を消す
const deleteDepartmentResultDisplayModal = function () {
  const displayFieldResultBody = $('#displayFieldDepartmentResultBody')
  if (displayFieldResultBody.children.length !== 0) {
    const chidrenItem = []
    Array.prototype.forEach.call(displayFieldResultBody.children, (item) => {
      chidrenItem.push(item)
    })
    chidrenItem.forEach((item) => {
      displayFieldResultBody.removeChild(item)
    })
  }

  $('#searchModalDepartmentCode').value = ''
  $('#searchModalDepartmentCodeName').value = ''

  $('#departmentResultDisplayInvisible').classList.add('is-invisible')
}

// 仕訳情報のアイテムのマイナスボタン機能追加
const btnMinusAccount = function () {
  const deleteTarget = this.dataset.target
  if ($(`#${deleteTarget}_input_amount`) !== undefined && $(`#${deleteTarget}_input_amount`) !== null) {
    const thisLineInput = $(`#${deleteTarget}_input_amount`)
    const lineNoFirstInput = $(`#${deleteTarget.split('_')[0]}_lineAccountCode1_input_amount`)
    lineNoFirstInput.value = (
      ~~lineNoFirstInput.value.replaceAll(',', '') + ~~thisLineInput.value.replaceAll(',', '')
    ).toLocaleString('ja-JP')
  }
  $(`#${deleteTarget}`).remove()
}

// 計上金額入力ボタン（モーダルの表示）
function btnInstallmentAmount() {
  const showModalTarget = $(`#${this.dataset.target}`)
  const inputTarget = this.dataset.input
  $('#inputInstallmentAmount').value = ~~$(`#${inputTarget}`).value.replaceAll(',', '')
  showModalTarget.classList.toggle('is-active')
  showModalTarget.querySelector('#btn-insert').dataset.target = inputTarget
  showModalTarget.querySelector('#installmentAmountErrMsg').innerText = '　'
  $('#btn-confirm').removeAttribute('disabled')
}

// 計上金額の入力欄の数字以外は入力できない
$('#inputInstallmentAmount').addEventListener('keyup', function () {
  const pattern = '^[0-9]+$'
  const regExp = new RegExp(pattern)
  if (!regExp.test(this.value)) {
    this.value = this.value.substr(0, this.value.length - 1)
  }
})
$('#inputInstallmentAmount').addEventListener('blur', function () {
  const pattern = '^[0-9]+$'
  const regExp = new RegExp(pattern)
  const length = this.value.length
  for (let idx = 0; idx < length; idx++) {
    if (!regExp.test(this.value)) {
      this.value = this.value.substr(0, this.value.length - 1)
    }
  }
})
$('#inputInstallmentAmount').addEventListener('focus', function () {
  if (~~this.value === 0) {
    this.value = ''
  }
})

// モーダルの内の入力ボタン機能
$('#btn-insert').addEventListener('click', function () {
  const inputTarget = this.dataset.target
  const valueInput = $('#inputInstallmentAmount')
  const totalAmmout = ~~$(`#${inputTarget.split('_')[0]}Total`).value.replaceAll(',', '')
  if (~~valueInput.value !== 0) {
    if (totalAmmout - valueInput.value < 0) {
      $('#installmentAmountErrMsg').innerText = '計上金額の合計が小計金額を超えています。'
      return null
    } else if (totalAmmout - valueInput.value === 0) {
      $('#installmentAmountErrMsg').innerText = '計上金額の合計が小計金額を超えています。'
      return null
    }

    $(`#${inputTarget}`).value = (~~valueInput.value).toLocaleString('ja-JP')
    let checkTotalAmount = totalAmmout
    Array.prototype.forEach.call($(`.${inputTarget.split('_')[0]}_input_amount`), (item, idx) => {
      if (idx !== 0) {
        checkTotalAmount -= ~~item.value.replaceAll(',', '')
      }
    })
    $(`.${inputTarget.split('_')[0]}_input_amount`)[0].value = checkTotalAmount.toLocaleString('ja-JP')
    $('#insert-installmentAmount-modal').classList.toggle('is-active')
  } else {
    $('#installmentAmountErrMsg').innerText = '金額は1円以上を入力してください。'
  }
})

// メッセージ文字数確認
$('#inputMsg').addEventListener('keyup', function () {
  $('#msgCount').innerText = '(' + $('#inputMsg').value.length + '/1500)'

  if ($('#inputMsg').value.length > 1500) {
    $('#inputMsg').value($('#inputMsg').value.substring(0, 1500))
    $('#msgCount').innerText = '1500/1500'
  }
})

$('#checkApproval').addEventListener('click', function () {
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
  $('#check-request-approval-message > textarea').value = $('#inputMsg').value

  // 承認ルート各民モーダルに表示
  const checkApproveRoute = $('#check-request-approve-route')
  while (checkApproveRoute.firstChild) {
    checkApproveRoute.removeChild(checkApproveRoute.firstChild)
  }
  const displayRequestApprovaRoute = $('#displayRequestApprovaRoute')
  const cloneDiplay = document.importNode(displayRequestApprovaRoute, true)
  $('#check-request-approve-route').appendChild(cloneDiplay)

  $('#check-approval-modal').classList.toggle('is-active')
})
