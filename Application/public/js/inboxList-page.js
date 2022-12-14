const searchProgressModal = document.getElementById('search-progress-modal')
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

window.onload = () => {
  const constructTabActive = document.getElementById('constructTab')
  if (constructTabActive.parentNode.classList.value === 'is-active') {
    getWorkflow()
  }
}

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
  getWorkflow()
})

function getWorkflow() {
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
          } else {
            appendChilds($('.tab-pane#constructTab')[0], [createTable()])
            response.forEach((item, idx) => {
              const row = document.createElement('tr')

              const no = document.createElement('th')
              addColumnCSS(no)
              no.innerText = idx + 1

              const invoiceNo = document.createElement('td')
              addColumnCSS(invoiceNo)
              invoiceNo.innerText = item.invoiceid

              const status = document.createElement('td')
              const statusLink = document.createElement('a')
              addColumnCSS(status)
              switch (item.status) {
                case 0:
                  addCss(statusLink, ['a-status-PAID_UNCONFIRMED'])
                  statusLink.innerText = '入金確認済み'
                  break
                case 1:
                  addCss(statusLink, ['a-status-PAID_CONFIRMED'])
                  statusLink.innerText = '送金済み'
                  break
                case 2:
                  addCss(statusLink, ['a-status-ACCEPTED'])
                  statusLink.innerText = '受理済み'
                  break
                case 3:
                  addCss(statusLink, ['a-status-DELIVERED'])
                  statusLink.innerText = '受信済み'
                  break
              }
              appendChilds(status, [statusLink])

              const workflowStatus = document.createElement('td')
              const workflowLink = document.createElement('a')
              if (item.workflowStatus === '支払依頼中') {
                workflowLink.classList.add('a-approveStatus-WAITING')
              } else {
                workflowLink.classList.add('a-approveStatus-APPROVING')
              }
              workflowLink.innerText = item.workflowStatus
              appendChilds(workflowStatus, [workflowLink])
              addColumnCSS(workflowStatus)

              const curr = document.createElement('td')
              addColumnCSS(curr)
              curr.innerText = item.currency

              const currency = document.createElement('td')
              addColumnCSS(currency)
              currency.innerText = item.amount.replace(/\B(?=(\d{3})+(?!\d))/g, ',')

              const sentBy = document.createElement('td')
              addColumnCSS(sentBy)
              sentBy.innerText = item.sendBy

              const contactAddress = document.createElement('td')
              const lightPlan = document.querySelector('#BtnInboxSearch')
              if (lightPlan) {
                if (item.managerInfo.managerName === '（ユーザー登録なし）') {
                  contactAddress.classList.add('text-color-red')
                }
                addColumnCSS(contactAddress)
                contactAddress.innerText = item.managerInfo.managerAddress + '\n' + item.managerInfo.managerName
              } else {
                addColumnCSS(contactAddress)
                contactAddress.innerText = item.managerInfo.managerAddress
              }

              const expire = document.createElement('td')
              addColumnCSS(expire)
              expire.innerText = item.expire

              const updatedAt = document.createElement('td')
              addColumnCSS(updatedAt)
              updatedAt.innerText = item.updatedAt.toLocaleString('ja-JP')

              const btn = document.createElement('td')
              addCss(btn, ['text-center', 'display-row-td'])
              const btnLink = document.createElement('a')
              addCss(btnLink, ['button', 'is-success', 'td-overflow', 'display-row-td-btton'])
              appendChilds(btn, [btnLink])
              btnLink.setAttribute('href', `/approvalInbox/${item.documentId}`)
              btnLink.innerText = '依頼内容確認'

              appendChilds(row, [
                no,
                invoiceNo,
                status,
                workflowStatus,
                curr,
                currency,
                sentBy,
                contactAddress,
                expire,
                updatedAt,
                btn
              ])
              appendChilds($('.tab-content > .tab-pane:nth-child(2) > .table > .display-row')[0], [row])
            })
          }

          if ($('.tab-pane.is-active')[0]) $('.tab-pane.is-active')[0].classList.remove('is-active')

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
}

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
  addCss(table, ['table', 'is-fullwidth', 'is-hoverable', 'table-fixed'])

  const subTitle = [
    'No',
    '請求書番号',
    '請求書ステータス',
    '承認ステータス',
    '通貨',
    '金額',
    '送信企業',
    !$('#BtnInboxSearch')
      ? '担当者アドレス'
      : `担当者アドレス
    （担当者名）`,
    '支払い期限日',
    '更新日',
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

// 送信企業のボタン作成
function sendToSelectBtnCreate() {
  const sendToSelectBtnField = document.querySelector('#sendToSelectBtnField')
  // 全部選択、全部解除ボタンの表示
  if (!document.querySelector('#allSelectSentToBtn') ?? false) {
    const allSelectBtnTemplate = document.querySelector('#templateAllSelectBtn')
    const cloneAllSelectBtnTemplate = document.importNode(allSelectBtnTemplate.content, true)
    cloneAllSelectBtnTemplate.children[0].children[0].id = 'allSelectSentToBtn'
    cloneAllSelectBtnTemplate.children[2].children[0].id = 'allClearSentToBtn'
    cloneAllSelectBtnTemplate.children[4].children[0].id = 'invisibleSentToBtn'
    sendToSelectBtnField.appendChild(cloneAllSelectBtnTemplate)

    // 全部選択ボタン機能追加
    document.querySelector('#allSelectSentToBtn').addEventListener('click', (e) => {
      const sendToCompanies = document.querySelectorAll('.sendToCompanies')
      if (sendToCompanies ?? false) {
        Array.prototype.forEach.call(sendToCompanies, (item) => {
          item.checked = true
        })
      }
    })
    // 全部解除ボタン機能追加
    document.querySelector('#allClearSentToBtn').addEventListener('click', (e) => {
      const sendToCompanies = document.querySelectorAll('.sendToCompanies')
      if (sendToCompanies ?? false) {
        Array.prototype.forEach.call(sendToCompanies, (item) => {
          item.checked = false
        })
      }
    })

    // 送信企業リスト隠すボタン機能追加
    document.querySelector('#invisibleSentToBtn').addEventListener('click', function (e) {
      const sendToSearchResultField = document.querySelector('#displaySendToSearchResultField')
      sendToSearchResultField.classList.toggle('is-invisible')
      let invisiblechk = false
      sendToSearchResultField.classList.forEach((item) => {
        if (item === 'is-invisible') {
          invisiblechk = true
        }
      })
      if (invisiblechk) {
        this.textContent = '▼'
      } else {
        this.textContent = '▲'
      }
    })
  }
}
// 送信企業検索ボタン機能
if (document.querySelector('#sendToSearchBtn')) {
  document.querySelector('#sendToSearchBtn').addEventListener('click', function (e) {
    const sendTo = document.getElementById('sendTo').value

    // レイアウト初期化
    if (
      (document.querySelector('#allSelectSentToBtn') ?? false) ||
      (document.querySelector('#allClearSentToBtn') ?? false)
    ) {
      const sendToSelectBtnFieldChildren = []
      const sendToSelectBtnField = document.querySelector('#sendToSelectBtnField')
      Array.prototype.forEach.call(sendToSelectBtnField.children, (item) => {
        sendToSelectBtnFieldChildren.push(item)
      })
      sendToSelectBtnFieldChildren.forEach((item) => item.remove())
    }

    if (document.querySelector('#searchResultBox') ?? false) {
      document.querySelector('#searchResultBox').remove()
      document
        .querySelector('#form > article > div > div > div:nth-child(3) > div:nth-child(3)')
        .classList.add('is-invisible')
      document.querySelector('#sendToSearchBtn').classList.remove('is-loading')
    }

    if ('content' in document.createElement('template')) {
      document.querySelector('#sendToSearchBtn').classList.add('is-loading')

      // 検索結果を表示
      if (!document.querySelector('#searchResultBox') ?? false) {
        const searchResultBoxTemplate = document.querySelector('#templateSearchResultBox')
        const displaySearchResultField = document.querySelector('#displaySendToSearchResultField')
        const cloneSearchResultBoxTemplate = document.importNode(searchResultBoxTemplate.content, true)
        const searchResultItemTemplate = document.querySelector('#templateSearchResultItem')

        cloneSearchResultBoxTemplate.querySelector('.box').id = 'searchResultBox'

        // 検索企業名格納
        const sendData = { companyName: sendTo }
        const requestCompaniesApi = new XMLHttpRequest()

        const elements = document.getElementsByName('_csrf')
        const csrf = elements.item(0).value

        requestCompaniesApi.open('POST', '/searchCompanies/', true)
        requestCompaniesApi.setRequestHeader('Content-Type', 'application/json')
        requestCompaniesApi.setRequestHeader('CSRF-Token', csrf)

        // 検索結果による処理
        requestCompaniesApi.onreadystatechange = function () {
          if (requestCompaniesApi.readyState === requestCompaniesApi.DONE) {
            // statusが200の場合（正常）
            if (requestCompaniesApi.status === 200) {
              const resultCompanies = JSON.parse(requestCompaniesApi.responseText)
              // 検索結果が0件の場合
              if (resultCompanies.length === 0) {
                const cloneSearchResultItemTemplate = document.importNode(searchResultItemTemplate.content, true)
                const sendToSelectBtnField = document.querySelector('#sendToSelectBtnField')
                cloneSearchResultItemTemplate.querySelector('label').textContent = '該当する企業が存在しませんでした。'
                cloneSearchResultItemTemplate.querySelector('.field ').id = 'allSelectSentToBtn'
                sendToSelectBtnField.appendChild(cloneSearchResultItemTemplate)
              } else {
                // 検索結果がある場合
                sendToSelectBtnCreate()
                resultCompanies.forEach((item, idx) => {
                  const cloneSearchResultItemTemplate = document.importNode(searchResultItemTemplate.content, true)
                  cloneSearchResultItemTemplate.querySelector('label').append(item.CompanyName)
                  cloneSearchResultItemTemplate.querySelector('input').id = `sendTo${idx}`
                  cloneSearchResultItemTemplate.querySelector('input').name = 'sentBy[]'
                  cloneSearchResultItemTemplate.querySelector('input').classList.add('sendToCompanies')
                  cloneSearchResultItemTemplate.querySelector('input').value = item.CompanyAccountId
                  cloneSearchResultBoxTemplate.querySelector('.box').appendChild(cloneSearchResultItemTemplate)
                })
                document
                  .querySelector('#form > article > div > div > div:nth-child(3) > div:nth-child(3)')
                  .classList.remove('is-invisible')
                displaySearchResultField.appendChild(cloneSearchResultBoxTemplate)
              }
            } else {
              // statusが200以外の場合（異常）
              const errortext = requestCompaniesApi.responseText
              const errStatus = requestCompaniesApi.status
              const dataTarget = document.querySelector('#searchCompany-modal')
              const modalCardBody = document.querySelector('#modal-card-result')
              modalCardBody.innerHTML = ''
              switch (errStatus) {
                case 403:
                  // 認証情報取得失敗した場合
                  modalCardBody.innerHTML = 'ログインユーザーではありません。'
                  break
                case 400:
                  // APIエラーが発生した場合
                  if (errortext) {
                    modalCardBody.innerHTML = errortext
                  } else {
                    // 入力した企業名がundefinedの場合
                    modalCardBody.innerHTML = '正しい企業名を入力してください。'
                  }
                  break
                case 500:
                  // APIエラーが発生した場合
                  modalCardBody.innerHTML = errortext
                  break
              }
              dataTarget.classList.add('is-active')
            }
          }
          document.querySelector('#sendToSearchBtn').classList.remove('is-loading')
        }
        requestCompaniesApi.send(JSON.stringify(sendData))
      }
    }
  })
}

// 検索ボタンクリック時、機能
if ($('#BtnInboxSearch')) {
  $('#BtnInboxSearch').addEventListener('click', function (e) {
    e.preventDefault()

    // 検索処理
    const form = document.querySelector('#form')
    const invoiceNumber = form.invoiceNumber.value
    const minIssuedate = form.minIssuedate.value
    const maxIssuedate = form.maxIssuedate.value
    let sentBy = form['sentBy[]']
    if (sentBy !== undefined) {
      if (sentBy.length !== undefined) {
        sentBy = Array.prototype.slice.call(sentBy)
        sentBy = sentBy.filter((ele) => ele.checked === true)
      } else {
        sentBy = sentBy.checked === true
      }

      if (!sentBy) {
        sentBy = []
      }
    } else {
      sentBy = []
    }

    let status = form['status[]']
    if (status !== undefined) {
      status = Array.prototype.slice.call(status)
      status = status.filter((ele) => ele.checked === true)
      if (!status) {
        status = []
      }
    } else {
      status = []
    }

    let unKnownManager = form.unKnownManager.checked
    if (unKnownManager === false) {
      unKnownManager = undefined
    }

    const managerAddress = form.managerAddress.value
    const validationCheck = []
    validationCheck.push(invoiceNumber)
    validationCheck.push(minIssuedate)
    validationCheck.push(maxIssuedate)
    validationCheck.push(managerAddress)
    validationCheck.push(unKnownManager)
    validationCheck.push(sentBy)
    validationCheck.push(status)
    let checkCount = 0
    for (let i = 0; i < validationCheck.length; i++) {
      if (i < 5) {
        if (validationCheck[i] === '' || validationCheck[i] === undefined) {
          ++checkCount
        }
      } else {
        if (validationCheck[i].length === 0) {
          ++checkCount
        }
      }
    }
    if (checkCount === 7) {
      alert('検索条件を入力してください。')
    } else {
      if (managerAddress.length > 0) {
        const result = managerAddressValidationCheck(managerAddress)
        if (!result) {
          alert('入力したメールアドレスに誤りがあります。')
        } else {
          searchProgressModal.classList.add('is-active')
          form.submit()
        }
      } else {
        searchProgressModal.classList.add('is-active')
        form.submit()
      }
    }
  })
}

// 検索文字に半角スペースが含まれていて先頭文字が 「"」以外の文字で始まる場合、検索不可。
function managerAddressValidationCheck(managerAddress) {
  const inputPattarnMailAddress = '^[<>{}!"$&\'()-=~:+*,._ a-zA-Z0-9-._+]+@[a-zA-Z0-9-._+]+$' // メールアドレス（緩めの条件）
  const regExp = new RegExp(inputPattarnMailAddress)
  managerAddress = managerAddress.trim()
  let regExpResult = regExp.test(managerAddress)
  if (regExpResult) {
    const mailAddressArray = managerAddress.split('@')
    const addressArray = mailAddressArray[0].split(' ')
    // 半角スペースが二つ以上入って要る場合 例："test test test"@test.com , "test  test"@test.com
    if (addressArray.length > 2) {
      regExpResult = false
    } else if (addressArray.length === 2) {
      // 例："test test"@test.com
      const firstCheck =
        addressArray[0].indexOf('"') === 0 && addressArray[0].indexOf('"') === addressArray[0].lastIndexOf('"')
      const secondCheck =
        addressArray[1].indexOf('"') === addressArray[1].length - 1 &&
        addressArray[1].indexOf('"') === addressArray[1].lastIndexOf('"')
      if (firstCheck && secondCheck) {
        regExpResult = true
      } else {
        regExpResult = false
      }
    } else {
      regExpResult = true
    }
  }
  return regExpResult
}
