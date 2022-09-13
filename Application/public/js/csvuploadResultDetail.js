/*
ページ概要：取込結果一覧
ページ遷移：Home画面→請求書一括作成→請求書一括作成→取込結果一覧
*/

// selector「$」宣言
// document.getElementById、document.getElementsByClassName省略
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

// リストの各取込結果のステータス押下時
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
      $('#errorMessage').innerHTML =
        '<h3>システムエラーが発生しました。</h3><h3>CSVファイルをもう一度アップロードしてください。</h3><br>'
      return
    } else {
      $('#invoicesCount').innerHTML = td[5].innerHTML + '件'
    }

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
            $('#errorMessage').innerHTML =
              '<h3>請求書が0件か100件を超えています。</h3><h3>CSVファイルを確認後もう一度アップロードしてください。</h3><br>'
          } else {
            resultDetail.forEach((obj) => {
              if (~~obj.lines === 0) {
                $('#tabs').classList.add('is-invisible')
                $('#detailTable').classList.add('is-invisible')
                $('#errorMessage').innerHTML = `<h3>${obj.errorData}</h3><br>`
              } else {
                $('#tabs').classList.remove('is-invisible')
                $('#detailTable').classList.remove('is-invisible')
                $('#errorMessage').innerHTML = ''

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
          $('#btnTabAll').classList.add('tab-selected')
          $('#btnTabSuccess').classList.remove('tab-selected')
          $('#btnTabSkip').classList.remove('tab-selected')
          $('#btnTabFail').classList.remove('tab-selected')
        } else {
          const errStatus = requestInvoiceDetail.status
          switch (errStatus) {
            case 403:
              $('#tabs').classList.add('is-invisible')
              $('#detailTable').classList.add('is-invisible')
              $('#errorMessage').innerHTML = '<h3>ログインユーザーではありません。</h3><br>'
              break
            default:
              $('#tabs').classList.add('is-invisible')
              $('#detailTable').classList.add('is-invisible')
              $('#errorMessage').innerHTML = '<h3>システムエラーが発生しました。</h3><br>'
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
