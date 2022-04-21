class Item {
  setItem(_item) {
    const item = new Item()

    // 明細-内容
    item.Description = _item?.Description?.value ?? null
    // 明細-詳細
    item.ModelName = _item?.ModelName?.value ?? null
    // 明細-発注者品番
    item.BuyersItemIdentification = _item?.BuyersItemIdentification?.ID?.value ?? null
    // 明細-EAN/GTIN
    item.StandardItemIdentification = _item?.StandardItemIdentification?.ID?.value ?? null
    // 明細-HSN/SAC区分
    item.AdditionalItemIdentification = _item?.AdditionalItemIdentification[0]?.ID.value ?? null
    // 明細-HSN/SACの値
    item.AdditionalItemIdentificationSchemeID = _item?.AdditionalItemIdentification[0]?.ID.schemeID ?? null
    // 明細-原産国
    item.OriginCountry = _item?.OriginCountry?.Name?.value ?? null
    // 明細-商品分類コード: ECCN
    item.CommodityClassification = _item?.CommodityClassification[0]?.ItemClassificationCode?.value ?? null
    // 明細-メーカー名
    item.ManufacturerParty = _item?.ManufacturerParty[0]?.PartyName[0]?.Name?.value ?? null
    // 明細-シリアルナンバー
    item.ItemInstance = _item?.ItemInstance[0]?.SerialID?.value ?? null

    return item
  }
}

module.exports = Item
