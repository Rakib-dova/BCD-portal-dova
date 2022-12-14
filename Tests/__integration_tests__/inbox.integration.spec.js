'use strict'
const app = require('../../Application/app')
const request = require('supertest')
const { JSDOM } = require('jsdom')
const db = require('../../Application/models')
const getTenantId = {}
let redirectUrl

jest.setTimeout(60000) // jestのタイムアウトを60秒とする

const getCookies = require('./getCookies')

describe('受領した請求書詳細画面のインテグレーションテスト', () => {
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

      expect(res.text).toMatch(/利用登録 - BConnectionデジタルトレード/i) // 画面内容確認
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
    // テナントステータスが「登録申込」、受領した請求書詳細画面直接接続-利用不可
    test('管理者、契約ステータス：登録申込、受領した請求書詳細画面直接接続-利用不可', async () => {
      const res = await request(app)
        .get('/inbox')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(400)

      // 画面内容確認
      expect(res.text).toMatch(/不正なページからアクセスされたか、セッションタイムアウトが発生しました。/i)
    })

    test('一般ユーザ、契約ステータス：登録申込、受領した請求書詳細画面直接接続-利用不可', async () => {
      const res = await request(app)
        .get('/inbox')
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
        .expect(400)

      // 画面内容確認
      expect(res.text).toMatch(/不正なページからアクセスされたか、セッションタイムアウトが発生しました。/i)
    })

    test('管理者、受領した請求書詳細画面へアクセス、利用可能', async () => {
      const puppeteer = require('puppeteer')
      const browser = await puppeteer.launch({
        headless: true,
        ignoreHTTPSErrors: true
      })
      const page = await browser.newPage()
      await page.setCookie(acCookies[0])
      await page.goto('https://localhost:3000/inboxList/1')

      redirectUrl = await page.evaluate(() => {
        return document
          .querySelector('#informationTab > table > tbody > tr:nth-child(1) > td.text-center.display-row-td > a')
          .getAttribute('href')
      })

      await page.click('#informationTab > table > tbody > tr:nth-child(1) > td.text-center.display-row-td > a')

      await page.waitForTimeout(2000)

      // 受領した請求書詳細画面にredirectする。
      expect(await page.url()).toBe(`https://localhost:3000${redirectUrl}`)

      browser.close()
    })

    test('一般ユーザ、受領した請求書詳細画面へアクセス、利用可能', async () => {
      const puppeteer = require('puppeteer')
      const browser = await puppeteer.launch({
        headless: true,
        ignoreHTTPSErrors: true
      })
      const page = await browser.newPage()
      await page.setCookie(acCookies[0])
      await page.goto('https://localhost:3000/inboxList/1')

      await page.click('#informationTab > table > tbody > tr:nth-child(1) > td.text-center.display-row-td > a')

      await page.waitForTimeout(2000)

      // 受領した請求書詳細画面にredirectする。
      expect(await page.url()).toBe(`https://localhost:3000${redirectUrl}`)

      browser.close()
    })

    test('管理者、画面確認（契約ステータス：登録申込）', async () => {
      const res = await request(app)
        .get(redirectUrl)
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(200)

      // 画面内容確認
      expect(res.text).toMatch(/請求書番号/i)
      expect(res.text).toMatch(/宛先/i)
      expect(res.text).toMatch(/差出人/i)
      expect(res.text).toMatch(/仕訳情報一括入力/i)
      expect(res.text).toMatch(/項目ID/i)
      expect(res.text).toMatch(/内容/i)
      expect(res.text).toMatch(/数量/i)
      expect(res.text).toMatch(/単位/i)
      expect(res.text).toMatch(/税/i)
      expect(res.text).toMatch(/借方/i)
      expect(res.text).toMatch(/貸方/i)
      expect(res.text).toMatch(/計上金額/i)
      expect(res.text).toMatch(/勘定科目コード/i)
      expect(res.text).toMatch(/補助科目コード/i)
      expect(res.text).toMatch(/部門コード/i)
      expect(res.text).toMatch(/合計 円/i)
      expect(res.text).toMatch(/請求日/i)
      expect(res.text).toMatch(/戻る/i)
      expect(res.text).toMatch(/保存/i)
      expect(res.text).toMatch(/支払依頼へ/i)
    })

    test('一般ユーザ、画面確認（契約ステータス：登録申込）', async () => {
      const res = await request(app)
        .get(redirectUrl)
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
        .expect(200)

      // 画面内容確認
      expect(res.text).toMatch(/請求書番号/i)
      expect(res.text).toMatch(/宛先/i)
      expect(res.text).toMatch(/差出人/i)
      expect(res.text).toMatch(/仕訳情報一括入力/i)
      expect(res.text).toMatch(/項目ID/i)
      expect(res.text).toMatch(/内容/i)
      expect(res.text).toMatch(/数量/i)
      expect(res.text).toMatch(/単位/i)
      expect(res.text).toMatch(/税/i)
      expect(res.text).toMatch(/借方/i)
      expect(res.text).toMatch(/貸方/i)
      expect(res.text).toMatch(/計上金額/i)
      expect(res.text).toMatch(/勘定科目コード/i)
      expect(res.text).toMatch(/補助科目コード/i)
      expect(res.text).toMatch(/部門コード/i)
      expect(res.text).toMatch(/合計 円/i)
      expect(res.text).toMatch(/請求日/i)
      expect(res.text).toMatch(/戻る/i)
      expect(res.text).toMatch(/保存/i)
      expect(res.text).toMatch(/支払依頼へ/i)
    })
  })

  describe('3.契約ステータス：登録受付', () => {
    // テナントステータスが「登録受付」、受領した請求書詳細画面直接接続-利用不可
    test('管理者、契約ステータス：登録受付、受領した請求書詳細画面直接接続-利用不可', async () => {
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
        .get('/inbox')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(400)

      // 画面内容確認
      expect(res.text).toMatch(/不正なページからアクセスされたか、セッションタイムアウトが発生しました。/i)
    })

    test('一般ユーザ、契約ステータス：登録受付、受領した請求書詳細画面直接接続-利用不可', async () => {
      const res = await request(app)
        .get('/inbox')
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
        .expect(400)

      // 画面内容確認
      expect(res.text).toMatch(/不正なページからアクセスされたか、セッションタイムアウトが発生しました。/i)
    })

    test('管理者、受領した請求書詳細画面へアクセス、利用可能', async () => {
      const puppeteer = require('puppeteer')
      const browser = await puppeteer.launch({
        headless: true,
        ignoreHTTPSErrors: true
      })
      const page = await browser.newPage()
      await page.setCookie(acCookies[0])
      await page.goto('https://localhost:3000/inboxList/1')

      await page.click('#informationTab > table > tbody > tr:nth-child(1) > td.text-center.display-row-td > a')

      await page.waitForTimeout(2000)

      // 受領した請求書詳細画面にredirectする。
      expect(await page.url()).toBe(`https://localhost:3000${redirectUrl}`)

      browser.close()
    })

    test('一般ユーザ、受領した請求書詳細画面へアクセス、利用可能', async () => {
      const puppeteer = require('puppeteer')
      const browser = await puppeteer.launch({
        headless: true,
        ignoreHTTPSErrors: true
      })
      const page = await browser.newPage()
      await page.setCookie(acCookies[0])
      await page.goto('https://localhost:3000/inboxList/1')

      await page.click('#informationTab > table > tbody > tr:nth-child(1) > td.text-center.display-row-td > a')

      await page.waitForTimeout(2000)

      // 受領した請求書詳細画面にredirectする。
      expect(await page.url()).toBe(`https://localhost:3000${redirectUrl}`)

      browser.close()
    })

    test('管理者、画面確認（契約ステータス：登録受付）', async () => {
      const res = await request(app)
        .get(redirectUrl)
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(200)

      // 画面内容確認
      expect(res.text).toMatch(/請求書番号/i)
      expect(res.text).toMatch(/宛先/i)
      expect(res.text).toMatch(/差出人/i)
      expect(res.text).toMatch(/仕訳情報一括入力/i)
      expect(res.text).toMatch(/項目ID/i)
      expect(res.text).toMatch(/内容/i)
      expect(res.text).toMatch(/数量/i)
      expect(res.text).toMatch(/単位/i)
      expect(res.text).toMatch(/税/i)
      expect(res.text).toMatch(/借方/i)
      expect(res.text).toMatch(/貸方/i)
      expect(res.text).toMatch(/計上金額/i)
      expect(res.text).toMatch(/勘定科目コード/i)
      expect(res.text).toMatch(/補助科目コード/i)
      expect(res.text).toMatch(/部門コード/i)
      expect(res.text).toMatch(/合計 円/i)
      expect(res.text).toMatch(/請求日/i)
      expect(res.text).toMatch(/戻る/i)
      expect(res.text).toMatch(/保存/i)
      expect(res.text).toMatch(/支払依頼へ/i)
    })

    test('一般ユーザ、画面確認（契約ステータス：登録受付）', async () => {
      const res = await request(app)
        .get(redirectUrl)
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
        .expect(200)

      // 画面内容確認
      expect(res.text).toMatch(/請求書番号/i)
      expect(res.text).toMatch(/宛先/i)
      expect(res.text).toMatch(/差出人/i)
      expect(res.text).toMatch(/仕訳情報一括入力/i)
      expect(res.text).toMatch(/項目ID/i)
      expect(res.text).toMatch(/内容/i)
      expect(res.text).toMatch(/数量/i)
      expect(res.text).toMatch(/単位/i)
      expect(res.text).toMatch(/税/i)
      expect(res.text).toMatch(/借方/i)
      expect(res.text).toMatch(/貸方/i)
      expect(res.text).toMatch(/計上金額/i)
      expect(res.text).toMatch(/勘定科目コード/i)
      expect(res.text).toMatch(/補助科目コード/i)
      expect(res.text).toMatch(/部門コード/i)
      expect(res.text).toMatch(/合計 円/i)
      expect(res.text).toMatch(/請求日/i)
      expect(res.text).toMatch(/戻る/i)
      expect(res.text).toMatch(/保存/i)
      expect(res.text).toMatch(/支払依頼へ/i)
    })
  })

  test('勘定科目と補助科目の登録', async () => {
    const puppeteer = require('puppeteer')
    const browser = await puppeteer.launch({
      headless: true,
      ignoreHTTPSErrors: true
    })
    const page = await browser.newPage()
    await page.setCookie(acCookies[0])
    await page.goto('https://localhost:3000/uploadAccount')

    const [fileChooser] = await Promise.all([
      page.waitForFileChooser(),
      page.click('#accountCodeUpload > div > label > input')
    ])

    await fileChooser.accept(['./testData/accountCodeUpload_test11.csv'])

    await page.click('#upload')
  })

  test('部門データの登録', async () => {
    const puppeteer = require('puppeteer')
    const browser = await puppeteer.launch({
      headless: true,
      ignoreHTTPSErrors: true
    })
    const page = await browser.newPage()
    await page.setCookie(acCookies[0])
    await page.goto('https://localhost:3000/uploadDepartment')

    const [fileChooser] = await Promise.all([
      page.waitForFileChooser(),
      page.click('#accountCodeUpload > div > label > input')
    ])

    await fileChooser.accept(['./testData/departmentCodeUpload_test11.csv'])

    await page.click('#upload')
  })

  describe('4.契約ステータス：契約中', () => {
    // テナントステータスが「契約中」、受領した請求書詳細画面直接接続-利用不可
    test('管理者、契約ステータス：契約中、受領した請求書詳細画面直接接続-利用不可', async () => {
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
        .get('/inbox')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(400)

      // 画面内容確認
      expect(res.text).toMatch(/不正なページからアクセスされたか、セッションタイムアウトが発生しました。/i)
    })

    test('一般ユーザ、契約ステータス：契約中、受領した請求書詳細画面直接接続-利用不可', async () => {
      const res = await request(app)
        .get('/inbox')
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
        .expect(400)

      // 画面内容確認
      expect(res.text).toMatch(/不正なページからアクセスされたか、セッションタイムアウトが発生しました。/i)
    })

    test('管理者、受領した請求書詳細画面へアクセス、利用可能', async () => {
      const puppeteer = require('puppeteer')
      const browser = await puppeteer.launch({
        headless: true,
        ignoreHTTPSErrors: true
      })
      const page = await browser.newPage()
      await page.setCookie(acCookies[0])
      await page.goto('https://localhost:3000/inboxList/1')

      await page.click('#informationTab > table > tbody > tr:nth-child(1) > td.text-center.display-row-td > a')

      await page.waitForTimeout(2000)

      // 受領した請求書詳細画面にredirectする。
      expect(await page.url()).toBe(`https://localhost:3000${redirectUrl}`)

      browser.close()
    })

    test('一般ユーザ、受領した請求書詳細画面へアクセス、利用可能', async () => {
      const puppeteer = require('puppeteer')
      const browser = await puppeteer.launch({
        headless: true,
        ignoreHTTPSErrors: true
      })
      const page = await browser.newPage()
      await page.setCookie(acCookies[0])
      await page.goto('https://localhost:3000/inboxList/1')

      await page.click('#informationTab > table > tbody > tr:nth-child(1) > td.text-center.display-row-td > a')

      await page.waitForTimeout(2000)

      // 受領した請求書詳細画面にredirectする。
      expect(await page.url()).toBe(`https://localhost:3000${redirectUrl}`)

      browser.close()
    })

    test('管理者、画面確認（契約ステータス：契約中）', async () => {
      const res = await request(app)
        .get(redirectUrl)
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(200)

      // 画面内容確認
      expect(res.text).toMatch(/請求書番号/i)
      expect(res.text).toMatch(/宛先/i)
      expect(res.text).toMatch(/差出人/i)
      expect(res.text).toMatch(/仕訳情報一括入力/i)
      expect(res.text).toMatch(/項目ID/i)
      expect(res.text).toMatch(/内容/i)
      expect(res.text).toMatch(/数量/i)
      expect(res.text).toMatch(/単位/i)
      expect(res.text).toMatch(/税/i)
      expect(res.text).toMatch(/借方/i)
      expect(res.text).toMatch(/貸方/i)
      expect(res.text).toMatch(/計上金額/i)
      expect(res.text).toMatch(/勘定科目コード/i)
      expect(res.text).toMatch(/補助科目コード/i)
      expect(res.text).toMatch(/部門コード/i)
      expect(res.text).toMatch(/合計 円/i)
      expect(res.text).toMatch(/請求日/i)
      expect(res.text).toMatch(/戻る/i)
      expect(res.text).toMatch(/保存/i)
      expect(res.text).toMatch(/支払依頼へ/i)
    })

    test('一般ユーザ、画面確認（契約ステータス：契約中）', async () => {
      const res = await request(app)
        .get(redirectUrl)
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
        .expect(200)

      // 画面内容確認
      expect(res.text).toMatch(/請求書番号/i)
      expect(res.text).toMatch(/宛先/i)
      expect(res.text).toMatch(/差出人/i)
      expect(res.text).toMatch(/仕訳情報一括入力/i)
      expect(res.text).toMatch(/項目ID/i)
      expect(res.text).toMatch(/内容/i)
      expect(res.text).toMatch(/数量/i)
      expect(res.text).toMatch(/単位/i)
      expect(res.text).toMatch(/税/i)
      expect(res.text).toMatch(/借方/i)
      expect(res.text).toMatch(/貸方/i)
      expect(res.text).toMatch(/計上金額/i)
      expect(res.text).toMatch(/勘定科目コード/i)
      expect(res.text).toMatch(/補助科目コード/i)
      expect(res.text).toMatch(/部門コード/i)
      expect(res.text).toMatch(/合計 円/i)
      expect(res.text).toMatch(/請求日/i)
      expect(res.text).toMatch(/戻る/i)
      expect(res.text).toMatch(/保存/i)
      expect(res.text).toMatch(/支払依頼へ/i)
    })

    test('「戻る」ボタン遷移確認（受領した請求書一覧画面に遷移）', async () => {
      const puppeteer = require('puppeteer')
      const browser = await puppeteer.launch({
        headless: true,
        ignoreHTTPSErrors: true
      })
      const page = await browser.newPage()
      await page.setCookie(acCookies[0])
      await page.goto(`https://localhost:3000${redirectUrl}`)

      await page.click('body > div.container > div.box > form > div.grouped-button > a')

      await page.waitForTimeout(2000)

      // 受領した請求書一覧画面に遷移確認
      expect(await page.url()).toBe('https://localhost:3000/inboxList/1')

      await browser.close()
    })

    test('勘定科目コード、補助科目コード検索モーダル確認（借方）', async () => {
      const puppeteer = require('puppeteer')
      const browser = await puppeteer.launch({
        headless: true,
        ignoreHTTPSErrors: true
      })
      const page = await browser.newPage()
      await page.setCookie(acCookies[0])
      await page.goto(`https://localhost:3000${redirectUrl}`)

      await page.click(
        '#lineNo1_lineAccountCode1 > div:nth-child(1) > table > tbody > tr:nth-child(2) > td.table-td-upbutton-padding > div > div > p > a'
      )

      await page.waitForTimeout(500)

      // 仕訳一括設定モーダル開きをチェック
      const checkOpenedModal = await page.evaluate(() => {
        return Array.prototype.find.call(document.querySelector('#accountCode-modal').classList, (item) => {
          if (item === 'is-active') return true
          return false
        })
      })

      expect(checkOpenedModal).toBe('is-active')

      await browser.close()
    })

    test('部門コード検索モーダル確認（借方）', async () => {
      const puppeteer = require('puppeteer')
      const browser = await puppeteer.launch({
        headless: true,
        ignoreHTTPSErrors: true
      })
      const page = await browser.newPage()
      await page.setCookie(acCookies[0])
      await page.goto(`https://localhost:3000${redirectUrl}`)

      await page.click(
        '#lineNo1_lineAccountCode1 > div:nth-child(1) > table > tbody > tr:nth-child(4) > td.table-td-button-padding > div > div > p > a'
      )

      await page.waitForTimeout(500)

      // 仕訳一括設定モーダル開きをチェック
      const checkOpenedModal = await page.evaluate(() => {
        return Array.prototype.find.call(document.querySelector('#departmentCode-modal').classList, (item) => {
          if (item === 'is-active') return true
          return false
        })
      })

      expect(checkOpenedModal).toBe('is-active')

      await browser.close()
    })

    test('勘定科目コード、補助科目コード検索モーダル確認（貸方）', async () => {
      const puppeteer = require('puppeteer')
      const browser = await puppeteer.launch({
        headless: true,
        ignoreHTTPSErrors: true
      })
      const page = await browser.newPage()
      await page.setCookie(acCookies[0])
      await page.goto(`https://localhost:3000${redirectUrl}`)

      await page.click(
        '#lineNo1_lineAccountCode1 > div:nth-child(3) > table > tbody > tr:nth-child(2) > td.table-td-upbutton-padding > div > div > p > a'
      )

      await page.waitForTimeout(500)

      // 仕訳一括設定モーダル開きをチェック
      const checkOpenedModal = await page.evaluate(() => {
        return Array.prototype.find.call(document.querySelector('#creditAccountCode-modal').classList, (item) => {
          if (item === 'is-active') return true
          return false
        })
      })

      expect(checkOpenedModal).toBe('is-active')

      await browser.close()
    })

    test('部門コード検索モーダル確認（貸方）', async () => {
      const puppeteer = require('puppeteer')
      const browser = await puppeteer.launch({
        headless: true,
        ignoreHTTPSErrors: true
      })
      const page = await browser.newPage()
      await page.setCookie(acCookies[0])
      await page.goto(`https://localhost:3000${redirectUrl}`)

      await page.click(
        '#lineNo1_lineAccountCode1 > div:nth-child(3) > table > tbody > tr:nth-child(4) > td.table-td-button-padding > div > div > p > a'
      )

      await page.waitForTimeout(500)

      // 仕訳一括設定モーダル開きをチェック
      const checkOpenedModal = await page.evaluate(() => {
        return Array.prototype.find.call(document.querySelector('#creditDepartmentCode-modal').classList, (item) => {
          if (item === 'is-active') return true
          return false
        })
      })

      expect(checkOpenedModal).toBe('is-active')

      await browser.close()
    })

    test('仕訳一括設定モーダル確認', async () => {
      const puppeteer = require('puppeteer')
      const browser = await puppeteer.launch({
        headless: true,
        ignoreHTTPSErrors: true
      })
      const page = await browser.newPage()
      await page.setCookie(acCookies[0])
      await page.goto(`https://localhost:3000${redirectUrl}`)

      await page.click('#btn-bulkInsert')

      await page.waitForTimeout(500)

      // 仕訳一括設定モーダル開きをチェック
      const checkOpenedModal = await page.evaluate(() => {
        return Array.prototype.find.call(document.querySelector('#bulkInsert-journal-modal').classList, (item) => {
          if (item === 'is-active') return true
          return false
        })
      })

      expect(checkOpenedModal).toBe('is-active')

      await browser.close()
    })

    test('仕訳一括設定モーダル「＋」、「-」ボタン機能確認', async () => {
      const puppeteer = require('puppeteer')
      const browser = await puppeteer.launch({
        headless: true,
        ignoreHTTPSErrors: true
      })
      const page = await browser.newPage()
      await page.setCookie(acCookies[0])
      await page.goto(`https://localhost:3000${redirectUrl}`)

      await page.click('#btn-bulkInsert')

      await page.waitForTimeout(500)

      // 仕訳一括設定モーダル「＋」ボタンを押下する。
      await page.evaluate(() => {
        document.getElementById('btn-plus-accountCode-bulkInsert-modal').click()
      })

      await page.waitForTimeout(500)

      // 仕訳設定の追加確認（追加成功：true, 追加失敗：false）
      let checkLineAccountCoden = await page.evaluate(() => {
        if (document.getElementById('bulkInsertNo1_lineAccountCode2') === null) {
          return false
        } else {
          return true
        }
      })

      expect(checkLineAccountCoden).toBe(true)

      // 仕訳一括設定モーダル「-」ボタンを押下する。
      await page.evaluate(() => {
        document.getElementById('btn_minus_bulkInsertNo1_lineAccountCode2').click()
      })

      await page.waitForTimeout(500)

      // 仕訳設定の削除確認（削除成功：true, 削除失敗：false）
      checkLineAccountCoden = await page.evaluate(() => {
        if (document.getElementById('bulkInsertNo1_lineAccountCode2') === null) {
          return true
        } else {
          return false
        }
      })

      expect(checkLineAccountCoden).toBe(true)

      await browser.close()
    })

    test('仕訳一括設定で1個を入力', async () => {
      const puppeteer = require('puppeteer')
      const browser = await puppeteer.launch({
        headless: true,
        ignoreHTTPSErrors: true
      })
      const page = await browser.newPage()
      await page.setCookie(acCookies[0])

      // 仕訳情報設定の画面へ遷移
      await page.goto(`https://localhost:3000${redirectUrl}`)

      // 仕訳情報の個数を数える
      const journalList = await page.evaluate(() => {
        const lineAccountcode = document.querySelector('#lineNo1').querySelectorAll('.lineAccountcode')
        return Array.prototype.map.call(lineAccountcode, (item) => {
          return item.id
        })
      })

      // 仕訳情報一括入力ボタンクリック
      await page.click('#btn-bulkInsert')

      // プラスボタン入力
      // 仕訳一括設定モーダル「＋」ボタンを押下する。
      await page.evaluate(() => {
        document.getElementById('btn-plus-accountCode-bulkInsert-modal').click()
      })

      // １番目の明細を選択
      await page.evaluate(() => {
        document.querySelector('#bulkInsertNo1_lineAccountCode1_accountCode').value = 'A001'
        document.querySelector('#bulkInsertNo1_lineAccountCode1_departmentCode').value = 'TEST1'
        document.querySelector('#bulkInsertNo1_lineCreditAccountCode1_creditAccountCode').value = 'A001'
        document.querySelector('#bulkInsertNo1_lineCreditAccountCode1_creditDepartmentCode').value = 'TEST1'

        document
          .querySelector(
            '#field-invoiceLine > div:nth-child(1) > div > div.columns.m-0.invoiceLine-journalModal > div.column-header.is-2-header > div:nth-child(2) > div > input'
          )
          .click()
      })

      // 「反映」ボタンをクリック
      await page.click('#btn-bulk-insert')

      // モーダルが閉じるまで待ち
      await page.waitForTimeout(3000)

      // 一括入力モーダル画面閉じる
      const resultOfModal = await page.evaluate(() => {
        if (!document.querySelector('#bulkInsert-journal-modal').classList.value.match(/is-active/) !== null) {
          document.querySelector('#bulkInsert-journal-modal').classList.remove('is-active')
        }
        return true
      })

      // モーダルが閉じたらresultOfModalはtrueになる
      expect(resultOfModal).toBe(true)

      // 仕訳情報の個数を数える
      const newJournalList = await page.evaluate(() => {
        const lineAccountcode = document.querySelector('#lineNo1').querySelectorAll('.lineAccountcode')
        return Array.prototype.map.call(lineAccountcode, (item) => {
          return item.id
        })
      })

      expect(newJournalList.length).toBe(journalList.length)

      await browser.close()
    })

    test('仕訳一括設定で10個を入力', async () => {
      const puppeteer = require('puppeteer')
      const browser = await puppeteer.launch({
        headless: true,
        ignoreHTTPSErrors: true
      })
      const page = await browser.newPage()
      await page.setCookie(acCookies[0])

      // 仕訳情報設定の画面へ遷移
      await page.goto(`https://localhost:3000${redirectUrl}`)

      // 仕訳情報の個数を数える
      const journalList = await page.evaluate(() => {
        const lineAccountcode = document.querySelector('#lineNo1').querySelectorAll('.lineAccountcode')
        return Array.prototype.map.call(lineAccountcode, (item) => {
          return item.id
        })
      })

      // 仕訳情報一括入力ボタンクリック
      await page.click('#btn-bulkInsert')

      // プラスボタン入力
      // 仕訳一括設定モーダル「＋」ボタンを押下する。
      for (let cnt = 0; cnt < 10; cnt++) {
        await page.evaluate(() => {
          document.getElementById('btn-plus-accountCode-bulkInsert-modal').click()
        })
      }

      // 仕訳情報の登録
      await page.evaluate(() => {
        document.querySelector('#bulkInsertNo1_lineAccountCode1_accountCode').value = 'A001'
        document.querySelector('#bulkInsertNo1_lineAccountCode2_accountCode').value = 'A002'
        document.querySelector('#bulkInsertNo1_lineAccountCode3_accountCode').value = 'A003'
        document.querySelector('#bulkInsertNo1_lineAccountCode4_accountCode').value = 'A004'
        document.querySelector('#bulkInsertNo1_lineAccountCode5_accountCode').value = 'A005'
        document.querySelector('#bulkInsertNo1_lineAccountCode6_accountCode').value = 'A006'
        document.querySelector('#bulkInsertNo1_lineAccountCode7_accountCode').value = 'A007'
        document.querySelector('#bulkInsertNo1_lineAccountCode8_accountCode').value = 'A008'
        document.querySelector('#bulkInsertNo1_lineAccountCode9_accountCode').value = 'A009'
        document.querySelector('#bulkInsertNo1_lineAccountCode10_accountCode').value = 'A010'
        document.querySelector('#bulkInsertNo1_lineAccountCode1_departmentCode').value = 'TEST1'
        document.querySelector('#bulkInsertNo1_lineAccountCode2_departmentCode').value = 'TEST2'
        document.querySelector('#bulkInsertNo1_lineAccountCode3_departmentCode').value = 'TEST3'
        document.querySelector('#bulkInsertNo1_lineAccountCode4_departmentCode').value = 'TEST4'
        document.querySelector('#bulkInsertNo1_lineAccountCode5_departmentCode').value = 'TEST5'
        document.querySelector('#bulkInsertNo1_lineAccountCode6_departmentCode').value = 'TEST6'
        document.querySelector('#bulkInsertNo1_lineAccountCode7_departmentCode').value = 'TEST7'
        document.querySelector('#bulkInsertNo1_lineAccountCode8_departmentCode').value = 'TEST8'
        document.querySelector('#bulkInsertNo1_lineAccountCode9_departmentCode').value = 'TEST9'
        document.querySelector('#bulkInsertNo1_lineAccountCode10_departmentCode').value = 'TEST10'

        document
          .querySelector(
            '#field-invoiceLine > div:nth-child(1) > div > div.columns.m-0.invoiceLine-journalModal > div.column-header.is-2-header > div:nth-child(2) > div > input'
          )
          .click()
      })

      // 「反映」ボタンをクリック
      await page.click('#btn-bulk-insert')

      // モーダルが閉じるまで待ち
      await page.waitForTimeout(5000)

      // 一括入力モーダル画面閉じる
      await page.evaluate(() => {
        return document.querySelector('#bulkInsert-journal-modal').classList.value.match(/is-active/) !== null
      })

      // 仕訳情報の個数を数える
      const newJournalList = await page.evaluate(() => {
        const lineAccountcode = document.querySelector('#lineNo1').querySelectorAll('.lineAccountcode')
        return Array.prototype.map.call(lineAccountcode, (item) => {
          return item.id
        })
      })

      expect(newJournalList.length).toBe(journalList.length + 9)

      await browser.close()
    })

    test('エラー仕訳情報を１項目以上入力してください。', async () => {
      const puppeteer = require('puppeteer')
      const browser = await puppeteer.launch({
        headless: true,
        ignoreHTTPSErrors: true
      })
      const page = await browser.newPage()
      await page.setCookie(acCookies[0])

      // 仕訳情報設定の画面へ遷移
      await page.goto(`https://localhost:3000${redirectUrl}`)

      // 仕訳情報一括入力ボタンクリック
      await page.click('#btn-bulkInsert')

      // 「登録」ボタンをクリック
      await page.click('#btn-bulk-insert')

      // モーダルエラーメッセージ表示の待ち
      await page.waitForTimeout(1000)

      // 一括入力モーダル画面閉じる
      const errorMsg = await page.evaluate(() => {
        const errMsg = document.querySelector('#error-message-journal-modal').innerText
        return errMsg
      })

      // モーダルが閉じたらresultOfModalはtrueになる
      expect(errorMsg).toMatch('仕訳情報を１項目以上入力してください。')

      await browser.close()
    })

    test('エラー対象となる明細を選択してください。', async () => {
      const puppeteer = require('puppeteer')
      const browser = await puppeteer.launch({
        headless: true,
        ignoreHTTPSErrors: true
      })
      const page = await browser.newPage()
      await page.setCookie(acCookies[0])

      // 仕訳情報設定の画面へ遷移
      await page.goto(`https://localhost:3000${redirectUrl}`)

      // 仕訳情報一括入力ボタンクリック
      await page.click('#btn-bulkInsert')

      // 仕訳情報1目の検索実施
      await page.click(
        '#bulkInsertNo1_lineAccountCode1 > div:nth-child(1) > table > tbody > tr:nth-child(2) > td.table-td-upbutton-padding > div > div > p > a'
      )

      // 検索モーダルでA001入力
      await page.type('#searchModalAccountCode', 'A001')

      // 検索ボタンクリック
      await page.click('#btnSearchAccountCode')

      // 検索結果を待ち
      await page.waitForTimeout(2000)

      // 最初の行を選択
      await page.click('#displayFieldResultBody > tr:nth-child(1)')

      // 検索結果適応待ち
      await page.waitForTimeout(1000)

      // 「登録」ボタンをクリック
      await page.click('#btn-bulk-insert')

      // モーダルが閉じるまで待ち
      await page.waitForTimeout(500)

      // 一括入力モーダル画面閉じる
      const errorMsg = await page.evaluate(() => {
        return document.querySelector('#error-message-journal-modal').innerText
      })

      // モーダルが閉じたらresultOfModalはtrueになる
      expect(errorMsg).toMatch('対象となる明細を選択してください。')

      await browser.close()
    })

    test('エラー仕訳情報入力の上限は10個までです。', async () => {
      const puppeteer = require('puppeteer')
      const browser = await puppeteer.launch({
        headless: true,
        ignoreHTTPSErrors: true
      })
      const page = await browser.newPage()
      await page.setCookie(acCookies[0])

      // 仕訳情報設定の画面へ遷移
      await page.goto(`https://localhost:3000${redirectUrl}`)

      // 仕訳情報一括入力ボタンクリック
      await page.click('#btn-bulkInsert')

      await page.waitForTimeout(500)

      // プラスボタンクリック
      for (let cnt = 1; cnt < 12; cnt++) {
        await page.evaluate(() => {
          document.getElementById('btn-plus-accountCode-bulkInsert-modal').click()
        })
      }

      // エラーメッセージが表示されるまで待ち
      await page.waitForTimeout(1000)

      // 一括入力モーダル画面閉じる
      const errorMsg = await page.evaluate(() => {
        return document.querySelector('#error-message-journal-modal').innerText
      })

      // モーダルが閉じたらresultOfModalはtrueになる
      expect(errorMsg).toMatch('仕訳情報入力の上限は１０項目までです。')

      await browser.close()
    })
  })

  describe('5.契約ステータス：変更申込', () => {
    // テナントステータスが「変更申込」、受領した請求書詳細画面直接接続-利用不可
    test('管理者、契約ステータス：変更申込、受領した請求書詳細画面直接接続-利用不可', async () => {
      const contract = await db.Contract.findOne({
        where: {
          tenantId: testTenantId
        }
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
        .get('/inbox')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(400)

      // 画面内容確認
      expect(res.text).toMatch(/不正なページからアクセスされたか、セッションタイムアウトが発生しました。/i)
    })

    test('一般ユーザ、契約ステータス：変更申込、受領した請求書詳細画面直接接続-利用不可', async () => {
      const res = await request(app)
        .get('/inbox')
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
        .expect(400)

      // 画面内容確認
      expect(res.text).toMatch(/不正なページからアクセスされたか、セッションタイムアウトが発生しました。/i)
    })

    test('管理者、受領した請求書詳細画面へアクセス、利用可能', async () => {
      const puppeteer = require('puppeteer')
      const browser = await puppeteer.launch({
        headless: true,
        ignoreHTTPSErrors: true
      })
      const page = await browser.newPage()
      await page.setCookie(acCookies[0])
      await page.goto('https://localhost:3000/inboxList/1')

      await page.click('#informationTab > table > tbody > tr:nth-child(1) > td.text-center.display-row-td > a')

      await page.waitForTimeout(2000)

      // 受領した請求書詳細画面にredirectする。
      expect(await page.url()).toBe(`https://localhost:3000${redirectUrl}`)

      browser.close()
    })

    test('一般ユーザ、受領した請求書詳細画面へアクセス、利用可能', async () => {
      const puppeteer = require('puppeteer')
      const browser = await puppeteer.launch({
        headless: true,
        ignoreHTTPSErrors: true
      })
      const page = await browser.newPage()
      await page.setCookie(acCookies[0])
      await page.goto('https://localhost:3000/inboxList/1')

      await page.click('#informationTab > table > tbody > tr:nth-child(1) > td.text-center.display-row-td > a')

      await page.waitForTimeout(2000)

      // 受領した請求書詳細画面にredirectする。
      expect(await page.url()).toBe(`https://localhost:3000${redirectUrl}`)

      browser.close()
    })

    test('管理者、画面確認（契約ステータス：変更申込）', async () => {
      const res = await request(app)
        .get(redirectUrl)
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(200)

      // 画面内容確認
      expect(res.text).toMatch(/請求書番号/i)
      expect(res.text).toMatch(/宛先/i)
      expect(res.text).toMatch(/差出人/i)
      expect(res.text).toMatch(/仕訳情報一括入力/i)
      expect(res.text).toMatch(/項目ID/i)
      expect(res.text).toMatch(/内容/i)
      expect(res.text).toMatch(/数量/i)
      expect(res.text).toMatch(/単位/i)
      expect(res.text).toMatch(/税/i)
      expect(res.text).toMatch(/借方/i)
      expect(res.text).toMatch(/貸方/i)
      expect(res.text).toMatch(/計上金額/i)
      expect(res.text).toMatch(/勘定科目コード/i)
      expect(res.text).toMatch(/補助科目コード/i)
      expect(res.text).toMatch(/部門コード/i)
      expect(res.text).toMatch(/合計 円/i)
      expect(res.text).toMatch(/請求日/i)
      expect(res.text).toMatch(/戻る/i)
      expect(res.text).toMatch(/保存/i)
      expect(res.text).toMatch(/支払依頼へ/i)
    })

    test('一般ユーザ、画面確認（契約ステータス：変更申込）', async () => {
      const res = await request(app)
        .get(redirectUrl)
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
        .expect(200)

      // 画面内容確認
      expect(res.text).toMatch(/請求書番号/i)
      expect(res.text).toMatch(/宛先/i)
      expect(res.text).toMatch(/差出人/i)
      expect(res.text).toMatch(/仕訳情報一括入力/i)
      expect(res.text).toMatch(/項目ID/i)
      expect(res.text).toMatch(/内容/i)
      expect(res.text).toMatch(/数量/i)
      expect(res.text).toMatch(/単位/i)
      expect(res.text).toMatch(/税/i)
      expect(res.text).toMatch(/借方/i)
      expect(res.text).toMatch(/貸方/i)
      expect(res.text).toMatch(/計上金額/i)
      expect(res.text).toMatch(/勘定科目コード/i)
      expect(res.text).toMatch(/補助科目コード/i)
      expect(res.text).toMatch(/部門コード/i)
      expect(res.text).toMatch(/合計 円/i)
      expect(res.text).toMatch(/請求日/i)
      expect(res.text).toMatch(/戻る/i)
      expect(res.text).toMatch(/保存/i)
      expect(res.text).toMatch(/支払依頼へ/i)
    })
  })

  describe('6.契約ステータス：変更受付', () => {
    // テナントステータスが「変更受付」、受領した請求書詳細画面直接接続-利用不可
    test('管理者、契約ステータス：変更受付、受領した請求書詳細画面直接接続-利用不可', async () => {
      const contract = await db.Contract.findOne({
        where: {
          tenantId: testTenantId
        }
      })
      if (contract.dataValues.contractStatus !== '41') {
        await db.Contract.update(
          {
            contractStatus: '41'
          },
          {
            where: {
              tenantId: testTenantId
            }
          }
        )
      }

      const res = await request(app)
        .get('/inbox')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(400)

      // 画面内容確認
      expect(res.text).toMatch(/不正なページからアクセスされたか、セッションタイムアウトが発生しました。/i)
    })

    test('一般ユーザ、契約ステータス：変更受付、受領した請求書詳細画面直接接続-利用不可', async () => {
      const res = await request(app)
        .get('/inbox')
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
        .expect(400)

      // 画面内容確認
      expect(res.text).toMatch(/不正なページからアクセスされたか、セッションタイムアウトが発生しました。/i)
    })

    test('管理者、受領した請求書詳細画面へアクセス、利用可能', async () => {
      const puppeteer = require('puppeteer')
      const browser = await puppeteer.launch({
        headless: true,
        ignoreHTTPSErrors: true
      })
      const page = await browser.newPage()
      await page.setCookie(acCookies[0])
      await page.goto('https://localhost:3000/inboxList/1')

      await page.click('#informationTab > table > tbody > tr:nth-child(1) > td.text-center.display-row-td > a')

      await page.waitForTimeout(2000)

      // 受領した請求書詳細画面にredirectする。
      expect(await page.url()).toBe(`https://localhost:3000${redirectUrl}`)

      browser.close()
    })

    test('一般ユーザ、受領した請求書詳細画面へアクセス、利用可能', async () => {
      const puppeteer = require('puppeteer')
      const browser = await puppeteer.launch({
        headless: true,
        ignoreHTTPSErrors: true
      })
      const page = await browser.newPage()
      await page.setCookie(acCookies[0])
      await page.goto('https://localhost:3000/inboxList/1')

      await page.click('#informationTab > table > tbody > tr:nth-child(1) > td.text-center.display-row-td > a')

      await page.waitForTimeout(2000)

      // 受領した請求書詳細画面にredirectする。
      expect(await page.url()).toBe(`https://localhost:3000${redirectUrl}`)

      browser.close()
    })

    test('管理者、画面確認（契約ステータス：変更受付）', async () => {
      const res = await request(app)
        .get(redirectUrl)
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(200)

      // 画面内容確認
      expect(res.text).toMatch(/請求書番号/i)
      expect(res.text).toMatch(/宛先/i)
      expect(res.text).toMatch(/差出人/i)
      expect(res.text).toMatch(/仕訳情報一括入力/i)
      expect(res.text).toMatch(/項目ID/i)
      expect(res.text).toMatch(/内容/i)
      expect(res.text).toMatch(/数量/i)
      expect(res.text).toMatch(/単位/i)
      expect(res.text).toMatch(/税/i)
      expect(res.text).toMatch(/借方/i)
      expect(res.text).toMatch(/貸方/i)
      expect(res.text).toMatch(/計上金額/i)
      expect(res.text).toMatch(/勘定科目コード/i)
      expect(res.text).toMatch(/補助科目コード/i)
      expect(res.text).toMatch(/部門コード/i)
      expect(res.text).toMatch(/合計 円/i)
      expect(res.text).toMatch(/請求日/i)
      expect(res.text).toMatch(/戻る/i)
      expect(res.text).toMatch(/保存/i)
      expect(res.text).toMatch(/支払依頼へ/i)
    })

    test('一般ユーザ、画面確認（契約ステータス：変更受付）', async () => {
      const res = await request(app)
        .get(redirectUrl)
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
        .expect(200)

      // 画面内容確認
      expect(res.text).toMatch(/請求書番号/i)
      expect(res.text).toMatch(/宛先/i)
      expect(res.text).toMatch(/差出人/i)
      expect(res.text).toMatch(/仕訳情報一括入力/i)
      expect(res.text).toMatch(/項目ID/i)
      expect(res.text).toMatch(/内容/i)
      expect(res.text).toMatch(/数量/i)
      expect(res.text).toMatch(/単位/i)
      expect(res.text).toMatch(/税/i)
      expect(res.text).toMatch(/借方/i)
      expect(res.text).toMatch(/貸方/i)
      expect(res.text).toMatch(/計上金額/i)
      expect(res.text).toMatch(/勘定科目コード/i)
      expect(res.text).toMatch(/補助科目コード/i)
      expect(res.text).toMatch(/部門コード/i)
      expect(res.text).toMatch(/合計 円/i)
      expect(res.text).toMatch(/請求日/i)
      expect(res.text).toMatch(/戻る/i)
      expect(res.text).toMatch(/保存/i)
      expect(res.text).toMatch(/支払依頼へ/i)
    })
  })

  describe('7.契約ステータス：解約申込', () => {
    // テナントステータスが「解約申込」、受領した請求書詳細画面直接接続-利用不可
    test('管理者、契約ステータス：解約申込、受領した請求書詳細画面直接接続-利用不可', async () => {
      const contract = await db.Contract.findOne({
        where: {
          tenantId: testTenantId
        }
      })
      const inputTime = new Date()
      await db.Order.update(
        {
          contractId: contract.dataValues.contractId,
          tenantId: testTenantId,
          orderType: '030',
          orderData: 'test',
          createdAt: inputTime,
          updatedAt: inputTime
        },
        {
          where: {
            contractId: contract.dataValues.contractId
          }
        }
      )
      if (contract.dataValues.contractStatus !== '30') {
        await db.Contract.update(
          {
            contractStatus: '30'
          },
          {
            where: {
              tenantId: testTenantId
            }
          }
        )
      }

      const res = await request(app)
        .get('/inbox')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(400)

      // 画面内容確認
      expect(res.text).toMatch(/不正なページからアクセスされたか、セッションタイムアウトが発生しました。/i)
    })

    test('一般ユーザ、契約ステータス：解約申込、受領した請求書詳細画面直接接続-利用不可', async () => {
      const res = await request(app)
        .get('/inbox')
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
        .expect(400)

      // 画面内容確認
      expect(res.text).toMatch(/不正なページからアクセスされたか、セッションタイムアウトが発生しました。/i)
    })

    test('管理者、受領した請求書詳細画面へアクセス、利用不可', async () => {
      const res = await request(app)
        .get(redirectUrl)
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(200)

      // 画面内容確認
      expect(res.text).toMatch(/現在解約手続き中です。/i)
    })

    test('一般ユーザ、受領した請求書詳細画面へアクセス、利用不可', async () => {
      const res = await request(app)
        .get(redirectUrl)
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
        .expect(200)

      // 画面内容確認
      expect(res.text).toMatch(/現在解約手続き中です。/i)
    })
  })

  describe('8.契約ステータス：解約受付', () => {
    // テナントステータスが「解約受付」、受領した請求書詳細画面直接接続-利用不可
    test('管理者、契約ステータス：解約受付、受領した請求書詳細画面直接接続-利用不可', async () => {
      const contract = await db.Contract.findOne({
        where: {
          tenantId: testTenantId
        }
      })

      if (contract.dataValues.contractStatus !== '31') {
        await db.Contract.update(
          {
            contractStatus: '31'
          },
          {
            where: {
              tenantId: testTenantId
            }
          }
        )
      }

      const res = await request(app)
        .get('/inbox')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(400)

      // 画面内容確認
      expect(res.text).toMatch(/不正なページからアクセスされたか、セッションタイムアウトが発生しました。/i)
    })

    test('一般ユーザ、契約ステータス：解約受付、受領した請求書詳細画面直接接続-利用不可', async () => {
      const res = await request(app)
        .get('/inbox')
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
        .expect(400)

      // 画面内容確認
      expect(res.text).toMatch(/不正なページからアクセスされたか、セッションタイムアウトが発生しました。/i)
    })

    test('管理者、受領した請求書詳細画面へアクセス、利用不可', async () => {
      const res = await request(app)
        .get(redirectUrl)
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(200)

      // 画面内容確認
      expect(res.text).toMatch(/現在解約手続き中です。/i)
    })

    test('一般ユーザ、受領した請求書詳細画面へアクセス、利用不可', async () => {
      const res = await request(app)
        .get(redirectUrl)
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
        .expect(200)

      // 画面内容確認
      expect(res.text).toMatch(/現在解約手続き中です。/i)
    })
  })

  describe('9.契約ステータス：解約', () => {
    // テナントステータスが「解約」、受領した請求書詳細画面直接接続-利用不可
    test('管理者、契約ステータス：解約、受領した請求書詳細画面直接接続-利用不可', async () => {
      const contract = await db.Contract.findOne({
        where: {
          tenantId: testTenantId
        }
      })

      if (contract.dataValues.contractStatus !== '99') {
        await db.Contract.update(
          {
            numberN: '',
            contractStatus: '99',
            deleteFlag: true
          },
          {
            where: {
              tenantId: testTenantId
            }
          }
        )
        await db.Tenant.update(
          {
            deleteFlag: true
          },
          {
            where: {
              tenantId: testTenantId
            }
          }
        )
      }

      const res = await request(app)
        .get('/inbox')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(400)

      // 画面内容確認
      expect(res.text).toMatch(/不正なページからアクセスされたか、セッションタイムアウトが発生しました。/i)
    })

    test('一般ユーザ、契約ステータス：解約、受領した請求書詳細画面直接接続-利用不可', async () => {
      const res = await request(app)
        .get('/inbox')
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
        .expect(400)

      // 画面内容確認
      expect(res.text).toMatch(/不正なページからアクセスされたか、セッションタイムアウトが発生しました。/i)
    })

    test('管理者、受領した請求書詳細画面へアクセス、利用不可', async () => {
      const res = await request(app)
        .get(redirectUrl)
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(500)

      // 画面内容確認
      expect(res.text).toMatch(/お探しのページは見つかりませんでした。/i)
    })

    test('一般ユーザ、受領した請求書詳細画面へアクセス、利用不可', async () => {
      const res = await request(app)
        .get(redirectUrl)
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
        .expect(500)

      // 画面内容確認
      expect(res.text).toMatch(/お探しのページは見つかりませんでした。/i)
    })
  })

  describe('後処理', () => {
    test('userデータ削除', async () => {
      await db.User.destroy({ where: { tenantId: testTenantId } })
      await db.Tenant.destroy({ where: { tenantId: testTenantId } })
    })
  })
})
