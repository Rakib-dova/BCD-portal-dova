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
