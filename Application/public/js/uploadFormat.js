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
      return item.parentNode.parentNode.children[0].children[1]
    } else {
      item.parentNode.parentNode.children[0].children[1].classList.remove('not-input-required')
    }
  })

  let stopFlag = true

  notValue.forEach((item) => {
    if (item !== undefined) {
      item.parentNode.parentNode.children[0].children[1].classList.add('not-input-required')
      stopFlag = false
    }
  })

  Array.prototype.forEach.call(document.querySelectorAll('#dataValue'), (item) => {
    if (item.value.length > 100) {
      stopFlag = true
    }
  })

  if (!stopFlag) {
    e.preventDefault()
  }
})

$('#returnBasic').addEventListener('click', () => {
  history.back()
})
