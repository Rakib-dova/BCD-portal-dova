class LegalMonetaryTotal {
  constructor(legalMonetaryTotal) {
    this.lineExtensionAmount = legalMonetaryTotal.LineExtensionAmount.value
    this.TaxExclusiveAmount = legalMonetaryTotal.TaxExclusiveAmount.value
    this.TaxInclusiveAmount = legalMonetaryTotal.TaxInclusiveAmount.value
    this.PayableAmount = legalMonetaryTotal.PayableAmount.value
  }
}

module.exports = LegalMonetaryTotal
