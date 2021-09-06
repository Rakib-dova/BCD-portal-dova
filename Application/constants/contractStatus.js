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
  SUCCESS: '請求書取込が完了しました。\n取込結果は一覧画面でご確認下さい。',
  INVOICE_FAILED:
    '請求書が100件超えています。\nCSVファイルを確認後もう一度アップロードしてください。\n（一度に取り込める請求書は100件までとなります。）',
  OVER_SPECIFICATION:
    '請求書取込が完了しました。\n取込に失敗した請求書が存在します。\n取込結果は一覧画面でご確認下さい。\n（明細数が200件超えた請求書は作成できません。）',
  OVERLAPPED_INVOICE:
    '請求書取込が完了しました。\n取込結果は一覧画面でご確認下さい。\n（請求書番号が重複する請求書は取込をスキップしました。）',
  INVOICE_VALIDATE_FAILED:
    '請求書取込が完了しました。\n取込に失敗した請求書が存在します。\n取込結果は一覧画面でご確認下さい。'
})
