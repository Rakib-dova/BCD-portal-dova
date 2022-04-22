class Price {
  constructor(price) {
    this.priceAmount = price.PriceAmount.value
    this.baseQuantity = price.BaseQuantity.value
    this.unitCode = price.BaseQuantity.unitCode
    this.orderableUnitFactorRate = price.OrderableUnitFactorRate.value
  }
}

module.exports = Price
