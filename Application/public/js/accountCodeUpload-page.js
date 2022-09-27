/*
ページ概要：勘定科目一括作成
ページ遷移：Home画面→仕訳情報管理→勘定科目設定→勘定科目一括作成
*/

/* global

 $

*/

let fileReader = null
let targetFile = null

// 「アップロード開始」ボタンの活性化のスイッチ
document.getElementsByName('bulkAccountCode')[0].addEventListener('change', function (e) {
  targetFile = this.files.item(0)
  if (targetFile !== null) {
    fileReader = new FileReader()
    fileReader.readAsBinaryString(targetFile)
    fileReader.onload = function () {
      if (fileReader.result.length > 5120000) {
        alert('ファイルサイズが5MB超えています。\nCSVファイルを確認後もう一度アップロードしてください。')
        $('#filename').innerText = ''
        $('#upload').setAttribute('disabled', 'disabled')
      } else {
        $('#filename').innerText = targetFile.name
        $('#upload').removeAttribute('disabled')
      }
    }
  }
})

// アップロード開始ボタンクリックイベント
$('#upload').addEventListener('click', function (e) {
  // データをDBに保存
  $('#accountCodeUpload').submit()
})
