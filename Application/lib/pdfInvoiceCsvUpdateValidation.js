const pdfInvoiceController = require('../controllers/pdfInvoiceController.js')
const logger = require('../lib/logger')

const saveRules = [
  {
    prop: 'invoiceNo',
    regexp: /^([a-zA-Z0-9]{1,50})$/,
    message: '請求書番号は半角英数字50文字以内で入力して下さい。',
    emptyMessage: '請求書番号を入力して下さい。',
    required: true,
    index: 0
  },
  {
    prop: 'paymentDate',
    customValidator: (value) => !isNaN(new Date(value).getDate()),
    regexp: '',
    message: '支払期日が不正な日付です。',
    index: 1
  },
  {
    prop: 'billingDate',
    customValidator: (value) => !isNaN(new Date(value).getDate()),
    regexp: '',
    message: '請求日が不正な日付です。',
    index: 2
  },
  {
    prop: 'deliveryDate',
    regexp: '',
    message: '納品日が不正な日付です。',
    index: 3
  },
  {
    prop: 'recCompany',
    regexp: /^.{1,200}$/,
    message: '宛先企業は200文字以内で入力して下さい。',
    index: 4
  },
  {
    prop: 'recPost',
    regexp: /[0-9]{7}/,
    message: '宛先郵便番号は数字7桁で入力して下さい。',
    index: 5
  },
  {
    prop: 'recAddr1',
    regexp: /^.{1,7}$/,
    message: '宛先都道府県は10文字以内で入力して下さい。',
    index: 6
  },
  {
    prop: 'recAddr2',
    regexp: /^.{1,50}$/,
    message: '宛先住所は50文字以内で入力して下さい。',
    index: 7
  },
  {
    prop: 'recAddr3',
    regexp: /^.{0,50}$/,
    message: '宛先ビル名/フロア等は50文字以内で入力して下さい。',
    index: 8
  },
  {
    prop: 'bankName',
    regexp: /^.{0,50}$/,
    message: '銀行名は50文字以内で入力して下さい。',
    index: 9
  },
  {
    prop: 'branchName',
    regexp: /^.{0,50}$/,
    message: '支店名は50文字以内で入力して下さい。',
    index: 10
  },
  {
    prop: 'accountType',
    regexp: /普通|当座/,
    message: '科目は「当座」または「普通」で入力して下さい。',
    index: 11
  },
  {
    prop: 'accountNumber',
    regexp: /^([0-9]{7})$/,
    message: '口座番号は数字7桁で入力して下さい。',
    index: 12
  },
  {
    prop: 'accountName',
    regexp: /^.{0,50}$/,
    message: '口座名義は50文字以内で入力して下さい。',
    index: 13
  },
  {
    prop: 'note',
    regexp: /^.{0,1500}$/,
    message: '備考は1500文字以内で入力して下さい。',
    required: false,
    index: 14
  },
  {
    prop: 'lineId',
    regexp: /^([a-zA-Z0-9-]{0,5})$/,
    message: '明細-項目IDは半角英数字半角ハイフン5文字以内で入力してください。',
    index: 15
  },
  {
    prop: 'lineDiscription',
    regexp: /^.{0,100}$/,
    message: '明細-内容は100文字以内で入力してください。',
    index: 16
  },
  {
    prop: 'quantity',
    customValidator: (value) => value > 0 && value <= 1000000000000,
    regexp: '',
    message: '明細-数量は整数or少数 0 ～ 1000000000000 の範囲で入力してください。',
    index: 17
  },
  {
    prop: 'unit',
    regexp: /^.{0,10}$/,
    message: '明細-単位は10文字以内で入力してください。',
    index: 18
  },
  {
    prop: 'unitPrice',
    regexp: /^[0-9]{0,12}$/,
    message: '明細-単価は整数 0 ～ 999999999999 の範囲で入力してください。',
    index: 19
  },
  {
    prop: 'taxType',
    regexp: /消費税|軽減税率|不課税|免税|非課税/,
    message: '明細-税は消費税／軽減税率／不課税／免税／非課税で入力して下さい。',
    index: 20
  }
]

function validate(uploadData) {
  const results = []
  let targetId = ''
  let errFlg = false
  let lineCnt = 1

  Object.keys(uploadData).forEach(function (key) {
    const lines = uploadData[key]

    // 請求書番号 重複チェック
    const duplicateResult = pdfInvoiceController.findInvoice({
      invoiceId: key
    })

    if (!duplicateResult) {
      // スキップ
      for (let i = lineCnt; i < lineCnt + lines.length; i++) {
        results.push({
          line: i + 1,
          invoiceId: key,
          status: 1,
          errorData: '取込済みのため、処理をスキップしました。'
        })
      }
      lineCnt = lineCnt + lines.length
      return
    }

    for (let i = 0; i < lines.length; i++) {
      const items = lines[i]

      if (errFlg && targetId === items[0]) {
        // 同一請求書番号ですでにエラーがある場合、スキップ
        results.push({ line: i + 1, invoiceId: items[0], status: -1, errorData: '同一請求書でエラーがあります。' })
        continue
      }
      if (targetId !== items[0]) {
        targetId = items[0]
        errFlg = false
      }

      let msg = ''
      saveRules.forEach((rule) => {
        if (!items[rule.index] && rule.required) {
          // 必須エラー
          errFlg = true
          msg = msg + rule.message + '\r\n'
        } else if (!items[rule.index]) {
          // 空の場合、スキップ
        } else if (rule.customValidator && !rule.customValidator(items[rule.index])) {
          errFlg = true
          msg = msg + rule.message + '\r\n'
        } else if (rule.regexp && !rule.regexp.test(items[rule.index])) {
          errFlg = true
          msg = msg + rule.message + '\r\n'
        }
      })

      if (errFlg) {
        results.push({ line: i + 1, invoiceId: items[0], status: -1, errorData: msg })
      } else {
        results.push({ line: i + 1, invoiceId: items[0], status: 0, errorData: '' })
      }
    }
    lineCnt = lineCnt + lines.length
  })

  return results
}

function createInvoiceObj(line) {
  const invoiceObj = {}
  saveRules.forEach((rule) => {
    invoiceObj[rule.prop] = line[[rule.index]]
  })

  return invoiceObj
}

module.exports = { validate: validate, createInvoiceObj: createInvoiceObj }
