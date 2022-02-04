$(() => {
  $('#save-button').on('click', function () {
    const data = {
      name: $('#formatName').val(),
      items: $('.invoiceItems:checked')
        .get()
        .map((e) => $(e).val())
    }
    // 入力チェック
    if (data.name) {
      $('#formatName').removeClass('is-danger')
    } else {
      $('#formatName').addClass('is-danger')
      notice('フォーマット名を入力してください', 'is-danger')
      return
    }

    const button = $(this)
    button.addClass('is-loading')
    let formatId = $('#formatId').val()
    $.ajax({
      url: '/bugyo/invoice_format/' + formatId,
      type: 'post',
      headers: {
        'CSRF-Token': $('input[name=_csrf]').val()
      },
      contentType: 'application/json',
      processData: false,
      data: JSON.stringify(data)
    })
      .done(function (response) {
        if (response.status == 'ok') {
          if (formatId != response.formatId) {
            window.location.href = '/bugyo/invoice_format/' + response.formatId
          }
        }
        else {
          notice(response.message, 'is-danger')
        }
      })
      .fail(function (xhr) {
        notice(xhr.status + ' ' + xhr.statusText, 'is-danger')
      })
      .always(function () {
        button.removeClass('is-loading')
      })
  })

  $('#preview-button').on('click', function () {
    const data = {
      items: $('.invoiceItems:checked')
        .get()
        .map((e) => $(e).val()),
      recipient: $('#recipient').val()
    }
    // 入力チェック
    if (data.recipient) {
      $('#recipient').closest('div.select').removeClass('is-danger')
    } else {
      $('#recipient').closest('div.select').addClass('is-danger')
      notice('フォーマット確認用宛先を入力してください', 'is-danger')
      return
    }

    const button = $(this)
    button.addClass('is-loading')
    $('#preview').on('load', () => button.removeClass('is-loading'))
    $('#form').submit()
  })
})
