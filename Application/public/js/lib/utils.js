// eslint-disable-next-line no-unused-vars
const taxDatabase = [
  { type: 'tax10p', taxRate: 0.1 },
  { type: 'tax8p', taxRate: 0.08 }
]

// eslint-disable-next-line no-unused-vars
const $ = function (tagObjName) {
  const classNamePattern = '\\.+[a-zA-Z0-9]'
  const idNamePatten = '\\#+[a-zA-Z0-9]'
  const classNameReg = new RegExp(classNamePattern)
  const idNameReg = new RegExp(idNamePatten)
  let selectors
  if (classNameReg.test(tagObjName)) {
    selectors = document.querySelectorAll(tagObjName)
  } else if (idNameReg.test(tagObjName)) {
    selectors = document.querySelectorAll(tagObjName)[0]
    if (selectors === undefined) return null
  } else {
    return null
  }
  return Object.assign(selectors, Array.prototype, (type, event) => {
    document.addEventListener(type, event)
  })
}

// eslint-disable-next-line no-unused-vars
function addEvent(node, type, callback) {
  if (node.addEventListener) {
    node.addEventListener(
      type,
      (e) => {
        callback(e, e.target)
      },
      false
    )
  } else if (node.attachEvent) {
    node.attachEvent('on' + type, function (e) {
      callback(e, e.srcElement)
    })
  }
}

/**
 * 消費税区名分取得
 *
 * @param {string} taxType 消費税区分文字列
 * @returns {string} 消費税区名 (日本語)
 */
// eslint-disable-next-line no-unused-vars
function getTaxTypeName(taxType) {
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

// eslint-disable-next-line no-unused-vars
function getSubTotal(lines) {
  let total = 0
  lines.forEach((line) => total += Math.floor(line.unitPrice * line.quantity)) // eslint-disable-line
  return total
}

// eslint-disable-next-line no-unused-vars
function getTaxGroups(lines, taxDatabase) {
  const taxGroups = []

  taxDatabase.forEach((tax) => {
    const taxGroup = { type: tax.type, subTotal: 0, taxGroupTotal: 0 }

    lines.forEach((line) => {
      if (line.taxType === tax.type) {
        taxGroup.subTotal += Math.floor(line.unitPrice * line.quantity)
        taxGroup.taxGroupTotal += Math.floor(line.unitPrice * line.quantity * tax.taxRate)
      }
    })

    if (!taxGroup.subTotal) return

    taxGroups.push(taxGroup)
  })

  return taxGroups
}

// eslint-disable-next-line no-unused-vars
function getTaxTotal(taxGroups) {
  let taxTotal = 0
  taxGroups.forEach((taxGroup) => taxTotal += taxGroup.taxGroupTotal) // eslint-disable-line
  return taxTotal
}

// eslint-disable-next-line no-unused-vars
const formatDate = (date, format) => {
  format = format.replace(/YYYY/, date.getFullYear())
  format = format.replace(/MM/, date.getMonth() + 1)
  format = format.replace(/DD/, date.getDate())
  return format
}

// eslint-disable-next-line no-unused-vars
const isNumberString = n => typeof n === 'string' && n !== '' && !isNaN(n)