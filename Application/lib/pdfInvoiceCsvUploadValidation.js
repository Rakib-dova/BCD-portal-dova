const pdfInvoiceController = require('../controllers/pdfInvoiceController.js')
const tax = require('./tax')
const { convertCsvStringToMultiArray } = require('./csv')
const { v4: uuidv4 } = require('uuid')

// PDF請求書バリデーション
const invoiceRules = [
  {
    prop: 'sendRegistrationNo',
    regexp: /^T\d{13}$/,
    message: '登録番号は"T"+半角数字13桁で入力してください。',
    colName: '登録番号'
  },
  {
    prop: 'invoiceNo',
    regexp: /^([a-zA-Z0-9]{1,50})$/,
    message: '請求書番号は半角英数字50文字以内で入力して下さい。',
    colName: '請求書番号',
    required: true
  },
  {
    prop: 'paymentDate',
    customValidator: (value, _) => !isNaN(new Date(value).getDate()),
    regexp: '',
    message: '支払期日が不正な日付です。',
    colName: '支払期日',
    required: true
  },
  {
    prop: 'billingDate',
    customValidator: (value, _) => !isNaN(new Date(value).getDate()),
    regexp: '',
    message: '請求日が不正な日付です。',
    colName: '請求日',
    required: true
  },
  {
    prop: 'deliveryDate',
    customValidator: (value, _) => !isNaN(new Date(value).getDate()),
    regexp: '',
    message: '納品日が不正な日付です。',
    colName: '納品日',
    required: true
  },
  {
    prop: 'recCompany',
    regexp: /^.{1,200}$/,
    message: '宛先企業は200文字以内で入力して下さい。',
    colName: '宛先企業',
    required: true
  },
  {
    prop: 'recPost',
    regexp: /^[0-9]{3}-[0-9]{4}$/,
    message: '宛先郵便番号は 数字3桁 - 数字4桁 で入力して下さい。',
    colName: '宛先郵便番号',
    required: true
  },
  {
    prop: 'recAddr1',
    regexp: /^.{1,10}$/,
    message: '宛先都道府県は10文字以内で入力して下さい。',
    colName: '宛先都道府県',
    required: true
  },
  {
    prop: 'recAddr2',
    regexp: /^.{1,50}$/,
    message: '宛先住所は50文字以内で入力して下さい。',
    colName: '宛先住所',
    required: true
  },
  {
    prop: 'recAddr3',
    regexp: /^.{0,50}$/,
    message: '宛先ビル名/フロア等は50文字以内で入力して下さい。',
    colName: '宛先ビル名/フロア等'
  },
  {
    prop: 'bankName',
    regexp: /^.{0,50}$/,
    message: '銀行名は50文字以内で入力して下さい。',
    colName: '銀行名'
  },
  {
    prop: 'branchName',
    regexp: /^.{0,50}$/,
    message: '支店名は50文字以内で入力して下さい。',
    colName: '支店名'
  },
  {
    prop: 'accountType',
    regexp: /普通|当座/,
    message: '科目は「当座」または「普通」で入力して下さい。',
    colName: '科目'
  },
  {
    prop: 'accountNumber',
    regexp: /^([0-9]{7})$/,
    message: '口座番号は数字7桁で入力して下さい。',
    colName: '口座番号'
  },
  {
    prop: 'accountName',
    regexp: /^.{0,50}$/,
    message: '口座名義は50文字以内で入力して下さい。',
    colName: '口座名義'
  },
  {
    prop: 'note',
    regexp: /^.{0,400}$/,
    message: '備考は400文字以内で入力して下さい。'
  },
  {
    prop: 'discountDescription1',
    customValidator(value, model) {
      if (!model.discountDescription1 && !model.discountAmount1 && !model.discountUnit1) return true
      else {
        if (!value) {
          this.message = `${this.colName}は必須です。`
          return false
        } else if (/^.{0,100}$/.test(value) === false) {
          this.message = `${this.colName}は100文字以内で入力してください。`
          return false
        } else return true
      }
    },
    message: '',
    colName: '請求書割引内容1'
  },
  {
    prop: 'discountAmount1',
    customValidator(value, model) {
      if (!model.discountDescription1 && !model.discountAmount1 && !model.discountUnit1) return true
      else {
        if (!value) {
          this.message = `${this.colName}は必須です。`
          return false
        } else if (!(value > 0 && value <= 999999999999.999)) {
          this.message = `${this.colName}は整数or少数 0 ～ 999999999999.999 の範囲で入力してください。`
          return false
        } else return true
      }
    },
    message: '',
    colName: '請求書割引数値1'
  },
  {
    prop: 'discountUnit1',
    customValidator(value, model) {
      if (!model.discountDescription1 && !model.discountAmount1 && !model.discountUnit1) return true
      else {
        if (!value) {
          this.message = `${this.colName}は必須です。`
          return false
        } else if (/percent|jpy/.test(value) === false) {
          this.message = `${this.colName}は「percent」または「jpy」で入力して下さい。`
          return false
        } else return true
      }
    },
    message: '',
    colName: '請求書割引種別1'
  },
  {
    prop: 'discountDescription2',
    customValidator(value, model) {
      if (!model.discountDescription2 && !model.discountAmount2 && !model.discountUnit2) return true
      else {
        if (!value) {
          this.message = `${this.colName}は必須です。`
          return false
        } else if (/^.{0,100}$/.test(value) === false) {
          this.message = `${this.colName}は100文字以内で入力してください。`
          return false
        } else return true
      }
    },
    message: '',
    colName: '請求書割引内容2'
  },
  {
    prop: 'discountAmount2',
    customValidator(value, model) {
      if (!model.discountDescription2 && !model.discountAmount2 && !model.discountUnit2) return true
      else {
        if (!value) {
          this.message = `${this.colName}は必須です。`
          return false
        } else if (!(value > 0 && value <= 999999999999.999)) {
          this.message = `${this.colName}は整数or少数 0 ～ 999999999999.999 の範囲で入力してください。`
          return false
        } else return true
      }
    },
    message: '',
    colName: '請求書割引数値2'
  },
  {
    prop: 'discountUnit2',
    customValidator(value, model) {
      if (!model.discountDescription2 && !model.discountAmount2 && !model.discountUnit2) return true
      else {
        if (!value) {
          this.message = `${this.colName}は必須です。`
          return false
        } else if (/percent|jpy/.test(value) === false) {
          this.message = `${this.colName}は「percent」または「jpy」で入力して下さい。`
          return false
        } else return true
      }
    },
    message: '',
    colName: '請求書割引種別2'
  },
  {
    prop: 'discountDescription3',
    customValidator(value, model) {
      if (!model.discountDescription3 && !model.discountAmount3 && !model.discountUnit3) return true
      else {
        if (!value) {
          this.message = `${this.colName}は必須です。`
          return false
        } else if (/^.{0,100}$/.test(value) === false) {
          this.message = `${this.colName}は100文字以内で入力してください。`
          return false
        } else return true
      }
    },
    message: '',
    colName: '請求書割引内容3'
  },
  {
    prop: 'discountAmount3',
    customValidator(value, model) {
      if (!model.discountDescription3 && !model.discountAmount3 && !model.discountUnit3) return true
      else {
        if (!value) {
          this.message = `${this.colName}は必須です。`
          return false
        } else if (!(value > 0 && value <= 999999999999.999)) {
          this.message = `${this.colName}は整数or少数 0 ～ 999999999999.999 の範囲で入力してください。`
          return false
        } else return true
      }
    },
    message: '',
    colName: '請求書割引数値3'
  },
  {
    prop: 'discountUnit3',
    customValidator(value, model) {
      if (!model.discountDescription3 && !model.discountAmount3 && !model.discountUnit3) return true
      else {
        if (!value) {
          this.message = `${this.colName}は必須です。`
          return false
        } else if (/percent|jpy/.test(value) === false) {
          this.message = `${this.colName}は「percent」または「jpy」で入力して下さい。`
          return false
        } else return true
      }
    },
    message: '',
    colName: '請求書割引種別3'
  }
]

// PDF請求書明細バリデーション
const lineRules = [
  {
    prop: 'lineId',
    regexp: /^([a-zA-Z0-9-]{0,5})$/,
    message: '明細-項目IDは半角英数字半角ハイフン5文字以内で入力してください。',
    colName: '明細-項目ID',
    required: true
  },
  {
    prop: 'lineDescription',
    regexp: /^.{0,100}$/,
    message: '明細-内容は100文字以内で入力してください。',
    colName: '明細-内容',
    required: true
  },
  {
    prop: 'quantity',
    customValidator: (value, _) => value > 0 && value <= 999999999999.999,
    regexp: '',
    message: '数量は整数or少数 0 ～ 999999999999.999 の範囲で入力してください。',
    colName: '明細-数量',
    required: true
  },
  {
    prop: 'unit',
    regexp: /^.{0,10}$/,
    message: '明細-単位は10文字以内で入力してください。',
    colName: '明細-単位',
    required: true
  },
  {
    prop: 'unitPrice',
    regexp: /^[0-9]{0,12}$/,
    message: '明細-単価は整数 0 ～ 999999999999 の範囲で入力してください。',
    colName: '明細-単価',
    required: true
  },
  {
    prop: 'taxType',
    regexp: /^消費税$|^軽減税率$|^不課税$|^免税$|^非課税$|^その他の消費税$/,
    message: '明細-税は消費税／軽減税率／不課税／免税／非課税／その他の消費税で入力して下さい。',
    colName: '明細-税',
    required: true
  },
  {
    prop: 'discountDescription1',
    customValidator(value, model) {
      if (!model.discountDescription1 && !model.discountAmount1 && !model.discountUnit1) return true
      else {
        if (!value) {
          this.message = `${this.colName}は必須です。`
          return false
        } else if (/^.{0,100}$/.test(value) === false) {
          this.message = `${this.colName}は100文字以内で入力してください。`
          return false
        } else return true
      }
    },
    message: '',
    colName: '明細-割引内容1'
  },
  {
    prop: 'discountAmount1',
    customValidator(value, model) {
      if (!model.discountDescription1 && !model.discountAmount1 && !model.discountUnit1) return true
      else {
        if (!value) {
          this.message = `${this.colName}は必須です。`
          return false
        } else if (!(value > 0 && value <= 999999999999.999)) {
          this.message = `${this.colName}は整数or少数 0 ～ 999999999999.999 の範囲で入力してください。`
          return false
        } else return true
      }
    },
    message: '',
    colName: '明細-割引数値1'
  },
  {
    prop: 'discountUnit1',
    customValidator(value, model) {
      if (!model.discountDescription1 && !model.discountAmount1 && !model.discountUnit1) return true
      else {
        if (!value) {
          this.message = `${this.colName}は必須です。`
          return false
        } else if (/percent|jpy/.test(value) === false) {
          this.message = `${this.colName}は「percent」または「jpy」で入力して下さい。`
          return false
        } else return true
      }
    },
    message: '',
    colName: '明細-割引種別1'
  },
  {
    prop: 'discountDescription2',
    customValidator(value, model) {
      if (!model.discountDescription2 && !model.discountAmount2 && !model.discountUnit2) return true
      else {
        if (!value) {
          this.message = `${this.colName}は必須です。`
          return false
        } else if (/^.{0,100}$/.test(value) === false) {
          this.message = `${this.colName}は100文字以内で入力してください。`
          return false
        } else return true
      }
    },
    message: '',
    colName: '明細-割引内容2'
  },
  {
    prop: 'discountAmount2',
    customValidator(value, model) {
      if (!model.discountDescription2 && !model.discountAmount2 && !model.discountUnit2) return true
      else {
        if (!value) {
          this.message = `${this.colName}は必須です。`
          return false
        } else if (!(value > 0 && value <= 999999999999.999)) {
          this.message = `${this.colName}は整数or少数 0 ～ 999999999999.999 の範囲で入力してください。`
          return false
        } else return true
      }
    },
    message: '',
    colName: '明細-割引数値2'
  },
  {
    prop: 'discountUnit2',
    customValidator(value, model) {
      if (!model.discountDescription2 && !model.discountAmount2 && !model.discountUnit2) return true
      else {
        if (!value) {
          this.message = `${this.colName}は必須です。`
          return false
        } else if (/percent|jpy/.test(value) === false) {
          this.message = `${this.colName}は「percent」または「jpy」で入力して下さい。`
          return false
        } else return true
      }
    },
    message: '',
    colName: '明細-割引種別2'
  },
  {
    prop: 'discountDescription3',
    customValidator(value, model) {
      if (!model.discountDescription3 && !model.discountAmount3 && !model.discountUnit3) return true
      else {
        if (!value) {
          this.message = `${this.colName}は必須です。`
          return false
        } else if (/^.{0,100}$/.test(value) === false) {
          this.message = `${this.colName}は100文字以内で入力してください。`
          return false
        } else return true
      }
    },
    message: '',
    colName: '明細-割引内容3'
  },
  {
    prop: 'discountAmount3',
    customValidator(value, model) {
      if (!model.discountDescription3 && !model.discountAmount3 && !model.discountUnit3) return true
      else {
        if (!value) {
          this.message = `${this.colName}は必須です。`
          return false
        } else if (!(value > 0 && value <= 999999999999.999)) {
          this.message = `${this.colName}は整数or少数 0 ～ 999999999999.999 の範囲で入力してください。`
          return false
        } else return true
      }
    },
    message: '',
    colName: '明細-割引数値3'
  },
  {
    prop: 'discountUnit3',
    customValidator(value, model) {
      if (!model.discountDescription3 && !model.discountAmount3 && !model.discountUnit3) return true
      else {
        if (!value) {
          this.message = `${this.colName}は必須です。`
          return false
        } else if (/percent|jpy/.test(value) === false) {
          this.message = `${this.colName}は「percent」または「jpy」で入力して下さい。`
          return false
        } else return true
      }
    },
    message: '',
    colName: '明細-割引種別3'
  },
  {
    prop: 'taxLabel',
    customValidator(value, model) {
      // 税種別が'その他の消費税'以外はスキップ
      if (model.taxType !== 'その他の消費税') return true
      if (!model.taxLabel && !model.taxAmount) return true
      else {
        if (!value) {
          this.message = `${this.colName}は必須です。`
          return false
        } else if (/^.{0,10}$/.test(value) === false) {
          this.message = `${this.colName}は10文字以内で入力してください。`
          return false
        } else return true
      }
    },
    message: '',
    colName: '明細-その他税名'
  },
  {
    prop: 'taxAmount',
    customValidator(value, model) {
      // 税種別が'その他の消費税'以外はスキップ
      if (model.taxType !== 'その他の消費税') return true
      if (!model.taxLabel && !model.taxAmount) return true
      else {
        if (!value) {
          this.message = `${this.colName}は必須です。`
          return false
        } else if (!(value > 0 && value <= 999999999999)) {
          this.message = `${this.colName}は整数 0 ～ 999999999999 の範囲で入力してください。`
          return false
        } else return true
      }
    },
    message: '',
    colName: '明細-その他税額'
  }
]

/**
 * CSVファイル情報を確認し、最終的にDBに保存するデータを出力する
 * @param {*} invoices
 * @param {*} lines
 * @param {*} tenantId
 * @param {*} fileName
 * @returns
 */
const validate = async (invoices, lines, tenantId, fileName) => {
  let uploadedInvoices
  try {
    uploadedInvoices = await pdfInvoiceController.findAllRawInvoices(tenantId)
  } catch (error) {
    return { validInvoices: null, validLines: null, uploadHistory: null, csvRows: null }
  }

  const validInvoices = [] // バリデーションをパスした請求書obj格納用配列 (最終的にこれを返してDBに保存)
  let validLines = [] // バリデーションをパスした請求書明細obj格納用配列 (最終的にこれを返してDBに保存)
  const csvRows = [] // CSV行obj格納用配列 (最終的にこれを返してDBに保存)
  const doneList = [] // バリデーションが完了した請求書Noの配列
  const uploadedList = uploadedInvoices.map((invoice) => invoice.invoiceNo) // アップロード済み(DB保存済み)PDF請求書Noの配列
  const historyId = uuidv4() // アップロード履歴ID生成
  const uploadHistory = {
    // アップロード履歴objの初期化 (最終的にこれを返してDBに保存)
    historyId: historyId,
    tenantId,
    csvFileName: fileName,
    successCount: 0, // バリデーションをパスしたCSV行数
    failCount: 0, // バリデーションに失敗したCSV行数
    skipCount: 0, // 重複かアップロード済みなCSV行数
    invoiceCount: 0 // 新規にDBに保存した請求書数
  }

  invoices.forEach((invoice) => {
    let invoiceIsValid = true // 請求書がバリデーションをパスできたかフラグ

    const filteredLines = lines.filter((line) => line.invoiceId === invoice.invoiceId)
    filteredLines.forEach((line, index) => {
      const csvRow = {
        historyDetailId: uuidv4(),
        historyId: historyId,
        lines: lines.indexOf(line) + 1,
        invoiceNo: line.invoiceNo,
        status: 0,
        errorData: ''
      }

      // 重複 & アップロード済み のバリデーション
      invoiceIsValid = validateDuplicationAndUpload(invoice, doneList, uploadedList, uploadHistory, csvRow)
      if (!invoiceIsValid) return csvRows.push(csvRow)

      // 請求書のバリデーション
      invoiceIsValid = validateInvoice(invoice, csvRow)
      // 請求書明細のバリデーション
      const lineIsValid = validateLine(line, uploadHistory, csvRow)
      // 請求書項目バリデーションまでパス & 明細バリデーション失敗 の場合のみバリデーションフラグを false にする
      // この条件を指定しないと、請求書項目バリデーションが失敗しても明細バリデーションが成功すると全体のバリデーションがパスしてしまう
      if (invoiceIsValid && !lineIsValid) invoiceIsValid = false
      if (invoiceIsValid) uploadHistory.successCount++
      else uploadHistory.failCount++
      csvRows.push(csvRow)
    })

    doneList.push(invoice.invoiceNo)
    if (invoiceIsValid) {
      // バリデーションに全部パスした場合
      uploadHistory.invoiceCount++
      validInvoices.push(invoice) // DB保存用配列に追加
      validLines = validLines.concat(filteredLines) // DB保存用配列に追加
    }
  })

  // 請求書明細データオブジェクトをDBに保存できるように修正
  validLines.forEach((line) => {
    line.taxType = tax.getTaxTypeByName(line.taxType)
    delete line.invoiceNo // 一時的に設けた不要なプロパティを削除
  })

  return { validInvoices, validLines, uploadHistory, csvRows }
}

/**
 * 重複 & アップロード済み を確認する
 * @param {*} invoice
 * @param {*} doneList
 * @param {*} uploadedList
 * @param {*} history
 * @param {*} csvRow
 * @returns
 */
const validateDuplicationAndUpload = (invoice, doneList, uploadedList, history, csvRow) => {
  let duplicated = false
  let uploaded = false
  if (doneList.includes(invoice.invoiceNo)) duplicated = true // 重複確認
  if (uploadedList.includes(invoice.invoiceNo)) uploaded = true // アップロード済み確認

  if (duplicated && uploaded) {
    csvRow.errorData = '重複且つ取込済みのため、処理をスキップしました。'
  } else if (duplicated) {
    csvRow.errorData = '重複のため、処理をスキップしました。'
  } else if (uploaded) {
    csvRow.errorData = '取込済みのため、処理をスキップしました。'
  }

  if (duplicated || uploaded) {
    history.skipCount++
    csvRow.status = 1
    return false
  } else return true
}

/**
 * 請求書情報を確認する
 * @param {*} invoice
 * @param {*} history
 * @param {*} csvRow
 * @returns
 */
const validateInvoice = (invoice, csvRow) => {
  let message = ''

  invoiceRules.forEach((rule) => {
    if (!invoice[rule.prop] && rule.required) {
      message = message + `${rule.colName}は必須です。\r\n`
    } else if (!invoice[rule.prop] && !rule.customValidator) return // eslint-disable-line
    else if (rule.customValidator && !rule.customValidator(invoice[rule.prop], invoice)) {
      message = message + `${rule.message}\r\n`
    } else if (rule.regexp && !rule.regexp.test(invoice[rule.prop])) {
      message = message + `${rule.message}\r\n`
    }
  })

  if (message) {
    csvRow.status = 2
    csvRow.errorData = message
    return false
  } else return true
}

/**
 * 請求書明細情報を確認する
 * @param {*} line
 * @param {*} history
 * @param {*} csvRow
 * @returns
 */
const validateLine = (line, history, csvRow) => {
  let message = csvRow.errorData

  lineRules.forEach((rule) => {
    if (!line[rule.prop] && rule.required) {
      message = message + `${rule.colName}は必須です。\r\n`
    } else if (!line[rule.prop] && !rule.customValidator) return // eslint-disable-line
    else if (rule.customValidator && !rule.customValidator(line[rule.prop], line)) {
      message = message + `${rule.message}\r\n`
    } else if (rule.regexp && !rule.regexp.test(line[rule.prop])) {
      message = message + `${rule.message}\r\n`
    }
  })

  if (message !== csvRow.errorData) {
    csvRow.status = 2
    csvRow.errorData = message
    return false
  } else return true
}

/**
 * CSVファイルのヘッダーを確認するバリデーション
 * @param {*} uploadedCsvString
 * @param {*} defaultCsvString
 * @returns
 */
const validateHeader = (uploadedCsvString, defaultCsvString) => {
  if (
    !uploadedCsvString ||
    !defaultCsvString ||
    typeof uploadedCsvString !== 'string' ||
    typeof defaultCsvString !== 'string'
  ) {
    return false
  }

  const uploadedCsvArray = convertCsvStringToMultiArray(uploadedCsvString)
  const defaultCsvArray = convertCsvStringToMultiArray(defaultCsvString)
  if (!uploadedCsvArray || !defaultCsvArray) return false

  // ヘッダーのカラム数が一致するか確認
  if (uploadedCsvArray[0].length !== defaultCsvArray[0].length) return false

  // ヘッダーのカラム名が一致するか確認
  for (let i = 0; i < defaultCsvArray[0].length; i++) {
    if (!uploadedCsvArray[0][i] || defaultCsvArray[0][i] !== uploadedCsvArray[0][i]) return false
  }

  return true
}

module.exports = {
  validate,
  validateDuplicationAndUpload,
  validateInvoice,
  validateLine,
  validateHeader
}
