const constantsDefine = require('node-constants')(exports)
const invoiceValidDefine = require('./invoiceValidDefine')
constantsDefine({
  // 請求書番号エラーメッセージ
  INVOICEIDERR000: `001、${invoiceValidDefine.INVOICEID_KEY}は、${invoiceValidDefine.INVOICEID_VALUE}文字以内で入力してください。`,
  INVOICEIDERR001: `002、${invoiceValidDefine.INVOICEID_KEY}は、${invoiceValidDefine.INVOICEID_VALUE}文字で入力してください。`,

  // 銀行名エラーメッセージ
  BANKNAMEERR000: `001、${invoiceValidDefine.BANKNAME_KEY}は、${invoiceValidDefine.BANKNAME_VALUE}文字以内で入力してください。`,
  BANKNAMEERR001: `002、${invoiceValidDefine.BANKNAME_KEY}は、${invoiceValidDefine.BANKNAME_VALUE}文字で入力してください。`,

  // 発行日エラーメッセージ
  ISSUEDATEERR000: `004、${invoiceValidDefine.ISSUEDATE_KEY}は、有効な日付を入力してください。`,
  ISSUEDATEERR001: `005、${invoiceValidDefine.ISSUEDATE_KEY}は、yyyy/mm/dd/形式で入力してください。`,

  // 明細-項目IDエラーメッセージ
  SELLERSITEMNUMERR000: `001、${invoiceValidDefine.SELLERSITEMNUM_KEY}は、${invoiceValidDefine.SELLERSITEMNUM_VALUE}文字以内で入力してください。`,
  SELLERSITEMNUMERR001: `002、${invoiceValidDefine.SELLERSITEMNUM_KEY}は、${invoiceValidDefine.SELLERSITEMNUM_VALUE}文字で入力してください。`,

  // 明細-内容エラーメッセージ
  ITEMNAMEERR000: `001、${invoiceValidDefine.ITEMNAME_KEY}は、${invoiceValidDefine.ITEMNAME_VALUE}文字以内で入力してください。`,
  ITEMNAMEERR001: `002、${invoiceValidDefine.ITEMNAME_KEY}は、${invoiceValidDefine.ITEMNAME_VALUE}文字で入力してください。`,

  // テナントIDエラーメッセージ
  TENANTERR000: `010、${invoiceValidDefine.TENANT_KEY}は、正しいテナントIDを入力してください。`,

  // 明細-数量エラーメッセージ
  QUANTITYVALUEERR000: `011、${invoiceValidDefine.QUANTITYVALUE_KEY}は、0 ~ ${invoiceValidDefine.QUANTITYVALUE_VALUE}範囲で入力してください。`,

  // 明細-単価エラーメッセージ
  PRICEVALUEERR000: `011、${invoiceValidDefine.PRICEVALUE_KEY}は、0 ~ ${invoiceValidDefine.PRICEVALUE_VALUE}範囲で入力してください。`,

  // 税エラーメッセージ
  TAXERR000: `009、${invoiceValidDefine.TAX_KEY}は、マニュアルに定義されたものの中から選択してください。`,

  // 単位エラーメッセージ
  UNITERR000: `009、${invoiceValidDefine.UNITCODE_KEY}は、マニュアルに定義されたものの中から選択してください。`
})
