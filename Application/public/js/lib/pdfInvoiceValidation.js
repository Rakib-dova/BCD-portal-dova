/* global $, getSubTotal */

const headerErrorDiv = $('#header-error')
const linesErrorDiv = $('#lines-error')
const footerErrorDiv = $('#footer-error')
const taxModalErrorDiv = $('#tax-error')

// eslint-disable-next-line no-unused-vars
const saveRules = [
  {
    target: 'invoice',
    displayLocation: 'header',
    prop: 'invoiceNo',
    regexp: /^([a-zA-Z0-9]{1,50})$/,
    message: '請求書番号は半角英数字50文字以内で入力して下さい。',
    emptyMessage: '請求書番号が空欄のため、請求情報が不完全です。入力して下さい。',
    required: true
  },
  {
    target: 'invoice',
    displayLocation: 'header',
    prop: 'billingDate',
    regexp: '',
    message: '',
    emptyMessage: '請求日が空欄のため、請求情報が不完全です。入力して下さい。',
    required: false
  },
  {
    target: 'invoice',
    displayLocation: 'header',
    prop: 'deliveryDate',
    regexp: '',
    message: '',
    emptyMessage: '納品日が空欄のため、請求情報が不完全です。入力して下さい。',
    required: false
  },
  {
    target: 'invoice',
    displayLocation: 'header',
    prop: 'paymentDate',
    regexp: '',
    message: '',
    emptyMessage: '支払期限が空欄のため、請求情報が不完全です。入力して下さい。',
    required: false
  },
  {
    target: 'invoice',
    displayLocation: 'header',
    prop: 'recCompany',
    regexp: /^.{1,200}$/,
    message: '宛先企業は200文字以内で入力して下さい。',
    emptyMessage: '宛先企業が空欄のため、宛先情報が不完全です。入力して下さい。',
    required: true
  },
  {
    target: 'invoice',
    displayLocation: 'header',
    prop: 'recPost',
    regexp: /^[0-9]{3}-[0-9]{4}$/,
    message: '宛先郵便番号は 数字3桁 - 数字4桁 で入力して下さい。',
    emptyMessage: '宛先郵便番号が空欄のため、宛先情報が不完全です。入力して下さい。',
    required: false
  },
  {
    target: 'invoice',
    displayLocation: 'header',
    prop: 'recAddr1',
    regexp: /^.{1,10}$/,
    message: '都道府県は10文字以内で入力して下さい。',
    emptyMessage: '都道府県が空欄のため、宛先情報が不完全です。入力して下さい。',
    required: false
  },
  {
    target: 'invoice',
    displayLocation: 'header',
    prop: 'recAddr2',
    regexp: /^.{1,50}$/,
    message: '住所は50文字以内で入力して下さい。',
    emptyMessage: '住所が空欄のため、宛先情報が不完全です。入力して下さい。',
    required: false
  },
  {
    target: 'invoice',
    displayLocation: 'header',
    prop: 'recAddr3',
    regexp: /^.{0,50}$/,
    message: 'ビル名/フロア等は50文字以内で入力して下さい。',
    emptyMessage: '',
    required: false
  },
  {
    target: 'invoice',
    displayLocation: 'header',
    prop: 'sendRegistrationNo',
    regexp: /^T\d{13}$/,
    message: '登録番号は"T"+半角数字13桁で入力してください。',
    required: false
  },
  {
    target: 'invoice',
    displayLocation: 'footer',
    prop: 'bankName',
    regexp: /^.{0,50}$/,
    message: '銀行名は50文字以内で入力して下さい。',
    emptyMessage: '銀行名が空欄のため、支払い情報が不完全です。入力して下さい。',
    required: false
  },
  {
    target: 'invoice',
    displayLocation: 'footer',
    prop: 'branchName',
    regexp: /^.{0,50}$/,
    message: '支店名は50文字以内で入力して下さい。',
    emptyMessage: '支店名が空欄のため、支払い情報が不完全です。入力して下さい。',
    required: false
  },
  {
    target: 'invoice',
    displayLocation: 'footer',
    prop: 'accountType',
    regexp: /普通|当座/,
    message: '科目は「当座」または「普通」で入力して下さい。',
    emptyMessage: '科目が空欄のため、支払い情報が不完全です。入力して下さい。',
    required: false
  },
  {
    target: 'invoice',
    displayLocation: 'footer',
    prop: 'accountName',
    regexp: /^.{0,50}$/,
    message: '口座名義は50文字以内で入力して下さい。',
    emptyMessage: '口座名義が空欄のため、支払い情報が不完全です。入力して下さい。',
    required: false
  },
  {
    target: 'invoice',
    displayLocation: 'footer',
    prop: 'accountNumber',
    regexp: /^([0-9]{7})$/,
    message: '口座番号は数字7桁で入力して下さい。',
    emptyMessage: '口座番号が空欄のため、支払い情報が不完全です。入力して下さい。',
    required: false
  },
  {
    target: 'invoice',
    displayLocation: 'footer',
    prop: 'note',
    regexp: /^\s|\S{0,400}$/,
    message: '備考は400文字以内で入力して下さい。',
    required: false
  },
  {
    target: 'invoice-discount',
    displayLocation: 'lines',
    prop: 'discountDescription1',
    regexp: /^.{0,100}$/,
    message: '1番目の割引の内容は100文字以内で入力してください。',
    emptyMessage: '1番目の割引の内容が空欄のため、明細情報が不完全です。入力して下さい。',
    required: false
  },
  {
    target: 'invoice-discount',
    displayLocation: 'lines',
    prop: 'discountDescription2',
    regexp: /^.{0,100}$/,
    message: '2番目の割引の内容は100文字以内で入力してください。',
    emptyMessage: '2番目の割引の内容が空欄のため、明細情報が不完全です。入力して下さい。',
    required: false
  },
  {
    target: 'invoice-discount',
    displayLocation: 'lines',
    prop: 'discountDescription3',
    regexp: /^.{0,100}$/,
    message: '3番目の割引の内容は100文字以内で入力してください。',
    emptyMessage: '3番目の割引の内容が空欄のため、明細情報が不完全です。入力して下さい。',
    required: false
  },
  {
    target: 'invoice-discount',
    displayLocation: 'lines',
    prop: 'discountAmount1',
    customValidator: (value) => value > 0 && value <= 999999999999.999,
    regexp: '',
    message: '1番目の割引の数値は整数or少数 0 ～ 999999999999.999 の範囲で入力してください。',
    emptyMessage: '1番目の割引の数値が空欄のため、明細情報が不完全です。入力して下さい。',
    required: false
  },
  {
    target: 'invoice-discount',
    displayLocation: 'lines',
    prop: 'discountAmount2',
    customValidator: (value) => value > 0 && value <= 999999999999.999,
    regexp: '',
    message: '2番目の割引の数値は整数or少数 0 ～ 999999999999.999 の範囲で入力してください。',
    emptyMessage: '2番目の割引の数値が空欄のため、明細情報が不完全です。入力して下さい。',
    required: false
  },
  {
    target: 'invoice-discount',
    displayLocation: 'lines',
    prop: 'discountAmount3',
    customValidator: (value) => value > 0 && value <= 999999999999.999,
    regexp: '',
    message: '3番目の割引の数値は整数or少数 0 ～ 999999999999.999 の範囲で入力してください。',
    emptyMessage: '3番目の割引の数値が空欄のため、明細情報が不完全です。入力して下さい。',
    required: false
  },

  {
    target: 'lines',
    displayLocation: 'lines',
    prop: 'lineId',
    regexp: /^([a-zA-Z0-9-]{0,5})$/,
    message: '項目IDは半角英数字半角ハイフン5文字以内で入力してください。',
    emptyMessage: '項目IDが空欄のため、明細情報が不完全です。入力して下さい。',
    required: false
  },
  {
    target: 'lines',
    displayLocation: 'lines',
    prop: 'lineDescription',
    regexp: /^.{0,100}$/,
    message: '内容は100文字以内で入力してください。',
    emptyMessage: '内容が空欄のため、明細情報が不完全です。入力して下さい。',
    required: false
  },
  {
    target: 'lines',
    displayLocation: 'lines',
    prop: 'quantity',
    customValidator: (value) => value > 0 && value <= 999999999999.999,
    regexp: '',
    message: '数量は整数or少数 0 ～ 999999999999.999 の範囲で入力してください。',
    emptyMessage: '数量が空欄のため、明細情報が不完全です。入力して下さい。',
    required: false
  },
  {
    target: 'lines',
    displayLocation: 'lines',
    prop: 'unit',
    regexp: /^.{0,10}$/,
    message: '単位は10文字以内で入力してください。',
    emptyMessage: '単位が空欄のため、明細情報が不完全です。入力して下さい。',
    required: false
  },
  {
    target: 'lines',
    displayLocation: 'lines',
    prop: 'unitPrice',
    regexp: /^[0-9]{0,12}$/,
    message: '単価は整数 0 ～ 999999999999 の範囲で入力してください。',
    emptyMessage: '単価が空欄のため、明細情報が不完全です。入力して下さい。',
    required: false
  },
  {
    target: 'lines',
    displayLocation: 'lines',
    prop: 'taxType',
    regexp: '',
    message: '',
    emptyMessage: '税が選択されていないので、明細情報が不完全です。選択して下さい。',
    required: false
  },
  {
    target: 'lines',
    displayLocation: 'lines',
    prop: 'discountDescription1',
    regexp: /^.{0,100}$/,
    message: '項目割引1の内容は100文字以内で入力してください。',
    emptyMessage: '項目割引1の内容が空欄のため、明細情報が不完全です。入力して下さい。',
    discount: 1,
    required: false
  },
  {
    target: 'lines',
    displayLocation: 'lines',
    prop: 'discountDescription2',
    regexp: /^.{0,100}$/,
    message: '項目割引2の内容は100文字以内で入力してください。',
    emptyMessage: '項目割引2の内容が空欄のため、明細情報が不完全です。入力して下さい。',
    discount: 2,
    required: false
  },
  {
    target: 'lines',
    displayLocation: 'lines',
    prop: 'discountDescription3',
    regexp: /^.{0,100}$/,
    message: '項目割引3の内容は100文字以内で入力してください。',
    emptyMessage: '項目割引3の内容が空欄のため、明細情報が不完全です。入力して下さい。',
    discount: 3,
    required: false
  },
  {
    target: 'lines',
    displayLocation: 'lines',
    prop: 'discountAmount1',
    customValidator: (value) => value > 0 && value <= 999999999999.999,
    regexp: '',
    message: '項目割引1の数値は整数or少数 0 ～ 999999999999.999 の範囲で入力してください。',
    emptyMessage: '項目割引1の数値が空欄のため、明細情報が不完全です。入力して下さい。',
    discount: 1,
    required: false
  },
  {
    target: 'lines',
    displayLocation: 'lines',
    prop: 'discountAmount2',
    customValidator: (value) => value > 0 && value <= 999999999999.999,
    regexp: '',
    message: '項目割引2の数値は整数or少数 0 ～ 999999999999.999 の範囲で入力してください。',
    emptyMessage: '項目割引2の数値が空欄のため、明細情報が不完全です。入力して下さい。',
    discount: 2,
    required: false
  },
  {
    target: 'lines',
    displayLocation: 'lines',
    prop: 'discountAmount3',
    customValidator: (value) => value > 0 && value <= 999999999999.999,
    regexp: '',
    message: '項目割引3の数値は整数or少数 0 ～ 999999999999.999 の範囲で入力してください。',
    emptyMessage: '項目割引3の数値が空欄のため、明細情報が不完全です。入力して下さい。',
    discount: 3,
    required: false
  },

  {
    target: 'option',
    displayLocation: 'header',
    prop: 'fileSize',
    customValidator: (value) => value && value <= 1048576,
    regexp: '',
    message: '印影ファイルのサイズは1MB以下にしてください。',
    required: false
  }
]

// eslint-disable-next-line no-unused-vars
const outputRules = [
  {
    target: 'invoice',
    displayLocation: 'header',
    prop: 'invoiceNo',
    regexp: /^([a-zA-Z0-9]{1,50})$/,
    message: '請求書番号は半角英数字50文字以内で入力して下さい。',
    emptyMessage: '請求書番号が空欄のため、請求情報が不完全です。入力して下さい。',
    required: true
  },
  // {
  //   target: 'invoice',
  //   displayLocation: 'header',
  //   prop: 'currency',
  //   regexp: /^.{1,10}$/,
  //   message: '通貨は10文字以内で入力して下さい。',
  //   emptyMessage: '通貨が空欄のため、請求情報が不完全です。入力して下さい。',
  //   required: true
  // },
  {
    target: 'invoice',
    displayLocation: 'header',
    prop: 'billingDate',
    regexp: '',
    message: '',
    emptyMessage: '請求日が空欄のため、請求情報が不完全です。入力して下さい。',
    required: true
  },
  {
    target: 'invoice',
    displayLocation: 'header',
    prop: 'deliveryDate',
    regexp: '',
    message: '',
    emptyMessage: '納品日が空欄のため、請求情報が不完全です。入力して下さい。',
    required: true
  },
  {
    target: 'invoice',
    displayLocation: 'header',
    prop: 'paymentDate',
    regexp: '',
    message: '',
    emptyMessage: '支払期限が空欄のため、請求情報が不完全です。入力して下さい。',
    required: true
  },
  {
    target: 'invoice',
    displayLocation: 'header',
    prop: 'recCompany',
    regexp: /^.{1,200}$/,
    message: '宛先企業は200文字以内で入力して下さい。',
    emptyMessage: '宛先企業が空欄のため、宛先情報が不完全です。入力して下さい。',
    required: true
  },
  {
    target: 'invoice',
    displayLocation: 'header',
    prop: 'recPost',
    regexp: /^[0-9]{3}-[0-9]{4}$/,
    message: '宛先郵便番号は 数字3桁 - 数字4桁 で入力して下さい。',
    emptyMessage: '宛先郵便番号が空欄のため、宛先情報が不完全です。入力して下さい。',
    required: true
  },
  {
    target: 'invoice',
    displayLocation: 'header',
    prop: 'recAddr1',
    regexp: /^.{1,10}$/,
    message: '都道府県は10文字以内で入力して下さい。',
    emptyMessage: '都道府県が空欄のため、宛先情報が不完全です。入力して下さい。',
    required: true
  },
  {
    target: 'invoice',
    displayLocation: 'header',
    prop: 'recAddr2',
    regexp: /^.{1,50}$/,
    message: '住所は50文字以内で入力して下さい。',
    emptyMessage: '住所が空欄のため、宛先情報が不完全です。入力して下さい。',
    required: true
  },
  {
    target: 'invoice',
    displayLocation: 'header',
    prop: 'recAddr3',
    regexp: /^.{0,50}$/,
    message: 'ビル名/フロア等は50文字以内で入力して下さい。',
    emptyMessage: '',
    required: false
  },
  {
    target: 'invoice',
    displayLocation: 'header',
    prop: 'sendRegistrationNo',
    regexp: /^T\d{13}$/,
    message: '登録番号は"T"+半角数字13桁で入力してください。',
    required: false
  },
  {
    target: 'invoice',
    displayLocation: 'footer',
    prop: 'bankName',
    regexp: /^.{0,50}$/,
    message: '銀行名は50文字以内で入力して下さい。',
    emptyMessage: '銀行名が空欄のため、支払い情報が不完全です。入力して下さい。',
    required: false
  },
  {
    target: 'invoice',
    displayLocation: 'footer',
    prop: 'branchName',
    regexp: /^.{0,50}$/,
    message: '支店名は50文字以内で入力して下さい。',
    emptyMessage: '支店名が空欄のため、支払い情報が不完全です。入力して下さい。',
    required: false
  },
  {
    target: 'invoice',
    displayLocation: 'footer',
    prop: 'accountType',
    regexp: /普通|当座/,
    message: '科目は「当座」または「普通」で入力して下さい。',
    emptyMessage: '科目が空欄のため、支払い情報が不完全です。入力して下さい。',
    required: false
  },
  {
    target: 'invoice',
    displayLocation: 'footer',
    prop: 'accountName',
    regexp: /^.{0,50}$/,
    message: '口座名義は50文字以内で入力して下さい。',
    emptyMessage: '口座名義が空欄のため、支払い情報が不完全です。入力して下さい。',
    required: false
  },
  {
    target: 'invoice',
    displayLocation: 'footer',
    prop: 'accountNumber',
    regexp: /^([0-9]{7})$/,
    message: '口座番号は数字7桁で入力して下さい。',
    emptyMessage: '口座番号が空欄のため、支払い情報が不完全です。入力して下さい。',
    required: false
  },
  {
    target: 'invoice',
    displayLocation: 'footer',
    prop: 'note',
    regexp: /^\s|\S{0,400}$/,
    message: '備考は400文字以内で入力して下さい。',
    required: false
  },
  {
    target: 'invoice-discount',
    displayLocation: 'lines',
    prop: 'discountDescription1',
    regexp: /^.{0,100}$/,
    message: '1番目の割引の内容は100文字以内で入力してください。',
    emptyMessage: '1番目の割引の内容が空欄のため、明細情報が不完全です。入力して下さい。',
    required: true
  },
  {
    target: 'invoice-discount',
    displayLocation: 'lines',
    prop: 'discountDescription2',
    regexp: /^.{0,100}$/,
    message: '2番目の割引の内容は100文字以内で入力してください。',
    emptyMessage: '2番目の割引の内容が空欄のため、明細情報が不完全です。入力して下さい。',
    required: true
  },
  {
    target: 'invoice-discount',
    displayLocation: 'lines',
    prop: 'discountDescription3',
    regexp: /^.{0,100}$/,
    message: '3番目の割引の内容は100文字以内で入力してください。',
    emptyMessage: '3番目の割引の内容が空欄のため、明細情報が不完全です。入力して下さい。',
    required: true
  },
  {
    target: 'invoice-discount',
    displayLocation: 'lines',
    prop: 'discountAmount1',
    customValidator: (value) => value > 0 && value <= 999999999999.999,
    regexp: '',
    message: '1番目の割引の数値は整数or少数 0 ～ 999999999999.999 の範囲で入力してください。',
    emptyMessage: '1番目の割引の数値が空欄のため、明細情報が不完全です。入力して下さい。',
    required: true
  },
  {
    target: 'invoice-discount',
    displayLocation: 'lines',
    prop: 'discountAmount2',
    customValidator: (value) => value > 0 && value <= 999999999999.999,
    regexp: '',
    message: '2番目の割引の数値は整数or少数 0 ～ 999999999999.999 の範囲で入力してください。',
    emptyMessage: '2番目の割引の数値が空欄のため、明細情報が不完全です。入力して下さい。',
    required: true
  },
  {
    target: 'invoice-discount',
    displayLocation: 'lines',
    prop: 'discountAmount3',
    customValidator: (value) => value > 0 && value <= 999999999999.999,
    regexp: '',
    message: '3番目の割引の数値は整数or少数 0 ～ 999999999999.999 の範囲で入力してください。',
    emptyMessage: '3番目の割引の数値が空欄のため、明細情報が不完全です。入力して下さい。',
    required: true
  },

  {
    target: 'lines',
    displayLocation: 'lines',
    prop: 'lineId',
    regexp: /^([a-zA-Z0-9-]{0,5})$/,
    message: '項目IDは半角英数字半角ハイフン5文字以内で入力してください。',
    emptyMessage: '項目IDが空欄のため、明細情報が不完全です。入力して下さい。',
    required: true
  },
  {
    target: 'lines',
    displayLocation: 'lines',
    prop: 'lineDescription',
    regexp: /^.{0,100}$/,
    message: '内容は100文字以内で入力してください。',
    emptyMessage: '内容が空欄のため、明細情報が不完全です。入力して下さい。',
    required: true
  },
  {
    target: 'lines',
    displayLocation: 'lines',
    prop: 'quantity',
    customValidator: (value) => value > 0 && value <= 999999999999.999,
    regexp: '',
    message: '数量は整数or少数 0 ～ 999999999999.999 の範囲で入力してください。',
    emptyMessage: '数量が空欄のため、明細情報が不完全です。入力して下さい。',
    required: true
  },
  {
    target: 'lines',
    displayLocation: 'lines',
    prop: 'unit',
    regexp: /^.{0,10}$/,
    message: '単位は10文字以内で入力してください。',
    emptyMessage: '単位が空欄のため、明細情報が不完全です。入力して下さい。',
    required: true
  },
  {
    target: 'lines',
    displayLocation: 'lines',
    prop: 'unitPrice',
    regexp: /^[0-9]{0,12}$/,
    message: '単価は整数 0 ～ 999999999999 の範囲で入力してください。',
    emptyMessage: '単価が空欄のため、明細情報が不完全です。入力して下さい。',
    required: true
  },
  {
    target: 'lines',
    displayLocation: 'lines',
    prop: 'taxType',
    regexp: '',
    message: '',
    emptyMessage: '税が選択されていないので、明細情報が不完全です。選択して下さい。',
    required: true
  },
  {
    target: 'lines',
    displayLocation: 'lines',
    prop: 'discountDescription1',
    regexp: /^.{0,100}$/,
    message: '項目割引1の内容は100文字以内で入力してください。',
    emptyMessage: '項目割引1の内容が空欄のため、明細情報が不完全です。入力して下さい。',
    discount: 1,
    required: true
  },
  {
    target: 'lines',
    displayLocation: 'lines',
    prop: 'discountDescription2',
    regexp: /^.{0,100}$/,
    message: '項目割引2の内容は100文字以内で入力してください。',
    emptyMessage: '項目割引2の内容が空欄のため、明細情報が不完全です。入力して下さい。',
    discount: 2,
    required: true
  },
  {
    target: 'lines',
    displayLocation: 'lines',
    prop: 'discountDescription3',
    regexp: /^.{0,100}$/,
    message: '項目割引3の内容は100文字以内で入力してください。',
    emptyMessage: '項目割引3の内容が空欄のため、明細情報が不完全です。入力して下さい。',
    discount: 3,
    required: true
  },
  {
    target: 'lines',
    displayLocation: 'lines',
    prop: 'discountAmount1',
    customValidator: (value) => value > 0 && value <= 999999999999.999,
    regexp: '',
    message: '項目割引1の数値は整数or少数 0 ～ 999999999999.999 の範囲で入力してください。',
    emptyMessage: '項目割引1の数値が空欄のため、明細情報が不完全です。入力して下さい。',
    discount: 1,
    required: true
  },
  {
    target: 'lines',
    displayLocation: 'lines',
    prop: 'discountAmount2',
    customValidator: (value) => value > 0 && value <= 999999999999.999,
    regexp: '',
    message: '項目割引2の数値は整数or少数 0 ～ 999999999999.999 の範囲で入力してください。',
    emptyMessage: '項目割引2の数値が空欄のため、明細情報が不完全です。入力して下さい。',
    discount: 2,
    required: true
  },
  {
    target: 'lines',
    displayLocation: 'lines',
    prop: 'discountAmount3',
    customValidator: (value) => value > 0 && value <= 999999999999.999,
    regexp: '',
    message: '項目割引3の数値は整数or少数 0 ～ 999999999999.999 の範囲で入力してください。',
    emptyMessage: '項目割引3の数値が空欄のため、明細情報が不完全です。入力して下さい。',
    discount: 3,
    required: true
  },

  {
    target: 'option',
    displayLocation: 'lines',
    prop: 'lineLength',
    customValidator: (value) => value > 0,
    regexp: '',
    message: '明細は１件以上必要です。',
    required: false
  },
  {
    target: 'option',
    displayLocation: 'header',
    prop: 'fileSize',
    customValidator: (value) => value && value <= 1048576,
    regexp: '',
    message: '印影ファイルのサイズは1MB以下にしてください。',
    required: false
  }
]

const taxRules = [
  {
    displayLocation: 'tax',
    exDisplayLocation: 'taxLabelErr',
    prop: 'taxLabel',
    regexp: /^.{0,10}$/,
    message: '税額のラベル名は10文字以内で入力してください。',
    emptyMessage: '入力必須',
    required: true
  },
  {
    displayLocation: 'tax',
    exDisplayLocation: 'taxAmountErr',
    prop: 'taxAmount',
    regexp: /^[0-9]{0,12}$/,
    message: '税額は整数 0 ～ 999999999999 の範囲で入力してください。',
    emptyMessage: '入力必須',
    required: true
  }
]

// eslint-disable-next-line no-unused-vars
function validate(invoice, lines, rules, option = {}) {
  let result = true

  while (headerErrorDiv.firstChild) headerErrorDiv.removeChild(headerErrorDiv.firstChild)
  while (linesErrorDiv.firstChild) linesErrorDiv.removeChild(linesErrorDiv.firstChild)
  while (footerErrorDiv.firstChild) footerErrorDiv.removeChild(footerErrorDiv.firstChild)

  rules.forEach((rule) => {
    if (rule.target !== 'invoice') return

    if (!invoice[rule.prop] && rule.required) {
      setValidationMessage(rule.emptyMessage, rule.displayLocation)
      result = false
    } else if (!invoice[rule.prop]) return // eslint-disable-line
    else if (rule.customValidator && !rule.customValidator(invoice[rule.prop])) {
      setValidationMessage(rule.message, rule.displayLocation)
      result = false
    } else if (rule.regexp && !rule.regexp.test(invoice[rule.prop])) {
      setValidationMessage(rule.message, rule.displayLocation)
      result = false
    }
  })

  lines.forEach((line, i) => {
    rules.forEach((rule) => {
      if (rule.target !== 'lines') return

      if (!line[rule.prop] && rule.required) {
        if (rule.discount >= 1) {
          if (rule.discount <= line.discounts) {
            setValidationMessage(`${i + 1}番目の${rule.emptyMessage}`, rule.displayLocation)
            result = false
          }
        } else {
          setValidationMessage(`${i + 1}番目の${rule.emptyMessage}`, rule.displayLocation)
          result = false
        }
      } else if (!line[rule.prop]) return // eslint-disable-line
      else if (rule.customValidator && !rule.customValidator(line[rule.prop])) {
        setValidationMessage(rule.message, rule.displayLocation)
        result = false
      } else if (rule.regexp && !rule.regexp.test(line[rule.prop])) {
        setValidationMessage(`${i + 1}番目の` + rule.message, rule.displayLocation)
        result = false
      }
    })

    if (line.unitPrice && line.quantity && line.unitPrice * line.quantity > 9000000000000000) {
      // eslint-disable-line
      setValidationMessage(
        `${i + 1}番目の` +
          '小計が扱うことができる最大値を超えました。9,000,000,000,000,000 以下となるように入力して下さい。',
        'lines'
      )
      result = false
    }
  })

  rules.forEach((rule) => {
    if (rule.target !== 'invoice-discount') return

    if (!invoice[rule.prop] && rule.required) {
      if ((rule.prop === 'discountDescription1' || rule.prop === 'discountAmount1') && invoice.discounts >= 1) {
        setValidationMessage(rule.emptyMessage, rule.displayLocation)
        result = false
      }
      if ((rule.prop === 'discountDescription2' || rule.prop === 'discountAmount2') && invoice.discounts >= 2) {
        setValidationMessage(rule.emptyMessage, rule.displayLocation)
        result = false
      }
      if ((rule.prop === 'discountDescription3' || rule.prop === 'discountAmount3') && invoice.discounts === 3) {
        setValidationMessage(rule.emptyMessage, rule.displayLocation)
        result = false
      }
    } else if (!invoice[rule.prop]) return // eslint-disable-line
    else if (rule.customValidator && !rule.customValidator(invoice[rule.prop])) {
      setValidationMessage(rule.message, rule.displayLocation)
      result = false
    } else if (rule.regexp && !rule.regexp.test(invoice[rule.prop])) {
      setValidationMessage(rule.message, rule.displayLocation)
      result = false
    }
  })

  if (getSubTotal(lines) > 9000000000000000) {
    setValidationMessage(
      '小計の合計が扱うことができる最大値を超えました。9,000,000,000,000,000 以下となるように入力して下さい。',
      'lines'
    )
    result = false
  }

  rules.forEach((rule) => {
    if (rule.target !== 'option') return

    if (!option[rule.prop] && rule.required) {
      setValidationMessage(rule.emptyMessage, rule.displayLocation)
      result = false
    } else if (!option[rule.prop]) return // eslint-disable-line
    else if (rule.customValidator && !rule.customValidator(option[rule.prop])) {
      setValidationMessage(rule.message, rule.displayLocation)
      result = false
    } else if (rule.regexp && !rule.regexp.test(option[rule.prop])) {
      setValidationMessage(rule.message, rule.displayLocation)
      result = false
    }
  })

  console.log('=====  バリデーションの結果: ', result)
  return result
}

// eslint-disable-next-line no-unused-vars
function taxValidate(tax) {
  let result = true

  const taxErrDisplays = ['taxErrEmptyMassage', 'taxLabelErr', 'taxAmountErr']
  taxErrDisplays.forEach((display) => {
    document.getElementById(display).textContent = ''
  })
  while (taxModalErrorDiv.firstChild) taxModalErrorDiv.removeChild(taxModalErrorDiv.firstChild)

  taxRules.forEach((rule) => {
    if (!tax[rule.prop] && rule.required) {
      document.getElementById(rule.exDisplayLocation).textContent = rule.emptyMessage
      document.getElementById('taxErrEmptyMassage').textContent = '未入力の項目があります。'
      result = false
    } else if (!tax[rule.prop]) return // eslint-disable-line
    else if (rule.customValidator && !rule.customValidator(tax[rule.prop])) {
      setValidationMessage(rule.message, rule.displayLocation)
      result = false
    } else if (rule.regexp && !rule.regexp.test(tax[rule.prop])) {
      setValidationMessage(rule.message, rule.displayLocation)
      result = false
    }
  })
  console.log('=====  税モーダルバリデーションの結果: ', result)
  return result
}

// eslint-disable-next-line no-unused-vars
function setValidationMessage(message, displayLocation) {
  const messageP = document.createElement('p')
  messageP.className = 'has-text-danger'
  messageP.textContent = message
  if (displayLocation === 'header') return headerErrorDiv.appendChild(messageP)
  else if (displayLocation === 'lines') return linesErrorDiv.appendChild(messageP)
  else if (displayLocation === 'footer') return footerErrorDiv.appendChild(messageP)
  else if (displayLocation === 'tax') return taxModalErrorDiv.appendChild(messageP)
}

// eslint-disable-next-line no-unused-vars
function setPaymentRequired(invoice, outputRules) {
  let required = false
  const paymentKeys = ['bankName', 'branchName', 'accountType', 'accountName', 'accountNumber']

  for (const key of Object.keys(invoice)) {
    if (paymentKeys.includes(key) && invoice[key]) {
      required = true
      break
    }
  }

  outputRules.forEach((rule) => {
    if (paymentKeys.includes(rule.prop)) rule.required = required
  })
}
