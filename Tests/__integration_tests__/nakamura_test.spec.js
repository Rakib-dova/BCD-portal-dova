'use strict'
const request = require('supertest')
const puppeteer = require('puppeteer') // ①puppeteerの読み込み
const url = 'https://bcd-portal.tsdev.biz' // ②ここにURLを入力する
const fs = require('fs')

;(async () => {
  // ③puppeteerからブラウザと新規タブを立ち上げる
  const browser = await puppeteer.launch()
  const page = await browser.newPage()
  const res = await request(url).get('/auth')

  // ④pageを目的のURLへ移動
  await page.goto(res.headers.location)

  // ⑤html全体を取得
  const html = await page.$eval('html', (item) => {
    return item.innerHTML
  })
  try {
    fs.writeFileSync(process.argv[2], html)
    console.log('write end')
  } catch (e) {
    console.log(e)
  }
  // ⑧puppeteerを終了
  await browser.close()
})()
