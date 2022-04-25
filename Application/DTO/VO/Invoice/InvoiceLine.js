const TaxTotal = require('./TaxTotal')
const AllowanceCharge = require('./AllowanceCharge')
const DocumentReference = require('./DocumentReference')
const Price = require('./Price')
const Item = require('./Item')
const Coding = require('./Coding')

class InvoiceLine {
  constructor(invoiceLine, coding) {
    this.id = invoiceLine.ID.value
    this.invoicedQuantity = invoiceLine.InvoicedQuantity.value
    this.unitCode = invoiceLine.InvoicedQuantity.unitCode
    this.lineExtensionAmount = invoiceLine.LineExtensionAmount.value

    // 税
    this.taxTotal = []
    for (const taxTotal of invoiceLine.TaxTotal) {
      this.taxTotal.push(new TaxTotal(taxTotal))
    }

    // 割引か追加料金
    this.AllowanceCharge = []
    if (invoiceLine.AllowanceCharge) {
      for (const allowanceCharge of invoiceLine.AllowanceCharge) {
        this.AllowanceCharge.push(new AllowanceCharge(allowanceCharge))
      }
    }

    this.DocumentReference = []
    if (invoiceLine.DocumentReference) {
      for (const documentReference of invoiceLine.DocumentReference) {
        this.DocumentReference.push(new DocumentReference(documentReference))
      }
    }

    // 明細
    this.item = new Item(invoiceLine.Item)
    // 明細-単価（割引や追加料金などがない場合）
    this.Price = new Price(invoiceLine.Price)

    // 仕訳情報
    this.setCoding(coding)
  }

  setCoding(codings) {
    this.coding = []
    for (const coding of codings) {
      if (coding.lineNo === Number(this.id)) {
        this.coding.push(new Coding(coding, this))
      }
    }
  }
}

module.exports = InvoiceLine
