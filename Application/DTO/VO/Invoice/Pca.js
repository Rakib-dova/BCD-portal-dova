class Pca {
  constructor(mainBodyPartsFlag, coding, convertDebitTaxCategory, convertCreditTaxCategory) {
    this.convertDebitTaxCategory = convertDebitTaxCategory
    this.convertCreditTaxCategory = convertCreditTaxCategory
    this.debitTax = this.getTax(coding.creditTaxCategory, coding.debitAmount, 0)
    this.creditTax = this.getTax(coding.creditTaxCategory, coding.creditAmount, 1)

    // 区切
    this.header = mainBodyPartsFlag
    // ヘッダー情報
    this.date = ''
    this.no = '00001'
    this.voucherType = '21'
    this.codingType = '0'
    // 明細情報・借方
    this.debitDepartmentCode = coding.debitDepartmentCode
    this.debitAccountCode = coding.debitAccountCode
    this.debitSubAccountCode = coding.debitSubAccountCode
    this.debitTaxCode = this.debitTax[0]
    this.debitTaxAutomaticCalc = '1'
    this.debitAmount = coding.debitAmount
    this.debitTaxAmount = this.debitTax[1]
    // 明細情報・貸方
    this.creditDepartmentCode = coding.creditDepartmentCode
    this.creditAccountCode = coding.creditAccountCode
    this.creditSubAccountCode = coding.creditSubAccountCode
    this.creditTaxCode = this.creditTax[0]
    this.creditTaxAutomaticCalc = '1'
    this.creditAmount = coding.creditAmount
    this.creditTaxAmount = this.creditTax[0]
    // Etc
    this.inputProgType = '1'
  }

  getTax(taxCategory, amount, isCredit) {
    if (isCredit) {
      return this.convertCreditTaxCategory(taxCategory, amount)
    } else {
      return this.convertDebitTaxCategory(taxCategory, amount)
    }
  }
}

module.exports = Pca
