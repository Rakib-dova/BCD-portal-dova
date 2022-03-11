'use strict'

const DAO = require('./DAO')

class ApprovalDAO extends DAO {
  constructor(contractId) {
    super()
    this.contractId = contractId
    this.Op = this.DTO.Sequelize.Op
    this.DTO = this.DTO.Approval
    this.approveStatusDAO = require('./ApproveStatusDAO')
  }

  async getApprovals() {
    const approvals = await this.DTO.findAll({
      order: [['approvedAt', 'DESC']]
    })
    return approvals
  }

  async getWaitingApprovals() {
    const workflowDone = await this.approveStatusDAO.getStautsCode('最終承認済み')
    const rejectWorkflow = await this.approveStatusDAO.getStautsCode('差し戻し')
    const approvals = await this.DTO.findAll({
      where: {
        approveStatus: {
          [this.Op.notIn]: [workflowDone, rejectWorkflow]
        }
      },
      order: [['approvedAt', 'DESC']]
    })
    return approvals
  }
}

module.exports = ApprovalDAO
