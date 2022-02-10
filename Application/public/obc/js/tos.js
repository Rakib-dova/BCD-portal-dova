$(() => {
  $('.terms-of-service').on('scroll', (event) => {
    let element = event.target
    $('#agreement').prop('disabled', element.scrollHeight != element.clientHeight + element.scrollTop)
  })

  $('#agreement').on('change', (event) => {
    $('#next').prop('disabled', !$(event.target).prop('checked'))
  })
})
