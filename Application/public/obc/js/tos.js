$(() => {
  $('.terms-of-service').on('scroll', (event) => {
    let element = event.target
    const scrollPosition = element.clientHeight + element.scrollTop
    const proximity = 0
    $('#agreement').prop('disabled', (element.scrollHeight - scrollPosition) / element.scrollHeight > proximity)
  })

  $('#agreement').on('change', (event) => {
    $('#next').prop('disabled', !$(event.target).prop('checked'))
  })
})
