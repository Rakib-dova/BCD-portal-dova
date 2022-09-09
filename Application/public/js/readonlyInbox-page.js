// 依頼者メッセージ詳細表示
Array.prototype.forEach.call(document.querySelectorAll('.moreMessage'), (item) => {
  item.addEventListener('click', () => {
    showMoreMessageModal(item)
  })
})

// 承認者メッセージ詳細表示
Array.prototype.forEach.call(document.querySelectorAll('.moreMessageUser'), (item) => {
  item.addEventListener('click', () => {
    showMoreMessageModal(item)
  })
})

const showMoreMessageModal = function (target) {
  while (document.getElementById('more-message-modal-body').firstChild) {
    document
      .getElementById('more-message-modal-body')
      .removeChild(document.getElementById('more-message-modal-body').firstChild)
  }

  const message = target.dataset.info
  console.log(message.length)
  if (message !== 'null') {
    console.log('11111')
    document.getElementById('more-message-modal').classList.add('is-active')
    console.log('22222')

    if (message.indexOf('\n') !== -1) {
      const messageLines = message.split('\n')
      messageLines.forEach((line, idx) => {
        const newChild = document.createElement('p')
        newChild.id = idx
        newChild.textContent = line
        document.getElementById('more-message-modal-body').appendChild(newChild)
      })
    } else {
      const newChild = document.createElement('p')
      newChild.textContent = message
      document.getElementById('more-message-modal-body').appendChild(newChild)
    }
  }
}
