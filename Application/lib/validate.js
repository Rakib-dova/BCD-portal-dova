// See https://qiita.com/standard-software/items/0b2617062b2e4c7f1abb
const constantsDefine = require('../constants')

const assert = function (value, message) {
  if (typeof message === 'undefined' || message === null) {
    message = ''
  }
  if (value !== true) {
    throw new Error(message)
  }
}

const isArray = function (value) {
  return Object.prototype.toString.call(value) === '[object Array]'
}

const isType = function (checkFunc, argsArray) {
  assert(arguments.length >= 1)
  assert(typeof checkFunc === 'function')
  assert(isArray(argsArray))

  const l = argsArray.length
  if (l === 0) {
    return false
  }
  if (l === 1) {
    return checkFunc(argsArray[0])
  }
  for (let i = 0; i < l; i += 1) {
    if (!checkFunc(argsArray[i])) {
      return false
    }
  }
  return true
}

const arrayFrom = function (argsObj) {
  return Array.prototype.slice.call(argsObj)
}

const isNumber = function (value) {
  return typeof value === 'number' && isFinite(value)
}

const isInt = function (value) {
  if (!isNumber(value)) {
    return false
  }
  return Math.round(value) === value
}

const isInts = function (value) {
  return isType(isInt, arrayFrom(arguments))
}

const isString = function (value) {
  return typeof value === 'string'
}

const isStrings = function (value) {
  return isType(isString, arrayFrom(arguments))
}

const isFunction = function (value) {
  return typeof value === 'function'
}

// ----
const isUUID = (uuid) => {
  if (!isString(uuid)) return false
  const index = [/^[0-9a-f]{8}-?[0-9a-f]{4}-?[1-5][0-9a-f]{3}-?[89ab][0-9a-f]{3}-?[0-9a-f]{12}$/i].findIndex((x) =>
    x.test(uuid)
  )
  if (index < 0) return false
  else return true
}

const isUndefined = (target) => {
  if (Object.prototype.toString.call(target) !== '[object Undefined]') {
    return true
  }

  return false
}

const isPostalNumber = (postalNumber) => {
  const pattern = '^[0-9]{7}$'
  const regex = new RegExp(pattern)

  // test()結果はtrue又はfalseになる。
  return regex.test(postalNumber)
}

const isTenantManager = function (userRole, deleteFlag) {
  if (userRole !== constantsDefine.userRoleConstants.tenantManager && !deleteFlag) {
    return false
  }
  return true
}

const isStatusForRegister = function (contractStatus, deleteFlag) {
  if (
    (contractStatus === constantsDefine.statusConstants.contractStatusNewContractOrder ||
      contractStatus === constantsDefine.statusConstants.contractStatusNewContractReceive) &&
    !deleteFlag
  ) {
    return false
  }
  return true
}

const isStatusForCancel = function (contractStatus, deleteFlag) {
  if (
    (contractStatus === constantsDefine.statusConstants.contractStatusCancellationOrder ||
      contractStatus === constantsDefine.statusConstants.contractStatusCancellationReceive) &&
    !deleteFlag
  ) {
    return false
  }
  return true
}

const isStatusForSimpleChange = function (contractStatus, deleteFlag) {
  if (
    (contractStatus === constantsDefine.statusConstants.contractStatusSimpleChangeContractOrder ||
      contractStatus === constantsDefine.statusConstants.contractStatusSimpleChangeContractReceive) &&
    !deleteFlag
  ) {
    return false
  }
  return true
}

// CSVファイルのバリデーションチェック（現在行～）
const isInvoiceId = function (invoiceId) {
  if (invoiceId.length > constantsDefine.invoiceValidDefine.INVOICEID_VALUE || invoiceId.length < 1) {
    return 'INVOICEIDERR000'
  }

  return ''
}

const isBankName = function (bankName) {
  if (bankName.length > constantsDefine.invoiceValidDefine.BANKNAME_VALUE || bankName.length < 1) {
    return 'BANKNAMEERR000'
  }

  return ''
}

const isTaxCategori = function (category) {
  const taxCategory = require('./bconCsvTax')

  if (
    taxCategory.length > constantsDefine.invoiceValidDefine.TAX_VALUE ||
    taxCategory.length < 1 ||
    !taxCategory[category]
  ) {
    return 'TAXERR000'
  }

  return ''
}

const isUnitcode = function (unitCode) {
  const unitcodeCategory = require('./bconCsvUnitcode')

  if (unitCode.length < 1 || !unitcodeCategory[unitCode]) {
    return 'UNITERR000'
  }

  return ''
}

const checkNetworkConnection = function (companyNetworkConnectionList, targetConnectionId) {
  let connectionFlag = false
  try {
    companyNetworkConnectionList.forEach((connectionId) => {
      if (targetConnectionId === connectionId) {
        connectionFlag = true
      }
    })
  } catch (error) {
    return 'INTERNALERR000'
  }

  if (!connectionFlag) {
    return 'NETERR000'
  }
  return ''
}

module.exports = {
  isArray: isArray,
  isNumber: isNumber,
  isInt: isInt,
  isInts: isInts,
  isString: isString,
  isStrings: isStrings,
  isFunction: isFunction,
  isUUID: isUUID,
  isPostalNumber: isPostalNumber,
  isTenantManager: isTenantManager,
  isStatusForRegister: isStatusForRegister,
  isStatusForCancel: isStatusForCancel,
  isStatusForSimpleChange: isStatusForSimpleChange,
  isInvoiceId: isInvoiceId,
  isBankName: isBankName,
  isTaxCategori: isTaxCategori,
  isUnitcode: isUnitcode,
  checkNetworkConnection: checkNetworkConnection,
  isUndefined: isUndefined
}
