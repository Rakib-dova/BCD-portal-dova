/* global $, addEvent */
let invoice = {}
let lines = []
let invoiceId
const linesTbody = document.getElementById('lines')
const taxDatabase = [
  { type: 'tax10p', taxRate: 0.1 },
  { type: 'tax8p', taxRate: 0.08 }
]

// 初期化
function init() {
  console.log('==== 初期化 ====')
  const invoiceJson = $('#invoice-json')
  const linesJson = $('#lines-json')
  invoice = JSON.parse(invoiceJson.textContent)
  for (const key of Object.keys(invoice)) {
    if (key.match(/Date/)) {
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

  $('#invoice-sendCompany').innerHTML = invoice.sendCompany
  $('#invoice-sendPost').innerHTML = invoice.sendPost
  $('#invoice-sendAddr1').innerHTML = invoice.sendAddr1
  $('#invoice-sendAddr2').innerHTML = invoice.sendAddr2
  $('#invoice-sendAddr3').innerHTML = invoice.sendAddr3

  renderInvoice()
  renderLines()
  renderTotals()
  invoiceJson.textContent = ''
  linesJson.textContent = ''
}
init()

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
    fr.readAsDataURL(e.target.files[0])
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
    deleteBtnIcon.className = 'fas fa-minus-circle'
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

  const template = document.getElementById('line-add-btn')
  const clone = template.content.cloneNode(true)
  const addBtn = clone.querySelector('a')
  addBtn.onclick = addLine
  const tr = clone.querySelector('tr')
  linesTbody.appendChild(tr)
}

// 合計関連のレンダリング
function renderTotals() {
  const subTotal = getSubTotal(lines)
  const taxGroups = getTaxGroups(lines, taxDatabase)
  const taxTotal = getTaxTotal(taxGroups)

  // 小計 (税抜)
  const subTotalDiv = $('#subTotal')
  subTotalDiv.textContent = subTotal

  // 税区分ごとの合計
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
  lines.push({
    lineIndex: lines.length,
    lineId: '',
    lineDiscription: '',
    unit: '',
    unitPrice: 0,
    quantity: 0,
    taxType: ''
  })
  renderLines()
  renderTotals()
}

$('#save-btn')?.addEventListener('click', async () => {
  const uploadfiles = $('#file-sealImp')
  const formData = new FormData()
  formData.append('sealImp', uploadfiles.files[0])
  formData.append('invoice', JSON.stringify(invoice))
  formData.append('lines', JSON.stringify(lines))

  const url = `https://${location.host}/pdfInvoices`
  const options = {
    method: 'POST',
    headers: { credentials: 'include' },
    body: formData
  }

  try {
    const response = await fetch(url, options)

    if (response.ok) {
      const res = await response.json()
      console.log('成功しました response.json:\n', res)
      location.href = `https://${location.host}/pdfInvoices/list`
    } else {
      console.log('失敗しました response:\n', response)
    }
  } catch (err) {
    console.error('失敗しました ERR:\n', err)
  }
})

$('#update-btn')?.addEventListener('click', async () => {
  const uploadfiles = $('#file-sealImp')
  const formData = new FormData()
  formData.append('sealImp', uploadfiles.files[0])
  formData.append('invoice', JSON.stringify(invoice))
  formData.append('lines', JSON.stringify(lines))

  const url = `https://${location.host}/pdfInvoices/${invoiceId}`
  const options = {
    method: 'PUT',
    headers: { credentials: 'include' },
    body: formData
  }

  try {
    const response = await fetch(url, options)

    if (response.ok) {
      const res = await response.json()
      console.log('成功しました response.json:\n', res)
      location.href = `https://${location.host}/pdfInvoices/list`
    } else {
      console.log('失敗しました response:\n', response)
    }
  } catch (err) {
    console.error('失敗しました ERR:\n', err)
  }
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

function getSubTotal(lines) {
  let total = 0
  lines.forEach((line) => total += (line.unitPrice * line.quantity)) // eslint-disable-line
  return total
}

function getTaxGroups(lines, taxDatabase) {
  const taxGroups = []

  taxDatabase.forEach((tax) => {
    const taxGroup = { type: tax.type, subTotal: 0, taxGroupTotal: 0 }

    lines.forEach((line) => {
      if (line.taxType === tax.type) {
        taxGroup.subTotal += Math.floor(line.unitPrice * line.quantity)
        taxGroup.taxGroupTotal += Math.floor(line.unitPrice * line.quantity * tax.taxRate)
      }
    })

    taxGroups.push(taxGroup)
  })

  return taxGroups
}

function getTaxTotal(taxGroups) {
  let taxTotal = 0
  taxGroups.forEach((taxGroup) => taxTotal += taxGroup.taxGroupTotal) // eslint-disable-line
  return taxTotal
}
