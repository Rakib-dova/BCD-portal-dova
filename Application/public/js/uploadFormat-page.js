const $ = function (tagObjName) {
  const classPatten = '\\.+[a-zA-Z0-9]'
  const idPatten = '\\#+[a-zA-Z0-9]'
  const classNameReg = new RegExp(classPatten)
  const idNameReg = new RegExp(idPatten)

  if (classNameReg.test(tagObjName)) {
    const selectors = document.querySelectorAll(tagObjName)
    return Object.assign(selectors, Array.prototype, (type, event) => {
      document.addEventListener(type, event)
    })
  } else if (idNameReg.test(tagObjName)) {
    const selectors = document.querySelectorAll(tagObjName)[0]
    return Object.assign(selectors, Array.prototype, (type, event) => {
      document.addEventListener(type, event)
    })
  } else {
    return null
  }
}

$('#confirmBtn').addEventListener('click', function (e) {
  e.preventDefault()
  const modal = document.getElementById('confirmmodify-modal')
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

  if (!stopFlag) {
    modal.classList.remove('is-active')
  } else {
    modal.classList.add('is-active')
  }
})

$('#returnBtn').addEventListener('click', () => {
  history.back()
})
