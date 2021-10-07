const $ = function (tagObjName) {
  const classPatten = '\\.+[a-zA-Z0-9]'
  const idPatten = '\\#+[a-zA-Z0-9]'
  const classNameReg = new RegExp(classPatten)
  const idNameReg = new RegExp(idPatten)

  if (classNameReg.test(tagObjName)) {
    const selectors = document.querySelectorAll(tagObjName)
    return Object.assign(selectors, Array.prototype)
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

  if (!stopFlag) {
    e.preventDefault()
  } else {
    // $('#csvFormatConfirm-modal').classList.add('is-active')
    // const targetDataNumSelect = Object.assign(document.querySelectorAll('select'), Array.prototype)
    // const displayFormatData = $('.displayFormatData')
    // const formatDatas = $('.formatDatas')
    // displayFormatData.forEach((item, idx) => {
    //   item.innerText =
    //     targetDataNumSelect[idx].value === '' ? targetDataNumSelect[idx].value : ~~targetDataNumSelect[idx].value + 1
    //   formatDatas[idx].value = item.innerText
    // })
    // e.preventDefault()
  }
})
