const constantsDefine = require('node-constants')(exports)
constantsDefine({
  // 契約ステータス
  onContract: '00',
  canceledContract: '99',
  contractStatusNewContractOrder: '10',
  contractStatusNewContractReceive: '11',
  contractStatusCancellationOrder: '30',
  contractStatusCancellationReceive: '31',
  contractStatusSimpleChangeContractOrder: '40',
  contractStatusSimpleChangeContractReceive: '41',

  // orderType
  orderTypeNewOrder: '010',
  orderTypeChangeOrder: '020',
  orderTypeCancelOrder: '030',
  orderTypeSimpleChangeOrder: '040',

  // 変更有無
  contractChange: '1',

  // CSVアップロード結果文言
  SUCCESS: '請求書取込が完了しました。\n（反映には時間がかかる場合がございます。）\n取込結果は一覧画面でご確認下さい。',
  INVOICE_FAILED:
    '請求書が100件超えています。\nCSVファイルを確認後もう一度アップロードしてください。\n（一度に取り込める請求書は100件までとなります。）',
  OVER_SPECIFICATION:
    '請求書取込が完了しました。\n（反映には時間がかかる場合がございます。）\n取込に失敗した請求書が存在します。\n取込結果は一覧画面でご確認下さい。\n（明細数が200件超えた請求書は作成できません。）',
  OVERLAPPED_INVOICE:
    '請求書取込が完了しました。\n（反映には時間がかかる場合がございます。）\n取込結果は一覧画面でご確認下さい。\n（請求書番号が重複する請求書は取込をスキップしました。）',
  INVOICE_VALIDATE_FAILED:
    '請求書取込が完了しました。\n（反映には時間がかかる場合がございます。）\n取込に失敗した請求書が存在します。\n取込結果は一覧画面でご確認下さい。',
  SYSTEMERRORMESSAGE: 'システムエラーが発生しました。\n時間を空けてもう一度アップロードしてください。',

  // CSVダウンロード結果文言
  CSVDOWNLOAD_APIERROR: 'APIエラーが発生しました。時間を空けてもう一度試してください。',
  CSVDOWNLOAD_SYSERROR: 'システムエラーが発生しました。時間を空けてもう一度試してください。',

  // 支払依頼一覧のエラーメッセージの集合所
  INBOXLIST_CONTACT_EMAIL_NOT_VERIFY_TYPE: '入力したメールアドレスに誤りがあります。',
  INBOXLIST_CONTACT_EMAIL_NOT_VERIFY_SPACE: '半角スペースは引用符号（"）の内のみ許可されています。',
  INVOICE_CONTACT_EMAIL_NOT_VERIFY: '担当者メールアドレスに誤りがあります。',
  FAILED_TO_CREATE_TAG: 'タグ作成に失敗しました。'
})
