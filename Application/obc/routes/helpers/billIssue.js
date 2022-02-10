'use strict'
const Parser = require('./parser')
const mapping = require('./mapping')
const { condition } = require('./util')
require('date-utils')

const requiredItems = ['SD5010000', 'SD5013002', 'SD5014004', 'SD5014022', 'SD5019003']

/**
 * mapping構造と必須項目から重複を除いたsrc要素を配列で返す
 */
const listItem = (mapping) => {
  let items = new Set(requiredItems)
  let extract = (item) => {
    if (item.items) {
      item.items.map(extract)
    } else if (Array.isArray(item.src)) {
      for (let value of item.src) {
        items.add(value)
      }
    } else {
      items.add(item.src)
    }
  }
  mapping.map(extract)
  return [...items].sort()
}

const itemList = listItem(mapping)

/**
 * 請求書取得のパラメタ設定
 */
const searchBody = (option) => {
  const addition = []
  // 請求No.範囲指定
  if (option.from) {
    addition.push(condition('SD5010016', 'ge', option.from))
  }
  if (option.to) {
    addition.push(condition('SD5010016', 'le', option.to))
  }
  // 請求No.直接指定
  if (option.invoiceIds) {
    addition.push({
      or: option.invoiceIds.map((id) => condition('SD5010016', 'eq', id))
    })
  }
  // 請求宛先コード直接指定
  if (option.customers) {
    addition.push({
      or: option.customers.map((id) => condition('SD5010003', 'eq', id))
    })
  }
  return {
    // 抽出条件
    filter: {
      and: [
        // 請求金額がある
        condition('SD5011054', 'ge', 0),
        // 未発行である
        condition('SD5011201', 'eq', '0'),
        ...addition
      ]
    },
    Breakdown: '1',
    EraIndication: 0,
    // 発行日
    billIssueDate: (option.issueDate ?? new Date()).toFormat('YYYY/MM/DD'),
    // 今回御請求額欄
    ThisTimeDemand: 1, // 1：今回御買上額
    // 締め情報の並び順条件
    sort: [
      'SD5010003' // 請求宛先コード
    ],
    // 売上/入金伝票の並び順条件
    slipSort: [
      'SD5012001', // 内訳コード
      'SD5014002', // 請求日付
      'SD5013001' // 伝票No
    ],
    // 取得したい項目
    itemList: option.noOnly ? ['SD5011002'] : itemList
  }
}

/**
 * OBC => Tradeshiftの項目マッピング定義を内部利用形式に変換する
 */
const convertMapping = (mapping, isEffective) => {
  let result = {}
  for (let entry of mapping) {
    if (entry.label && !isEffective(entry.key)) {
      continue
    }

    if (entry.items) {
      let prefix = entry.key
      for (let item of entry.items) {
        result[`${prefix}/${item.key}`] = item
      }
    } else {
      result[entry.key] = entry
    }
  }
  return result
}

/**
 * マッピング定義に従い値を解決する
 */
const resolveValue = (data, item) => {
  let values = Array.isArray(item.src) ? item.src.map((id) => data[id]) : [data[item.src]]
  let parse = item.cnv ?? Parser.forString
  return parse(values) ?? item.fallback
}

class OBCWrapper {
  constructor(data, mapping) {
    this.data = data
    this.mapping = mapping
    this.overrides = {}
  }

  /**
   * keyにマッピングされる値を返す
   */
  get(key) {
    if (this.overrides[key]) {
      return this.overrides[key]
    }

    let item = this.mapping[key]
    if (!item) {
      return null
    }

    return resolveValue(this.data, item)
  }

  /**
   * マッピング項目に優先するキーと値をまとめて設定する
   */
  bind(opt) {
    Object.assign(this.overrides, opt)
    return this
  }
}

class OBCInvoice extends OBCWrapper {
  constructor(entry, mapping) {
    super(entry.data, mapping)
    this.lines = entry.lines.map((e) => new OBCWrapper(e, mapping))
    this.discounts = entry.discounts.map((e) => new OBCWrapper(e, mapping))
    this.payments = entry.payments.map((e) => new OBCWrapper(e, mapping))
  }
}

/**
 * 請求書データを変換
 */
const build = (data) => {
  const newBill = () => {
    return {
      data: null,
      lines: [],
      discounts: [],
      payments: []
    }
  }

  let entries = mapping.filter((e) => e.attr)
  let result = []
  let bill = newBill()
  data.forEach((val) => {
    // 請求書区切り（SD5010000）毎にドキュメント作成
    if (val.SD5010000 === '*') {
      // 請求書区切り前のデータがある場合は新規ドキュメントとする
      if (bill.data) {
        // 明細が無ければ追加対象外
        if (bill.lines.length > 0) {
          result.push(bill)
        }
      }
      bill = newBill()
    }

    switch (val.SD5013002) {
      // 行属性（SD5013002）が「0：売上伝票明細(見出し)」
      case '0':
        // 売上区分が「売上」の場合
        if (val.SD5014004 === '売上') {
          if (val.SD5014022 === '0') {
            val.SD5014025 = '1'
            val.SD5014029 = val.SD5014031
          }
          bill.lines.push(val)
        }
        // 売上区分が「値引」の場合で金額あり
        else if (val.SD5014004 === '値引' && val.SD5014031 !== '') {
          bill.discounts.push(val)
        }
        break
      case '6':
        bill.data = val
        for (let entry of entries) {
          bill[entry.attr] = resolveValue(val, entry)
        }
        break
      case '7':
        if (val.SD5019003 === '銀行振込') {
          bill.payments.push(val)
        }
        break
    }
  })

  if (bill.data && bill.lines.length > 0) {
    result.push(bill)
  }

  return result
}

/**
 * 請求データから請求書番号を重複を省いて抽出する
 */
const extractIds = (data) => {
  return [...new Set(data.map((val) => val.SD5011002).filter((id) => id))].sort()
}

/**
 * 請求書データをbuild()で変換した結果にmapping項目を適用する関数を返す
 */
const converter = (isEffective) => {
  const map = convertMapping(mapping, isEffective)
  return (bill) => {
    return new OBCInvoice(bill, map)
  }
}

module.exports = {
  searchBody,
  build,
  extractIds,
  converter
}
