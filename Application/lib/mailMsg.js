'use strict'
const approvalInboxController = require('../controllers/approvalInboxController')
const apiManager = require('../controllers/apiManager')
const logger = require('./logger')
const constantsDefine = require('../constants')
const sendMail = require('../lib/sendMail')

/**
 * メール内容作成機能.
 * @param {string} accessToken トレードシフトのAPIアクセストークン
 * @param {string} refreshToken トレードシフトのAPIアクセストークン
 * @param {uuid} contractId デジトレの利用の契約者の識別番号
 * @param {uuid} invoiceId デジトレの請求書の識別番号
 * @param {uuid} tenantId デジトレの企業の識別番号
 * @returns 正常終了：{maileAddress(メールアドレス), subject（メールタイトル）, text（メール内容）}, システムエラー：1
 */
const mailContent = async function (accessToken, refreshToken, contractId, invoiceId, tenantId) {
  logger.info(constantsDefine.logMessage.MAILINF003)
  try {
    // 承認者情報検索
    const requestApproval = await approvalInboxController.getRequestApproval(
      accessToken,
      refreshToken,
      contractId,
      invoiceId,
      tenantId
    )

    if (requestApproval === null) {
      return 1
    }

    // ユーザ情報取得
    const activeApproverNo = requestApproval.status - 10

    const prevUserMailAddress = requestApproval.approveRoute.users[activeApproverNo].email
    const companyName = requestApproval.approveRoute.users[activeApproverNo].companyName
    const prevUser = `${requestApproval.approveRoute.users[activeApproverNo].firstName} ${requestApproval.approveRoute.users[activeApproverNo].lastName}`

    // 請求書番号取得
    const invoice = await apiManager.accessTradeshift(accessToken, refreshToken, 'get', `/documents/${invoiceId}`)
    const invoiceNumber = invoice.ID.value

    // メール送信日付
    const date = new Date()
    const year = date.getFullYear()
    const month = date.getMonth() + 1
    const day = date.getDate()

    const subject = `BConnectionデジタルトレードお知らせ 支払依頼（${year}/${month}/${day}）`

    // メール内容作成
    const text = `${companyName}<br>
  ${prevUser} 様<br>
  <br>
  新たな支払依頼が届きました。<br>
  <br>
  対象の請求書番号：${invoiceNumber}<br>
  詳細はこちら<br>
  <a href="https://bcd-portal.tsdev.biz/inboxList/approvals">承認画面に移動</a><br>
  ※承認画面が表示されない場合はログイン後、再度こちらのURLにアクセスしてください。<br>
  <br>
  -----------------------------------------------------<br>
  NTTコミュニケーションズ株式会社<br>
  BConnectionデジタルトレード<br>`

    logger.info(constantsDefine.logMessage.MAILINF004)
    return { maileAddress: prevUserMailAddress, subject: subject, text: text }
  } catch (error) {
    logger.warn(constantsDefine.logMessage.MAILWAN001 + error)
    return 1
  }
}

/**
 * 支払依頼関連メール送信機能.
 * @param {string} accessToken トレードシフトのAPIアクセストークン
 * @param {string} refreshToken トレードシフトのAPIアクセストークン
 * @param {uuid} contractId デジトレの利用の契約者の識別番号
 * @param {uuid} invoiceId デジトレの請求書の識別番号
 * @param {uuid} tenantId デジトレの企業の識別番号
 * @returns 正常終了：0, システムエラー：1
 */
const sendPaymentRequestMail = async function (accessToken, refreshToken, contractId, invoiceId, tenantId) {
  try {
    // メール作成

    const resultMailContent = await mailContent(accessToken, refreshToken, contractId, invoiceId, tenantId)

    // メール送信
    let sendMailStatus
    if (resultMailContent !== 1) {
      sendMailStatus = await sendMail.mail(
        resultMailContent.maileAddress,
        resultMailContent.subject,
        resultMailContent.text
      )
    }

    if (sendMailStatus === 0) {
      return 0
    } else {
      return 1
    }
  } catch (error) {
    logger.warn(constantsDefine.logMessage.MAILWAN000 + 'approverController.getApproveRoute')
    return 1
  }
}

module.exports = { mailContent: mailContent, sendPaymentRequestMail: sendPaymentRequestMail }
