/* global

  $

*/

// 写真上限サイズ（1MB）
const maxImageSize = 1048576

const originSrc = $('#imprintImg').getAttribute('src')

/**
 * 選択されたファイルが条件を満たない場合、エラーメッセージを表示し、アップロードできないようにする
 * @param {string} message メッセージ
 */
const disabledUpload = (message) => {
  // TODO モーダルでメッセージを表示
  alert(message)
  $('#imprintImg').setAttribute('src', originSrc)
  $('#fileName').value = ''
  $('#upload-btn').setAttribute('disabled', 'disabled')
}

// ファイルの選択
$('#upload-file').addEventListener('change', function (e) {
  const file = e.target.files[0]

  const fr = new FileReader()
  fr.onload = function (e) {
    const image = new Image()
    image.onload = function () {
      $('#imprintImg').setAttribute('src', fr.result)
      $('#upload-btn').removeAttribute('disabled')
      $('#fileName').value = file.name
    }
    image.onerror = function () {
      disabledUpload('写真を選択してください。')
    }
    image.src = e.target.result
  }

  if (!file || (file.type !== 'image/jpeg' && file.type !== 'image/png')) {
    disabledUpload('印影に使えるファイル形式は png か jpeg だけです。')
  } else if (file.size > maxImageSize) {
    disabledUpload('1MB以下の写真を選択してください。')
  } else {
    fr.readAsDataURL(file)
  }
})

// アップロードボタンのクリック
$('#upload-btn').addEventListener('click', function (e) {
  const element = e.srcElement
  element.classList.add('is-loading')
})

// 登録済み印影の削除ボタンのクリック
$('#delete-btn').addEventListener('click', function (e) {
  const element = e.srcElement
  element.classList.add('is-loading')
})
