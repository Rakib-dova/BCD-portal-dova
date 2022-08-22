/* global

  $

*/

let fr = null
let targetFile = null

// 写真上限サイズ（1MB）
const maxImageSize = 1048576

const originSrc = $('#sealImpImg').getAttribute('src')

/**
 * 選択されたファイルが条件を満たない場合、エラーメッセージを表示し、アップロードできないようにする
 * @param {string} message メッセージ
 */
const disabledUpload = (message) => {
  alert(message)
  $('#file-upload').setAttribute('src', originSrc)
  $('#filename').value = ''
  $('#start-upload-btn').setAttribute('disabled', 'disabled')
}

$('#file-upload').addEventListener('change', function (e) {
  const file = e.target.files[0]
  fr = new FileReader()
  fr.onload = function (e) {
    const image = new Image()
    image.onload = function () {
      $('#sealImpImg').setAttribute('src', fr.result)
      $('#start-upload-btn').removeAttribute('disabled')
      $('#filename').value = file.name
      targetFile = file
    }
    image.onerror = function () {
      disabledUpload('写真を選択してください。')
    }
    image.src = e.target.result
  }

  if (!file || (file.type !== 'image/jpeg' && file.type !== 'image/png')) {
    disabledUpload('印影に使えるファイル形式は png か jpeg だけです。')
  } else if (file.size > maxImageSize) {
    disabledUpload('1MB以下の写真を選択してください。')
  } else {
    fr.readAsDataURL(file)
  }
})

$('#file-upload').addEventListener('click', function (e) {
  e.target.value = ''
})

$('#start-upload-btn')?.addEventListener('click', async () => {
  if ($('#start-upload-btn').getAttribute('Disabled') || fr === null || targetFile === null) {
    return null
  }

  const modal = document.getElementById('upload-progress-modal')
  modal.classList.add('is-active')

  const csvFile = targetFile
  const response = await uploadimage(csvFile)
  console.log('==  response =====================:\n', response)
  modal.classList.remove('is-active')
  if (response.status === 500 || response.status === 400 || response.status === 200) {
    const data = await response.json()
    console.log('==  json data =====================:\n', data)
    if (data.message) alert(data.message)
    if (response.status === 200 && data.url) location.href = data.url
  }
})

// eslint-disable-next-line no-unused-vars
const uploadimage = async (file) => {
  const formData = new FormData()
  if (file) formData.append('csvFile', file)

  return await uploadApiController(
    `https://${location.host}/imprintUpload/upload`,
    'POST',
    formData,
    async (response) => {
      const url = response.url
      const a = document.createElement('a')
      document.body.appendChild(a)
      a.href = url
      a.click()
      a.remove()
    }
  )
}

const uploadApiController = async (url, method, body = null, callback = null) => {
  console.log('===apiController', body)

  const options = {
    method,
    headers: {
      credentials: 'include',
      'CSRF-Token': document.querySelector('meta[name="csrf-token"]').getAttribute('content')
    },
    body
  }

  try {
    const response = await fetch(url, options)
    if (response.ok) {
      if (callback) callback(response)
    } else {
      console.log('失敗しました response:\n', response)
    }

    return response
  } catch (err) {
    console.error('失敗しました ERR:\n', err)
  }
}
