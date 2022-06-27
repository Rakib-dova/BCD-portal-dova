import BconAxios from './lib/BconAxios.js'
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

const result = BconAxios.get('/api/message', {})
result.then((res) => {
  console.log('res', res)
  createNotification(res)
})

function createNotification(itemCnt) {
  if (~~itemCnt <= 0) {
    return
  }
  const approvalNotification = document.createElement('div')
  const approvalNotificationMessage = document.createElement('div')
  const approvalNotificationCnt = document.createElement('div')
  const approvalNotificationLink = document.createElement('a')

  approvalNotificationCnt.innerText = `${itemCnt}件あります。`
  approvalNotificationCnt.classList.add('approvalNotificationCnt')
  approvalNotificationMessage.innerText = '支払依頼が'
  approvalNotificationMessage.classList.add('approvalNotificationMessage')

  approvalNotificationLink.setAttribute('href', '/inboxList/approvals')
  approvalNotificationLink.innerText = '確認'
  approvalNotificationLink.classList.add('approvalNotificationLink')

  approvalNotificationMessage.append(approvalNotificationCnt)
  approvalNotificationMessage.append(approvalNotificationLink)
  approvalNotification.append(approvalNotificationMessage)
  approvalNotification.classList.add('approvalNotification')
  document.querySelector('.column.is-12.menu').append(approvalNotification)
}
