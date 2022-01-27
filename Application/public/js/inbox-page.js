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
  // 分割金額のボタンの機能設定
  Array.prototype.forEach.call($('.btn-insert-installmentAmount'), function (btn) {
    btn.addEventListener('click', btnInstallmentAmount)
  })

  // 勘定科目・補助科目の検索ボタン機能設定
  Array.prototype.forEach.call($('.BtnlineAccountCodeSearch'), function (btn) {
    btn.addEventListener('click', btnSearchMain())
  })

  Array.prototype.forEach.call($('.btn-minus-accountCode'), function (btnMinus) {
    btnMinus.addEventListener('click', btnMinusAccount)
  })
}

// 仕訳情報一括入力ボタンの機能
$('#btn-bulkInsert').addEventListener('click', function () {
  const invoiceLines = getInvoiceLineList()
  if ($('.column-invoiceLine-journalModal').length < invoiceLines.length) {
    for (let idx = 0; idx < invoiceLines.length; idx++) {
      const templateInvoiceLine = $('#template-invoiceLine')
      const cloneInvoiceLineTemplate = document.importNode(templateInvoiceLine.content, true)
      cloneInvoiceLineTemplate.querySelector('.itemId').innerText = invoiceLines[idx].invoiceLineId
      Array.prototype.forEach.call(invoiceLines[idx].itemName, (itemName) => {
        cloneInvoiceLineTemplate.querySelector('.itemName').appendChild(itemName)
      })
      cloneInvoiceLineTemplate.querySelector('.invoicedQuantity').innerText = invoiceLines[idx].invoicedQuantity
      cloneInvoiceLineTemplate.querySelector('.unitcode').innerText = invoiceLines[idx].unitcode
      cloneInvoiceLineTemplate.querySelector('.priceAmount').innerText = invoiceLines[idx].priceAmount
      cloneInvoiceLineTemplate.querySelector('.tax').innerText = invoiceLines[idx].tax
      cloneInvoiceLineTemplate.querySelector('.total').innerText = invoiceLines[idx].total

      // 各明細の仕訳情報取得・表示
      const lineAccountcodeList = getLineAccountcodeList(invoiceLines[idx].invoiceLineNo)
      for (let j = 0; j < lineAccountcodeList.length; j++) {
        const templateLineAccountCodeItemModal = $('#templateLineAccountCodeItemModal')
        const cloneLineAccountCodeItemModalTemplate = document.importNode(
          templateLineAccountCodeItemModal.content,
          true
        )

        // 1行目じゃない場合、タイトル削除
        if (j > 0) cloneLineAccountCodeItemModalTemplate.getElementById('lineAccountCodeTitle').remove()

        cloneLineAccountCodeItemModalTemplate.querySelector('.lineAccountCode_accountCode').value =
          lineAccountcodeList[j].accountCode
        cloneLineAccountCodeItemModalTemplate.querySelector('.lineAccountCode_subAccountCode').value =
          lineAccountcodeList[j].subAccountCode

        cloneInvoiceLineTemplate.querySelector('.box').append(cloneLineAccountCodeItemModalTemplate)
      }

      $('#field-invoiceLine').appendChild(cloneInvoiceLineTemplate)
    }
  }
})

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
    const total = invoiceLine.querySelector('.lineTotal')
      ? ~~invoiceLine.querySelector('.lineTotal').value.replaceAll(',', '')
      : ''

    return {
      invoiceLineNo: invoiceLineNo,
      invoiceLineId: invoiceLineId,
      itemName: itemName,
      invoicedQuantity: invoicedQuantity,
      unitcode: unitcode,
      priceAmount: priceAmount,
      tax: tax,
      total: total
    }
  })
}

// 仕訳情報一括入力モーダルのプラスボタン
$('#btn-plus-accountCode-bulkInsert-modal').addEventListener('click', function () {
  const target = $(this.dataset.target)
  const targetName = this.dataset.target.replaceAll('#', '')
  const template = $('#template-journal-accountCode')
  const lineAccountcodeLength = target.querySelectorAll('.lineAccountcode').length
  if (lineAccountcodeLength < 10) {
    const cloneAccountcode = document.importNode(template.content, true)
    const idx = lineAccountcodeLength + 1
    cloneAccountcode.querySelector('.lineAccountcode').dataset.idx = idx
    cloneAccountcode.querySelector('.lineAccountcode').id = `${targetName}_lineAccountCode${idx}`
    cloneAccountcode.querySelector('.btn-minus-accountCode').id = `btn_minus_bulkInsertNo1_lineAccountCode${idx}`
    cloneAccountcode.querySelector('.btn-minus-accountCode').dataset.target = `bulkInsertNo1_lineAccountCode${idx}`
    cloneAccountcode.querySelector('.btn-minus-accountCode').dataset.target = `${targetName}_lineAccountCode${idx}`
    cloneAccountcode.querySelector('.btn-minus-accountCode').addEventListener('click', btnMinusAccount)
    target.appendChild(cloneAccountcode)
  } else {
    $('#error-message-journal-modal').innerText = '仕訳情報入力の上限は10個までです。'
  }
})

// 仕訳情報取得
const getLineAccountcodeList = function (invoiceLineNo) {
  const target = $(`#invoiceLine${invoiceLineNo}`).parentNode.querySelectorAll('.lineAccountcode')
  const lineAccountCodeList = []
  for (let i = 0; i < target.length; i++) {
    const accountCode = $(`#lineNo${invoiceLineNo}_lineAccountCode${i + 1}_accountCode`).value
    const subAccountCode = $(`#lineNo${invoiceLineNo}_lineAccountCode${i + 1}_subAccountCode`).value

    if (accountCode !== '') {
      lineAccountCodeList.push({
        accountCode: accountCode,
        subAccountCode: subAccountCode
      })
    }
  }

  return lineAccountCodeList
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
      // 分割金額
      cloneAccountCodeItem.querySelector('.inputInstallmentAmount').setAttribute('name', `${targetId}_input_amount`)
      cloneAccountCodeItem.querySelector('.inputInstallmentAmount').id = `${targetId}_input_amount`
      cloneAccountCodeItem
        .querySelector('.inputInstallmentAmount')
        .classList.add(`${targetId.split('_')[0]}_input_amount`)
      // 項目の分割金額の入力ボタン
      // 各ボタンあたりIDを割り当て
      // 分割金額の入力ボタン
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

$('#CloseSearchAccountCode').addEventListener('click', function () {})

// 仕訳情報検索
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

// 検索結果を画面に表示
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
      $('#btn-confirm').removeAttribute('disabled')
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

// 検索結果がない場合
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

// 再検索の時、前の結果を消す
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

// 仕訳情報のアイテムのマイナスボタン機能追加
const btnMinusAccount = function () {
  const deleteTarget = this.dataset.target
  if (
    document.getElementById(`#${deleteTarget}_input_amount`) !== undefined &&
    document.getElementById(`#${deleteTarget}_input_amount`) !== null
  ) {
    const thisLineInput = $(`#${deleteTarget}_input_amount`)
    const lineNoFirstInput = $(`#${deleteTarget.split('_')[0]}_lineAccountCode1_input_amount`)
    lineNoFirstInput.value = (
      ~~lineNoFirstInput.value.replaceAll(',', '') + ~~thisLineInput.value.replaceAll(',', '')
    ).toLocaleString('ja-JP')
  }
  $(`#${deleteTarget}`).remove()
  if ($(`#${deleteTarget.split('_')[0]}`).querySelectorAll('.lineAccountcode').length === 0) {
    $(`#btn-minus-${deleteTarget.split('_')[0]}-accountCode`).classList.remove('is-invisible')
  }
  $('#btn-confirm').removeAttribute('disabled')
}

// 分割金額入力ボタン（モーダルの表示）
function btnInstallmentAmount() {
  const showModalTarget = $(`#${this.dataset.target}`)
  const inputTarget = this.dataset.input
  $('#inputInstallmentAmount').value = ~~$(`#${inputTarget}`).value.replaceAll(',', '')
  showModalTarget.classList.toggle('is-active')
  showModalTarget.querySelector('#btn-insert').dataset.target = inputTarget
  showModalTarget.querySelector('#installmentAmountErrMsg').innerText = '　'
  $('#btn-confirm').removeAttribute('disabled')
}

// 分割金額の入力欄の数字以外は入力できない
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

// モーダルの内の入力ボタン機能
$('#btn-insert').addEventListener('click', function () {
  const inputTarget = this.dataset.target
  const valueInput = $('#inputInstallmentAmount')
  const totalAmmout = ~~$(`#${inputTarget.split('_')[0]}Total`).value.replaceAll(',', '')
  if (~~valueInput.value !== 0) {
    if (totalAmmout - valueInput.value < 0) {
      $('#installmentAmountErrMsg').innerText = '小計金額より高い金額は入力できません。'
      return null
    } else if (totalAmmout - valueInput.value === 0) {
      $('#installmentAmountErrMsg').innerText = '小計金額と同じ金額は入力できません。'
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

$('#btn-confirm').addEventListener('click', function () {
  if (this.getAttribute('disabled') === 'true') return
  const dupleResult = duplicationCheck()
  if (dupleResult.length > 0) {
    document.getElementById(dupleResult[0].id).focus({ preventScroll: false })
    return
  }
  if (checkJournalList()) $('#form').submit()
})

const getJournalList = function () {
  const journalLines = []
  Array.prototype.forEach.call($('.lineAccountCode'), (line) => {
    if (line.id.match(/^lineNo[0-9]{1,3}$/)) {
      journalLines.push(new Array(10))
    }
  })

  Array.prototype.forEach.call($('.lineAccountCode'), (line, idx) => {
    let journalIdx = 0
    do {
      const journalLine = line.querySelectorAll('.lineAccountcode')
      journalLine.forEach((journal, jdx) => {
        const journalNo = journal.id.split('_')[1]
        if (journalNo === 'lineAccountCode1') {
          journalLines[idx][0] = {
            accountCode: journal.querySelectorAll('input[type=text]')[0].value,
            subAccountCode: journal.querySelectorAll('input[type=text]')[1].value,
            journalNo: journalNo,
            input_amount: ~~journal.querySelectorAll('input[type=text]')[2].value.replaceAll(',', '')
          }
        } else {
          journalLines[idx][jdx] = {
            accountCode: journal.querySelectorAll('input[type=text]')[0].value,
            subAccountCode: journal.querySelectorAll('input[type=text]')[1].value,
            journalNo: journalNo,
            input_amount: ~~journal.querySelectorAll('input[type=text]')[2].value.replaceAll(',', '')
          }
        }
      })
      journalIdx++
    } while (journalIdx < 10)
  })
  return journalLines
}
const checkJournalList = function () {
  const journalLines = getJournalList()

  let isFirstLineNull = false
  journalLines.forEach((lines, lineNo) => {
    lines.forEach((journal, journalNo) => {
      if (journalNo !== 0 && journal !== null) {
        if (journalLines[lineNo][0].accountCode.length === 0 || journalLines[lineNo][0].input_amount === 0) {
          if (lines.length !== 1) {
            isFirstLineNull = true
            $('#error-message-body').innerText = '分割金額は1円以上を入力して下さい。'
          }
        }
      }
    })
  })
  for (let i = 0; i < journalLines.length; i++) {
    let total = 0
    for (let j = 0; j < journalLines[i].length; j++) {
      const checkJournalLines = journalLines[i].filter(function (item) {
        return item !== null && item !== undefined
      })
      if (checkJournalLines.length === 1) {
        total = ~~journalLines[i][j].input_amount
        break
      }
      if (journalLines[i][j] !== undefined) {
        if (journalLines[i][j].accountCode.length !== 0) {
          total = total + ~~journalLines[i][j].input_amount
          if (~~journalLines[i][j].input_amount === 0) {
            isFirstLineNull = true
            $('#error-message-body').innerText = '分割金額は1円以上を入力して下さい。'
          }
        }
      }
    }
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

// 重複された仕訳情報処理
const duplicationCheck = function () {
  const duplArray = []
  // 画面に表示された項目別の仕訳情報を取得
  const allInfomationline = document.querySelectorAll('.invoiceLine')

  const koumokuInformationArray = []
  for (let i = 0; i < allInfomationline.length; ++i) {
    const lineCount = document.getElementById(`lineNo${i + 1}`).children.length
    const lineInformationArray = []

    for (let z = 0; z < lineCount; ++z) {
      const accountCode = document.getElementById(`lineNo${i + 1}_lineAccountCode${z + 1}_accountCode`).value
      const subAccountCode = document.getElementById(`lineNo${i + 1}_lineAccountCode${z + 1}_subAccountCode`).value
      lineInformationArray.push([accountCode, subAccountCode])
    }
    koumokuInformationArray.push(duplicateCheckFunction(lineInformationArray))
  }

  koumokuInformationArray.map((item, idx) => {
    const errMsg = document.getElementById(`duplicationErrMsg${idx + 1}`)
    if (item === true) {
      errMsg.innerText = '同じ仕訳情報は設定できません。'
      errMsg.classList.remove('invisible')
      errMsg.focus({ preventScroll: false })
      duplArray.push(errMsg)
    } else {
      errMsg.classList.add('invisible')
    }
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