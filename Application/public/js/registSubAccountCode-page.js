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
  } else {
    return null
  }
  return Object.assign(selectors, Array.prototype, (type, event) => {
    document.addEventListener(type, event)
  })
}

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

  // 補助科目コードが未入力の場合
  if (document.querySelector('#setSubAccountCodeInputId').value.length === 0) {
    document.querySelector('#RequiredErrorMesageForCode').innerHTML = '補助科目コードが未入力です。'
    document.querySelector('#RequiredErrorMesageForCode').classList.remove('is-invisible')
    errorFlag = true
  }

  // 補助科目コードの英数文字ではない場合
  if (
    !document.querySelector('#setSubAccountCodeInputId').value.match(regExpEngNumber) &&
    document.querySelector('#setSubAccountCodeInputId').value.length > 0 &&
    document.querySelector('#setSubAccountCodeInputId').value.length < 11
  ) {
    document.querySelector('#RequiredErrorMesageForCode').innerHTML = '入力値が間違いました。'
    document.querySelector('#RequiredErrorMesageForCode').classList.remove('is-invisible')
    errorFlag = true
  }

  // 補助科目コードが10桁以上の場合
  if (document.querySelector('#setSubAccountCodeInputId').value.length > 10) {
    document.querySelector('#RequiredErrorMesageForCode').innerHTML = '補助科目コードは10桁まで入力してください。'
    document.querySelector('#RequiredErrorMesageForCode').classList.remove('is-invisible')
    errorFlag = true
  }

  // 補助科目名が未入力の場合
  if (
    document.querySelector('#setSubAccountCodeNameInputId').value.length === 0 ||
    document.querySelector('#setSubAccountCodeNameInputId').value.trim().length === 0
  ) {
    document.querySelector('#RequiredErrorMesageForName').innerHTML = '補助科目名が未入力です。'
    document.querySelector('#RequiredErrorMesageForName').classList.remove('is-invisible')
    errorFlag = true
  }

  // 補助科目名が40桁以上の場合
  if (document.querySelector('#setSubAccountCodeNameInputId').value.length > 40) {
    document.querySelector('#RequiredErrorMesageForName').innerHTML = '補助科目名は40桁まで入力してください。'
    document.querySelector('#RequiredErrorMesageForName').classList.remove('is-invisible')
    errorFlag = true
  }

  if (errorFlag) {
    // バリデーションが合わないとき
    return false
  } else {
    // バリデーションが合うとき

    document.querySelector('#checksetAccountCodeInputId').innerText =
      document.querySelector('#setAccountCodeInputIdResult').value
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
  // 登録ボタンが非活性化の時は動作しない
  if (document.querySelector('#submit').getAttribute('disabled') !== null) {
    return
  }
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
    cloneSearchResultAccountCodeTemplate.querySelector('.columnAccountCodeId').innerText = item.accountCodeId
    cloneSearchResultAccountCodeTemplate.querySelector('.columnNoAccountCodeMessage').classList.add('is-invisible')
    cloneSearchResultAccountCodeTemplate.querySelector('.columnAccountCode').innerHTML =
      '<a class="resultAccountCode" data-target="#searchAccountCode-modal">' + item.accountCode + '<br>'
    cloneSearchResultAccountCodeTemplate.querySelector('.columnAccountCodeName').innerText = item.accountCodeName

    displayFieldBody.appendChild(cloneSearchResultAccountCodeTemplate)
  })
  $('.resultAccountCode').forEach((ele) => {
    ele.onclick = () => {
      $(ele.getAttribute('data-target')).classList.remove('is-active')
      $('#setAccountCodeInputIdResult').value = ele.innerHTML.replace('<br>', '')
      $('#setAccountCodeInputIdResult').setAttribute('readonly', true)
      $('#setAccountCodeId').value = ele.parentElement.parentElement.lastChild.innerText
      $('#setAccountCodeInputIdResult').classList.remove('is-invisible')
      $('#btnClear').click()
      deleteDisplayAccountCode()
      $('#btnOpenAccountCodeModal').setAttribute('disabled', 'disabled')
      $('#btnAccountCodeClear').removeAttribute('disabled')
      checkbtnCheck()
    }
  })

  document.querySelector('#displayInvisible').classList.remove('is-invisible')
}

// 勘定科目コードの重複チェック防止
const inputEvent = () => {
  Array.prototype.forEach.call(document.querySelectorAll('.inputCheckbox'), (item) => {
    item.addEventListener('click', function () {
      // POとの相談内容（削除はPO確認後）
      // item選択時にもチェックができるようにするか。
      // -------------------------------------------------------------------------------------------------------
      // this.parentElement.parentElement.parentElement.parentElement.parentElement.parentElement.classList.toggle(
      //   'is-selected'
      // )
      // -------------------------------------------------------------------------------------------------------
      const checkBox = document.querySelectorAll('.inputCheckbox')
      for (let idx = 0; idx < checkBox.length; idx++) {
        if (this !== checkBox[idx]) {
          checkBox[idx].checked = false
        }
      }
    })
  })
  // POとの相談内容（削除はPO確認後）
  // item選択時にもチェックができるようにするか。
  // -------------------------------------------------------------------------------------------------------
  // Array.prototype.forEach.call(document.querySelectorAll('#displayFieldBody > tr'), (item) => {
  //   item.addEventListener('click', function () {
  //     const $this = this
  //     const $thisRowCheckbox = $this.querySelector('input')
  //     if ($thisRowCheckbox.checked) {
  //       $this.querySelector('input').checked = false
  //     } else {
  //       $this.querySelector('input').checked = true
  //     }
  //     const checkBox = document.querySelectorAll('.inputCheckbox')
  //     for (let idx = 0; idx < checkBox.length; idx++) {
  //       if ($thisRowCheckbox !== checkBox[idx]) {
  //         checkBox[idx].checked = false
  //       }
  //     }
  //     for (let idx = 0; idx < document.querySelectorAll('#displayFieldBody > tr').length; idx++) {
  //       if ($this !== document.querySelectorAll('#displayFieldBody > tr')[idx]) {
  //         document.querySelectorAll('#displayFieldBody > tr')[idx].classList.remove('is-selected')
  //       }
  //     }
  //     $this.classList.toggle('is-selected')
  //   })
  // })
  // -------------------------------------------------------------------------------------------------------
}

// 勘定科目コード検索が０件の場合
const displayNoAccountCode = function () {
  const displayFieldBody = document.querySelector('#displayFieldBody')
  const searchResultAccountCode = document.querySelector('#searchResultAccountCode')
  const cloneSearchResultAccountCodeTemplate = document.importNode(searchResultAccountCode.content, true)
  cloneSearchResultAccountCodeTemplate.querySelector('.columnNoAccountCodeMessage').classList.remove('is-invisible')
  cloneSearchResultAccountCodeTemplate.querySelector('.noAccountCodeMessage').innerText =
    '該当する勘定科目が存在しませんでした。'
  cloneSearchResultAccountCodeTemplate.querySelector('.columnAccountCodeId').classList.add('is-invisible')
  displayFieldBody.appendChild(cloneSearchResultAccountCodeTemplate)
  document.querySelector('#displayInvisible').classList.remove('is-invisible')
}

// 勘定科目コード検索
document.querySelector('#btnSearchAccountCode').addEventListener('click', function () {
  // 検索ボタンが非活性化の時は動作しない
  if ($('#btnSearchAccountCode').getAttribute('disabled') !== null) {
    return
  }
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
            freezePostalSearchBtn()
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
  // クリアボタンが非活性化の時は動作しない
  if ($('#btnClear').getAttribute('disabled') !== null) {
    return
  }
  $('#setAccountCodeInputId').readOnly = false
  $('#setAccountCodeNameInputId').readOnly = false
  $('#setAccountCodeInputId').value = ''
  $('#setAccountCodeNameInputId').value = ''
  deleteDisplayAccountCode()
  document.querySelector('#btnCheck').setAttribute('disabled', '')
  $('#btnSearchAccountCode').removeAttribute('disabled')
  $('#btnClear').setAttribute('disabled', 'disabled')
})

// 勘定科目（コード、名）が入力不可に変更 、検索ボタン非活性化、クリアボタン活性化
function freezePostalSearchBtn() {
  $('#setAccountCodeInputId').readOnly = true
  $('#setAccountCodeNameInputId').readOnly = true
  $('#btnSearchAccountCode').setAttribute('disabled', 'disabled')
  $('#btnClear').removeAttribute('disabled')
}

// event発生時、入力データをチェックして、「確認」ボタン活性化する。
document.querySelector('body').addEventListener('change', function (event) {
  const sbuAccountCodeInput = document.querySelector('#setSubAccountCodeInputId')
  const sbuAccountCodeNameInput = document.querySelector('#setSubAccountCodeNameInputId')
  const setAccountCodeInputIdResult = document.querySelector('#setAccountCodeInputIdResult')
  const setAccountCodeId = document.querySelector('#setAccountCodeId')
  document.querySelector('#btnCheck').setAttribute('disabled', '')
  if (
    sbuAccountCodeInput.value.length !== 0 &&
    sbuAccountCodeNameInput.value.length !== 0 &&
    setAccountCodeInputIdResult.value.length !== 0 &&
    setAccountCodeId.value.length !== 0
  ) {
    document.querySelector('#btnCheck').removeAttribute('disabled')
  }
})

// 設定ボタンクリック時
document.querySelector('#btnOpenAccountCodeModal').addEventListener('click', () => {
  // 検索ボタンが非活性化の時は動作しない
  if ($('#btnOpenAccountCodeModal').getAttribute('disabled') !== null) {
    return
  }
  const dataTarget = $('#btnOpenAccountCodeModal').getAttribute('data-target')
  $(dataTarget).classList.add('is-active')
})

// btnAccountCodeClearボタンクリック時
document.querySelector('#btnAccountCodeClear').addEventListener('click', () => {
  $('#setAccountCodeInputIdResult').value = ''
  $('#setAccountCodeId').value = ''
  $('#setAccountCodeInputIdResult').classList.add('is-invisible')
  $('#btnOpenAccountCodeModal').removeAttribute('disabled')
  $('#btnAccountCodeClear').setAttribute('disabled', true)
  $('#btnCheck').setAttribute('disabled', true)
})

// 補助科目コードと補助科目名を設定した上で勘定科目のみ変更した時、確認ボタン活性化処理
function checkbtnCheck() {
  const sbuAccountCodeInput = document.querySelector('#setSubAccountCodeInputId')
  const sbuAccountCodeNameInput = document.querySelector('#setSubAccountCodeNameInputId')
  const setAccountCodeInputIdResult = document.querySelector('#setAccountCodeInputIdResult')
  const setAccountCodeId = document.querySelector('#setAccountCodeId')
  document.querySelector('#btnCheck').setAttribute('disabled', '')
  if (
    sbuAccountCodeInput.value.length !== 0 &&
    sbuAccountCodeNameInput.value.length !== 0 &&
    setAccountCodeInputIdResult.value.length !== 0 &&
    setAccountCodeId.value.length !== 0
  ) {
    document.querySelector('#btnCheck').removeAttribute('disabled')
  }
}
