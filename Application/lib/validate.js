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

/**
 * UUIDバリデーションチェック
 * @param {uuid} uuid バリデーション対象となるUUID
 * @returns {boolean} UUIDの場合true,UUIDではない場合false
 */
const isUUID = (uuid) => {
  if (!isString(uuid)) return false
  const index = [/^[0-9a-f]{8}-?[0-9a-f]{4}-?[1-5][0-9a-f]{3}-?[89ab][0-9a-f]{3}-?[0-9a-f]{12}$/i].findIndex((x) =>
    x.test(uuid)
  )
  if (index < 0) return false
  else return true
}

/**
 * objectのバリデーションチェック
 * @param {object} target バリデーション対象となるobject
 * @returns {boolean} objectがUndefinedの場合true,objectがUndefinedではない場合false
 */
const isUndefined = (target) => {
  if (Object.prototype.toString.call(target) === '[object Undefined]') {
    return true
  }

  return false
}

/**
 * 郵便番号のバリデーションチェック
 * @param {string} postalNumber バリデーション対象となる郵便番号
 * @returns {boolean} 郵便番号形式の場合true,郵便番号形式ではない場合false
 */
const isPostalNumber = (postalNumber) => {
  const pattern = '^[0-9]{7}$'
  const regex = new RegExp(pattern)

  // test()結果はtrue又はfalseになる。
  return regex.test(postalNumber)
}

/**
 * 数字のバリデーションチェック
 * @param {string} regNumber バリデーション対象となる数字
 * @returns {boolean} 数字の場合true,数字ではない場合false
 */
const isNumberRegular = (regNumber) => {
  const isNumberPatten = '^[-]?[0-9]*(\\.?[0-9]*)$'
  const regex = new RegExp(isNumberPatten)

  // test()結果はtrue又はfalseになる。
  return regex.test(regNumber)
}

/**
 * テナント管理者ユーザーのバリデーションチェック
 * @param {uuid} userRole バリデーション対象となるユーザーロール
 * @param {boolean} deleteFlag バリデーション対象企業の解約有無
 * @returns {boolean} テナント管理者のロールの場合true, その以外の場合false
 */
const isTenantManager = function (userRole, deleteFlag) {
  if (userRole !== constantsDefine.userRoleConstants.tenantManager && !deleteFlag) {
    return false
  }
  return true
}

/**
 * テナントの契約申請有無バリデーションチェック
 * @param {string} contractStatus バリデーション対象となるテナントの契約ステータス
 * @param {boolean} deleteFlag バリデーション対象企業の解約有無
 * @returns {boolean} テナント契約ステータスが登録申込、登録受付の場合false, その以外の場合true
 */
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

/**
 * テナントの解約申請有無バリデーションチェック
 * @param {string} contractStatus バリデーション対象となるテナントの契約ステータス
 * @param {boolean} deleteFlag バリデーション対象企業の解約有無
 * @returns {boolean} テナント契約ステータスが解約申込、解約受付の場合false, その以外の場合true
 */
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

/**
 * テナントの契約情報変更有無バリデーションチェック
 * @param {string} contractStatus バリデーション対象となるテナントの契約ステータス
 * @param {boolean} deleteFlag バリデーション対象企業の解約有無
 * @returns {boolean} テナント契約ステータスが変更申込、変更受付の場合false, その以外の場合true
 */
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
/**
 * 請求書番号バリデーションチェック
 * @param {string} invoiceId バリデーション対象対象となる請求書番号
 * @returns {string} バリデーションチェック結果エラーコード、問題ない場合は''
 */
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

/**
 * 銀行名バリデーションチェック
 * @param {string} bankName バリデーション対象対象となる銀行名
 * @returns {string} バリデーションチェック結果エラーコード、問題ない場合は''
 */
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

/**
 * 日付関連バリデーションチェック(発行日、支払期日、納品日)
 * @param {string} isDate バリデーション対象対象となる日付
 * @returns {int} 1,2:エラー  0:正常
 */
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

/**
 * 明細-項目IDバリデーションチェック
 * @param {string} sellersItemNum バリデーション対象対象となる明細-項目ID
 * @returns {string} バリデーションチェック結果エラーコード、問題ない場合は''
 */
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

/**
 * 明細-内容バリデーションチェック
 * @param {string} itemName バリデーション対象対象となる明細-内容
 * @returns {string} バリデーションチェック結果エラーコード、問題ない場合は''
 */
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

/**
 * 明細-数量バリデーションチェック
 * @param {int} quantityValue バリデーション対象対象となる明細-数量
 * @returns {string} バリデーションチェック結果エラーコード、問題ない場合は''
 */
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

/**
 * 明細-単価バリデーションチェック
 * @param {int} priceValue バリデーション対象対象となる明細-単価
 * @returns {string} バリデーションチェック結果エラーコード、問題ない場合は''
 */
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

/**
 * 明細-税(種類)バリデーションチェック
 * @param {string} category バリデーション対象対象となる明細-税(種類)
 * @returns {string} バリデーションチェック結果エラーコード、問題ない場合はcategoryの税種類
 */
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

/**
 * 明細-税(税率)バリデーションチェック
 * @param {string} category バリデーション対象対象となる明細-税(税率)
 * @returns {string} バリデーションチェック結果エラーコード、問題ない場合はcategoryの税率
 */
const isTaxPercent = function (category) {
  const taxCategory = require('./bconCsvTaxPercent')
  // 値の存在有無確認
  if (category.length < 1) {
    return 'TAXERR001'
  }

  if (!taxCategory[category]) {
    return 'TAXERR000'
  }

  return taxCategory[category]
}

/**
 * 明細-税(ユーザーフォーマット)バリデーションチェック
 * @param {string} category バリデーション対象対象となる明細-税(ユーザーフォーマット)
 * @param {array} bconCsvTaxUser ユーザーが指定した税種類
 * @returns {string} バリデーションチェック結果エラーコード、問題ない場合はcategoryの税種類
 */
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

/**
 * 明細-単位バリデーションチェック
 * @param {string} unitCode バリデーション対象対象となる明細-単位
 * @returns {string} バリデーションチェック結果エラーコード、問題ない場合はunitCodeの単位コード
 */
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

/**
 * 明細-単位(ユーザーフォーマット)バリデーションチェック
 * @param {string} unitCode バリデーション対象対象となる明細-単位(ユーザーフォーマット)
 * @param {array} bconCsvUnitUser ユーザーが指定した明細-単位
 * @returns {string} バリデーションチェック結果エラーコード、問題ない場合はunitCodeの単位コード
 */
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

/**
 * 備考バリデーションチェック
 * @param {string} financialInstitution バリデーション対象対象となる備考内容
 * @returns {string} バリデーションチェック結果エラーコード、問題ない場合は''
 */
const isFinancialInstitution = function (financialInstitution) {
  if (financialInstitution.length > constantsDefine.invoiceValidDefine.FINANCIALINSTITUTION_VALUE) {
    return 'FINANCIALINSTITUTIONERR000'
  }

  return ''
}

/**
 * 支店名バリデーションチェック
 * @param {string} financialName バリデーション対象対象となる支店名
 * @returns {string} バリデーションチェック結果エラーコード、問題ない場合は''
 */
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

/**
 * 科目バリデーションチェック
 * @param {string} accountType バリデーション対象対象となる科目
 * @returns {*} 1,2:エラー  科目コード:正常
 */
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

/**
 * 口座番号バリデーションチェック
 * @param {string} accountId バリデーション対象対象となる口座番号
 * @returns {string} バリデーションチェック結果エラーコード、問題ない場合は''
 */
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

/**
 * 口座名義バリデーションチェック
 * @param {string} accountId バリデーション対象対象となる口座名義
 * @returns {string} バリデーションチェック結果エラーコード、問題ない場合は''
 */
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

/**
 * その他特記事項バリデーションチェック
 * @param {string} note バリデーション対象対象となるその他特記事項
 * @returns {string} バリデーションチェック結果エラーコード、問題ない場合は''
 */
const isNote = function (note) {
  if (note.length > constantsDefine.invoiceValidDefine.NOTE_VALUE) {
    return 'NOTEERR000'
  }

  return ''
}

/**
 * 明細-備考バリデーションチェック
 * @param {string} description バリデーション対象対象となる明細-備考
 * @returns {string} バリデーションチェック結果エラーコード、問題ない場合は''
 */
const isDescription = function (description) {
  if (description.length > constantsDefine.invoiceValidDefine.DESCRIPTION_VALUE) {
    return 'DESCRIPTIONERR000'
  }
  return ''
}

/**
 * ネットワーク接続バリデーションチェック
 * @param {array} companyNetworkConnectionList ネットワークに繋がっているテナント企業
 * @param {uuid} targetConnectionId 請求書を送信する企業のテナントUUID
 * @returns {string} バリデーションチェック結果エラーコード、問題ない場合は''
 */
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
/**
 * 仕訳コードバリデーションチェック
 * @param {string} code バリデーション対象対象となる仕訳コード
 * @param {string} prefix 仕訳の種類（勘定科目、補助科目）
 * @returns {string} バリデーションチェック結果エラーコード、問題ない場合は''
 */
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

/**
 * 部門コードバリデーションチェック
 * @param {string} code バリデーション対象対象となる部門コード
 * @param {string} prefix 仕訳の種類（部門コード）
 * @returns {string} バリデーションチェック結果エラーコード、問題ない場合は''
 */
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

/**
 * 仕訳名バリデーションチェック
 * @param {string} name バリデーション対象対象となる仕訳名
 * @param {string} prefix 仕訳の種類（勘定科目、補助科目、部門コード）
 * @returns {string} バリデーションチェック結果エラーコード、問題ない場合は''
 */
const isName = function (name, prefix) {
  if (name.length < 1) {
    return `${prefix}NAMEERR000`
  } else if (name.length > constantsDefine.codeValidDefine.NAME_LENGTH) {
    return `${prefix}NAMEERR001`
  } else {
    return ''
  }
}

/**
 * 取引担当者メールアドレスバリデーションチェック
 * @param {string} contactEmail バリデーション対象対象となる取引担当者メールアドレス
 * @returns {*} -1,-2:エラー  0:正常
 */
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

/**
 * メールアドレスバリデーションチェック
 * @param {string} emailAddress バリデーション対象対象となるメールアドレス
 * @returns {boolean} false:エラー  true:正常
 */
const isValidEmail = function (emailAddress) {
  const emailType = typeof emailAddress

  if (emailType === 'undefined' || emailAddress.length === 0) return false

  let quoteCnt = 0
  let spaceCnt = 0

  const getCharCode = function (character) {
    return character.charCodeAt()
  }

  // メールアドレスが配列形式で受け取った場合
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

/**
 * トレードシフトのユーザアカウント用に使用するメールアドレスの形式チェック
 * @param {string} emailAddress バリデーション対象対象となるメールアドレス
 * @returns {boolean} false:エラー  true:正常
 */
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

/**
 * 請求書の税金額バリデーションチェック
 * @param {string} documentNo バリデーション対象対象と請求書番号
 * @param {array} invoiceData バリデーション対象対象となる請求書情報
 * @returns {boolean} false:エラー  true:正常
 */
const isValidTotalPrice = function (documentNo, invoiceData) {
  let totalPrice = 0
  invoiceData.forEach((element) => {
    if (element.docNo === documentNo) {
      const csvColumn = element.rows.split(',')
      // 数量
      const quantityValue = csvColumn[15]
      // 単価
      const price = csvColumn[17]
      // 小計
      const subTotal = quantityValue * price
      // 税率
      const taxPercent = isTaxPercent(csvColumn[18])
      // 税金額
      const taxPrice = subTotal * taxPercent

      totalPrice += subTotal + Math.floor(taxPrice)
    }
  })

  if (totalPrice > constantsDefine.invoiceValidDefine.TOTALPRICEVALUE) {
    return false
  }

  return true
}

/**
 * 絵文字の入力チェック
 * @param {string} str テキストに入力された文字
 * @return {boolean} true:strに絵文字が入力された場合
 *                   false:strに絵文字が入力されていない場合
 */
function isEmoji(str) {
  const ranges = [
    '[\ud800-\ud8ff][\ud000-\udfff]', // 基本的な絵文字除去
    '[\ud000-\udfff]{2,}', // サロゲートペアの二回以上の繰り返しがあった場合
    '\ud7c9[\udc00-\udfff]', // 特定のシリーズ除去
    '[0-9|*|#][\uFE0E-\uFE0F]\u20E3', // 数字系絵文字
    '[0-9|*|#]\u20E3', // 数字系絵文字
    '[©|®|\u2010-\u3fff][\uFE0E-\uFE0F]', // 環境依存文字や日本語との組み合わせによる絵文字
    '[\u2010-\u2FFF]', // 指や手、物など、単体で絵文字となるもの
    '\uA4B3' // 数学記号の環境依存文字の除去
  ]
  if (str.match(ranges.join('|'))) {
    return true
  } else {
    return false
  }
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
  isTaxPercent: isTaxPercent,
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
  isValidEmailTsUser: isValidEmailTsUser,
  isValidTotalPrice: isValidTotalPrice,
  isEmoji: isEmoji
}
