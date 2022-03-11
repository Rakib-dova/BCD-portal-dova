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

// window.onload = () => {
//   document.querySelectorAll('.tabs').forEach((tab) => {
//     tab.querySelectorAll('li').forEach((li) => {
//       li.onclick = () => {
//         tab.querySelector('li.is-active').classList.remove('is-active')
//         li.classList.add('is-active')
//         tab.nextElementSibling.querySelector('.tab-pane.is-active').classList.remove('is-active')
//         tab.nextElementSibling
//           .querySelector('.tab-pane#' + li.firstElementChild.getAttribute('id'))
//           .classList.add('is-active')
//       }
//     })
//   })
// }

Array.prototype.forEach.call(document.querySelectorAll('.linkToApproval'), (approveStatus) => {
  approveStatus.addEventListener('click', function () {
    const target = this.dataset.target
    location.href = target
  })
})

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

$('#constructTab').addEventListener('click', function () {
  const getWorkflow = new XMLHttpRequest()
  getWorkflow.open('GET', './getWorkflow')
  getWorkflow.setRequestHeader('Contet-Type', 'application/json')
  getWorkflow.onreadystatechange = function () {
    if (getWorkflow.readyState === getWorkflow.DONE) {
      const constructTab = $('.tab-pane#constructTab')[0]
      while (constructTab.firstChild) {
        constructTab.removeChild(constructTab.firstChild)
      }
      switch (getWorkflow.status) {
        case 200: {
          const response = JSON.parse(getWorkflow.response)

          if (response.length === 0) {
            const nothing = document.createElement('p')
            nothing.innerText = '現在、承認待ち請求書はありません。'
            appendChilds(constructTab, [nothing])
            return
          }

          appendChilds($('.tab-pane#constructTab')[0], [createTable()])
          response.forEach((item, idx) => {
            const row = document.createElement('tr')

            const no = document.createElement('th')
            addColumnCSS(no)
            no.innerText = idx + 1

            const invoiceNo = document.createElement('td')
            addColumnCSS(invoiceNo)
            invoiceNo.innerText = item.invoiceNo

            const status = document.createElement('td')
            addColumnCSS(status)
            status.innerText = item.status

            const workflowStatus = document.createElement('td')
            const workflowLink = document.createElement('a')
            if (item.workflowStatus === '承認依頼中') {
              workflowLink.classList.add('a-approveStatus-WAITING')
            } else {
              workflowLink.classList.add('a-approveStatus-APPROVING')
            }
            workflowLink.innerText = item.workflowStatus
            appendChilds(workflowStatus, [workflowLink])
            addColumnCSS(workflowStatus)

            const curr = document.createElement('td')
            addColumnCSS(curr)
            curr.innerText = item.curr

            const currency = document.createElement('td')
            addColumnCSS(currency)
            currency.innerText = item.current

            const sentBy = document.createElement('td')
            addColumnCSS(sentBy)
            sentBy.innerText = item.sendBy

            const sentTo = document.createElement('td')
            addColumnCSS(sentTo)
            sentTo.innerText = item.sendTo

            const updatedAt = document.createElement('td')
            addColumnCSS(updatedAt)
            updatedAt.innerText = item.updatedAt

            const expire = document.createElement('td')
            addColumnCSS(expire)
            expire.innerText = item.expire

            const btn = document.createElement('td')
            addCss(btn, ['text-center', 'display-row-td'])
            const btnLink = document.createElement('a')
            addCss(btnLink, ['button', 'is-success', 'td-overflow', 'display-row-td-btton'])
            appendChilds(btn, [btnLink])
            btnLink.setAttribute('href', `/inbox/${item.documentId}`)
            btnLink.innerText = '仕訳情報設定'

            appendChilds(row, [
              no,
              invoiceNo,
              status,
              workflowStatus,
              curr,
              currency,
              sentBy,
              sentTo,
              updatedAt,
              expire,
              btn
            ])
            appendChilds($('.tab-content > .tab-pane:nth-child(2) > .tabe > .display-row')[0], [row])
          })

          $('.tab-pane.is-active')[0].classList.remove('is-active')
          $(
            'body > div.max-width > div > div > div.box > div > div.tabs.is-boxed.is-medium > ul > li:nth-child(1)'
          )[0].classList.remove('is-active')

          $('#constructTab').classList.add('is-active')
          $(
            'body > div.max-width > div > div > div.box > div > div.tabs.is-boxed.is-medium > ul > li:nth-child(2)'
          )[0].classList.add('is-active')
          $('.tab-content > .tab-pane')[1].classList.add('is-active')
          break
        }
        default: {
          const nothing = document.createElement('p')
          nothing.innerText = 'エラーが発生しました。'
          appendChilds(constructTab, [nothing])
          $('.tab-pane.is-active')[0].classList.remove('is-active')
          $(
            'body > div.max-width > div > div > div.box > div > div.tabs.is-boxed.is-medium > ul > li:nth-child(1)'
          )[0].classList.remove('is-active')

          $('#constructTab').classList.add('is-active')
          $(
            'body > div.max-width > div > div > div.box > div > div.tabs.is-boxed.is-medium > ul > li:nth-child(2)'
          )[0].classList.add('is-active')
          $('.tab-content > .tab-pane')[1].classList.add('is-active')
          break
        }
      }
    }
  }
  getWorkflow.send()
})

$('#informationTab').addEventListener('click', function () {
  $(
    'body > div.max-width > div > div > div.box > div > div.tabs.is-boxed.is-medium > ul > li:nth-child(2)'
  )[0].classList.remove('is-active')
  $('.tab-content > .tab-pane')[1].classList.remove('is-active')

  $('.tab-pane')[0].classList.add('is-active')
  $(
    'body > div.max-width > div > div > div.box > div > div.tabs.is-boxed.is-medium > ul > li:nth-child(1)'
  )[0].classList.add('is-active')
})

function addColumnCSS(htmlElement) {
  htmlElement.classList.add('text-center')
  htmlElement.classList.add('td-overflow')
}

function appendChilds(row, columns) {
  columns.forEach((col) => {
    row.appendChild(col)
  })
}

function addCss(htmlElement, classList) {
  classList.forEach((className) => {
    htmlElement.classList.add(className)
  })
}
function createTable() {
  const table = document.createElement('table')
  addCss(table, ['tabe', 'is-fullwidth', 'is-hoverable', 'table-fixed'])

  const subTitle = [
    'No',
    '請求書番号',
    '請求書ステータス',
    '承認ステータス',
    '通貨',
    '金額',
    '送信企業',
    '受信企業',
    '更新日',
    '期限日',
    ''
  ]
  const thead = document.createElement('thead')
  const tr = document.createElement('tr')
  let idx = 0
  while (idx < 11) {
    const th = document.createElement('th')
    if (idx === 0) {
      addCss(th, ['width-5', 'text-center'])
    } else {
      addCss(th, ['width-10', 'text-center'])
    }
    th.innerText = subTitle[idx]
    appendChilds(tr, [th])
    idx++
  }
  appendChilds(thead, [tr])
  appendChilds(table, [thead])

  const tbody = document.createElement('tbody')
  addCss(tbody, ['display-row'])
  appendChilds(table, [tbody])
  return table
}
