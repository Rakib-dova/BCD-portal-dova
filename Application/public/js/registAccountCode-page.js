// 異常の場合表示されるモーダルのタイトル修正
window.onload = () => {
  if (document.querySelector('#confirmmodify-modal > div.modal-card > header > p')) {
    document.querySelector('#confirmmodify-modal > div.modal-card > header > p').innerText = '勘定科目設定'
  }
}

// 「確認」ボタンの機能（バリデーションチェック）
document.getElementById('btnCheck').addEventListener('click', function (e) {
  // 英数文字正規式
  const regExpEngNumber = '^[a-zA-Z0-9]*$'
  let errorFlag = false

  document.querySelector('#RequiredErrorMesageForCode').classList.add('is-invisible')
  document.querySelector('#RequiredErrorMesageForName').classList.add('is-invisible')

  // 勘定科目コードが未入力の場合
  if (document.querySelector('#setAccountCodeInputId').value.length === 0) {
    document.querySelector('#RequiredErrorMesageForCode').innerHTML = '勘定科目コードが未入力です。'
    document.querySelector('#RequiredErrorMesageForCode').classList.remove('is-invisible')
    errorFlag = true
  }

  // 勘定科目コードの英数文字ではない場合
  if (
    !document.querySelector('#setAccountCodeInputId').value.match(regExpEngNumber) &&
    document.querySelector('#setAccountCodeInputId').value.length > 0 &&
    document.querySelector('#setAccountCodeInputId').value.length < 11
  ) {
    document.querySelector('#RequiredErrorMesageForCode').innerHTML = '入力値が間違いました。'
    document.querySelector('#RequiredErrorMesageForCode').classList.remove('is-invisible')
    errorFlag = true
  }

  // 勘定科目コードが10桁以上の場合
  if (document.querySelector('#setAccountCodeInputId').value.length > 10) {
    document.querySelector('#RequiredErrorMesageForCode').innerHTML = '勘定科目コードは10桁まで入力してください。'
    document.querySelector('#RequiredErrorMesageForCode').classList.remove('is-invisible')
    errorFlag = true
  }

  // 勘定科目名が未入力の場合
  if (document.querySelector('#setAccountCodeNameInputId').value.length === 0) {
    document.querySelector('#RequiredErrorMesageForName').innerHTML = '勘定科目名が未入力です。'
    document.querySelector('#RequiredErrorMesageForName').classList.remove('is-invisible')
    errorFlag = true
  }

  // 勘定科目名が40桁以上の場合
  if (document.querySelector('#setAccountCodeNameInputId').value.length > 40) {
    document.querySelector('#RequiredErrorMesageForName').innerHTML = '勘定科目名は40桁まで入力してください。'
    document.querySelector('#RequiredErrorMesageForName').classList.remove('is-invisible')
    errorFlag = true
  }

  if (errorFlag) {
    // バリデーションが合わないとき
    return false
  } else {
    // バリデーションが合うとき
    document.querySelector('#checksetAccountCodeInputId').innerText =
      document.querySelector('#setAccountCodeInputId').value
    document.querySelector('#checksetAccountCodeNameInputId').innerText =
      document.querySelector('#setAccountCodeNameInputId').value
    document.querySelector('#check-modal').classList.add('is-active')
  }
})

// 確認画面で「登録」ボタンを押すの場合、サーバーにデータを伝送
document.querySelector('#submit').addEventListener('click', () => {
  document.querySelector('#form').submit()
})
