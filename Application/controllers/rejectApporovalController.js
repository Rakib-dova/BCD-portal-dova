'use stric'
const logger = require('../lib/logger')
const constantsDefine = require('../constants')
const db = require('../models')
const Request = db.RequestApproval
const Approval = db.Approval
const Status = db.ApproveStatus
const approvalInboxController = require('./approvalInboxController')
/**
 *
 * @param {string} invoiceId インヴォイスID
 * @param {string} message 差し戻しメッセージ
 * @returns {Boolean} 差し戻し処理結果
 */
const rejectApprove = async (contractId, invoiceId, message, userId) => {
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
      },
      order: [['create', 'DESC']]
    })

    const hasPowerOfEditing = await approvalInboxController.hasPowerOfEditing(
      contractId,
      userId,
      rejectedRequest.requestId
    )

    if (hasPowerOfEditing) {
      const updateRequestApproval = await Request.update(
        {
          status: status.code
        },
        {
          where: {
            requestId: rejectedRequest.requestId
          }
        }
      )
      if (!updateRequestApproval) return false

      const userData = {}

      userData.approveStatus = status.code
      userData.rejectedUser = userId
      userData.rejectedAt = new Date()

      if (message !== '' && message !== undefined) {
        userData.rejectedMessage = message
      }

      const updateApproval = await Approval.update(userData, {
        where: {
          requestId: rejectedRequest.requestId
        }
      })
      if (!updateApproval) return false
    } else {
      return -1
    }
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
