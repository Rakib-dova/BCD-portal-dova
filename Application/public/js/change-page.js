import { $ } from '../module/getElements.js'
// 確認ボタン押下するとmodalに契約者名・契約者住所が表示処理
$('#next-btn').addEventListener('click', function (event) {
  const checkValidations = []
  // event.preventDefault()
  let elements = document.querySelectorAll('input[type=text]')
  elements = Array.prototype.slice.call(elements)
  const requiredList = elements.filter((ele) => ele.getAttribute('required') !== null)
  requiredList.map((ele) => {
    if (ele !== undefined) {
      if (ele.value.length === 0) {
        if (ele.id === 'postalNumber') {
          ele.parentNode.parentNode.parentNode.parentNode.childNodes[3].classList.remove('is-invisible')
          ele.parentNode.parentNode.parentNode.parentNode.childNodes[4].classList.add('is-invisible')
        } else if (ele.id === 'contactPhoneNumber' || ele.id === 'contactMail') {
          ele.parentNode.parentNode.childNodes[3].classList.remove('is-invisible')
          ele.parentNode.parentNode.childNodes[4].classList.add('is-invisible')
        } else {
          ele.parentNode.parentNode.childNodes[2].classList.remove('is-invisible')
          ele.parentNode.parentNode.childNodes[3].classList.add('is-invisible')
        }
      } else if (ele.getAttribute('aria-invalid') === 'true') {
        if (ele.id === 'postalNumber') {
          ele.parentNode.parentNode.parentNode.parentNode.childNodes[4].classList.remove('is-invisible')
          ele.parentNode.parentNode.parentNode.parentNode.childNodes[3].classList.add('is-invisible')
        } else if (ele.id === 'tatemono1') {
          ele.parentNode.parentNode.childNodes[1].classList.remove('is-invisible')
        } else if (ele.id === 'contactPhoneNumber' || ele.id === 'contactMail') {
          ele.parentNode.parentNode.childNodes[4].classList.remove('is-invisible')
          ele.parentNode.parentNode.childNodes[3].classList.add('is-invisible')
        } else {
          ele.parentNode.parentNode.childNodes[3].classList.remove('is-invisible')
          ele.parentNode.parentNode.childNodes[2].classList.add('is-invisible')
        }
      } else {
        if (ele.id === 'postalNumber') {
          ele.parentNode.parentNode.parentNode.parentNode.childNodes[4].classList.add('is-invisible')
          ele.parentNode.parentNode.parentNode.parentNode.childNodes[3].classList.add('is-invisible')
        } else if (ele.id === 'tatemono1') {
          ele.parentNode.parentNode.childNodes[1].classList.add('is-invisible')
        } else if (ele.id === 'contactPhoneNumber' || ele.id === 'contactMail') {
          ele.parentNode.parentNode.childNodes[4].classList.add('is-invisible')
          ele.parentNode.parentNode.childNodes[3].classList.add('is-invisible')
        } else {
          ele.parentNode.parentNode.childNodes[3].classList.add('is-invisible')
          ele.parentNode.parentNode.childNodes[2].classList.add('is-invisible')
        }
      }
    }
    return ele
  })

  if ($('#chkContractAddress').checked) {
    const contractAddressVal = $('#contractAddressVal').value
    // 住所の値が空の場合
    if (!contractAddressVal) {
      $('#contractAddressValErrormessage').classList.remove('is-invisible')
    } else {
      $('#contractAddressValErrormessage').classList.add('is-invisible')
    }

    // 建物等が形式に合わない場合
    if ($('#tatemono1').getAttribute('aria-invalid') === 'true') {
      $('#tatemono1WrongInput').classList.remove('is-invisible')
    } else {
      $('#tatemono1WrongInput').classList.add('is-invisible')
    }
  }

  if ($('#chkContractorName').checked) {
    $('#recontractorName').innerHTML = $('#contractorName').value
    $('#recontractorKanaName').innerHTML = $('#contractorKanaName').value
    checkValidations.push($('#contractorNameNoInput'))
    checkValidations.push($('#contractorNameWrongInput'))
    checkValidations.push($('#contractorKanaNameNoInput'))
    checkValidations.push($('#contractorKanaNameWrongInput'))
  }
  if ($('#chkContractAddress').checked) {
    $('#repostalNumber').innerHTML = $('#postalNumber').value
    $('#recontractAddressVal').innerHTML = $('#contractAddressVal').value
    $('#rebanch1').innerHTML = $('#banch1').value
    $('#retatemono1').innerHTML = $('#tatemono1').value
    checkValidations.push($('#postalNumberNoInput'))
    checkValidations.push($('#postalNumberWrongInput'))
    checkValidations.push($('#contractAddressValErrormessage'))
    checkValidations.push($('#banch1NoInput'))
    checkValidations.push($('#banch1WrongInput'))
    checkValidations.push($('#tatemono1WrongInput'))
  }
  if ($('#chkContractContact').checked) {
    $('#recontactPersonName').innerHTML = $('#contactPersonName').value
    $('#recontactPhoneNumber').innerHTML = $('#contactPhoneNumber').value
    $('#recontactMail').innerHTML = $('#contactMail').value
    checkValidations.push($('#contactPersonNameNoInput'))
    checkValidations.push($('#contactPersonNameWrongInput'))
    checkValidations.push($('#contactPhoneNumberNoInput'))
    checkValidations.push($('#contactPhoneNumberWorngInput'))
    checkValidations.push($('#contactMailNoInput'))
    checkValidations.push($('#contactMailWorongInput'))
  }

  let errormessage = document.querySelectorAll('p[name="errormessage"].input-label-required:not(.is-invisible)')
  errormessage = Array.prototype.slice.call(errormessage)
  const result = []
  errormessage.map((err) => {
    checkValidations.map((check) => {
      if (check.id === err.id) {
        result.push(check)
      }
      return check
    })
    return err
  })
  if (result.length === 0) {
    $('#confirmmodify-modal').classList.toggle('is-active')
  }
})

// 契約者名変更欄表示
$('#chkContractorName').addEventListener('change', function () {
  if (this.checked || $('#chkContractAddress').checked || $('#chkContractContact').checked) {
    $('#next-btn').removeAttribute('disabled')
  } else {
    $('#next-btn').setAttribute('disabled', '')
  }
  $('#cardContractorName').classList.toggle('is-invisible')
  $('#modalContractorName').classList.toggle('is-invisible')
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
    $('#contractorName').setAttribute('name', 'contractorName')
    $('#contractorKanaName').setAttribute('name', 'contractorKanaName')
    $('#contractorName').required = true
    $('#contractorKanaName').required = true
  } else {
    if (!$('#chkContractAddress').checked && !$('#chkContractContact').checked) {
      $('#chkContractAddress').required = true
      $('#chkContractContact').required = true
    } else {
      this.required = false
    }
    $('#contractorName').removeAttribute('name')
    $('#contractorKanaName').removeAttribute('name')
    $('#recontractorName').innerHTML = ''
    $('#recontractorKanaName').innerHTML = ''
    $('#contractorName').required = false
    $('#contractorKanaName').required = false
  }
})

// 契約者住所変更欄表示
$('#chkContractAddress').addEventListener('change', function () {
  if (this.checked || $('#chkContractorName').checked || $('#chkContractContact').checked) {
    $('#next-btn').removeAttribute('disabled')
  } else {
    $('#next-btn').setAttribute('disabled', '')
  }
  $('#cardContractAddress').classList.toggle('is-invisible')
  $('#modalContractAddress').classList.toggle('is-invisible')
  if (this.checked) {
    this.required = true
    if (!$('#chkContractorName').checked && !$('#chkContractContact').checked) {
      $('#chkContractorName').required = false
      $('#chkContractContact').required = false
    } else if (!$('#chkContractorName').checked) {
      $('#chkContractorName').required = false
    } else if (!$('#chkContractContact').checked) {
      $('#chkContractContact').required = false
    }
    $('#postalNumber').setAttribute('name', 'postalNumber')
    $('#contractAddressVal').setAttribute('name', 'contractAddressVal')
    $('#banch1').setAttribute('name', 'banch1')
    $('#tatemono1').setAttribute('name', 'tatemono1')
    $('#postalNumber').required = true
    // $('#contractAddressVal').required = true
    $('#banch1').required = true
  } else {
    if (!$('#chkContractorName').checked && !$('#chkContractContact').checked) {
      $('#chkContractorName').required = true
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
    // $('#contractAddressVal').required = false
    $('#banch1').required = false
  }
})

// 契約者連絡先変更欄表示
$('#chkContractContact').addEventListener('change', function () {
  if (this.checked || $('#chkContractorName').checked || $('#chkContractAddress').checked) {
    $('#next-btn').removeAttribute('disabled')
  } else {
    $('#next-btn').setAttribute('disabled', '')
  }
  $('#cardContractContact').classList.toggle('is-invisible')
  $('#modalContractContact').classList.toggle('is-invisible')

  if (this.checked) {
    this.required = true
    if (!$('#chkContractorName').checked && !$('#chkContractAddress').checked) {
      $('#chkContractorName').required = false
      $('#chkContractAddress').required = false
    } else if (!$('#chkContractorName').checked) {
      $('#chkContractorName').required = false
    } else if (!$('#chkContractAddress').checked) {
      $('#chkContractAddress').required = false
    }
    $('#contactPersonName').setAttribute('name', 'contactPersonName')
    $('#contactPhoneNumber').setAttribute('name', 'contactPhoneNumber')
    $('#contactMail').setAttribute('name', 'contactMail')
    $('#contactPersonName').required = true
    $('#contactPhoneNumber').required = true
    $('#contactMail').required = true
  } else {
    if (!$('#chkContractorName').checked && !$('#chkContractAddress').checked) {
      $('#chkContractorName').required = true
      $('#chkContractAddress').required = true
    } else {
      this.required = false
    }
    $('#contactPersonName').removeAttribute('name')
    $('#contactPhoneNumber').removeAttribute('name')
    $('#contactMail').removeAttribute('name')
    $('#recontactPersonName').innerHTML = ''
    $('#recontactPhoneNumber').innerHTML = ''
    $('#recontactMail').innerHTML = ''
    $('#contactPersonName').required = false
    $('#contactPhoneNumber').required = false
    $('#contactMail').required = false
  }
})

$('#postalNumber').addEventListener('input', function () {
  const postalNumberPatten = '^[0-9]{7}$'
  const postalNumberReg = new RegExp(postalNumberPatten)
  if (!postalNumberReg.test(this.value)) {
    $('#postalSearchBtn').setAttribute('disabled', 'disabled')
    $('#postalSearchBtn').onclick = null
    return
  }
  $('#postalSearchBtn').removeAttribute('disabled')
})

// 住所検索ボタン
$('#postalSearchBtn').addEventListener('click', function () {
  if (this.getAttribute('disabled') !== null) return
  const postalNumber = $('#postalNumber').value
  const sendData = { postalNumber: null }
  const modalCardBody = $('#modal-card-result')
  const postalNumberPatten = '^[0-9]{7}$'
  const postalNumberReg = new RegExp(postalNumberPatten)

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
          modalCardBody.innerHTML =
            '該当する住所が見つかりませんでした。<br>住所検索が可能な郵便番号を入力してください。'
        } else {
          const resultLength = resultAddress.addressList.length

          if (resultLength === 1) {
            $('#contractAddressVal').value = resultAddress.addressList[0].address
            $('#banch1').value = ''
            $('#tatemono1').value = ''
            freezePostalSearchBtn()
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
                $('#contractAddressValErrormessage').classList.add('is-invisible')
                freezePostalSearchBtn()
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

addEvent(document, 'change', function (e, target) {
  instantValidation(target)
})

function addEvent(node, type, callback) {
  if (node.addEventListener) {
    node.addEventListener(
      type,
      function (e) {
        callback(e, e.target)
      },
      false
    )
  } else if (node.attachEvent) {
    node.attachEvent('on' + type, function (e) {
      callback(e, e.srcElement)
    })
  }
}

function shouldBeValidated(field) {
  return (
    !(field.getAttribute('readonly') || field.readonly) &&
    !(field.getAttribute('disabled') || field.disabled) &&
    (field.getAttribute('pattern') || field.getAttribute('required'))
  )
}

function instantValidation(field) {
  if (shouldBeValidated(field)) {
    const invalid =
      (field.getAttribute('required') && !field.value) ||
      (field.getAttribute('pattern') && field.value && !new RegExp(field.getAttribute('pattern')).test(field.value))
    if (!invalid && field.getAttribute('aria-invalid')) {
      field.removeAttribute('aria-invalid')
    } else if (invalid && !field.getAttribute('aria-invalid')) {
      field.setAttribute('aria-invalid', 'true')
    }
  }
}

// 郵便番号と住所クリアボタン
$('#postalClearBtn').addEventListener('click', function () {
  if (this.getAttribute('disabled') !== null) return
  this.setAttribute('disabled', 'disabled')
  $('#postalNumber').value = ''
  $('#contractAddressVal').value = ''
  $('#banch1').value = ''
  $('#tatemono1').value = ''
  $('#postalNumber').readOnly = false
})

// 郵便番号検索後、郵便番号入力欄リードオンリー、検索ボタン非活性して、クリアボタン活性化
function freezePostalSearchBtn() {
  $('#postalNumber').readOnly = true
  $('#postalSearchBtn').setAttribute('disabled', 'disabled')
  $('#postalClearBtn').removeAttribute('disabled')
}
