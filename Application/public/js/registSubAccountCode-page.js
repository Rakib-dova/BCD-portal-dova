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
$('#btnCheck').addEventListener('click', function (e) {
  // 英数文字正規式
  const regExpEngNumber = '^[a-zA-Z0-9]*$'
  // 絵文字正規式
  const ranges = [
    '[\ud800-\ud8ff][\ud000-\udfff]', // 基本的な絵文字除去
    '[\ud000-\udfff]{2,}', // サロゲートペアの二回以上の繰り返しがあった場合
    '\ud7c9[\udc00-\udfff]', // 特定のシリーズ除去
    '[0-9|*|#][\uFE0E-\uFE0F]\u20E3', // 数字系絵文字
    '[0-9|*|#]\u20E3', // 数字系絵文字
    '[©|®|\u2010-\u3fff][\uFE0E-\uFE0F]', // 環境依存文字や日本語との組み合わせによる絵文字
    '[\u2010-\u2FFF]', // 指や手、物など、単体で絵文字となるもの
    '\uA4B3' // 数学記号の環境依存文字の除去
  ]
  let errorFlag = false

  if (this.getAttribute('disabled') !== null) {
    return
  }

  $('#RequiredErrorMesageForCode').classList.add('is-invisible')
  $('#RequiredErrorMesageForName').classList.add('is-invisible')

  // 勘定科目コードの英数文字ではない場合
  if (
    !$('#setAccountCodeInputIdResult').value.match(regExpEngNumber) &&
    $('#setAccountCodeInputIdResult').value.length > 0 &&
    $('#setAccountCodeInputIdResult').value.length < 11
  ) {
    $('#RequiredErrorMesageForAccountCode').innerHTML = '入力値が間違いました。'
    $('#RequiredErrorMesageForAccountCode').classList.remove('is-invisible')
    errorFlag = true
  }

  // 補助科目コードが未入力の場合
  if ($('#setSubAccountCodeInputId').value.length === 0) {
    $('#RequiredErrorMesageForCode').innerHTML = '補助科目コードが未入力です。'
    $('#RequiredErrorMesageForCode').classList.remove('is-invisible')
    errorFlag = true
  }

  // 補助科目コードの英数文字ではない場合
  if (
    !$('#setSubAccountCodeInputId').value.match(regExpEngNumber) &&
    $('#setSubAccountCodeInputId').value.length > 0 &&
    $('#setSubAccountCodeInputId').value.length < 11
  ) {
    $('#RequiredErrorMesageForCode').innerHTML = '入力値が間違いました。'
    $('#RequiredErrorMesageForCode').classList.remove('is-invisible')
    errorFlag = true
  }

  // 補助科目コードが10桁以上の場合
  if ($('#setSubAccountCodeInputId').value.length > 10) {
    $('#RequiredErrorMesageForCode').innerHTML = '補助科目コードは10桁まで入力してください。'
    $('#RequiredErrorMesageForCode').classList.remove('is-invisible')
    errorFlag = true
  }

  // 補助科目名が未入力の場合
  if (
    $('#setSubAccountCodeNameInputId').value.length === 0 ||
    $('#setSubAccountCodeNameInputId').value.trim().length === 0
  ) {
    $('#RequiredErrorMesageForName').innerHTML = '補助科目名が未入力です。'
    $('#RequiredErrorMesageForName').classList.remove('is-invisible')
    errorFlag = true
  }

  // 補助科目名が40桁以上の場合
  if ($('#setSubAccountCodeNameInputId').value.length > 40) {
    $('#RequiredErrorMesageForName').innerHTML = '補助科目名は40桁まで入力してください。'
    $('#RequiredErrorMesageForName').classList.remove('is-invisible')
    errorFlag = true
  }

  // 補助科目名に絵文字が入っている場合
  if (
    document.querySelector('#setSubAccountCodeNameInputId').value.match(ranges.join('|')) &&
    document.querySelector('#setSubAccountCodeNameInputId').value.length > 0 &&
    document.querySelector('#setSubAccountCodeNameInputId').value.length < 41
  ) {
    document.querySelector('#RequiredErrorMesageForName').innerHTML = '補助科目名に絵文字は利用できません。'
    document.querySelector('#RequiredErrorMesageForName').classList.remove('is-invisible')
    errorFlag = true
  }

  if (errorFlag) {
    // バリデーションが合わないとき
    return false
  } else {
    // バリデーションが合うとき

    $('#checksetAccountCodeInputId').innerText = $('#setAccountCodeInputIdResult').value
    $('#checksetSubAccountCodeInputId').innerText = $('#setSubAccountCodeInputId').value
    $('#checksetSubAccountNameInputId').innerText = $('#setSubAccountCodeNameInputId').value
    $('#check-modal').classList.add('is-active')
  }
})

// 確認画面で「登録」ボタンを押すの場合、サーバーにデータを伝送
$('#submit').addEventListener('click', () => {
  // 登録ボタンが非活性化の時は動作しない
  if ($('#submit').getAttribute('disabled') !== null) {
    return
  }
  $('#form').submit()
})

// 再検索の時、前の結果を消す
const deleteDisplayAccountCode = function () {
  const displayFieldBody = $('#displayFieldBody')
  if (displayFieldBody.children.length !== 0) {
    const chidrenItem = []
    Array.prototype.forEach.call(displayFieldBody.children, (item) => {
      chidrenItem.push(item)
    })
    chidrenItem.forEach((item) => {
      displayFieldBody.removeChild(item)
    })
  }

  $('#setAccountCodeInputId').value = ''
  $('#setAccountCodeNameInputId').value = ''

  $('#displayInvisible').classList.add('is-invisible')
}

// 検索結果を画面に表示
const displayAccountCode = function (accountCodeArr) {
  const displayFieldBody = $('#displayFieldBody')
  const searchResultAccountCode = $('#searchResultAccountCode')
  accountCodeArr.forEach((item) => {
    const cloneSearchResultAccountCodeTemplate = document.importNode(searchResultAccountCode.content, true)
    cloneSearchResultAccountCodeTemplate.querySelector('.rowAccountCode').dataset.accountCodeId = item.accountCodeId
    cloneSearchResultAccountCodeTemplate.querySelector('.rowAccountCode').dataset.target = '#searchAccountCode-modal'
    cloneSearchResultAccountCodeTemplate.querySelector('.rowAccountCode').dataset.accountCode = item.accountCode
    cloneSearchResultAccountCodeTemplate.querySelector('.columnNoAccountCodeMessage').classList.add('is-invisible')
    cloneSearchResultAccountCodeTemplate.querySelector('.columnAccountCode').innerText = item.accountCode
    cloneSearchResultAccountCodeTemplate.querySelector('.columnAccountCodeName').innerText = item.accountCodeName

    displayFieldBody.appendChild(cloneSearchResultAccountCodeTemplate)
  })
  $('.rowAccountCode').forEach((row) => {
    row.addEventListener('click', function () {
      $(this.dataset.target).classList.remove('is-active')
      $('#setAccountCodeId').value = this.dataset.accountCodeId
      $('#setAccountCodeInputIdResult').value = this.dataset.accountCode
      $('#setAccountCodeInputIdResultColumn').classList.remove('is-invisible')
      $('#btnAccountCodeClear').classList.remove('is-invisible')
      deleteDisplayAccountCode()
      $('#btnOpenAccountCodeModal').setAttribute('disabled', '')
      $('#btnAccountCodeClear').removeAttribute('disabled')
      checkbtnCheck()
    })
    row.addEventListener('mouseover', function () {
      this.classList.add('is-selected')
    })
    row.addEventListener('mouseout', function () {
      this.classList.remove('is-selected')
    })
  })
  $('#displayInvisible').classList.remove('is-invisible')
}

// 勘定科目コード検索が０件の場合
const displayNoAccountCode = function () {
  const displayFieldBody = $('#displayFieldBody')
  const searchResultAccountCode = $('#searchResultAccountCode')
  const cloneSearchResultAccountCodeTemplate = document.importNode(searchResultAccountCode.content, true)
  cloneSearchResultAccountCodeTemplate.querySelector('.columnNoAccountCodeMessage').classList.remove('is-invisible')
  cloneSearchResultAccountCodeTemplate.querySelector('.noAccountCodeMessage').innerText =
    '該当する勘定科目が存在しませんでした。'
  displayFieldBody.appendChild(cloneSearchResultAccountCodeTemplate)
  $('#displayInvisible').classList.remove('is-invisible')
}

// 勘定科目コード検索
$('#btnSearchAccountCode').addEventListener('click', function () {
  // 検索ボタンが非活性化の時は動作しない
  if ($('#btnSearchAccountCode').getAttribute('disabled') !== null) {
    return
  }
  const accountCode = $('#setAccountCodeInputId').value
  const accountCodeName = $('#setAccountCodeNameInputId').value

  const $this = this
  deleteDisplayAccountCode()
  $('#setAccountCodeInputId').value = accountCode
  $('#setAccountCodeNameInputId').value = accountCodeName
  const getAccountCode = new XMLHttpRequest()
  const elements = document.getElementsByName('_csrf')
  const csrf = elements.item(0).value
  getAccountCode.open('POST', '/registSubAccountCode/getAccountCode')
  getAccountCode.setRequestHeader('Content-Type', 'application/json')
  getAccountCode.setRequestHeader('CSRF-Token', csrf)
  getAccountCode.onreadystatechange = function () {
    if (getAccountCode.readyState === getAccountCode.DONE) {
      switch (getAccountCode.status) {
        case 200: {
          const result = JSON.parse(getAccountCode.response)
          if (result.length !== 0) {
            displayAccountCode(result)
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

// event発生時、入力データをチェックして、「確認」ボタン活性化する。
document.querySelector('body').addEventListener('change', function (event) {
  const sbuAccountCodeInput = $('#setSubAccountCodeInputId')
  const sbuAccountCodeNameInput = $('#setSubAccountCodeNameInputId')
  const setAccountCodeInputIdResult = $('#setAccountCodeInputIdResult')
  const setAccountCodeId = $('#setAccountCodeId')
  $('#btnCheck').setAttribute('disabled', '')
  if (
    sbuAccountCodeInput.value.length !== 0 &&
    sbuAccountCodeNameInput.value.length !== 0 &&
    setAccountCodeInputIdResult.value.length !== 0 &&
    setAccountCodeId.value.length !== 0
  ) {
    $('#btnCheck').removeAttribute('disabled')
  }
})

// 設定ボタンクリック時
$('#btnOpenAccountCodeModal').addEventListener('click', function () {
  // 検索ボタンが非活性化の時は動作しない
  if (this.getAttribute('disabled') !== null) {
    return
  }
  const dataTarget = this.getAttribute('data-target')
  $(dataTarget).classList.add('is-active')
})

// クリアボタンの機能（勘定科目の入力フォームの初期化、勘定科目の入力フォームの隠す、設定ボタン活性化、クリアボタン隠す）
$('#btnAccountCodeClear').addEventListener('click', function () {
  $('#setAccountCodeInputIdResult').value = ''
  $('#setAccountCodeId').value = ''
  $('#btnOpenAccountCodeModal').removeAttribute('disabled')
  $('#btnCheck').setAttribute('disabled', true)
  $('#setAccountCodeInputIdResultColumn').classList.add('is-invisible')
  $('#RequiredErrorMesageForAccountCode').classList.add('is-invisible')
  this.setAttribute('disabled', true)
  this.classList.add('is-invisible')
})

// 補助科目コードと補助科目名を設定した上で勘定科目のみ変更した時、確認ボタン活性化処理
function checkbtnCheck() {
  const sbuAccountCodeInput = $('#setSubAccountCodeInputId')
  const sbuAccountCodeNameInput = $('#setSubAccountCodeNameInputId')
  const setAccountCodeInputIdResult = $('#setAccountCodeInputIdResult')
  const setAccountCodeId = $('#setAccountCodeId')
  $('#btnCheck').setAttribute('disabled', '')
  if (
    sbuAccountCodeInput.value.length !== 0 &&
    sbuAccountCodeNameInput.value.length !== 0 &&
    setAccountCodeInputIdResult.value.length !== 0 &&
    setAccountCodeId.value.length !== 0
  ) {
    $('#btnCheck').removeAttribute('disabled')
  }
}

$('#deleteSearchAccountCode').addEventListener('click', function () {
  deleteDisplayAccountCode()
})
