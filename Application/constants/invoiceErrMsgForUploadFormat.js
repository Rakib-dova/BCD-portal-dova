const constantsDefine = require('node-constants')(exports)
const invoiceValidDefine = require('./invoiceValidDefine')
constantsDefine({
  // 請求書番号エラーメッセージ
  INVOICEIDERR000: `は${invoiceValidDefine.INVOICEID_VALUE}文字以内で入力してください。`,
  INVOICEIDERR002: 'が未入力です。',

  // 銀行名エラーメッセージ
  BANKNAMEERR000: `は${invoiceValidDefine.BANKNAME_VALUE}文字以内で入力してください。`,
  BANKNAMEERR002: 'が未入力です。',

  // 発行日エラーメッセージ
  ISSUEDATEERR000: 'は有効な日付を入力してください。',
  ISSUEDATEERR001: 'はyyyy/mm/dd/形式で入力してください。',
  ISSUEDATEERR002: 'が未入力です。',

  // 支払期日エラーメッセージ
  PAYMENTDATEERR000: 'は有効な日付を入力してください。',
  PAYMENTDATEERR001: 'はyyyy/mm/dd/形式で入力してください。',
  PAYMENTDATEERR002: 'が未入力です。',

  // 納品日エラーメッセージ
  DELIVERYDATEERR000: 'は有効な日付を入力してください。',
  DELIVERYDATEERR001: 'はyyyy/mm/dd/形式で入力してください。',

  // 備考
  FINANCIALINSTITUTIONERR000: `は${invoiceValidDefine.FINANCIALINSTITUTION_VALUE}文字以内で入力してください。`,

  // 明細-項目IDエラーメッセージ
  SELLERSITEMNUMERR000: `は${invoiceValidDefine.SELLERSITEMNUM_VALUE}文字以内で入力してください。`,
  SELLERSITEMNUMERR002: 'が未入力です。',

  // 明細-内容エラーメッセージ
  ITEMNAMEERR000: `は${invoiceValidDefine.ITEMNAME_VALUE}文字以内で入力してください。`,
  ITEMNAMEERR002: 'が未入力です。',

  // テナントIDエラーメッセージ
  TENANTERR000: 'は正しいテナントIDを入力してください。',
  TENANTERR001: 'が未入力です。',

  // 明細-数量エラーメッセージ
  QUANTITYVALUEERR000: `は「0 ~ ${invoiceValidDefine.QUANTITYVALUE_MAX_VALUE}」の範囲で入力してください。`,
  QUANTITYVALUEERR001: `は${invoiceValidDefine.QUANTITYVALUE_NUM}で入力してください。`,
  QUANTITYVALUEERR002: 'が未入力です。',

  // 明細-単価エラーメッセージ
  PRICEVALUEERR000: `は「${invoiceValidDefine.PRICEVALUE_MIN_VALUE} ~ ${invoiceValidDefine.PRICEVALUE_MAX_VALUE}」の範囲で入力してください。`,
  PRICEVALUEERR001: `は${invoiceValidDefine.PRICEVALUE_NUM}で入力してください。`,
  PRICEVALUEERR002: 'が未入力です。',

  // 税エラーメッセージ
  TAXERR000: 'はマニュアルに定義されたものの中から選択してください。',
  TAXERR001: 'が未入力です。',
  TAXERR002: 'はフォーマットに定義されたものの中から選択してください。',

  // 単位エラーメッセージ
  UNITERR000: 'はフォーマットに定義されたものの中から選択してください。',
  UNITERR001: 'が未入力です。',

  // ヘッダーエラーメッセージ
  HEADERERR000: 'ヘッダーが指定のものと異なります。',

  // 項目数エラーメッセージ
  COLUMNERR000: '項目数が異なります。',

  // 支店名エラーメッセージ
  FINANCIALNAMEERR000: `は${invoiceValidDefine.FINANCIALNAME_VALUE}文字以内で入力してください。`,
  FINANCIALNAMEERR002: 'が未入力です。',

  // 科目エラーメッセージ
  ACCOUNTTYPEERR000: 'はフォーマットに定義されたものの中から選択してください。',
  ACCOUNTTYPEERR001: 'が未入力です。',

  // 口座番号エラーメッセージ
  ACCOUNTIDERR000: `は${invoiceValidDefine.ACCOUNTID_VALUE}文字で入力してください。`,
  ACCOUNTIDERR001: `は${invoiceValidDefine.ACCOUNTID_NUM}で入力してください。`,
  ACCOUNTIDERR002: 'が未入力です。',

  // 口座名義エラーメッセージ
  ACCOUNTNAMEERR000: `は${invoiceValidDefine.ACCOUNTNAME_VALUE}文字以内で入力してください。`,
  ACCOUNTNAMEERR002: 'が未入力です。',

  // その他特記事項エラーメッセージ
  NOTEERR000: `は${invoiceValidDefine.NOTE_VALUE}文字以内で入力してください。`,

  // 明細-備考
  DESCRIPTIONERR000: `は${invoiceValidDefine.DESCRIPTION_VALUE}文字以内で入力してください。`,

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
