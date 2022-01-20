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

// プラスボタンの機能
Array.prototype.forEach.call($('.btn-plus-accountCode'), (btnPlusAccount) => {
  btnPlusAccount.addEventListener('click', function () {
    const target = $(this.dataset.target)
    if (target.querySelectorAll('.lineAccountcode').length < 9) {
      const targetId = `${target.id}_lineAccountCode${target.querySelectorAll('.lineAccountcode').length + 2}`
      const templeAccountCodeItem = $('#templateLineAccountCodeItem')
      const cloneAccountCodeItem = document.importNode(templeAccountCodeItem.content, true)
      cloneAccountCodeItem.querySelector('.lineAccountcode').id = targetId
      // 名前の割り当て
      cloneAccountCodeItem.querySelector('.inputInstallmentAmount').setAttribute('name', `${targetId}_input_amount`)
      cloneAccountCodeItem.querySelector('.inputInstallmentAmount').id = `${targetId}_input_amount`
      // 項目の分割金額の入力ボタン
      // 各ボタンあたりIDを割り当て
      cloneAccountCodeItem.querySelector('.btn-insert-installmentAmount').id = `btn_${targetId}_installmentAmount`
      cloneAccountCodeItem.querySelector('.btn-insert-installmentAmount').dataset.target =
        'insert-installmentAmount-modal'
      cloneAccountCodeItem.querySelector('.btn-insert-installmentAmount').dataset.input = `${targetId}_input_amount`
      cloneAccountCodeItem
        .querySelector('.btn-insert-installmentAmount')
        .addEventListener('click', btnInstallmentAmount)
      cloneAccountCodeItem.querySelector('.btn-minus-accountCode').dataset.target = targetId
      cloneAccountCodeItem.querySelector('.btn-minus-accountCode').addEventListener('click', btnMinusAccount)
      // １番目のマイナスボタン隠す
      $(`#btn-minus-${this.dataset.target.replace('#', '')}-accountCode`).classList.add('is-invisible')
      target.appendChild(cloneAccountCodeItem)
    }
  })
})

Array.prototype.forEach.call($('.btn-minus-accountCode'), (btnMinusAccount) => {
  btnMinusAccount.addEventListener('click', function () {})
})

// 仕訳情報の１番目アイテムのマイナスボタン機能追加
// １番目の内容を消す
const btnMinusAccount = function () {
  const deleteTarget = this.dataset.target
  const thisLineInput = $(`#${deleteTarget}_input_amount`)
  const lineNoFirstInput = $(`#${deleteTarget.split('_')[0]}_lineAccountCode1_input_amount`)
  lineNoFirstInput.value = (
    ~~lineNoFirstInput.value.replaceAll(',', '') + ~~thisLineInput.value.replaceAll(',', '')
  ).toLocaleString('ja-JP')
  $(`#${deleteTarget}`).remove()
  if ($(`#${deleteTarget.split('_')[0]}`).querySelectorAll('.lineAccountcode').length === 0) {
    $(`#btn-minus-${deleteTarget.split('_')[0]}-accountCode`).classList.remove('is-invisible')
  }
}

// 分割金額入力ボタン（モーダルの表示）
const btnInstallmentAmount = function () {
  const showModalTarget = $(`#${this.dataset.target}`)
  const inputTarget = this.dataset.input
  $('#inputInstallmentAmount').value = ''
  showModalTarget.classList.toggle('is-active')
  showModalTarget.querySelector('#btn-insert').dataset.target = inputTarget
  showModalTarget.querySelector('#installmentAmountErrMsg').innerText = '　'
}

// 分割金額の入力欄の数字以外は入力できない
$('#inputInstallmentAmount').addEventListener('keyup', function () {
  const pattern = '^[0-9]+$'
  const regExp = new RegExp(pattern)
  if (!regExp.test(this.value)) {
    this.value = this.value.substr(0, this.value.length - 1)
  }
})
$('#inputInstallmentAmount').addEventListener('blur', function () {
  const pattern = '^[0-9]+$'
  const regExp = new RegExp(pattern)
  const length = this.value.length
  for (let idx = 0; idx < length; idx++) {
    if (!regExp.test(this.value)) {
      this.value = this.value.substr(0, this.value.length - 1)
    }
  }
})

// モーダルの内の入力ボタン機能
$('#btn-insert').addEventListener('click', function () {
  const inputTarget = this.dataset.target
  const valueInput = $('#inputInstallmentAmount')
  const totalAmmout = ~~$(`#${inputTarget.split('_')[0]}_lineAccountCode1_input_amount`).value.replaceAll(',', '')
  if (~~valueInput.value !== 0) {
    if (totalAmmout - valueInput.value < 0) {
      $('#installmentAmountErrMsg').innerText = '小計金額より高い金額は入力できません。'
      return null
    }
    console.log(valueInput.value.toLocaleString('ja-JP'))
    $(`#${inputTarget}`).value = (~~valueInput.value).toLocaleString('ja-JP')
    $(`#${inputTarget.split('_')[0]}_lineAccountCode1_input_amount`).value = (
      totalAmmout - valueInput.value
    ).toLocaleString('ja-JP')
    $('#insert-installmentAmount-modal').classList.toggle('is-active')
  } else {
    $('#installmentAmountErrMsg').innerText = '金額は1円以上を入力してください。'
  }
})
