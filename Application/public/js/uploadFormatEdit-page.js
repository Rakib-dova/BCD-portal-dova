// document.getElementById、document.getElementsByClassName省略
const $ = function (tagObjName) {
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
  return Object.assign(selectors, Array.prototype, (type, event) => {
    document.addEventListener(type, event)
  })
}

// 「確認画面へ遷移」ボタンクリックイベント処理
$('#editConfirmBtn').addEventListener('click', function (e) {
  // 確認画面に表示するリスト初期化
  $('.checkDataItem').forEach((item) => {
    item.innerText = ''
  })
  $('.checkDataValue').forEach((item) => {
    item.innerText = ''
  })

  // ユーザデータを整列
  const dataItem = Array.prototype.map.call($('.dataItem'), (item, idx) => {
    return {
      no: idx + 1,
      itemName: item.innerText,
      data: $('.dataValue')[idx].innerText
    }
  })

  // 標準項目に基準として整列
  const convertStandardItem = Array.prototype.map.call($('.standardHeader'), (item, idx) => {
    return {
      no: idx + 1,
      checkDataValue: document.getElementsByName('formatData')[idx].selectedIndex
    }
  })

  // 選択した項目確認画面表示
  convertStandardItem.forEach((item, idx) => {
    if (item.checkDataValue !== 0) {
      document.querySelector(
        `#csvFormatConfirm-modal-card > section > div > div > div:nth-child(4) > div > div.box > table > tbody > tr:nth-child(${
          idx + 1
        }) > th.text-center.checkDataItem`
      ).innerText = dataItem[item.checkDataValue - 1].itemName

      document.querySelector(
        `#csvFormatConfirm-modal-card > section > div > div > div:nth-child(4) > div > div.box > table > tbody > tr:nth-child(${
          idx + 1
        }) > th.text-center.checkDataValue`
      ).innerText = dataItem[item.checkDataValue - 1].data
    }
  })
})

// 「基本情報設定画面」の修正ボタンをクリックイベント処理
$('#csvBasicEditBtn').addEventListener('click', function (e) {
  // 変更可能な対象項目を取得
  const basicUploadFormatItemName = $('#basicUploadFormatItemName')
  const inputTax = $('.input-tax')
  const inputUnit = $('.input-unit')

  // 明細-税,明細-単位エラーメッセージ初期化
  deleteErrorMessage(inputTax)
  deleteErrorMessage(inputUnit)

  // バリデーションチェック
  const checkTarget = []
  inputTax.forEach((item) => {
    checkTarget.push(item)
  })
  inputUnit.forEach((item) => {
    checkTarget.push(item)
  })
  const checkAriaInvalid = []
  checkTarget.forEach((item) => {
    if (!item.reportValidity() || item.value.length > 100) {
      checkAriaInvalid.push(item)
    }
  })

  // バリデーションチェックのfalseがある場合、エラー項目にフォーカス移動
  if (checkAriaInvalid.length !== 0) {
    checkAriaInvalid[0].focus()
    return
  }

  // 明細-税,明細-単位重複チェック
  const taxResult = checkIdentifier(inputTax)
  const unitResult = checkIdentifier(inputUnit)

  // 明細-税,明細-単位 重複がある場合、エラー項目にフォーカス移動
  if (taxResult !== -1 || unitResult !== -1) {
    if (taxResult !== -1) {
      inputTax[taxResult].focus()
    } else if (unitResult !== -1) {
      inputUnit[unitResult].focus()
    }
    return
  }

  // 変更した入力値を保存
  basicUploadFormatItemName.dataset.initvalue = basicUploadFormatItemName.value

  inputTax.forEach((tax) => {
    tax.dataset.initvalue = tax.value
  })
  inputUnit.forEach((unit) => {
    unit.dataset.initvalue = unit.value
  })

  // 変更内容確認フォームへ保存
  $('#uploadFormatItemName').value = basicUploadFormatItemName.value

  inputTax.forEach((item, idx) => {
    $('.tax')[idx].value = item.value
  })

  inputUnit.forEach((item, idx) => {
    $('.unit')[idx].value = item.value
  })

  // 正常の場合もダル閉じる
  $('#csvBasicFormat-modal').classList.remove('is-active')
})

// キャンセルボタンのクリックイベント処理
$('#csvBasicEditCancelBtn').addEventListener('click', function (e) {
  // 変更可能な対象項目を取得
  const basicUploadFormatItemName = $('#basicUploadFormatItemName')
  const inputTax = $('.input-tax')
  const inputUnit = $('.input-unit')

  // 明細-税,明細-単位エラーメッセージ初期化
  deleteErrorMessage(inputTax)
  deleteErrorMessage(inputUnit)

  // 入力した値を元に戻す
  basicUploadFormatItemName.value = basicUploadFormatItemName.dataset.initvalue
  inputTax.forEach((tax) => {
    tax.value = tax.dataset.initvalue
  })
  inputUnit.forEach((unit) => {
    unit.value = unit.dataset.initvalue
  })
})

// 税、単位値が重複確認
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

// エラーメッセージを削除
function deleteErrorMessage(elements) {
  Array.prototype.forEach.call(elements, (checkTarget) => {
    if (
      checkTarget.closest('.field').childNodes[1] !== undefined &&
      checkTarget.closest('.field').childNodes[1].getAttribute('id') === 'caution'
    ) {
      checkTarget.closest('.field').childNodes[1].remove()
    }
  })
}
