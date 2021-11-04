window.onload = () => {
  const notification = document.querySelector('.notification-header')
  if (notification) {
    notification.classList.add('notification-show')
    setTimeout(() => {
      notification.classList.remove('notification-show')
      notification.classList.add('is-invisible')
    }, 2600)
  }
}
