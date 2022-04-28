class Obc {
  constructor(mainBodyPartsFlag, coding, convertDebitTaxCategory, convertCreditTaxCategory) {
    this.convertDebitTaxCategory = convertDebitTaxCategory
    this.convertCreditTaxCategory = convertCreditTaxCategory
    this.debitTax = this.getTax(coding.creditTaxCategory, 0)
    this.creditTax = this.getTax(coding.creditTaxCategory, 1)

    // 区切
    this.header = mainBodyPartsFlag
    // ヘッダー情報
    this.date = ''
    this.codingType = ''
    this.no = ''
    this.voucherType = ''
    this.voucherRecord = ''
    this.departmentSelectorType = '1'
    this.voucherDeparment = ''
    this.voucherInputType = '0'
    // 明細情報・借方
    this.debitDepartMentCode = coding.debitDepartmentCode
    this.debitAccountCode = coding.debitAccountCode
    this.debitSubAccountCode = coding.debitSubAccountCode
    this.debitTaxCode = this.debitTax[0]
    this.debitTaxPercent = this.debitTax[1]
    this.debitTaxPercentType = this.debitTax[2]
    this.debitIndustrialClass = ''
    this.debitRouting = ''
    this.debitContact = ''
    this.debitAmount = coding.debitAmount
    this.debitTaxAmount = coding.debitTaxAmount
    // 明細情報・貸方
    this.creditDepartMentCode = coding.creditDepartmentCode
    this.creditAccountCode = coding.creditAccountCode
    this.creditSubAccountCode = coding.creditSubAccountCode
    this.creditTaxCode = this.creditTax[0]
    this.creditTaxPercent = this.creditTax[1]
    this.creditTaxPercentType = this.creditTax[2]
    this.creditIndustrialClass = ''
    this.creditRouting = ''
    this.creditContact = ''
    this.creditAmount = coding.creditAmount
    this.creditTaxAmount = coding.creditTaxAmount
    // 摘要など
    this.detail = ''
    this.stickyNoteColor = ''
    this.stickyNote = ''
  }

  getTax(taxCategory, isCredit) {
    if (isCredit) {
      return this.convertCreditTaxCategory(taxCategory)
    } else {
      return this.convertDebitTaxCategory(taxCategory)
    }
  }
}

module.exports = Obc
