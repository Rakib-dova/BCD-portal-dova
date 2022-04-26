import { $ } from '../module/getElements.js'
// ----利用規約を最後までスクロールしないとチェックボックスが有効化しない
const iframe = document.getElementById('terms-of-service')
// iframeの高さ
const height = iframe.offsetHeight

function scrollEvent() {
  // スクロールイベントを定義
  iframe.contentDocument.onscroll = function () {
    const scrollHeight = iframe.contentDocument.body.scrollHeight || iframe.contentDocument.documentElement.scrollHeight
    const scrollTop = iframe.contentDocument.body.scrollTop || iframe.contentDocument.documentElement.scrollTop

    // 現在の表示位置の高さ
    const scrollPosition = height + scrollTop
    const proximity = 0

    if ((scrollHeight - scrollPosition) / scrollHeight <= proximity) {
      document.getElementById('check').removeAttribute('disabled')
    }
  }
}

// iframeのonloadはchromeしか動かないためsetIntervalで監視する
// iframe.onload = scrollEvent

const timer = setInterval(function () {
  const iframeDoc = iframe.contentDocument
  // Check if loading is complete
  if (iframeDoc.readyState === 'complete' || iframeDoc.readyState === 'interactive') {
    scrollEvent()
    return clearInterval(timer)
  }
}, 1000)

// ----チェックボックスがオンになれば「次へ」ボタンを有効化
document.getElementById('check').onclick = function () {
  const btn = document.getElementById('next-btn')
  if (this.checked) {
    btn.removeAttribute('disabled')
  } else {
    btn.setAttribute('disabled', 'disabled')
  }
}

// ----「次へ」ボタンが押された際のバリデーションチェック
document.getElementById('next-btn').addEventListener('click', function (e) {
  e.preventDefault()

  // 各項目チェック
  const elements = document.querySelectorAll('input')
  const invalidCheckTarget = []
  Array.prototype.forEach.call(elements, (checkTarget) => {
    if (checkTarget.getAttribute('name') === 'postalNumber') {
      if (
        checkTarget.parentNode.parentNode.parentNode.parentNode.childNodes[3] !== undefined &&
        checkTarget.parentNode.parentNode.parentNode.parentNode.childNodes[3].getAttribute('id') === 'caution'
      ) {
        checkTarget.parentNode.parentNode.parentNode.parentNode.childNodes[3].remove()
      }
    } else if (
      checkTarget.getAttribute('name') === 'contactPhoneNumber' ||
      checkTarget.getAttribute('name') === 'contactMail' ||
      checkTarget.getAttribute('name') === 'password' ||
      checkTarget.getAttribute('name') === 'passwordConfirm'
    ) {
      if (
        checkTarget.parentNode.parentNode.childNodes[3] !== undefined &&
        checkTarget.parentNode.parentNode.childNodes[3].getAttribute('id') === 'caution'
      ) {
        checkTarget.parentNode.parentNode.childNodes[3].remove()
      }
    } else if (
      checkTarget.getAttribute('name') === 'tatemono1' ||
      checkTarget.getAttribute('name') === 'campaignCode' ||
      checkTarget.getAttribute('name') === 'salesPersonName'
    ) {
      if (
        checkTarget.parentNode.parentNode.childNodes[1] !== undefined &&
        checkTarget.parentNode.parentNode.childNodes[1].getAttribute('id') === 'caution'
      ) {
        checkTarget.parentNode.parentNode.childNodes[1].remove()
      }
    } else {
      if (
        checkTarget.parentNode.parentNode.childNodes[2] !== undefined &&
        checkTarget.parentNode.parentNode.childNodes[2].getAttribute('id') === 'caution'
      ) {
        checkTarget.parentNode.parentNode.childNodes[2].remove()
      }
    }
    invalidCheckTarget.push(checkTarget)
  })

  let focusFlag = false
  let focusIdx
  if (invalidCheckTarget.length > 0) {
    let idx = 0
    do {
      if (
        invalidCheckTarget[idx].getAttribute('aria-invalid') === 'true' ||
        invalidCheckTarget[idx].value.length === 0
      ) {
        const cautionRequired = document.createElement('div')
        cautionRequired.classList.add('input-label')
        cautionRequired.classList.add('input-label-required')
        cautionRequired.setAttribute('id', 'caution')
        if (invalidCheckTarget[idx].getAttribute('required') !== null && invalidCheckTarget[idx].value.length === 0) {
          cautionRequired.innerText = '未入力です。'
        }
        if (invalidCheckTarget[idx].getAttribute('aria-invalid') === 'true') {
          cautionRequired.innerText = '入力値が間違いました。'
        }

        if (invalidCheckTarget[idx].getAttribute('name') === 'postalNumber') {
          invalidCheckTarget[idx].parentNode.parentNode.parentNode.parentNode.appendChild(cautionRequired)
          invalidCheckTarget[idx].parentNode.parentNode.parentNode.parentNode.insertBefore(
            cautionRequired,
            invalidCheckTarget[idx].parentNode.parentNode.parentNode.parentNode.childNodes[3]
          )
        } else if (
          invalidCheckTarget[idx].getAttribute('name') === 'contactPhoneNumber' ||
          invalidCheckTarget[idx].getAttribute('name') === 'contactMail' ||
          invalidCheckTarget[idx].getAttribute('name') === 'password' ||
          invalidCheckTarget[idx].getAttribute('name') === 'passwordConfirm'
        ) {
          invalidCheckTarget[idx].parentNode.parentNode.appendChild(cautionRequired)
          invalidCheckTarget[idx].parentNode.parentNode.insertBefore(
            cautionRequired,
            invalidCheckTarget[idx].parentNode.parentNode.childNodes[3]
          )
        } else if (
          invalidCheckTarget[idx].getAttribute('name') === 'tatemono1' ||
          invalidCheckTarget[idx].getAttribute('name') === 'campaignCode' ||
          invalidCheckTarget[idx].getAttribute('name') === 'salesPersonName'
        ) {
          if (cautionRequired.innerText !== '') {
            invalidCheckTarget[idx].parentNode.parentNode.appendChild(cautionRequired)
            invalidCheckTarget[idx].parentNode.parentNode.insertBefore(
              cautionRequired,
              invalidCheckTarget[idx].parentNode.parentNode.childNodes[1]
            )
          }
        } else {
          invalidCheckTarget[idx].parentNode.parentNode.appendChild(cautionRequired)
          invalidCheckTarget[idx].parentNode.parentNode.insertBefore(
            cautionRequired,
            invalidCheckTarget[idx].parentNode.parentNode.childNodes[2]
          )
        }

        if (cautionRequired.innerText !== '') {
          if (!focusFlag) {
            focusFlag = true
            focusIdx = idx
          }
        }
      }
      idx++
    } while (invalidCheckTarget[idx])
    if (focusIdx >= 0) {
      invalidCheckTarget[focusIdx].focus()
      return false
    }
  }

  // 各項目チェック前にpasswordチェック
  if ($('#password').value !== $('#passwordConfirm').value) {
    if (
      !(
        $('#password').parentNode.parentNode.childNodes[3] !== undefined &&
        $('#password').parentNode.parentNode.childNodes[3].getAttribute('id') === 'caution'
      )
    ) {
      const cautionRequired = document.createElement('div')
      cautionRequired.classList.add('input-label')
      cautionRequired.classList.add('input-label-required')
      cautionRequired.setAttribute('id', 'caution')
      cautionRequired.innerText = '入力されたパスワードが一致しません。'

      $('#password').parentNode.parentNode.appendChild(cautionRequired)
      $('#password').parentNode.parentNode.insertBefore(
        cautionRequired,
        $('#password').parentNode.parentNode.childNodes[3]
      )
    }

    if (
      !(
        $('#passwordConfirm').parentNode.parentNode.childNodes[3] !== undefined &&
        $('#passwordConfirm').parentNode.parentNode.childNodes[3].getAttribute('id') === 'caution'
      )
    ) {
      const cautionRequired = document.createElement('div')
      cautionRequired.classList.add('input-label')
      cautionRequired.classList.add('input-label-required')
      cautionRequired.setAttribute('id', 'caution')
      cautionRequired.innerText = '入力されたパスワードが一致しません。'

      $('#passwordConfirm').parentNode.parentNode.appendChild(cautionRequired)
      $('#passwordConfirm').parentNode.parentNode.insertBefore(
        cautionRequired,
        $('#passwordConfirm').parentNode.parentNode.childNodes[3]
      )
    }
    $('#password').focus()
    return false
  }

  const contractAddressVal = $('#contractAddressVal')
  const banch1 = $('#banch1')

  if (contractAddressVal.value.length === 0 || banch1.value.length === 0) {
    alert('入力されていない必須項目、または、入力形式に誤りがある項目があります。')
    $('#postalNumber').focus()
    return false
  }

  // 確認項目（type="text）
  let index = 0
  const inputText = document.querySelectorAll('input[type="text"]')
  const checkData = $('.checkData')
  Array.prototype.forEach.call(inputText, function (confirmClientInfo) {
    const targetData = checkData.item(index)

    if (
      confirmClientInfo.id.toString() !== 'banch1' &&
      confirmClientInfo.id.toString() !== 'tatemono1' &&
      confirmClientInfo.id.toString() !== 'contractAddressVal'
    ) {
      targetData.innerHTML = confirmClientInfo.value
      index++
    } else {
      if (confirmClientInfo.id.toString() === 'contractAddressVal') {
        targetData.innerHTML = confirmClientInfo.value
      } else {
        targetData.innerHTML += confirmClientInfo.value
      }
      if (confirmClientInfo.id.toString() === 'tatemono1') {
        index++
      }
    }
  })

  // 確認項目（type="select"、type="password"）
  document.getElementById('repassword').innerHTML = document.getElementById('password').value

  const elementCheckbox = document.querySelector('input[type="checkbox"]')
  const targetCheckbox = elementCheckbox.name

  if (document.getElementById('form').checkValidity()) {
    if (elementCheckbox.value === 'on') {
      const tdCheckbox = document.getElementById(targetCheckbox)

      // 権限に応じて同意文言を変える
      const isUser = document.getElementById('submit').getAttribute('formAction').includes('/user')
      tdCheckbox.innerHTML = isUser ? '確認しました' : '同意する'
      const modal = document.getElementById('confirmregister-modal')
      if (modal) modal.classList.toggle('is-active')

      return false
    } else {
      // checkValidity()でバリデーションのため正常系では下記アラートは表示されない
      alert('利用規約への同意が必要です。')

      return false
    }
  }
  // return falseで返すとバリデーションの結果が画面表示されないためコメントアウト
  // return false;
})

// ----動的なフォーム入力のバリデーションチェック
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

// ---- 登録ボタン押下時のフロント側での二重送信防止
document.getElementById('form').onsubmit = function () {
  document.getElementById('submit').setAttribute('disabled', 'disabled')
}

// modal toggle 追加

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

$('#postalSearchBtn').addEventListener('click', function () {
  // 住所検索ボタンが非活性化の時は動作しない
  if ($('#postalSearchBtn').getAttribute('disabled') !== null) {
    return
  }
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

// クリアボタン機能
$('#postalClearBtn').addEventListener('click', function () {
  // クリアボタンが非活性化の時は動作しない
  if ($('#postalClearBtn').getAttribute('disabled') !== null) {
    return
  }
  // 住所情報クリア
  $('#postalNumber').value = ''
  $('#contractAddressVal').value = ''
  $('#banch1').value = ''
  $('#tatemono1').value = ''
  // 郵便番号を入力可能に変更
  $('#postalNumber').readOnly = false
  // クリアボタン非活性化
  $('#postalClearBtn').setAttribute('disabled', 'disabled')
})

// 郵便番号入力不可に変更 、住所検索ボタン非活性化、クリアボタン活性化
function freezePostalSearchBtn() {
  $('#postalNumber').readOnly = true
  $('#postalSearchBtn').setAttribute('disabled', 'disabled')
  $('#postalClearBtn').removeAttribute('disabled')
}
