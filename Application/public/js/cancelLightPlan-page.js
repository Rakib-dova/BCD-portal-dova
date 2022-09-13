/*
ページ概要：契約情報解約（スタンダードプラン）
ページ遷移：Home画面→設定→ご契約内容→解約申請
*/

/* global
 $
*/

// ----「次へ」ボタンが押された
$('#cancelltion-button').addEventListener('click', function (e) {
  e.preventDefault()

  const elements = document.querySelectorAll('input')

  // 初回エラー 項目のエレメントの初期化
  let firstError
  // 各項目のバリデーションチェック
  for (const element of elements) {
    // 項目のエラーメッセージ表示先のエレメントの取得
    const messageElement = $('#' + element.getAttribute('name') + 'Message')
    // 項目のエラーメッセージのクリア
    if (messageElement) messageElement.textContent = ''

    // バリデーション失敗の場合
    if (!element.validity.valid) {
      // 初回エラー 項目のエレメントの設定
      if (!firstError) firstError = element
      if (messageElement) messageElement.textContent = '　入力値が間違いました。'
    }

    // 確認モーダルの各項目の設定
    const reviewElement = $('#re' + element.getAttribute('name'))
    if (reviewElement) reviewElement.textContent = element.value
  }

  if (firstError) {
    // 初回エラー 項目にフォーカス
    firstError?.focus()
  } else {
    $('#resalesChannelDeptType').textContent = JSON.parse($('#salesChannelDeptType').value || '{}').name

    const modal = $('#cancellation-modal')
    if (modal) modal.classList.toggle('is-active')
  }
})

// ---- 登録ボタン押下時のフロント側での二重送信防止
$('#form').onsubmit = function () {
  $('#submit').classList.add('is-loading')
  $('#submit').setAttribute('disabled', 'disabled')
}
