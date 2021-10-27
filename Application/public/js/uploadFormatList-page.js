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

// 削除ボタン押下時の処理
document.getElementsByName('deleteButton').forEach((item) => {
  item.addEventListener('click', function (e) {
    const decision = confirm('削除しますか？')
    if (!decision) {
      return 0
    } else {
      const uuid = item.getAttribute('uuid')
      const url = `/uploadFormat/delete/${uuid}`
      fetch(url, {
        method: 'POST',
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
              // ページ更新(location.reload)
              location.reload()
              break
            case -1:
              alert('すでに削除されています')
              break
          }
        })
    }
  })
})
