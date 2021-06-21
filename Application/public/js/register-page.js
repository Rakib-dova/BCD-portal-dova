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
  const invalidElements = elementsArr.filter(el => el.getAttribute('aria-invalid') === 'true')
  if (invalidElements.length > 0) {
    alert('必須項目の漏れまたは、要求された形式に一致されないところがあります。')
    invalidElements[0].focus()
    return false
  }

  const contractAddressTo = document.querySelectorAll('select[type="select"]')
  if (contractAddressTo.value === '') {
    alert('必須項目の漏れまたは、要求された形式に一致されないところがあります。')
    contractAddressTo.focus()
    return false
  }

  // 契約者住所（丁目まで)のサイズ​が全角46桁かチェック
  const contractAddressAddr = elementsArr.filter(el => {
    if (el.id === 'contractAddressSi'|| el.id === 'contractAddressCho') return el
  })
  
  const contractAddress = contractAddressAddr[0].value + contractAddressAddr[1].value + contractAddressTo[0].options[contractAddressTo[0].selectedIndex].value + ''
  if (contractAddress.length > 46) {
    alert('契約者住所（丁目まで）の文字数が46桁を超えました。')
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
    document.getElementsByClassName('checkData').item(index).innerHTML = element.value
    index = index + 1
  })

  // 確認項目（type="select"、type="password"）
  document.getElementById('recontractAddressTo').innerHTML = document.getElementById('contractAddressTo').value
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