const constantsDefine = require('node-constants')(exports)
constantsDefine({
  // 契約ステータス
  onContract: '00',
  canceledContract: '99',
  contractStatusNewContractOrder: '10',
  contractStatusNewContractReceive: '11',
  contractStatusChangeContractOrder: '20',
  contractStatusChangeContractReceive: '21',
  contractStatusCancellationOrder: '30',
  contractStatusCancellationReceive: '31',

  // orderType
  orderTypeNewOrder: '010',
  orderTypeChangeOrder: '020',
  orderTypeCancelOrder: '030',
  orderTypeSimpleChangeOrder: '040',

  // 変更有無
  contractChange: '1'
})
