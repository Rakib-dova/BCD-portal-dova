let fileReader = null
let targetFile = null

// 「アップロード開始」ボタンの活性化のスイッチ
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

$('#start-upload-btn')?.addEventListener('click', async () => {
  const modal = document.getElementById('upload-progress-modal')
  modal.classList.add('is-active')

  const csvFile = $('#file-upload').files[0]
  await sendSever(csvFile)
})

// eslint-disable-next-line no-unused-vars
const sendSever = async (file) => {
  const formData = new FormData()
  if (file) formData.append('csvFile', file)

  apiController(`https://${location.host}/pdfInvoiceCsvUpload/upload`, 'POST', formData, async (response) => {
    const url = response.url
    const a = document.createElement('a')
    document.body.appendChild(a)
    a.href = url
    a.click()
    a.remove()
  })
}

const apiController = async (url, method, body = null, callback = null) => {
  const options = {
    method,
    headers: { credentials: 'include' },
    body
  }

  try {
    const response = await fetch(url, options)
    if (response.ok) {
      if (callback) callback(response)
      else return response
    } else {
      console.log('失敗しました response:\n', response)
    }
  } catch (err) {
    console.error('失敗しました ERR:\n', err)
  }
}
