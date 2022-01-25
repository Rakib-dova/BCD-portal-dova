import { $ } from '../module/getElements.js'

// UserAgentで判定し
// IE以外は動的にスクリプトをロード
const ua = window.navigator.userAgent
if (ua.indexOf('MSIE ') === -1 && ua.indexOf('Trident') === -1) {
  const tag = document.createElement('script')
  tag.type = 'module'
  tag.src = '/js/loaded-portal-page.js'
  document.getElementsByTagName('body')[0].appendChild(tag)
} else {
  // IEはクリップボードコピーが機能しないのでコピーボタンを削除
  const elm = document.getElementById('copy-btn')
  if (elm) elm.parentNode.removeChild(elm)
}

window.onload = () => {
  document.querySelectorAll('.tabs').forEach((tab) => {
    tab.querySelectorAll('li').forEach((li) => {
      li.onclick = () => {
        tab.querySelector('li.is-active').classList.remove('is-active')
        li.classList.add('is-active')
        tab.nextElementSibling.querySelector('.tab-pane.is-active').classList.remove('is-active')
        tab.nextElementSibling
          .querySelector('.tab-pane#' + li.firstElementChild.getAttribute('id'))
          .classList.add('is-active')
      }
    })
  })
}

// 「確認・変更」ボタン押下時の処理
Array.prototype.forEach.call(document.querySelectorAll('.checkChangeAccountCodeBtn'), (item) => {
  item.addEventListener('click', function (e) {
    const checkAccountCode = item.getAttribute('uuid')
    const url = `/deleteAccountCode/${checkAccountCode}`
    fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    })
      .then((response) => response.json())
      .catch(() => {
        return { result: 'SYSERR' }
      })
      .then((response) => {
        switch (response.result) {
          case 1:
            // 確認ページに遷移
            location.href = '/accountCodeEdit' + '/' + checkAccountCode
            break
          case -1:
            alert('既に削除されています。\n「OK」ボタンを押下し、画面内容を最新にします。')
            location.reload()
            break
          default:
            alert('システムエラーが発生しました。')
            break
        }
      })
  })
})

// 一覧から各レコードの削除ボタン押下
Array.prototype.forEach.call(document.querySelectorAll('.deleteAccountCodeBtn'), (item) => {
  item.addEventListener('click', () => {
    const accountCodeId = item.getAttribute('uuid')
    $('#modalCodeDelBtn').setAttribute('uuid', accountCodeId)
  })
})

// Modalの削除ボタン押下
Array.prototype.forEach.call(document.querySelectorAll('#modalCodeDelBtn'), (item) => {
  item.addEventListener('click', function (e) {
    const accountCodeId = item.getAttribute('uuid')
    const url = `/deleteAccountCode/${accountCodeId}`
    fetch(url, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      }
    })
      .then((response) => response.json())
      .then((response) => {
        // 削除失敗
        switch (response.result) {
          case 0:
            alert('削除失敗しました。（システムエラー）')
            break
          case 1:
            // ページ更新
            location.reload()
            break
          case -1:
            alert('既に削除されています。\n「OK」ボタンを押下し、画面内容を最新にします。')
            location.reload()
            break
        }
      })
  })
})
