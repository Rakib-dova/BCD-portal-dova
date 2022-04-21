class Coding {
  constructor(jouranlInvoice) {
    this.id = Number(jouranlInvoice.journalNo.replace(/[^\d]/g, ''))
    this.accountName = jouranlInvoice.accountName
    this.accountCode = jouranlInvoice.accountCode
    this.subAccountName = jouranlInvoice.subAccountName
    this.subAccountCode = jouranlInvoice.subAccountCode
    this.departmentName = jouranlInvoice.departmentName
    this.departmentCode = jouranlInvoice.departmentCode
    this.creditAccountName = jouranlInvoice.creditAccountName
    this.creditAccountCode = jouranlInvoice.creditAccountCode
    this.creditSubAccountName = jouranlInvoice.creditSubAccountName
    this.creditSubAccountCode = jouranlInvoice.creditSubAccountCode
    this.creditDepartmentName = jouranlInvoice.creditDepartmentName
    this.creditDepartmentCode = jouranlInvoice.creditDepartmentCode
  }
}

module.exports = Coding
