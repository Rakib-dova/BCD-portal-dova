'use strict'
const app = require('../../Application/app')
const request = require('supertest')
const { JSDOM } = require('jsdom')
const db = require('../../Application/models')
const getTenantId = {}

jest.setTimeout(60000) // jestのタイムアウトを60秒とする

const getCookies = require('./getCookies')

describe('勘定科目一括作成のインテグレーションテスト', () => {
  let acCookies
  let userCookies
  let testTenantId

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
    // 利用登録をしていないため、勘定科目一括作成ページ利用できない
    test('管理者、契約ステータス：未登録、GET利用不可', async () => {
      const res = await request(app)
        .get('/uploadAccount')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(500)

      expect(res.text).toMatch(/お探しのページは見つかりませんでした。/i) // 画面内容確認
    })

    test('一般ユーザ、契約ステータス：未登録、GET利用不可', async () => {
      const res = await request(app)
        .get('/uploadAccount')
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
        .expect(500)

      expect(res.text).toMatch(/お探しのページは見つかりませんでした。/i) // 画面内容確認
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
    // テナントステータスが「新規申込」、勘定科目一括作成ページ利用できる
    test('管理者、契約ステータス：登録申込、GET利用可能', async () => {
      const res = await request(app)
        .get('/uploadAccount')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(200)

      // 画面内容確認
      expect(res.text).toMatch(/ - BConnectionデジタルトレード/i)
      expect(res.text).toMatch(/勘定科目一括作成/i)
      expect(res.text).toMatch(/ファイル選択してください/i)
      expect(res.text).toMatch(/勘定科目一覧→/i)
    })

    test('一般ユーザ、契約ステータス：登録申込、GET利用可能', async () => {
      const res = await request(app)
        .get('/uploadAccount')
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
        .expect(200)

      // 画面内容確認
      expect(res.text).toMatch(/ - BConnectionデジタルトレード/i)
      expect(res.text).toMatch(/勘定科目一括作成/i)
      expect(res.text).toMatch(/ファイル選択してください/i)
      expect(res.text).toMatch(/勘定科目一覧→/i)
    })
  })

  describe('3.契約ステータス：登録受付', () => {
    // テナントステータスが「登録受付」、勘定科目一括作成ページ利用できる
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
        .get('/uploadAccount')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(200)

      // 画面内容確認
      expect(res.text).toMatch(/ - BConnectionデジタルトレード/i)
      expect(res.text).toMatch(/勘定科目一括作成/i)
      expect(res.text).toMatch(/ファイル選択してください/i)
      expect(res.text).toMatch(/勘定科目一覧→/i)
    })

    test('一般ユーザ、契約ステータス：登録受付、GET利用可能', async () => {
      const res = await request(app)
        .get('/uploadAccount')
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
        .expect(200)

      // 画面内容確認
      expect(res.text).toMatch(/ - BConnectionデジタルトレード/i)
      expect(res.text).toMatch(/勘定科目一括作成/i)
      expect(res.text).toMatch(/ファイル選択してください/i)
      expect(res.text).toMatch(/勘定科目一覧→/i)
    })
  })

  describe('4.契約ステータス：契約中', () => {
    // テナントステータスが「契約中」、勘定科目一括作成ページ利用できる
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
      // テスト用勘定科目登録
      const v4 = require('uuid').v4
      const testAccountCode = new db.AccountCode({
        accountCodeId: v4(),
        contractId: contract.contractId,
        accountCodeName: 'インテグレーションテスト',
        accountCode: 'INTE0001'
      })
      await testAccountCode.save()

      const res = await request(app)
        .get('/uploadAccount')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(200)

      // 画面内容確認
      expect(res.text).toMatch(/ - BConnectionデジタルトレード/i)
      expect(res.text).toMatch(/勘定科目一括作成/i)
      expect(res.text).toMatch(/ファイル選択してください/i)
      expect(res.text).toMatch(/勘定科目一覧→/i)
    })

    test('一般ユーザ、契約ステータス：契約中、GET利用可能', async () => {
      const res = await request(app)
        .get('/uploadAccount')
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
        .expect(200)

      // 画面内容確認
      expect(res.text).toMatch(/ - BConnectionデジタルトレード/i)
      expect(res.text).toMatch(/勘定科目一括作成/i)
      expect(res.text).toMatch(/ファイル選択してください/i)
      expect(res.text).toMatch(/勘定科目一覧→/i)
    })

    test('勘定科目一覧画面に移動リンク確認', async () => {
      const puppeteer = require('puppeteer')
      const browser = await puppeteer.launch({
        headless: true,
        ignoreHTTPSErrors: true
      })
      const page = await browser.newPage()
      await page.setCookie(acCookies[0])
      await page.goto('https://localhost:3000/uploadAccount')

      await page.waitForTimeout(500)

      await page.click('body > div.max-width > div:nth-child(3) > div > a')

      await page.waitForTimeout(500)

      // 勘定科目一覧画面にに移動すること確認
      expect(await page.url()).toMatch('https://localhost:3000/accountCodeList')

      await browser.close()
    })

    test('勘定科目一括作成：バリデーションチェック機能（勘定科目コード、勘定科目名）', async () => {
      const puppeteer = require('puppeteer')
      const browser = await puppeteer.launch({
        headless: true,
        ignoreHTTPSErrors: true
      })
      const page = await browser.newPage()
      await page.setCookie(acCookies[0])
      await page.goto('https://localhost:3000/uploadAccount')

      await page.waitForTimeout(500)

      const [fileChooser] = await Promise.all([
        page.waitForFileChooser(),
        page.click('#accountCodeUpload > div > label > span.file-cta > span:nth-child(3) > a')
      ])

      await fileChooser.accept(['./testData/accountCodeUpload_inegration1.csv'])

      await page.waitForTimeout(1000)

      page.click('#upload')

      await page.waitForTimeout(500)

      const errorMsg = await page.evaluate(() => {
        return document.querySelector(
          '#errorConfirmmodify-modal > div.modal-card.errnoti-model-size > section:nth-child(3) > div > table'
        ).innerText
      })

      // エラーメッセージ確認
      expect(errorMsg).toMatch('勘定科目コードが未入力です。')
      expect(errorMsg).toMatch('勘定科目コードは10文字以内で入力してください。')
      expect(errorMsg).toMatch('入力した勘定科目コードは既に登録されています。')
      expect(errorMsg).toMatch('勘定科目コードは英数字で入力してください。')
      expect(errorMsg).toMatch('勘定科目名が未入力です。')
      expect(errorMsg).toMatch('勘定科目名は40文字以内で入力してください。')
      expect(errorMsg).toMatch('勘定科目コードが未入力です。,勘定科目名が未入力です。')
      expect(errorMsg).toMatch(
        '勘定科目コードは10文字以内で入力してください。,勘定科目名は40文字以内で入力してください。'
      )

      await browser.close()
    })

    test('勘定科目一括作成：ヘッダチェック', async () => {
      const puppeteer = require('puppeteer')
      const browser = await puppeteer.launch({
        headless: true,
        ignoreHTTPSErrors: true
      })
      const page = await browser.newPage()
      await page.setCookie(acCookies[0])
      await page.goto('https://localhost:3000/uploadAccount')

      await page.waitForTimeout(500)

      const [fileChooser] = await Promise.all([
        page.waitForFileChooser(),
        page.click('#accountCodeUpload > div > label > span.file-cta > span:nth-child(3) > a')
      ])

      await fileChooser.accept(['./testData/accountCodeUpload_inegration2.csv'])

      await page.waitForTimeout(1000)

      page.click('#upload')

      await page.waitForTimeout(500)

      const errorMsg = await page.evaluate(() => {
        return document.querySelector('#confirmmodify-modal > div.modal-card > section').innerText
      })

      // エラーメッセージ確認
      expect(errorMsg).toMatch('ヘッダーが指定のものと異なります。')

      await browser.close()
    })

    test('勘定科目一括作成：の項目数チェック', async () => {
      const puppeteer = require('puppeteer')
      const browser = await puppeteer.launch({
        headless: true,
        ignoreHTTPSErrors: true
      })
      const page = await browser.newPage()
      await page.setCookie(acCookies[0])
      await page.goto('https://localhost:3000/uploadAccount')

      await page.waitForTimeout(500)

      const [fileChooser] = await Promise.all([
        page.waitForFileChooser(),
        page.click('#accountCodeUpload > div > label > span.file-cta > span:nth-child(3) > a')
      ])

      await fileChooser.accept(['./testData/accountCodeUpload_inegration3.csv'])

      await page.waitForTimeout(1000)

      page.click('#upload')

      await page.waitForTimeout(500)

      const errorMsg = await page.evaluate(() => {
        return document.querySelector('#confirmmodify-modal > div.modal-card > section').innerText
      })

      // エラーメッセージ確認
      expect(errorMsg).toMatch('項目数が異なります。')

      await browser.close()
    })

    test('勘定科目一括作成：200件件数超過', async () => {
      const puppeteer = require('puppeteer')
      const browser = await puppeteer.launch({
        headless: true,
        ignoreHTTPSErrors: true
      })
      const page = await browser.newPage()
      await page.setCookie(acCookies[0])
      await page.goto('https://localhost:3000/uploadAccount')

      await page.waitForTimeout(500)

      const [fileChooser] = await Promise.all([
        page.waitForFileChooser(),
        page.click('#accountCodeUpload > div > label > span.file-cta > span:nth-child(3) > a')
      ])

      await fileChooser.accept(['./testData/accountCodeUpload_test4.csv'])

      await page.waitForTimeout(1000)

      page.click('#upload')

      await page.waitForTimeout(500)

      const errorMsg = await page.evaluate(() => {
        return document.querySelector('#confirmmodify-modal > div.modal-card > section').innerText
      })

      // エラーメッセージ確認
      expect(errorMsg).toMatch('勘定科目が200件を超えています。')
      expect(errorMsg).toMatch('CSVファイルを確認後もう一度アップロードしてください。')
      expect(errorMsg).toMatch('（一度に取り込める勘定科目は200件までとなります。）')

      await browser.close()
    })
  })

  describe('5.契約ステータス：変更申込', () => {
    // テナントステータスが「変更申込」、勘定科目一括作成ページ利用できる
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
        .get('/uploadAccount')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(200)

      // 画面内容確認
      expect(res.text).toMatch(/ - BConnectionデジタルトレード/i)
      expect(res.text).toMatch(/勘定科目一括作成/i)
      expect(res.text).toMatch(/ファイル選択してください/i)
      expect(res.text).toMatch(/勘定科目一覧→/i)
    })

    test('一般ユーザ、契約ステータス：変更申込、GET利用可能', async () => {
      const res = await request(app)
        .get('/uploadAccount')
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
        .expect(200)

      // 画面内容確認
      expect(res.text).toMatch(/ - BConnectionデジタルトレード/i)
      expect(res.text).toMatch(/勘定科目一括作成/i)
      expect(res.text).toMatch(/ファイル選択してください/i)
      expect(res.text).toMatch(/勘定科目一覧→/i)
    })
  })

  describe('5.契約ステータス：変更受付', () => {
    // テナントステータスが「変更受付」、勘定科目一括作成ページ利用できる
    test('管理者、契約ステータス：変更受付、GET利用不可', async () => {
      // 契約ステータス：変更受付に変更
      await db.Contract.update({ contractStatus: '41' }, { where: { tenantId: testTenantId } })
      const res = await request(app)
        .get('/uploadAccount')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(200)

      // 画面内容確認
      expect(res.text).toMatch(/ - BConnectionデジタルトレード/i)
      expect(res.text).toMatch(/勘定科目一括作成/i)
      expect(res.text).toMatch(/ファイル選択してください/i)
      expect(res.text).toMatch(/アップロード開始/i)
      expect(res.text).toMatch(/勘定科目一覧→/i)
    })

    test('一般ユーザ、契約ステータス：変更受付、GET利用不可', async () => {
      await db.Contract.update({ contractStatus: '41' }, { where: { tenantId: testTenantId } })
      const res = await request(app)
        .get('/uploadAccount')
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
        .expect(200)

      // 画面内容確認
      expect(res.text).toMatch(/ - BConnectionデジタルトレード/i)
      expect(res.text).toMatch(/勘定科目一括作成/i)
      expect(res.text).toMatch(/ファイル選択してください/i)
      expect(res.text).toMatch(/アップロード開始/i)
      expect(res.text).toMatch(/勘定科目一覧→/i)
    })
  })

  describe('5.契約ステータス：解約申込', () => {
    // テナントステータスが「解約申込」、勘定科目一括作成ページ利用できない
    test('管理者、契約ステータス：解約申込、GET利用不可', async () => {
      // 契約ステータス：解約申込に変更
      await db.Contract.update({ contractStatus: '30' }, { where: { tenantId: testTenantId } })
      const res = await request(app)
        .get('/uploadAccount')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(200)

      expect(res.text).toMatch(/現在解約手続き中です。/i) // 画面内容
    })

    test('一般ユーザ、契約ステータス：解約申込、GET利用不可', async () => {
      // 契約ステータス変更(利用登録済み)
      const res = await request(app)
        .get('/uploadAccount')
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
        .expect(200)

      expect(res.text).toMatch(/現在解約手続き中です。/i) // 画面内容
    })
  })

  describe('5.契約ステータス：解約受付', () => {
    // テナントステータスが「解約受付」、勘定科目一括作成ページ利用できない
    test('管理者、契約ステータス：解約受付、GET利用不可', async () => {
      // 契約ステータス：解約受付に変更
      await db.Contract.update({ contractStatus: '31' }, { where: { tenantId: testTenantId } })
      const res = await request(app)
        .get('/uploadAccount')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(200)

      expect(res.text).toMatch(/現在解約手続き中です。/i) // 画面内容
    })

    test('一般ユーザ、契約ステータス：解約受付、GET利用不可', async () => {
      // 契約ステータス変更(利用登録済み)
      const res = await request(app)
        .get('/uploadAccount')
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
        .expect(200)

      expect(res.text).toMatch(/現在解約手続き中です。/i) // 画面内容
    })
  })

  describe('5.契約ステータス：解約', () => {
    // テナントステータスが「解約」、勘定科目一括作成ページ利用できない
    test('管理者、契約ステータス：解約、GET利用不可', async () => {
      // 契約ステータス：解約に変更
      await db.Contract.update(
        { contractStatus: '99', deleteFlag: 'true', numberN: '' },
        { where: { tenantId: testTenantId } }
      )
      await db.Tenant.update({ deleteFlag: 1 }, { where: { tenantId: testTenantId } })
      const res = await request(app)
        .get('/uploadAccount')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(500)

      expect(res.text).toMatch(/お探しのページは見つかりませんでした。/i) // 画面内容
    })

    test('一般ユーザ、契約ステータス：解約、GET利用不可', async () => {
      // 契約ステータス変更(利用登録済み)
      const res = await request(app)
        .get('/uploadAccount')
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
        .expect(500)

      expect(res.text).toMatch(/お探しのページは見つかりませんでした。/i) // 画面内容
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
