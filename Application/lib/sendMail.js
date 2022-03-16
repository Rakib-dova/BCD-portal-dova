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
const pass = process.env.MAIL_PASS

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
  // 正常：0, エラー:1
  try {
    const result = await sendMail(smtpData, mailData)

    if (result === 0) {
      // 正常
      logger.info(constantsDefine.logMessage.MAILINF001)
      return 0
    } else {
      // エラー
      return 1
    }
  } catch (e) {
    logger.warn(constantsDefine.logMessage.MAILWAN000 + e)
    return 1
  }
}

// メール送信関数
async function sendMail(smtpData, mailData) {
  const transporter = nodemailer.createTransport(smtpData)

  // メール送信
  try {
    const result = await transporter.sendMail(mailData)
    logger.info(constantsDefine.logMessage.MAILINF002 + result.response)
    return 0
  } catch (err) {
    logger.warn(constantsDefine.logMessage.MAILWAN000 + err)
    return 1
  }
}

module.exports = { mail: mail }
