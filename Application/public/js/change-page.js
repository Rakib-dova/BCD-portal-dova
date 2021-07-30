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

// 契約者住所変更時確認ボタン活性化イベント
$('#postalNumber').addEventListener('input', function () {
  if (!this.value || !$('#contractAddressVal').value || !$('#banch1').value) {
    $('#next-btn').setAttribute('disabled', '')
  } else {
    $('#next-btn').removeAttribute('disabled')
  }
})

$('#contractAddressVal').addEventListener('input', function () {
  if (!this.value || !$('#postalNumber').value || !$('#banch1').value) {
    $('#next-btn').setAttribute('disabled', '')
  } else {
    $('#next-btn').removeAttribute('disabled')
  }
})

$('#banch1').addEventListener('input', function () {
  if (!this.value || !$('#postalNumber').value || !$('#contractAddressVal').value) {
    $('#next-btn').setAttribute('disabled', '')
  } else {
    $('#next-btn').removeAttribute('disabled')
  }
})

// 確認ボタン押下するとmodalに契約者名が表示処理
$('#next-btn').onclick = function () {
  $('#confirmmodify-modal').classList.toggle('is-active')
  if ($('#chkContractName').checked) {
    $('#recontractName').innerHTML = $('#contractName').value
    $('#recontractKanaName').innerHTML = $('#contractKanaName').value
  }
  if ($('#chkContractAddress').checked) {
    $('#repostalNumber').innerHTML = $('#postalNumber').value
    $('#recontractAddressVal').innerHTML = $('#contractAddressVal').value
    $('#rebanch1').innerHTML = $('#banch1').value
    $('#retatemono1').innerHTML = $('#tatemono1').value
  }
}

// 契約者名変更欄表示
$('#chkContractName').addEventListener('change', function () {
  $('#cardContractName').classList.toggle('is-invisible')
  $('#modalContractName').classList.toggle('is-invisible')
  if (this.checked) {
    if ($('#contractName').value && $('#contractKanaName').value) {
      $('#next-btn').removeAttribute('disabled')
    }
    $('#contractName').setAttribute('name', 'contractName')
    $('#contractKanaName').setAttribute('name', 'contractKanaName')
    $('#contractName').required = true
    $('#contractKanaName').required = true
  } else {
    $('#contractName').removeAttribute('name')
    $('#contractKanaName').removeAttribute('name')
    // $('#next-btn').setAttribute('disabled', '')
    $('#recontractName').innerHTML = ''
    $('#recontractKanaName').innerHTML = ''
    $('#contractName').required = false
    $('#contractKanaName').required = false
    if (!$('#chkContractAddress').checked) {
      $('#next-btn').setAttribute('disabled', '')
    }
  }
})

// 契約者住所変更欄表示
$('#chkContractAddress').addEventListener('change', function () {
  $('#cardContractAddress').classList.toggle('is-invisible')
  $('#modalContractAddress').classList.toggle('is-invisible')
  if (this.checked) {
    if ($('#postalNumber').value && $('#contractAddressVal').value && $('#banch1').value) {
      $('#next-btn').removeAttribute('disabled')
    }
    $('#postalNumber').setAttribute('name', 'postalNumber')
    $('#contractAddressVal').setAttribute('name', 'contractAddressVal')
    $('#banch1').setAttribute('name', 'banch1')
    $('#tatemono1').setAttribute('name', 'tatemono1')
    $('#postalNumber').required = true
    $('#contractAddressVal').required = true
    $('#banch1').required = true
  } else {
    $('#postalNumber').removeAttribute('name')
    $('#contractAddressVal').removeAttribute('name')
    $('#banch1').removeAttribute('name')
    $('#tatemono1').removeAttribute('name')
    // $('#next-btn').setAttribute('disabled', '')
    $('#repostalNumber').innerHTML = ''
    $('#recontractAddressVal').innerHTML = ''
    $('#rebanch1').innerHTML = ''
    $('#retatemono1').innerHTML = ''
    $('#postalNumber').required = false
    $('#contractAddressVal').required = false
    $('#banch1').required = false
    if (!$('#chkContractName').checked) {
      $('#next-btn').setAttribute('disabled', '')
    }
  }
})

$('#postalNumber').addEventListener('input', function () {
  const postalNumberReg = new RegExp(/^[0-9]{7}$/)
  if (!postalNumberReg.test(this.value)) {
    $('#postalSearchBtn').setAttribute('disabled', 'disabled')
    $('#postalSearchBtn').onclick = null
    return
  }
  $('#postalSearchBtn').removeAttribute('disabled')
})

$('#postalSearchBtn').addEventListener('click', function () {
  const postalNumber = $('#postalNumber').value
  const sendData = { postalNumber: null }
  const modalCardBody = $('#modal-card-result')
  const postalNumberReg = new RegExp(/^[0-9]{7}$/)

  if (!postalNumberReg.test(postalNumber)) {
    return
  }

  modalCardBody.innerHTML = ''
  sendData.postalNumber = postalNumber
  const requestAddressApi = new XMLHttpRequest()
  requestAddressApi.open('POST', '/searchAddress/', true)
  requestAddressApi.setRequestHeader('Content-Type', 'application/json')
  requestAddressApi.onreadystatechange = function () {
    const dataTarget = $('#postalSearchBtn').getAttribute('data-target')
    if (requestAddressApi.readyState === requestAddressApi.DONE) {
      if (requestAddressApi.status === 200) {
        const resultAddress = JSON.parse(requestAddressApi.responseText)
        if (resultAddress.addressList.length === 0) {
          $(dataTarget).classList.add('is-active')
          modalCardBody.innerHTML = '該当する住所が見つかりませんでした。'
        } else {
          const resultLength = resultAddress.addressList.length
          if (resultLength === 1) {
            $('#contractAddressVal').value = resultAddress.addressList[0].address
            $('#banch1').value = ''
            $('#tatemono1').value = ''
          } else {
            $(dataTarget).classList.add('is-active')
            resultAddress.addressList.forEach((obj) => {
              modalCardBody.innerHTML +=
                '<a class="resultAddress" data-target="#searchPostalNumber-modal">' + obj.address + '<br>'
            })
            $('.resultAddress').forEach((ele) => {
              ele.onclick = () => {
                $(ele.getAttribute('data-target')).classList.remove('is-active')
                $('#contractAddressVal').value = ele.innerHTML.replace('<br>', '')
                $('#banch1').value = ''
                $('#tatemono1').value = ''
              }
            })
          }
        }
      } else {
        const errStatus = requestAddressApi.status
        $(dataTarget).classList.add('is-active')
        switch (errStatus) {
          case 403:
            modalCardBody.innerHTML = 'ログインユーザーではありません。'
            break
          case 400:
            modalCardBody.innerHTML = '正しい郵便番号を入力してください。'
            break
          case 500:
            modalCardBody.innerHTML = 'システムエラーが発生しました。'
            break
        }
      }
    }
  }
  requestAddressApi.send(JSON.stringify(sendData))
})
