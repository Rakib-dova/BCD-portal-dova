const modal = document.getElementById('upload-progress-modal')
const uploader = document.getElementsByClassName('uploader').item(0)
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
$('#file-upload').addEventListener('change', function (e) {
  targetFile = this.files.item(0)
  if (targetFile !== null) {
    fileReader = new FileReader()
    fileReader.readAsBinaryString(targetFile)
    fileReader.onload = function () {
      if (fileReader.result.length > 5120000) {
        alert('ファイルサイズが5MB超えています。\nCSVファイルを確認後もう一度アップロードしてください。')
        $('#start-upload-btn').setAttribute('Disabled', 'Disabled')
      } else {
        $('#start-upload-btn').removeAttribute('Disabled')
      }
    }
  }
})

// CSVファイルをサーバーへアップロードする関数
$('#start-upload-btn').addEventListener('click', () => {
  if ($('#start-upload-btn').getAttribute('Disabled') || fileReader === null) {
    return null
  } else {
    modal.classList.add('is-active')
    const sendData = {
      filename: null,
      fileData: null,
      uploadFormatId: null
    }
    if (fileReader.readyState !== 2) {
      return
    } else {
      sendData.filename = targetFile.name
      sendData.fileData = btoa(fileReader.result)
      fileReader = null
      const uploadFormatId = $('#start-upload-select').value
      if (uploadFormatId.length !== 0) {
        sendData.uploadFormatId = uploadFormatId
      } else {
        sendData.uploadFormatId = null
      }
    }

    const sender = new XMLHttpRequest()
    sender.open('POST', uploader.action, true)
    sender.setRequestHeader('Content-Type', 'application/json')
    sender.onreadystatechange = () => {
      if (sender.readyState === sender.DONE) {
        if (sender.status === 200 || sender.status === 500) {
          modal.classList.remove('is-active')
          $('#start-upload-btn').setAttribute('Disabled', 'Disabled')
          alert(sender.responseText)
        } else if (sender.status === 400) {
          modal.classList.remove('is-active')
          $('#start-upload-btn').setAttribute('Disabled', 'Disabled')
          location.href = '/portal'
        } else {
          modal.classList.remove('is-active')
          $('#start-upload-btn').setAttribute('Disabled', 'Disabled')
          alert(sender.responseText)
        }
      }
    }
    sender.send(JSON.stringify(sendData))
  }
})
