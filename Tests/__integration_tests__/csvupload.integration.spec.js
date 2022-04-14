'use strict'
const app = require('../../Application/app')
const request = require('supertest')
const { JSDOM } = require('jsdom')
const db = require('../../Application/models')
const getTenantId = {}

jest.setTimeout(60000) // jestのタイムアウトを60秒とする

const getCookies = require('./getCookies')

describe('ルーティングのインテグレーションテスト', () => {
  let acCookies
  let userCookies
  let testTenantId

  const csvData = {
    filename: 'integration_test_csv_file',
    fileData: Buffer.from(
      `発行日,請求書番号,テナントID,支払期日,納品日,備考,銀行名,支店名,科目,口座番号,口座名義,その他特記事項,明細-項目ID,明細-内容,明細-数量,明細-単位,明細-単価,明細-税（消費税／軽減税率／不課税／免税／非課税）,明細-備考
    2021-06-14,INTE_TEST_INVOICE_1_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-17,test111,testsiten,testbank,普通,1230012,kang_test,特記事項テストです。,001,PC,100,個,100000,消費税,アップロードテスト`
    ).toString('base64'),
    uploadFormatId: ''
  }

  describe('0.前準備', () => {
    test('/authにアクセス：oauth2認証をし、セッション用Cookieを取得', async () => {
      // アカウント管理者と一般ユーザのID/SECRETは、テストコマンドの引数から取得
      const options = require('minimist')(process.argv.slice(2))
      const adminId = options.adminid
      const adminSecret = options.adminsecret
      const userId = options.userid
      const userSecret = options.usersecret
      // --------------------アカウント管理者のCookieを取得---------------
      acCookies = await getCookies(app, request, getTenantId, adminId, adminSecret)
      // ---------------------一般ユーザのCookieを取得--------------------
      userCookies = await getCookies(app, request, getTenantId, userId, userSecret)

      // Cookieを使ってローカル開発環境のDBからCookieと紐づくユーザを削除しておく

      // DBクリア
      await db.User.destroy({ where: { tenantId: getTenantId.id } })
      await db.Tenant.destroy({ where: { tenantId: getTenantId.id } })
    })
  })

  test('テナントID設定', async () => {
    testTenantId = getTenantId.id
  })

  describe('1.契約ステータス：未登録', () => {
    // 利用登録をしていないため、請求書一括アップロードページ利用できない
    test('管理者、契約ステータス：未登録、GET利用不可', async () => {
      const res = await request(app)
        .get('/csvupload')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(500)

      expect(res.text).toMatch(/お探しのページは見つかりませんでした。/i) // タイトル
    })

    test('一般ユーザ、契約ステータス：未登録、GET利用不可', async () => {
      const res = await request(app)
        .get('/csvupload')
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
        .expect(500)

      expect(res.text).toMatch(/お探しのページは見つかりませんでした。/i) // タイトル
    })

    // 利用登録をしていないため、請求書一括アップロード機能利用できない
    test('管理者、契約ステータス：未登録、POST利用不可', async () => {
      const res = await request(app)
        .post('/csvupload')
        .set('Content-Type', 'application/json')
        .send({ ...csvData })
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(500)

      expect(res.text).toMatch(/システムエラーが発生しました。/i)
      expect(res.text).toMatch(/時間を空けてもう一度アップロードしてください。/i)
    })

    test('一般ユーザ、契約ステータス：未登録、POST利用不可', async () => {
      const res = await request(app)
        .post('/csvupload')
        .set('Content-Type', 'application/json')
        .send({ ...csvData })
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
        .expect(500)

      expect(res.text).toMatch(/システムエラーが発生しました。/i)
      expect(res.text).toMatch(/時間を空けてもう一度アップロードしてください。/i)
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
    test('管理者、契約ステータス：登録申込、GET利用可能', async () => {
      const res = await request(app)
        .get('/csvupload')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(200)

      expect(res.text).toMatch(/ - BConnectionデジタルトレード/i) // タイトル
      expect(res.text).toMatch(/請求書一括作成/i) // タイトル
      expect(res.text).toMatch(/ファイルを選択してください。/i) // タイトル
      expect(res.text).toMatch(/取込結果一覧 →/i) // タイトル
    })

    test('一般ユーザ、契約ステータス：登録申込、GET利用可能', async () => {
      const res = await request(app)
        .get('/csvupload')
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
        .expect(200)

      expect(res.text).toMatch(/ - BConnectionデジタルトレード/i) // タイトル
      expect(res.text).toMatch(/請求書一括作成/i) // タイトル
      expect(res.text).toMatch(/ファイルを選択してください。/i) // タイトル
      expect(res.text).toMatch(/取込結果一覧 →/i) // タイトル
    })

    // テナントステータスが「新規申込」、請求書一括アップロードページ利用できる
    test('管理者、契約ステータス：登録申込、POST利用可能', async () => {
      const res = await request(app)
        .post('/csvupload')
        .set('Content-Type', 'application/json')
        .send({ ...csvData })
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(200)

      switch (res.text) {
        case 'OK':
          expect(res.text).toMatch('OK')
          break
        case '重複の請求書番号があります。':
          expect(res.text).toMatch('重複の請求書番号があります。')
          break
      }
    })

    test('一般ユーザ、契約ステータス：登録申込、POST利用可能', async () => {
      const res = await request(app)
        .post('/csvupload')
        .set('Content-Type', 'application/json')
        .send({ ...csvData })
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
        .expect(200)

      switch (res.text) {
        case 'OK':
          expect(res.text).toMatch('OK')
          break
        case '重複の請求書番号があります。':
          expect(res.text).toMatch('重複の請求書番号があります。')
          break
      }
    })

    test('事前準備:アップロードフォーマット設定 登録', async () => {
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
      expect(await page.url()).toMatch('https://localhost:3000/uploadFormat')

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
    test('管理者、契約ステータス：登録受付、GET利用可能', async () => {
      // 契約ステータス：登録受付に変更
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

      const res = await request(app)
        .get('/csvupload')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(200)

      expect(res.text).toMatch(/ - BConnectionデジタルトレード/i) // タイトル
      expect(res.text).toMatch(/請求書一括作成/i) // タイトル
      expect(res.text).toMatch(/ファイルを選択してください。/i) // タイトル
      expect(res.text).toMatch(/取込結果一覧 →/i) // タイトル
    })

    test('一般ユーザ、契約ステータス：登録受付、GET利用可能', async () => {
      const res = await request(app)
        .get('/csvupload')
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
        .expect(200)

      expect(res.text).toMatch(/ - BConnectionデジタルトレード/i) // タイトル
      expect(res.text).toMatch(/請求書一括作成/i) // タイトル
      expect(res.text).toMatch(/ファイルを選択してください。/i) // タイトル
      expect(res.text).toMatch(/取込結果一覧 →/i) // タイトル
    })

    test('管理者、契約ステータス：登録受付、POST利用可能', async () => {
      const res = await request(app)
        .post('/csvupload')
        .set('Content-Type', 'application/json')
        .send({ ...csvData })
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(200)

      switch (res.text) {
        case 'OK':
          expect(res.text).toMatch('OK')
          break
        case '重複の請求書番号があります。':
          expect(res.text).toMatch('重複の請求書番号があります。')
          break
      }
    })

    test('一般ユーザ、契約ステータス：登録受付、POST利用可能', async () => {
      const res = await request(app)
        .post('/csvupload')
        .set('Content-Type', 'application/json')
        .send({ ...csvData })
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
        .expect(200)

      switch (res.text) {
        case 'OK':
          expect(res.text).toMatch('OK')
          break
        case '重複の請求書番号があります。':
          expect(res.text).toMatch('重複の請求書番号があります。')
          break
      }
    })

    // テナントステータスが「新規受付」、請求書一括アップロードページ利用できる
    test('/csvuploadにPOST：利用できる', async () => {
      const res = await request(app)
        .post('/csvupload')
        .set('Content-Type', 'application/json')
        .send({ ...csvData })
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(200)

      switch (res.text) {
        case 'OK':
          expect(res.text).toMatch('OK')
          break
        case '重複の請求書番号があります。':
          expect(res.text).toMatch('重複の請求書番号があります。')
          break
      }
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

    test('アップロードフォーマット設定一覧画面へ遷移', async () => {
      const puppeteer = require('puppeteer')
      const browser = await puppeteer.launch({
        headless: true,
        ignoreHTTPSErrors: true
      })

      // 新しいページ起動
      const page = await browser.newPage()
      await page.setCookie(acCookies[0])

      await page.waitForTimeout(500)

      // 請求書一覧作成移動
      await page.goto('https://localhost:3000/csvupload')

      // アップロードフォーマット一覧画面へ遷移
      await page.click(
        'body > div.max-width > div > div.column.is-11 > div.box > div:nth-child(4) > div.columns.mt-0.pt-0 > div > a'
      )

      // アップロードフォーマット一覧画面へ移動結果確認
      expect(await page.url()).toMatch('https://localhost:3000/uploadFormatList')
      await browser.close()
    })
  })

  describe('4.契約ステータス：契約中', () => {
    test('管理者、契約ステータス：契約中、GET利用可能', async () => {
      // 契約ステータス：契約中に変更
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

      const res = await request(app)
        .get('/csvupload')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(200)

      expect(res.text).toMatch(/ - BConnectionデジタルトレード/i) // タイトル
      expect(res.text).toMatch(/請求書一括作成/i) // タイトル
      expect(res.text).toMatch(/ファイルを選択してください。/i) // タイトル
      expect(res.text).toMatch(/取込結果一覧 →/i) // タイトル
    })

    test('一般ユーザ、契約ステータス：契約中、GET利用可能', async () => {
      const res = await request(app)
        .get('/csvupload')
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
        .expect(200)

      expect(res.text).toMatch(/ - BConnectionデジタルトレード/i) // タイトル
      expect(res.text).toMatch(/請求書一括作成/i) // タイトル
      expect(res.text).toMatch(/ファイルを選択してください。/i) // タイトル
      expect(res.text).toMatch(/取込結果一覧 →/i) // タイトル
    })

    test('管理者、契約ステータス：契約中、POST利用可能', async () => {
      const res = await request(app)
        .post('/csvupload')
        .set('Content-Type', 'application/json')
        .send({ ...csvData })
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(200)

      switch (res.text) {
        case 'OK':
          expect(res.text).toMatch('OK')
          break
        case '重複の請求書番号があります。':
          expect(res.text).toMatch('重複の請求書番号があります。')
          break
      }
    })

    test('一般ユーザ、契約ステータス：契約中、POST利用可能', async () => {
      const res = await request(app)
        .post('/csvupload')
        .set('Content-Type', 'application/json')
        .send({ ...csvData })
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
        .expect(200)

      switch (res.text) {
        case 'OK':
          expect(res.text).toMatch('OK')
          break
        case '重複の請求書番号があります。':
          expect(res.text).toMatch('重複の請求書番号があります。')
          break
      }
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

  describe('5.契約ステータス：変更申込', () => {
    test('管理者、契約ステータス：変更申込、GET利用可能', async () => {
      // 契約ステータス：変更申込に変更
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

      const res = await request(app)
        .get('/csvupload')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(200)

      expect(res.text).toMatch(/ - BConnectionデジタルトレード/i) // タイトル
      expect(res.text).toMatch(/請求書一括作成/i) // タイトル
      expect(res.text).toMatch(/ファイルを選択してください。/i) // タイトル
      expect(res.text).toMatch(/取込結果一覧 →/i) // タイトル
    })

    test('一般ユーザ、契約ステータス：変更申込、GET利用可能', async () => {
      const res = await request(app)
        .get('/csvupload')
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
        .expect(200)

      expect(res.text).toMatch(/ - BConnectionデジタルトレード/i) // タイトル
      expect(res.text).toMatch(/請求書一括作成/i) // タイトル
      expect(res.text).toMatch(/ファイルを選択してください。/i) // タイトル
      expect(res.text).toMatch(/取込結果一覧 →/i) // タイトル
    })

    test('管理者、契約ステータス：変更申込、POST利用可能', async () => {
      const res = await request(app)
        .post('/csvupload')
        .set('Content-Type', 'application/json')
        .send({ ...csvData })
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(200)

      switch (res.text) {
        case 'OK':
          expect(res.text).toMatch('OK')
          break
        case '重複の請求書番号があります。':
          expect(res.text).toMatch('重複の請求書番号があります。')
          break
      }
    })

    test('一般ユーザ、契約ステータス：変更申込、POST利用可能', async () => {
      const res = await request(app)
        .post('/csvupload')
        .set('Content-Type', 'application/json')
        .send({ ...csvData })
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
        .expect(200)

      switch (res.text) {
        case 'OK':
          expect(res.text).toMatch('OK')
          break
        case '重複の請求書番号があります。':
          expect(res.text).toMatch('重複の請求書番号があります。')
          break
      }
    })

    test('アップロードフォーマット設定 確認画面アクセス：正常', async () => {
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

  describe('5.契約ステータス：変更受付', () => {
    test('管理者、契約ステータス：変更受付、GET利用不可', async () => {
      await db.Contract.update({ contractStatus: '41' }, { where: { tenantId: testTenantId } })
      const res = await request(app)
        .get('/csvupload')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(200)

      expect(res.text).toMatch(/ - BConnectionデジタルトレード/i) // タイトル
      expect(res.text).toMatch(/請求書一括作成/i) // タイトル
      expect(res.text).toMatch(/ファイルを選択してください。/i) // タイトル
      expect(res.text).toMatch(/取込結果一覧 →/i) // タイトル
    })

    test('一般ユーザ、契約ステータス：変更受付、GET利用不可', async () => {
      await db.Contract.update({ contractStatus: '41' }, { where: { tenantId: testTenantId } })
      const res = await request(app)
        .get('/csvupload')
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
        .expect(200)

      expect(res.text).toMatch(/ - BConnectionデジタルトレード/i) // タイトル
      expect(res.text).toMatch(/請求書一括作成/i) // タイトル
      expect(res.text).toMatch(/ファイルを選択してください。/i) // タイトル
      expect(res.text).toMatch(/取込結果一覧 →/i) // タイトル
    })
  })

  test('管理者、契約ステータス：変更受付、POST利用可能', async () => {
    const res = await request(app)
      .post('/csvupload')
      .set('Content-Type', 'application/json')
      .send({ ...csvData })
      .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
      .expect(200)

    switch (res.text) {
      case 'OK':
        expect(res.text).toMatch('OK')
        break
      case '重複の請求書番号があります。':
        expect(res.text).toMatch('重複の請求書番号があります。')
        break
    }
  })

  test('一般ユーザ、契約ステータス：変更受付、POST利用可能', async () => {
    const res = await request(app)
      .post('/csvupload')
      .set('Content-Type', 'application/json')
      .send({ ...csvData })
      .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
      .expect(200)

    switch (res.text) {
      case 'OK':
        expect(res.text).toMatch('OK')
        break
      case '重複の請求書番号があります。':
        expect(res.text).toMatch('重複の請求書番号があります。')
        break
    }
  })

  describe('5.契約ステータス：解約申込', () => {
    test('管理者、契約ステータス：解約申込、GET利用不可', async () => {
      await db.Contract.update({ contractStatus: '30' }, { where: { tenantId: testTenantId } })
      const res = await request(app)
        .get('/csvupload')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(200)

      expect(res.text).toMatch(/現在解約手続き中です。/i) // 画面内容
    })

    test('一般ユーザ、契約ステータス：解約申込、GET利用不可', async () => {
      // 契約ステータス変更(利用登録済み)
      const res = await request(app)
        .get('/csvupload')
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
        .expect(200)

      expect(res.text).toMatch(/現在解約手続き中です。/i) // 画面内容
    })

    test('管理者、契約ステータス：解約申込、POST利用不可', async () => {
      await request(app)
        .post('/csvupload')
        .set('Content-Type', 'application/json')
        .send({ ...csvData })
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(400)
    })

    test('一般ユーザ、契約ステータス：解約申込、POST利用不可', async () => {
      await request(app)
        .post('/csvupload')
        .set('Content-Type', 'application/json')
        .send({ ...csvData })
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
        .expect(400)
    })
  })

  describe('5.契約ステータス：解約受付', () => {
    test('管理者、契約ステータス：解約受付、GET利用不可', async () => {
      await db.Contract.update({ contractStatus: '31' }, { where: { tenantId: testTenantId } })
      const res = await request(app)
        .get('/csvupload')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(200)

      expect(res.text).toMatch(/現在解約手続き中です。/i) // 画面内容
    })

    test('一般ユーザ、契約ステータス：解約受付、GET利用不可', async () => {
      // 契約ステータス変更(利用登録済み)
      const res = await request(app)
        .get('/csvupload')
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
        .expect(200)

      expect(res.text).toMatch(/現在解約手続き中です。/i) // 画面内容
    })

    test('管理者、契約ステータス：解約受付、POST利用不可', async () => {
      await request(app)
        .post('/csvupload')
        .set('Content-Type', 'application/json')
        .send({ ...csvData })
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(400)
    })

    test('一般ユーザ、契約ステータス：解約受付、POST利用不可', async () => {
      await request(app)
        .post('/csvupload')
        .set('Content-Type', 'application/json')
        .send({ ...csvData })
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
        .expect(400)
    })
  })

  describe('5.契約ステータス：解約', () => {
    test('管理者、契約ステータス：解約、GET利用不可', async () => {
      await db.Contract.update(
        { contractStatus: '99', deleteFlag: 'true', numberN: '' },
        { where: { tenantId: testTenantId } }
      )
      await db.Tenant.update({ deleteFlag: 1 }, { where: { tenantId: testTenantId } })
      const res = await request(app)
        .get('/csvupload')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(500)

      expect(res.text).toMatch(/お探しのページは見つかりませんでした。/i) // 画面内容
    })

    test('一般ユーザ、契約ステータス：解約、GET利用不可', async () => {
      // 契約ステータス変更(利用登録済み)
      const res = await request(app)
        .get('/csvupload')
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
        .expect(500)

      expect(res.text).toMatch(/お探しのページは見つかりませんでした。/i) // 画面内容
    })

    test('管理者、契約ステータス：解約、POST利用不可', async () => {
      const res = await request(app)
        .post('/csvupload')
        .set('Content-Type', 'application/json')
        .send({ ...csvData })
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(500)

      expect(res.text).toMatch(/システムエラーが発生しました。/i)
      expect(res.text).toMatch(/時間を空けてもう一度アップロードしてください。/i)
    })

    test('一般ユーザ、契約ステータス：解約、POST利用不可', async () => {
      const res = await request(app)
        .post('/csvupload')
        .set('Content-Type', 'application/json')
        .send({ ...csvData })
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
        .expect(500)

      expect(res.text).toMatch(/システムエラーが発生しました。/i)
      expect(res.text).toMatch(/時間を空けてもう一度アップロードしてください。/i)
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
