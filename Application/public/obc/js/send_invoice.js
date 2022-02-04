$(() => {
  new List('unissuedList', {
    valueNames: [
      'invoiceId',
      { name: 'totalAmount', attr: 'data-value' },
      'customerName',
      'issueDate',
      'dueDate',
      'attachments'
    ]
  }).sort('invoiceId', { order: 'asc' })

  // 添付追加ボタン押下時の挙動
  $('.fileAddBtn').on('click', (event) => {
    $('#attachFileUpload').data('value', $(event.target).data('documentid'))
    $('#attachFileUpload .file-name').text('')
    $('#attachFileAddBtn').prop('disabled', true)
    $('#attachFileModal').addClass('is-active')
  })

  // 添付ファイルアップロード時の挙動
  $('#attachFileUpload input[type=file]').on('change', (event) => {
    const fileInput = $(event.target)[0]
    if (fileInput.files.length > 0) {
      $('#attachFileUpload .file-name').text(fileInput.files[0].name)
      $('#attachFileAddBtn').prop('disabled', false)
    }
  })

  // 添付ファイルダイアログ 追加するボタン押下時の処理
  $('#attachFileAddBtn').on('click', (event) => {
    const documentId = $('#attachFileUpload').data('value')
    const uploadFile = $('#attachFileUpload input[type=file]')[0].files
    if (uploadFile !== null) {
      // 添付ファイル追加
      let fd = new FormData()
      fd.append('documentId', documentId)
      fd.append('file', uploadFile[0])
      $.ajax({
        url: '/bugyo/send_invoice/attachment',
        type: 'post',
        headers: {
          'CSRF-Token': $('input[name=_csrf]').val()
        },
        contentType: false,
        processData: false,
        data: fd
      })
        .done(function (response) {
          // 一覧テーブルにファイル名を設定
          let name = uploadFile[0].name
          $('#' + documentId + ' .attachments').append(
            `<span class="attached-file"><a href="${response.url}">${name}</a><button class="delete" data-file="${name}"></button><br/></span>`
          )
        })
        .fail(function (xhr) {
          notice(xhr.status + ' ' + xhr.statusText, 'is-danger')
        })
        .always(function (xhr, meg) {
          $('#attachFileModal').removeClass('is-active')
        })
    }
  })

  // 添付削除ボタン押下時の挙動
  $('.attachments').on('click', '.delete', (event) => {
    let target = $(event.target)
    let documentId = target.closest('tr').attr('id')
    let filename = target.data('file')

    $.ajax({
      url: `/bugyo/send_invoice/attachment/${documentId}/${encodeURIComponent(filename)}`,
      type: 'delete',
      headers: {
        'CSRF-Token': $('input[name=_csrf]').val()
      }
    })
      .done(function (response) {
        target.closest('.attached-file').remove()
        notice(response.message)
      })
      .fail(function (xhr) {
        notice(xhr.status + ' ' + xhr.statusText, 'is-danger')
      })
  })

  // 発行するボタン押下時の挙動
  $('#sendBtn').on('click', (event) => {
    $('#confirmModal').addClass('is-active')
  })

  $('#issue-button').on('click', (event) => {
    // 読込中
    $('#sendBtn').addClass('is-loading')
    $('#confirmModal').removeClass('is-active')
    let data = []
    $('#unissuedList tbody tr').each((index, val) => {
      data.push({
        documentId: val.id,
        invoiceId: $(val).data('invoiceid'),
        error: $(val).data('error')
      })
    })

    $.ajax({
      url: '/bugyo/send_invoice/send',
      type: 'post',
      headers: {
        'CSRF-Token': $('input[name=_csrf]').val()
      },
      contentType: 'application/json',
      processData: false,
      data: JSON.stringify(data)
    })
      .done(function (response) {
        notice(response.message, response.status == 'ok' ? 'is-success' : 'is-danger')
        let errors = response.errors || {}
        $('#unissuedList tbody tr').each((index, val) => {
          if (errors[val.id]) {
            $(val).addClass('has-background-danger-light').data('error', errors[val.id])
            $(val)
              .find('.invoiceId')
              .prepend(
                `<span data-tooltip="${
                  errors[val.id]
                }"><i class="fa fa-exclamation-triangle has-text-danger"></i></span>`
              )
          } else if (!$(val).data('error')) {
            $(val).remove()
          }
        })
      })
      .fail(function (xhr) {
        notice(xhr.status + ' ' + xhr.statusText, 'is-danger')
      })
      .always(function () {
        $('#sendBtn').removeClass('is-loading')
      })
  })

  $('#aboutInvoiceNo').on('click', (event) => $('#noticeInvoiceNo').addClass('is-active'))

  $('.close-button').on('click', (event) => $(event.target).closest('.modal').removeClass('is-active'))
})
