const constantsDefine = require('node-constants')(exports)
const invoiceValidDefine = require('./invoiceValidDefine')
constantsDefine({
  // 請求書番号エラーメッセージ
  INVOICEIDERR000: `${invoiceValidDefine.INVOICEID_KEY}は${invoiceValidDefine.INVOICEID_VALUE}文字以内で入力してください。`,
  INVOICEIDERR002: `${invoiceValidDefine.INVOICEID_KEY}が未入力です。`,

  // 銀行名エラーメッセージ
  BANKNAMEERR000: `${invoiceValidDefine.BANKNAME_KEY}は${invoiceValidDefine.BANKNAME_VALUE}文字以内で入力してください。`,
  BANKNAMEERR002: `${invoiceValidDefine.BANKNAME_KEY}が未入力です。`,

  // 発行日エラーメッセージ
  ISSUEDATEERR000: `${invoiceValidDefine.ISSUEDATE_KEY}は有効な日付を入力してください。`,
  ISSUEDATEERR001: `${invoiceValidDefine.ISSUEDATE_KEY}はyyyy/mm/dd/形式で入力してください。`,
  ISSUEDATEERR002: `${invoiceValidDefine.ISSUEDATE_KEY}が未入力です。`,

  // 支払期日エラーメッセージ
  PAYMENTDATEERR000: `${invoiceValidDefine.PAYMENTDATE_KEY}は有効な日付を入力してください。`,
  PAYMENTDATEERR001: `${invoiceValidDefine.PAYMENTDATE_KEY}はyyyy/mm/dd/形式で入力してください。`,
  PAYMENTDATEERR002: `${invoiceValidDefine.PAYMENTDATE_KEY}が未入力です。`,

  // 納品日エラーメッセージ
  DELIVERYDATEERR000: `${invoiceValidDefine.DELIVERYDATE_KEY}は有効な日付を入力してください。`,
  DELIVERYDATEERR001: `${invoiceValidDefine.DELIVERYDATE_KEY}はyyyy/mm/dd/形式で入力してください。`,

  // 備考
  FINANCIALINSTITUTIONERR000: `${invoiceValidDefine.FINANCIALINSTITUTION_KEY}は${invoiceValidDefine.FINANCIALINSTITUTION_VALUE}文字以内で入力してください。`,

  // 明細-項目IDエラーメッセージ
  SELLERSITEMNUMERR000: `${invoiceValidDefine.SELLERSITEMNUM_KEY}は${invoiceValidDefine.SELLERSITEMNUM_VALUE}文字以内で入力してください。`,
  SELLERSITEMNUMERR002: `${invoiceValidDefine.SELLERSITEMNUM_KEY}が未入力です。`,

  // 明細-内容エラーメッセージ
  ITEMNAMEERR000: `${invoiceValidDefine.ITEMNAME_KEY}は${invoiceValidDefine.ITEMNAME_VALUE}文字以内で入力してください。`,
  ITEMNAMEERR002: `${invoiceValidDefine.ITEMNAME_KEY}が未入力です。`,

  // テナントIDエラーメッセージ
  TENANTERR000: `${invoiceValidDefine.TENANT_KEY}は正しいテナントIDを入力してください。`,
  TENANTERR001: `${invoiceValidDefine.TENANT_KEY}が未入力です。`,

  // 明細-数量エラーメッセージ
  QUANTITYVALUEERR000: `${invoiceValidDefine.QUANTITYVALUE_KEY}は「0 ~ ${invoiceValidDefine.QUANTITYVALUE_MAX_VALUE}」の範囲で入力してください。`,
  QUANTITYVALUEERR001: `${invoiceValidDefine.QUANTITYVALUE_KEY}は${invoiceValidDefine.QUANTITYVALUE_NUM}で入力してください。`,
  QUANTITYVALUEERR002: `${invoiceValidDefine.QUANTITYVALUE_KEY}が未入力です。`,

  // 明細-単価エラーメッセージ
  PRICEVALUEERR000: `${invoiceValidDefine.PRICEVALUE_KEY}は「${invoiceValidDefine.PRICEVALUE_MIN_VALUE} ~ ${invoiceValidDefine.PRICEVALUE_MAX_VALUE}」の範囲で入力してください。`,
  PRICEVALUEERR001: `${invoiceValidDefine.PRICEVALUE_KEY}は${invoiceValidDefine.PRICEVALUE_NUM}で入力してください。`,
  PRICEVALUEERR002: `${invoiceValidDefine.PRICEVALUE_KEY}が未入力です。`,

  // 税エラーメッセージ
  TAXERR000: `${invoiceValidDefine.TAX_KEY}はマニュアルに定義されたものの中から選択してください。`,
  TAXERR001: `${invoiceValidDefine.TAX_KEY}が未入力です。`,
  TAXERR002: `${invoiceValidDefine.TAX_KEY}はフォーマットに定義されたものの中から選択してください。`,

  // 単位エラーメッセージ
  UNITERR000: `${invoiceValidDefine.UNITCODE_KEY}はマニュアルに定義されたものの中から選択してください。`,
  UNITERR001: `${invoiceValidDefine.UNITCODE_KEY}が未入力です。`,
  UNITERR002: `${invoiceValidDefine.UNITCODE_KEY}はフォーマットに定義されたものの中から選択してください。`,

  // ヘッダーエラーメッセージ
  HEADERERR000: 'ヘッダーが指定のものと異なります。',

  // 項目数エラーメッセージ
  COLUMNERR000: '項目数が異なります。',

  // 支店名エラーメッセージ
  FINANCIALNAMEERR000: `${invoiceValidDefine.FINANCIALNAME_KEY}は${invoiceValidDefine.FINANCIALNAME_VALUE}文字以内で入力してください。`,
  FINANCIALNAMEERR002: `${invoiceValidDefine.FINANCIALNAME_KEY}が未入力です。`,

  // 科目エラーメッセージ
  ACCOUNTTYPEERR000: `${invoiceValidDefine.ACCOUNTTYPE_KEY}はマニュアルに定義されたものの中から選択してください。`,
  ACCOUNTTYPEERR001: `${invoiceValidDefine.ACCOUNTTYPE_KEY}が未入力です。`,

  // 口座番号エラーメッセージ
  ACCOUNTIDERR000: `${invoiceValidDefine.ACCOUNTID_KEY}は${invoiceValidDefine.ACCOUNTID_VALUE}文字で入力してください。`,
  ACCOUNTIDERR001: `${invoiceValidDefine.ACCOUNTID_KEY}は${invoiceValidDefine.ACCOUNTID_NUM}で入力してください。`,
  ACCOUNTIDERR002: `${invoiceValidDefine.ACCOUNTID_KEY}が未入力です。`,

  // 口座名義エラーメッセージ
  ACCOUNTNAMEERR000: `${invoiceValidDefine.ACCOUNTNAME_KEY}は${invoiceValidDefine.ACCOUNTNAME_VALUE}文字以内で入力してください。`,
  ACCOUNTNAMEERR002: `${invoiceValidDefine.ACCOUNTNAME_KEY}が未入力です。`,

  // その他特記事項エラーメッセージ
  NOTEERR000: `${invoiceValidDefine.NOTE_KEY}は${invoiceValidDefine.NOTE_VALUE}文字以内で入力してください。`,

  // 明細-備考
  DESCRIPTIONERR000: `${invoiceValidDefine.DESCRIPTION_KEY}は${invoiceValidDefine.DESCRIPTION_VALUE}文字以内で入力してください。`,

  // ネットワーク接続エラーメッセージ
  NETERR000: `${invoiceValidDefine.NETWORK_KEY}はネットワーク接続済みのものを入力してください。`,

  // アップロード成功、スキップメッセージ
  SUCCESS: '正常に取込ました。',
  SKIP: '取込済みのため、処理をスキップしました。',
  HEADERBEFORERR: 'の先頭行にて不備があります。',

  // APIエラーメッセージ
  APIERROR: 'APIエラーです、時間を空けて再度実行をお願いいたします。',

  // システムエラーメッセージ
  SYSERROR: 'システムエラーです。（後程、接続してください）'
})
