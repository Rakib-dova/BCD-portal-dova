'use strict'

/**
 * 配列の最初の truthy な要素を返す
 */
const first = (array) => array.find((e) => e)

/**
 * 配列の最初の truthy な要素をOBC日付形式(yyyy/mm/dd)からTradeshiftの形式(yyyy-mm-dd)に変換して返す
 */
const forDate = (values) => {
  return first(values)?.replace(/\//g, '-')
}

/**
 * 配列の最初の truthy な要素を整数に変換して返す
 */
const forInteger = (values) => {
  let result = Number.parseInt(first(values))
  return Number.isNaN(result) ? null : result
}

/**
 * 配列の最初の truthy な要素を符号を逆転した整数に変換して返す
 */
const forInverseInteger = (values) => {
  let result = Number.parseInt(first(values))
  return Number.isNaN(result) ? null : -result
}

/**
 * 配列の最初の truthy な要素が正の数の場合に true を返す
 */
const isPositive = (values) => {
  let result = Number.parseInt(first(values))
  return Number.isNaN(result) ? null : result > 0
}

/**
 * 配列の最初の truthy な要素が'軽'の場合に true を返す
 */
const forTaxType = (values) => {
  return first(values) == '軽'
}

/**
 * 配列の最初の truthy な要素に応じた AccountTypeCode を返す
 *  '当座預金': 'Current'
 *  '普通預金': 'General'
 */
const forAccountTypeCode = (values) => {
  return {
    当座預金: 'Current',
    普通預金: 'General'
  }[first(values)]
}

module.exports = {
  forString: first,
  forDate,
  forInteger,
  forInverseInteger,
  isPositive,
  forTaxType,
  forAccountTypeCode
}
