'use strict'
const errorHelper = require('./error')

module.exports = {
  create: (status) => {
    const messageStatus = status
    return messageStatus
  },
  render: (messageStatus, req, res, next) => {
    let message, description1, description2

    if (messageStatus === 'cancellation') {
      // 解約申請完了画面に表示する
      message = '解約の申請を受け付けました。'
      description1 = 'デジタルトレードアプリをご利用いただき誠にありがとうございました。'
      description2 = 'またのご利用を心よりお待ちしております。'
    } else if (messageStatus === 'cancelprocedure') {
      // 解約手続き中画面を表示する
      message = '現在解約手続き中です。'
      description1 = '解約手続き完了後、再度ご利用開始いただけます。'
      description2 = null
    } else {
      return next(errorHelper.create(400))
    }

    res.render('notice', {
      message: message,
      description1: !description1 ? null : description1,
      description2: !description2 ? null : description2
    })
  }
}
