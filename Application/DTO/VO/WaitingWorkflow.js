const processStatus = {
  PAID_CONFIRMED: 0, // 入金確認済み
  PAID_UNCONFIRMED: 1, // 送金済み
  ACCEPTED: 2, // 受理済み
  DELIVERED: 3 // 受信済み
}
const timeStamp = require('../../lib/utils').timestampForList
class WaitingWorkflow {
  constructor() {
    this.documentId = ''
    this.invoiceid = ''
    this.status = ''
    this.workflowStatus = ''
    this.currency = ''
    this.amount = ''
    this.sendBy = ''
    this.sendTo = ''
    this.updatedAt = '-'
    this.expire = '-'
    this.createdAt = ''
    this.processStatus = ''
  }

  convertRequestApprovalToWorkflow(requestApproval) {
    this.setDocumentId(requestApproval.invoiceId)
    this.setWorkflowStatus(requestApproval.status)
    this.setCreatedAt(requestApproval.create)
  }

  convertApprovalToWorkflow(approval) {
    this.setDocumentId(approval['RequestApproval.invoiceId'])
    this.setWorkflowStatus(approval.approveStatus)
    this.setCreatedAt(approval.approvedAt)
  }

  setDocumentId(documentId) {
    this.documentId = documentId
  }

  getDocumentId() {
    return this.documentId
  }

  setInvoiceId(invoiceid) {
    this.invoiceid = invoiceid
  }

  setStatus(status) {
    this.status = status
  }

  setSendBy(sendBy) {
    this.sendBy = sendBy
  }

  setSendTo(sendTo) {
    this.sendTo = sendTo
  }

  setUpdatedAt(updatedAt) {
    this.updatedAt = updatedAt
  }

  setExpire(expire) {
    this.expire = expire
  }

  setWorkflowStatus(code) {
    switch (code) {
      case '10':
        this.workflowStatus = '支払依頼中'
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

  setAmount(amount) {
    this.amount = amount
  }

  setCurrency(currency) {
    this.currency = currency
  }

  setDocument(document) {
    this.setInvoiceId(document.ID)
    this.setStatus(processStatus[document.UnifiedState])
    document.ItemInfos.forEach((item) => {
      switch (item.type) {
        case 'document.currency':
          this.setCurrency(item.value)
          break
        case 'document.total':
          this.setAmount(item.value.split('.')[0])
          break
      }
    })
    this.setSendBy(document.SenderCompanyName ?? '-')
    this.setSendTo(document.ReceiverCompanyName ?? '-')
    if (document.LastEdit) {
      this.setUpdatedAt(timeStamp(new Date(document.LastEdit)))
    }
    if (document.DueDate) {
      this.setExpire(timeStamp(new Date(document.DueDate)))
    }
  }
}

module.exports = WaitingWorkflow
