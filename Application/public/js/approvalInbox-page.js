const approveProgressModal = document.getElementById('approve-progress-modal')
const rejectProgressModal = document.getElementById('reject-progress-modal')
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

// ローディング画面の初期化
window.onload = function () {
  // 計上金額のボタンの機能設定
  Array.prototype.forEach.call($('.btn-insert-installmentAmount'), function (btn) {
    btn.addEventListener('click', btnInstallmentAmount)
  })

  // 勘定科目・補助科目の検索ボタン機能設定
  Array.prototype.forEach.call($('.BtnlineAccountCodeSearch'), function (btn) {
    btn.addEventListener('click', btnSearchMain())
  })

  // 部門データの検索ボタン機能設定
  Array.prototype.forEach.call($('.BtnlineDepartmentCodeSearch'), function (btn) {
    btn.addEventListener('click', btnSearchDepartmentCode())
  })

  Array.prototype.forEach.call($('.btn-minus-accountCode'), function (btnMinus) {
    btnMinus.addEventListener('click', btnMinusAccount)
  })
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
    } else {
      $(`#error-message-${target.id}`).innerText = '仕訳情報入力の上限は１０項目までです。'
      $(`#error-message-${target.id}`).classList.remove('invisible')
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

$('#checkApproval').addEventListener('click', function () {
  const rejectModalLine = $('#reject-approval-modal').querySelector('#journal-list-reject-modal')
  while (rejectModalLine.firstChild) {
    rejectModalLine.removeChild(rejectModalLine.firstChild)
  }

  while ($('#journal-list').firstChild) {
    $('#journal-list').removeChild($('#journal-list').firstChild)
  }

  const dupleResult = duplicationCheck()
  if (dupleResult.length > 0) {
    document.getElementById(dupleResult[0].id).focus({ preventScroll: false })
    return
  }

  if (!checkJournalList()) return

  const invoiceList = $('.invoiceLine')
  if (!$('#journal-list').firstChild) {
    Array.prototype.forEach.call(invoiceList, (invoiceLine) => {
      const cloneInvoice = document.importNode(invoiceLine.parentNode, true)
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

// 重複された仕訳情報処理(仕訳情報設定画面)
const duplicationCheck = function () {
  const duplArray = []
  // 画面に表示された項目別の仕訳情報を取得
  const allInfomationline = document.querySelectorAll('.invoiceLine')

  const koumokuInformationArray = []
  for (let i = 0; i < allInfomationline.length; ++i) {
    const children = document.getElementById(`lineNo${i + 1}`).children
    const lineInformationArray = []

    // 勘定科目と補助科目を取得
    Array.prototype.forEach.call(children, (item) => {
      const accountCode = item.children[0].children[1].children[0].children[0].children[0].children[0].value // 勘定科目コード
      const subAccountCode = item.children[0].children[1].children[1].children[0].children[0].children[0].value // 補助科目コード
      const department = item.querySelectorAll('input[type=text]')[2].value // 部門コード
      lineInformationArray.push([accountCode, subAccountCode, department])
    })
    koumokuInformationArray.push(duplicateCheckFunction(lineInformationArray))
  }

  // 重複がある明細項目づつエラーメッセージを設定する。
  koumokuInformationArray.map((item, idx) => {
    const errMsg = document.getElementById(`error-message-lineNo${idx + 1}`)
    if (item === true) {
      errMsg.innerText = '同じ仕訳情報は設定できません。'
      errMsg.classList.remove('invisible')
      errMsg.focus({ preventScroll: false })
      duplArray.push(errMsg)
    } else {
      errMsg.classList.add('invisible')
    }
    return 0
  })

  return duplArray
}

// 重複検索関数
const duplicateCheckFunction = function (array) {
  const length = array.length
  let duplicationFlag = false
  let i, j, temp
  for (i = 0; i < length - 1; i++) {
    for (j = 0; j < length - 1 - i; j++) {
      if (JSON.stringify(array[j]) === JSON.stringify(array[j + 1])) {
        duplicationFlag = true
        return duplicationFlag
      } else {
        temp = array[j]
        array[j] = array[j + 1]
        array[j + 1] = temp
      }
    }
  }
  return duplicationFlag
}

// 仕訳情報のバリデーションチェックする。
const checkJournalList = function () {
  const journalLines = getInvoiceLineList().map((invoiceLine) => {
    const line = new Array(10)
    invoiceLine.account.forEach((account, idx) => {
      if (account.node) {
        line[idx] = {
          accountCode: account.accountCode,
          subAccountCode: account.subAccountCode,
          input_amount: account.amount,
          journalNo: `lineAccountCode${idx + 1}`
        }
      }
    })
    return line
  })
  let isFirstLineNull = false
  // 勘定科目が設定した仕訳情報の計上が0円になっている場合、エラーを表示
  journalLines.forEach((lines, lineNo) => {
    lines.forEach((journal, journalNo) => {
      if (journalNo !== 0 && journal !== null) {
        if (journalLines[lineNo][0].accountCode.length === 0 || journalLines[lineNo][0].input_amount === 0) {
          if (lines.length !== 1) {
            isFirstLineNull = true
            $('#error-message-body').innerText = '計上金額は1円以上を入力して下さい。'
          }
        }
      }
    })
  })

  for (let i = 0; i < journalLines.length; i++) {
    let total = 0
    for (let j = 0; j < journalLines[i].length; j++) {
      // チェックする仕訳情報を絞り込む。
      const checkJournalLines = journalLines[i].filter(function (item) {
        return item !== null && item !== undefined
      })

      // 仕訳情報が設定されていない小計チェック用
      if (checkJournalLines.length === 1) {
        total = ~~journalLines[i][j].input_amount.replaceAll(',', '')
        break
      }
      // 設定した仕訳情報の計上金額をチェック用
      if (journalLines[i][j] !== undefined) {
        if (journalLines[i][j].accountCode.length !== 0) {
          total = total + ~~journalLines[i][j].input_amount.replaceAll(',', '')
          if (~~journalLines[i][j].input_amount.replaceAll(',', '') === 0) {
            isFirstLineNull = true
            $('#error-message-body').innerText = '計上金額は1円以上を入力して下さい。'
          }
        } else {
          isFirstLineNull = true
          $('#error-message-body').innerText = '仕訳情報を正しく設定してください。'
        }
      }
    }
    // 金額が誤りがある場合
    if (total !== ~~$(`#lineNo${i + 1}Total`).value.replaceAll(',', '')) {
      isFirstLineNull = true
      $('#error-message-body').innerText = '仕訳情報を正しく設定してください。'
    }
  }

  if (isFirstLineNull) {
    $('#error-message-modal').classList.add('is-active')
    return false
  }
  return true
}

// 明細リスト取得
const getInvoiceLineList = function () {
  return Array.prototype.map.call($('.invoiceLine'), (invoiceLine) => {
    const invoiceLineNo = invoiceLine.querySelector('input[name=lineNo]')
      ? invoiceLine.querySelector('input[name=lineNo]').value
      : ''
    const invoiceLineId = invoiceLine.querySelector('input[name=lineId]')
      ? invoiceLine.querySelector('input[name=lineId]').value
      : ''
    const itemName = invoiceLine.querySelector('.itemName') ? invoiceLine.querySelectorAll('.itemName') : ''
    const invoicedQuantity = invoiceLine.querySelector('.invoicedQuantity')
      ? invoiceLine.querySelector('.invoicedQuantity').innerText
      : ''
    const unitcode = invoiceLine.querySelector('.unitcode') ? invoiceLine.querySelector('.unitcode').innerText : ''
    const priceAmount = invoiceLine.querySelector('.priceAmount')
      ? invoiceLine.querySelector('.priceAmount').innerText
      : ''
    const tax = invoiceLine.querySelector('.tax') ? invoiceLine.querySelector('.tax').innerText : ''
    const total = invoiceLine.querySelector('.lineTotal') ? invoiceLine.querySelector('.lineTotal').value : ''
    const account = new Array(10)
    for (let idx = 0; idx < 10; idx++) {
      const node = invoiceLine.parentNode.querySelectorAll('.lineAccountcode')[idx]
      if (node) {
        account[idx] = {
          node: node,
          accountCode: node.querySelectorAll('input[type=text]')[0].value,
          subAccountCode: node.querySelectorAll('input[type=text]')[1].value,
          departmentCode: node.querySelectorAll('input[type=text]')[2].value,
          amount: node.querySelectorAll('input[type=text]')[3].value
        }
      } else {
        account[idx] = {
          node: null,
          accountCode: null,
          subAccountCode: null,
          departmentCode: null,
          amount: null
        }
      }
    }

    return {
      invoiceLineNo: invoiceLineNo,
      invoiceLineId: invoiceLineId,
      itemName: itemName,
      invoicedQuantity: invoicedQuantity,
      unitcode: unitcode,
      priceAmount: priceAmount,
      tax: tax,
      total: total,
      account: account
    }
  })
}

$('#btn-approve').addEventListener('click', function (e) {
  e.preventDefault()
  approveProgressModal.classList.add('is-active')
  $('#approval').submit()
})

// 差し戻しモーダルの表示
$('#rejectApproval').addEventListener('click', function () {
  // 明細初期化
  const rejectModalLine = $('#reject-approval-modal').querySelector('#journal-list-reject-modal')
  while (rejectModalLine.firstChild) {
    rejectModalLine.removeChild(rejectModalLine.firstChild)
  }

  // 明細取得
  const invoiceList = $('.invoiceLine')
  if (!rejectModalLine.firstChild) {
    Array.prototype.forEach.call(invoiceList, (invoiceLine) => {
      const cloneInvoice = document.importNode(invoiceLine.parentNode, true)
      rejectModalLine.appendChild(cloneInvoice)
    })
  }

  // 担当者のメッセージを表示
  $('#reject-request-approval-message > textarea').value = $('#inputMsg').value

  // 承認ルート各民モーダルに表示
  const checkApproveRoute = $('#reject-request-approve-route')
  while (checkApproveRoute.firstChild) {
    checkApproveRoute.removeChild(checkApproveRoute.firstChild)
  }
  const displayRequestApprovaRoute = $('#displayRequestApprovaRoute')
  const cloneDiplay = document.importNode(displayRequestApprovaRoute, true)
  checkApproveRoute.appendChild(cloneDiplay)

  $('#reject-approval-modal').classList.toggle('is-active')
})

$('#btn-reject').addEventListener('click', function (e) {
  e.preventDefault()
  rejectProgressModal.classList.add('is-active')
  $('#reject').submit()
})
