/*
ページ概要：ユーザー一括登録
ページ遷移：Home画面→設定→ユーザー一括登録
*/

/* global

 $

*/

const modal = document.getElementById('uploadUsers-progress-modal')

let fileReader = null
let targetFile = null

// 「アップロード開始」ボタンの活性化のスイッチ
document.getElementsByName('userNameFileUpload')[0].addEventListener('change', function (e) {
  targetFile = this.files.item(0)
  if (targetFile !== null) {
    fileReader = new FileReader()
    fileReader.readAsBinaryString(targetFile)
    fileReader.onload = function () {
      if (fileReader.result.length > 5120000) {
        alert('ファイルサイズが5MB超えています。\nCSVファイルを確認後もう一度アップロードしてください。')
        $('#filename').innerText = ''
        $('#user-upload-btn').setAttribute('disabled', 'disabled')
      } else {
        $('#filename').innerText = targetFile.name
        $('#user-upload-btn').removeAttribute('disabled')
      }
    }
  }
})

// アップロード開始ボタンクリックイベント
$('#user-upload-btn').addEventListener('click', function (e) {
  modal.classList.add('is-active')
  // データをDBに保存
  $('#usersUpload').submit()
})
