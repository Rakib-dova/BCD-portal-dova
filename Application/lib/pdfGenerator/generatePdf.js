const puppeteer = require('puppeteer')

const defaultOptions = {
  format: 'A4',
  margin: {
    top: 40,
    bottom: 40
  },
  displayHeaderFooter: true,
  headerTemplate: '<div></div>',
  footerTemplate: `
  <div style="width: 100%; font-size: 9px; padding: 5px 5px 0; color: #bbb; position: relative;">
    <div style="text-align: center;">
      <<span class="pageNumber"></span>/<span class="totalPages"></span>>
    </div>
  </div>
`
}

const generatePdf = async (html, options = defaultOptions) => {
  const args = ['--no-sandbox', '--disable-setuid-sandbox']

  console.log('== ブラウザ起動 ==================')
  const browser = await puppeteer.launch({
    ignoreHTTPSErrors: true,
    args: args
  })
  console.log('== ページ表示開始 ==================')
  const page = await browser.newPage()

  await page.setContent(html, {
    waitUntil: 'networkidle0'
  })

  const data = await page.pdf(options).finally(async () => {
    await browser.close()
    console.log('== ブラウザ停止 ===================')
  })

  return Buffer.from(Object.values(data))
}

module.exports = generatePdf
