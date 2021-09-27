const uploader = document.getElementById('form')
let fileReader = null
let targetFile = null

document.getElementById('checkItemNameLineOn').onclick = function () {
  document.getElementById('uploadFormatNumber').readOnly = false
}

document.getElementById('checkItemNameLineOff').onclick = function () {
  document.getElementById('uploadFormatNumber').readOnly = true
}

document.getElementById('dataFile').addEventListener('change', function (e) {
  document.getElementById('dataFileName').value = this.files.item(0).name

  targetFile = document.getElementById('dataFile').files.item(0)
  if (targetFile !== null) {
    fileReader = new FileReader()
    fileReader.readAsBinaryString(targetFile)
    fileReader.onload = function () {
      document.getElementById('hiddenFileData').value = btoa(fileReader.result)
      console.log(btoa(fileReader.result))
    }
  }
})

document.getElementById('submit').addEventListener('click', function (e) {

  // 各項目チェック
  const elements = document.querySelectorAll('input')
  const invalidCheckTarget = []
  Array.prototype.forEach.call(elements, (checkTarget) => {
    if (checkTarget.getAttribute('name') === 'dataFile') {
      if (
        checkTarget.parentNode.parentNode.parentNode.parentNode.childNodes[2] !== undefined &&
        checkTarget.parentNode.parentNode.parentNode.parentNode.childNodes[2].getAttribute('id') === 'caution'
      ) {
        checkTarget.parentNode.parentNode.parentNode.parentNode.childNodes[2].remove()
      }
    } else if (checkTarget.getAttribute('name') === 'uploadFormatItemName') {
      if (
        checkTarget.parentNode.parentNode.childNodes[2] !== undefined &&
        checkTarget.parentNode.parentNode.childNodes[2].getAttribute('id') === 'caution'
      ) {
        checkTarget.parentNode.parentNode.childNodes[2].remove()
      }
    }
    invalidCheckTarget.push(checkTarget)
  })

  let focusFlag = false
  let focusIdx
  if (invalidCheckTarget.length > 0) {
    let idx = 0
    do {
      if (
        invalidCheckTarget[idx].getAttribute('aria-invalid') === 'true' ||
        invalidCheckTarget[idx].value.length === 0
      ) {
        const cautionRequired = document.createElement('div')
        cautionRequired.classList.add('input-label')
        cautionRequired.classList.add('input-label-required')
        cautionRequired.setAttribute('id', 'caution')
        if (invalidCheckTarget[idx].getAttribute('required') !== null && invalidCheckTarget[idx].value.length === 0) {
          cautionRequired.innerText = '未入力です。'
        }

        if (invalidCheckTarget[idx].getAttribute('name') === 'dataFile') {
          invalidCheckTarget[idx].parentNode.parentNode.parentNode.parentNode.appendChild(cautionRequired)
          invalidCheckTarget[idx].parentNode.parentNode.parentNode.parentNode.insertBefore(
            cautionRequired,
            invalidCheckTarget[idx].parentNode.parentNode.parentNode.parentNode.childNodes[2]
          )
        } else if (invalidCheckTarget[idx].getAttribute('name') === 'uploadFormatItemName') {
          invalidCheckTarget[idx].parentNode.parentNode.appendChild(cautionRequired)
          invalidCheckTarget[idx].parentNode.parentNode.insertBefore(
            cautionRequired,
            invalidCheckTarget[idx].parentNode.parentNode.childNodes[2]
          )
        }

        if (cautionRequired.innerText !== '') {
          if (!focusFlag) {
            focusFlag = true
            if (invalidCheckTarget[idx].getAttribute('name') === 'dataFile') {
              focusIdx = idx - 1
            } else {
              focusIdx = idx
            }
          }
        }
      }
      idx++
    } while (invalidCheckTarget[idx])
    if (focusIdx >= 0) {
      invalidCheckTarget[focusIdx].focus()
      return false
    }
  }
})
