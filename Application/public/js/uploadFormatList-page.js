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

// 確認ボタン押下時の処理
document.getElementsByName('confirmButton').forEach((item) => {
  item.addEventListener('click', function (e) {
    const uuid = item.getAttribute('uuid')
    const url = `/uploadFormat/${uuid}`
    fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    })
      .then((response) => response.json())
      .then((response) => {
        // 削除失敗
        switch (response.result) {
          case 0:
            alert('システムエラー')
            break
          case 1:
            // 確認ページに遷移
            location.href = '/uploadFormatEdit' + '/' + uuid
            break
          case -1:
            alert('すでに削除されています。\n「OK」ボタンを押下し、画面内容を最新します。')
            location.reload()
            break
        }
      })
  })
})

// 削除ボタン押下時の処理
document.getElementsByName('deleteButton').forEach((item) => {
  item.addEventListener('click', function (e) {
    const decision = confirm('削除しますか？')

    if (!decision) {
      return 0
    } else {
      const uuid = item.getAttribute('uuid')
      const url = `/uploadFormat/${uuid}`
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
              alert('削除失敗-システムエラー')
              break
            case 1:
              // ページ更新
              alert('削除しました。\n「OK」ボタンを押下し、画面内容を最新します。')
              location.reload()
              break
            case -1:
              alert('すでに削除されています。\n「OK」ボタンを押下し、画面内容を最新します。')
              location.reload()
              break
          }
        })
    }
  })
})
