'use strict'
// nodemailerの読み込み
const nodemailer = require('nodemailer')
const logger = require('./logger')
const constantsDefine = require('../constants')

const host = process.env.MAIL_HOST
const port = process.env.MAIL_PORT
const seture = process.env.MAIL_SECURE
const ciphers = process.env.MAIL_CIPHERS
const user = process.env.MAIL_USER
const pass = process.env.MAIL_PORT

/**
 * メール送信機能.
 *
 * @param {string} to 送信先(複数の場合、カンマ区切りの文字列)
 * @param {string} subject 件名
 * @param {string} text 本文
 * @returns 正常終了：0, 送信エラー：1, システムエラー：2
 */
const mail = async function (to, subject, text) {
  logger.info(constantsDefine.logMessage.MAILINF000)

  // SMTP情報を格納
  const smtpData = {
    host: host,
    port: port,
    secureConnection: seture,
    tls: { ciphers: ciphers },
    auth: {
      user: user,
      pass: pass
    }
  }

  // 送信内容を作成
  const mailData = {
    from: user,
    to: to,
    subject: subject,
    text: text
  }

  // メールを送信
  let result
  try {
    result = await sendMail(smtpData, mailData)
  } catch (e) {
    logger.warn(constantsDefine.logMessage.MAILWAN000 + e)
    return 2
  }
  // 正常：0, 送信エラー:1, システムエラー:2
  logger.info(constantsDefine.logMessage.MAILINF001)
  return result
}

// メール送信関数
function sendMail(smtpData, mailData) {
  const transporter = nodemailer.createTransport(smtpData)

  // メール送信
  try {
    return transporter.sendMail(mailData, function (error, info) {
      if (error) {
        // エラー処理
        logger.warn(constantsDefine.logMessage.MAILWAN000 + error)
        return 1
      } else {
        // 送信完了
        logger.info(constantsDefine.logMessage.MAILINF002 + info.response)
        return 0
      }
    })
  } catch (e) {
    logger.warn(constantsDefine.logMessage.MAILWAN000 + e)
    return 2
  }
}

module.exports = { mail: mail }
