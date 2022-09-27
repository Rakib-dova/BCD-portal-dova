/*
ページ概要：承認ルート一覧
ページ遷移：Home画面→仕訳情報管理→承認ルート一覧
*/

/* global

 $

*/

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

// 承認ルート一覧表示
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

// モーダルに削除するuuidを格納
document.getElementsByName('deleteButton').forEach((item) => {
  item.addEventListener('click', function (e) {
    const uuid = item.getAttribute('uuid')
    $('#modalDelBtn').setAttribute('uuid', uuid)
  })
})

// Modalの削除ボタン押下
Array.prototype.forEach.call(document.querySelectorAll('#modalDelBtn'), (item) => {
  item.addEventListener('click', function (e) {
    const csrfToken = document.querySelector('input[name="_csrf"]').value
    const approveRouteId = item.getAttribute('uuid')
    const url = `/deleteApproveRoute/${approveRouteId}`
    fetch(url, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'CSRF-Token': csrfToken
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

// 「確認・変更」ボタン押下時の処理
document.getElementsByName('confirmButton').forEach((item) => {
  item.addEventListener('click', function (e) {
    const csrfToken = document.querySelector('input[name="_csrf"]').value
    const uuid = item.getAttribute('uuid')
    const url = `/deleteApproveRoute/${uuid}`
    fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'CSRF-Token': csrfToken
      }
    })
      .then((response) => response.json())
      .catch(() => {
        return { result: 'SYSERR' }
      })
      .then((response) => {
        // 削除失敗
        switch (response.result) {
          case 0:
            alert('削除失敗しました。（システムエラー）')
            break
          case 1:
            // 確認ページに遷移
            location.href = '/approveRouteEdit' + '/' + uuid
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
