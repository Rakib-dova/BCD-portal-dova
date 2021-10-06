const $ = function (tagObjName) {
  const classNameReg = new RegExp(/\.+[a-zA-Z0-9]/)
  const idNameReg = new RegExp(/\#+[a-zA-Z0-9]/)

  if (classNameReg.test(tagObjName)) {
    const query = document.querySelectorAll(tagObjName)
    query.forEach = function (callback) {
      Array.prototype.forEach.call(query, callback)
    }
    return query
  } else if (idNameReg.test(tagObjName)) {
    return document.querySelectorAll(tagObjName)[0]
  } else {
    return null
  }
}

$('#submit').addEventListener('click', (e) => {
  let validationCheckFlag = false
  if ($('#uploadFormatItemName').value.length > 100 || $('#uploadFormatItemName').value.length === 0) {
    validationCheckFlag = true
  }

  if ($('#uploadType').value.length > 100 || $('#uploadType').value.length === 0) {
    validationCheckFlag = true
  }

  $('.tax').forEach((item) => {
    if (item.value !== '') {
      if (item.value.length > 100) {
        validationCheckFlag = true
      }
    }
  })

  $('.unit').forEach((item) => {
    if (item.value !== '') {
      if (item.value.length > 100) {
        validationCheckFlag = true
      }
    }
  })

  // 必須項目チェック
  $('.dataItem').forEach((item, idx) => {
    switch (idx) {
      case 0:
        if (item.innerText.length === 0) {
          validationCheckFlag = true
        }
        break
      case 1:
        if (item.innerText.length === 0) {
          validationCheckFlag = true
        }
        break
      case 2:
        if (item.innerText.length === 0) {
          validationCheckFlag = true
        }
        break
      case 12:
        if (item.innerText.length === 0) {
          validationCheckFlag = true
        }
        break
      case 13:
        if (item.innerText.length === 0) {
          validationCheckFlag = true
        }
        break
      case 14:
        if (item.innerText.length === 0) {
          validationCheckFlag = true
        }
        break
      case 15:
        if (item.innerText.length === 0) {
          validationCheckFlag = true
        }
        break
      case 16:
        if (item.innerText.length === 0) {
          validationCheckFlag = true
        }
        break
      case 17:
        if (item.innerText.length === 0) {
          validationCheckFlag = true
        }
        break
    }
  })

  if (validationCheckFlag) {
    e.preventDefault()
  }
})
