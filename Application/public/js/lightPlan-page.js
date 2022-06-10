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

  const elements = document.querySelectorAll('input')

  // 初回エラー 項目のエレメントの初期化
  let firstError
  for (const element of elements) {
    // 項目のエラーメッセージ表示先のエレメントの取得
    const message = document.getElementById(element.getAttribute('name') + 'Message')
    // 項目のエラーメッセージのクリア
    if (message) message.textContent = ''

    const readOnlyRequired = element.readOnly && element.required
    // バリデーション失敗、また、(読取のみ、かつ必須)の場合
    if (!element.validity.valid || readOnlyRequired) {
      // 初回エラー 項目のエレメントの設定
      if (!firstError) firstError = element
      // 必須バリデーション失敗の場合
      if (element.validity.valueMissing || readOnlyRequired) {
        if (message) message.textContent = '　未入力です。'
      } else {
        if (message) message.textContent = '　入力値が間違いました。'
      }
    }
  }
  // 初回エラー 項目にフォーカス
  firstError?.focus()
})
