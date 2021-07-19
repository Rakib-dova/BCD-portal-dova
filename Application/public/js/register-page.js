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
document.getElementById('next-btn').onclick = function () {
  // 各項目チェック
  const elements = document.querySelectorAll('input[type="text"]')
  const passwords = document.querySelectorAll('input[type="password"]')
  const elementsArr = Array.prototype.slice.call(elements)

  const invalidElements = elementsArr.filter((el) => el.getAttribute('aria-invalid') === 'true')
  if (invalidElements.length > 0) {
    alert('入力されていない必須項目、または、入力形式に誤りがある項目があります。')
    invalidElements[0].focus()
    return false
  }

  const contractAddressVal = $('#contractAddressVal')
  const banch1 = $('#banch1')

  if (contractAddressVal.value.length === 0 || banch1.value.length === 0) {
    alert('入力されていない必須項目、または、入力形式に誤りがある項目があります。')
    $('#postalNumber').focus()
    return false
  }

  // password確認
  const passwordsArr = Array.prototype.slice.call(passwords)
  if (passwordsArr[0].value !== passwordsArr[1].value) {
    alert('パスワードが一致しません。')
    document.getElementById('passwordConfirm').setAttribute('aria-invalid', 'true')
    return false
  }

  // 確認項目（type="text）
  let index = 0
  elementsArr.forEach(function (element) {
    if (
      element.id.toString() !== 'banch1' &&
      element.id.toString() !== 'tatemono1' &&
      element.id.toString() !== 'contractAddressVal'
    ) {
      $('.checkData').item(index).innerHTML = element.value
      index++
    } else {
      if (element.id.toString() === 'contractAddressVal') {
        $('.checkData').item(index).innerHTML = element.value
      } else {
        $('.checkData').item(index).innerHTML += element.value
      }
      if (element.id.toString() === 'tatemono1') {
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
}

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

document.getElementById('passwordConfirm').onkeyup = function () {
  // password確認
  const passwords = document.querySelectorAll('input[type="password"]')
  const passwordsArr = Array.prototype.slice.call(passwords)
  if (passwordsArr[0].value !== passwordsArr[1].value) {
    document.getElementById('passwordConfirm').setAttribute('aria-invalid', 'true')
  } else {
    document.getElementById('passwordConfirm').setAttribute('aria-invalid', 'false')
  }
}

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

$('#postalNumber').onkeyup = function () {
  const postalNumberReg = new RegExp(/^[0-9]{7}$/)
  if (!postalNumberReg.test(this.value)) {
    $('#postalSearchBtn').setAttribute('disabled', 'disabled')
    $('#postalSearchBtn').onclick = null
    return
  }
  $('#postalSearchBtn').removeAttribute('disabled')
  $('#postalSearchBtn').onclick = function () {
    const postalNumber = $('#postalNumber').value
    const sendData = { postalNumber: null }
    const modalCardBody = $('#modal-card-result')
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
            $(dataTarget).classList.toggle('is-active')
            modalCardBody.innerHTML = '該当する住所が見つかりませんでした。'
          } else {
            const resultLength = resultAddress.addressList.length
            if (resultLength === 1) {
              $('#contractAddressVal').value = resultAddress.addressList[0].address
              $('#banch1').value = ''
              $('#tatemono1').value = ''
            } else {
              $(dataTarget).classList.toggle('is-active')
              resultAddress.addressList.forEach((obj) => {
                modalCardBody.innerHTML +=
                  '<a class="resultAddress" data-target="#searchPostalNumber-modal">' + obj.address + '<br>'
              })
              $('.resultAddress').forEach((ele) => {
                $(dataTarget).classList.toggle('is-active')
                ele.onclick = () => {
                  $(ele.getAttribute('data-target')).classList.toggle('is-active')
                  $('#contractAddressVal').value = ele.innerHTML.replace('<br>', '')
                  $('#banch1').value = ''
                  $('#tatemono1').value = ''
                }
              })
            }
          }
        } else {
          const errStatus = requestAddressApi.status
          $(dataTarget).classList.toggle('is-active')
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
  }
}
