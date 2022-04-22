const TaxSubTotal = require('./TaxSubTotal')

class TaxTotal {
  constructor(taxTotal) {
    this.taxAmount = taxTotal.TaxAmount.value
    this.taxSubtotal = []
    for (const taxSubtotal of taxTotal.TaxSubtotal) {
      this.taxSubtotal.push(new TaxSubTotal(taxSubtotal))
    }
  }
}

module.exports = TaxTotal
