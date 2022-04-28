window.onload = function () {
  document.getElementById('submit').addEventListener('click', (e) => {
    document.querySelector('#RequiredErrorMesageField').classList.add('is-invisible')
    if (!checkRadioButton()) {
      return false
    }

    if (!serviceDataFormatCheck()) {
      return false
    }

    document.querySelector('#form').submit()
  })
}

addEvent(document, 'change', function (e, target) {
  instantValidation(target)
})

function addEvent(node, type, callback) {
  if (node.addEventListener) {
    node.addEventListener(
      type,
      function (e) {
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

function shouldBeValidated(field) {
  return (
    !(field.getAttribute('readonly') || field.readonly) &&
    !(field.getAttribute('disabled') || field.disabled) &&
    (field.getAttribute('pattern') || field.getAttribute('required'))
  )
}

function instantValidation(field) {
  if (shouldBeValidated(field)) {
    const invalid =
      (field.getAttribute('required') && !field.value) ||
      (field.getAttribute('pattern') && field.value && !new RegExp(field.getAttribute('pattern')).test(field.value))
    if (!invalid && field.getAttribute('aria-invalid')) {
      field.removeAttribute('aria-invalid')
    } else if (invalid && !field.getAttribute('aria-invalid')) {
      field.setAttribute('aria-invalid', 'true')
    }
  }
}

// 送信企業検索ボタン機能
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
    document.querySelector('#form > article > div > div > div:nth-child(6)').classList.add('is-invisible')
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

      requestCompaniesApi.open('POST', '/searchCompanies/', true)
      requestCompaniesApi.setRequestHeader('Content-Type', 'application/json')

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
                cloneSearchResultItemTemplate.querySelector('input').name = 'sentBy'
                cloneSearchResultItemTemplate.querySelector('input').classList.add('sendToCompanies')
                cloneSearchResultItemTemplate.querySelector('input').value = item.CompanyAccountId
                cloneSearchResultBoxTemplate.querySelector('.box').appendChild(cloneSearchResultItemTemplate)
              })
              document.querySelector('#form > article > div > div > div:nth-child(6)').classList.remove('is-invisible')
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

// ラジオボタンバリデーションチェック
function checkRadioButton() {
  if (
    (document.getElementById('finalapproval').checked || document.getElementById('noneFinalapproval').checked) &&
    !(document.getElementById('finalapproval').checked && document.getElementById('noneFinalapproval').checked)
  ) {
    document.querySelector('#RequiredErrorMesageField').classList.add('is-invisible')
    return true
  } else {
    document.querySelector('#RequiredErrorMesage').innerHTML = 'ダウンロード対象を選択してください。'
    document.querySelector('#RequiredErrorMesageField').classList.remove('is-invisible')
    return false
  }
}

// 選択した出力フォーマット名設定
document.getElementById('serviceDataFormat').addEventListener('change', function (e) {
  const target = this.options
  document.getElementById('serviceDataFormatName').value = target[target.selectedIndex].text
})

// 選択した出力フォーマット名と値を確認
const serviceDataFormatCheck = function () {
  const target = document.getElementById('serviceDataFormat').options

  if (document.getElementById('serviceDataFormatName').value === target[target.selectedIndex].text) {
    return true
  } else {
    document.querySelector('#RequiredErrorMesage').innerHTML = '選択したダウンロード対象には誤りがあります。'
    document.querySelector('#RequiredErrorMesageField').classList.remove('is-invisible')
    return false
  }
}
