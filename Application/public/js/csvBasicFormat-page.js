let fileReader = null
let targetFile = null

document.getElementById('checkItemNameLineOn').onclick = function () {
  document.getElementById('uploadFormatNumber').readOnly = false
  document.getElementById('uploadFormatNumber').required = true
}

document.getElementById('checkItemNameLineOff').onclick = function () {
  document.getElementById('uploadFormatNumber').readOnly = true
  document.getElementById('uploadFormatNumber').required = false
  document.getElementById('uploadFormatNumber').value = ''
}

document.getElementById('dataFile').addEventListener('change', function (e) {
  targetFile = document.getElementById('dataFile').files.item(0)
  if (targetFile !== null) {
    fileReader = new FileReader()
    fileReader.readAsBinaryString(targetFile)
    fileReader.onload = function () {
      if (fileReader.result.length > 5120000) {
        document.getElementById('dataFile').value = null
        alert('ファイルサイズが5MB超えています。\nCSVファイルを確認後もう一度アップロードしてください。')
      } else {
        document.getElementById('hiddenFileData').value = btoa(fileReader.result)
        document.getElementById('dataFileName').value = document.getElementById('dataFile').files.item(0).name
      }
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
        checkTarget.closest('.field').childNodes[2] !== undefined &&
        checkTarget.closest('.field').childNodes[2].getAttribute('id') === 'caution'
      ) {
        checkTarget.closest('.field').childNodes[2].remove()
      }
    } else if (checkTarget.getAttribute('name') === 'uploadFormatNumber' && document.getElementById('uploadFormatNumber').required === true) {
      if (
        checkTarget.closest('.field').childNodes[1] !== undefined &&
        checkTarget.closest('.field').childNodes[1].getAttribute('id') === 'caution'
      ) {
        checkTarget.closest('.field').childNodes[1].remove()
      }
    } else if (checkTarget.getAttribute('name') === 'uploadFormatItemName') {
      if (
        checkTarget.closest('.field').childNodes[2] !== undefined &&
        checkTarget.closest('.field').childNodes[2].getAttribute('id') === 'caution'
      ) {
        checkTarget.closest('.field').childNodes[2].remove()
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
          invalidCheckTarget[idx].closest('.field').appendChild(cautionRequired)
          invalidCheckTarget[idx].closest('.field').insertBefore(
            cautionRequired,
            invalidCheckTarget[idx].closest('.field').childNodes[2]
          )
        } else if (invalidCheckTarget[idx].getAttribute('name') === 'uploadFormatNumber' && document.getElementById('uploadFormatNumber').required === true) {
          invalidCheckTarget[idx].closest('.field').appendChild(cautionRequired)
          invalidCheckTarget[idx].closest('.field').insertBefore(
            cautionRequired,
            invalidCheckTarget[idx].closest('.field').childNodes[1]
          )
        } else if (invalidCheckTarget[idx].getAttribute('name') === 'uploadFormatItemName') {
          invalidCheckTarget[idx].closest('.field').appendChild(cautionRequired)
          invalidCheckTarget[idx].closest('.field').insertBefore(
            cautionRequired,
            invalidCheckTarget[idx].closest('.field').childNodes[2]
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
