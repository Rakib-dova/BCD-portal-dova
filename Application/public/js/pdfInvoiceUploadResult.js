/* global

 uploadCsv, $

*/

let fileReader = null
let targetFile = null

$('#file-upload').addEventListener('change', function (e) {
  targetFile = this.files.item(0)
  if (targetFile !== null) {
    fileReader = new FileReader()
    fileReader.readAsBinaryString(targetFile)
    fileReader.onload = function () {
      if (fileReader.result.length > 5120000) {
        alert('ファイルサイズが5MB超えています。\nCSVファイルを確認後もう一度アップロードしてください。')
        $('#filename').innerText = ''
        $('#start-upload-btn').setAttribute('Disabled', 'Disabled')
      } else {
        $('#filename').innerText = targetFile.name
        $('#start-upload-btn').removeAttribute('Disabled')
      }
    }
  }
})

$('#start-upload-btn')?.addEventListener('click', async () => {
  if ($('#start-upload-btn').getAttribute('Disabled') || fileReader === null) {
    return null
  }

  const modal = document.getElementById('upload-progress-modal')
  modal.classList.add('is-active')

  const csvFile = $('#file-upload').files[0]
  const response = await uploadCsv(csvFile)
  console.log('==  response =====================:\n', response)
  modal.classList.remove('is-active')
  if (response.status === 500 || response.status === 400) {
    const data = await response.json()
    console.log('==  json data =====================:\n', data)
    if (data.message) alert(data.message)
  }
})
