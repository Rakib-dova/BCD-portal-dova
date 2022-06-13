// eslint-disable-next-line no-undef
const $ = getElement

// ----利用規約を最後までスクロールしないとチェックボックスが有効化しない
const iframe = $('#terms-of-service')
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

// 指定されたID項目の値のクリア
const clearValues = function (...ids) {
  for (const id of ids) {
    $('#' + id).value = ''
  }
}

const resultAddressElement = $('.resultAddress')
for (const e of resultAddressElement) {
  e.addEventListener('click', function (e) {
    $('#searchPostalNumber-modal').classList.remove('is-active')
    $('#contractAddressVal').value = e.srcElement.textContent
    clearValues('banch1', 'tatemono1')
    freezePostalSearchBtn()
  })
}
// ----チェックボックスがオンになれば「次へ」ボタンを有効化
document.getElementById('check').onclick = function () {
  const btn = document.getElementById('next-btn')
  if (this.checked) {
    btn.removeAttribute('disabled')
  } else {
    btn.setAttribute('disabled', 'disabled')
  }
}

// ----「次へ」ボタンが押された
$('#next-btn').addEventListener('click', function (e) {
  e.preventDefault()

  const elements = document.querySelectorAll('input')

  // 初回エラー 項目のエレメントの初期化
  let firstError
  // 各項目のバリデーションチェック
  for (const element of elements) {
    // 項目のエラーメッセージ表示先のエレメントの取得
    console.log(element.getAttribute('name'))
    const messageElement = $('#' + element.getAttribute('name') + 'Message')
    // 項目のエラーメッセージのクリア
    if (messageElement) messageElement.textContent = ''

    const readOnlyRequired = element.readOnly && element.required && !element.value
    // バリデーション失敗、また、(読取のみ、かつ必須)の場合
    if (!element.validity.valid || readOnlyRequired) {
      // 初回エラー 項目のエレメントの設定
      if (!firstError) firstError = element
      // 必須バリデーション失敗の場合
      if (element.validity.valueMissing || readOnlyRequired) {
        if (messageElement) messageElement.textContent = '　未入力です。'
      } else {
        if (messageElement) messageElement.textContent = '　入力値が間違いました。'
      }
    }

    // 確認モーダルの各項目の設定
    const reviewElement = $('#re' + element.getAttribute('name'))
    if (reviewElement) reviewElement.textContent = element.value
  }

  // passwordチェック
  if ($('#password').value !== $('#passwordConfirm').value) {
    if (!firstError) firstError = $('#password')
    $('#passwordMessage').textContent = '　入力されたパスワードが一致しません。'
  }

  if (firstError) {
    // 初回エラー 項目にフォーカス
    firstError?.focus()
  } else {
    // 住所の組み合わせ
    const readdressElement = $('#recontractAddress')
    if (readdressElement) {
      readdressElement.textContent = $('#contractAddressVal').value + $('#banch1').value + $('#tatemono1').value
    }

    if ($('#check').value === 'on') {
      // 権限に応じて同意文言を変える
      const isUser = document.getElementById('submit').getAttribute('formAction').includes('/user')
      $('#termsCheck').textContent = isUser ? '確認しました' : '同意する'
    }

    const modal = $('#confirmregister-modal')
    if (modal) modal.classList.toggle('is-active')
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

$('#postalSearchBtn').addEventListener('click', function () {
  $('#searchPostalNumber-modal').classList.add('is-active')
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
