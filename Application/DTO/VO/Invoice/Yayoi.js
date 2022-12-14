class Yayoi {
  constructor(mainBodyPartsFlag, coding, convertDebitTaxCategory, convertCreditTaxCategory) {
    this.convertDebitTaxCategory = convertDebitTaxCategory
    this.convertCreditTaxCategory = convertCreditTaxCategory
    this.header = mainBodyPartsFlag
    this.voucherNo = ''
    this.isClosing = ''
    this.actualDeliveryDate = ''
    this.debitAccountName = coding.debitAccountName
    this.debitAccountCode = coding.debitAccountCode
    this.debitSubAccountName = coding.debitSubAccountName
    this.debitSubAccountCode = coding.debitSubAccountCode
    this.debitDepartMent = coding.debitDepartmentName
    this.debitDepartMentCode = coding.debitDepartmentCode
    this.debitTax = this.getTaxCategory(coding.debitAccountName, coding.creditTaxCategory, 0)
    this.debitAmount = coding.debitAmount
    this.debitTaxAmount = coding.debitTaxAmount
    this.creditAccountName = coding.creditAccountName
    this.creditAccountCode = coding.creditAccountCode
    this.creditSubAccountName = coding.creditSubAccountName
    this.creditSubAccountCode = coding.creditSubAccountCode
    this.creditDepartMent = coding.creditDepartmentName
    this.creditDepartMentCode = coding.creditDepartmentCode
    this.creditTax = this.getTaxCategory(coding.creditAccountName, coding.creditTaxCategory, 1)
    this.creditAmount = coding.creditAmount
    this.creditTaxAmount = coding.creditTaxAmount
    this.scrip = ''
    this.checkNo = ''
    this.paymentDueDate = ''
    this.type = '3'
    this.resource = ''
    this.codingMemo = ''
    this.note1 = ''
    this.note2 = ''
    this.coordinate = 'no'
  }

  getTaxCategory(accountName, taxCategory, isCredit) {
    if (isCredit) {
      return this.convertCreditTaxCategory(taxCategory)
    } else {
      return this.convertDebitTaxCategory(taxCategory)
    }
  }
}

module.exports = Yayoi
