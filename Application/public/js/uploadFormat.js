const $ = function (tagObjName) {
  const classNameReg = new RegExp(/\.+[a-zA-Z0-9]/)
  const idNameReg = new RegExp(/\#+[a-zA-Z0-9]/)

  if (classNameReg.test(tagObjName)) {
    return document.querySelectorAll(tagObjName)
  } else if (idNameReg.test(tagObjName)) {
    return document.querySelectorAll(tagObjName)[0]
  } else {
    return null
  }
}

$('#confirmBtn').addEventListener('click', function (e) {
  const notValue = Array.prototype.map.call($('.requiredItem'), (item) => {
    const selectNumber = item.selectedIndex
    const itemValue = item.options[selectNumber].value
    if (itemValue === '') {
      return item.parentNode.parentNode.children[0].children[2]
    } else {
      item.parentNode.parentNode.children[0].children[2].innerText = ''
    }
  })

  let stopFlag = true

  notValue.forEach((item) => {
    if (item !== undefined) {
      item.innerText = '未入力です。'
      stopFlag = false
    }
  })

  if (!stopFlag) {
    e.preventDefault()
  } else {
    window.location.href = '../portal'
  }
})
