'use stric'
const logger = require('../lib/logger')
const constantsDefine = require('../constants')
const db = require('../models')
const Request = db.RequestApproval
const Status = db.ApproveStatus
/**
 *
 * @param {string} invoiceId インヴォイスID
 * @param {string} message 差し戻しメッセージ
 * @returns {Boolean} 差し戻し処理結果
 */
const rejectApprove = async (contractId, invoiceId, message) => {
  try {
    // ・差し戻しされたデータのステータスが'90'に更新されること(RequestApprovalテーブル)
    // ・差し戻し時承認者が入力したメッセージに更新されること
    const status = await Status.findOne({
      where: {
        name: '差し戻し'
      }
    })
    const rejectedRequest = await Request.findOne({
      where: {
        contractId: contractId,
        invoiceId: invoiceId
      }
    })

    const result = await Request.update(
      {
        status: status.code,
        message: message
      },
      {
        where: {
          requestId: rejectedRequest.requestId
        }
      }
    )
    if (!result) return false
    return true
  } catch (error) {
    logger.error({ invoiceId: invoiceId, stack: error.stack, status: 0 })
    logger.info(constantsDefine.logMessage.INF001 + 'updateApprove')
    return error
  }
}

module.exports = {
  rejectApprove: rejectApprove
}
