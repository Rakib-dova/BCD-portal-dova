const nodemailer = require('nodemailer')

const transporter = nodemailer.createTransport({
  host: 'smtp.office365.com',
  port: 587, // ポート
  use_authentication: true,
  auth: {
    //user: 'bcdt-mailsend-test@actec2.onmicrosoft.com', // ユーザー名
    //pass: 'Vy&Rn*(/Ft5Z' // パスワード
    //user: 'no-reply-dev1@bcdtapp.onmicrosoft.com', // ユーザー名
    user: 'no-reply-dev1@bcdtapp.onmicrosoft.com', // ユーザー名
    pass: 'BJ+V-BmQ#p^F69i' // パスワード
    //user: 'no-reply-stg@bcdtapp.onmicrosoft.com', // ユーザー名
    //pass: 'Dh7DLWLxuERXr_W' // パスワード
  }
})

const sendMailFromO365 = (sentTo, subject, text) => {
  const mailOptions = {
    //from: 'bcdt-mailsend-test@actec2.onmicrosoft.com',
    //from: 'no-reply-dev1@bcdtapp.onmicrosoft.com',
    from: 'no-reply-dev1@tsdev.biz',
    //from: 'no-reply-stg@tsdev.biz',
    //from: 'no-reply-dev1@tsdev.biz',
    to: sentTo,
    /*
    envelope: {
      from: 'no-reply-dev1@tsdev.biz', // バウンスメールの戻り先アドレス
      from: 'no-reply-dev1@bcdtapp.onmicrosoft.com', // バウンスメールの戻り先アドレス
      to: sentTo // 実際の送信先
    },
    */
    subject: subject,
    text: text
  }

  transporter.sendMail(mailOptions, function (error, info) {
    if (error) {
      console.log('Error:' + error)
      return 'Error:' + error
    } else {
      console.log('Message sent: ' + info.response)
      return 'Message sent'
    }
  })
}

module.exports = {
  sendMailFromO365: sendMailFromO365
}

const sentTo = 'hirohashi.nttbiz@gmail.com'
const subject = '請求番号XXXに関する承認依頼'
const invoiceId = 1234
const text = `AAA様\n請求番号${invoiceId}に関する承認依頼が来ています`

sendMailFromO365(sentTo, subject, text)
