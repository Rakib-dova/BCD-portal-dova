const logger = require('./logger')

const saveRules = [
  {
    prop: 'invoiceNo',
    regexp: /^([a-zA-Z0-9]{1,50})$/,
    message: '請求書番号は半角英数字50文字以内で入力して下さい。',
    emptyMessage: '請求書番号を入力して下さい。',
    required: true,
    no: 1
  },
  {
    prop: 'paymentDate',
    regexp: '',
    message: '支払期日が不正な日付です。',
    no: 2
  },
  {
    prop: 'billingDate',
    regexp: '',
    message: '請求日が不正な日付です。',
    no: 3
  },
  {
    prop: 'deliveryDate',
    regexp: '',
    message: '納品日が不正な日付です。',
    no: 4
  },
  {
    prop: 'recCompany',
    regexp: /^.{1,200}$/,
    message: '宛先企業は200文字以内で入力して下さい。',
    no: 5
  },
  {
    prop: 'recPost',
    regexp: /[0-9]{7}/,
    message: '宛先郵便番号は数字7桁で入力して下さい。',
    no: 6
  },
  {
    prop: 'recAddr1',
    regexp: /^.{1,7}$/,
    message: '宛先都道府県は10文字以内で入力して下さい。',
    no: 7
  },
  {
    prop: 'recAddr2',
    regexp: /^.{1,50}$/,
    message: '宛先住所は50文字以内で入力して下さい。',
    no: 8
  },
  {
    prop: 'recAddr3',
    regexp: /^.{0,50}$/,
    message: '宛先ビル名/フロア等は50文字以内で入力して下さい。',
    no: 9
  },
  {
    prop: 'bankName',
    regexp: /^.{0,50}$/,
    message: '銀行名は50文字以内で入力して下さい。',
    no: 10
  },
  {
    prop: 'branchName',
    regexp: /^.{0,50}$/,
    message: '支店名は50文字以内で入力して下さい。',
    no: 11
  },
  {
    prop: 'accountType',
    regexp: /普通|当座/,
    message: '科目は「当座」または「普通」で入力して下さい。',
    no: 12
  },
  {
    prop: 'accountNumber',
    regexp: /^([0-9]{7})$/,
    message: '口座番号は数字7桁で入力して下さい。',
    no: 13
  },
  {
    prop: 'accountName',
    regexp: /^.{0,50}$/,
    message: '口座名義は50文字以内で入力して下さい。',
    no: 14
  },
  {
    prop: 'note',
    regexp: /^.{0,1500}$/,
    message: '備考は1500文字以内で入力して下さい。',
    required: false,
    no: 15
  },
  {
    prop: 'lineId',
    regexp: /^([a-zA-Z0-9-]{0,5})$/,
    message: '明細-項目IDは半角英数字半角ハイフン5文字以内で入力してください。',
    no: 16
  },
  {
    prop: 'lineDiscription',
    regexp: /^.{0,100}$/,
    message: '明細-内容は100文字以内で入力してください。',
    no: 17
  },
  {
    prop: 'quantity',
    customValidator: (value) => value > 0 && value <= 1000000000000,
    regexp: '',
    message: '明細-数量は整数or少数 0 ～ 1000000000000 の範囲で入力してください。',
    no: 18
  },
  {
    prop: 'unit',
    regexp: /^.{0,10}$/,
    message: '明細-単位は10文字以内で入力してください。',
    no: 19
  },
  {
    prop: 'unitPrice',
    regexp: /^[0-9]{0,12}$/,
    message: '明細-単価は整数 0 ～ 999999999999 の範囲で入力してください。',
    no: 20
  },
  {
    prop: 'taxType',
    regexp: /消費税|軽減税率|不課税|免税|非課税/,
    message: '明細-税は消費税／軽減税率／不課税／免税／非課税で入力して下さい。',
    no: 21
  }
]

function validate(lines, defaultCsvData) {
  const err = []

  lines.forEach((line, i) => {
    if (i === 0) {
      // ヘッダーチェック
      if (line !== defaultCsvData) {
        err.push = { line: i, invoiceId: '-', message: 'ヘッダーが不正です。' }
      }
    } else {
      saveRules.forEach((rule) => {
        if (!line[rule.prop] && rule.required) {
          err.push = { line: i + 1, invoiceId: line.invoiceId, message: rule.emptyMessage }
        } else if (!line[rule.prop]) return // eslint-disable-line
        else if (rule.customValidator && !rule.customValidator(line[rule.prop])) {
          if (!line[rule.prop] && rule.required) {
            err.push = { line: i + 1, invoiceId: line.invoiceId, message: rule.message }
          }
        } else if (rule.regexp && !rule.regexp.test(line[rule.prop])) {
          err.push = { line: i + 1, invoiceId: line.invoiceId, message: rule.message }
        }
      })
    }
  })

  logger.info('=====  バリデーションの結果: ', err)
  return err
}

module.exports = { validate: validate }
