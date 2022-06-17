class Ohken {
  constructor(invoiceNo, coding, convertDebitTaxCategory, convertCreditTaxCategory) {
    this.convertDebitTaxCategory = convertDebitTaxCategory
    this.convertCreditTaxCategory = convertCreditTaxCategory
    this.debitTax = this.getTax(coding.creditTaxCategory, coding.debitAmount, 0)
    this.creditTax = this.getTax(coding.creditTaxCategory, coding.creditAmount, 1)

    this.dateYear = ''
    this.dateMonth = ''
    this.dateDay = ''
    this.periodFlag = '1'
    this.voucherNo = invoiceNo
    this.voucherDepartmentCode = ''
    // 明細情報・借方
    this.debitDepartmentCode = coding.debitDepartmentCode
    this.debitAccountCode = coding.debitAccountCode.substr(0, 4)
    this.debitSubAccountCode = coding.debitSubAccountCode.substr(0, 4)
    this.debitTaxCode = this.debitTax[0]
    this.debitAmount = coding.debitAmount
    this.debitTaxAmount = this.debitTax[1]
    // 明細情報・貸方
    this.creditDepartmentCode = coding.creditDepartmentCode
    this.creditAccountCode = coding.creditAccountCode.substr(0, 4)
    this.creditSubAccountCode = coding.creditSubAccountCode.substr(0, 4)
    this.creditTaxCode = this.creditTax[0]
    this.creditAmount = coding.creditAmount
    this.creditTaxAmount = this.creditTax[1]
    // 摘要
    this.note = ''
  }

  getTax(taxCategory, amount, isCredit) {
    if (isCredit) {
      return this.convertCreditTaxCategory(taxCategory, amount)
    } else {
      return this.convertDebitTaxCategory(taxCategory, amount)
    }
  }
}

module.exports = Ohken
