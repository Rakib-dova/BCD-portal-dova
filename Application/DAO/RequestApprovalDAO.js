'use strict'
const DAO = require('./DAO')
const ApproveStatusDAO = require('./ApproveStatusDAO')
class RequestApprovalDAO extends DAO {
  constructor(contractId) {
    super()
    this.requestApprovalDTO = this.DTO.RequestApproval
    this.contractId = contractId
    this.approveStatusDAO = ApproveStatusDAO
    this.DTO = this.DTO.RequestApproval
  }

  // StatusCodeあり。
  async getRequestApproval(invoiceId, statusCode) {
    const requestApproval = await this.DTO.findOne({
      where: {
        contractId: this.contractId,
        invoiceId: invoiceId,
        status: statusCode
      },
      order: [['create', 'DESC']]
    })
    return requestApproval
  }

  // StatusCodeなし。
  async getRequestApprovalFromInvoice(invoiceId) {
    const requestApproval = await this.DTO.findOne({
      where: {
        contractId: this.contractId,
        invoiceId: invoiceId
      },
      order: [['create', 'DESC']]
    })
    return requestApproval
  }

  async getAllRequestApproval() {
    const allRequestApproval = await this.DTO.findAll({
      order: [['create', 'DESC']]
    })
    return allRequestApproval
  }

  async getpreWorkflowRequestApproval(invoiceId) {
    const preWorkflowStatusCode = await this.getWorkflowStatusCode('未処理')
    const requstApproval = await this.getRequestApproval(invoiceId, preWorkflowStatusCode)
    return requstApproval
  }

  async createRequestApproval(requester, invoiceId, approveRouteId, status, message) {
    const createRequestApproval = this.DTO.build({
      contractId: this.contractId,
      requester,
      invoiceId,
      approveRouteId,
      status: status,
      message,
      isSaved: true
    })
    return createRequestApproval
  }

  async getWorkflowStatusCode(name) {
    const statusCode = await this.approveStatusDAO.getStautsCode(name)
    return statusCode
  }

  async updateRequestApproval(requestApproval, requester, approverRouteId, status, message) {
    requestApproval.requester = requester
    requestApproval.approveRouteId = approverRouteId
    requestApproval.status = status
    requestApproval.message = message
    requestApproval.isSaved = true
    return requestApproval
  }

  async saveRequestApproval(requestApproval) {
    return await requestApproval.save()
  }
}

module.exports = RequestApprovalDAO
