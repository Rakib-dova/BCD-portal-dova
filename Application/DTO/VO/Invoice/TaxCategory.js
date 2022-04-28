class TaxCategory {
  constructor(taxCategory) {
    this.id = taxCategory.ID.value
    this.percent = taxCategory.Percent.value
    this.taxScheme = taxCategory.TaxScheme.ID.value
    this.name = taxCategory.TaxScheme.Name.value
  }
}

module.exports = TaxCategory
