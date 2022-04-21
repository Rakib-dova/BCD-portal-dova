class Yayoi {
  constructor(mainBodyPartsFlag, invoiceLine, coding) {
    this.header = mainBodyPartsFlag
    this.checksNo = ''
    this.isClosing = ''
    this.actualDeliveryDate = ''
    this.debitAccountName = coding.accountName
    this.debitAccountCode = coding.accountCode
    this.debitSubAccountName = coding.subAccountName
    this.debitSubAccountCode = coding.subAccountCode
    this.debitDepartMent = coding.departmentName
    this.debitDepartMentCode = coding.departmentCode
    this.debitTax = ''
    this.debitAmount = ''
    this.debitTaxAmount = ''
    this.creditAccountName = coding.creditAccountName
    this.creditAccountCode = coding.creditAccountCode
    this.creditSubAccountName = coding.creditSubAccountName
    this.creditSubAccountCode = coding.creditSubAccountCode
    this.creditDepartMent = coding.creditDepartmentName
    this.creditDepartMentCode = coding.creditDepartmentCode
    this.creditTax = ''
    this.creditAmount = ''
    this.creditTaxAmount = ''
    this.scrip = ''
    this.paymentDueDate = ''
    this.type = '0'
    this.resource = ''
    this.codingMemo = ''
    this.note1 = ''
    this.note2 = ''
    this.coordinate = 'no'
  }
}

module.exports = Yayoi
