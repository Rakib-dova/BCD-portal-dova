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
    } else if (messageStatus === 'registerprocedure') {
      // 解約手続き中画面を表示する
      message = '現在利用登録手続き中です。'
      description1 = '利用登録完了後、本機能はご利用可能となります。'
      description2 = null
    } else if (messageStatus === 'changeprocedure') {
      // 解約手続き中画面を表示する
      message = '現在契約情報変更手続き中です。'
      description1 = '契約情報変更完了後、本機能は再度ご利用可能となります。'
      description2 = null
    } else if (messageStatus === 'generaluser') {
      // 解約手続き中画面を表示する
      message = '本機能はご利用いただけません。'
      description1 = 'テナント管理者権限のあるユーザで再度操作をお試しください。'
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
