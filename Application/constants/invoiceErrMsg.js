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

  // 支払期日エラーメッセージ
  PAYMENTDATEERR000: `004、${invoiceValidDefine.PAYMENTDATE_KEY}は、有効な日付を入力してください。`,
  PAYMENTDATEERR001: `005、${invoiceValidDefine.PAYMENTDATE_KEY}は、yyyy/mm/dd/形式で入力してください。`,

  // 納品日エラーメッセージ
  DELIVERYDATEERR000: `004、${invoiceValidDefine.DELIVERYDATE_KEY}は、有効な日付を入力してください。`,
  DELIVERYDATEERR001: `005、${invoiceValidDefine.DELIVERYDATE_KEY}は、yyyy/mm/dd/形式で入力してください。`,

  // 備考
  FINANCIALINSTITUTIONERR000: `001、${invoiceValidDefine.FINANCIALINSTITUTION_KEY}は、${invoiceValidDefine.FINANCIALINSTITUTION_VALUE}文字以内で入力してください。`,
  FINANCIALINSTITUTIONERR001: `002、${invoiceValidDefine.FINANCIALINSTITUTION_KEY}は、${invoiceValidDefine.FINANCIALINSTITUTION_VALUE}文字で入力してください。`,

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
  QUANTITYVALUEERR001: `002、${invoiceValidDefine.QUANTITYVALUE_KEY}は、${invoiceValidDefine.QUANTITYVALUE_NUM}で入力してください。`,

  // 明細-単価エラーメッセージ
  PRICEVALUEERR000: `011、${invoiceValidDefine.PRICEVALUE_KEY}は、0 ~ ${invoiceValidDefine.PRICEVALUE_VALUE}範囲で入力してください。`,
  PRICEVALUEERR001: `002、${invoiceValidDefine.PRICEVALUE_KEY}は、${invoiceValidDefine.PRICEVALUE_NUM}で入力してください。`,

  // 税エラーメッセージ
  TAXERR000: `009、${invoiceValidDefine.TAX_KEY}は、マニュアルに定義されたものの中から選択してください。`,

  // 単位エラーメッセージ
  UNITERR000: `009、${invoiceValidDefine.UNITCODE_KEY}は、マニュアルに定義されたものの中から選択してください。`,

  // ヘッダーエラーメッセージ
  HEADERERR000: '007、ヘッダーが指定のものと異なります。',

  // 項目数エラーメッセージ
  COLUMNERR000: '008、項目数が異なります。',

  // 支店名エラーメッセージ
  FINANCIALNAMEERR000: `001、${invoiceValidDefine.FINANCIALNAME_KEY}は、${invoiceValidDefine.FINANCIALNAME_VALUE}文字以内で入力してください。`,
  FINANCIALNAMEERR001: `002、${invoiceValidDefine.FINANCIALNAME_KEY}は、${invoiceValidDefine.FINANCIALNAME_VALUE}文字で入力してください。`,

  // 科目エラーメッセージ
  ACCOUNTTYPEERR000: `009、${invoiceValidDefine.ACCOUNTTYPE_KEY}は、マニュアルに定義されたものの中から選択してください。`,

  // 口座番号エラーメッセージ
  ACCOUNTIDERR000: `001、${invoiceValidDefine.ACCOUNTID_KEY}は、${invoiceValidDefine.ACCOUNTID_VALUE}文字以内で入力してください。`,
  ACCOUNTIDERR001: `002、${invoiceValidDefine.ACCOUNTID_KEY}は、${invoiceValidDefine.ACCOUNTID_NUM}で入力してください。`,

  // 口座名義エラーメッセージ
  ACCOUNTNAMEERR000: `001、${invoiceValidDefine.ACCOUNTNAME_KEY}は、${invoiceValidDefine.ACCOUNTNAME_VALUE}文字以内で入力してください。`,
  ACCOUNTNAMERR001: `002、${invoiceValidDefine.ACCOUNTNAME_KEY}は、${invoiceValidDefine.ACCOUNTNAME_VALUE}文字で入力してください。`,

  // その他特事項エラーメッセージ
  NOTEERR000: `001、${invoiceValidDefine.NOTE_KEY}は、${invoiceValidDefine.NOTE_VALUE}文字以内で入力してください。`,
  NOTEERR001: `002、${invoiceValidDefine.NOTE_KEY}は、${invoiceValidDefine.NOTE_VALUE}文字で入力してください。`,

  // 明細-備考
  DESCRIPTIONERR000: `001、${invoiceValidDefine.DESCRIPTION_KEY}は、${invoiceValidDefine.DESCRIPTION_VALUE}文字以内で入力してください。`,
  DESCRIPTIONERR001: `002、${invoiceValidDefine.DESCRIPTION_KEY}は、${invoiceValidDefine.DESCRIPTION_VALUE}文字で入力してください。`
})
