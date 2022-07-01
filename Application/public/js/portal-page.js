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

const config = {
  headers: {
    'Content-Type': 'application/json'
  }
}
const result = BconAxios.get('/api/noticeCount', config)
result.then((res) => {
  const errorStatus = res.status
  switch (errorStatus) {
    case 403:
      document.querySelector('.approvalNotificationMessage').innerText = 'ログインユーザーではありません。'
      return
    case 500:
      document.querySelector('.approvalNotificationMessage').innerText = 'システムエラーが発生しました。'
      return
  }

  const data = res.data.split(',')
  createNotification(data[0], data[1])
})

function createElement(cnt, request, link) {
  const approvalNotification = document.createElement('div')
  const approvalNotificationMessage = document.createElement('div')
  const approvalNotificationCnt = document.createElement('div')
  const approvalNotificationLink = document.createElement('a')

  approvalNotificationCnt.innerText = `${cnt}`
  approvalNotificationCnt.classList.add('approvalNotificationCnt')
  approvalNotificationMessage.innerText = `${request}が`
  approvalNotificationMessage.classList.add('approvalNotificationMessage')

  approvalNotificationLink.setAttribute('href', link)
  approvalNotificationLink.innerText = '確認'
  approvalNotificationLink.classList.add('approvalNotificationLink')

  approvalNotificationMessage.append(approvalNotificationCnt)
  approvalNotificationMessage.append('件あります。')
  approvalNotification.append(approvalNotificationMessage)
  approvalNotification.append(approvalNotificationLink)
  approvalNotification.classList.add('approvalNotification')
  return approvalNotification
}

function createNotification(requestNoticeCnt, rejectedNoticeCnt) {
  if (~~requestNoticeCnt <= 0 && ~~rejectedNoticeCnt <= 0) {
    document.querySelector('.approvalNotificationMessage').innerText = '承認・差し戻し依頼はありません。'
    return
  }

  document.querySelector('.approvalNotification').remove()

  if (~~requestNoticeCnt > 0) {
    const requestNotice = createElement(requestNoticeCnt, '支払依頼', '/inboxList/approvals')
    document.querySelector('.column.is-12.menu').append(requestNotice)
  }
  if (~~rejectedNoticeCnt > 0) {
    const rejectedNotice = createElement(rejectedNoticeCnt, '差し替え依頼', '/inboxList/1')
    document.querySelector('.column.is-12.menu').append(rejectedNotice)
  }
}
