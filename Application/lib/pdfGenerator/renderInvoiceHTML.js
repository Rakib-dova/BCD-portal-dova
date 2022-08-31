/**
 * 必須入力パラメーター設定
 */
const requiredProps = [
  'recCompany',
  'recPost',
  'recAddr1',
  'recAddr2',

  'sendCompany',
  'sendPost',
  'sendAddr1',
  'sendAddr2',
  'sendAddr3',
  // 'sendRegistrationNo',

  'invoiceNo',
  'currency',
  'billingDate',
  'deliveryDate',
  'paymentDate',

  'subTotal',
  'taxGroups',
  'taxTotal',
  'total',
  'lines'
]

const optionProps = [
  'recAddr3',
  'sendAddr3',

  'bankName',
  'branchName',
  'accountName',
  'accountNumber',
  'accountType',

  'note'
]

/**
 * 請求書HTML生成
 *
 * @param {object} input 請求書に埋め込む変数リスト
 * @param {object} sealImp  印影画像オブジェクト
 * @param {object} logo  企業ロゴ画像オブジェクト
 * @returns {string} 請求書HTML
 */
const renderInvoiceHTML = (input, sealImp = null, logo = null) => {
  if (!validateInvoiceInput(input)) return console.log('PDF生成バリデーションの失敗')
  padOptionProps(input)

  console.log('== レンダリング開始 ============================')

  return `
<html>
<head>
  <meta charset="utf-8" />
  <style type="text/css">
    body {
      width: 775px;
      border: solid 1px 333;
    }
    .image {
      margin-left: 10px;
      width: 120px;
      height: 120px;
    }
    .flex-container {
      display: flex;
    }
    .container {
      padding-right: 15px;
      padding-left: 15px;
      margin-right: auto;
      margin-left: auto;
      height: auto;
    }
    .box {
      background-color: white;
      border-radius: 6px;
      box-shadow: 0 0.5em 1em -0.125em rgba(10, 10, 10, 0.1), 0 0px 0 1px rgba(10, 10, 10, 0.02);
      color: #4a4a4a;
      display: block;
      padding: 1.25rem;
    }
    .columns {
      margin: 2rem 0.75rem;
      height: auto;
      display: flex;
    }
    .text-r {
      text-align: right;
    }
    .text-l {
      text-align: left;
    }
    .text-center {
      text-align: center;
    }

    .m-0 {
      margin: 0 !important;
    }
    .mr-075 {
      margin: 0.75rem;
    }
    .column {
      display: block;
    }
    .float-l {
      float: left;
    }
    .float-r {
      float: right;
    }
    .flex {
      display: flex;
    }

    .clear-r {
      clear: right;
    }

    .title {
      color: #363636;
      font-size: 2rem;
      font-weight: 600;
      line-height: 1.125;
      margin-bottom: 20px;
    }

    p {
      color: #363636;
      font-size: 0.75rem;
      margin: 0;
      margin-right: 10px;
    }
    thead {
      color: #363636;
      font-size: 0.75rem;
    }
    .width-5 {
      width: 5%;
    }
    .width-10 {
      width: 10%;
    }
    .width-20 {
      width: 20%;
    }
    .width-30 {
      width: 30%;
    }
    .width-45 {
      width: 45%;
    }
    .width-50 {
      width: 50%;
    }
    .width-100 {
      width: 100%;
    }
    input.width-120px {
      width: 140px;
    }
    .width-250px {
      width: 250px;
    }
    input.width-330px {
      width: 330px;
    }
    .mr-r-10px {
      margin-right: 10px;
    }
    .font-bold {
      font-weight: bold;
      font-size: 1rem;
    }

    body {
      font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
      font-size: 14px;
      line-height: 1.428571429;
      color: #333333;
      background-color: #ffffff;
    }

    table {
      border-collapse: collapse;
      border-spacing: 0;
      max-width: 100%;
      background-color: transparent;
      width: 100%;
      margin-bottom: 20px;
      table-layout: fixed;
    }
    table td, table th {
      border: 1px solid #dbdbdb;
      border-width: 0 0 1px;
      padding: 0.25em;
      vertical-align: top;
    }

    input,
    button,
    select,
    textarea {
      font-family: inherit;
      font-size: inherit;
      line-height: inherit;
    }
    button,
    input,
    select[multiple],
    textarea {
      background-image: none;
    }

    #invoice-note {
      border: 1px solid;
      display: flex;
      padding: 4px;

      height: 15rem;
      width: 100%;
      resize: none;
      font-size: 12px;
    }

    .line-subtotal {
      text-align: right;
    }

    pre {
      white-space: pre-wrap;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="columns">
      <div class="column width-50">
        <p class="title">請求書</p>
        <div>
          <div class="flex">
            <p class="width-30">請求書番号</p>
            <p id="invoice-invoiceNo">${input.invoiceNo}</p>
          </div>
          <div class="flex">
            <p class="width-30">通貨</p>
            <p id="invoice-currency">${input.currency}</p>
          </div>
          <div class="flex">
            <p class="width-30">請求日</p>
            <p id="invoice-billingDate">${input.billingDate}</p>
          </div>
          <div class="flex">
            <p class="width-30">支払期日</p>
            <p id="invoice-paymentDate">${input.paymentDate}</p>
          </div>
          <div class="flex">
            <p class="width-30">納品日</p>
            <p id="invoice-deliveryDate">${input.deliveryDate}</p>
          </div>
        </div>
      </div>
      <div class="column text-r width-50">
        ${sealImp ? setImageTag(sealImp.buffer, sealImp.type, 120) : ''}
        ${logo ? setImageTag(logo.buffer, logo.type, 120) : ''}
      </div>
    </div>
    <div class="columns">
      <div class="column float-l width-50">
        <p class="font-bold">宛先</p>
        <p class="p width-250pxfont-bold" id="invoice-recCompany">${input.recCompany}</p>
        <p class="p width-250px" id="invoice-recPost">${input.recPost}</p>
        <p class="p width-250px" id="invoice-recAddr1">${input.recAddr1}</p>
        <p class="p width-250px" id="invoice-recAddr2">${input.recAddr2}</p>
        <p class="p width-250px" id="invoice-recAddr3">${input.recAddr3}</p>
      </div>
      <div class="column float-r width-50">
        <p class="font-bold">差出人</p>
        <p class="p width-250pxfont-bold" id="invoice-sendCompany">${input.sendCompany}</p>
        <p class="p width-250px" id="invoice-sendPost">${input.sendPost}</p>
        <p class="p width-250px" id="invoice-sendAddr1">${input.sendAddr1}</p>
        <p class="p width-250px" id="invoice-sendAddr2">${input.sendAddr2}</p>
        <p class="p width-250px" id="invoice-sendAddr3">${input.sendAddr3}</p>
        <p class="p width-250px" id="invoice-sendAddr3">${input.sendRegistrationNo}</p>
      </div>
    </div>
    <div class="columns">
      <table class="table is-fullwidth is-hoverable table-fixed" id="table-invoice-details">
        <thead>
          <tr>
            <th class="width-5 text-center">項目ID</th>
            <th class="width-20 text-left">内容</th>
            <th class="width-10 text-left">数量</th>
            <th class="width-5 text-left">単位</th>
            <th class="width-10 text-left">単価</th>
            <th class="width-10 text-left">税</th>
            <th class="width-10 text-center">小計（税抜）</th>
          </tr>
        </thead>
        <tbody id="lines">
          ${setLines(input.lines)}
          ${setDiscountLines(input)}
        </tbody>
      </table>
    </div>
    <div class="columns">
      <div class="column width-50"></div>
      <div class="column width-50">
        <div class="flex">
          <p class="text-l width-50">小計（税抜）</p>
          <p class="text-r width-50" id="subTotal">${Math.floor(input.subTotal).toLocaleString()}</p>
        </div>
        ${setDiscountInvoice(input)}
        ${setTaxGroup(input.taxGroups)}
        <div class="flex">
          <p class="text-l width-50 font-bold">合計 ￥</p>
          <p class="text-r width-50 font-bold" id="total">${Math.floor(
            input.total - getDiscountInvoiceTotal(input)
          ).toLocaleString()}</p>
        </div>
        <div class="flex">
          <p class="text-l">税額合計 ￥</p>
          <p class="text-l" id="taxTotal">${input.taxTotal.toLocaleString()}</p>
        </div>
      </div>
    </div>
    ${
      input.bankName && input.bankName && input.bankName && input.bankName && input.bankName
        ? '<p class="font-bold width-100 mr-075">支払い条件と手段</p>'
        : ''
    }
    <div class="columns">
      <div class="column text-l width-50">
        ${setPayment(input)}
      </div> 
      <div class="column width-50">
        <p class="font-bold">備考</p>
        <pre id="invoice-note">${input.note}</pre>
      </div>
    </div>
  </div>
</body>
</html>`
}

/**
 * 請求書HTML生成のバリデーション
 *
 * @param {object} input 請求書に埋め込む変数リスト
 * @returns {boolean}
 */
const validateInvoiceInput = (input) => {
  if (!input || !(Object.prototype.toString.call(input) === '[object Object]')) return false

  for (let i = 0; i < requiredProps.length; i++) {
    // eslint-disable-next-line no-prototype-builtins
    if (!input.hasOwnProperty(requiredProps[i])) {
      console.log('not exist Props =' + requiredProps[i])
      return false
    }
  }

  return true
}

const padOptionProps = (input) => {
  for (let i = 0; i < optionProps.length; i++) {
    // eslint-disable-next-line no-prototype-builtins
    if (!input.hasOwnProperty(optionProps[i]) || !input[optionProps[i]]) {
      input[optionProps[i]] = ''
    }
  }
}

const setPayment = (input) => {
  if (!input.bankName || !input.bankName || !input.bankName || !input.bankName || !input.bankName) return ''

  return `
    <p class="font-bold">銀行口座情報</p>
    <div>
      <div class="flex">
        <p class="width-30">銀行名</p>
        <p id="invoice-bankName">${input.bankName}</p>
      </div>
      <div class="flex">
        <p class="width-30">支店名</p>
        <p id="invoice-branchName">${input.branchName}</p>
      </div>
      <div class="flex">
        <p class="width-30">科目</p>
        <p id="invoice-accountType">${input.accountType}</p>
      </div>
      <div class="flex">
        <p class="width-30">口座番号</p>
        <p id="invoice-accountNumber">${input.accountNumber}</p>
      </div>
      <div class="flex">
        <p class="width-30">口座名義</p>
        <p id="invoice-accountName">${input.accountName}</p>
      </div>
    </div>`
}

/**
 * 明細タグ生成
 *
 * @param {object[]} lines 明細オブジェクト
 * @returns {string} 明細タグ
 */
const setLines = (lines) => {
  let tags = ''
  lines.forEach((line) => {
    let discountPrices = 0
    for (let i = 1; i <= line.discounts; i++) {
      if (i >= 4) break
      discountPrices += functionDiscountCalcs[i](line, Math.floor(line.unitPrice * line.quantity))
    }
    const subTotal = Math.floor(line.unitPrice * line.quantity - discountPrices)
    tags += `
      <tr>
        <td class="text-center">
          <p class="line-lineId" data-prop="lineId">${line.lineId}</p>
        </td>
        <td class="text-center">
          <p class="line-lineDescription" data-prop="lineDescription">${line.lineDescription}</p>
        </td>
        <td class="text-center"><p class="line-quantity" data-prop="quantity">${parseFloat(
          line.quantity
        ).toLocaleString()}</p></td>
        <td class="text-center"><p class="line-unit" data-prop="unit">${line.unit}</p></td>
        <td class="text-center"><p class="line-unitPrice" data-prop="unitPrice">${parseInt(
          line.unitPrice
        ).toLocaleString()}</p></td>
        <td class="text-center"><p class="line-taxType" data-prop="taxType">${getTaxTypeName(
          line.taxType,
          line
        )}</p></td>
        <td class="text-right line-subtotal"><p class="line-subtotal" data-prop="subtotal">${subTotal.toLocaleString()}</p></td>
      </tr>`
    for (let i = 1; i <= line.discounts; i++) {
      if (i >= 4) break
      tags += `
      <tr>
        <td class="text-center">
          <p class="line-lineId" data-prop="lineId">項目割引</p>
        </td>
        <td class="text-center">
          <p class="line-lineDescription" data-prop="lineDescription">${line['discountDescription' + i]}</p>
        </td>
        <td class="text-center"><p class="line-quantity" data-prop="quantity">${line[
          'discountAmount' + i
        ].toLocaleString()}</p></td>
        <td class="text-center"><p class="line-unit" data-prop="unit">${getUnitTypeName(
          line['discountUnit' + i]
        )}</p></td>
        <td class="text-center"><p class="line-unitPrice" data-prop="unitPrice">- ${Math.floor(
          functionDiscountCalcs[i](line, Math.floor(line.unitPrice * line.quantity))
        ).toLocaleString()}</p></td>
        <td></td>
        <td></td>
      </tr>`
    }
  })
  return tags
}

/**
 * 割引行タグ生成
 *
 * @param {object} input 請求書に埋め込む変数リスト
 * @return {string} 割引行タグ
 */
const setDiscountLines = (input) => {
  let tags = ''
  for (let i = 1; i <= input.discounts; i++) {
    if (i >= 4) break
    tags += `
    <tr>
      <td class="text-center">
        <p class="line-lineId" data-prop="lineId">割引</p>
      </td>
      <td class="text-center">
        <p class="line-lineDescription" data-prop="lineDescription">${input[
          'discountDescription' + i
        ].toLocaleString()}</p>
      </td>
      <td class="text-center"><p class="line-quantity" data-prop="quantity">${input[
        'discountAmount' + i
      ].toLocaleString()}</p></td>
      <td class="text-center"><p class="line-unit" data-prop="unit">${getUnitTypeName(
        input['discountUnit' + i]
      )} </p></td>
      <td></td>
      <td></td>
      <td class="text-right line-subtotal"><p class="line-unitPrice" data-prop="unitPrice">- ${Math.floor(
        functionDiscountCalcs[i](input, input.subTotal)
      ).toLocaleString()}</p></td>
    </tr>`
  }
  return tags
}

/**
 * 小計割引タグ生成
 *
 * @param {object} input 請求書に埋め込む変数リスト
 * @return {string} 小計割引タグ
 */
const setDiscountInvoice = (input) => {
  let tags = ''
  for (let i = 1; i <= input.discounts; i++) {
    if (i >= 4) break
    tags += `
    <div class="flex">
      <p class="text-l width-50">割引 ${input['discountDescription' + i]}</p>
      <p class="text-r width-50" id="subTotal">- ${Math.floor(
        functionDiscountCalcs[i](input, input.subTotal)
      ).toLocaleString()}</p>
    </div>`
  }
  return tags
}

/**
 * 割引金額合計を取得
 *
 * @param {object} input 請求書に埋め込む変数リスト
 * @return let discounttotal 合計割引金額
 */
const getDiscountInvoiceTotal = (input) => {
  let discounttotal = 0
  for (let i = 1; i <= input.discounts; i++) {
    if (i >= 4) break
    discounttotal += functionDiscountCalcs[i](input, input.subTotal)
  }
  return discounttotal
}

/**
 * 消費税区分グループタグ生成
 *
 * @param {object[]} taxGroups 消費税区分グループオブジェクト
 * @returns {string} 消費税区分グループタグ
 */
const setTaxGroup = (taxGroups) => {
  let tags = ''

  taxGroups.forEach((group) => {
    const taxRate = group.type === 'otherTax' && group.taxLabel ? group.taxLabel : getTaxTypeName(group.type)
    tags += `<div class="flex">
               <p class="text-l width-50 taxGroupLabel">${group.subTotal.toLocaleString()}円のJP ${taxRate}</p>
               <p class="text-r width-50 taxGroupValue">${group.taxGroupTotal.toLocaleString()}</p>
            </div>`
  })

  return tags
}

/**
 * 動的<img>タグ生成
 *
 * @param {Buffer} imageBuffer 画像データのバッファー
 * @param {string} type 画像ファイルタイプ
 * @param {int} size 画像サイズ
 * @returns {string} <img>タグ
 */
const setImageTag = (imageBuffer, type, size = 120) => {
  if (!imageBuffer || !Buffer.isBuffer(imageBuffer)) return ''

  return `<img src="data:image/${type};base64,${imageBuffer.toString(
    'base64'
  )}" width="${size}" height="${size}" class="image" />`
}

/**
 * 消費税区名分取得
 *
 * @param {string} taxType 消費税区分文字列
 * @returns {string} 消費税区名 (日本語)
 */
const getTaxTypeName = (taxType, line) => {
  switch (taxType) {
    case 'tax10p':
      return '消費税 10%'
    case 'tax8p':
      return '消費税 8%'
    case 'nonTaxable':
      return '非課税'
    case 'untaxable':
      return '不課税'
    case 'taxExemption':
      return '免税'
    case 'otherTax':
      return line.taxAmount
    default:
      return ''
  }
}

/**
 * 割引タイプ取得
 *
 * @param {string} unitType 割引区分文字列
 * @returns {string} 割引区分名
 */
const getUnitTypeName = (unitType) => {
  switch (unitType) {
    case 'percent':
      return '%'
    case 'jpy':
      return 'jpy'
    default:
      return '%'
  }
}

/**
 * 割引額取得
 *
 * @param {string} objects 請求書に埋め込む変数リスト
 * @param {number} subTotal 小計
 * @returns {number} 割引額
 */
const functionDiscountCalcs = {
  1: function (objects, subTotal) {
    if (objects.discountUnit1 === 'jpy') return Math.floor(objects.discountAmount1)
    else return subTotal * objects.discountAmount1 * 0.01
  },
  2: function (objects, subTotal) {
    if (objects.discountUnit2 === 'jpy') return Math.floor(objects.discountAmount2)
    else return subTotal * objects.discountAmount2 * 0.01
  },
  3: function (objects, subTotal) {
    if (objects.discountUnit3 === 'jpy') return Math.floor(objects.discountAmount3)
    else return subTotal * objects.discountAmount3 * 0.01
  }
}

module.exports = renderInvoiceHTML
