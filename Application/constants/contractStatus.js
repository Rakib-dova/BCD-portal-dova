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
  SUCCESS: '請求書作成が完了しました。',
  INVOICE_FAILED: '請求書が100件超えています。\nCSVファイルを確認後もう一度アップロードしてください。',
  OVER_SPECIFICATION: '請求書作成が完了しました。\n（明細数が200件超えた請求書はスキップしました。）',
  OVERLAPPED_INVOICE: '請求書作成が完了しました。\n（請求書番号が重複する請求書はスキップしました。）'
})
