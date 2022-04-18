'use strict'
const approvalInboxController = require('../controllers/approvalInboxController')
const requestApprovalController = require('../controllers/requestApprovalController.js')
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
    const requestApproval = await requestApprovalController.findOneRequestApproval(contractId, invoiceId)

    if (requestApproval === null) {
      return 1
    }

    // 請求書番号取得
    const invoice = await apiManager.accessTradeshift(accessToken, refreshToken, 'get', `/documents/${invoiceId}`)
    const invoiceNumber = invoice.ID.value

    // メール送信日付
    const date = new Date()
    const year = date.getFullYear()
    const month = date.getMonth() + 1
    const day = date.getDate()

    // メール本文URL
    const urlHost = process.env.TS_HOST
    const urlClient = process.env.TS_CLIENT_ID

    // ユーザ情報取得
    let uerMailAddress
    let companyName
    let userName
    let subject
    let text

    if (~~requestApproval.status >= 10 && ~~requestApproval.status <= 20) {
      // 支払依頼、一次承認から十次承認の場合
      // 承認者情報検索
      const approver = await approvalInboxController.getRequestApproval(
        accessToken,
        refreshToken,
        contractId,
        invoiceId,
        tenantId
      )
      const activeApproverNo = approver.status - 10
      uerMailAddress = approver.approveRoute.users[activeApproverNo].email
      companyName = approver.approveRoute.users[activeApproverNo].companyName
      userName = `${approver.approveRoute.users[activeApproverNo].firstName} ${approver.approveRoute.users[activeApproverNo].lastName}`

      subject = `BConnectionデジタルトレードお知らせ 支払依頼（${year}/${month}/${day}）`

      // メール内容作成

      text = `${companyName}
${userName} 様

新たな支払依頼が届きました。

対象の請求書番号：${invoiceNumber}
詳細はこちら
https://${urlHost}/#/${urlClient}
※デジタルトレードアプリのHOME画面が表示されない場合はログイン後、再度こちらのURLにアクセスしてください。

(確認手順)
1. デジタルトレードアプリのHOME画面から、仕訳情報管理＞支払依頼一覧＞承認待ちの順にクリック
2. 承認待ち一覧にて対象の支払依頼の「依頼内容確認」ボタンをクリック

-----------------------------------------------------
NTTコミュニケーションズ株式会社
BConnectionデジタルトレード`
    } else {
      const tradeshiftDTO = new (require('../DTO/TradeshiftDTO'))(accessToken, refreshToken, tenantId)
      tradeshiftDTO.setUserAccounts(require('../DTO/VO/UserAccounts'))

      const userAccounts = await tradeshiftDTO.findUser(requestApproval.requester)

      uerMailAddress = userAccounts.email
      companyName = userAccounts.companyName
      userName = `${userAccounts.firstName} ${userAccounts.lastName}`

      if (~~requestApproval.status === 0) {
        // 最終承認の場合
        subject = `BConnectionデジタルトレードお知らせ 支払依頼最終結果（${year}/${month}/${day}）`

        // メール内容作成
        text = `${companyName}
${userName} 様

支払依頼が最終承認されました。

対象の請求書番号：${invoiceNumber}
詳細はこちら
https://${urlHost}/#/${urlClient}
※デジタルトレードアプリのHOME画面が表示されない場合はログイン後、再度こちらのURLにアクセスしてください。

(確認手順)
1. デジタルトレードアプリのHOME画面から、仕訳情報管理＞支払依頼一覧の順にクリック
2. 支払依頼一覧にて対象の支払依頼の「仕訳情報設定」ボタンをクリック

-----------------------------------------------------
NTTコミュニケーションズ株式会社
BConnectionデジタルトレード`
      } else if (~~requestApproval.status === 90) {
        // 差し戻しの場合
        subject = `BConnectionデジタルトレードお知らせ 支払依頼差し戻し（${year}/${month}/${day}）`

        // メール内容作成
        text = `${companyName}
${userName} 様

支払依頼が差し戻されました。

対象の請求書番号：${invoiceNumber}
詳細はこちら
https://${urlHost}/#/${urlClient}
※デジタルトレードアプリのHOME画面が表示されない場合はログイン後、再度こちらのURLにアクセスしてください。

(確認手順)
1. デジタルトレードアプリのHOME画面から、仕訳情報管理＞支払依頼一覧の順にクリック
2. 支払依頼一覧にて対象の支払依頼の「仕訳情報設定」ボタンをクリック
3. 仕訳情報設定画面の「支払依頼へ」ボタンをクリック

-----------------------------------------------------
NTTコミュニケーションズ株式会社
BConnectionデジタルトレード`
      }
    }

    logger.info(constantsDefine.logMessage.MAILINF004)
    return { maileAddress: uerMailAddress, subject: subject, text: text, status: requestApproval.status }
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
 * @returns 正常終了：0(最終承認以外）1（最終承認）, システムエラー：2
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
      // 最終承認の場合
      if (resultMailContent.status === '00') return 1

      // 最終承認以外の場合
      return 0
    } else {
      return 2
    }
  } catch (error) {
    logger.warn(constantsDefine.logMessage.MAILWAN000 + 'approverController.getApproveRoute')
    return 2
  }
}

module.exports = { mailContent: mailContent, sendPaymentRequestMail: sendPaymentRequestMail }
