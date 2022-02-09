function changeTenant(selector) {
  const selected = $(selector).find('option:selected')
  const tr = selected.closest('tr')
  tr.find('.address').text(selected.data('address') ?? '')
  if (selected.val()) {
    tr.find('.profile').prop('disabled', true).attr('href', selected.data('url'))
  } else {
    tr.find('.profile').prop('disabled', false).attr('href', null)
  }
}

function validate() {
  let tenants = {}
  let formats = {}

  let missing = false
  let mismatch = false
  $('[name="connectionSelect"').each((index, element) => {
    const tenant = $(element)
    const format = tenant.closest('tr').find('[name="formatSelector"')

    tenant.parent().removeClass('is-danger')
    format.parent().removeClass('is-danger')

    const customerId = tenant.data('customerid')
    const tenantId = tenant.val()
    const formatId = format.val()
    tenants[customerId] = tenantId ?? ''
    if (tenantId && formatId) {
      if (formats[tenantId] && formats[tenantId] != formatId) {
        format.parent().addClass('is-danger')
        mismatch = true
      } else {
        formats[tenantId] = formatId
      }
    } else if (tenantId || formatId) {
      tenant.parent().addClass('is-danger')
      format.parent().addClass('is-danger')
      missing = true
    }
  })

  if (missing) {
    notice('紐付け先テナント名と選択中のフォーマットは同時に選択してください。', 'is-danger')
  }
  if (mismatch) {
    notice('同じ紐付け先テナント名には同じフォーマットを選択してください。', 'is-danger')
  }
  return missing || mismatch ? null : { tenants: tenants, formats: formats }
}

$(() => {
  new List('customerList', {
    valueNames: ['customerId', 'customerName']
  })

  $('[name="connectionSelect"').each((index, element) => changeTenant(element))

  // コネクション選択リスト変更時
  $('[name="connectionSelect"').on('change', (event) => {
    changeTenant(event.target)
  })

  // 一括適用ボタン押下時
  $('.apply-button').on('click', (event) => {
    const formatId = $('.apply-selector').val()
    $('.apply-target:checked').each((index, element) => {
      $(element).prop('checked', false)
      $(element).closest('.field').find('[name="formatSelector"').val(formatId)
    })
  })

  // 保存ボタン押下時
  $('.save-button').on('click', (event) => {
    // 読込中
    $('.save-button').addClass('is-loading')

    let data = validate()
    if (!data) {
      $('.save-button').removeClass('is-loading')
      return
    }

    // 保存処理呼び出し
    $.ajax({
      url: '/bugyo/settings_connection/save',
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
      })
      .fail(function (xhr) {
        notice(xhr.status + ' ' + xhr.statusText, 'is-danger')
      })
      .always(function (xhr, meg) {
        $('.save-button').removeClass('is-loading')
        // スクロールをTOPへ
        window.scroll({ top: 0, behavior: 'auto' })
      })
  })
})
