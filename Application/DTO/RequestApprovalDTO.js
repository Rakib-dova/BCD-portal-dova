'use strict'

class RequestApprovalDTO {
  constructor(contractId) {
    this.requestApprovalDAO = new (require('../DAO/RequestApprovalDAO'))(contractId)
    this.approvalDAO = new (require('../DAO/ApprovalDAO'))(contractId)
  }

  /**
   * ユーザーが依頼した請求書を検索
   * @param {uuid} userId ユーザーの識別番号
   * @returns {array<promise<Model>>} 依頼した請求書リスト
   */
  async getRequestApproval(userId) {
    const requestApprovals = await this.requestApprovalDAO.getAllRequestApproval()
    const myRequestApprovals = []
    const workflowDone = await this.requestApprovalDAO.getWorkflowStatusCode('最終承認済み')
    const rejectWorkflow = await this.requestApprovalDAO.getWorkflowStatusCode('差し戻し')
    const preWorkflow = await this.requestApprovalDAO.getWorkflowStatusCode('未処理')
    requestApprovals.forEach((requestApproval) => {
      let isWorkflowStatus = false
      switch (requestApproval.status) {
        case workflowDone:
        case rejectWorkflow:
        case preWorkflow:
          isWorkflowStatus = false
          break
        default:
          isWorkflowStatus = true
          break
      }
      if (requestApproval.requester === userId && isWorkflowStatus) myRequestApprovals.push(requestApproval)
    })
    return myRequestApprovals
  }

  /**
   * ユーザーに届いたすぐ決済する支払依頼請求書検索
   * @param {uuid} userId ユーザーの識別番号
   * @returns {array<promise<Model>>} 自分に届いた支払依頼リスト
   */
  async getApproval(userId) {
    const waitingApprovals = await this.approvalDAO.getWaitingApprovals()
    const isMineApproval = []

    waitingApprovals.forEach((approval) => {
      const approverCnt = approval.approveUserCount
      const status = ~~approval.approveStatus
      const userNo = status - 9
      if (approverCnt === userNo) {
        if (approval.approveUserLast === userId) {
          isMineApproval.push(approval)
        }
      }
      const waitingApprover = approval[`approveUser${userNo}`]
      const approvedAt = approval[`approvalAt${userNo}`]
      if (waitingApprover === userId && approvedAt === null) {
        isMineApproval.push(approval)
      }
    })

    return isMineApproval
  }

  /**
   * 自分の支払依頼とすぐ決裁する必要がある請求書を検索する。
   * @param {uuid} userId ユーザーの識別番号
   * @returns {array<WaitingWorkflow>} 「承認待ち」のリスト
   */
  async getWaitingWorkflowisMine(userId) {
    const myRequestApprovals = await this.getRequestApproval(userId)
    const waitingApprovalsMe = await this.getApproval(userId)

    const WaitingWorkflow = require('./VO/WaitingWorkflow')
    const waitingWorkflows = []
    myRequestApprovals.forEach((requestApproval) => {
      const workflow = new WaitingWorkflow()
      workflow.convertRequestApprovalToWorkflow(requestApproval)
      waitingWorkflows.push(workflow)
    })
    waitingApprovalsMe.forEach((approval) => {
      const workflow = new WaitingWorkflow()
      workflow.convertApprovalToWorkflow(approval)
      waitingWorkflows.push(workflow)
    })

    for (let idx = 0; idx < waitingWorkflows.length; idx++) {
      const document = await this.tradeshiftDTO.findDocuments(waitingWorkflows[idx].documentId)
      waitingWorkflows[idx].setDocument(document)
    }

    return waitingWorkflows
  }

  setTradeshiftDTO(tradeshiftDTO) {
    this.tradeshiftDTO = tradeshiftDTO
  }
}

module.exports = RequestApprovalDTO
