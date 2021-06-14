const fileUpload = document.getElementById('file-upload')
const startUploadBtn = document.getElementById('start-upload-btn')
const fileUploadBtn = document.getElementById('file-upload-btn')
const uploader = document.getElementsByClassName('uploader').item(0)
let fileReader = null

// 「アップロード開始」ボタンの活性化のスイッチ
fileUpload.onchange = function() {
    targetFile = this.files.item(0)
    if (targetFile !== null) {
        fileReader = new FileReader()
        fileReader.readAsBinaryString(targetFile)
        startUploadBtn.removeAttribute("Disabled")
    } else {
        startUploadBtn.setAttribute("Disabled", "Disabled")
    }
}

// CSVファイルをサーバーへアップロードする関数
startUploadBtn.onclick = (() => {
    return () => {
        let sendData =  {
            filename: null,
            fileData: null
        }
        if ( fileReader.readyState !== 2) {
            return
        } else {
            sendData.filename = targetFile.name
            sendData.fileData = btoa(fileReader.result)
        }
        const sender = new XMLHttpRequest()
        sender.open('POST', uploader.action, true)
        sender.setRequestHeader('Content-Type', 'application/json')
        sender.onreadystatechange = () => {
            if (sender.readyState === sender.DONE) {
                if (sender.status === 200) {
                    startUploadBtn.setAttribute('Disabled', 'Disabled')
                    document.getElementsByClassName('modal')[0].setAttribute('class', 'modal')
                } 
                    document.getElementsByClassName('modal')[0].setAttribute('class', 'modal')
            }
        }
        sender.send(JSON.stringify(sendData))
    }
})()
