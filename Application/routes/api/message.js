'use strict'

const inboxController = require('../../controllers/inboxController')
const TradeshiftDTO = require('../../DTO/TradeshiftDTO')
const approvalInboxController = require('../../controllers/approvalInboxController')
const contractController = require('../../controllers/contractController')

module.exports = async (req, res, next) => {
  const accessToken = req.user.accessToken
  const refreshToken = req.user.refreshToken
  const tenantId = req.user.tenantId
  const userId = req.user.userId
  const contract = await contractController.findOne(req.user.tenantId)
  const tradeshiftDTO = new TradeshiftDTO(accessToken, refreshToken, tenantId)

  const workflow = await inboxController.getWorkflow(userId, contract.contractId, tradeshiftDTO)
  let requestNoticeCnt = 0
  for (let i = 0; i < workflow.length; i++) {
    const requestApproval = await approvalInboxController.getRequestApproval(
      accessToken,
      refreshToken,
      contract.contractId,
      workflow[i].documentId,
      userId
    )
    const requestId = requestApproval.requestId
    const result = await approvalInboxController.hasPowerOfEditing(contract.contractId, userId, requestId)
    if (result === true) {
      switch (workflow[i].workflowStatus) {
        case '支払依頼中':
        case '一次承認済み':
        case '二次承認済み':
        case '三次承認済み':
        case '四次承認済み':
        case '五次承認済み':
        case '六次承認済み':
        case '七次承認済み':
        case '八次承認済み':
        case '九次承認済み':
        case '十次承認済み':
          ++requestNoticeCnt
          break
      }
    }
  }

  console.log('requestNoticeCnt', ++requestNoticeCnt)

  return res.send(requestNoticeCnt + '')
}
