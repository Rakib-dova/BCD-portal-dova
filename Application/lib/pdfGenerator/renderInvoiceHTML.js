/**
 * 必須入力パラメーター設定
*/
const requiredProps = [
  'invoiceNo',
  'currency',
  'accountName',
  'accountNumber',
  'accountType',
  'bankName',
  'branchName',
  'billingDate',
  'deliveryDate',
  'paymentDate',
  'note',
  'recAddr1',
  'recAddr2',
  'recAddr3',
  'recCompany',
  'recPost',
  'sendAddr1',
  'sendAddr2',
  'sendAddr3',
  'sendCompany',
  'sendPost',
  'subTotal',
  'taxGroups',
  'taxTotal',
  'total',
  'lines'
]

/**
 * 請求書HTML生成処理
 *
 * @param {object} inputs 請求書に埋め込む変数リスト
 * @param {Buffer | null} imageBuffer 画像データのバッファー
 * @returns {string} 請求書HTML
 */
const renderInvoiceHTML = (inputs, sealImp = null, logo = null) => {
  if (!validateInvoiceInputs(inputs)) return console.log('PDF生成バリデーションの失敗')

  console.log('== レンダリング開始 ============================')

  return `
<html>
<head>
  <meta charset="utf-8" />
  <style type="text/css">
    body {
      width: 775px;
      border: solid 1px #333;
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
      margin: 0.75rem;
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

      height: 15rem;
      width: 100%;
      resize: none;
      font-size: 16px;
    }

    .line-subtotal {
      text-align: right;
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
            <p id="invoice-invoiceNo">${inputs.invoiceNo}</p>
          </div>
          <div class="flex">
            <p class="width-30">通貨</p>
            <p id="invoice-currency">${inputs.currency}</p>
          </div>
          <div class="flex">
            <p class="width-30">請求日</p>
            <p id="invoice-billingDate">${inputs.billingDate}</p>
          </div>
          <div class="flex">
            <p class="width-30">支払期日</p>
            <p id="invoice-paymentDate">${inputs.paymentDate}</p>
          </div>
          <div class="flex">
            <p class="width-30">納品日</p>
            <p id="invoice-deliveryDate">${inputs.deliveryDate}</p>
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
        <p class="p width-250pxfont-bold" id="invoice-recCompany">${inputs.recCompany}</p>
        <p class="p width-250px" id="invoice-recPost">${inputs.recPost}</p>
        <p class="p width-250px" id="invoice-recAddr1">${inputs.recAddr1}</p>
        <p class="p width-250px" id="invoice-recAddr2">${inputs.recAddr2}</p>
        <p class="p width-250px" id="invoice-recAddr3">${inputs.recAddr3}</p>
      </div>
      <div class="column float-r width-50">
        <p class="font-bold">差出人</p>
        <p class="p width-250pxfont-bold" id="invoice-sendCompany">${inputs.sendCompany}</p>
        <p class="p width-250px" id="invoice-sendPost">${inputs.sendPost}</p>
        <p class="p width-250px" id="invoice-sendAddr1">${inputs.sendAddr1}</p>
        <p class="p width-250px" id="invoice-sendAddr2">${inputs.sendAddr2}</p>
        <p class="p width-250px" id="invoice-sendAddr3">${inputs.sendAddr3}</p>
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
          ${setLines(inputs.lines)}
        </tbody>
      </table>
    </div>
    <div class="columns">
      <div class="column width-50"></div>
      <div class="column width-50">
        <div class="flex">
          <p class="text-l width-50">小計（税抜）</p>
          <p class="text-r width-50" id="subTotal">${inputs.taxTotal}</p>
        </div>
        ${setTaxGroup(inputs.taxGroups)}
        <div class="flex">
          <p class="text-l width-50 font-bold">合計 ￥</p>
          <p class="text-r width-50 font-bold" id="total">${inputs.total}</p>
        </div>
        <div class="flex">
          <p class="text-l">税額合計 ￥</p>
          <p class="text-l" id="taxTotal">${inputs.taxTotal}</p>
        </div>
      </div>
    </div>
    <p class="font-bold width-100 mr-075">支払い条件と手段</p>
    <div class="columns">
      <div class="column text-l width-50">
        <p class="font-bold">銀行口座情報</p>
        <p class="p width-250pxfont-bold" id="invoice-bankName">銀行名: ${inputs.bankName}</p>
        <p class="p width-250px" id="invoice-branchName">支店名: ${inputs.branchName}</p>
        <p class="p width-250px" id="invoice-accountType">科目: ${inputs.accountType}</p>
        <p class="p width-250px" id="invoice-accountName">口座番号: ${inputs.accountNumber}</p>
        <p class="p width-250px" id="invoice-accountNumber">口座名義: ${inputs.accountName}</p>
      </div>
      <div class="column width-50">
        <p class="font-bold">備考</p>
        <pre id="invoice-note">${inputs.note}</pre>
      </div>
    </div>
  </div>
</body>
</html>`
}

/**
 * 請求書HTML生成のバリデーション処理
 *
 * @param {object} input 請求書に埋め込む変数リスト
 * @returns {boolean}
 */
const validateInvoiceInputs = (input) => {
  if (!input || !(Object.prototype.toString.call(input) === '[object Object]')) return false

  requiredProps.forEach((key) => {
    if (!(key in input)) return false
    if (!input[key] && key !== 'sendAddr3' && key !== 'recAddr3') return false
  })

  return true
}

const setLines = (lines) => {
  let tags = ''
  lines.forEach((line) => {
    const subTotal = Math.floor(line.unitPrice * line.quantity)
    tags += `
      <tr>
        <td class="text-center">
          <p class="line-lineId" data-prop="lineId">${line.lineId}</p>
        </td>
        <td class="text-center">
          <p class="line-lineDiscription" data-prop="lineDiscription">${line.lineDiscription}</p>
        </td>
        <td class="text-center"><p class="line-quantity" data-prop="quantity">${line.quantity}</p></td>
        <td class="text-center"><p class="line-unit" data-prop="unit">${line.unit}</p></td>
        <td class="text-center"><p class="line-unitPrice" data-prop="unitPrice">${line.unitPrice}</p></td>
        <td class="text-center"><p class="line-taxType" data-prop="taxType">${ getTaxTypeName(line.taxType)}</p></td>
        <td class="text-right line-subtotal"><p class="line-subtotal" data-prop="subtotal">${subTotal}</p></td>
      </tr>`
  })
  return tags
}

const setTaxGroup = (taxGroups) => {
  let tags = ''

  taxGroups.forEach((group) => {
    const taxRate = group.type.replace('tax', '').replace('p', '')
    tags += `<div class="flex">
               <p class="text-l width-50 taxGroupLabel">${group.subTotal}円のJP 消費税 ${taxRate}%</p>
               <p class="text-r width-50 taxGroupValue">${group.taxGroupTotal}</p>
            </div>`
  })

  return tags
}

/**
 * 動的<img>タグ生成処理
 *
 * @param {Buffer} imageBuffer 画像データのバッファー
 * @param {string} type 画像ファイルタイプ
 * @param {int} size 画像サイズ
 * @returns {string} <img>タグ
 */
const setImageTag = (imageBuffer, type, size = 120) => {
  if (!imageBuffer || !Buffer.isBuffer(imageBuffer)) return ''

  return `<img src="data:image/${type};base64,${
    imageBuffer.toString('base64')
  }" width="${size}" height="${size}" class="image" />`
}

const getTaxTypeName = (taxType) => {
  switch (taxType) {
    case 'freeTax':
      return '不課税'
    case 'dutyFree':
      return '免税'
    case 'tax10p':
      return '消費税 10%'
    case 'tax8p':
      return '消費税 8%'
    case 'otherTax':
      return 'その他の消費税'
  }
}

module.exports = renderInvoiceHTML
