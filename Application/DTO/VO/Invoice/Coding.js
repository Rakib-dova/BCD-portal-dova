class Coding {
  constructor(journalInvoice, invoiceLIne) {
    this.id = Number(journalInvoice.journalNo.replace(/[^\d]/g, ''))
    this.debitAccountName = journalInvoice.accountName
    this.debitAccountCode = journalInvoice.accountCode
    this.debitSubAccountName = journalInvoice.subAccountName
    this.debitSubAccountCode = journalInvoice.subAccountCode
    this.debitDepartmentName = journalInvoice.departmentName
    this.debitDepartmentCode = journalInvoice.departmentCode
    this.debitTaxCategory = invoiceLIne.taxTotal[0].taxSubtotal[0].taxCategory.name
    this.debitAmount = journalInvoice.installmentAmount
    this.debitTaxAmount = Math.ceil(
      journalInvoice.installmentAmount * (invoiceLIne.taxTotal[0].taxSubtotal[0].taxCategory.percent / 100)
    )
    this.creditAccountName = journalInvoice.creditAccountName
    this.creditAccountCode = journalInvoice.creditAccountCode
    this.creditSubAccountName = journalInvoice.creditSubAccountName
    this.creditSubAccountCode = journalInvoice.creditSubAccountCode
    this.creditDepartmentName = journalInvoice.creditDepartmentName
    this.creditDepartmentCode = journalInvoice.creditDepartmentCode
    this.creditTaxCategory = invoiceLIne.taxTotal[0].taxSubtotal[0].taxCategory.name
    this.creditAmount = journalInvoice.installmentAmount
    this.creditTaxAmount = Math.ceil(
      journalInvoice.installmentAmount * (invoiceLIne.taxTotal[0].taxSubtotal[0].taxCategory.percent / 100)
    )
  }
}

module.exports = Coding
