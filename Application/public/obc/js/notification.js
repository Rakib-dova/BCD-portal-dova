$(() => {
  $('.notification .delete').on('click', (e) => {
    $(e.target).closest('.notification').remove()
  })
})

function notice(message, type, append) {
  if (!append) {
    $('.notification:not(#notification-template)').remove()
  }
  const template = $('#notification-template')
  const notification = template.clone(true)
  notification.removeAttr('id')
  notification.children('span').text(message)
  notification.addClass(type ?? 'is-success')
  notification.insertAfter(template)
  notification.removeClass('is-hidden')
}
