// modal toggle 追加
function $(tagObjName) {
  const classNameReg = new RegExp(/\.+[a-zA-Z0-9]/)
  const idNameReg = new RegExp(/\#+[a-zA-Z0-9]/)

  if (classNameReg.test(tagObjName)) {
    return document.querySelectorAll(tagObjName)
  } else if (idNameReg.test(tagObjName)) {
    tagObjName = tagObjName.replace(/\#/, '')
    return document.getElementById(tagObjName)
  } else {
    return null
  }
}

// 契約者名変更時確認ボタン活性化イベント
$('#contractName').addEventListener('input', function () {
  if (!this.value || !$('#contractKanaName').value) {
    $('#next-btn').setAttribute('disabled', '')
  } else {
    $('#next-btn').removeAttribute('disabled')
  }
})

$('#contractKanaName').addEventListener('input', function () {
  if (!this.value || !$('#contractName').value) {
    $('#next-btn').setAttribute('disabled', '')
  } else {
    $('#next-btn').removeAttribute('disabled')
  }
})

// 確認ボタン押下するとmodalに契約者名が表示処理
$('#form').addEventListener('submit', function (event) {
  $('#confirmmodify-modal').classList.toggle('is-active')
  if ($('#chkContractName').checked) {
    $('#recontractName').innerHTML = $('#contractName').value
    $('#recontractKanaName').innerHTML = $('#contractKanaName').value
  }
  if (event.submitter.id === 'next-btn') {
    event.preventDefault()
  }
})

// 契約者名変更欄表示
$('#chkContractName').addEventListener('change', function () {
  $('#cardContractName').classList.toggle('is-invisible')
  if (this.checked) {
    if ($('#contractName').value && $('#contractKanaName').value) {
      $('#next-btn').removeAttribute('disabled')
    }
    $('#contractName').setAttribute('name', 'contractName')
    $('#contractKanaName').setAttribute('name', 'contractKanaName')
  } else {
    $('#contractName').removeAttribute('name')
    $('#contractKanaName').removeAttribute('name')
    $('#next-btn').setAttribute('disabled', '')
    $('#recontractName').innerHTML = ''
    $('#recontractKanaName').innerHTML = ''
  }
})
