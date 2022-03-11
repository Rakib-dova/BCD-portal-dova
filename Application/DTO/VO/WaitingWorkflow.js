class WaitingWorkflow {
  constructor() {
    this.documentId = ''
    this.invoiceNo = ''
    this.status = ''
    this.workflowStatus = ''
    this.curr = 'JPN'
    this.current = ''
    this.sendBy = ''
    this.sendTo = ''
    this.updatedAt = ''
    this.expire = ''
    this.createdAt = ''
  }

  convertRequestApprovalToWorkflow(requestApproval) {
    this.setWorkflowStatus(requestApproval.status)
    this.setCreatedAt(requestApproval.create)
  }

  convertApprovalToWorkflow(approval) {
    this.setWorkflowStatus(approval.approveStatus)
    this.setCreatedAt(approval.approvedAt)
  }

  setWorkflowStatus(code) {
    switch (code) {
      case '10':
        this.workflowStatus = '承認依頼中'
        break
      case '11':
        this.workflowStatus = '一次承認済み'
        break

      case '12':
        this.workflowStatus = '二次承認済み'
        break
      case '13':
        this.workflowStatus = '三次承認済み'
        break
      case '14':
        this.workflowStatus = '四次承認済み'
        break
      case '15':
        this.workflowStatus = '五次承認済み'
        break
      case '16':
        this.workflowStatus = '六次承認済み'
        break
      case '17':
        this.workflowStatus = '七次承認済み'
        break
      case '18':
        this.workflowStatus = '八次承認済み'
        break
      case '19':
        this.workflowStatus = '九次承認済み'
        break
      case '20':
        this.workflowStatus = '十次承認済み'
        break
    }
  }

  setCreatedAt(date) {
    if (date instanceof Date) {
      this.createdAt = date
    }
  }
}

module.exports = WaitingWorkflow
