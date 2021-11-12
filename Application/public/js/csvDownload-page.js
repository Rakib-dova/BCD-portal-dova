window.onload = function () {
  document.getElementById('submit').addEventListener('click', (e) => {
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
  if ('content' in document.createElement('template')) {
    document.querySelector('#sendToSearchBtn').classList.add('is-loading')
    const sendToSelectBtnField = document.querySelector('#sendToSelectBtnField')
    // 全部選択、全部解除ボタンの表示
    if (!document.querySelector('#allSelectSentToBtn') ?? false) {
      const allSelectBtnTemplate = document.querySelector('#templateAllSelectBtn')
      const cloneAllSelectBtnTemplate = document.importNode(allSelectBtnTemplate.content, true)
      cloneAllSelectBtnTemplate.children[0].children[0].id = 'allSelectSentToBtn'
      cloneAllSelectBtnTemplate.children[2].children[0].id = 'allClearSentToBtn'
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
      // 全部解除ボタンボタン機能追加
      document.querySelector('#allClearSentToBtn').addEventListener('click', (e) => {
        const sendToCompanies = document.querySelectorAll('.sendToCompanies')
        if (sendToCompanies ?? false) {
          Array.prototype.forEach.call(sendToCompanies, (item) => {
            item.checked = false
          })
        }
      })
    } else {
      const sendToSelectBtnFieldChildren = []
      Array.prototype.forEach.call(sendToSelectBtnField.children, (item) => {
        sendToSelectBtnFieldChildren.push(item)
      })
      sendToSelectBtnFieldChildren.forEach((item) => item.remove())
    }

    // 検索結果を表示
    if (!document.querySelector('#searchResultBox') ?? false) {
      const searchResultBoxTemplate = document.querySelector('#templateSearchResultBox')
      const displaySearchResultField = document.querySelector('#displaySendToSearchResultField')
      const cloneSearchResultBoxTemplate = document.importNode(searchResultBoxTemplate.content, true)
      const searchResultItemTemplate = document.querySelector('#templateSearchResultItem')

      cloneSearchResultBoxTemplate.querySelector('.box').id = 'searchResultBox'

      const dummyData = [
        'ABC 総務部',
        'ABC 人事',
        'ABC 環境',
        'ABC 自動車発展部',
        'ABC 家電事業部',
        'ABC モバイル',
        'ABC ソフトウェア',
        'ABC Embeded',
        'ABC メモリー',
        'ABC 非メモリー設計',
        'ABC メモリー設計',
        'ABC 営業',
        'ABC 特殊事業',
        'ABC 素材営業',
        'ABC 素材開発'
      ]
      dummyData.forEach((item, idx) => {
        const cloneSearchResultItemTemplate = document.importNode(searchResultItemTemplate.content, true)
        cloneSearchResultItemTemplate.querySelector('label').append(item)
        cloneSearchResultItemTemplate.querySelector('input').id = `sendTo${idx}`
        cloneSearchResultItemTemplate.querySelector('input').name = 'sendTo'
        cloneSearchResultItemTemplate.querySelector('input').classList.add('sendToCompanies')
        cloneSearchResultItemTemplate.querySelector('input').value = 'UUID1234567890'
        cloneSearchResultBoxTemplate.querySelector('.box').appendChild(cloneSearchResultItemTemplate)
      })
      displaySearchResultField.appendChild(cloneSearchResultBoxTemplate)
      document.querySelector('#form > article > div > div > div:nth-child(7)').classList.remove('is-invisible')
    } else {
      document.querySelector('#searchResultBox').remove()
      document.querySelector('#form > article > div > div > div:nth-child(7)').classList.add('is-invisible')
    }
  }
  document.querySelector('#sendToSearchBtn').classList.remove('is-loading')
})

// 受信企業検索ボタン機能
document.querySelector('#sendBySearchBtn').addEventListener('click', function (e) {
  if ('content' in document.createElement('template')) {
    document.querySelector('#sendBySearchBtn').classList.add('is-loading')
    const sendToSelectBtnField = document.querySelector('#sendBySelectBtnField')
    // 全部選択、全部解除ボタンの表示
    if (
      !document.querySelector('#allSelectSentByBtn') ??
      false & !document.querySelector('#allClearSentByBtn') ??
      false
    ) {
      const allSelectBtnTemplate = document.querySelector('#templateAllSelectBtn')
      const cloneAllSelectBtnTemplate = document.importNode(allSelectBtnTemplate.content, true)
      cloneAllSelectBtnTemplate.children[0].children[0].id = 'allSelectSentByBtn'
      cloneAllSelectBtnTemplate.children[2].children[0].id = 'allClearSentByBtn'
      sendToSelectBtnField.appendChild(cloneAllSelectBtnTemplate)

      // 全部選択ボタン機能追加
      document.querySelector('#allSelectSentByBtn').addEventListener('click', (e) => {
        const sendToCompanies = document.querySelectorAll('.sendByCompanies')
        if (sendToCompanies ?? false) {
          Array.prototype.forEach.call(sendToCompanies, (item) => {
            item.checked = true
          })
        }
      })
      // 全部解除ボタンボタン機能追加
      document.querySelector('#allClearSentByBtn').addEventListener('click', (e) => {
        const sendToCompanies = document.querySelectorAll('.sendByCompanies')
        if (sendToCompanies ?? false) {
          Array.prototype.forEach.call(sendToCompanies, (item) => {
            item.checked = false
          })
        }
      })
    } else {
      const sendToSelectBtnFieldChildren = []
      Array.prototype.forEach.call(sendToSelectBtnField.children, (item) => {
        sendToSelectBtnFieldChildren.push(item)
      })
      sendToSelectBtnFieldChildren.forEach((item) => item.remove())
    }

    // 検索結果を表示
    if (!document.querySelector('#searchResultSentByBox') ?? false) {
      const searchResultBoxTemplate = document.querySelector('#templateSearchResultBox')
      const displaySearchResultField = document.querySelector('#displaySendBySearchResultField')
      const cloneSearchResultBoxTemplate = document.importNode(searchResultBoxTemplate.content, true)
      const searchResultItemTemplate = document.querySelector('#templateSearchResultItem')

      cloneSearchResultBoxTemplate.querySelector('.box').id = 'searchResultSentByBox'

      const dummyData = [
        'ABC 総務部',
        'ABC 人事',
        'ABC 環境',
        'ABC 自動車発展部',
        'ABC 家電事業部',
        'ABC モバイル',
        'ABC ソフトウェア',
        'ABC Embeded',
        'ABC メモリー',
        'ABC 非メモリー設計',
        'ABC メモリー設計',
        'ABC 営業',
        'ABC 特殊事業',
        'ABC 素材営業',
        'ABC 素材開発'
      ]

      dummyData.forEach((item, idx) => {
        const cloneSearchResultItemTemplate = document.importNode(searchResultItemTemplate.content, true)
        cloneSearchResultItemTemplate.querySelector('label').append(item)
        cloneSearchResultItemTemplate.querySelector('input').id = `sendBy${idx}`
        cloneSearchResultItemTemplate.querySelector('input').name = 'sendBy'
        cloneSearchResultItemTemplate.querySelector('input').classList.add('sendByCompanies')
        cloneSearchResultItemTemplate.querySelector('input').value = 'UUID1234567890'
        cloneSearchResultBoxTemplate.querySelector('.box').appendChild(cloneSearchResultItemTemplate)
      })
      displaySearchResultField.appendChild(cloneSearchResultBoxTemplate)
      document.querySelector('#form > article > div > div > div:nth-child(10)').classList.remove('is-invisible')
    } else {
      document.querySelector('#form > article > div > div > div:nth-child(10)').classList.add('is-invisible')
      document.querySelector('#searchResultSentByBox').remove()
    }
  }
  document.querySelector('#sendBySearchBtn').classList.remove('is-loading')
})
