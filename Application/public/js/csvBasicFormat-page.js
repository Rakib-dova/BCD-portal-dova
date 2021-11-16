window.onpageshow = function (event) {
  const perEntries = performance.getEntriesByType('navigation')

  // 戻るボタン押下又はback_forwardした場合
  if (event.persisted || perEntries[0].type === 'back_forward') {
    if (sessionStorage.getItem('offcheckOn')) {
      document.getElementById('checkItemNameLineOff').click()
    }
  }
}

let fileReader = null
let targetFile = null
let dataResultBinary = null

// 項目名の行有無が有：必須
document.getElementById('checkItemNameLineOn').onclick = function () {
  const target = document.getElementById('uploadFormatNumber')
  target.readOnly = false
  target.required = true
  document.getElementById('uploadFormatNumberRequired').classList.remove('is-invisible')
  document.getElementById('uploadFormatNumberInfo').classList.remove('is-invisible')

  // sessionからoffcheckOnアイテム削除
  if (sessionStorage.getItem('offcheckOn')) {
    sessionStorage.removeItem('offcheckOn')
  }
}

// 項目名の行有無が無：必須を外す
document.getElementById('checkItemNameLineOff').onclick = function () {
  const target = document.getElementById('uploadFormatNumber')
  target.readOnly = true
  target.required = false
  target.value = ''
  document.getElementById('uploadFormatNumberRequired').classList.add('is-invisible')
  document.getElementById('uploadFormatNumberInfo').classList.add('is-invisible')

  // バリデーションメッセージを削除
  if (
    target.closest('.field').childNodes[2] !== undefined &&
    target.closest('.field').childNodes[2].getAttribute('id') === 'caution'
  ) {
    target.closest('.field').childNodes[2].remove()
  }

  // sessionにoffcheckOn情報を設定する
  const offcheckOn = true
  sessionStorage.setItem('offcheckOn', offcheckOn)
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
        dataResultBinary = fileReader.result.split(/\r?\n|\r/)
        document.getElementById('dataFileName').value = document.getElementById('dataFile').files.item(0).name
      }
    }
  }
})

document.getElementById('submit').addEventListener('click', function (e) {
  let noHeaderDatalineFlag = false
  let noDatalineFlag = false
  const uploadFormatNumber = document.getElementById('uploadFormatNumber').value

  // BOM付きのみの場合の確認用変数
  const bom = String.fromCharCode(0xef) + String.fromCharCode(0xbb) + String.fromCharCode(0xbf)

  const defaultNumber = document.getElementById('defaultNumber').value
  if (dataResultBinary !== null) {
    if (uploadFormatNumber > 0 && uploadFormatNumber < 9999999) {
      if (
        dataResultBinary[uploadFormatNumber - 1] === '' ||
        dataResultBinary[uploadFormatNumber - 1] === undefined ||
        dataResultBinary[uploadFormatNumber - 1] === bom ||
        dataResultBinary[uploadFormatNumber - 1].length === 3
      ) {
        noHeaderDatalineFlag = true
      }
    }
    if (defaultNumber > 0 && defaultNumber < 9999999) {
      if (
        dataResultBinary[defaultNumber - 1] === '' ||
        dataResultBinary[defaultNumber - 1] === undefined ||
        dataResultBinary[defaultNumber - 1] === bom ||
        dataResultBinary[defaultNumber - 1].length === 3
      ) {
        noDatalineFlag = true
      }
    }
  }

  // 各項目チェック
  const elements = document.querySelectorAll('input')

  // 入力情報：基本情報
  const invalidCheckTarget = []
  Array.prototype.forEach.call(elements, (checkTarget) => {
    if (checkTarget.getAttribute('name') === 'dataFile') {
      if (
        checkTarget.closest('.field').childNodes[2] !== undefined &&
        checkTarget.closest('.field').childNodes[2].getAttribute('id') === 'caution'
      ) {
        checkTarget.closest('.field').childNodes[2].remove()
      }
    } else if (
      checkTarget.getAttribute('name') === 'uploadFormatNumber' &&
      document.getElementById('uploadFormatNumber').required === true
    ) {
      if (
        checkTarget.closest('.field').childNodes[3] !== undefined &&
        checkTarget.closest('.field').childNodes[3].getAttribute('id') === 'caution'
      ) {
        checkTarget.closest('.field').childNodes[3].remove()
      }
    } else if (checkTarget.getAttribute('name') === 'defaultNumber') {
      if (
        checkTarget.closest('.field').childNodes[3] !== undefined &&
        checkTarget.closest('.field').childNodes[3].getAttribute('id') === 'caution'
      ) {
        checkTarget.closest('.field').childNodes[3].remove()
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

  // 入力情報：明細-税 識別子
  const taxElements = document.getElementsByClassName('input-tax')
  const inputTax = []
  Array.prototype.forEach.call(taxElements, (checkTarget) => {
    if (
      checkTarget.closest('.field').childNodes[1] !== undefined &&
      checkTarget.closest('.field').childNodes[1].getAttribute('id') === 'caution'
    ) {
      checkTarget.closest('.field').childNodes[1].remove()
    }
    inputTax.push(checkTarget)
  })

  // 入力情報：明細-単位 識別子
  const unitElements = document.getElementsByClassName('input-unit')
  const inputUnit = []
  Array.prototype.forEach.call(unitElements, (checkTarget) => {
    if (
      checkTarget.closest('.field').childNodes[1] !== undefined &&
      checkTarget.closest('.field').childNodes[1].getAttribute('id') === 'caution'
    ) {
      checkTarget.closest('.field').childNodes[1].remove()
    }
    inputUnit.push(checkTarget)
  })

  let focusFlag = false
  let focusIdx
  if (invalidCheckTarget.length > 0) {
    let idx = 0
    do {
      const cautionRequired = document.createElement('div')
      if (
        invalidCheckTarget[idx].getAttribute('aria-invalid') === 'true' ||
        invalidCheckTarget[idx].value.length === 0
      ) {
        cautionRequired.classList.add('input-label')
        cautionRequired.classList.add('input-label-required')
        cautionRequired.setAttribute('id', 'caution')
        if (invalidCheckTarget[idx].getAttribute('required') !== null && invalidCheckTarget[idx].value.length === 0) {
          cautionRequired.innerText = '未入力です。'
        }
        if (
          invalidCheckTarget[idx].getAttribute('aria-invalid') === 'true' &&
          (invalidCheckTarget[idx].getAttribute('name') === 'uploadFormatNumber' ||
            invalidCheckTarget[idx].getAttribute('name') === 'defaultNumber')
        ) {
          cautionRequired.innerText = '「1 ~ 9999999」の範囲で入力してください。'
        }

        if (invalidCheckTarget[idx].getAttribute('name') === 'dataFile') {
          invalidCheckTarget[idx].closest('.field').appendChild(cautionRequired)
          invalidCheckTarget[idx]
            .closest('.field')
            .insertBefore(cautionRequired, invalidCheckTarget[idx].closest('.field').childNodes[2])
        } else if (
          invalidCheckTarget[idx].getAttribute('name') === 'uploadFormatNumber' &&
          document.getElementById('uploadFormatNumber').required === true
        ) {
          invalidCheckTarget[idx].closest('.field').appendChild(cautionRequired)
          invalidCheckTarget[idx]
            .closest('.field')
            .insertBefore(cautionRequired, invalidCheckTarget[idx].closest('.field').childNodes[3])
        } else if (invalidCheckTarget[idx].getAttribute('name') === 'defaultNumber') {
          invalidCheckTarget[idx].closest('.field').appendChild(cautionRequired)
          invalidCheckTarget[idx]
            .closest('.field')
            .insertBefore(cautionRequired, invalidCheckTarget[idx].closest('.field').childNodes[3])
        } else if (invalidCheckTarget[idx].getAttribute('name') === 'uploadFormatItemName') {
          invalidCheckTarget[idx].closest('.field').appendChild(cautionRequired)
          invalidCheckTarget[idx]
            .closest('.field')
            .insertBefore(cautionRequired, invalidCheckTarget[idx].closest('.field').childNodes[2])
        }
      }
      const cautionRequiredForuploadFormatNumber = document.createElement('div')
      const cautionRequiredFordefaultNumber = document.createElement('div')
      if (noHeaderDatalineFlag) {
        if (
          invalidCheckTarget[idx].getAttribute('name') === 'uploadFormatNumber' &&
          document.getElementById('uploadFormatNumber').required === true
        ) {
          cautionRequiredForuploadFormatNumber.classList.add('input-label')
          cautionRequiredForuploadFormatNumber.classList.add('input-label-required')
          cautionRequiredForuploadFormatNumber.setAttribute('id', 'caution')
          cautionRequiredForuploadFormatNumber.innerText =
            '値が存在しない行が設定されています。正しい行を入力してください。'
          invalidCheckTarget[idx].closest('.field').appendChild(cautionRequiredForuploadFormatNumber)
          invalidCheckTarget[idx]
            .closest('.field')
            .insertBefore(cautionRequiredForuploadFormatNumber, invalidCheckTarget[idx].closest('.field').childNodes[3])
        }
      }

      if (noDatalineFlag) {
        if (invalidCheckTarget[idx].getAttribute('name') === 'defaultNumber') {
          cautionRequiredFordefaultNumber.classList.add('input-label')
          cautionRequiredFordefaultNumber.classList.add('input-label-required')
          cautionRequiredFordefaultNumber.setAttribute('id', 'caution')
          cautionRequiredFordefaultNumber.innerText = '値が存在しない行が設定されています。正しい行を入力してください。'
          invalidCheckTarget[idx].closest('.field').appendChild(cautionRequiredFordefaultNumber)
          invalidCheckTarget[idx]
            .closest('.field')
            .insertBefore(cautionRequiredFordefaultNumber, invalidCheckTarget[idx].closest('.field').childNodes[3])
        }
      }

      if (
        cautionRequired.innerText !== '' ||
        cautionRequiredForuploadFormatNumber.innerText !== '' ||
        cautionRequiredFordefaultNumber.innerText !== ''
      ) {
        if (!focusFlag) {
          focusFlag = true
          if (invalidCheckTarget[idx].getAttribute('name') === 'dataFile') {
            focusIdx = idx - 1
          } else {
            focusIdx = idx
          }
        }
      }
      idx++
    } while (invalidCheckTarget[idx])

    // 明細-税,明細-単位 重複チェック
    const taxResult = checkIdentifier(inputTax)
    const unitResult = checkIdentifier(inputUnit)

    if (focusIdx >= 0) {
      invalidCheckTarget[focusIdx].focus()
      e.preventDefault()
      return false
    } else if (taxResult !== -1 || unitResult !== -1) {
      if (taxResult !== -1) {
        inputTax[taxResult].focus()
      } else if (unitResult !== -1) {
        inputUnit[unitResult].focus()
      }

      e.preventDefault()
      return false
    }
  }
})

addEvent(document, 'change', function (e, target) {
  instantValidation(target)
})

function addEvent(node, type, callback) {
  if (node.addEventListener) {
    node.addEventListener(
      type,
      function (e) {
        callback(e, e.target)
      },
      false
    )
  } else if (node.attachEvent) {
    node.attachEvent('on' + type, function (e) {
      callback(e, e.srcElement)
    })
  }
}

function shouldBeValidated(field) {
  return (
    !(field.getAttribute('readonly') || field.readonly) &&
    !(field.getAttribute('disabled') || field.disabled) &&
    (field.getAttribute('pattern') || field.getAttribute('required'))
  )
}

function instantValidation(field) {
  if (shouldBeValidated(field)) {
    const invalid =
      (field.getAttribute('required') && !field.value) ||
      (field.getAttribute('pattern') && field.value && !new RegExp(field.getAttribute('pattern')).test(field.value))
    if (!invalid && field.getAttribute('aria-invalid')) {
      field.removeAttribute('aria-invalid')
    } else if (invalid && !field.getAttribute('aria-invalid')) {
      field.setAttribute('aria-invalid', 'true')
    }
  }
}

function checkIdentifier(inputArr) {
  let chkFlag = true
  const chkArr = []
  let chkIdx = -1

  for (let idx = 0; idx < inputArr.length; idx++) {
    chkFlag = true

    const cautionDuplicate = document.createElement('div')
    cautionDuplicate.classList.add('input-label')
    cautionDuplicate.classList.add('input-label-required')
    cautionDuplicate.setAttribute('id', 'caution')
    cautionDuplicate.innerText = '　値が重複しています。'

    for (const tax of chkArr) {
      if (inputArr[idx].value && inputArr[idx].value === tax.value) {
        chkFlag = false

        if (chkIdx === -1) {
          chkIdx = idx
        }

        // メッセージの追加
        inputArr[idx].closest('.field').appendChild(cautionDuplicate)
        inputArr[idx].closest('.field').insertBefore(cautionDuplicate, inputArr[idx].closest('.field').childNodes[1])
      }
    }
    if (chkFlag && inputArr[idx].value) {
      chkArr.push(inputArr[idx])
    }
  }
  return chkIdx
}
