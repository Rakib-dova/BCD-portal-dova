window.onload = () => {
  const notification = document.querySelector('.notification-header')
  if (notification) {
    notification.classList.add('notification-show')
    setTimeout(() => {
      notification.classList.remove('notification-show')
      notification.classList.add('is-invisible')
    }, 2600)
  }
}

document.getElementById('submit').addEventListener('click', function (e) {
  // 各項目チェック
  const elements = document.querySelectorAll('input')

  // 入力情報：基本情報
  const invalidCheckTarget = []
  Array.prototype.forEach.call(elements, (checkTarget) => {
    if (checkTarget.getAttribute('name') === 'invoiceNumber') {
      if (
        checkTarget.closest('.field').childNodes[1] !== undefined &&
        checkTarget.closest('.field').childNodes[1].getAttribute('id') === 'caution'
      ) {
        checkTarget.closest('.field').childNodes[1].remove()
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
        if (invalidCheckTarget[idx].getAttribute('name') === 'invoiceNumber') {
          invalidCheckTarget[idx].closest('.field').appendChild(cautionRequired)
          invalidCheckTarget[idx]
            .closest('.field')
            .insertBefore(cautionRequired, invalidCheckTarget[idx].closest('.field').childNodes[1])
        }
      } else if (
        invalidCheckTarget[idx].getAttribute('aria-invalid') === 'true' ||
        invalidCheckTarget[idx].value.length > 100
      ) {
        const cautionRequired = document.createElement('div')
        cautionRequired.classList.add('input-label')
        cautionRequired.classList.add('input-label-required')
        cautionRequired.setAttribute('id', 'caution')
        if (invalidCheckTarget[idx].getAttribute('required') !== null && invalidCheckTarget[idx].value.length > 100) {
          cautionRequired.innerText = '請求書番号は100文字以内で入力してください。'
        }
        if (invalidCheckTarget[idx].getAttribute('name') === 'invoiceNumber') {
          invalidCheckTarget[idx].closest('.field').appendChild(cautionRequired)
          invalidCheckTarget[idx]
            .closest('.field')
            .insertBefore(cautionRequired, invalidCheckTarget[idx].closest('.field').childNodes[1])
        }
        if (cautionRequired.innerText !== '') {
          if (!focusFlag) {
            focusFlag = true
            focusIdx = idx
          }
        }
      }
      idx++
    } while (invalidCheckTarget[idx])
    if (focusIdx >= 0) {
      invalidCheckTarget[focusIdx].focus()
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
