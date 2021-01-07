import * as bulmaToast from './bulma-toast.js'

// モーダルの表示非表示
const elements = document.querySelectorAll('.modal .delete, .modal .cancel-button, .show-modal')
const elementsArr = Array.prototype.slice.call(elements)
elementsArr.forEach(function (element) {
  element.addEventListener('click', function (e) {
    const modalId = element.dataset.target
    const modal = document.getElementById(modalId)
    if (modal) modal.classList.toggle('is-active')
  })
})

// フラッシュメッセージがあれば表示
// パラメータを変更する際はCSPのstyle-srcに指定したハッシュも変更が必要な場合がある
// ハッシュ値は（Chromeのデバッグツールで確認）

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
