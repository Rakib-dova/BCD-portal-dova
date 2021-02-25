'use strict'
// const app = require('../../Application/app')
const request = require('supertest')
const fs = require('fs')
const csvSync = require('csv-parse/lib/sync')
const csvWriter = require('csv-writer')
const app = 'https://bcd-portal.digitaltrade.jp'
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

jest.setTimeout(4000000) // jestのタイムアウトを4000秒とする

const getCookies = async (username, password) => {
  const page = await browser.newPage()

  const res = await request(app).get('/auth')

  await page.goto(res.headers.location) // Tradeshift Oauth2認証ログインページをヘッドレスブラウザで開く

  let title = await page.title()
  expect(title).toBe('ログイン | Tradeshift')
  console.log('次のページに遷移しました：' + title) // 「ログイン | Tradeshift」のはず

  await page.type('input[name="j_username"]', username)
  await page.type('input[name="j_password"]', password)

  // await page.click('body button#proceed') //page.clickで何故か押せない…
  // await page.evaluate((body) => body.querySelector('button#proceed').click(), await page.$('body'))
  // クッキー使用の許諾をクリック
  await page.click('#cookie-consent-accept-all')
  // 進むボタンをクリック（クッキー許諾後は、page.click使用可能）
  await page.click('#proceed')

  // Oauth2認証後、ヘッドレスブラウザ内ではアプリにリダイレクトしている
  await page.waitForTimeout(10000) // 10秒待つことにする

  title = await page.title()
  expect(title).toMatch(/BConnectionデジタルトレード/i)
  console.log('次のページに遷移しました：' + title) // 「XXX - BConnectionデジタルトレード」となるはず

  const cookies = await page.cookies() // cookieを奪取

  // ヘッドレスブラウザ内のCookieを削除しておく
  const client = await page.target().createCDPSession()
  await client.send('Network.clearBrowserCookies')
  await client.send('Network.clearBrowserCache')
  return cookies
}

// 既存のCSVを読み込み、ユーザオブジェクトの配列を返却する
const getCsvData = async (source) => {
  // ファイルを開く
  const buffer = fs.readFileSync(source)
  // CSVを読み込み配列columnsオプションをtrueにすることで、ヘッダ名をキーとするオブジェクトで取得出来る
  const users = csvSync(buffer, { columns: true })
  console.log('CSVファイルを読み込みました。')
  return users
}

// CSVファイルにユーザ一覧を書き込む
const writeCsvData = async (path, users) => {
  const writer = csvWriter.createObjectCsvWriter({
    // 保存する先のパス(すでにファイルがある場合は上書き保存)
    path: path,
    // CSVのヘッダとユーザオブジェクトのキーを設定する
    header: [
      { id: 'mail_address', title: 'mail_address' },
      { id: 'password', title: 'password' },
      { id: 'session_id', title: 'session_id' },
      { id: 'keyword', title: 'keyword' }
    ],
    // 改行文字
    recordDelimiter: '\r\n'
  })
  await writer.writeRecords(users)
  console.log('CSVファイルを作成しました。: ' + path)
}

// ファイルのバックアップを取る
const backupCsv = async (csvPath) => {
  // ファイル名の末尾に日時を付けてコピーする
  const backupPath = csvPath + new Date().toLocaleString().replace(/:/g, '').replace(/\//g, '').replace(' ', '_')
  return new Promise((resolve, reject) => {
    fs.copyFile(csvPath, backupPath, (err) => {
      if (err) {
        console.log('CSVファイルのバックアップに失敗しました。')
        reject(err)
      } else {
        console.log('CSVファイルのバックアップを作成しました。: ' + backupPath)
        resolve()
      }
    })
  })
}

test('セッションIDを取得してCSVに出力する', async () => {
  // CSVファイルのパスをコマンド引数から取得
  const options = require('minimist')(process.argv.slice(2))
  const csvPath = options.file

  // CSVファイルのバックアップを作成する
  await backupCsv(csvPath)
  // CSVを読み込みユーザオブジェクトの配列を取得
  const users = await getCsvData(csvPath)
  for (const user of users) {
    // Cookieを取得
    console.log('Cookieを取得します。 : ' + user.mail_address)
    const cookies = await getCookies(user.mail_address, user.password)
    const cookie = cookies.find((cookie) => cookie?.name === 'bcd.sid')
    // セッションIDを上書きする
    user.session_id = cookie.value
  }
  await writeCsvData(csvPath, users)
})
