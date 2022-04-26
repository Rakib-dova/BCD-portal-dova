import { $ } from '../module/getElements.js'

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

  // 勘定科目・補助科目の検索ボタン機能設定(貸方)
  Array.prototype.forEach.call($('.BtnlineCreditAccountCodeSearch'), function (btn) {
    btn.addEventListener('click', btnSearchMainCredit())
  })

  // 部門データの検索ボタン機能設定
  Array.prototype.forEach.call($('.BtnlineDepartmentCodeSearch'), function (btn) {
    btn.addEventListener('click', btnSearchDepartmentCode())
  })

  // 部門データの検索ボタン機能設定(貸方)
  Array.prototype.forEach.call($('.BtnlineCreditDepartmentCodeSearch'), function (btn) {
    btn.addEventListener('click', btnSearchCreditDepartmentCode())
  })

  Array.prototype.forEach.call($('.btn-minus-accountCode'), function (btnMinus) {
    btnMinus.addEventListener('click', btnMinusAccount)
  })
}

// 仕訳情報一括入力ボタンの機能
$('#btn-bulkInsert').addEventListener('click', function () {
  // 仕訳情報一括入力モーダル初期化
  const invoiceLines = getInvoiceLineList()
  while ($('#field-invoiceLine').firstChild) {
    $('#field-invoiceLine').removeChild($('#field-invoiceLine').firstChild)
  }

  // 勘定科目検索初期化
  const lineAccountCodeForBulkCount = $('.lineAccountCodeForBulk').length
  if (lineAccountCodeForBulkCount !== 1) {
    for (let i = 0; i < lineAccountCodeForBulkCount - 1; i++) {
      $('.lineAccountCodeForBulk')[1].remove()
    }
  }
  $('#bulkInsertNo1_lineAccountCode1_accountCode').value = ''
  $('#bulkInsertNo1_lineAccountCode1_subAccountCode').value = ''
  $('#bulkInsertNo1_lineAccountCode1_departmentCode').value = ''
  $('#bulkInsertNo1_lineCreditAccountCode1_creditAccountCode').value = ''
  $('#bulkInsertNo1_lineCreditAccountCode1_creditSubAccountCode').value = ''
  $('#bulkInsertNo1_lineCreditAccountCode1_creditDepartmentCode').value = ''

  // エラーメッセージ初期化
  $('#error-message-journal-modal').innerText = ''

  if ($('.column-invoiceLine-journalModal').length < invoiceLines.length) {
    for (let idx = 0; idx < invoiceLines.length; idx++) {
      const templateInvoiceLine = $('#template-invoiceLine')
      const cloneInvoiceLineTemplate = document.importNode(templateInvoiceLine.content, true)
      cloneInvoiceLineTemplate.querySelector('.itemId').innerText = invoiceLines[idx].invoiceLineId
      Array.prototype.forEach.call(invoiceLines[idx].itemName, (itemName) => {
        cloneInvoiceLineTemplate.querySelector('.itemName').appendChild(itemName.cloneNode(true))
      })
      cloneInvoiceLineTemplate.querySelector('.invoicedQuantity').innerText = invoiceLines[idx].invoicedQuantity
      cloneInvoiceLineTemplate.querySelector('.unitcode').innerText = invoiceLines[idx].unitcode
      cloneInvoiceLineTemplate.querySelector('.priceAmount').innerText = invoiceLines[idx].priceAmount
      cloneInvoiceLineTemplate.querySelector('.tax').innerText = invoiceLines[idx].tax
      cloneInvoiceLineTemplate.querySelector('.total').innerText = invoiceLines[idx].total

      // 各明細の仕訳情報取得・表示
      const lineAccountcodeList = getLineAccountcodeList(invoiceLines[idx].invoiceLineNo)
      for (const lineAccount of lineAccountcodeList) {
        const templateLineAccountCodeItemModal = $('#templateLineAccountCodeItemModal')
        const cloneLineAccountCodeItemModalTemplate = document.importNode(
          templateLineAccountCodeItemModal.content,
          true
        )
        cloneLineAccountCodeItemModalTemplate.querySelectorAll('input[type=text]')[0].value = lineAccount.accountCode
        cloneLineAccountCodeItemModalTemplate.querySelectorAll('input[type=text]')[1].value = lineAccount.subAccountCode
        cloneLineAccountCodeItemModalTemplate.querySelectorAll('input[type=text]')[2].value = lineAccount.departmentCode
        cloneLineAccountCodeItemModalTemplate.querySelectorAll('input[type=text]')[3].value =
          lineAccount.creditAccountCode
        cloneLineAccountCodeItemModalTemplate.querySelectorAll('input[type=text]')[4].value =
          lineAccount.creditSubAccountCode
        cloneLineAccountCodeItemModalTemplate.querySelectorAll('input[type=text]')[5].value =
          lineAccount.creditDepartmentCode
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
          // 貸方
          creditAccountCode: node.querySelectorAll('input[type=text]')[3].value,
          creditSubAccountCode: node.querySelectorAll('input[type=text]')[4].value,
          creditDepartmentCode: node.querySelectorAll('input[type=text]')[5].value,
          amount: node.querySelectorAll('input[type=text]')[6].value
        }
      } else {
        account[idx] = {
          node: null,
          accountCode: null,
          subAccountCode: null,
          departmentCode: null,
          creditAccountCode: null,
          creditSubAccountCode: null,
          creditDepartmentCode: null,
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

// 仕訳情報一括入力モーダルのプラスボタン
$('#btn-plus-accountCode-bulkInsert-modal').addEventListener('click', function () {
  const target = $(this.dataset.target)
  const targetName = this.dataset.target.replaceAll('#', '')
  const template = $('#template-journal-accountCode')
  const lineAccountcodeLength = target.querySelectorAll('.lineAccountcodeForBulk').length

  if (lineAccountcodeLength < 10) {
    // 仕訳情報のidを作成：lineNo明細詳細の順番_lineAccountCode仕訳情報の順番
    const tagetIdBase = `${targetName}_lineAccountCode`
    const targetId = `${targetName}_lineAccountCode${
      ~~target.querySelectorAll('.lineAccountcodeForBulk')[lineAccountcodeLength - 1].id.replaceAll(tagetIdBase, '') + 1
    }`
    // 仕訳情報のidを作成：lineNo明細詳細の順番_lineAccountCode仕訳情報の順番(貸方)
    const creditTargetId = `${targetName}_lineCreditAccountCode${
      ~~target.querySelectorAll('.lineAccountcodeForBulk')[lineAccountcodeLength - 1].id.replaceAll(tagetIdBase, '') + 1
    }`
    const cloneAccountcode = document.importNode(template.content, true)
    const idx = lineAccountcodeLength + 1
    cloneAccountcode.querySelector('.lineAccountcodeForBulk').dataset.idx = idx
    cloneAccountcode.querySelector('.lineAccountcodeForBulk').id = targetId
    cloneAccountcode.querySelector('.input-accountCode').id = `${targetId}_accountCode`
    cloneAccountcode.querySelector('.input-subAccountCode').id = `${targetId}_subAccountCode`
    cloneAccountcode.querySelector('.input-departmentCode').id = `${targetId}_departmentCode`
    // 貸方追加
    cloneAccountcode.querySelector('.input-creditAccountCode').id = `${creditTargetId}_creditAccountCode`
    cloneAccountcode.querySelector('.input-creditSubAccountCode').id = `${creditTargetId}_creditSubAccountCode`
    cloneAccountcode.querySelector('.input-creditDepartmentCode').id = `${creditTargetId}_creditDepartmentCode`
    cloneAccountcode.querySelector('.btn-minus-accountCode').id = `btn_minus_${targetId}`
    cloneAccountcode.querySelector('.btn-minus-accountCode').dataset.target = `${targetId}`
    cloneAccountcode.querySelector('.btn-minus-accountCode').dataset.target = `${targetId}`
    cloneAccountcode.querySelector('.btn-minus-accountCode').addEventListener('click', btnMinusAccount)
    // 勘定科目と補助科目検索ボタン
    const btnlineAccountCodeSearch = cloneAccountcode.querySelectorAll('.BtnlineAccountCodeSearch')
    Array.prototype.forEach.call(btnlineAccountCodeSearch, (item) => {
      item.dataset.target = 'accountCode-modal'
      item.dataset.info = `${targetId}`
      item.addEventListener('click', btnSearchMain($('#accountCode-modal')))
    })
    // 勘定科目と補助科目検索ボタン(貸方)
    const btnlineCreditAccountCodeSearch = cloneAccountcode.querySelectorAll('.BtnlineCreditAccountCodeSearch')
    Array.prototype.forEach.call(btnlineCreditAccountCodeSearch, (item) => {
      item.dataset.target = 'creditAccountCode-modal'
      item.dataset.info = `${creditTargetId}`
      item.addEventListener('click', btnSearchMainCredit($('#creditAccountCode-modal')))
    })

    // 部門データ検索ボタン
    cloneAccountcode.querySelector('.BtnlineDepartmentCodeSearch').dataset.target = 'departmentCode-modal'
    cloneAccountcode.querySelector('.BtnlineDepartmentCodeSearch').dataset.info = `${targetId}`
    cloneAccountcode
      .querySelector('.BtnlineDepartmentCodeSearch')
      .addEventListener('click', btnSearchDepartmentCode($('#departmentCode-modal')))
    // 部門データ検索ボタン(貸方)
    cloneAccountcode.querySelector('.BtnlineCreditDepartmentCodeSearch').dataset.target = 'creditDepartmentCode-modal'
    cloneAccountcode.querySelector('.BtnlineCreditDepartmentCodeSearch').dataset.info = `${creditTargetId}`
    cloneAccountcode
      .querySelector('.BtnlineCreditDepartmentCodeSearch')
      .addEventListener('click', btnSearchCreditDepartmentCode($('#creditDepartmentCode-modal')))
    target.appendChild(cloneAccountcode)
  } else {
    $('#error-message-journal-modal').innerText = '仕訳情報入力の上限は１０項目までです。'
  }
})

// 仕訳情報取得
const getLineAccountcodeList = function (invoiceLineNo) {
  const invoiceLines = $(`#invoiceLine${invoiceLineNo}`).parentNode.querySelectorAll('.lineAccountcode')
  const lineAccountCodeList = []
  for (const invoiceLine of invoiceLines) {
    const debbitAccountCode = invoiceLine.querySelectorAll('input[type=text]')[0].value
    const debitSubAccountCode = invoiceLine.querySelectorAll('input[type=text]')[1].value
    const debitDepartmentCode = invoiceLine.querySelectorAll('input[type=text]')[2].value
    const creditAccountCode = invoiceLine.querySelectorAll('input[type=text]')[3].value
    const creditSubAccountCode = invoiceLine.querySelectorAll('input[type=text]')[4].value
    const credittDepartmentCode = invoiceLine.querySelectorAll('input[type=text]')[5].value
    if (
      debbitAccountCode ||
      debitSubAccountCode ||
      debitDepartmentCode ||
      creditAccountCode ||
      creditSubAccountCode ||
      credittDepartmentCode !== ''
    ) {
      lineAccountCodeList.push({
        accountCode: debbitAccountCode,
        subAccountCode: debitSubAccountCode,
        departmentCode: debitDepartmentCode,
        creditAccountCode: creditAccountCode,
        creditSubAccountCode: creditSubAccountCode,
        creditDepartmentCode: credittDepartmentCode
      })
    } else {
      if (invoiceLines.length !== 1) {
        if (invoiceLine.id.substr(-1, 1) !== '1') {
          invoiceLine.querySelector('.btn-minus-accountCode').click()
        }
      }
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
      // 仕訳情報のidを作成：lineNo明細詳細の順番_lineAccountCode仕訳情報の順番（貸方）
      const targetCreditId = `${target.id}_lineCreditAccountCode${
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
      // 勘定科目コードINPUT(貸方)
      cloneAccountCodeItem
        .querySelector('.lineCreditAccountCode_creditAccountCode')
        .setAttribute('name', `${targetCreditId}_creditAccountCode`)
      cloneAccountCodeItem.querySelector(
        '.lineCreditAccountCode_creditAccountCode'
      ).id = `${targetCreditId}_creditAccountCode`
      // 補助科目コードINPUT
      cloneAccountCodeItem
        .querySelector('.lineAccountCode_subAccountCode')
        .setAttribute('name', `${targetId}_subAccountCode`)
      cloneAccountCodeItem.querySelector('.lineAccountCode_subAccountCode').id = `${targetId}_subAccountCode`
      // 補助科目コードINPUT（貸方）
      cloneAccountCodeItem
        .querySelector('.lineCreditAccountCode_creditSubAccountCode')
        .setAttribute('name', `${targetCreditId}_creditSubAccountCode`)
      cloneAccountCodeItem.querySelector(
        '.lineCreditAccountCode_creditSubAccountCode'
      ).id = `${targetCreditId}_creditSubAccountCode`
      // 部門データINPUT
      cloneAccountCodeItem
        .querySelector('.lineAccountCode_departmentCode')
        .setAttribute('name', `${targetId}_departmentCode`)
      cloneAccountCodeItem.querySelector('.lineAccountCode_departmentCode').id = `${targetId}_departmentCode`
      // 部門データINPUT(貸方)
      cloneAccountCodeItem
        .querySelector('.lineCreditAccountCode_creditDepartmentCode')
        .setAttribute('name', `${targetCreditId}_creditDepartmentCode`)
      cloneAccountCodeItem.querySelector(
        '.lineCreditAccountCode_creditDepartmentCode'
      ).id = `${targetCreditId}_creditDepartmentCode`
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
      const btnSearchMainArray = cloneAccountCodeItem.querySelectorAll('.btn-search-main')
      Array.prototype.forEach.call(btnSearchMainArray, (item) => {
        item.dataset.target = 'accountCode-modal'
        item.dataset.info = targetId
        item.addEventListener('click', btnSearchMain($('#accountCode-modal')))
      })

      // 勘定科目と補助科目検索ボタン（貸方）
      const btnSearchCreditMain = cloneAccountCodeItem.querySelectorAll('.btn-search-creditMain')
      Array.prototype.forEach.call(btnSearchCreditMain, (item) => {
        item.dataset.target = 'creditAccountCode-modal'
        item.dataset.info = targetCreditId
        item.addEventListener('click', btnSearchMainCredit($('#creditAccountCode-modal')))
      })

      // 部門データ検索ボタン
      cloneAccountCodeItem.querySelector('.btn-search-departmentCode').dataset.target = 'departmentCode-modal'
      cloneAccountCodeItem.querySelector('.btn-search-departmentCode').dataset.info = targetId
      cloneAccountCodeItem
        .querySelector('.btn-search-departmentCode')
        .addEventListener('click', btnSearchDepartmentCode($('#departmentCode-modal')))

      // 部門データ検索ボタン(貸方)
      cloneAccountCodeItem.querySelector('.btn-search-creditDepartmentCode').dataset.target =
        'creditDepartmentCode-modal'
      cloneAccountCodeItem.querySelector('.btn-search-creditDepartmentCode').dataset.info = targetCreditId
      cloneAccountCodeItem
        .querySelector('.btn-search-creditDepartmentCode')
        .addEventListener('click', btnSearchCreditDepartmentCode($('#creditDepartmentCode-modal')))

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

// 2番目以降の勘定科目・補助科目検索ボタンイベント(貸方)
const btnSearchMainCredit = function (searchModal) {
  return function () {
    if (this.dataset.info !== $('#creditAccountCode-modal').dataset.info) {
      deleteCreditDisplayModal()
    }

    if (searchModal) searchModal.classList.toggle('is-active')
    $('#creditAccountCode-modal').dataset.info = this.dataset.info
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

// 2番目以降の部門データ検索ボタンイベント(貸方)
const btnSearchCreditDepartmentCode = function (searchModal) {
  return function () {
    $('#searchCreditDepartmentModalErrMsg').innerText = ''
    if (this.dataset.info !== $('#creditDepartmentCode-modal').dataset.info) {
      deleteCreditDepartmentResultDisplayModal()
    }
    if (searchModal) searchModal.classList.toggle('is-active')
    $('#creditDepartmentCode-modal').dataset.info = this.dataset.info
  }
}

$('#CloseSearchAccountCode').addEventListener('click', function () {})
$('#CloseSearchDepartmentCode').addEventListener('click', function () {})

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

// 仕訳情報検索(貸方)
// 勘定科目コード、補助科目検索
$('#btnSearchCreditAccountCode').addEventListener('click', function () {
  const accountCode = $('#searchModalCreditAccountCode').value
  const accountCodeName = $('#searchModalCreditAccountCodeName').value
  const subAccountCode = $('#searchModalCreditSubAccountCode').value
  const subAccountCodeName = $('#searchModalCreditSubAccountCodeName').value

  const $this = this
  deleteCreditDisplayModal()
  $('#searchModalCreditAccountCode').value = accountCode
  $('#searchModalCreditAccountCodeName').value = accountCodeName
  $('#searchModalCreditSubAccountCode').value = subAccountCode
  $('#searchModalCreditSubAccountCodeName').value = subAccountCodeName

  const getAccountCode = new XMLHttpRequest()
  getAccountCode.open('POST', '/inbox/getCode')
  getAccountCode.setRequestHeader('Content-Type', 'application/json')
  getAccountCode.onreadystatechange = function () {
    if (getAccountCode.readyState === getAccountCode.DONE) {
      switch (getAccountCode.status) {
        case 200: {
          const result = JSON.parse(getAccountCode.response)
          if (result.length !== 0) {
            displayCreditResultForCode(result)
          } else {
            displayNoCreditAccountCode()
          }
          break
        }
        default: {
          deleteCreditDisplayModal()
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
  if (departmentCode.length > 6 && departmentCodeName.length > 40) {
    $('#searchDepartmentModalErrMsg').innerText =
      '部門コードは6桁まで入力してください。 部門名は40桁まで入力してください。'
    $('#searchModalDepartmentCode').value = departmentCode
    $('#searchModalDepartmentCodeName').value = departmentCodeName
    return null
  }
  // 部門コードの桁数チェック
  if (departmentCode.length > 6) {
    $('#searchDepartmentModalErrMsg').innerText = '部門コードは6桁まで入力してください。'
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

// 部門データモーダルの内の検索ボタン(貸方)
$('#btnSearchCreditDepartmentCode').addEventListener('click', function () {
  const inputPatternEngNumKana = '^[a-zA-Z0-9ァ-ヶー　+]*$'
  const departmentCode = $('#searchModalCreditDepartmentCode').value
  const departmentCodeName = $('#searchModalCreditDepartmentCodeName').value
  const inputPatternEngNumKanaRegExp = new RegExp(inputPatternEngNumKana)

  const $this = this
  // モーダル初期化
  deleteCreditDepartmentResultDisplayModal()

  // 部門コードのバリデーションチェック
  if (!inputPatternEngNumKanaRegExp.test(departmentCode)) {
    $('#searchCreditDepartmentModalErrMsg').innerText = '入力値が間違いました。'
    $('#searchModalCreditDepartmentCode').value = departmentCode
    $('#searchModalCreditDepartmentCodeName').value = departmentCodeName
    return null
  }

  // 部門コードと部門名の桁数チェック
  if (departmentCode.length > 6 && departmentCodeName.length > 40) {
    $('#searchCreditDepartmentModalErrMsg').innerText =
      '部門コードは6桁まで入力してください。 部門名は40桁まで入力してください。'
    $('#searchModalCreditDepartmentCode').value = departmentCode
    $('#searchModalCreditDepartmentCodeName').value = departmentCodeName
    return null
  }
  // 部門コードの桁数チェック
  if (departmentCode.length > 6) {
    $('#searchCreditDepartmentModalErrMsg').innerText = '部門コードは6桁まで入力してください。'
    $('#searchModalCreditDepartmentCode').value = departmentCode
    $('#searchModalCreditDepartmentCodeName').value = departmentCodeName
    return null
  }
  // 部門名の桁数チェック
  if (departmentCodeName.length > 40) {
    $('#searchCreditDepartmentModalErrMsg').innerText = '部門名は40桁まで入力してください。'
    $('#searchModalCreditDepartmentCode').value = departmentCode
    $('#searchModalCreditDepartmentCodeName').value = departmentCodeName
    return null
  }

  // 初期化されたキーワードを入力
  $('#searchModalCreditDepartmentCode').value = departmentCode
  $('#searchModalCreditDepartmentCodeName').value = departmentCodeName

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
            displayResultForCreditDepartmentCode(result)
          } else {
            displayNoCreditDepartmentCode()
          }
          break
        }
        default: {
          deleteCreditDepartmentResultDisplayModal()
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

// 勘定科目コード、補助科目検索結果を画面に表示（貸方）
const displayCreditResultForCode = function (codeArr) {
  const displayCreditFieldResultBody = $('#displayCreditFieldResultBody')
  const searchResultCode = $('#searchResultCode')
  codeArr.forEach((item) => {
    const cloneSearchResultCodeTemplate = document.importNode(searchResultCode.content, true)
    cloneSearchResultCodeTemplate.querySelector('.rowAccountCode').dataset.target = '#creditAccountCode-modal'
    cloneSearchResultCodeTemplate.querySelector('.rowAccountCode').dataset.accountCode = item.accountCode
    cloneSearchResultCodeTemplate.querySelector('.rowAccountCode').dataset.subAccountCode = item.subAccountCode
    cloneSearchResultCodeTemplate.querySelector('.columnNoAccountCodeMessage').classList.add('is-invisible')
    cloneSearchResultCodeTemplate.querySelector('.columnAccountCode').innerText = item.accountCode
    cloneSearchResultCodeTemplate.querySelector('.columnAccountCodeName').innerText = item.accountCodeName
    cloneSearchResultCodeTemplate.querySelector('.columnSubAccountCode').innerText = item.subAccountCode
    cloneSearchResultCodeTemplate.querySelector('.columnSubAccountCodeName').innerText = item.subAccountCodeName

    displayCreditFieldResultBody.appendChild(cloneSearchResultCodeTemplate)
  })
  $('.rowAccountCode').forEach((row) => {
    row.addEventListener('click', function () {
      $(this.dataset.target).classList.remove('is-active')
      const inputTarget = $(this.dataset.target).dataset.info
      $(`#${inputTarget}_creditAccountCode`).value = this.dataset.accountCode
      $(`#${inputTarget}_creditSubAccountCode`).value = this.dataset.subAccountCode
      $('#btn-confirm').removeAttribute('disabled')
      deleteCreditDisplayModal()
    })
    row.addEventListener('mouseover', function () {
      this.classList.add('is-selected')
    })
    row.addEventListener('mouseout', function () {
      this.classList.remove('is-selected')
    })
  })
  $('#displayCreditInvisible').classList.remove('is-invisible')
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

// 部門データ検索結果を画面に表示（貸方）
const displayResultForCreditDepartmentCode = function (codeArr) {
  const displayCreditFieldDepartmentResultBody = $('#displayCreditFieldDepartmentResultBody')
  const searchResultDepartmentCode = $('#searchResultDepartmentCode')
  codeArr.forEach((item) => {
    const cloneSearchResultDepartmentCodeTemplate = document.importNode(searchResultDepartmentCode.content, true)
    cloneSearchResultDepartmentCodeTemplate.querySelector('.rowDepartmentCode').dataset.target =
      '#creditDepartmentCode-modal'
    cloneSearchResultDepartmentCodeTemplate.querySelector('.rowDepartmentCode').dataset.departmentCode = item.code
    cloneSearchResultDepartmentCodeTemplate
      .querySelector('.columnNoDepartmentCodeMessage')
      .classList.add('is-invisible')
    cloneSearchResultDepartmentCodeTemplate.querySelector('.columnDepartmentCode').innerText = item.code
    cloneSearchResultDepartmentCodeTemplate.querySelector('.columnDepartmentCodeName').innerText = item.name
    displayCreditFieldDepartmentResultBody.appendChild(cloneSearchResultDepartmentCodeTemplate)
  })
  $('.rowDepartmentCode').forEach((row) => {
    row.addEventListener('click', function () {
      $(this.dataset.target).classList.remove('is-active')
      const inputTarget = $(this.dataset.target).dataset.info
      $(`#${inputTarget}_creditDepartmentCode`).value = this.dataset.departmentCode
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
  $('#creditDepartmentResultDisplayInvisible').classList.remove('is-invisible')
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

// 勘定科目コード検索結果がない場合（貸方）
const displayNoCreditAccountCode = function () {
  const displayFieldBody = $('#displayCreditFieldResultBody')
  const searchResultCode = $('#searchResultCode')
  const cloneSearchResultCodeTemplate = document.importNode(searchResultCode.content, true)
  cloneSearchResultCodeTemplate.querySelector('.columnNoAccountCodeMessage').classList.remove('is-invisible')
  cloneSearchResultCodeTemplate.querySelector('.columnNoAccountCodeMessage').setAttribute('colspan', '4')
  cloneSearchResultCodeTemplate.querySelector('.noAccountCodeMessage').innerText =
    '該当する勘定科目が存在しませんでした。'
  displayFieldBody.appendChild(cloneSearchResultCodeTemplate)
  $('#displayCreditInvisible').classList.remove('is-invisible')
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

// 部門データ検索結果がない場合(貸方)
const displayNoCreditDepartmentCode = function () {
  const displayCreditFieldDepartmentResultBody = $('#displayCreditFieldDepartmentResultBody')
  const searchResultDepartmentCode = $('#searchResultDepartmentCode')
  const cloneSearchResultDepartmentCodeTemplate = document.importNode(searchResultDepartmentCode.content, true)
  cloneSearchResultDepartmentCodeTemplate
    .querySelector('.columnNoDepartmentCodeMessage')
    .classList.remove('is-invisible')
  cloneSearchResultDepartmentCodeTemplate.querySelector('.columnNoDepartmentCodeMessage').setAttribute('colspan', '2')
  cloneSearchResultDepartmentCodeTemplate.querySelector('.noDepartmentCodeMessage').innerText =
    '該当する部門データが存在しませんでした。'
  displayCreditFieldDepartmentResultBody.appendChild(cloneSearchResultDepartmentCodeTemplate)
  $('#creditDepartmentResultDisplayInvisible').classList.remove('is-invisible')
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

// 勘定科目コード、補助科目再検索の時、前の結果を消す(貸方)
const deleteCreditDisplayModal = function () {
  const displayCreditFieldResultBody = $('#displayCreditFieldResultBody')
  if (displayCreditFieldResultBody.children.length !== 0) {
    const chidrenItem = []
    Array.prototype.forEach.call(displayCreditFieldResultBody.children, (item) => {
      chidrenItem.push(item)
    })
    chidrenItem.forEach((item) => {
      displayCreditFieldResultBody.removeChild(item)
    })
  }

  $('#searchModalCreditAccountCode').value = ''
  $('#searchModalCreditAccountCodeName').value = ''
  $('#searchModalCreditSubAccountCode').value = ''
  $('#searchModalCreditSubAccountCodeName').value = ''

  $('#displayCreditInvisible').classList.add('is-invisible')
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

// 部門データ再検索の時、前の結果を消す（貸方）
const deleteCreditDepartmentResultDisplayModal = function () {
  const displayCreditFieldDepartmentResultBody = $('#displayCreditFieldDepartmentResultBody')
  if (displayCreditFieldDepartmentResultBody.children.length !== 0) {
    const chidrenItem = []
    Array.prototype.forEach.call(displayCreditFieldDepartmentResultBody.children, (item) => {
      chidrenItem.push(item)
    })
    chidrenItem.forEach((item) => {
      displayCreditFieldDepartmentResultBody.removeChild(item)
    })
  }

  $('#searchModalCreditDepartmentCode').value = ''
  $('#searchModalCreditDepartmentCodeName').value = ''

  $('#creditDepartmentResultDisplayInvisible').classList.add('is-invisible')
}

// 仕訳情報のアイテムのマイナスボタン機能追加
const btnMinusAccount = function () {
  const deleteTarget = this.dataset.target
  if ($(`#${deleteTarget}_input_amount`) !== undefined && $(`#${deleteTarget}_input_amount`) !== null) {
    const thisLineInput = $(`#${deleteTarget}_input_amount`)
    const lineNoFirstInput = $(`#${deleteTarget.split('_')[0]}_lineAccountCode1_input_amount`)
    lineNoFirstInput.value = (
      BigInt(lineNoFirstInput.value.replaceAll(',', '')) + BigInt(thisLineInput.value.replaceAll(',', ''))
    ).toLocaleString('ja-JP')
  }
  $(`#${deleteTarget}`).remove()

  $('#btn-confirm').removeAttribute('disabled')
}

// 計上金額入力ボタン（モーダルの表示）
function btnInstallmentAmount() {
  const showModalTarget = $(`#${this.dataset.target}`)
  const inputTarget = this.dataset.input
  $('#inputInstallmentAmount').value = BigInt($(`#${inputTarget}`).value.replaceAll(',', ''))
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
  if (BigInt(this.value) === 0) {
    this.value = ''
  }
})

// モーダルの内の入力ボタン機能
$('#btn-insert').addEventListener('click', function () {
  const inputTarget = this.dataset.target
  const valueInput = $('#inputInstallmentAmount')
  const totalAmmout = BigInt($(`#${inputTarget.split('_')[0]}Total`).value.replaceAll(',', ''))

  if (BigInt(valueInput.value) !== 0n) {
    if (totalAmmout - BigInt(valueInput.value) <= 0) {
      $('#installmentAmountErrMsg').innerText = '計上金額の合計が小計金額を超えています。'
      return null
    }

    $(`#${inputTarget}`).value = BigInt(valueInput.value).toLocaleString('ja-JP')
    let checkTotalAmount = totalAmmout
    Array.prototype.forEach.call($(`.${inputTarget.split('_')[0]}_input_amount`), (item, idx) => {
      if (idx !== 0) {
        checkTotalAmount -= BigInt(item.value.replaceAll(',', ''))
      }
    })
    if (checkTotalAmount <= 0) {
      $('#installmentAmountErrMsg').innerText = '計上金額の合計が小計金額を超えています。'
      return null
    } else {
      $(`.${inputTarget.split('_')[0]}_input_amount`)[0].value = checkTotalAmount.toLocaleString('ja-JP')
      $('#insert-installmentAmount-modal').classList.toggle('is-active')
    }
  } else {
    $('#installmentAmountErrMsg').innerText = '金額は1円以上を入力してください。'
  }
})

// 「保存」ボタンクリック
$('#btn-confirm').addEventListener('click', function () {
  // 「保存」ボタンが非活性の場合、終了する。
  if (this.getAttribute('disabled') === 'true') return
  const dupleResult = duplicationCheck()
  if (dupleResult.length > 0) {
    document.getElementById(dupleResult[0].id).focus({ preventScroll: false })
    return
  }
  if (checkJournalList()) $('#form').submit()
})

// 仕訳情報を取得関数
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
            creditAccountCode: journal.querySelectorAll('input[type=text]')[3].value,
            creditSubAccountCode: journal.querySelectorAll('input[type=text]')[4].value,
            journalNo: journalNo,
            input_amount: BigInt(journal.querySelectorAll('input[type=text]')[6].value.replaceAll(',', ''))
          }
        } else {
          journalLines[idx][jdx] = {
            accountCode: journal.querySelectorAll('input[type=text]')[0].value,
            subAccountCode: journal.querySelectorAll('input[type=text]')[1].value,
            creditAccountCode: journal.querySelectorAll('input[type=text]')[3].value,
            creditSubAccountCode: journal.querySelectorAll('input[type=text]')[4].value,
            journalNo: journalNo,
            input_amount: BigInt(journal.querySelectorAll('input[type=text]')[6].value.replaceAll(',', ''))
          }
        }
      })
      journalIdx++
    } while (journalIdx < 10)
  })
  return journalLines
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
          creditAccountCode: account.creditAccountCode,
          creditSubAccountCode: account.creditSubAccountCode,
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
        if (
          (journalLines[lineNo][0].accountCode.length === 0 &&
            journalLines[lineNo][0].creditAccountCode.length === 0) ||
          journalLines[lineNo][0].input_amount === 0
        ) {
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
        total = BigInt(journalLines[i][j].input_amount.replaceAll(',', ''))
        break
      }
      // 設定した仕訳情報の計上金額をチェック用
      if (journalLines[i][j] !== undefined) {
        total = BigInt(total) + BigInt(journalLines[i][j].input_amount.replaceAll(',', ''))
        if (BigInt(journalLines[i][j].input_amount.replaceAll(',', '')) === 0n) {
          isFirstLineNull = true
          $('#error-message-body').innerText = '計上金額は1円以上を入力して下さい。'
        }
      }
    }
    // 金額が誤りがある場合
    if (total !== BigInt($(`#lineNo${i + 1}Total`).value.replaceAll(',', ''))) {
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

// 重複又は空になった仕訳情報処理(仕訳情報設定画面)
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
      // 借方
      if (item.querySelectorAll('input[type=text]').length !== 0) {
        const accountCode = item.querySelectorAll('input[type=text]')[0].value // 勘定科目コード
        const subAccountCode = item.querySelectorAll('input[type=text]')[1].value // 補助科目コード
        const department = item.querySelectorAll('input[type=text]')[2].value // 部門コード

        // 貸方
        const creditAccountCode = item.querySelectorAll('input[type=text]')[3].value // 勘定科目コード
        const creditSubAccountCode = item.querySelectorAll('input[type=text]')[4].value // 補助科目コード
        const creditDepartment = item.querySelectorAll('input[type=text]')[5].value // 部門コード
        lineInformationArray.push([
          accountCode,
          subAccountCode,
          department,
          creditAccountCode,
          creditSubAccountCode,
          creditDepartment
        ])
      }
    })
    koumokuInformationArray.push(duplicateCheckFunction(lineInformationArray))
  }

  // 空又は重複がある明細項目づつエラーメッセージを設定する。
  koumokuInformationArray.map((item, idx) => {
    const errMsg = document.getElementById(`error-message-lineNo${idx + 1}`)
    if (item.nothingCheckFlag === true) {
      errMsg.innerText = '仕訳情報を正しく設定してください。'
      errMsg.classList.remove('invisible')
      errMsg.focus({ preventScroll: false })
      duplArray.push(errMsg)
    } else if (item.duplicationFlag === true) {
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

// 重複された仕訳情報処理(仕訳情報設定画面モーダル)
const duplicationCheckModal = function () {
  // モーダル画面に表示された項目別の仕訳情報を取得
  const children = document.querySelectorAll('.lineAccountcodeForBulk')
  const koumokuInformationArray = []

  // 勘定科目と補助科目を取得
  Array.prototype.forEach.call(children, (item) => {
    // 借方
    const accountCode = item.querySelectorAll('input[type=text]')[0].value // 勘定科目コード
    const subAccountCode = item.querySelectorAll('input[type=text]')[1].value // 補助科目コード
    const department = item.querySelectorAll('input[type=text]')[2].value // 部門コード

    // 貸方
    const creditAccountCode = item.querySelectorAll('input[type=text]')[3].value // 勘定科目コード
    const creditSubAccountCode = item.querySelectorAll('input[type=text]')[4].value // 補助科目コード
    const creditDepartment = item.querySelectorAll('input[type=text]')[5].value // 部門コード

    koumokuInformationArray.push([
      accountCode,
      subAccountCode,
      department,
      creditAccountCode,
      creditSubAccountCode,
      creditDepartment
    ])
  })
  const dupleResult = duplicateCheckFunction(koumokuInformationArray)

  // 重複された場合エラーメッセージ表示
  const errMsg = $('#error-message-journal-modal')
  if (dupleResult.nothingCheckFlag) {
    errMsg.innerText = '仕訳情報を正しく設定してください。'
    return true
  } else if (dupleResult.duplicationFlag) {
    errMsg.innerText = '同じ仕訳情報は設定できません。'
    return true
  } else {
    errMsg.innerText = ''
    return false
  }
}

// 空及び重複検索関数
const duplicateCheckFunction = function (array) {
  const length = array.length
  let nothingCheckFlag = false
  let duplicationFlag = false
  let i, j, temp

  if (length !== 1) {
    for (i = 0; i < length - 1; i++) {
      for (j = 0; j < length - 1 - i; j++) {
        if (JSON.stringify(array[j]) === JSON.stringify(array[j + 1])) {
          duplicationFlag = true
          return { duplicationFlag: duplicationFlag, nothingCheckFlag: nothingCheckFlag }
        } else {
          temp = array[j]
          array[j] = array[j + 1]
          array[j + 1] = temp
        }

        // 全項目が空の場合
        if (
          array[j][0].length === 0 &&
          array[j][1].length === 0 &&
          array[j][2].length === 0 &&
          array[j][3].length === 0 &&
          array[j][4].length === 0 &&
          array[j][5].length === 0
        ) {
          nothingCheckFlag = true
          return { duplicationFlag: duplicationFlag, nothingCheckFlag: nothingCheckFlag }
        }

        // 勘定科目がなし、他の科目がある場合
        if (
          (array[j][0].length === 0 && array[j][1].length !== 0) ||
          (array[j][0].length === 0 && array[j][2].length !== 0) ||
          (array[j][3].length === 0 && array[j][4].length !== 0) ||
          (array[j][3].length === 0 && array[j][5].length !== 0)
        ) {
          nothingCheckFlag = true
          return { duplicationFlag: duplicationFlag, nothingCheckFlag: nothingCheckFlag }
        }
      }
    }
  } else {
    // 全項目が空の場合
    if (
      array[0][0].length === 0 &&
      array[0][1].length === 0 &&
      array[0][2].length === 0 &&
      array[0][3].length === 0 &&
      array[0][4].length === 0 &&
      array[0][5].length === 0
    ) {
      nothingCheckFlag = true
      return { duplicationFlag: duplicationFlag, nothingCheckFlag: nothingCheckFlag }
    }

    // 勘定科目がなし、他の科目がある場合
    if (
      (array[0][0].length === 0 && array[0][1].length !== 0) ||
      (array[0][0].length === 0 && array[0][2].length !== 0) ||
      (array[0][3].length === 0 && array[0][4].length !== 0) ||
      (array[0][3].length === 0 && array[0][5].length !== 0)
    ) {
      nothingCheckFlag = true
      return { duplicationFlag: duplicationFlag, nothingCheckFlag: nothingCheckFlag }
    }
  }

  return { duplicationFlag: duplicationFlag, nothingCheckFlag: nothingCheckFlag }
}

// Modal反映ボタン
$('#btn-bulk-insert').addEventListener('click', function () {
  if (this.getAttribute('disabled') === 'true') return

  // エラーチェック
  let errorCheckFlag = false

  if (checkBulkList()) {
    if (duplicationCheckModal()) {
      errorCheckFlag = true
    }
  } else {
    errorCheckFlag = true
  }

  // エラーがある場合、ぽす
  if (errorCheckFlag) {
    $('#error-message-journal-modal').focus({ preventScroll: false })
    return
  }

  addBulkList()
  $(`#${this.dataset.target}`).classList.remove('is-active')
})

// 一括入力「登録」のバリデーションチェック
const checkBulkList = function () {
  const bulkLines = getBulkList()
  const selectedInvocieLine = getSelectedInvoiceLine()
  const getInvoiceLines = getInvoiceLineList()

  const returnValue = {
    bulkLines: false,
    checked: false,
    limitLines: false
  }

  getInvoiceLines.forEach((invoice, idx) => {
    const lineAccountcodeList = getLineAccountcodeList(invoice.invoiceLineNo)
    let count = 0
    bulkLines.forEach(() => {
      count++
    })
    if (count + lineAccountcodeList.length > 10) {
      if (selectedInvocieLine[idx]) {
        returnValue.limitLines = true
      }
    }
  })

  bulkLines.forEach((line, idx) => {
    if (line !== undefined) {
      if (
        ((line.accountCode.length === 0 || (line.accountCode.length === 0 && line.subAccountCode.length === 0)) &&
          (line.creditAccountCode.length === 0 ||
            (line.creditAccountCode.length === 0 && line.creditSubAccountCode.length === 0))) ||
        (line.accountCode.length === 0 && line.departmentCode.length !== 0) ||
        (line.creditAccountCode.length === 0 && line.creditDepartmentCode.length !== 0)
      ) {
        returnValue.bulkLines = true
      }
    }
  })

  selectedInvocieLine.forEach((isChecked) => {
    if (isChecked === true) {
      returnValue.checked = true
    }
  })

  if (returnValue.bulkLines) {
    $('#error-message-journal-modal').innerText = '仕訳情報を１項目以上入力してください。'
  } else if (!returnValue.checked) {
    $('#error-message-journal-modal').innerText = '対象となる明細を選択してください。'
    returnValue.checked = false
  } else if (returnValue.limitLines) {
    $('#error-message-journal-modal').innerText = '仕訳情報の入力上限を超える明細があります。（各明細１０項目まで。）'
    returnValue.checked = false
  } else {
    $('#error-message-journal-modal').innerText = ''
  }

  return !returnValue.bulkLines & returnValue.checked & !returnValue.limitLines
}

// 一括入力反映
const addBulkList = function () {
  const bulkList = getBulkList()
  const selectedInvoice = getSelectedInvoiceLine()
  const invoiceLines = getJournalList()

  invoiceLines.forEach((invoiceLine, lineIdx) => {
    let cnt = 0
    invoiceLine.forEach((journal) => {
      if (journal.accountCode.length !== 0 || journal.creditAccountCode.length !== 0) {
        cnt++
      }
    })
    if (selectedInvoice[lineIdx] === true) {
      for (let journalIdx = cnt, bulkIdx = 0; journalIdx < 11; journalIdx++, bulkIdx++) {
        if (
          invoiceLine[journalIdx] !== undefined &&
          invoiceLine[journalIdx].accountCode.length === 0 &&
          invoiceLine[journalIdx].subAccountCode.length === 0
        ) {
          invoiceLine[journalIdx] = {
            accountCode: bulkList[bulkIdx].accountCode,
            subAccountCode: bulkList[bulkIdx].subAccountCode,
            departmentCode: bulkList[bulkIdx].departmentCode,
            creditAccountCode: bulkList[bulkIdx].creditAccountCode,
            creditSubAccountCode: bulkList[bulkIdx].creditSubAccountCode,
            creditDepartmentCode: bulkList[bulkIdx].creditDepartmentCode,
            journalNo: `lineAccountCode${journalIdx + 1}`,
            input_amount: 0,
            isNewItem: false
          }
          // 借方
          $(`#lineNo${lineIdx + 1}_lineAccountCode${journalIdx + 1}_accountCode`).value =
            invoiceLine[journalIdx].accountCode
          $(`#lineNo${lineIdx + 1}_lineAccountCode${journalIdx + 1}_subAccountCode`).value =
            invoiceLine[journalIdx].subAccountCode
          $(`#lineNo${lineIdx + 1}_lineAccountCode${journalIdx + 1}_departmentCode`).value =
            invoiceLine[journalIdx].departmentCode
          // 貸方
          $(`#lineNo${lineIdx + 1}_lineCreditAccountCode${journalIdx + 1}_creditAccountCode`).value =
            invoiceLine[journalIdx].creditAccountCode
          $(`#lineNo${lineIdx + 1}_lineCreditAccountCode${journalIdx + 1}_creditSubAccountCode`).value =
            invoiceLine[journalIdx].creditSubAccountCode
          $(`#lineNo${lineIdx + 1}_lineCreditAccountCode${journalIdx + 1}_creditDepartmentCode`).value =
            invoiceLine[journalIdx].creditDepartmentCode
        }
        if (invoiceLine[journalIdx] === undefined && bulkList[bulkIdx] !== undefined) {
          invoiceLine[journalIdx] = {
            accountCode: bulkList[bulkIdx].accountCode,
            subAccountCode: bulkList[bulkIdx].subAccountCode,
            departmentCode: bulkList[bulkIdx].departmentCode,
            creditAccountCode: bulkList[bulkIdx].creditAccountCode,
            creditSubAccountCode: bulkList[bulkIdx].creditSubAccountCode,
            creditDepartmentCode: bulkList[bulkIdx].creditDepartmentCode,
            journalNo: `lineAccountCode${journalIdx + 1}`,
            input_amount: 0,
            isNewItem: true
          }
        }
      }
    }
    invoiceLine.forEach((journal) => {
      if (journal.isNewItem === undefined) journal.isNewItem = false
    })
  })
  invoiceLines.forEach((invoiceLine, idx) => {
    invoiceLine.forEach((journal, jdx) => {
      if (journal.isNewItem) {
        const lineNo = `lineNo${idx + 1}`
        const tagetIdBase = `${lineNo}_lineAccountCode${jdx + 1}`
        // 貸方
        const creditTagetIdBase = `${lineNo}_lineCreditAccountCode${jdx + 1}`
        const templeAccountCodeItem = $('#templateLineAccountCodeItem')
        const cloneAccountCodeItem = document.importNode(templeAccountCodeItem.content, true)

        cloneAccountCodeItem.querySelector('.lineAccountcode').id = `${tagetIdBase}`

        // 名前の割り当て
        // 勘定科目コードINPUT
        cloneAccountCodeItem
          .querySelector('.lineAccountCode_accountCode')
          .setAttribute('name', `${tagetIdBase}_accountCode`)
        cloneAccountCodeItem.querySelector('.lineAccountCode_accountCode').id = `${tagetIdBase}_accountCode`
        cloneAccountCodeItem.querySelector('.lineAccountCode_accountCode').name = `${tagetIdBase}_accountCode`
        cloneAccountCodeItem.querySelector('.lineAccountCode_accountCode').value = journal.accountCode

        // 勘定科目コードINPUT(貸方)
        cloneAccountCodeItem
          .querySelector('.lineCreditAccountCode_creditAccountCode')
          .setAttribute('name', `${creditTagetIdBase}_creditAccountCode`)
        cloneAccountCodeItem.querySelector(
          '.lineCreditAccountCode_creditAccountCode'
        ).id = `${creditTagetIdBase}_creditAccountCode`
        cloneAccountCodeItem.querySelector(
          '.lineCreditAccountCode_creditAccountCode'
        ).name = `${creditTagetIdBase}_creditAccountCode`
        cloneAccountCodeItem.querySelector('.lineCreditAccountCode_creditAccountCode').value = journal.creditAccountCode

        // 補助科目コードINPUT
        cloneAccountCodeItem
          .querySelector('.lineAccountCode_subAccountCode')
          .setAttribute('name', `${tagetIdBase}_subAccountCode`)
        cloneAccountCodeItem.querySelector('.lineAccountCode_subAccountCode').id = `${tagetIdBase}_subAccountCode`
        cloneAccountCodeItem.querySelector('.lineAccountCode_subAccountCode').name = `${tagetIdBase}_subAccountCode`
        cloneAccountCodeItem.querySelector('.lineAccountCode_subAccountCode').value = journal.subAccountCode

        // 補助科目コードINPUT(貸方)
        cloneAccountCodeItem
          .querySelector('.lineCreditAccountCode_creditSubAccountCode')
          .setAttribute('name', `${creditTagetIdBase}_creditSubAccountCode`)
        cloneAccountCodeItem.querySelector(
          '.lineCreditAccountCode_creditSubAccountCode'
        ).id = `${creditTagetIdBase}_creditSubAccountCode`
        cloneAccountCodeItem.querySelector(
          '.lineCreditAccountCode_creditSubAccountCode'
        ).name = `${creditTagetIdBase}_creditSubAccountCode`
        cloneAccountCodeItem.querySelector('.lineCreditAccountCode_creditSubAccountCode').value =
          journal.creditSubAccountCode

        // 部門データINPUT
        cloneAccountCodeItem
          .querySelector('.lineAccountCode_departmentCode')
          .setAttribute('name', `${tagetIdBase}_departmentCode`)
        cloneAccountCodeItem.querySelector('.lineAccountCode_departmentCode').id = `${tagetIdBase}_departmentCode`
        cloneAccountCodeItem.querySelector('.lineAccountCode_departmentCode').name = `${tagetIdBase}_departmentCode`
        cloneAccountCodeItem.querySelector('.lineAccountCode_departmentCode').value = journal.departmentCode

        // 部門データINPUT(貸方)
        cloneAccountCodeItem
          .querySelector('.lineCreditAccountCode_creditDepartmentCode')
          .setAttribute('name', `${creditTagetIdBase}_creditDepartmentCode`)
        cloneAccountCodeItem.querySelector(
          '.lineCreditAccountCode_creditDepartmentCode'
        ).id = `${creditTagetIdBase}_creditDepartmentCode`
        cloneAccountCodeItem.querySelector(
          '.lineCreditAccountCode_creditDepartmentCode'
        ).name = `${creditTagetIdBase}_creditDepartmentCode`
        cloneAccountCodeItem.querySelector('.lineCreditAccountCode_creditDepartmentCode').value =
          journal.creditDepartmentCode

        // 計上金額
        cloneAccountCodeItem
          .querySelector('.inputInstallmentAmount')
          .setAttribute('name', `${tagetIdBase}_input_amount`)
        cloneAccountCodeItem.querySelector('.inputInstallmentAmount').id = `${tagetIdBase}_input_amount`
        cloneAccountCodeItem.querySelector('.inputInstallmentAmount').name = `${tagetIdBase}_input_amount`
        cloneAccountCodeItem
          .querySelector('.inputInstallmentAmount')
          .classList.add(`${tagetIdBase.split('_')[0]}_input_amount`)

        // 項目の計上金額の入力ボタン
        // 各ボタンあたりIDを割り当て
        // 計上金額の入力ボタン
        cloneAccountCodeItem.querySelector('.btn-insert-installmentAmount').id = `btn_${tagetIdBase}_installmentAmount`
        cloneAccountCodeItem.querySelector('.btn-insert-installmentAmount').dataset.target =
          'insert-installmentAmount-modal'
        cloneAccountCodeItem.querySelector(
          '.btn-insert-installmentAmount'
        ).dataset.input = `${tagetIdBase}_input_amount`
        cloneAccountCodeItem
          .querySelector('.btn-insert-installmentAmount')
          .addEventListener('click', btnInstallmentAmount)

        // 勘定科目と補助科目検索ボタン(借方)
        const btnSearchMainArray = cloneAccountCodeItem.querySelectorAll('.btn-search-main')
        Array.prototype.forEach.call(btnSearchMainArray, (item) => {
          item.dataset.target = 'accountCode-modal'
          item.dataset.info = `${tagetIdBase}`
          item.addEventListener('click', btnSearchMain($('#accountCode-modal')))
        })

        // 勘定科目と補助科目検索ボタン(貸方)
        const btnSearchCreditMain = cloneAccountCodeItem.querySelectorAll('.btn-search-creditMain')
        Array.prototype.forEach.call(btnSearchCreditMain, (item) => {
          item.dataset.target = 'creditAccountCode-modal'
          item.dataset.info = `${creditTagetIdBase}`
          item.addEventListener('click', btnSearchMainCredit($('#creditAccountCode-modal')))
        })

        // 部門データ検索ボタン(借方)
        cloneAccountCodeItem.querySelector('.btn-search-departmentCode').dataset.target = 'departmentCode-modal'
        cloneAccountCodeItem.querySelector('.btn-search-departmentCode').dataset.info = `${tagetIdBase}`
        cloneAccountCodeItem
          .querySelector('.btn-search-departmentCode')
          .addEventListener('click', btnSearchDepartmentCode($('#departmentCode-modal')))

        // 部門データ検索検索ボタン(貸方)
        cloneAccountCodeItem.querySelector('.btn-search-creditDepartmentCode').dataset.target =
          'creditDepartmentCode-modal'
        cloneAccountCodeItem.querySelector('.btn-search-creditDepartmentCode').dataset.info = `${creditTagetIdBase}`
        cloneAccountCodeItem
          .querySelector('.btn-search-creditDepartmentCode')
          .addEventListener('click', btnSearchCreditDepartmentCode($('#creditDepartmentCode-modal')))

        // マイナスボタン追加
        cloneAccountCodeItem.querySelector('.btn-minus-accountCode').id = `btn_minus_${lineNo}_accountCode`
        cloneAccountCodeItem.querySelector('.btn-minus-accountCode').dataset.target = `${tagetIdBase}`
        cloneAccountCodeItem.querySelector('.btn-minus-accountCode').addEventListener('click', btnMinusAccount)
        const target = $(`#${lineNo}`)
        target.appendChild(cloneAccountCodeItem)
      }
    })
  })
}

const getSelectedInvoiceLine = function () {
  const checkBoxLists = []

  Array.prototype.forEach.call($('.isCheckedForInvoiceLine'), (line) => {
    checkBoxLists.push(line.checked)
  })

  return checkBoxLists
}

// 入力した仕訳情報
const getBulkList = function () {
  const bulkLines = new Array(10)

  let journalIdx = 0
  do {
    bulkLines[journalIdx] = {
      // 借方
      accountCode: $('.lineAccountcodeForBulk')[journalIdx].querySelector('.input-accountCode').value,
      subAccountCode: $('.lineAccountcodeForBulk')[journalIdx].querySelector('.input-subAccountCode').value,
      departmentCode: $('.lineAccountcodeForBulk')[journalIdx].querySelector('.input-departmentCode').value,
      // 貸方
      creditAccountCode: $('.lineAccountcodeForBulk')[journalIdx].querySelector('.input-creditAccountCode').value,
      creditSubAccountCode: $('.lineAccountcodeForBulk')[journalIdx].querySelector('.input-creditSubAccountCode').value,
      creditDepartmentCode: $('.lineAccountcodeForBulk')[journalIdx].querySelector('.input-creditDepartmentCode').value
    }
    journalIdx++
  } while (journalIdx < $('.lineAccountcodeForBulk').length)
  return bulkLines
}
