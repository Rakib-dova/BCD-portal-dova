const fileUpload = document.getElementById('file-upload')
const startUploadBtn = document.getElementById('start-upload-btn')
const modal = document.getElementById('upload-progress-modal')
const uploader = document.getElementsByClassName('uploader').item(0)
let fileReader = null
let targetFile = null

// 「アップロード開始」ボタンの活性化のスイッチ
fileUpload.addEventListener('change', function (e) {
  targetFile = this.files.item(0)
  if (targetFile !== null) {
    fileReader = new FileReader()
    fileReader.readAsBinaryString(targetFile)
    fileReader.onload = function () {
      if (btoa(fileReader.result).length > 6826) {
        alert('ファイルサイズが5MB超えています。\nCSVファイルを確認後もう一度アップロードしてください。')
      } else {
        startUploadBtn.removeAttribute('Disabled')
      }
    }
  } else {
    startUploadBtn.setAttribute('Disabled', 'Disabled')
  }
})

// CSVファイルをサーバーへアップロードする関数
startUploadBtn.onclick = (() => {
  return () => {
    if (startUploadBtn.getAttribute('Disabled') || fileReader === null) {
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
        if (sender.readyState === sender.DONE) {
          if (sender.status === 200) {
            modal.classList.remove('is-active')
            startUploadBtn.setAttribute('Disabled', 'Disabled')
            alert(sender.responseText)
          } else {
            modal.classList.remove('is-active')
            startUploadBtn.setAttribute('Disabled', 'Disabled')
          }
        }
      }
      sender.send(JSON.stringify(sendData))
    }
  }
})()
