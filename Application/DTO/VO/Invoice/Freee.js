class Freee {
  constructor(header, voucherNo, invoice, coding, debitTaxCategory, creditTaxCategory) {
    // ヘッダー情報
    this.header = '[明細行]'
    this.date = ''
    this.no = voucherNo
    this.settlementJournal = ''
    // 明細情報・借方
    this.debitAccount = coding.debitAccountName
    this.debitAccountCode = coding.debitAccountCode
    this.debitSubAccount = coding.debitSubAccountName
    this.debitDepartment = coding.debitDepartmentName
    this.debitAmount = coding.debitAmount
    ;[this.debitTaxCode, this.debitTaxAmount] = debitTaxCategory(coding.creditTaxCategory, coding.debitAmount)
    // 明細情報・貸方
    this.creditAccount = coding.creditAccountName
    this.creditAccountCode = coding.creditAccountCode
    this.creditSubAccount = coding.creditSubAccountName
    this.creditDepartment = coding.creditDepartmentName
    this.creditAmount = coding.creditAmount
    ;[this.creditTaxCode, this.creditTaxAmount] = creditTaxCategory(coding.creditTaxCategory, coding.creditAmount)
    this.none = ''
  }
}

module.exports = Freee
