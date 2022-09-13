/*
ページ概要：仕訳情報設定（支払い条件と手段）
ページ遷移：Home画面→仕訳情報管理→支払依頼一覧→仕訳情報設定
*/

// 支払情報隠すボタン機能
document.getElementById('invisibleBtn').onclick = function () {
  const paymentMethodField = document.querySelector('#displayPaymentMethodField')

  if (paymentMethodField.classList[0] === 'is-invisible') {
    paymentMethodField.classList.remove('is-invisible')
    this.textContent = '▲'
  } else {
    paymentMethodField.classList.add('is-invisible')
    this.textContent = '▼'
  }
}
