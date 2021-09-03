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

Array.prototype.forEach.call($('.btnDetail'), function (ele) {
  ele.onclick = function () {
    const clickBtn = this
    const tr = clickBtn.parentNode.parentNode
    const td = tr.children

    $('#invoicesAll').innerHTML = td[4].innerHTML + '件'
    $('#invoicesCount').innerHTML = td[5].innerHTML + '件'
    $('#invoicesSuccess').innerHTML = td[6].innerHTML + '件'
    $('#invoicesSkip').innerHTML = td[7].innerHTML + '件'
    $('#invoicesFail').innerHTML = td[8].innerHTML + '件'

    // invoiceDetail検索
    const invoicsesId = td[9].defaultValue
    const sendData = { invoicsesId: null }
    const resultDetailTable = $('#resultDetail')
    let detail = ''
    sendData.invoicsesId = invoicsesId

    while (resultDetailTable.hasChildNodes()) {
      resultDetailTable.removeChild(resultDetailTable.firstChild)
    }
    const requestInvoiceDetail = new XMLHttpRequest()
    requestInvoiceDetail.open('POST', '/csvuploadResult/', true)
    requestInvoiceDetail.setRequestHeader('Content-Type', 'application/json')
    requestInvoiceDetail.onreadystatechange = function () {
      if (requestInvoiceDetail.readyState === requestInvoiceDetail.DONE) {
        if (requestInvoiceDetail.status === 200) {
          const resultDetail = JSON.parse(requestInvoiceDetail.responseText)
          if (resultDetail.length === 0) {
            $('#tabs').classList.add('is-invisible')
            $('#detailTable').classList.add('is-invisible')
            $('#errormessage').innerHTML = '<h3>検索データがありません。</h3><br>'
          } else {
            resultDetail.forEach((obj) => {
              if (~~obj.lines === 0) {
                $('#tabs').classList.add('is-invisible')
                $('#detailTable').classList.add('is-invisible')
                $('#errormessage').innerHTML =
                  '<h3>請求書が100件超えています。</h3><h3>CSVファイルを確認後もう一度アップロードしてください。</h3><br>'
              } else {
                $('#tabs').classList.remove('is-invisible')
                $('#detailTable').classList.remove('is-invisible')
                $('#errormessage').innerHTML = ''

                if (obj.status === '成功') {
                  detail += `<tr class="tr-success"><td class="text-center">${obj.lines}</td><td class="text-center td-overflow">${obj.invoiceId}</td><td class="text-center"><p class="status-text is-success">${obj.status}</p></td>`
                } else if (obj.status === 'スキップ') {
                  detail += `<tr class="tr-skip"><td class="text-center">${obj.lines}</td><td class="text-center td-overflow">${obj.invoiceId}</td><td class="text-center"><p class="status-text is-skip">${obj.status}</p></td>`
                } else {
                  detail += `<tr class="tr-fail"><td class="text-center">${obj.lines}</td><td class="text-center td-overflow">${obj.invoiceId}</td><td class="text-center"><p class="status-text is-fail">${obj.status}</p></td>`
                }
                detail += `<td>${obj.errorData}</td></tr>`
              }
            })
            resultDetailTable.innerHTML += detail
          }
        } else {
          const errStatus = requestInvoiceDetail.status
          switch (errStatus) {
            case 403:
              $('#tabs').classList.add('is-invisible')
              $('#detailTable').classList.add('is-invisible')
              $('#errormessage').innerHTML = '<h3>ログインユーザーではありません。</h3><br>'
              break
            default:
              $('#tabs').classList.add('is-invisible')
              $('#detailTable').classList.add('is-invisible')
              $('#errormessage').innerHTML = '<h3>システムエラーが発生しました。</h3><br>'
              break
          }
        }
      }
    }
    requestInvoiceDetail.send(JSON.stringify(sendData))
  }
})

// タブ押下 - 全体
$('#btnTabAll').onclick = function () {
  Array.prototype.forEach.call($('.tr-success'), function (ele) {
    ele.classList.remove('is-invisible')
  })

  Array.prototype.forEach.call($('.tr-skip'), function (ele) {
    ele.classList.remove('is-invisible')
  })

  Array.prototype.forEach.call($('.tr-fail'), function (ele) {
    ele.classList.remove('is-invisible')
  })
}

// タブ押下 - 成功
$('#btnTabSuccess').onclick = function () {
  Array.prototype.forEach.call($('.tr-success'), function (ele) {
    ele.classList.remove('is-invisible')
  })

  Array.prototype.forEach.call($('.tr-skip'), function (ele) {
    ele.classList.add('is-invisible')
  })

  Array.prototype.forEach.call($('.tr-fail'), function (ele) {
    ele.classList.add('is-invisible')
  })
}

// タブ押下 - スキップ
$('#btnTabSkip').onclick = function () {
  Array.prototype.forEach.call($('.tr-success'), function (ele) {
    ele.classList.add('is-invisible')
  })

  Array.prototype.forEach.call($('.tr-skip'), function (ele) {
    ele.classList.remove('is-invisible')
  })

  Array.prototype.forEach.call($('.tr-fail'), function (ele) {
    ele.classList.add('is-invisible')
  })
}

// タブ押下 - 失敗
$('#btnTabFail').onclick = function () {
  Array.prototype.forEach.call($('.tr-success'), function (ele) {
    ele.classList.add('is-invisible')
  })

  Array.prototype.forEach.call($('.tr-skip'), function (ele) {
    ele.classList.add('is-invisible')
  })

  Array.prototype.forEach.call($('.tr-fail'), function (ele) {
    ele.classList.remove('is-invisible')
  })
}
