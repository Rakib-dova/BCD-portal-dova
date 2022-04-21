/**
 * 必須入力パラメーター設定
 */
const requiredProps = [
  'title',
  'body'
]

/**
 * 請求書HTML生成処理
 *
 * @param {object} inputs 請求書に埋め込む変数リスト
 * @param {Buffer | null} imageBuffer 画像データのバッファー
 * @returns {string} 請求書HTML
 */
const renderInvoiceHTML = (inputs, imageBuffer = null) => {
  if (!validateInvoiceInputs(inputs)) return

  console.log('== レンダリング開始 ============================')

  return `
<html>
<head>
  <style type="text/css">
    .container {
      display: grid;
      grid-template-rows: 150px 192px 120px 120px 120px 120px;
      grid-template-columns: 250px 250px 250px;
      /* width: 70%;
      height: 900px; */
      background-color: rgb(221, 221, 221);
      justify-content: center;
    }
    .s0_1 {
      background-color: rgb(158, 184, 255);
      grid-row: 1 / 2;
      grid-column: 1 / 3;
    }
    .s0_2 {
      background-color: rgb(158, 184, 255);
      grid-row: 1 / 2;
      grid-column: 3 / 4;
      text-align: right;
    }
    .s1 {
      background-color: aqua;
      grid-row: 2 / 3;
      grid-column: 1 / 2;
    }
    .s2 {
      background-color: rgb(228, 255, 255);
      grid-row: 2 / 3;
      grid-column: 2 / 3;
    }
    .s3 {
      background-color: rgb(134, 255, 255);
      grid-row: 2 / 3;
      grid-column: 3 / 4;
      display: grid;
      grid-template-rows: 48px 48px 48px 48px;
      grid-template-columns: 125px 125px;
      
    }
    .s3_1 {
      background-color: rgb(255, 227, 227);
      
      grid-row: 1 / 2;
      grid-column: 1 / 3;
      font-size: 8px;
    }
    .s3_2_1 {
      background-color: rgb(215, 255, 38);
      grid-row: 2 / 3;
      grid-column: 1 / 2;
      font-size: 8px;
    }
    .s3_2_2 {
      background-color: rgb(206, 255, 240);
      grid-row: 2 / 3;
      grid-column: 2 / 3;
      font-size: 8px;
    }
    .s3_3_1 {
      background-color: rgb(54, 255, 47);
      grid-row: 3 / 4;
      grid-column: 1 / 2;
      font-size: 8px;
    }
    .s3_3_2 {
      background-color: rgb(191, 224, 255);
      grid-row: 3 / 4;
      grid-column: 2 / 3;
      font-size: 8px;
    }
    .s3_4 {
      background-color: rgb(255, 206, 206);
      
      grid-row: 4 / 5;
      grid-column: 1 / 3;
      font-size: 8px;
    }
    
    .s4 {
      background-color: rgb(250, 129, 250);
      grid-row: 3 / 4;
      grid-column: 1 / 4;
    }
    
    .s5 {
      background-color: rgb(86, 255, 86);
      grid-row: 4 / 5;
      grid-column: 3 / 4;

      display: grid;
      grid-template-rows: 120px;
      grid-template-columns: 125px 125px;
    }
    .s5_1 {
      grid-row: 1 / 2;
      grid-column: 1 / 2;
    }
    .s5_2 {
      grid-row: 1 / 2;
      grid-column: 2 / 3;
    }

    .s6 {
      background-color: rgb(255, 173, 190);
      grid-row: 5 / 6;
      grid-column: 1 / 2;
    }
    .s7 {
      background-color: rgb(255, 254, 182);
      grid-row: 6 / 7;
      grid-column: 1 / 2;
    }

    table {
      margin: 0;
      width: 100%;
      border-collapse: collapse;
    }

    thead {
      border-bottom: 1px dashed black;
    }

    .th-1 {
      width: 10%;
    }
    .th-2 {
      width: 10%;
    }
    .th-3 {
      width: 25%;
    }
    .th-4 {
      width: 15%;
    }
    .th-5 {
      width: 15%;
    }
    .th-6 {
      width: 10%;
    }
    .th-7 {
      width: 20%;
    }

    .dotted-border {
      border-bottom: 1px dotted black;
    }

    h4.dotted-border {
      margin: 0;
    }
  </style>
</head>
<body about="urn:tradeshift:Page" typeof="ui:Page" id="tradeshiftBody">      
  <div class='container'>
    <div class="s0_1">
      <h3>請求書</h3>
    </div>
    <div class="s0_2">${setImageTag(imageBuffer)}</div>
    <div class="s1">
      <div>宛先</div>
      <h3>テスト宛先企業</h3>
      <pre>
        100-0004
        東京都千代田区大手町XXXビル
      </pre>
    </div>
    <div class="s2">
      <div>差出人</div>
      <h3>テスト差出人企業</h3>
      <pre>
        100-0004
        東京都千代田区 1-11-1
        大手町XXXビル
      </pre>
    </div>
    <div class="s3">
      <div class="s3_1">
        <h4>請求書番号</h4>
        <div>A20220418101</div>
      </div>
      <div class="s3_2_1">
        <h4>請求日</h4>
        <div>22/04/22</div>
      </div>
      <div class="s3_2_2">
        <h4>通過</h4>
        <div>円</div>
      </div>
      <div class="s3_3_1">
        <h4>支払期日</h4>
        <div>30/04/01</div>
      </div>
      <div class="s3_3_2">
        <h4>納品日</h4>
        <div>30/04/01</div>
      </div>
      <div class="s3_4">
        <h4>備考</h4>
        <div>ここは備考欄です。</div>
      </div>

    </div>
    <!-- <div class="">
    </div> -->
    <div class="s4">
      <table>
        <thead class="">
          <tr class="">
            <td class="th-1">No.</td>
            <td class="th-2">項目ID</td>
            <td class="th-3">内容</td>
            <td class="th-4">数量 単位</td>
            <td class="th-5">単価</td>
            <td class="th-6">税</td>
            <td class="th-7">小計(税抜)</td>
          </tr>
        </thead>
        <tbody>
          <tr class="thead">
            <td class="th-1">A20220422001</td>
            <td class="th-2">001</td>
            <td class="th-3">品物１</td>
            <td class="th-4">１個</td>
            <td class="th-5">1000</td>
            <td class="th-6">10%</td>
            <td class="th-7">1000</td>
          </tr>
          <tr class="thead">
            <td class="th-1">A20220422002</td>
            <td class="th-2">002</td>
            <td class="th-3">品物２</td>
            <td class="th-4">１個</td>
            <td class="th-5">1000</td>
            <td class="th-6">100</td>
            <td class="th-7">1100</td>
          </tr>
        </tbody>
      </table>

    </div>
    <div class="s5">
      <div class="s5_1">
        <div>小計(税抜)</div>
        <div>1000円の JP 消費税 10%</div>
        <h4>合計 円</h4>
        <div>税額合計 200</div>
      </div>
      <div class="s5_2">
        <div>2000</div>
        <div>200</div>
        <h4>2200</h4>
        <div></div>
      </div>

    </div>
    <div class="s6">
      <h4 class="dotted-border">支払条件と手段</h4>
      <div>銀行口座情報(国内)</div>
      <div>　銀行名　みずほ銀行</div>
      <div>銀行ソートコード</div>
      <div>　口座番号　12345676</div>
      <div>　口座名義　テスト太郎</div>
    </div>
    <div class="s7">
      <h4 class="dotted-border">その他特記事項</h4>
      <div>これは特記事項です。</div>

    </div>

  </div>
</body>
</html>`
}

/**
 * 請求書HTML生成のバリデーション処理
 *
 * @param {object} inputs 請求書に埋め込む変数リスト
 * @returns {boolean}
 */
const validateInvoiceInputs = (inputs) => {
  if (!inputs || !(Object.prototype.toString.call(inputs) === '[object Object]')) return false

  if (Object.keys(inputs).length !== requiredProps.length) return false

  for (const key of Object.keys(inputs)) {
    if (!requiredProps.includes(key)) return false
    if (!inputs[key]) return false
  }

  return true
}

/**
 * 動的<img>タグ生成処理
 *
 * @param {Buffer} imageBuffer 画像データのバッファー
 * @returns {string} <img>タグ
 */
const setImageTag = (imageBuffer) => {
  if (!imageBuffer || !Buffer.isBuffer(imageBuffer)) return ''

  return `<img src="data:image/jpeg;base64,${
    imageBuffer.toString('base64')
  }" width="140" height="140" />`
}

module.exports = renderInvoiceHTML
