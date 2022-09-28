/* global
 $, doPost
*/

// 契約者住所関連要素Idマップ
const contractElementIdMap = {
  postalNumberId: 'postalNumber',
  addressId: 'contractAddressVal',
  banchId: 'banch1',
  tatemonoId: 'tatemono1',
  searchBtnId: 'postalSearchBtn',
  clearBtnId: 'postalClearBtn'
}

// 請求情報住所関連要素Idマップ
const billMailingElementIdMap = {
  postalNumberId: 'billMailingPostalNumber',
  addressId: 'billMailingAddress',
  banchId: 'billMailingAddressBanchi1',
  tatemonoId: 'billMailingAddressBuilding1',
  searchBtnId: 'billMailingSearchBtn',
  clearBtnId: 'billMailingClearBtn'
}

/**
 * 郵便番号のチェック
 * @param {string} postalNumber 郵便番号
 * @returns チェック結果
 */
const validatePostalNumber = function (postalNumber) {
  const postalNumberPatten = '^[0-9]{7}$'
  const postalNumberReg = new RegExp(postalNumberPatten)
  return postalNumberReg.test(postalNumber)
}

/**
 * 郵便番号の値に応じて、検索ボタンの活性・非活性のコントロール
 * @param {string} searchBtnId 検索ボタンID
 * @param {string} postalNumber 郵便番号
 * @returns
 */
const controlSearchBtn = function (searchBtnId, postalNumber) {
  const searchBtnElement = $('#' + searchBtnId)
  if (!validatePostalNumber(postalNumber)) {
    searchBtnElement.setAttribute('disabled', 'disabled')
    searchBtnElement.onclick = null
    return
  }
  searchBtnElement.removeAttribute('disabled')
}

/**
 * 住所検索
 * @param {object} e イベント
 * @param {string} clearBtnId クリアボタンのID
 * @param {string} postalNumberId 郵便番号inputのID
 * @param {string} addressId 住所inputのID
 * @param {string} banchId 番地inputのID
 * @param {string} tatemonoId 建物等inputのID
 * @returns
 */
const searchAddress = function (e, clearBtnId, postalNumberId, addressId, banchId, tatemonoId) {
  const searchBtnElement = e.srcElement

  // 住所検索ボタンが非活性化の時は動作しない
  if (searchBtnElement.getAttribute('disabled') !== null) {
    return
  }

  // 郵便番号
  const postalNumber = $('#' + postalNumberId).value
  if (!validatePostalNumber(postalNumber)) {
    return
  }

  const modalCardBody = $('#modal-card-result')
  modalCardBody.innerHTML = ''

  const postData = { postalNumber: postalNumber }

  searchBtnElement.classList.add('is-loading')

  // 郵便番号で住所を取得する
  doPost('/searchAddress/', postData, function (httpRequest) {
    const dataTarget = searchBtnElement.getAttribute('data-target')

    if (httpRequest.readyState === httpRequest.DONE) {
      if (httpRequest.status === 200) {
        // 住所アドレスリストの取得
        const resultAddress = JSON.parse(httpRequest.responseText)

        if (resultAddress.addressList.length === 0) {
          $(dataTarget).classList.add('is-active')
          modalCardBody.innerHTML =
            '該当する住所が見つかりませんでした。<br>住所検索が可能な郵便番号を入力してください。'
        } else {
          const addressValElement = $('#' + addressId)

          // 住所アドレスリストサイズの取得
          const resultLength = resultAddress.addressList.length
          if (resultLength === 1) {
            addressValElement.value = resultAddress.addressList[0].address
            clearValues(banchId, tatemonoId)
            freezePostalSearchBtn(postalNumberId, searchBtnElement.getAttribute('id'), clearBtnId)
          } else {
            $(dataTarget).classList.add('is-active')

            resultAddress.addressList.forEach((obj) => {
              modalCardBody.innerHTML +=
                '<a class="resultAddress" data-target="#searchPostalNumber-modal">' + obj.address + '<br>'
            })

            $('.resultAddress').forEach((ele) => {
              ele.onclick = () => {
                $(ele.getAttribute('data-target')).classList.remove('is-active')
                addressValElement.value = ele.innerHTML.replace('<br>', '')
                clearValues(banchId, tatemonoId)
                freezePostalSearchBtn(postalNumberId, searchBtnElement.getAttribute('id'), clearBtnId)
              }
            })
          }
        }
      } else {
        const errStatus = httpRequest.status
        $(dataTarget).classList.add('is-active')
        switch (errStatus) {
          case 403:
            modalCardBody.innerHTML = 'ログインユーザーではありません。'
            break
          case 400:
            modalCardBody.innerHTML = '正しい郵便番号を入力してください。'
            break
          default:
            modalCardBody.innerHTML = 'システムエラーが発生しました。'
        }
      }
    }
    searchBtnElement.classList.remove('is-loading')
  })
}

/**
 * 郵便番号入力不可に変更 、住所検索ボタン非活性化、クリアボタン活性化
 * @param {string} postalNumberId 郵便番号inputのID
 * @param {string} searchBtnId 検索ボタンのID
 * @param {string} clearBtnId クリアボタンのID
 */
const freezePostalSearchBtn = function (postalNumberId, searchBtnId, clearBtnId) {
  $('#' + postalNumberId).readOnly = true
  $('#' + searchBtnId).setAttribute('disabled', 'disabled')
  $('#' + clearBtnId).removeAttribute('disabled')
}

/**
 * 指定されたID項目の値のクリア
 * @param {string[]} ids ID配列
 */
const clearValues = function (...ids) {
  for (const id of ids) {
    $('#' + id).value = ''
  }
}

/**
 * 住所関連要素のイベント監視
 * @param {object} elementIdMap 住所関連要素のID
 */
const setAddressEventListener = function (elementIdMap) {
  // 郵便番号入力イベント
  $('#' + elementIdMap.postalNumberId).addEventListener('input', function () {
    controlSearchBtn(elementIdMap.searchBtnId, this.value)
  })

  // 契約者住所検索イベント
  $('#' + elementIdMap.searchBtnId).addEventListener('click', function (e) {
    searchAddress(
      e,
      elementIdMap.clearBtnId,
      elementIdMap.postalNumberId,
      elementIdMap.addressId,
      elementIdMap.banchId,
      elementIdMap.tatemonoId
    )
  })

  // クリアボタン機能
  $('#' + elementIdMap.clearBtnId).addEventListener('click', function () {
    // クリアボタンが非活性化の時は動作しない
    if ($('#' + elementIdMap.clearBtnId).getAttribute('disabled') !== null) {
      return
    }
    // 住所情報クリア
    clearValues(elementIdMap.postalNumberId, elementIdMap.addressId, elementIdMap.banchId, elementIdMap.tatemonoId)
    // 郵便番号を入力可能に変更
    $('#' + elementIdMap.postalNumberId).readOnly = false
    // クリアボタン非活性化
    $('#' + elementIdMap.clearBtnId).setAttribute('disabled', 'disabled')
  })
}

/**
 * 住所の組み合わせ
 * @param {object} elementIdMap 住所関連要素のID
 */
const contactAddress = function (elementIdMap) {
  const readdressElement = $('#re' + elementIdMap.addressId)
  if (readdressElement) {
    readdressElement.textContent =
      $('#' + elementIdMap.addressId).value +
      $('#' + elementIdMap.banchId).value +
      $('#' + elementIdMap.tatemonoId).value
  }
}

// 契約者住所の各イベント監視の設定
setAddressEventListener(contractElementIdMap)
// 請求情報住所の各イベント監視の設定
setAddressEventListener(billMailingElementIdMap)

// ----「次へ」ボタンが押された
$('#next-btn').addEventListener('click', function (e) {
  e.preventDefault()

  const elements = document.querySelectorAll('input')

  // 初回エラー 項目のエレメントの初期化
  let firstError
  // 各項目のバリデーションチェック
  for (const element of elements) {
    // 項目のエラーメッセージ表示先のエレメントの取得
    const messageElement = $('#' + element.getAttribute('name') + 'Message')
    // 項目のエラーメッセージのクリア
    if (messageElement) messageElement.textContent = ''

    const readOnlyRequired = element.readOnly && element.required && !element.value
    // バリデーション失敗、また、(読取のみ、かつ必須)の場合
    if (!element.validity.valid || readOnlyRequired) {
      // 初回エラー 項目のエレメントの設定
      if (!firstError) firstError = element
      // 必須バリデーション失敗の場合
      if (element.validity.valueMissing || readOnlyRequired) {
        if (messageElement) messageElement.textContent = '　未入力です。'
      } else {
        if (messageElement) messageElement.textContent = '　入力値が間違いました。'
      }
    }

    // 確認モーダルの各項目の設定
    const reviewElement = $('#re' + element.getAttribute('name'))
    if (reviewElement) reviewElement.textContent = element.value
  }

  // passwordチェック
  if ($('#password').value !== $('#passwordConfirm').value) {
    if (!firstError) firstError = $('#password')
    $('#passwordMessage').textContent = '　入力されたパスワードが一致しません。'
  }

  const openingDateValue = $('#openingDate')?.value

  // 開通希望日チェック
  if (openingDateValue) {
    const serviceList = JSON.parse($('#serviceList-json').value)
    const openingDate = new Date(openingDateValue).setHours(0, 0, 0, 0)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // 過去の日付を設定された場合
    if (openingDate < today) {
      if (!firstError) firstError = $('#openingDate')
      $('#openingDateMessage').textContent = '　過去の日付を設定できません。'

      // スタンダードプランのみ申込、かつ、1か月後の日付を設定された場合
    } else if (
      serviceList.length === 1 &&
      serviceList[0] === '030' &&
      openingDate > today.setMonth(today.getMonth() + 1)
    ) {
      if (!firstError) firstError = $('#openingDate')
      $('#openingDateMessage').textContent = '　1か月後の日付を設定できません。'

      // 導入支援をチェックされた、かつ、16日後の日付を設定されない場合
    } else if (serviceList.some((i) => i === '020') && openingDate < today.setDate(today.getDate() + 16)) {
      if (!firstError) firstError = $('#openingDate')
      $('#openingDateMessage').textContent = '　16日後の日付から設定してください。'
    }
  }

  if (firstError) {
    // 初回エラー 項目にフォーカス
    firstError?.focus()
  } else {
    // 住所の組み合わせ
    contactAddress(contractElementIdMap)
    contactAddress(billMailingElementIdMap)

    const select = $('#salesChannelDeptType')
    if (select.value) {
      $('#resalesChannelDeptType').textContent = select.options[select.selectedIndex].text
    }

    const modal = $('#confirmregister-modal')
    if (modal) modal.classList.toggle('is-active')
  }
})

// ---- 登録ボタン押下時のフロント側での二重送信防止
$('#form').onsubmit = function () {
  $('#submit').classList.add('is-loading')
  $('#submit').setAttribute('disabled', 'disabled')
}
