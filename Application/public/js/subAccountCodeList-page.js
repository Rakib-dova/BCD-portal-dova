// document.getElementById、document.getElementsByClassName省略
const $ = function (tagObjName) {
  const classNamePattern = '\\.+[a-zA-Z0-9]'
  const idNamePatten = '\\#+[a-zA-Z0-9]'
  const classNameReg = new RegExp(classNamePattern)
  const idNameReg = new RegExp(idNamePatten)
  let selectors

  if (classNameReg.test(tagObjName)) {
    selectors = document.querySelectorAll(tagObjName)
  } else if (idNameReg.test(tagObjName)) {
    selectors = document.querySelectorAll(tagObjName)[0]
  } else {
    return null
  }
  return Object.assign(selectors, Array.prototype, (type, event) => {
    document.addEventListener(type, event)
  })
}
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
Array.prototype.forEach.call(document.querySelectorAll('.checkChangeSubAccountCodeBtn'), (item) => {
  item.addEventListener('click', function (e) {
    const checkSubAccountCode = item.getAttribute('uuid')
    const url = `/deleteSubAccountCode/${checkSubAccountCode}`
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
            location.href = '/subAccountCodeEdit' + '/' + checkSubAccountCode
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

Array.prototype.forEach.call(document.querySelectorAll('.deleteSubAccountCodeBtn'), (item) => {
  item.addEventListener('click', function () {
    const subAccountCodeId = item.getAttribute('uuid')
    $('#modalCodeDelBtn').setAttribute('uuid', subAccountCodeId)
  })
})

// Modalの削除ボタン押下
Array.prototype.forEach.call(document.querySelectorAll('#modalCodeDelBtn'), (item) => {
  item.addEventListener('click', function (e) {
    const subAccountCodeId = item.getAttribute('uuid')
    const url = `/deleteSubAccountCode/${subAccountCodeId}`
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
