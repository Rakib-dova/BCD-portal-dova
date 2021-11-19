window.onload = () => {
  if (document.querySelector('#confirmmodify-modal > div.modal-card > header > p')) {
    document.querySelector('#confirmmodify-modal > div.modal-card > header > p').innerText = '勘定科目設定'
  }
}

document.getElementById('submit').addEventListener('click', function (e) {
  const regExpEngNumber = '^[a-zA-Z0-9+]*$'
  let errorFlag = false

  document.querySelector('#RequiredErrorMesageForCode').classList.add('is-invisible')
  document.querySelector('#RequiredErrorMesageForName').classList.add('is-invisible')

  if (document.querySelector('#codeAccountCode').value.length === 0) {
    document.querySelector('#RequiredErrorMesageForCode').innerHTML = '勘定科目コードが未入力です。'
    document.querySelector('#RequiredErrorMesageForCode').classList.remove('is-invisible')
    errorFlag = true
  }

  if (
    !document.querySelector('#codeAccountCode').value.match(regExpEngNumber) &&
    document.querySelector('#codeAccountCode').value.length > 0 &&
    document.querySelector('#codeAccountCode').value.length < 11
  ) {
    document.querySelector('#RequiredErrorMesageForCode').innerHTML = '入力値が間違いました。'
    document.querySelector('#RequiredErrorMesageForCode').classList.remove('is-invisible')
    errorFlag = true
  }

  if (document.querySelector('#codeAccountCode').value.length > 10) {
    document.querySelector('#RequiredErrorMesageForCode').innerHTML = '勘定科目コードは10桁まで入力してください。'
    document.querySelector('#RequiredErrorMesageForCode').classList.remove('is-invisible')
    errorFlag = true
  }

  if (document.querySelector('#codeAccountName').value.length === 0) {
    document.querySelector('#RequiredErrorMesageForName').innerHTML = '勘定科目名が未入力です。'
    document.querySelector('#RequiredErrorMesageForName').classList.remove('is-invisible')
    errorFlag = true
  }

  if (document.querySelector('#codeAccountName').value.length > 40) {
    document.querySelector('#RequiredErrorMesageForName').innerHTML = '勘定科目名は40桁まで入力してください。'
    document.querySelector('#RequiredErrorMesageForName').classList.remove('is-invisible')
    errorFlag = true
  }

  if (errorFlag) {
    return false
  } else {
    document.querySelector('#form').submit()
  }
})
