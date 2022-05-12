/* global

 taxDatabase, $, addEvent, validate, getSubTotal, getTaxGroups, getTaxTotal,
 savePdfInvoice, outputPdfInvoice, formatDate

*/
let invoice = {}
let lines = []
let invoiceId
let subTotal
let taxGroups
let taxTotal
let imageFile
const linesTbody = document.getElementById('lines')

// 初期化
function init() {
  console.log('==== 初期化 ====')
  const invoiceJson = $('#invoice-json')
  const linesJson = $('#lines-json')
  invoice = JSON.parse(invoiceJson.textContent)
  for (const key of Object.keys(invoice)) {
    if (key.match(/Date/) && !location.pathname.match(/show/)) {
      invoice[key] = new Date(invoice[key])
    }

    if (key === 'invoiceId') {
      invoiceId = invoice[key]
      delete invoice.invoiceId
    }
  }
  console.log('==== invoiceId ====: ', invoiceId)
  console.log('==== invoice ====\n', invoice)
  lines = JSON.parse(linesJson.textContent)
  console.log('==== lines ====\n', lines)

  setStaticProp(invoice, lines)

  if (location.pathname.match(/register/)) {
    addLine()
  } else if (location.pathname.match(/edit/)) {
    renderLines()
    renderInvoice()
    renderTotals()
  } else {
    renderTotals()
  }

  invoiceJson.textContent = ''
  linesJson.textContent = ''
}
init()

// 固定値要素のレンダリング
function setStaticProp(invoice, lines) {
  $('#invoice-sendCompany').textContent = invoice.sendCompany
  $('#invoice-sendPost').textContent = invoice.sendPost
  $('#invoice-sendAddr1').textContent = invoice.sendAddr1
  $('#invoice-sendAddr2').textContent = invoice.sendAddr2
  $('#invoice-sendAddr3').textContent = invoice.sendAddr3

  if (location.pathname.match(/show/)) {
    $('#invoice-recCompany').textContent = invoice.recCompany
    $('#invoice-recPost').textContent = invoice.recPost
    $('#invoice-recAddr1').textContent = invoice.recAddr1
    $('#invoice-recAddr2').textContent = invoice.recAddr2
    $('#invoice-recAddr3').textContent = invoice.recAddr3

    $('#invoice-invoiceNo').textContent = invoice.invoiceNo
    $('#invoice-billingDate').textContent = formatDate(new Date(invoice.billingDate), 'YYYY年MM月DD日')
    $('#invoice-currency').textContent = invoice.currency
    $('#invoice-paymentDate').textContent = formatDate(new Date(invoice.paymentDate), 'YYYY年MM月DD日')
    $('#invoice-deliveryDate').textContent = formatDate(new Date(invoice.deliveryDate), 'YYYY年MM月DD日')

    $('#invoice-bankName').textContent = invoice.bankName
    $('#invoice-branchName').textContent = invoice.branchName
    $('#invoice-accountType').textContent = invoice.accountType
    $('#invoice-accountNumber').textContent = invoice.accountNumber
    $('#invoice-accountName').textContent = invoice.accountName

    lines.forEach((line) => {
      // テンプレートの複製
      const template = document.getElementById('line-template')
      const clone = template.content.cloneNode(true)
      // IDの設定
      const tr = clone.querySelector('tr')
      // 項目ID設定
      const lineId = clone.querySelector('.line-lineId')
      lineId.textContent = line.lineId
      // 内容設定
      const lineDescription = clone.querySelector('.line-lineDiscription')
      lineDescription.textContent = line.lineDiscription
      // 数量設定
      const quantity = clone.querySelector('.line-quantity')
      quantity.textContent = line.quantity
      // 単位設定
      const unit = clone.querySelector('.line-unit')
      unit.textContent = line.unit
      // 単価設定
      const unitPrice = clone.querySelector('.line-unitPrice')
      unitPrice.textContent = line.unitPrice
      // 税設定
      const taxType = clone.querySelector('.line-taxType')
      taxType.textContent = getTaxTypeIndex(line.taxType)
      // 小計設定
      const subtotal = clone.querySelector('.line-subtotal')
      subtotal.textContent = Math.floor(line.unitPrice * line.quantity)

      linesTbody.appendChild(tr)
    })
  }
}

// 入力があった時の処理
addEvent(document, 'change', (e, target) => {
  // 請求書関連の 値更新 & レンダリング
  if (e.target.id.match(/invoice/)) {
    updateInvoiceValues(e, target)
    renderInvoice()
  }

  // 明細関連の 値更新 & レンダリング
  if (e.target.className.match(/line/)) {
    updateLineValues(e, target)
    renderLines()
    renderTotals()
  }

  // 画像が設定されたらプレビュに反映させる処理
  if (e.target.id === 'file-sealImp') {
    const fr = new FileReader()
    fr.onload = function() {
      $('#sealImp').setAttribute('src', fr.result)
    }

    console.log('==== e.target.files[0] ====\n', e.target.files[0])

    if (e.target.files[0]) {
      imageFile = e.target.files[0]
      console.log('==== キャッシュ保存 ====')
      fr.readAsDataURL(e.target.files[0])
    }
  }
})

// 請求書の値更新
function updateInvoiceValues(e, target) {
  const prop = target.getAttribute('data-prop')
  invoice[prop] = target.value
  console.log('==== 値更新後の invoice ====\n', invoice)
}

// 明細の値更新
function updateLineValues(e, target) {
  const id = target.parentNode.parentNode.getAttribute('id')
  const prop = target.getAttribute('data-prop')
  const updatedLine = lines.find((line) => parseInt(line.lineIndex) === parseInt(id))
  if (updatedLine) {
    if (prop === 'quantity' || prop === 'unitPrice') {
      updatedLine[prop] = parseInt(target.value)
    } else {
      updatedLine[prop] = target.value
    }
  }
  console.log('==== 値更新後の lines ====\n', lines)
}

// 請求書のレンダリング
function renderInvoice() {
  console.log('==== 請求書レンダリング ====')
  for (const key of Object.keys(invoice)) {
    const element = $(`#invoice-${key}`)

    if (element?.tagName === 'INPUT' || element?.tagName === 'TEXTAREA') {
      if (element.type === 'date') element.valueAsDate = new Date(invoice[key])
      else element.value = invoice[key]
    }
  }
}

// 明細のレンダリング
function renderLines() {
  console.log('==== 明細レンダリング ====')

  // 明細を全削除
  while (linesTbody.firstChild) {
    const deleteBtn = linesTbody.firstChild.querySelector('.delete-btn')
    document.removeEventListener('click', deleteBtn) // メモリーリークしないように不要になったイベントを削除
    linesTbody.removeChild(linesTbody.firstChild)
  }

  lines.forEach((line, index) => {
    // テンプレートの複製
    const template = document.getElementById('line-template')
    const clone = template.content.cloneNode(true)
    // IDの設定
    const tr = clone.querySelector('tr')
    tr.setAttribute('id', line.lineIndex)
    // 項目ID設定
    const lineIdInput = clone.querySelector('.line-lineId')
    lineIdInput.value = line.lineId
    // 内容設定
    const lineDescriptionInput = clone.querySelector('.line-lineDiscription')
    lineDescriptionInput.value = line.lineDiscription
    // 数量設定
    const quantityInput = clone.querySelector('.line-quantity')
    quantityInput.value = line.quantity
    // 単位設定
    const unitInput = clone.querySelector('.line-unit')
    unitInput.value = line.unit
    // 単価設定
    const unitPriceInput = clone.querySelector('.line-unitPrice')
    unitPriceInput.value = line.unitPrice
    // 税設定
    const taxTypeSelect = clone.querySelector('.line-taxType')
    taxTypeSelect.selectedIndex = getTaxTypeIndex(line.taxType)
    // 小計設定
    const subtotalTd = clone.querySelector('.line-subtotal')
    subtotalTd.textContent = Math.floor(line.unitPrice * line.quantity)
    // 削除ボタンの作成&追加
    const actionTd = clone.querySelector('.line-action')
    const deleteBtn = document.createElement('a')
    deleteBtn.className = 'delete-btn'
    const deleteBtnIcon = document.createElement('i')
    deleteBtnIcon.className = 'fas fa-minus-circle red-color'
    deleteBtn.appendChild(deleteBtnIcon)
    deleteBtn.addEventListener('click', () => {
      lines = lines.filter((_line) => parseInt(_line.lineIndex) !== parseInt(line.lineIndex))
      // lineIndex 更新
      lines = lines.map((line, index) => {
        line.lineIndex = index
        return line
      })
      renderLines()
      renderTotals()
    })

    actionTd.appendChild(deleteBtn)
    linesTbody.appendChild(tr)
  })

  if (lines.length < 20) {
    const template = document.getElementById('line-add-btn')
    const clone = template.content.cloneNode(true)
    const addBtn = clone.querySelector('a')
    addBtn.onclick = addLine
    const tr = clone.querySelector('tr')
    linesTbody.appendChild(tr)
  }
}

// 合計関連のレンダリング
function renderTotals() {
  subTotal = getSubTotal(lines)
  taxGroups = getTaxGroups(lines, taxDatabase)
  taxTotal = getTaxTotal(taxGroups)

  // 小計 (税抜)
  const subTotalDiv = $('#subTotal')
  subTotalDiv.textContent = subTotal

  // 税区分を全部削除
  const totalParentDiv = $('#total').parentNode
  const taxGroupDivs = $('.taxGroup')
  taxGroupDivs.forEach((node) => node.remove())

  taxGroups.forEach((taxGroup) => {
    if (taxGroup.taxGroupTotal === 0) return
    const template = document.getElementById('taxGroup-template')
    const clone = template.content.cloneNode(true)
    const taxGroupDiv = clone.querySelector('.taxGroup')

    const taxGroupLabel = clone.querySelector('.taxGroupLabel')
    const taxRate = taxGroup.type.replace('tax', '').replace('p', '')
    taxGroupLabel.textContent = `${taxGroup.subTotal}円のJP 消費税 ${taxRate}%`
    taxGroupDiv.appendChild(taxGroupLabel)

    const taxGroupValue = clone.querySelector('.taxGroupValue')
    taxGroupValue.textContent = taxGroup.taxGroupTotal
    taxGroupDiv.appendChild(taxGroupValue)
    totalParentDiv.before(taxGroupDiv)
  })

  // 合計
  const totalDiv = $('#total')
  totalDiv.textContent = subTotal + taxTotal

  // 税額合計
  const taxTotalDiv = $('#taxTotal')
  taxTotalDiv.textContent = `税額合計 ${taxTotal} 円`
}

// 明細行追加
function addLine(){  // eslint-disable-line
  if (lines.length >= 20) return

  lines.push({
    lineIndex: lines.length,
    lineId: '',
    lineDiscription: '',
    unit: '',
    unitPrice: '',
    quantity: '',
    taxType: ''
  })
  renderLines()
  renderTotals()
}

$('#output-modal-btn')?.addEventListener('click', async () => {
  if (!validate(invoice, lines)) return alert('入力項目に不備があります。')

  $('#output-modal').className = 'modal is-active'
})

$('#save-btn')?.addEventListener('click', async () => {
  if (!validate(invoice, lines)) return alert('入力項目に不備があります。')

  const response = await savePdfInvoice(invoice, lines, imageFile, invoiceId)
  const res = await response?.json()
  console.log('成功しました response.json:\n', res)
  invoiceId = res.invoice?.invoiceId
})

$('#output-btn')?.addEventListener('click', async () => {
  // if (!validate(invoice, lines)) return alert('入力項目に不備があります。')

  invoice.subTotal = subTotal
  invoice.taxGroups = taxGroups
  invoice.taxTotal = taxTotal
  invoice.total = subTotal + taxTotal
  await outputPdfInvoice(invoice, lines, imageFile, invoiceId)
})

function getTaxTypeIndex(taxType) {
  switch (taxType) {
    case 'freeTax':
      return 0
    case 'dutyFree':
      return 1
    case 'tax10p':
      return 2
    case 'tax8p':
      return 3
    case 'otherTax':
      return 4
  }
}

// $('#delete-btn')?.addEventListener('click', async () => {
//   const url = `https://${location.host}/pdfInvoices/${invoiceId}`
//   const options = {
//     method: 'DELETE',
//     headers: { credentials: 'include' },
//   }

//   try {
//     const response = await fetch(url, options)

//     if (response.ok) {
//       const res = await response.json()
//       console.log('成功しました response.json:\n', res)
//       location.href = `https://${location.host}/pdfInvoices/list`
//     } else {
//       console.log('失敗しました response:\n', response)
//     }
//   } catch (err) {
//     console.error('失敗しました ERR:\n', err)
//   }
// })
