'use strict'

// 承認順番
const approveUserNumbers = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十']
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

// ローディング画面の初期化
window.onload = function () {
  // 削除ボタン機能活性化
  if ($('.btn-minus-approveRoute').length !== 0) {
    Array.prototype.forEach.call($('.btn-minus-approveRoute'), (btnMinus) => {
      btnMinus.addEventListener('click', btnMinusApproveRoute)
    })
  }
}

// 承認者検索機能
$('#btn-search-approver').addEventListener('click', function () {
  // ボタンローディング
  this.classList.add('is-loading')
  // API 通信の用意
  const approverApi = new XMLHttpRequest()
  // キーワードの取得
  const searchKeyword = {
    firstName: $('#searchModalApproveUserLastName').value,
    lastName: $('#searchModalApproveUserFirstName').value,
    email: $('#searchModalApproveUserMailAddress').value
  }
  const elements = document.getElementsByName('_csrf')
  const csrf = elements.item(0)

  approverApi.open('POST', '/searchApprover', true)
  approverApi.setRequestHeader('Content-Type', 'application/json')
  approverApi.setRequestHeader('CSRF-Token', csrf)
  approverApi.onreadystatechange = function () {
    if (approverApi.readyState === approverApi.DONE) {
      // 既存の検索結果を取り消す
      while ($('#approver-list').firstChild) {
        $('#approver-list').removeChild($('#approver-list').firstChild)
      }
      if (approverApi.status === 200) {
        // サーバーから送信したデータの取得
        const approvers = JSON.parse(approverApi.responseText)
        // データがある場合、承認者を表示
        if (approvers.length !== 0) {
          approvers.forEach((approver) => {
            const templateApproverList = $('#template-approverList')
            const cloneApproverList = document.importNode(templateApproverList.content, true)
            cloneApproverList.querySelector('#name').innerText = approver.name
            cloneApproverList.querySelector('#email').innerText = approver.email
            cloneApproverList.querySelector('#id').value = approver.id
            $('#approver-list').append(cloneApproverList)
          })
          // 検索結果の行クリック時、入力欄へデータ入力
          Array.prototype.forEach.call($('#approver-list').querySelectorAll('.columns'), (item) => {
            item.addEventListener('click', function () {
              const target = $('#approveRoute-modal').dataset.target
              const name = this.querySelector('#name').innerText
              const email = this.querySelector('#email').innerText
              const id = this.querySelector('#id').value
              $(`#${target}`).querySelectorAll('input[type=text]')[0].classList.remove('none-user-name')
              $(`#${target}`).querySelectorAll('input[type=text]')[0].value = name
              $(`#${target}`).querySelectorAll('input[type=text]')[0].setAttribute('title', name)
              $(`#${target}`).querySelectorAll('input[type=text]')[1].value = email
              $(`#${target}`).querySelectorAll('input[type=text]')[1].setAttribute('title', email)
              $(`#${target}`).querySelectorAll('input[type=hidden]')[0].value = id
              $('#approveRoute-modal').classList.remove('is-active')
            })
          })
          // データがない場合、結果文言の表示（臨時）
        } else {
          const templateApproverList = $('#template-approverList')
          const cloneApproverList = document.importNode(templateApproverList.content, true)
          cloneApproverList.querySelector('.columns').innerHTML = '<p>検索結果がありません。</p>'
          $('#approver-list').append(cloneApproverList)
        }
        // トレードシフトのアクセストークンが消えた時
      } else if (approverApi.status === 401) {
        const templateApproverList = $('#template-approverList')
        const cloneApproverList = document.importNode(templateApproverList.content, true)
        cloneApproverList.querySelector('.columns').innerHTML = '<p>上段のHOMEを押下して再実施をお願いします。</p>'
        $('#approver-list').append(cloneApproverList)
        // メールアドレス形式でない場合
      } else if (approverApi.status === 403) {
        const templateApproverList = $('#template-approverList')
        const cloneApproverList = document.importNode(templateApproverList.content, true)
        cloneApproverList.querySelector('.columns').innerHTML = '<p>検索条件に誤りがあります。</p>'
        $('#approver-list').append(cloneApproverList)
        // サーバー側のデータの加工の時エラーが発生した時
      } else if (approverApi.status === 500) {
        const templateApproverList = $('#template-approverList')
        const cloneApproverList = document.importNode(templateApproverList.content, true)
        cloneApproverList.querySelector('.columns').innerHTML = '<p>システムエラーが発生しました。</p>'
        $('#approver-list').append(cloneApproverList)
      }
    }
    // サーバーからデータを取得した後、ローディングを消す
    $('#btn-search-approver').classList.remove('is-loading')
  }
  // サーバー側にデータ送信
  approverApi.send(JSON.stringify(searchKeyword))
})

// 検索ボタンクリック時、機能
const BtnlineApproveRouteUserSearch = function () {
  // エラーメッセージ初期化
  revertElements()
  const target = $('#approveRoute-modal').dataset.target
  // 承認者検索モーダルの表示
  $('#approveRoute-modal').classList.add('is-active')

  // 入力ターゲティングの設定
  const inputTarget = this.dataset.id
  $('#approveRoute-modal').dataset.target = inputTarget
  if (inputTarget !== target) {
    while ($('#approver-list').firstChild) {
      $('#approver-list').removeChild($('#approver-list').firstChild)
    }
  }
}

// ボタンに機能を付与
Array.prototype.forEach.call($('.BtnlineApproveRouteUserSearch'), function (btn) {
  btn.addEventListener('click', BtnlineApproveRouteUserSearch)
})

// 承認者追加ボタンクリック時
$('#btnAddApproveRoute').addEventListener('click', function () {
  // エラーメッセージ初期化
  revertElements()
  const target = $(this.dataset.target)
  addApproveUsers(target)
})

// マイナスボタン機能追加
const btnMinusApproveRoute = function () {
  const deleteTarget = this.dataset.target
  $(`#${deleteTarget}`).remove()
  const approveUserList = $('#bulkInsertNo1')
  approveUserList.querySelectorAll('.lineApproveRoute').forEach((item, idx) => {
    item.querySelector('.input-approveRouteUserNumber').innerHTML = `${approveUserNumbers[idx]}次承認`
  })
}

// 承認者追加ボタン機能
const addApproveUsers = function (target) {
  const lineApproveRouteLength = target.querySelectorAll('.lineApproveRoute').length
  if (lineApproveRouteLength < 10) {
    // 承認者のidを作成：lineNo明細詳細の順番_lineApproveRoute承認者の順番
    const tagetIdBase = `${target.id}_lineApproveRoute`
    const number =
      ~~document.querySelectorAll('.lineApproveRoute')[lineApproveRouteLength].id.replaceAll(tagetIdBase, '') + 1
    const targetId = `${target.id}_lineApproveRoute${number}`

    // templateから追加承認者追加作成
    const templateLineApproveRouteItem = $('#templateLineApproveRouteItem')
    const cloneApproveRouteItem = document.importNode(templateLineApproveRouteItem.content, true)
    cloneApproveRouteItem.querySelector('.lineApproveRoute').id = targetId
    // 承認者順番
    cloneApproveRouteItem
      .querySelector('.input-approveRouteUserNumber')
      .setAttribute('name', `${targetId}_approveUserNumber${lineApproveRouteLength + 1}`)
    cloneApproveRouteItem.querySelector(
      '.input-approveRouteUserNumber'
    ).innerText = `${approveUserNumbers[lineApproveRouteLength]}次承認`
    // 承認者名INPUT
    cloneApproveRouteItem.querySelector('.input-approveRouteUserName').setAttribute('name', 'userName')
    cloneApproveRouteItem.querySelector('.input-approveRouteUserName').id = `${targetId}_approveUserName`
    // メールアドレスINPUT
    cloneApproveRouteItem.querySelector('.input-approveRouteUserMailAddress').setAttribute('name', 'mailAddress')
    cloneApproveRouteItem.querySelector('.input-approveRouteUserMailAddress').id = `${targetId}_approveUserMailAddress`
    // uuid
    cloneApproveRouteItem.querySelector('input[type=hidden]').setAttribute('name', 'uuid')
    // 承認者削除ボタン
    cloneApproveRouteItem.querySelector('.btn-minus-approveRoute').dataset.target = targetId
    cloneApproveRouteItem.querySelector('.btn-minus-approveRoute').addEventListener('click', btnMinusApproveRoute)

    // 承認者検索ボタン
    cloneApproveRouteItem.querySelector('.btn-search-main').dataset.id = `${targetId}`
    cloneApproveRouteItem.querySelector('.btn-search-main').addEventListener('click', BtnlineApproveRouteUserSearch)
    const approveUserList = $('#bulkInsertNo1')
    if (lineApproveRouteLength < 1) {
      approveUserList.insertBefore(cloneApproveRouteItem, approveUserList.childNodes[0])
    } else {
      approveUserList.insertBefore(cloneApproveRouteItem, approveUserList.childNodes[lineApproveRouteLength])
    }
  } else {
    $('#error-message-approveRoute').innerText = '承認者追加の上限は１０名までです。'
  }
}

// 確認ボタンクリック時
$('#btn-confirm').addEventListener('click', function () {
  // 初期化
  revertElements()
  // 「確認」ボタンが非活性の場合、終了する。
  if (this.getAttribute('disabled') === 'true') return
  const approveUserNameArr = []
  const validateUserNameArr = []
  const approveUserMailAddressArr = []
  const approveRouteName = document.getElementById('setApproveRouteNameInputId').value
  const approveRouteNameInput = document.getElementById('approveRouteName_checkModal')
  const approveUserNames = document.querySelectorAll('.input-approveRouteUserName')
  const approveUserMailAddersses = document.querySelectorAll('.input-approveRouteUserMailAddress')
  const lastapproveUserName = document.getElementById('lastLineApproveRoute_approveUserName')
  const lastapproveUserMailAddresses = document.getElementById('lastLineApproveRoute_approveUserMailAddress')
  approveUserNames.forEach((item) => {
    approveUserNameArr.push(item.value)
    validateUserNameArr.push(item.value)
  })

  approveUserMailAddersses.forEach((item) => {
    approveUserMailAddressArr.push(item.value)
  })

  validateUserNameArr.push(lastapproveUserName.value)
  const validationCheckResult = validationCheck(validateUserNameArr)
  if (!validationCheckResult) {
    const duplicationCheckResult = duplicationCheck(validateUserNameArr)
    if (duplicationCheckResult) {
      $('#error-message-approveRoute').innerText = '同一の承認者が設定されています。'
    } else {
      // 確認画面表示処理
      while ($('#approver-list-check').firstChild) {
        $('#approver-list-check').removeChild($('#approver-list-check').firstChild)
      }

      approveRouteNameInput.value = approveRouteName
      if (approveUserNameArr.length !== 0) {
        for (let i = 0; i < approveUserNameArr.length; i++) {
          const templateApproverCheckList = $('#template-approverCheckList')
          const cloneApproverCheckList = document.importNode(templateApproverCheckList.content, true)
          cloneApproverCheckList.querySelector('#id-check').innerText = `${approveUserNumbers[i]}次承認`
          cloneApproverCheckList.querySelector('#name-check').innerText = approveUserNameArr[i]
          cloneApproverCheckList.querySelector('#name-check').setAttribute('title', `${approveUserNameArr[i]}`)
          cloneApproverCheckList.querySelector('#email-check').innerText = approveUserMailAddressArr[i]
          cloneApproverCheckList.querySelector('#email-check').setAttribute('title', `${approveUserMailAddressArr[i]}`)
          $('#approver-list-check').append(cloneApproverCheckList)
        }
      }
      const templateApproverCheckList = $('#template-approverCheckList')
      const cloneApproverCheckList = document.importNode(templateApproverCheckList.content, true)
      cloneApproverCheckList.querySelector('#id-check').innerText = '最終承認'
      cloneApproverCheckList.querySelector('#name-check').innerText = lastapproveUserName.value
      cloneApproverCheckList.querySelector('#name-check').setAttribute('title', `${lastapproveUserName.value}`)
      cloneApproverCheckList.querySelector('#email-check').innerText = lastapproveUserMailAddresses.value
      cloneApproverCheckList
        .querySelector('#email-check')
        .setAttribute('title', `${lastapproveUserMailAddresses.value}`)
      $('#approver-list-check').append(cloneApproverCheckList)

      document.querySelector('#check-modal').classList.add('is-active')
    }
  }
})

// 確認画面で「登録」ボタンを押すの場合、サーバーにデータを伝送
document.querySelector('#submit').addEventListener('click', () => {
  document.querySelector('#form').submit()
})

// 重複された承認者処理
const duplicationCheck = function (approveUserArr) {
  const result = duplicateCheckFunction(approveUserArr)
  return result
}

// 未設定チェック
const validationCheck = function (approveUserArr) {
  let isChecked = false
  // 承認ルート名チェック
  const setApproveRouteNameInputId = document.getElementById('setApproveRouteNameInputId').value
  if (setApproveRouteNameInputId === '' || setApproveRouteNameInputId === undefined) {
    document.getElementById('RequiredErrorMesageForApproveRoute').innerHTML = '承認ルート名が未入力です。'
    document.getElementById('RequiredErrorMesageForApproveRoute').classList.remove('is-invisible')
    isChecked = true
  } else if (setApproveRouteNameInputId.length > 40) {
    document.getElementById('RequiredErrorMesageForApproveRoute').innerHTML =
      '承認ルート名は40桁以内で入力してください。'
    document.getElementById('RequiredErrorMesageForApproveRoute').classList.remove('is-invisible')
    isChecked = true
  }

  // 承認者未設定チェック
  const result = []
  document.getElementById('bulkInsertNo1').childNodes.forEach((item, idx) => {
    const value = item.childNodes[0].childNodes[1].childNodes[1].childNodes[0].childNodes[0].childNodes[0].value
    if (value === '' || value === undefined) {
      result.push(idx + 1)
    }
  })
  if (result.length > 0) {
    $('#error-message-approveRoute').innerText = '承認者を設定してください。'
    isChecked = true
  }

  return isChecked
}

// 重複検索関数
const duplicateCheckFunction = function (array) {
  const length = array.length
  let duplicationFlag = false
  let i, j, temp
  for (i = 0; i < length - 1; i++) {
    for (j = 0; j < length - 1 - i; j++) {
      if (JSON.stringify(array[j]) === JSON.stringify(array[j + 1])) {
        duplicationFlag = true
        return duplicationFlag
      } else {
        temp = array[j]
        array[j] = array[j + 1]
        array[j + 1] = temp
      }
    }
  }
  return duplicationFlag
}

// エラーメッセージ初期化
const revertElements = function () {
  document.getElementById('RequiredErrorMesageForApproveRoute').innerHTML = ''
  document.getElementById('RequiredErrorMesageForApproveRoute').classList.add('is-invisible')
  $('#error-message-approveRoute').innerText = ''
  const approveUserNotLastArr = document.getElementById('bulkInsertNo1').childNodes
  approveUserNotLastArr.forEach((line) => {
    if (line.childNodes[0].childNodes[1].childNodes[1].childNodes[0].childNodes[0].childNodes[0].value === '未設定') {
      line.childNodes[0].childNodes[1].childNodes[1].childNodes[0].childNodes[0].childNodes[0].value = ''
    }
    line.childNodes[0].childNodes[1].childNodes[1].childNodes[0].childNodes[0].childNodes[0].classList.remove(
      'red-color'
    )
  })
}
