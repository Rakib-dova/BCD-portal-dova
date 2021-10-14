'use strict'
const app = require('../../Application/app')
const request = require('supertest')
const { JSDOM } = require('jsdom')
let testTenantId = null
const db = require('../../Application/models')

jest.setTimeout(60000) // jestのタイムアウトを60秒とする

const getCookies = async (username, password) => {
  const page = await browser.newPage()

  const res = await request(app).get('/auth')

  await page.goto(res.headers.location) // Tradeshift Oauth2認証ログインページをヘッドレスブラウザで開く

  expect(await page.title()).toBe('ログイン | Tradeshift')
  console.log('次のページに遷移しました：' + (await page.title())) // 「ログイン | Tradeshift」のはず

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

  // テナントId取得
  if (!testTenantId) {
    await page.goto('https://sandbox.tradeshift.com')
    const tradeshiftConfig = await page.evaluate(() => {
      return window.ts.chrome.config
    })
    testTenantId = tradeshiftConfig.companyId
  }

  await page.goto(res.headers.location)
  // expect(await page.title()).toMatch('利用登録 - BConnectionデジタルトレード')
  console.log('次のページに遷移しました：' + (await page.title())) // 「XXX - BConnectionデジタルトレード」となるはず

  const cookies = await page.cookies() // cookieを奪取

  // ヘッドレスブラウザ内のCookieを削除しておく
  const client = await page.target().createCDPSession()
  await client.send('Network.clearBrowserCookies')
  await client.send('Network.clearBrowserCache')

  return cookies
}

describe('ルーティングのインテグレーションテスト', () => {
  let acCookies
  let userCookies

  describe('0.前準備', () => {
    test('/authにアクセス：oauth2認証をし、セッション用Cookieを取得', async () => {
      // アカウント管理者と一般ユーザのID/SECRETは、テストコマンドの引数から取得
      const options = require('minimist')(process.argv.slice(2))
      const adminId = options.adminid
      const adminSecret = options.adminsecret
      const userId = options.userid
      const userSecret = options.usersecret
      // --------------------アカウント管理者のCookieを取得---------------
      acCookies = await getCookies(adminId, adminSecret)
      // ---------------------一般ユーザのCookieを取得--------------------
      userCookies = await getCookies(userId, userSecret)

      // Cookieを使ってローカル開発環境のDBからCookieと紐づくユーザを削除しておく

      // DBクリア
      await db.User.destroy({ where: { tenantId: testTenantId } })
      await db.Tenant.destroy({ where: { tenantId: testTenantId } })
    })
  })

  describe('1.契約ステータス：新規登録', () => {
    // 利用登録
    let tenantCsrf
    test('利用登録画面へ遷移', async () => {
      const res = await request(app)
        .get('/tenant/register')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(200)

      // CSRFのワンタイムトークン取得
      const dom = new JSDOM(res.text)
      tenantCsrf = dom.window.document.getElementsByName('_csrf')[0]?.value

      expect(res.text).toMatch(/利用登録 - BConnectionデジタルトレード/i) // タイトル
    })

    // 利用登録後
    test('利用登録実施', async () => {
      const res = await request(app)
        .post('/tenant/register')
        .type('form')
        .send({ _csrf: tenantCsrf, termsCheck: 'on' })
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(303)

      expect(res.header.location).toBe('/portal') // リダイレクト先は/portal
    })

    // 利用登録後、ユーザコンテキスト変更
    test('ユーザコンテキスト変更', async () => {
      const res = await request(app)
        .get('/portal')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(200)

      expect(res.text).toMatch(/ポータル - BConnectionデジタルトレード/i) // タイトルが含まれていること
    })

    // 利用登録後、一般ユーザ登録
    test('一般ユーザ登録', async () => {
      const res = await request(app)
        .get('/portal')
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
        .expect(200)

      expect(res.text).toMatch(/ポータル - BConnectionデジタルトレード/i) // タイトルが含まれていること
    })
  })

  describe('2.契約ステータス：登録申込', () => {
    test('前準備:アップロードフォーマット設定 登録', async () => {
      const puppeteer = require('puppeteer')
      const browser = await puppeteer.launch({
        headless: true,
        ignoreHTTPSErrors: true
      })
      const page = await browser.newPage()
      await page.setCookie(acCookies[0])
      await page.goto('https://localhost:3000/csvBasicFormat')

      await page.type('#uploadFormatItemName', 'インテ')
      await page.type('#uploadType', '請求書')
      const [fileChooser] = await Promise.all([
        page.waitForFileChooser(),
        page.click(
          '#form > article > div > div > div:nth-child(1) > div > div:nth-child(1) > div > div:nth-child(3) > div > div > div:nth-child(2) > label'
        )
      ])

      await fileChooser.accept(['./testData/csvUpload_Format.csv'])

      await page.waitForTimeout(1000)

      await page.click('#checkItemNameLineOn')
      await page.type('#uploadFormatNumber', '1')
      await page.type('#defaultNumber', '2')

      await page.type('#keyConsumptionTax', 'V')
      await page.type('#keyReducedTax', '8')
      await page.type('#keyFreeTax', 'X')
      await page.type('#keyDutyFree', 'F')
      await page.type('#keyExemptTax', 'FX')

      await page.type('#keyManMonth', 'manpower')
      await page.type('#keyBottle', 'bot')
      await page.type('#keyCost', 'cst')
      await page.type('#keyContainer', 'ctn')
      await page.type('#keyCentilitre', 'ctr')
      await page.type('#keySquareCentimeter', 'sqc')
      await page.type('#keyCubicCentimeter', 'cct')
      await page.type('#keyCentimeter', 'ctm')
      await page.type('#keyCase', 'cas')
      await page.type('#keyCarton', 'cat')
      await page.type('#keyDay', 'day')
      await page.type('#keyDeciliter', 'dec')
      await page.type('#keyDecimeter', 'dem')
      await page.type('#keyGrossKilogram', 'kg')
      await page.type('#keyPieces', 'ea')
      await page.type('#keyFeet', 'fot')
      await page.type('#keyGallon', 'gal')
      await page.type('#keyGram', 'grm')
      await page.type('#keyGrossTonnage', 'ton')
      await page.type('#keyHour', 'hou')
      await page.type('#keyKilogram', 'kgm')
      await page.type('#keyKilometers', 'km')
      await page.type('#keyKilowattHour', 'kwh')
      await page.type('#keyPound', 'pnd')
      await page.type('#keyLiter', 'li')
      await page.type('#keyMilliliter', 'mli')
      await page.type('#keyMillimeter', 'mmt')
      await page.type('#keyMonth', 'mon')
      await page.type('#keySquareMeter', 'smt')
      await page.type('#keyCubicMeter', 'cmt')
      await page.type('#keyMeter', 'met')
      await page.type('#keyNetTonnage', 'ntn')
      await page.type('#keyPackage', 'pkg')
      await page.type('#keyRoll', 'rll')
      await page.type('#keyFormula', 'fml')
      await page.type('#keyTonnage', 'tng')
      await page.type('#keyOthers', 'zz')

      await page.click('#submit')

      await page.waitForTimeout(1000)

      expect(await page.url()).toMatch('https://localhost:3000/uploadFormat')

      await page.click('#issueDate')
      await page.type('#issueDate', '2')
      await page.click('#invoiceNumber')
      await page.type('#invoiceNumber', '3')
      await page.click('#tenantId')
      await page.type('#tenantId', '4')
      await page.click('#paymentDate')
      await page.type('#paymentDate', '5')
      await page.click('#deliveryDate')
      await page.type('#deliveryDate', '6')
      await page.click('#documentDescription')
      await page.type('#documentDescription', '7')
      await page.click('#bankName')
      await page.type('#bankName', '8')
      await page.click('#financialName')
      await page.type('#financialName', '9')
      await page.click('#accountType')
      await page.type('#accountType', '10')
      await page.click('#accountId')
      await page.type('#accountId', '11')
      await page.click('#accountName')
      await page.type('#accountName', '12')
      await page.click('#note')
      await page.type('#note', '13')
      await page.click('#sellersItemNum')
      await page.type('#sellersItemNum', '14')
      await page.click('#itemName')
      await page.type('#itemName', '15')
      await page.click('#quantityValue')
      await page.type('#quantityValue', '16')
      await page.click('#quantityUnitCode')
      await page.type('#quantityUnitCode', '17')
      await page.click('#priceValue')
      await page.type('#priceValue', '18')
      await page.click('#taxRate')
      await page.type('#taxRate', '19')
      await page.click('#description')
      await page.type('#description', '20')

      await page.click('#confirmBtn')

      await page.waitForTimeout(1000)

      // アップロードフォーマット設定 確認画面に移動すること確認
      expect(await page.url()).toMatch('https://localhost:3000/csvConfirmFormat')

      await page.click('#submit')

      await browser.close()
    })

    test('管理者、請求書一括作成アクセス：フォーマット種別確認', async () => {
      const puppeteer = require('puppeteer')
      const browser = await puppeteer.launch({
        headless: true,
        ignoreHTTPSErrors: true
      })
      const page = await browser.newPage()
      await page.setCookie(acCookies[0])
      await page.goto('https://localhost:3000/csvupload')

      await page.waitForTimeout(500)

      const formatResult = await page.evaluate(() => {
        if (document.getElementById('start-upload-select')[1].innerText.match('インテ') !== null) {
          return document.getElementById('start-upload-select')[1].innerText.match('インテ')[0]
        }
        return null
      })

      // 'インテ'があること
      expect(formatResult).toBe('インテ')

      await browser.close()
    })

    test('一般ユーザ、請求書一括作成アクセス：フォーマット種別確認', async () => {
      const puppeteer = require('puppeteer')
      const browser = await puppeteer.launch({
        headless: true,
        ignoreHTTPSErrors: true
      })
      const page = await browser.newPage()
      await page.setCookie(userCookies[0])
      await page.goto('https://localhost:3000/csvupload')

      await page.waitForTimeout(500)

      const formatResult = await page.evaluate(() => {
        if (document.getElementById('start-upload-select')[1].innerText.match('インテ') !== null) {
          return document.getElementById('start-upload-select')[1].innerText.match('インテ')[0]
        }
        return null
      })

      // 'インテ'があること
      expect(formatResult).toBe('インテ')

      await browser.close()
    })
  })

  describe('3.契約ステータス：登録受付', () => {
    test('管理者、請求書一括作成アクセス：フォーマット種別確認', async () => {
      const contract = await db.Contract.findOne({
        where: {
          tenantId: testTenantId
        }
      })
      if (contract.dataValues.contractStatus !== '11') {
        await db.Contract.update(
          {
            contractStatus: '11'
          },
          {
            where: {
              tenantId: testTenantId
            }
          }
        )
      }

      const puppeteer = require('puppeteer')
      const browser = await puppeteer.launch({
        headless: true,
        ignoreHTTPSErrors: true
      })
      const page = await browser.newPage()
      await page.setCookie(acCookies[0])
      await page.goto('https://localhost:3000/csvupload')

      await page.waitForTimeout(500)

      const formatResult = await page.evaluate(() => {
        if (document.getElementById('start-upload-select')[1].innerText.match('インテ') !== null) {
          return document.getElementById('start-upload-select')[1].innerText.match('インテ')[0]
        }
        return null
      })

      // 'インテ'があること
      expect(formatResult).toBe('インテ')

      await browser.close()
    })

    test('一般ユーザ、請求書一括作成アクセス：フォーマット種別確認', async () => {
      const puppeteer = require('puppeteer')
      const browser = await puppeteer.launch({
        headless: true,
        ignoreHTTPSErrors: true
      })
      const page = await browser.newPage()
      await page.setCookie(userCookies[0])
      await page.goto('https://localhost:3000/csvupload')

      await page.waitForTimeout(500)

      const formatResult = await page.evaluate(() => {
        if (document.getElementById('start-upload-select')[1].innerText.match('インテ') !== null) {
          return document.getElementById('start-upload-select')[1].innerText.match('インテ')[0]
        }
        return null
      })

      // 'インテ'があること
      expect(formatResult).toBe('インテ')

      await browser.close()
    })
  })

  describe('4.契約ステータス：契約中', () => {
    test('管理者、請求書一括作成アクセス：フォーマット種別確認', async () => {
      const contract = await db.Contract.findOne({
        where: {
          tenantId: testTenantId
        }
      })
      await db.Order.destroy({ where: { tenantId: testTenantId } })
      if (contract.dataValues.contractStatus !== '00') {
        await db.Contract.update(
          {
            numberN: '1234567890',
            contractStatus: '00'
          },
          {
            where: {
              tenantId: testTenantId
            }
          }
        )
      }

      const puppeteer = require('puppeteer')
      const browser = await puppeteer.launch({
        headless: true,
        ignoreHTTPSErrors: true
      })
      const page = await browser.newPage()
      await page.setCookie(acCookies[0])
      await page.goto('https://localhost:3000/csvupload')

      await page.waitForTimeout(500)

      const formatResult = await page.evaluate(() => {
        if (document.getElementById('start-upload-select')[1].innerText.match('インテ') !== null) {
          return document.getElementById('start-upload-select')[1].innerText.match('インテ')[0]
        }
        return null
      })

      // 'インテ'があること
      expect(formatResult).toBe('インテ')

      await browser.close()
    })

    test('一般ユーザ、請求書一括作成アクセス：フォーマット種別確認', async () => {
      const puppeteer = require('puppeteer')
      const browser = await puppeteer.launch({
        headless: true,
        ignoreHTTPSErrors: true
      })
      const page = await browser.newPage()
      await page.setCookie(userCookies[0])
      await page.goto('https://localhost:3000/csvupload')

      await page.waitForTimeout(500)

      const formatResult = await page.evaluate(() => {
        if (document.getElementById('start-upload-select')[1].innerText.match('インテ') !== null) {
          return document.getElementById('start-upload-select')[1].innerText.match('インテ')[0]
        }
        return null
      })

      // 'インテ'があること
      expect(formatResult).toBe('インテ')

      await browser.close()
    })
  })

  describe('5.契約ステータス：変更申込', () => {
    test('アップロードフォーマット設定 確認画面アクセス：正常', async () => {
      const contract = await db.Contract.findOne({
        where: {
          tenantId: testTenantId
        }
      })
      const inputTime = new Date()
      await db.Order.create({
        contractId: contract.dataValues.contractId,
        tenantId: testTenantId,
        orderType: '040',
        orderData: 'test',
        createdAt: inputTime,
        updatedAt: inputTime
      })
      if (contract.dataValues.contractStatus !== '40') {
        await db.Contract.update(
          {
            contractStatus: '40'
          },
          {
            where: {
              tenantId: testTenantId
            }
          }
        )
      }

      const puppeteer = require('puppeteer')
      const browser = await puppeteer.launch({
        headless: true,
        ignoreHTTPSErrors: true
      })
      const page = await browser.newPage()
      await page.setCookie(acCookies[0])
      await page.goto('https://localhost:3000/csvupload')

      await page.waitForTimeout(500)

      const formatResult = await page.evaluate(() => {
        if (document.getElementById('start-upload-select')[1].innerText.match('インテ') !== null) {
          return document.getElementById('start-upload-select')[1].innerText.match('インテ')[0]
        }
        return null
      })

      // 'インテ'があること
      expect(formatResult).toBe('インテ')

      await browser.close()
    })

    test('一般ユーザ、請求書一括作成アクセス：フォーマット種別確認', async () => {
      const puppeteer = require('puppeteer')
      const browser = await puppeteer.launch({
        headless: true,
        ignoreHTTPSErrors: true
      })
      const page = await browser.newPage()
      await page.setCookie(userCookies[0])
      await page.goto('https://localhost:3000/csvupload')

      await page.waitForTimeout(500)

      const formatResult = await page.evaluate(() => {
        if (document.getElementById('start-upload-select')[1].innerText.match('インテ') !== null) {
          return document.getElementById('start-upload-select')[1].innerText.match('インテ')[0]
        }
        return null
      })

      // 'インテ'があること
      expect(formatResult).toBe('インテ')

      await browser.close()
    })
  })

  describe('後処理', () => {
    test('userデータ削除', async () => {
      await db.User.destroy({ where: { tenantId: testTenantId } })
      await db.Tenant.destroy({ where: { tenantId: testTenantId } })
      await db.Contract.destroy({ where: { tenantId: testTenantId } })
    })
  })
})