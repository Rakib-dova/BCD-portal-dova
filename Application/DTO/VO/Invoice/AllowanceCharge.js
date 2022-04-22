const TaxCategory = require('./TaxCategory')

class AllowanceCharge {
  constructor(allowanceCharge) {
    // 割引idx-内容
    this.AllowanceChargeReason = allowanceCharge.AllowanceChargeReason?.value ?? null
    // 割引idx-単位
    this.MultiplierFactorNumeric = allowanceCharge.MultiplierFactorNumeric?.value ?? null
    // 割引1-税（消費税／軽減税率／不課税／免税／非課税）
    this.TaxCategory = new TaxCategory(allowanceCharge.TaxCategory)
    // 割引idx-小計（税抜）
    this.Amount = allowanceCharge.Amount?.value ?? null
  }
}

module.exports = AllowanceCharge
