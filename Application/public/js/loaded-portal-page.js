import * as bulmaToast from './bulma-toast.js'

// Clipboard APIを利用したいがiframeの外側（トレードシフト）から使えない
// execCommandは今後ブラウザの機能から削除され、使用不可になる
if (typeof document.execCommand === 'function' && document.getElementById('copy-btn')) {
  document.getElementById('copy-btn').onclick = function () {
    const textbox = document.getElementById('numberN')
    textbox.select()
    if (document.execCommand('copy')) {
      bulmaToast.toast({
        message: 'お客様番号をコピーしました',
        duration: 2000,
        type: 'is-info',
        dismissible: true,
        closeOnClick: true,
        position: 'top-center',
        animate: { in: 'fadeIn', out: 'fadeOut' }
      })
    } else {
      bulmaToast.toast({
        message: 'コピーに失敗しました',
        duration: 2000,
        type: 'is-info',
        dismissible: true,
        closeOnClick: true,
        position: 'top-center',
        animate: { in: 'fadeIn', out: 'fadeOut' }
      })
    }
  }
} else {
  // クリップボードコピーが機能しない場合はコピーボタンを削除
  const elm = document.getElementById('copy-btn')
  if (elm) elm.parentNode.removeChild(elm)
}

// フラッシュメッセージがあれば表示
const messageInfoElement = document.getElementById('message-info')
if (messageInfoElement != null) {
  bulmaToast.toast({
    message: messageInfoElement.title,
    duration: 15000,
    type: 'is-info',
    dismissible: true,
    closeOnClick: true,
    position: 'top-center',
    animate: { in: 'fadeIn', out: 'fadeOut' }
  })
}

// フラッシュエラーメッセージがあれば表示
const messageErrorElement = document.getElementById('message-error')
if (messageErrorElement != null) {
  bulmaToast.toast({
    message: messageErrorElement.title,
    duration: 15000,
    type: 'is-danger',
    dismissible: true,
    closeOnClick: true,
    position: 'top-center',
    animate: { in: 'fadeIn', out: 'fadeOut' }
  })
}
