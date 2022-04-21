const fs = require('fs')
const path = require('path')
const {
  generatePdf,
  renderInvoiceHTML
} = require('../lib/pdfGenerator')  // 呼び出す場所で適宜変えてください



// 呼び出す場所で適宜変えてください
const imageBuffer = fs.readFileSync(path.resolve(__dirname, '../lib/pdfGenerator/images/sample.jpg'))

const cbPostIndex = async () => {
  const html = renderInvoiceHTML({
    title: 'テスト請求書',
    body: 'テスト請求書本文'
  }, imageBuffer)

  console.log('@@@@@ 生成されたHTML:\n', html)

  const pdfBuffer = await generatePdf(html)
  console.log('== PDF生成完了 ====================')

  fs.writeFile(path.resolve(__dirname, './output.pdf'), pdfBuffer, () => {
    console.log('== 書き込み完了 ========================')
  })
}

(function () {
  cbPostIndex()
}())
