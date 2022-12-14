// See https://qiita.com/standard-software/items/0b2617062b2e4c7f1abb
const constantsDefine = require('../constants')
const contractStatuses = constantsDefine.statusConstants.contractStatuses

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
  if (Object.prototype.toString.call(target) === '[object Undefined]') {
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

const isNumberRegular = (regNumber) => {
  const isNumberPatten = '^[-]?[0-9]*(\\.?[0-9]*)$'
  const regex = new RegExp(isNumberPatten)

  // test()結果はtrue又はfalseになる。
  return regex.test(regNumber)
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

/**
 * デジトレ契約が解約手続き中か判定する
 * @param {*} contract デジトレ契約情報
 * @returns
 */
const isBcdCancelling = (bcdContract) => {
  // deleteFlag: false & 契約ステータスが解約着手待ち(30)or解約対応中(31) の場合
  if (
    !bcdContract.deleteFlag &&
    (bcdContract.contractStatus === contractStatuses.cancellationOrder ||
      bcdContract.contractStatus === contractStatuses.cancellationReceive)
  ) {
    return true
  } else {
    return false
  }
}

// CSVファイルのバリデーションチェック（現在行～）
// 請求書番号
const isInvoiceId = function (invoiceId) {
  // 値の存在有無確認
  if (invoiceId.length < 1) {
    return 'INVOICEIDERR002'
  }

  if (invoiceId.length > constantsDefine.invoiceValidDefine.INVOICEID_VALUE) {
    return 'INVOICEIDERR000'
  }

  return ''
}

// 銀行名
const isBankName = function (bankName) {
  // 値の存在有無確認
  if (bankName.length < 1) {
    return 'BANKNAMEERR002'
  }
  if (bankName.length > constantsDefine.invoiceValidDefine.BANKNAME_VALUE || bankName.length < 1) {
    return 'BANKNAMEERR000'
  }

  return ''
}

// 発行日、支払期日、納品日
const isDate = function (isDate) {
  // 年-月-日の形式のみ許容する
  if (!isDate.match(/^\d{4}-\d{1,2}-\d{1,2}$/)) {
    return 1
  }

  // 日付変換された日付が入力値と同じ事を確認
  // new Date()の引数に不正な日付が入力された場合、相当する日付に変換されてしまうため
  const date = new Date(isDate)
  if (
    date.getFullYear() !== parseInt(isDate.split('-')[0]) ||
    date.getMonth() !== parseInt(isDate.split('-')[1]) - 1 ||
    date.getDate() !== parseInt(isDate.split('-')[2])
  ) {
    return 2
  }

  return 0
}

// 明細-項目ID
const isSellersItemNum = function (sellersItemNum) {
  // 値の存在有無確認
  if (sellersItemNum.length < 1) {
    return 'SELLERSITEMNUMERR002'
  }
  if (sellersItemNum.length > constantsDefine.invoiceValidDefine.SELLERSITEMNUM_VALUE || sellersItemNum.length < 1) {
    return 'SELLERSITEMNUMERR000'
  }

  return ''
}

// 明細-内容
const isItemName = function (itemName) {
  // 値の存在有無確認
  if (itemName.length < 1) {
    return 'ITEMNAMEERR002'
  }
  if (itemName.length > constantsDefine.invoiceValidDefine.ITEMNAME_VALUE) {
    return 'ITEMNAMEERR000'
  }

  return ''
}

// 明細-数量
const isQuantityValue = function (quantityValue) {
  // 値の存在有無確認
  if (quantityValue.length < 1) {
    return 'QUANTITYVALUEERR002'
  }
  const isQuantityPatten = '^[0-9]+$'
  const regex = new RegExp(isQuantityPatten)
  if (!regex.test(quantityValue)) {
    return 'QUANTITYVALUEERR001'
  }

  if (quantityValue < 0 || quantityValue > constantsDefine.invoiceValidDefine.QUANTITYVALUE_MAX_VALUE) {
    return 'QUANTITYVALUEERR000'
  }

  return ''
}

// 明細-単価
const isPriceValue = function (priceValue) {
  // 値の存在有無確認
  if (priceValue.length < 1) {
    return 'PRICEVALUEERR002'
  }
  if (!isNumberRegular(priceValue)) {
    return 'PRICEVALUEERR001'
  }

  if (
    priceValue < constantsDefine.invoiceValidDefine.PRICEVALUE_MIN_VALUE ||
    priceValue > constantsDefine.invoiceValidDefine.PRICEVALUE_MAX_VALUE
  ) {
    return 'PRICEVALUEERR000'
  }

  return ''
}

// 明細-税
const isTaxCategori = function (category) {
  const taxCategory = require('./bconCsvTax')
  // 値の存在有無確認
  if (category.length < 1) {
    return 'TAXERR001'
  }

  if (!taxCategory[category]) {
    return 'TAXERR000'
  }

  return taxCategory[category]
}

// 明細-税(ユーザーフォーマット)
const isUserTaxCategori = function (category, bconCsvTaxUser) {
  // 値の存在有無確認
  if (category.length < 1) {
    return 'TAXERR001'
  }

  if (!bconCsvTaxUser[category]) {
    return 'TAXERR002'
  }

  return bconCsvTaxUser[category]
}

// 明細-単位
const isUnitcode = function (unitCode) {
  const unitcodeCategory = require('./bconCsvUnitcode')
  // 値の存在有無確認
  if (unitCode.length < 1) {
    return 'UNITERR001'
  }

  if (!unitcodeCategory[unitCode]) {
    return 'UNITERR000'
  }

  return unitcodeCategory[unitCode]
}

// 明細-単位(ユーザーフォーマット)
const isUserUnitcode = function (unitCode, bconCsvUnitUser) {
  // 値の存在有無確認
  if (unitCode.length < 1) {
    return 'UNITERR001'
  }

  if (!bconCsvUnitUser[unitCode]) {
    return 'UNITERR002'
  }

  return bconCsvUnitUser[unitCode]
}

const isFinancialInstitution = function (financialInstitution) {
  if (financialInstitution.length > constantsDefine.invoiceValidDefine.FINANCIALINSTITUTION_VALUE) {
    return 'FINANCIALINSTITUTIONERR000'
  }

  return ''
}

// 支店名
const isFinancialName = function (financialName) {
  // 値の存在有無確認
  if (financialName.length < 1) {
    return 'FINANCIALNAMEERR002'
  }
  if (financialName.length > constantsDefine.invoiceValidDefine.FINANCIALNAME_VALUE) {
    return 'FINANCIALNAMEERR000'
  }

  return ''
}

// 科目
const isAccountType = function (accountType) {
  const unitcodeCategory = require('./bconCsvAccountType')
  // 値の存在有無確認
  if (accountType.length < 1) {
    return 2
  }

  if (!unitcodeCategory[accountType]) {
    return 1
  }

  return unitcodeCategory[accountType]
}

// 口座番号
const isAccountId = function (accountId) {
  const isAccountPatten = '^[0-9]+$'
  const regex = new RegExp(isAccountPatten)
  // 値の存在有無確認
  if (accountId.length < 1) {
    return 'ACCOUNTIDERR002'
  }
  if (!regex.test(accountId)) {
    return 'ACCOUNTIDERR001'
  }
  if (accountId.length !== constantsDefine.invoiceValidDefine.ACCOUNTID_VALUE) {
    return 'ACCOUNTIDERR000'
  }

  return ''
}

// 口座名義
const isAccountName = function (accountName) {
  // 値の存在有無確認
  if (accountName.length < 1) {
    return 'ACCOUNTNAMEERR002'
  }
  if (accountName.length > constantsDefine.invoiceValidDefine.ACCOUNTNAME_VALUE) {
    return 'ACCOUNTNAMEERR000'
  }

  return ''
}

// その他特記事項
const isNote = function (note) {
  if (note.length > constantsDefine.invoiceValidDefine.NOTE_VALUE) {
    return 'NOTEERR000'
  }

  return ''
}

// 明細-備考
const isDescription = function (description) {
  if (description.length > constantsDefine.invoiceValidDefine.DESCRIPTION_VALUE) {
    return 'DESCRIPTIONERR000'
  }
  return ''
}

// ネットワーク接続
const checkNetworkConnection = function (companyNetworkConnectionList, targetConnectionId) {
  let connectionFlag = false
  try {
    companyNetworkConnectionList.forEach((tenantId) => {
      if (targetConnectionId === tenantId) {
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

// 仕訳のバリデーションチェック
// コード
const isCode = function (code, prefix) {
  const inputPatternEngNum = '^[a-zA-Z0-9]*$'
  const regex = new RegExp(inputPatternEngNum)
  if (code.length < 1) {
    return `${prefix}CODEERR000`
  } else if (code.length > constantsDefine.codeValidDefine.CODE_LENGTH) {
    return `${prefix}CODEERR001`
  } else if (!regex.test(code)) {
    return `${prefix}CODEERR002`
  } else {
    return ''
  }
}

// 部門コード
const isDepartmentCode = function (code, prefix) {
  const inputPatternEngNum = '^[a-zA-Z0-9ァ-ヶー]*$'
  const regex = new RegExp(inputPatternEngNum)
  if (code.length < 1) {
    return `${prefix}CODEERR000`
  } else if (code.length > constantsDefine.codeValidDefine.CODE_LENGTH) {
    return `${prefix}CODEERR001`
  } else if (!regex.test(code)) {
    return `${prefix}CODEERR002`
  } else {
    return ''
  }
}

const isName = function (name, prefix) {
  if (name.length < 1) {
    return `${prefix}NAMEERR000`
  } else if (name.length > constantsDefine.codeValidDefine.NAME_LENGTH) {
    return `${prefix}NAMEERR001`
  } else {
    return ''
  }
}

const isContactEmail = function (contactEmail) {
  const contactEmailType = typeof contactEmail

  if (contactEmailType === 'undefined' || contactEmail.length === 0) return 0

  let quoteCnt = 0
  let spaceCnt = 0

  const getCharCode = function (character) {
    return character.charCodeAt()
  }

  // 取引担当者メールアドレスが配列形式で受け取った場合
  if (contactEmailType !== 'string') return -1

  const local = contactEmail.split('@')[0]
  const domain = contactEmail.split('@')[1]

  // 取引担当者メールアドレスがメール形式ではない場合
  if (typeof domain === 'undefined') return -1

  // 取引担当者メールアドレスが128超過の場合
  if (contactEmail.length > 128) return -1

  // 取引担当者メールアドレスのローカル部のサイズが超えた場合
  if (local.length > 64) return -1

  // 取引担当者メールアドレスのローカル部チェック
  for (const character of local) {
    const code = getCharCode(character)
    // 半角英数字以外場合エラー発生
    if (code > 127) {
      return -1
    }

    // 「"」のチェック
    if (code === 34) {
      quoteCnt++
    }

    // 引用符号の外に半角スペースがあるかをチェック
    if (code === 32) {
      if (quoteCnt === 0) return -2
      if (quoteCnt > 0 && quoteCnt % 2 === 0) return -2
      spaceCnt++
    }
  }

  if (spaceCnt > 0 && quoteCnt > 0) {
    if (quoteCnt % 2 === 1) return -2
  }

  // 取引担当者メールアドレスのドメイン部チェック
  const doaminPattern = '^(?!://)(?=.{1,255}$)((.{1,63}.){1,127}(?![0-9]*$)[a-z0-9-]+.?)$'
  const domainReg = new RegExp(doaminPattern)
  if (!domainReg.test(domain)) return -1
  if (domain[0] === '-') return -1

  return 0
}

const isValidEmail = function (emailAddress) {
  const emailType = typeof emailAddress

  if (emailType === 'undefined' || emailAddress.length === 0) return false

  let quoteCnt = 0
  let spaceCnt = 0

  const getCharCode = function (character) {
    return character.charCodeAt()
  }

  // 取引担当者メールアドレスが配列形式で受け取った場合
  if (emailType !== 'string') return false

  if (emailAddress.match(/@/g) === null || emailAddress.match(/@/g).length !== 1) return false
  const emailParty = emailAddress.split('@')

  let local = null
  let domain = null

  if (emailParty.length === 1) return false

  if (emailParty.length === 2) {
    local = emailParty[0]
    domain = emailParty[1]
  } else {
    local = ''
    for (let idx = emailParty.length - 1; idx >= 0; idx--) {
      if ((idx = emailParty.length - 1)) {
        domain = emailParty[idx]
      } else {
        if (emailParty[idx].length === 0) return false
        local += emailParty[idx]
      }
    }
  }

  if (typeof domain === 'undefined') return false

  if (local.length > 64) return false

  for (const character of local) {
    const code = getCharCode(character)
    // 半角英数字以外場合エラー発生
    // 利用不可の特殊文字コード設定("<>():,@;)
    const disabledCharacterCode = [34, 60, 62, 40, 41, 58, 44, 59]
    if (code > 127 || disabledCharacterCode.indexOf(code) > -1) {
      return false
    }

    // 「"」のチェック
    if (code === 34) {
      quoteCnt++
    }

    // 引用符号の外に半角スペースがあるかをチェック
    if (code === 32) {
      if (quoteCnt === 0) return -2
      if (quoteCnt > 0 && quoteCnt % 2 === 0) return false
      spaceCnt++
    }
  }

  if (spaceCnt > 0 && quoteCnt > 0) {
    if (quoteCnt % 2 === 1) return false
  }

  const domainPart = domain.split('.')
  for (let idx = domainPart.length - 1; idx >= 0; idx--) {
    if (domainPart[idx].length === 0) {
      return false
    } else {
      const pattern = /^[A-Za-z0-9.-]{1,63}$/
      if (!pattern.test(domainPart[idx])) return false
    }
  }

  return true
}

// トレードシフトのユーザアカウント用に使用するメールアドレスの形式チェック
const isValidEmailTsUser = function (emailAddress) {
  const emailType = typeof emailAddress

  if (emailType === 'undefined' || emailAddress.length === 0) return false
  // 255文字まで
  if (emailAddress.length > 255) return false

  const getCharCode = function (character) {
    return character.charCodeAt()
  }

  // 取引担当者メールアドレスが配列形式で受け取った場合
  if (emailType !== 'string') return false

  if (emailAddress.match(/@/g) === null || emailAddress.match(/@/g).length !== 1) return false
  const emailParty = emailAddress.split('@')

  let local = null
  let domain = null

  if (emailParty.length === 1) return false

  if (emailParty.length === 2) {
    local = emailParty[0]
    domain = emailParty[1]
  } else {
    local = ''
    for (let idx = emailParty.length - 1; idx >= 0; idx--) {
      if ((idx = emailParty.length - 1)) {
        domain = emailParty[idx]
      } else {
        if (emailParty[idx].length === 0) return false
        local += emailParty[idx]
      }
    }
  }

  if (typeof domain === 'undefined') return false

  // @より前：64文字以下、後：190文字以下
  if (local.length > 64) return false
  if (domain.length > 190) return false

  // @より前のチェック
  for (const character of local) {
    const code = getCharCode(character)
    // 半角英数字以外場合エラー発生
    // 利用不可の特殊文字コード設定("<>():,@;)
    const disabledCharacterCode = [34, 60, 62, 40, 41, 58, 44, 59]
    if (code > 127 || disabledCharacterCode.indexOf(code) > -1) {
      return false
    }
  }

  // @より後のチェック
  // 「.」が存在しない場合、エラー
  if (domain.indexOf('.') === -1) return false
  // 文字種チェック
  const pattern = /^[A-Za-z0-9.]{1,190}$/
  if (!pattern.test(domain)) return false

  // 先頭、末尾のドットはNG
  if (local.indexOf('.') === 0) return false
  if (local.lastIndexOf('.') === local.length - 1) return false
  if (domain.indexOf('.') === 0) return false
  if (domain.lastIndexOf('.') === domain.length - 1) return false

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
  isStatusForSimpleChange: isStatusForSimpleChange,
  isBcdCancelling: isBcdCancelling,
  isInvoiceId: isInvoiceId,
  isBankName: isBankName,
  isDate: isDate,
  isSellersItemNum: isSellersItemNum,
  isItemName: isItemName,
  isQuantityValue: isQuantityValue,
  isPriceValue: isPriceValue,
  isTaxCategori: isTaxCategori,
  isUserTaxCategori: isUserTaxCategori,
  isUserUnitcode: isUserUnitcode,
  isUnitcode: isUnitcode,
  isFinancialInstitution: isFinancialInstitution,
  isFinancialName: isFinancialName,
  isAccountType: isAccountType,
  isAccountId: isAccountId,
  isAccountName: isAccountName,
  isNote: isNote,
  isDescription: isDescription,
  checkNetworkConnection: checkNetworkConnection,
  isUndefined: isUndefined,
  isNumberRegular: isNumberRegular,
  isCode: isCode,
  isName: isName,
  isDepartmentCode: isDepartmentCode,
  isContactEmail: isContactEmail,
  isValidEmail: isValidEmail,
  isValidEmailTsUser: isValidEmailTsUser
}
