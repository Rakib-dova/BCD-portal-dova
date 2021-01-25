import * as bulmaToast from './bulma-toast.js'

// Clipboard APIを利用
document.getElementById('copy-btn').onclick = function () {
  const textbox = document.getElementById('tenantId')
  textbox.select()
  navigator.clipboard.writeText(textbox.value).then(
    function () {
      bulmaToast.toast({
        message: 'お客様番号をコピーしました',
        duration: 2000,
        type: 'is-info',
        dismissible: true,
        closeOnClick: true,
        position: 'top-center',
        animate: { in: 'fadeIn', out: 'fadeOut' }
      })
    },
    function (err) {
      console.error('Async: Could not copy text: ', err)
    }
  )
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
