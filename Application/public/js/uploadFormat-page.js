/*
ページ概要：請求書アップロードフォーマット設定
ページ遷移：Home画面→請求書一括作成→請求書アップロードフォーマット一覧→新規登録する→次へ
*/

/* global

 $

*/

// 確認ボタンクリックイベント処理
$('#confirmBtn').addEventListener('click', function (e) {
  e.preventDefault()
  const modal = document.getElementById('confirmModify-modal')

  // 必須項目の有無確認（エラーメッセージ削除）
  const notValue = Array.prototype.map.call($('.requiredItem'), (item) => {
    const selectNumber = item.selectedIndex
    const itemValue = item.options[selectNumber].value
    if (itemValue === '') {
      return item.parentNode.parentNode.children[0].children[1]
    } else {
      item.parentNode.parentNode.children[0].children[1].classList.remove('not-input-required')
    }
  })

  // モーダル制御Flag
  let stopFlag = true

  // 必須項目の有無確認（エラーメッセージ追加、Flag変更）
  notValue.forEach((item) => {
    if (item !== undefined) {
      item.parentNode.parentNode.children[0].children[1].classList.add('not-input-required')
      stopFlag = false
    }
  })

  // モーダル制御
  if (!stopFlag) {
    modal.classList.remove('is-active')
  } else {
    // モーダルデータ入力
    const targetDataNumSelect = Object.assign(document.querySelectorAll('select'), Array.prototype)
    const dataItem = document.getElementsByClassName('dataItem')
    const dataValue = document.getElementsByClassName('dataValue')
    const checkDataItem = document.getElementsByClassName('checkDataItem')
    const checkDataValue = document.getElementsByClassName('checkDataValue')
    const checkArrow = document.getElementsByClassName('checkArrow')

    targetDataNumSelect.forEach((item, idx) => {
      if (item.selectedIndex !== 0) {
        checkDataItem[idx].innerText = dataItem[item.selectedIndex - 1].innerText
        checkArrow[idx].innerText = '→'
        checkDataValue[idx].innerText = dataValue[item.selectedIndex - 1].innerText
      } else {
        checkDataItem[idx].innerText = ''
        checkArrow[idx].innerText = ''
        checkDataValue[idx].innerText = ''
      }
    })
    modal.classList.add('is-active')
  }
})

// 確認ボタン押下時
$('#submit').addEventListener('click', (e) => {
  // sessionにoffcheckOnのアイテムが残っていると削除する
  if (sessionStorage.getItem('offcheckOn')) {
    sessionStorage.removeItem('offcheckOn')
  }
})

// 戻るボタンクリックイベント処理
$('#returnBtn').addEventListener('click', () => {
  history.back()
})
