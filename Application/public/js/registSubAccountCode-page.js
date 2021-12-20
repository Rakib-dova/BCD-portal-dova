// 「確認」ボタンの機能（バリデーションチェック）
document.getElementById('btnCheck').addEventListener('click', function (e) {
  // 英数文字正規式
  const regExpEngNumber = '^[a-zA-Z0-9+]*$'
  let errorFlag = false

  if (this.getAttribute('disabled') !== null) {
    return
  }

  document.querySelector('#RequiredErrorMesageForCode').classList.add('is-invisible')
  document.querySelector('#RequiredErrorMesageForName').classList.add('is-invisible')

  // 勘定科目コードが未入力の場合
  if (document.querySelector('#setSubAccountCodeInputId').value.length === 0) {
    document.querySelector('#RequiredErrorMesageForCode').innerHTML = '勘定科目コードが未入力です。'
    document.querySelector('#RequiredErrorMesageForCode').classList.remove('is-invisible')
    errorFlag = true
  }

  // 勘定科目コードの英数文字ではない場合
  if (
    !document.querySelector('#setSubAccountCodeInputId').value.match(regExpEngNumber) &&
    document.querySelector('#setSubAccountCodeInputId').value.length > 0 &&
    document.querySelector('#setSubAccountCodeInputId').value.length < 11
  ) {
    document.querySelector('#RequiredErrorMesageForCode').innerHTML = '入力値が間違いました。'
    document.querySelector('#RequiredErrorMesageForCode').classList.remove('is-invisible')
    errorFlag = true
  }

  // 勘定科目コードが10桁以上の場合
  if (document.querySelector('#setSubAccountCodeInputId').value.length > 10) {
    document.querySelector('#RequiredErrorMesageForCode').innerHTML = '勘定科目コードは10桁まで入力してください。'
    document.querySelector('#RequiredErrorMesageForCode').classList.remove('is-invisible')
    errorFlag = true
  }

  // 勘定科目名が未入力の場合
  if (document.querySelector('#setSubAccountCodeNameInputId').value.length === 0) {
    document.querySelector('#RequiredErrorMesageForName').innerHTML = '勘定科目名が未入力です。'
    document.querySelector('#RequiredErrorMesageForName').classList.remove('is-invisible')
    errorFlag = true
  }

  // 勘定科目名が40桁以上の場合
  if (document.querySelector('#setSubAccountCodeNameInputId').value.length > 40) {
    document.querySelector('#RequiredErrorMesageForName').innerHTML = '勘定科目名は40桁まで入力してください。'
    document.querySelector('#RequiredErrorMesageForName').classList.remove('is-invisible')
    errorFlag = true
  }

  if (errorFlag) {
    // バリデーションが合わないとき
    return false
  } else {
    // バリデーションが合うとき
    const checkBoxInputs = document.querySelectorAll('.inputCheckbox')
    let targetCheckbox = null
    Array.prototype.forEach.call(checkBoxInputs, (item) => {
      if (item.checked) {
        targetCheckbox = item
      }
    })
    document.querySelector('#checksetAccountCodeInputId').innerText = targetCheckbox.parentElement.innerText
    document.querySelector('#checksetSubAccountCodeInputId').innerText =
      document.querySelector('#setSubAccountCodeInputId').value
    document.querySelector('#checksetSubAccountNameInputId').innerText = document.querySelector(
      '#setSubAccountCodeNameInputId'
    ).value
    document.querySelector('#check-modal').classList.add('is-active')
  }
})

// 確認画面で「登録」ボタンを押すの場合、サーバーにデータを伝送
document.querySelector('#submit').addEventListener('click', () => {
  document.querySelector('#form').submit()
})

// 再検索の時、前の結果を消す
const deleteDisplayAccountCode = function () {
  const displayFieldBody = document.querySelector('#displayFieldBody')
  if (displayFieldBody.children.length !== 0) {
    const chidrenItem = []
    Array.prototype.forEach.call(displayFieldBody.children, (item) => {
      chidrenItem.push(item)
    })
    chidrenItem.forEach((item) => {
      displayFieldBody.removeChild(item)
    })
  }
  document.querySelector('#displayInvisible').classList.add('is-invisible')
}

// 検索結果を画面に表示
const displayAccountCode = function (accountCodeArr) {
  const displayFieldBody = document.querySelector('#displayFieldBody')
  const searchResultAccountCode = document.querySelector('#searchResultAccountCode')
  accountCodeArr.forEach((item) => {
    const cloneSearchResultAccountCodeTemplate = document.importNode(searchResultAccountCode.content, true)
    cloneSearchResultAccountCodeTemplate.querySelector('.columnAccountcode').innerText = item.accountCode
    cloneSearchResultAccountCodeTemplate.querySelector('.columnAccountCodeName').innerText = item.accountCodeName
    cloneSearchResultAccountCodeTemplate.querySelector('.inputCheckbox').value = item.accountCodeId
    displayFieldBody.appendChild(cloneSearchResultAccountCodeTemplate)
  })

  document.querySelector('#displayInvisible').classList.remove('is-invisible')
}

// 勘定科目コードの重複チェック防止
const inputEvent = () => {
  Array.prototype.forEach.call(document.querySelectorAll('.inputCheckbox'), (item) => {
    item.addEventListener('click', function () {
      this.parentElement.parentElement.parentElement.parentElement.parentElement.parentElement.classList.toggle(
        'is-selected'
      )
      const checkBox = document.querySelectorAll('.inputCheckbox')
      for (let idx = 0; idx < checkBox.length; idx++) {
        if (this !== checkBox[idx]) {
          checkBox[idx].checked = false
        }
      }
    })
  })
  Array.prototype.forEach.call(document.querySelectorAll('#displayFieldBody > tr'), (item) => {
    item.addEventListener('click', function () {
      const $this = this
      const $thisRowCheckbox = $this.querySelector('input')
      if ($thisRowCheckbox.checked) {
        $this.querySelector('input').checked = false
      } else {
        $this.querySelector('input').checked = true
      }
      const checkBox = document.querySelectorAll('.inputCheckbox')
      for (let idx = 0; idx < checkBox.length; idx++) {
        if ($thisRowCheckbox !== checkBox[idx]) {
          checkBox[idx].checked = false
        }
      }
      for (let idx = 0; idx < document.querySelectorAll('#displayFieldBody > tr').length; idx++) {
        if ($this !== document.querySelectorAll('#displayFieldBody > tr')[idx]) {
          document.querySelectorAll('#displayFieldBody > tr')[idx].classList.remove('is-selected')
        }
      }
      $this.classList.toggle('is-selected')
    })
  })
}

// 勘定科目コード検索が０けんの場合
const displayNoAccountCode = function () {
  const displayFieldBody = document.querySelector('#displayFieldBody')
  const searchResultAccountCode = document.querySelector('#searchResultAccountCode')
  const cloneSearchResultAccountCodeTemplate = document.importNode(searchResultAccountCode.content, true)
  cloneSearchResultAccountCodeTemplate.querySelector('p').innerText = '検索した勘定科目を見つかれませんでした。'
  displayFieldBody.appendChild(cloneSearchResultAccountCodeTemplate)
  document.querySelector('#displayInvisible').classList.remove('is-invisible')
}

// 勘定科目コード検索
document.querySelector('#btnSearchAccountCode').addEventListener('click', function () {
  const accountCode = document.querySelector('#setAccountCodeInputId').value
  const accountCodeName = document.querySelector('#setAccountCodeNameInputId').value

  const $this = this
  deleteDisplayAccountCode()
  const getAccountCode = new XMLHttpRequest()
  getAccountCode.open('POST', '/registSubAccountCode/getAccountCode')
  getAccountCode.setRequestHeader('Content-Type', 'application/json')
  getAccountCode.onreadystatechange = function () {
    if (getAccountCode.readyState === getAccountCode.DONE) {
      switch (getAccountCode.status) {
        case 200: {
          const result = JSON.parse(getAccountCode.response)
          if (result.length !== 0) {
            displayAccountCode(result)
            inputEvent()
          } else {
            displayNoAccountCode()
          }
          break
        }
        default: {
          deleteDisplayAccountCode()
          break
        }
      }
    }
    $this.classList.remove('is-loading')
  }
  $this.classList.add('is-loading')
  getAccountCode.send(JSON.stringify({ accountCode: accountCode, accountCodeName: accountCodeName }))
})

// クリアボタン
document.querySelector('#btnClear').addEventListener('click', () => {
  document.querySelector('#setAccountCodeInputId').value = ''
  document.querySelector('#setAccountCodeNameInputId').value = ''
  deleteDisplayAccountCode()
  document.querySelector('#btnCheck').setAttribute('disabled', '')
})

// event発生時、入力データをチェックして、「確認」ボタン活性化する。
document.querySelector('body').addEventListener('change', function (event) {
  const sbuAccountCodeInput = document.querySelector('#setSubAccountCodeInputId')
  const sbuAccountCodeNameInput = document.querySelector('#setSubAccountCodeNameInputId')
  const checkBoxInputs = document.querySelectorAll('.inputCheckbox')
  let targetCheckbox = null
  Array.prototype.forEach.call(checkBoxInputs, (item) => {
    if (item.checked) {
      targetCheckbox = item
    }
  })

  document.querySelector('#btnCheck').setAttribute('disabled', '')

  if (sbuAccountCodeInput.value.length !== 0 && sbuAccountCodeNameInput.value.length !== 0 && targetCheckbox) {
    document.querySelector('#btnCheck').removeAttribute('disabled')
  }
})
