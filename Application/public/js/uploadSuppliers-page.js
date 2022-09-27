/*
ページ概要：取引先一括登録
ページ遷移：Home画面→設定→取引先一括登録
*/

/* global

 $

*/

const modal = document.getElementById('uploadSuppliers-progress-modal')

let fileReader = null
let targetFile = null

// 「アップロード開始」ボタンの活性化のスイッチ
document.getElementsByName('suppliersFileUpload')[0].addEventListener('change', function (e) {
  targetFile = this.files.item(0)
  if (targetFile !== null) {
    fileReader = new FileReader()
    fileReader.readAsBinaryString(targetFile)
    fileReader.onload = function () {
      if (fileReader.result.length > 5120000) {
        alert('ファイルサイズが5MB超えています。\nCSVファイルを確認後もう一度アップロードしてください。')
        $('#filename').innerText = ''
        $('#supplier-upload-btn').setAttribute('disabled', 'disabled')
        location.reload()
      } else if (
        targetFile.name.lastIndexOf('.csv') === -1 ||
        !(targetFile.name.lastIndexOf('.csv') === targetFile.name.length - 4)
      ) {
        alert('ファイル形式が異なります。\nCSVファイルを確認後もう一度アップロードしてください。')
        $('#filename').innerText = ''
        $('#supplier-upload-btn').setAttribute('disabled', 'disabled')
        location.reload()
      } else {
        $('#filename').innerText = targetFile.name
        $('#supplier-upload-btn').removeAttribute('disabled')
      }
    }
  }
})

// アップロード開始ボタンクリックイベント
$('#supplier-upload-btn').addEventListener('click', function (e) {
  if (!$('#supplier-upload-btn').getAttribute('disabled')) {
    modal.classList.add('is-active')
    $('#suppliersUpload').submit()
  }
})
