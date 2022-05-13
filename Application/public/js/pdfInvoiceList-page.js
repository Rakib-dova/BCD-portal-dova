/* global $ */

const itemsPerPage = 20
let itemCount
let pageCount
let curPageIndex = 0
let items = []
let displayItems = []

const itemListTable = document.querySelector('#item-list')
const pageButtonsUl = document.querySelector('.pagination-list')

function getDisplayItems(curPageIndex) {
  return items.filter((_, index) => {
    return (index >= curPageIndex * itemsPerPage && index < (curPageIndex * itemsPerPage + itemsPerPage))
  })
}

function renderItems(curPageIndex) {
  // アイテムを全削除
  while (itemListTable.firstChild) {
    itemListTable.removeChild(itemListTable.firstChild)
  }

  displayItems = getDisplayItems(curPageIndex)

  displayItems.forEach((item, index) => {
    // テンプレートの複製
    const template = document.getElementById('pfdInvoice-template')
    const clone = template.content.cloneNode(true)
    const tr = clone.querySelector('tr')
    // No設定
    const noTh = clone.querySelector('.no')
    noTh.textContent = index + 1
    // 項目ID設定
    const invoiceNoTd = clone.querySelector('.invoiceNo')
    invoiceNoTd.textContent = item.invoiceNo
    // 宛先設定
    const recCompanyTd = clone.querySelector('.recCompany')
    recCompanyTd.textContent = item.recCompany
    // 金額設定
    const totalTd = clone.querySelector('.total')
    totalTd.textContent = item.total
    // 更新設定
    const updatedAtTd = clone.querySelector('.updatedAt')
    updatedAtTd.textContent = item.updatedAt
    // 期限日設定
    const paymentDateTd = clone.querySelector('.paymentDate')
    paymentDateTd.textContent = item.paymentDate
    // ステータス設定
    const statusTd = clone.querySelector('.status')
    statusTd.textContent = item.tmpFlg ? '出力済み' : 'ドラフト'
    // リンクボタン設定
    const linkButtonTd = clone.querySelector('.link-btn')
    const linkButtonA = document.createElement('a')
    linkButtonTd.appendChild(linkButtonA)
    linkButtonA.className = 'button is-success'
    linkButtonA.setAttribute('href',
      item.tmpFlg
        ? `/pdfInvoices/show/${item.invoiceId}`
        : `/pdfInvoices/edit/${item.invoiceId}`)
    linkButtonA.textContent = item.tmpFlg ? '確認・出力' : '編集・出力'

    itemListTable.appendChild(tr)
  })
}

const renderPagination = () => {
  while (pageButtonsUl.firstChild) {
    const linkBtn = pageButtonsUl.firstChild.querySelector('.pagination-link')
    document.removeEventListener('click', linkBtn) // メモリーリークしないように不要になったイベントを削除
    pageButtonsUl.removeChild(pageButtonsUl.firstChild)
  }

  renderPrevButton()
  renderPageButtons()
  renderNextButton()
}

const renderPrevButton = () => {
  const pageLi = document.createElement('li')
  const pageA = document.createElement('a')
  pageA.textContent = '<'
  pageA.className = 'pagination-link'
  pageLi.appendChild(pageA)
  if (curPageIndex === 0) {
    pageA.style.color = 'lightgray'
    pageA.style.cursor = 'default'
  } else {
    pageA.style.color = 'rgb(54, 54, 54)"'
    pageA.style.cursor = 'pointer'
    pageA.addEventListener('click', () => {
      curPageIndex = curPageIndex - 1
      renderItems(curPageIndex)
      renderPagination()
    })
  }

  pageButtonsUl.appendChild(pageLi)
}

const renderNextButton = () => {
  const pageLi = document.createElement('li')
  const pageA = document.createElement('a')
  pageA.textContent = '>'
  pageA.className = 'pagination-link'
  pageLi.appendChild(pageA)
  if (curPageIndex === pageCount - 1) {
    pageA.style.color = 'lightgray'
    pageA.style.cursor = 'default'
  } else {
    pageA.style.color = 'rgb(54, 54, 54)'
    pageA.style.cursor = 'pointer'
    pageA.addEventListener('click', () => {
      curPageIndex = curPageIndex + 1
      renderItems(curPageIndex)
      renderPagination()
    })
  }
  pageButtonsUl.appendChild(pageLi)
}

const renderPageButtons = () => {
  for (let i = 0; i < pageCount; i++) {
    const pageLi = document.createElement('li')
    const pageA = document.createElement('a')
    pageLi.appendChild(pageA)
    if (i === curPageIndex) pageA.className = 'pagination-link is-current'
    else pageA.className = 'pagination-link'
    pageA.textContent = String(i + 1)
    pageA.addEventListener('click', () => {
      curPageIndex = i
      renderItems(i)
      renderPagination()
    })
    pageButtonsUl.appendChild(pageLi)
  }
}

// 初期化
const init = () => {
  const invoicesJson = $('#invoices-json')
  items = JSON.parse(invoicesJson.textContent)
  console.log('==== items ====: ', items)
  itemCount = items.length
  pageCount = Math.ceil(itemCount / itemsPerPage)

  renderItems(curPageIndex)
  if (pageCount > 1) {
    renderPagination()
  }
}
init()
