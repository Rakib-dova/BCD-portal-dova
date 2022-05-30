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

    // 取込件数
    if (td[4].innerHTML === '-') {
      $('#invoicesAll').innerHTML = td[4].innerHTML
    } else {
      $('#invoicesAll').innerHTML = td[4].innerHTML + '件'
    }

    // 作成完了
    if (td[6].innerHTML === '-') {
      $('#invoicesSuccess').innerHTML = td[6].innerHTML
    } else {
      $('#invoicesSuccess').innerHTML = td[6].innerHTML + '件'
    }

    // スキップ
    if (td[7].innerHTML === '-') {
      $('#invoicesSkip').innerHTML = td[7].innerHTML
    } else {
      $('#invoicesSkip').innerHTML = td[7].innerHTML + '件'
    }

    // 作成失敗
    if (td[7].innerHTML === '-') {
      $('#invoicesFail').innerHTML = td[8].innerHTML
    } else {
      $('#invoicesFail').innerHTML = td[8].innerHTML + '件'
    }

    // 請求書作成数
    if (td[5].innerHTML === '-') {
      $('#invoicesCount').innerHTML = td[5].innerHTML
    } else if (td[5].innerHTML === '') {
      $('#invoicesCount').innerHTML = td[5].innerHTML
      $('#tabs').classList.add('is-invisible')
      $('#detailTable').classList.add('is-invisible')
      $('#errormessage').innerHTML =
        '<h3>システムエラーが発生しました。</h3><h3>CSVファイルをもう一度アップロードしてください。</h3><br>'
      return
    } else {
      $('#invoicesCount').innerHTML = td[5].innerHTML + '件'
    }

    // invoiceDetail検索
    const invoiceUploadId = td[9].defaultValue
    const resultDetailTable = $('#resultDetail')
    let detail = ''

    while (resultDetailTable.hasChildNodes()) {
      resultDetailTable.removeChild(resultDetailTable.firstChild)
    }

    apiController(
      `https://${location.host}/pdfInvoiceCsvUpload/resultList/detail/${invoiceUploadId}`,
      'GET',
      async (response) => {
        const resultDetail = await response.json()

        if (resultDetail.length === 0) {
          $('#tabs').classList.add('is-invisible')
          $('#detailTable').classList.add('is-invisible')
          $('#errormessage').innerHTML =
            '<h3>請求書が0件か100件を超えています。</h3><h3>CSVファイルを確認後もう一度アップロードしてください。</h3><br>'
        } else {
          resultDetail.forEach((obj) => {
            if (~~obj.lines === 0) {
              $('#tabs').classList.add('is-invisible')
              $('#detailTable').classList.add('is-invisible')
              $('#errormessage').innerHTML = `<h3>${obj.errorData}</h3><br>`
            } else {
              $('#tabs').classList.remove('is-invisible')
              $('#detailTable').classList.remove('is-invisible')
              $('#errormessage').innerHTML = ''

              if (obj.status === '成功') {
                detail += `<tr class="tr-success"><td class="text-center">${obj.lines}</td><td class="text-center td-overflow">${obj.invoiceNo}</td><td class="text-center"><p class="status-text is-success">${obj.status}</p></td>`
              } else if (obj.status === 'スキップ') {
                detail += `<tr class="tr-skip"><td class="text-center">${obj.lines}</td><td class="text-center td-overflow">${obj.invoiceNo}</td><td class="text-center"><p class="status-text is-skip">${obj.status}</p></td>`
              } else {
                detail += `<tr class="tr-fail"><td class="text-center">${obj.lines}</td><td class="text-center td-overflow">${obj.invoiceNo}</td><td class="text-center"><p class="status-text is-fail">${obj.status}</p></td>`
              }
              detail += `<td>${obj.errorData ? obj.errorData : '正常に取込ました。'}</td></tr>`
            }
          })
          resultDetailTable.innerHTML += detail
        }
        $('#btnTabAll').classList.add('tab-selected')
        $('#btnTabSuccess').classList.remove('tab-selected')
        $('#btnTabSkip').classList.remove('tab-selected')
        $('#btnTabFail').classList.remove('tab-selected')
      }
    )
  }
})

const apiController = async (url, method, callback = null) => {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json'
    }
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

// タブ押下 - 全体
$('#btnTabAll').onclick = function () {
  $('#btnTabAll').classList.add('tab-selected')
  $('#btnTabSuccess').classList.remove('tab-selected')
  $('#btnTabSkip').classList.remove('tab-selected')
  $('#btnTabFail').classList.remove('tab-selected')

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
  $('#btnTabAll').classList.remove('tab-selected')
  $('#btnTabSuccess').classList.add('tab-selected')
  $('#btnTabSkip').classList.remove('tab-selected')
  $('#btnTabFail').classList.remove('tab-selected')

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
  $('#btnTabAll').classList.remove('tab-selected')
  $('#btnTabSuccess').classList.remove('tab-selected')
  $('#btnTabSkip').classList.add('tab-selected')
  $('#btnTabFail').classList.remove('tab-selected')

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
  $('#btnTabAll').classList.remove('tab-selected')
  $('#btnTabSuccess').classList.remove('tab-selected')
  $('#btnTabSkip').classList.remove('tab-selected')
  $('#btnTabFail').classList.add('tab-selected')

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
