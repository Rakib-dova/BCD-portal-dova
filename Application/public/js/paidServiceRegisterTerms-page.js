/* global
 $
*/

/**
 * サービスタイプと利用規約に同意チェックボックスの値に応じて、お申し込み内容入力へボタンの活性・非活性のコントロール
 * @param {string} searchBtnId 検索ボタンID
 * @param {string} postalNumber 郵便番号
 * @returns
 */
const controlNextBtn = function () {
  let serviceCheck
  Array.prototype.forEach.call($('.serviceCheckboxes'), (item) => {
    if (item.checked) serviceCheck = true
  })

  const btn = $('#next-btn')
  // 利用規約に同意チェックボックスがチェック済、かつ、サービスタイプが一つ以上チェックされている場合
  if ($('#check').checked && serviceCheck) {
    btn.removeAttribute('disabled')
  } else {
    btn.setAttribute('disabled', 'disabled')
  }
}

// 希望サービスチェックボックス
Array.prototype.forEach.call($('.serviceCheckboxes'), (item) => {
  item.onclick = function () {
    // サービスタイプと利用規約に同意チェックボックスの値に応じて、お申し込み内容入力へボタンの活性・非活性のコントロール
    controlNextBtn()

    const elementIdMap = {
      '020': 'introductionSupport',
      '030': 'standard'
    }
    // 希望サービスチェックボックスの状態に応じて、重要事項説明を表示・非表示にする
    const element = $('#' + elementIdMap[this.value])
    if (this.checked) {
      element.classList.remove('is-hidden')
    } else {
      element.classList.add('is-hidden')
    }
  }
})

// 利用規約に同意チェックボックスのクリック
$('#check').onclick = function () {
  // サービスタイプと利用規約に同意チェックボックスの値に応じて、お申し込み内容入力へボタンの活性・非活性のコントロール
  controlNextBtn()
}
