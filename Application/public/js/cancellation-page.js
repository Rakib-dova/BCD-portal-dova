/*
ページ概要：契約情報解約（フリープラン）
ページ遷移：Home画面→設定→ご契約内容→解約申請
*/

// 次へボタン押下時
document.getElementById('cancelltion-button').onclick = function () {
  const modal = document.getElementById('cancellation-modal')
  if (modal) modal.classList.toggle('is-active')
}
