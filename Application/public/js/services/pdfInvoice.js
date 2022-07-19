// eslint-disable-next-line no-unused-vars
const savePdfInvoice = async (invoice, lines, file, invoiceId = null) => {
  const formData = new FormData()
  formData.append('invoice', JSON.stringify(invoice))
  formData.append('lines', JSON.stringify(lines))
  if (file) formData.append('sealImp', file)

  console.log('==  API 前 invoice ===================\n', invoice)
  console.log('==  API 前 lines ===================\n', lines)
  console.log('==  API 前 file ===================\n', file)

  return await apiController(
    invoiceId ? `https://${location.host}/pdfInvoices/${invoiceId}` : `https://${location.host}/pdfInvoices`,
    invoiceId ? 'PUT' : 'POST',
    formData
  )
}

// eslint-disable-next-line no-unused-vars
const outputPdfInvoice = async (invoice, lines, file, invoiceId = null, timerId = null) => {
  const formData = new FormData()
  formData.append('invoice', JSON.stringify(invoice))
  formData.append('lines', JSON.stringify(lines))
  if (file) formData.append('sealImp', file)

  console.log('==  API 前 invoice ===================\n', invoice)
  console.log('==  API 前 lines ===================\n', lines)
  console.log('==  API 前 file ===================\n', file)

  apiController(
    invoiceId
      ? `https://${location.host}/pdfInvoices/deleteAndOutput/${invoiceId}`
      : `https://${location.host}/pdfInvoices/output`,
    'POST',
    formData,
    async (response) => {
      if (timerId) {
        console.log('====  タイマークリア  ====')
        clearTimeout(timerId)
      }
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      document.body.appendChild(a)
      a.download = 'pdfInvoice.pdf'
      a.href = url
      a.click()
      a.remove()
      setTimeout(() => {
        URL.revokeObjectURL(url)
      }, 1000)
      location.href = `https://${location.host}/pdfInvoices/list`
    }
  )
}

// eslint-disable-next-line no-unused-vars
const uploadCsv = async (file) => {
  const formData = new FormData()
  if (file) formData.append('csvFile', file)

  return await apiController(`https://${location.host}/pdfInvoiceCsvUpload/upload`, 'POST', formData, async (response) => {
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
