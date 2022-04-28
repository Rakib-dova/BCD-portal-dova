const TaxCategory = require('./TaxCategory')

class TaxSubTotal {
  constructor(taxSubtotal) {
    this.taxableAmount = taxSubtotal.TaxableAmount.value
    this.taxAmout = taxSubtotal.TaxAmount.value
    this.taxCategory = new TaxCategory(taxSubtotal.TaxCategory)
  }
}

module.exports = TaxSubTotal
