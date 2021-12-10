const modal = document.getElementById('upload-progress-modal')
const uploader = document.getElementById('accountCodeUpload')
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
document.getElementsByName('bulkAccountCode')[0].addEventListener('change', function (e) {
  targetFile = this.files.item(0)
  if (targetFile !== null) {
    fileReader = new FileReader()
    fileReader.readAsBinaryString(targetFile)
    fileReader.onload = function () {
      if (fileReader.result.length > 5120000) {
        alert('ファイルサイズが5MB超えています。\nCSVファイルを確認後もう一度アップロードしてください。')
        $('#upload').setAttribute('disabled', 'disabled')
      } else {
        $('#upload').removeAttribute('disabled')
      }
    }
  }
})

// CSVファイルをサーバーへアップロードする関数
$('#upload').addEventListener('click', () => {
  if ($('#upload').getAttribute('disabled') || fileReader === null) {
    console.log(document.getElementsByClassName('bulkAccountCode'))
    return null
  } else {
    modal.classList.add('is-active')
    const sendData = {
      filename: null,
      fileData: null
    }
    if (fileReader.readyState !== 2) {
      return
    } else {
      sendData.filename = targetFile.name
      sendData.fileData = btoa(fileReader.result)
      fileReader = null
    }

    const sender = new XMLHttpRequest()
    sender.open('POST', uploader.action, true)
    sender.setRequestHeader('Content-Type', 'application/json')
    sender.onreadystatechange = () => {
      console.log(sender.readyState, sender.DONE)
      if (sender.readyState === sender.DONE) {
        const fiveErrorMsg = '請求書アップロード中に予期しない問題が発生しました。\n取込結果は一覧画面でご確認下さい。'
        if (sender.status === 200 || sender.status === 500) {
          modal.classList.remove('is-active')
          $('#upload').setAttribute('disabled', 'disabled')
          alert(sender.responseText)
        } else if (sender.status === 400) {
          modal.classList.remove('is-active')
          $('#upload').setAttribute('disabled', 'disabled')
          location.href = '/portal'
        } else if (sender.status === 501) {
          modal.classList.remove('is-active')
          $('#upload').setAttribute('disabled', 'disabled')
          alert(fiveErrorMsg)
        } else if (sender.status === 502) {
          modal.classList.remove('is-active')
          $('#upload').setAttribute('disabled', 'disabled')
          alert(fiveErrorMsg)
        } else if (sender.status === 503) {
          modal.classList.remove('is-active')
          $('#upload').setAttribute('disabled', 'disabled')
          alert(fiveErrorMsg)
        } else if (sender.status === 504) {
          modal.classList.remove('is-active')
          $('#upload').setAttribute('disabled', 'disabled')
          alert(fiveErrorMsg)
        } else if (sender.status === 505) {
          modal.classList.remove('is-active')
          $('#upload').setAttribute('disabled', 'disabled')
          alert(fiveErrorMsg)
        } else {
          modal.classList.remove('is-active')
          $('#upload').setAttribute('disabled', 'disabled')
          alert(sender.responseText)
        }
      }
    }
    sender.send(JSON.stringify(sendData))
  }
})
