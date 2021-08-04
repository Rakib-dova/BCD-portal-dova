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

// 確認ボタン押下するとmodalに契約者名・契約者住所が表示処理
$('#form').addEventListener('submit', function (event) {
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
  if ($('#chkContractContact').checked) {
    $('#recontractPersonName').innerHTML = $('#contractPersonName').value
    $('#recontractPhoneNumber').innerHTML = $('#contractPhoneNumber').value
    $('#recontractMail').innerHTML = $('#contractMail').value
  }
  if (event.submitter.id === 'next-btn') {
    event.preventDefault()
  }
})

// 契約者名変更欄表示
$('#chkContractName').addEventListener('change', function () {
  if (this.checked || $('#chkContractAddress').checked || $('#chkContractContact').checked) {
    $('#next-btn').removeAttribute('disabled')
  } else {
    $('#next-btn').setAttribute('disabled', '')
  }
  $('#cardContractName').classList.toggle('is-invisible')
  $('#modalContractName').classList.toggle('is-invisible')
  if (this.checked) {
    this.required = true
    if (!$('#chkContractAddress').checked && !$('#chkContractContact').checked) {
      $('#chkContractAddress').required = false
      $('#chkContractContact').required = false
    } else if (!$('#chkContractAddress').checked) {
      $('#chkContractAddress').required = false
    } else if (!$('#chkContractContact').checked) {
      $('#chkContractContact').required = false
    }
    $('#contractName').setAttribute('name', 'contractName')
    $('#contractKanaName').setAttribute('name', 'contractKanaName')
    $('#contractName').required = true
    $('#contractKanaName').required = true
  } else {
    if (!$('#chkContractAddress').checked && !$('#chkContractContact').checked) {
      $('#chkContractAddress').required = true
      $('#chkContractContact').required = true
    } else {
      this.required = false
    }
    $('#contractName').removeAttribute('name')
    $('#contractKanaName').removeAttribute('name')
    $('#recontractName').innerHTML = ''
    $('#recontractKanaName').innerHTML = ''
    $('#contractName').required = false
    $('#contractKanaName').required = false
  }
})

// 契約者住所変更欄表示
$('#chkContractAddress').addEventListener('change', function () {
  if (this.checked || $('#chkContractName').checked || $('#chkContractContact').checked) {
    $('#next-btn').removeAttribute('disabled')
  } else {
    $('#next-btn').setAttribute('disabled', '')
  }
  $('#cardContractAddress').classList.toggle('is-invisible')
  $('#modalContractAddress').classList.toggle('is-invisible')
  if (this.checked) {
    this.required = true
    if (!$('#chkContractName').checked && !$('#chkContractContact').checked) {
      $('#chkContractName').required = false
      $('#chkContractContact').required = false
    } else if (!$('#chkContractName').checked) {
      $('#chkContractName').required = false
    } else if (!$('#chkContractContact').checked) {
      $('#chkContractContact').required = false
    }
    $('#postalNumber').setAttribute('name', 'postalNumber')
    $('#contractAddressVal').setAttribute('name', 'contractAddressVal')
    $('#banch1').setAttribute('name', 'banch1')
    $('#tatemono1').setAttribute('name', 'tatemono1')
    $('#postalNumber').required = true
    $('#contractAddressVal').required = true
    $('#banch1').required = true
  } else {
    if (!$('#chkContractName').checked && !$('#chkContractContact').checked) {
      $('#chkContractName').required = true
      $('#chkContractContact').required = true
    } else {
      this.required = false
    }
    $('#postalNumber').removeAttribute('name')
    $('#contractAddressVal').removeAttribute('name')
    $('#banch1').removeAttribute('name')
    $('#tatemono1').removeAttribute('name')
    $('#repostalNumber').innerHTML = ''
    $('#recontractAddressVal').innerHTML = ''
    $('#rebanch1').innerHTML = ''
    $('#retatemono1').innerHTML = ''
    $('#postalNumber').required = false
    $('#contractAddressVal').required = false
    $('#banch1').required = false
  }
})

// 契約者連絡先変更欄表示
$('#chkContractContact').addEventListener('change', function () {
  if (this.checked || $('#chkContractName').checked || $('#chkContractAddress').checked) {
    $('#next-btn').removeAttribute('disabled')
  } else {
    $('#next-btn').setAttribute('disabled', '')
  }
  $('#cardContractContact').classList.toggle('is-invisible')
  $('#modalContractContact').classList.toggle('is-invisible')

  if (this.checked) {
    this.required = true
    if (!$('#chkContractName').checked && !$('#chkContractAddress').checked) {
      $('#chkContractName').required = false
      $('#chkContractAddress').required = false
    } else if (!$('#chkContractName').checked) {
      $('#chkContractName').required = false
    } else if (!$('#chkContractAddress').checked) {
      $('#chkContractAddress').required = false
    }
    $('#contractPersonName').setAttribute('name', 'contractPersonName')
    $('#contractPhoneNumber').setAttribute('name', 'contractPhoneNumber')
    $('#contractMail').setAttribute('name', 'contractMail')
    $('#contractPersonName').required = true
    $('#contractPhoneNumber').required = true
    $('#contractMail').required = true
  } else {
    if (!$('#chkContractName').checked && !$('#chkContractAddress').checked) {
      $('#chkContractName').required = true
      $('#chkContractAddress').required = true
    } else {
      this.required = false
    }
    $('#contractPersonName').removeAttribute('name')
    $('#contractPhoneNumber').removeAttribute('name')
    $('#contractMail').removeAttribute('name')
    $('#recontractPersonName').innerHTML = ''
    $('#recontractPhoneNumber').innerHTML = ''
    $('#recontractMail').innerHTML = ''
    $('#contractPersonName').required = false
    $('#contractPhoneNumber').required = false
    $('#contractMail').required = false
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
