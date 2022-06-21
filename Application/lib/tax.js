const taxDatabase = [
  { type: 'tax10p', taxRate: 0.1 },
  { type: 'tax8p', taxRate: 0.08 }
]

/**
 * 消費税区名分取得
 *
 * @param {string} taxType 消費税区分文字列
 * @returns {string} 消費税区名 (日本語)
 */
const getTaxNameByType = (taxType) => {
  switch (taxType) {
    case 'tax10p':
      return '消費税 10%'
    case 'tax8p':
      return '消費税 8%'
    case 'nonTaxable':
      return '非課税'
    case 'untaxable':
      return '不課税'
    case 'taxExemption':
      return '免税'
    case 'otherTax':
      return 'その他の消費税'
    default:
      return ''
  }
}

/**
 * 消費税区分文字列分取得
 *
 * @param {string} taxName 消費税区名 (日本語)
 * @returns {string} 消費税区分文字列
 */
const getTaxTypeByName = (taxName) => {
  switch (taxName) {
    case '消費税':
      return 'tax10p'
    case '軽減税率':
      return 'tax8p'
    case '非課税':
      return 'nonTaxable'
    case '不課税':
      return 'untaxable'
    case '免税':
      return 'taxExemption'
    case 'その他の消費税':
      return 'otherTax'
    default:
      return ''
  }
}

const getTotal = (lines, taxDatabase) => {
  let total = 0

  lines.forEach((line) => {
    let taxRate = 0
    const taxInfo = taxDatabase.find((tax) => tax.type === line.taxType)
    if (taxInfo) taxRate = taxInfo.taxRate
    total += Math.floor(line.unitPrice * line.quantity * (1 + taxRate))
  })

  return total
}

module.exports = {
  taxDatabase,
  getTaxNameByType,
  getTaxTypeByName,
  getTotal
}
