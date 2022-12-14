let fileReader = null
let targetFile = null

const $ = (_selector) => {
  const selectorDelimeter = _selector.substr(0, 1)
  const selector = _selector.substr(1, _selector.length)

  switch (selectorDelimeter) {
    case '#':
      return document.getElementById(selector)
    case '.':
      return document.getElementsByClassName(selector)
  }
}

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
  $('#usersUpload').submit()
})
