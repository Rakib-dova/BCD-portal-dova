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
  'sendRegistrationNo',

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
  // 合計
  const total = Math.floor(input.total - getDiscountInvoiceTotal(input)).toLocaleString()
  const sendRegistrationNoData = input.sendRegistrationNo ? input.sendRegistrationNo : ''
  if (!validateInvoiceInput(input)) return console.log('PDF生成バリデーションの失敗')
  padOptionProps(input)

  console.log('== レンダリング開始 ============================')

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style type="text/css">
    body {
      width: 775px;
      border: solid 1px 333;
      font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
      font-size: 14px;
      line-height: 1.428571429;
      color: #333333;
      background-color: #ffffff;
    }
    .image {
      margin-left: 10px;
      width: auto;
      height: auto;
      max-width: 120px;
      max-height: 120px;
    }
    .container {
      padding-right: 15px;
      padding-left: 15px;
      margin-top: -25px;
      margin-bottom: -25px;
      margin-right: auto;
      margin-left: auto;
      height: auto;
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
    .mr-075 {
      margin: 0.75rem;
    }
    .ml-10px {
      margin-left: 10px !important;
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
    .width-50 {
      width: 50%;
    }
    .width-70 {
      width: 70%;
    }
    .width-100 {
      width: 100%;
    }
    .width-250px {
      width: 250px;
    }
    .min-width-30 {
      min-width: 30%;
    }
    .font-bold {
      font-weight: bold;
      font-size: 1rem;
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
    table td,
    table th {
      border: 1px solid #dbdbdb;
      border-width: 0 0 1px;
      padding: 0.25em;
      vertical-align: top;
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
    .unbreak {
      break-inside: avoid;
    }
    .border {
      border: 1px solid;
    }
    .image-box {
      min-height: 120px !important;
      display: flex !important;
      align-items: center !important;
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
            <p class="width-30 min-width-30">請求書番号</p>
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
      <div class="column width-50">
        ${sealImp ? setImageTag(sealImp.buffer, sealImp.type, 120) : ''}
        ${
          logo ? `<div class="float-r image-box"><img src="${logo}" width="120" height="120" class="image"/></div>` : ''
        }
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
        <p class="p width-250px" id="invoice-sendAddr3">${sendRegistrationNoData}</p>
      </div>
    </div>
    <div class="columns">
      <div class="column width-50">
        <div class="flex border">
          <p class="text-l width-30 font-bold ml-10px">合計金額 ￥</p>
          <p class="text-r width-70 font-bold" id="total">${total}</p>
        </div>
      </div>
    </div>
    <div class="columns">
      <table class="table is-fullwidth is-hoverable table-fixed" id="table-invoice-details">
        <thead>
          <tr>
            <th class="width-5 text-center">項目ID</th>
            <th class="width-20 text-center">内容</th>
            <th class="width-10 text-center">数量</th>
            <th class="width-5 text-center">単位</th>
            <th class="width-10 text-center">単価</th>
            <th class="width-10 text-center">税</th>
            <th class="width-10 text-center">小計（税抜）</th>
          </tr>
        </thead>
        <tbody id="lines">
          ${setLines(input.lines)}
          ${setDiscountLines(input)}
        </tbody>
      </table>
    </div>
    <div class="columns unbreak">
      <div class="column width-50"></div>
      <div class="column width-50">
        <div class="flex">
          <p class="text-l width-50">小計（税抜）</p>
          <p class="text-r width-50" id="subTotal">${Math.floor(input.subTotal).toLocaleString()}</p>
        </div>
        ${setDiscountInvoice(input)}
        ${setTaxGroup(input.taxGroups, input.lines)}
        <div class="flex">
          <p class="text-l width-50 font-bold">合計 ￥</p>
          <p class="text-r width-50 font-bold" id="total">${total}</p>
        </div>
        <div class="flex">
          <p class="text-l">税額合計 ￥</p>
          <p class="text-l" id="taxTotal">${input.taxTotal.toLocaleString()}</p>
        </div>
      </div>
    </div>
    <div class="unbreak">
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
    if (input[requiredProps[i]] === undefined || input[requiredProps[i]] === '') {
      console.log(requiredProps[i])
      return false
    }
  }

  return true
}

const padOptionProps = (input) => {
  for (let i = 0; i < optionProps.length; i++) {
    if (input[optionProps[i]] === undefined) {
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
        <td class="text-l">
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
        <td class="text-l">
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
      <td class="text-l">
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
const setTaxGroup = (taxGroups, lines) => {
  let tags = ''
  // 動入力された税額が、税額欄に表示、および小計欄にラベル名ごとに合計されて表示されること、表示順は固定入力→手動入力(上から設定順)
  const taxTypeList = []
  const otherTaxLineList = []
  // 「その他の税」と「定型税」をそれぞれ入力されている順に保持
  lines.forEach((line) => {
    if (line.taxType && line.taxType === 'otherTax' && !otherTaxLineList.includes(line.taxLabel)) {
      otherTaxLineList.push(line.taxLabel)
    } else if (line.taxType && !taxTypeList.includes(line.taxType)) {
      if (line.taxType === 'otherTax') return
      taxTypeList.push(line.taxType)
    }
  })
  // 選択肢にある税から、行順に追加
  taxTypeList.forEach((taxType) => {
    const existTax = taxGroups.find(({ type }) => type === taxType)
    if (!existTax) return
    tags += `<div class="flex">
    <p class="text-l width-50 taxGroupLabel">${existTax.subTotal.toLocaleString()}円のJP ${getTaxTypeName(taxType)}</p>
    <p class="text-r width-50 taxGroupValue">${existTax.taxGroupTotal.toLocaleString()}</p>
 </div>`
  })
  // 「その他」を行順に追加
  otherTaxLineList.forEach((taxLine) => {
    const existOtherTax = taxGroups.find(({ taxLabel }) => taxLabel === taxLine)
    if (!existOtherTax) return
    tags += `<div class="flex">
    <p class="text-l width-50 taxGroupLabel">${existOtherTax.subTotal.toLocaleString()}円のJP ${
      existOtherTax.taxLabel
    }</p>
    <p class="text-r width-50 taxGroupValue">${existOtherTax.taxGroupTotal.toLocaleString()}</p>
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

  return `<div class="float-r image-box">
  <img src="data:image/${type};base64,${imageBuffer.toString(
    'base64'
  )}" width="${size}" height="${size}" class="image" /></div>`
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
