// 異常の場合表示されるモーダルのタイトル修正
window.onload = () => {
  if (document.querySelector('#confirmmodify-modal > div.modal-card > header > p')) {
    document.querySelector('#confirmmodify-modal > div.modal-card > header > p').innerText = '部門データ設定'
  }
}

// 「確認」ボタンの機能（バリデーションチェック）
document.getElementById('btnCheck').addEventListener('click', function (e) {
  // 英数カナ文字正規式
  const regExpEngNumber = '^[a-zA-Z0-9ァ-ヶー]*$'
  let errorFlag = false

  document.querySelector('#RequiredErrorMesageForCode').classList.add('is-invisible')
  document.querySelector('#RequiredErrorMesageForName').classList.add('is-invisible')

  // 部門コードが未入力の場合
  if (document.querySelector('#setDepartmentCodeInputId').value.length === 0) {
    document.querySelector('#RequiredErrorMesageForCode').innerHTML = '部門コードが未入力です。'
    document.querySelector('#RequiredErrorMesageForCode').classList.remove('is-invisible')
    errorFlag = true
  }

  // 部門コードの英数文字ではない場合
  if (
    !document.querySelector('#setDepartmentCodeInputId').value.match(regExpEngNumber) &&
    document.querySelector('#setDepartmentCodeInputId').value.length > 0 &&
    document.querySelector('#setDepartmentCodeInputId').value.length < 11
  ) {
    document.querySelector('#RequiredErrorMesageForCode').innerHTML = '入力値が間違いました。'
    document.querySelector('#RequiredErrorMesageForCode').classList.remove('is-invisible')
    errorFlag = true
  }

  // 部門コードが10桁以上の場合
  if (document.querySelector('#setDepartmentCodeInputId').value.length > 10) {
    document.querySelector('#RequiredErrorMesageForCode').innerHTML = '部門コードは10桁まで入力してください。'
    document.querySelector('#RequiredErrorMesageForCode').classList.remove('is-invisible')
    errorFlag = true
  }

  // 部門名が未入力の場合
  if (document.querySelector('#setDepartmentCodeNameInputId').value.length === 0) {
    document.querySelector('#RequiredErrorMesageForName').innerHTML = '部門名が未入力です。'
    document.querySelector('#RequiredErrorMesageForName').classList.remove('is-invisible')
    errorFlag = true
  }

  // 部門名が40桁以上の場合
  if (document.querySelector('#setDepartmentCodeNameInputId').value.length > 40) {
    document.querySelector('#RequiredErrorMesageForName').innerHTML = '部門名は40桁まで入力してください。'
    document.querySelector('#RequiredErrorMesageForName').classList.remove('is-invisible')
    errorFlag = true
  }

  if (errorFlag) {
    // バリデーションが合わないとき
    return false
  } else {
    // バリデーションが合うとき
    document.querySelector('#checksetDepartmentCodeInputId').innerText =
      document.querySelector('#setDepartmentCodeInputId').value
    document.querySelector('#checksetDepartmentCodeNameInputId').innerText = document.querySelector(
      '#setDepartmentCodeNameInputId'
    ).value
    document.querySelector('#check-modal').classList.add('is-active')
  }
})

// 確認画面で「登録」ボタンを押すの場合、サーバーにデータを伝送
document.querySelector('#submit').addEventListener('click', () => {
  document.querySelector('#form').submit()
})
