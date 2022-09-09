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

// メッセージモーダル表示
const showMoreMessageModal = function (target) {
  while (document.getElementById('more-message-modal-body').firstChild) {
    document
      .getElementById('more-message-modal-body')
      .removeChild(document.getElementById('more-message-modal-body').firstChild)
  }

  const message = target.dataset.info
  if (message !== 'null') {
    document.getElementById('more-message-modal').classList.add('is-active')

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
