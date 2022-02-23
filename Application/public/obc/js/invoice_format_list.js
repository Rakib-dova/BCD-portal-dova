function closeDeleteConfirmation() {
  $('.modal').removeClass('is-active')
  $('footer.modal-card-foot .delete-button').removeClass('is-loading').off('click')
}

$(() => {
  new List('formatlist', {
    valueNames: ['name', 'createdUser', 'createdAt', 'updatedUser', 'updatedAt']
  })

  $('.delete-format').on('click', (e) => {
    const id = $(e.target).data('id')
    const name = $(e.target).data('name')
    const row = $(e.target).closest('tr')
    $('#name-for-deletion').text(name)
    $('.modal').addClass('is-active')

    $('footer.modal-card-foot .delete-button').on('click', (e) => {
      $(e.target).addClass('is-loading')
      $.ajax({
        url: '/bugyo/invoice_format_list/' + id,
        type: 'delete',
        headers: {
          'CSRF-Token': $('input[name=_csrf]').val()
        },
        processData: false
      })
        .done(function (response) {
          if (response.status == 'redirect') {
            window.location.href = response.url
            return
          }
          if (response.status == 'ok') {
            $(row).remove()
            notice(`${name}を削除しました`)
          } else {
            notice(response.message, 'is-danger')
          }
        })
        .fail(function (xhr) {
          notice(xhr.status + ' ' + xhr.statusText, 'is-danger')
        })
        .always(closeDeleteConfirmation)
    })
  })

  $('footer.modal-card-foot .close-button').on('click', (e) => {
    closeDeleteConfirmation()
  })
})
