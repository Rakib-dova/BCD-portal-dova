'use strict'

const approvalInboxController = require('../../controllers/approvalInboxController')
const contractController = require('../../controllers/contractController')
const db = require('../../models')
const requestApproval = db.RequestApproval

module.exports = async (req, res, next) => {
  let resultStatusCode
  if (!req.session || !req.user?.userId || !req.user?.tenantId) {
    resultStatusCode = 403
    return res.status(resultStatusCode).send()
  }

  const tenantId = req.user.tenantId
  const userId = req.user.userId
  const contract = await contractController.findOne(tenantId).catch((error) => {
    resultStatusCode = 500
    return res.status(resultStatusCode).send(error)
  })

  // 請求書の承認依頼検索
  let requestNoticeCnt = 0
  let rejectedNoticeCnt = 0
  let noticeCount
  const requestApprovals = await requestApproval
    .findAll({
      where: {
        contractId: contract.contractId
      }
    })
    .catch((error) => {
      resultStatusCode = 500
      return res.status(resultStatusCode).send(error)
    })

  for (let i = 0; i < requestApprovals.length; i++) {
    // 支払依頼件数
    const requestId = requestApprovals[i].requestId
    const result = await approvalInboxController.hasPowerOfEditing(contract.contractId, userId, requestId)
    if (result === true) {
      ++requestNoticeCnt
    } else if (result === -1) {
      resultStatusCode = 500
      noticeCount = null
      return res.status(resultStatusCode).send(noticeCount)
    }

    // 差し戻し件数
    if (requestApprovals[i].requester === userId) {
      if (requestApprovals[i].status === '90') {
        ++rejectedNoticeCnt
      }
    }
  }

  resultStatusCode = 200
  noticeCount = `${requestNoticeCnt},${rejectedNoticeCnt}`

  return res.status(resultStatusCode).send(noticeCount)
}
