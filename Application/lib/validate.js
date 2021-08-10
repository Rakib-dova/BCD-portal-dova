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
  isStatusForSimpleChange: isStatusForSimpleChange
}
