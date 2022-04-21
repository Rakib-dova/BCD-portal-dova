// const puppeteer = require('puppeteer')
// const { chromium } = require('playwright');
const { chromium } = require("playwright-chromium")

const defaultOptions = {
  format: 'A4'
  // width: 1300,
  // height: 1100
}




// (async () => {
//   const browser = await chromium.launch()
//   const page = await browser.newPage()
//   await page.goto('https://checklyhq.com/learn/headless')
//   await page.pdf({ path: 'checkly.pdf' })
//   await browser.close()
// })()

const generatePdf = async (html, options = defaultOptions) => {
  const args = [
    '--no-sandbox',
    '--disable-setuid-sandbox'
  ]

  console.log('== ブラウザ起動 ==================')
  const browser = await chromium.launch()
  // const browser = await chromium.launch({
  //   ignoreHTTPSErrors: true,
  //   args: args
  // })

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


// const generatePdf = async (html, options = defaultOptions) => {
//   const args = [
//     '--no-sandbox',
//     '--disable-setuid-sandbox'
//   ]

//   console.log('== ブラウザ起動 ==================')
//   const browser = await puppeteer.launch({
//     ignoreHTTPSErrors: true,
//     args: args
//   })
//   console.log('== ページ表示開始 ==================')
//   const page = await browser.newPage()

//   await page.setContent(html, {
//     waitUntil: 'networkidle0'
//   })

//   const data = await page.pdf(options).finally(async () => {
//     await browser.close()
//     console.log('== ブラウザ停止 ===================')
//   })

//   return Buffer.from(Object.values(data))
// }

module.exports = generatePdf
