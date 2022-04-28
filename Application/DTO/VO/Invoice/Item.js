class Item {
  constructor(item) {
    // 明細の内容
    this.description = item.Description[0].value
    this.name = item.Name.value
    // 明細の項目ID
    this.sellersItemIdentification = item.SellersItemIdentification.ID.value
  }
}

module.exports = Item
