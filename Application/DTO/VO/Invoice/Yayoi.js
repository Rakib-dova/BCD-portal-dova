class Yayoi {
  constructor(mainBodyPartsFlag, coding) {
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
    this.type = '0'
    this.resource = ''
    this.codingMemo = ''
    this.note1 = ''
    this.note2 = ''
    this.coordinate = 'no'
  }

  getTaxCategory(accountName, taxCategory, isCredit) {
    let categoryNumber = 2

    switch (taxCategory) {
      case 'JP 消費税 10%':
        categoryNumber = 0
        break
      case 'JP 消費税(軽減税率) 8%':
        categoryNumber = 1
        break
      default:
        categoryNumber = 2
    }

    const debitTaxCategory = ['課税売上込10%', '課税売上込軽減8%', '対象外']
    const creditTaxCategory = ['課対仕入込10%', '課対仕入込軽減8%', '対象外']

    if (isCredit) {
      return creditTaxCategory[categoryNumber]
    } else {
      return debitTaxCategory[categoryNumber]
    }
  }
}

module.exports = Yayoi
