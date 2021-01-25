// ----利用規約を最後までスクロールしないとチェックボックスが有効化しない
const iframe = document.getElementById('terms-of-service')
// iframeの高さ
const height = iframe.offsetHeight

function scrollEvent() {
  // スクロールイベントを定義
  iframe.contentDocument.onscroll = function () {
    const scrollHeight = iframe.contentDocument.body.scrollHeight
    const scrollTop = iframe.contentDocument.body.scrollTop

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
  /*
  const elements = document.querySelectorAll('input[type="text"]')
  const elementsArr = Array.prototype.slice.call(elements)
  elementsArr.forEach(function (element) {
    const target = element.name
    const td = document.getElementById(target)
    td.innerHTML = element.value
  })
*/
  const elementCheckbox = document.querySelector('input[type="checkbox"]')
  const targetCheckbox = elementCheckbox.name

  if (document.getElementById('form').checkValidity()) {
    if (elementCheckbox.value === 'on') {
      const tdCheckbox = document.getElementById(targetCheckbox)
      tdCheckbox.innerHTML = '同意する'
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
