let invoice = {}
let lines = []
const linesTbody = document.getElementById('lines')

addEvent(document, 'change', (e, target) => {
  if (e.target.className.match(/line/)) {
    updateLineValues(e, target)
    renderLines()
  }

  if (e.target.id.match(/invoice/)) {
    updateInvoiceValues(e, target)
    renderInvoice()
  }
})

function addEvent(node, type, callback) {
  if (node.addEventListener) {
    node.addEventListener(
      type,
      (e) => {
        callback(e, e.target)
      },
      false
    )
  } else if (node.attachEvent) {
    node.attachEvent('on' + type, function (e) {
      callback(e, e.srcElement)
    })
  }
}

// 請求書の値更新
const updateInvoiceValues = (e, target) => {
  const prop = target.getAttribute('data-prop')
  invoice[prop] = target.value
  console.log('==== 値更新後の invoice ====\n', invoice)
}

// 明細の値更新
const updateLineValues = (e, target) => {
  const id = target.parentNode.parentNode.getAttribute('id')
  const prop = target.getAttribute('data-prop')
  const updatedLine = lines.find((line) => parseInt(line.lineIndex) === parseInt(id))
  if (updatedLine) {
    if (prop === 'quantity' || prop === 'taxRate' || prop === 'unitPrice') {
      updatedLine[prop] = parseInt(target.value)
    } else {
      updatedLine[prop] = target.value
    }
  }
  console.log('==== 値更新後の lines ====\n', lines)
}

// 請求書のレンダリング
const renderInvoice = () => {
  console.log('==== 請求書レンダリング ====')
  for (const key of Object.keys(invoice)) {
    const element = document.querySelector(`#invoice-${key}`)
    if (element.tagName === 'INPUT') element.value = invoice[key]
    if (element.tagName === 'SPAN') element.innerHTML = invoice[key]
  }
}

// 明細のレンダリング
const renderLines = () => {
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

    // No設定
    const noTd = clone.querySelector('.line-no')
    noTd.textContent = index + 1

    // 項目ID設定
    const idInput = clone.querySelector('.line-id')
    idInput.value = line.lineId

    // 内容設定
    const descriptionInput = clone.querySelector('.line-description')
    descriptionInput.value = line.lineDiscription

    // 数量設定
    const quantityInput = clone.querySelector('.line-quantity')
    quantityInput.value = line.quantity

    // 単位設定
    const unitInput = clone.querySelector('.line-unit')
    unitInput.value = line.unit

    // 単価設定
    const unitPriceInput = clone.querySelector('.line-unit-price')
    unitPriceInput.value = line.unitPrice

    // 税設定
    const taxInput = clone.querySelector('.line-tax')
    taxInput.value = line.taxRate

    // 小計設定
    const subtotalTd = clone.querySelector('.line-subtotal')
    subtotalTd.textContent = Math.floor(line.unitPrice * line.quantity)

    // 削除ボタンの設定
    const deleteBtn = clone.querySelector('.delete-btn')

    const id = tr.getAttribute('id')
    deleteBtn.addEventListener('click', () => {
      // linesTbody.removeChild(tr)
      // document.removeEventListener("click", deleteBtn)  // メモリーリークしないように不要になったイベントを削除
      console.log('==== 削除予定 ID (lineIndex) ====\n', id)
      lines = lines.filter((line) => parseInt(line.lineIndex) !== parseInt(id))
      lines = lines.map((line, index) => {
        line.lineIndex = index
        return line
      })
      console.log('==== 削除後明細一覧 ====\n', lines)
      renderLines()
    })

    linesTbody.appendChild(tr)
  })
}

// 初期化
const init = () => {
  console.log('==== 初期化 ====')
  const invoiceDiv = document.getElementById('invoice-json')
  invoice = JSON.parse(invoiceDiv.textContent)

  renderInvoice()
  renderLines()
  // セキュリティの為請求書の情報を削除する
  invoiceDiv.textContent = ''
}

init()

// 明細行追加
const addLine = (line) => {
  lines.push({
    // invoiceId: invoice.invoiceId,
    lineId: '',
    lineIndex: lines.length,
    lineDiscription: '',
    unit: '',
    unitPrice: 0,
    quantity: 0,
    taxRate: ''
  })
  renderLines()
}

const registerInvoice = async () => {
  const url = `https://${location.host}/pdfInvoices`
  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      invoice,
      lines
    })
  }

  try {
    const response = await fetch(url, options)

    if (response.ok) {
      const res = await response.json()
      console.log('成功しました response.json:\n', res)
      location.reload()
    } else {
      console.log('失敗しました response:\n', response)
    }
  } catch (err) {
    console.error('失敗しました ERR:\n', err)
  }
}
