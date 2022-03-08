'use strict'

const logger = require('../lib/logger')
const approverController = require('./approverController')
const db = require('../models')
const Op = db.Sequelize.Op
const RequestApproval = db.RequestApproval
const DbApproval = db.Approval

const getRequestApproval = async (accessToken, refreshToken, contract, invoiceId, tenant) => {
  try {
    const users = await approverController.getApprover(accessToken, refreshToken, tenant, {
      firstName: '',
      lastName: '',
      email: ''
    })
    // 検索のため、依頼中ステータス作成
    const requestStatus = []
    for (let id = 10; id < 21; id++) {
      requestStatus.push({ status: `${id}` })
    }
    const requestApproval = await RequestApproval.findOne({
      where: {
        contractId: contract,
        invoiceId: invoiceId,
        [Op.or]: requestStatus
      }
    })
    if (requestApproval instanceof RequestApproval === false) return null

    const approveRouteId = requestApproval.approveRouteId
    const requester = users.find((user) => {
      if (user.id === requestApproval.requester) {
        return true
      }
      return false
    })

    const request = {
      requestId: requestApproval.requestId,
      contractId: requestApproval.contractId,
      invoiceId: requestApproval.invoiceId,
      message: requestApproval.message,
      status: requestApproval.status,
      approveRoute: await approverController.getApproveRoute(accessToken, refreshToken, contract, approveRouteId),
      approvals: [],
      prevUser: {
        name: null,
        message: null
      }
    }

    let prev = null
    let next = null
    for (let idx = 0; idx < request.approveRoute.users.length; idx++) {
      const selectApproval = await DbApproval.findOne({
        where: {
          approveRouteId: approveRouteId
        }
      })
      const approver = new Approval({
        contractId: contract,
        requestId: request.requestId,
        message: selectApproval[`message${idx + 1}`],
        status: request.status,
        approver: request.approveRoute.users[idx]
      })
      if (!prev) {
        prev = approver
      } else {
        next = approver
        prev.next = next.approvalId
        next.prev = prev.approvalId
        prev = next
      }
      request.approvals.push(approver)
    }

    const userNo = ~~request.status - 10
    switch (userNo) {
      case 0: {
        request.prevUser.name = requester.name
        request.prevUser.message = request.message
        break
      }
      case 1:
      case 2:
      case 3:
      case 4:
      case 5:
      case 6:
      case 7:
      case 8:
      case 9:
      case 10:
        request.prevUser.name = request.approveRoute.users[userNo - 1].getName()
        request.prevUser.message = request.approvals[userNo - 1].message
    }

    return request
  } catch (error) {
    logger.error({ contractId: contract, stack: error.stack, status: 0 })
    return null
  }
}

const hasPowerOfEditing = async (contractId, userId, requestApproval) => {
  try {
    if (requestApproval === null) return -1

    const status = requestApproval.status
    const idx = ~~status - 10
    if (requestApproval.approvals[idx].approver.Id !== userId) {
      return false
    }

    return true
  } catch (error) {
    logger.error({ contractId: contractId, stack: error.stack, status: 0 })
    return -1
  }
}

/**
 * 仕訳情報保存
 * @param {uuid} contractId
 * @param {uuid} invoiceId
 * @param {object} data
 */
const insertAndUpdateJournalizeInvoice = async (contractId, invoiceId, data) => {
  const inboxController = require('./inboxController')
  return await inboxController.insertAndUpdateJournalizeInvoice(contractId, invoiceId, data)
}

module.exports = {
  getRequestApproval: getRequestApproval,
  hasPowerOfEditing: hasPowerOfEditing,
  insertAndUpdateJournalizeInvoice: insertAndUpdateJournalizeInvoice
}

const ApprovalStatusList = []
class ApprovalStatus {
  constructor(init) {
    this.id = init.id
    this.code = init.code
  }
}

ApprovalStatusList.push(new ApprovalStatus({ id: '10', code: '承認待ち' }))
ApprovalStatusList.push(new ApprovalStatus({ id: '00', code: '承認済み' }))
ApprovalStatusList.push(new ApprovalStatus({ id: '99', code: '差し戻し' }))

class Approval {
  constructor(init) {
    const { v4: uuid } = require('uuid')
    this.approvalId = uuid()
    this.contractId = init.contractId
    this.approver = init.approver
    this.request = init.request
    this.message = init.message
    this.status = init.status
    this.prev = null
    this.next = null
    this.approvalDate = null
  }
}
