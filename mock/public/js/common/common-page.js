// モーダルの表示非表示
const elements = document.querySelectorAll('.modal .delete, .modal .cancel-button, .show-modal')
const elementsArr = Array.prototype.slice.call(elements)
elementsArr.forEach(function (element) {
  element.addEventListener('click', function (e) {
    const modalId = element.dataset.target
    const modal = document.getElementById(modalId)
    if (modal) modal.classList.toggle('is-active')
  })
})

// eslint-disable-next-line no-unused-vars
const getElement = function (tagObjName) {
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
  if (selectors === undefined) return null
  return Object.assign(selectors, Array.prototype, (type, event) => {
    document.addEventListener(type, event)
  })
}
