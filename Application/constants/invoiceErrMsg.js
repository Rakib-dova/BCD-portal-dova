const constantsDefine = require('node-constants')(exports)
const invoiceValidDefine = require('./invoiceValidDefine')
constantsDefine({
  // 請求書番号エラーメッセージ
  INVOICEIDERR000: `001、${invoiceValidDefine.INVOICEID_KEY}は、${invoiceValidDefine.INVOICEID_VALUE}文字以内で入力してください。`,
  INVOICEIDERR001: `002、${invoiceValidDefine.INVOICEID_KEY}は、${invoiceValidDefine.INVOICEID_VALUE}文字で入力してください。`,

  // 銀行名エラーメッセージ
  BANKNAMEERR000: `001、${invoiceValidDefine.BANKNAME_KEY}は、${invoiceValidDefine.BANKNAME_VALUE}文字以内で入力してください。`,
  BANKNAMEERR001: `002、${invoiceValidDefine.BANKNAME_KEY}は、${invoiceValidDefine.BANKNAME_VALUE}文字で入力してください。`
})
