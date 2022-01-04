'use strict'
const app = require('../../Application/app')
const request = require('supertest')
const getTenantId = {}
const { JSDOM } = require('jsdom')
const db = require('../../Application/models')

jest.setTimeout(60000) // jestのタイムアウトを60秒とする

const getCookies = require('./getCookies')

describe('ルーティングのインテグレーションテスト', () => {
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

      // アカウント管理者を削除
      await request(app)
        .get('/user/delete')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)

      // アカウント管理者を削除
      await request(app)
        .get('/user/delete')
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
    })
  })

  test('テナントID設定', async () => {
    testTenantId = getTenantId.id
  })

  describe('1.DBにアカウント管理者・一般ユーザ共に登録なし/一般ユーザとしてリクエスト', () => {
    let tenantCsrf

    // テナント未登録のため、テナントの利用登録画面にリダイレクトする
    test('/portalにアクセス：303ステータスと/tenant/registerにリダイレクト', async () => {
      const res = await request(app)
        .get('/portal')
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
        .expect(303)

      expect(res.header.location).toBe('/tenant/register') // リダイレクト先は/tenant/register
    })

    // 管理者権限がないため、アクセスできない
    test('/tenant/registerにアクセス：管理者権限不足による利用不可画面表示', async () => {
      const res = await request(app)
        .get('/tenant/register')
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
        .expect(200)

      // CSRFのワンタイムトークン取得
      const dom = new JSDOM(res.text)
      tenantCsrf = dom.window.document.getElementsByName('_csrf')[0]?.value

      expect(res.text).toMatch(/テナント管理者権限のあるユーザで再度操作をお試しください。/i) // タイトル
    })

    // 正しいCSRFトークンを取得していないため、アクセスできない
    test('/tenant/registerにPOST：csurfによる400ステータスとエラーメッセージ', async () => {
      const res = await request(app)
        .post('/tenant/register')
        .type('form')
        .send({ _csrf: tenantCsrf, termsCheck: 'on' })
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
        .expect(400)

      expect(res.text).toMatch(/不正なページからアクセスされたか、セッションタイムアウトが発生しました。/i) // タイトル
    })
  })

  describe('2.DBにアカウント管理者・一般ユーザ共に登録なし/アカウント管理者としてリクエスト', () => {
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

    //  検索した郵便番号の結果がないときのメッセージ確認
    test('検索した郵便番号の結果がないときのメッセージ確認', async () => {
      const puppeteer = require('puppeteer')
      const browser = await puppeteer.launch({
        headless: true,
        ignoreHTTPSErrors: true
      })

      const page = await browser.newPage()
      await page.setCookie(acCookies[0])
      await page.goto('https://localhost:3000/tenant/register')
      if (page.url() === 'https://localhost:3000/tenant/register') {
        await page.type('#postalNumber', '1234567')
        await page.click('#postalSearchBtn')

        await page.waitForTimeout(500)

        // 検索した郵便番号の結果がないときの表示されたメッセージ確認
        const checkErrorMessage = await page.evaluate(() => {
          return document.querySelector('#modal-card-result').innerText
        })

        expect(checkErrorMessage).toBe(
          '該当する住所が見つかりませんでした。\n住所検索が可能な郵便番号を入力してください。'
        )
      }
      await browser.close()
    })

    //  クリアボタン機能確認
    test('検索した郵便番号の結果が1件の場合：クリアボタン機能確認', async () => {
      const puppeteer = require('puppeteer')
      const browser = await puppeteer.launch({
        headless: true,
        ignoreHTTPSErrors: true
      })

      const page = await browser.newPage()
      await page.setCookie(acCookies[0])
      await page.goto('https://localhost:3000/tenant/register')
      if (page.url() === 'https://localhost:3000/tenant/register') {
        await page.type('#postalNumber', '1000000')
        await page.click('#postalSearchBtn')

        await page.waitForTimeout(500)

        // 住所入力後、状態確認
        // 郵便番号入力が不可になること確認
        const postalNumberReadonlyOn = await page.evaluate(() => {
          return document.querySelector('#postalNumber').getAttribute('readonly')
        })
        expect(postalNumberReadonlyOn).toBe('')

        // 住所検索ボタン非活性化確認
        const postalSearchBtnInactive = await page.evaluate(() => {
          return document.querySelector('#postalSearchBtn').getAttribute('disabled')
        })
        expect(postalSearchBtnInactive).toBe('disabled')

        // クリアボタン活性化確認
        const postalClearBtnActive = await page.evaluate(() => {
          return document.querySelector('#postalClearBtn').getAttribute('disabled')
        })
        expect(postalClearBtnActive).not.toBe('disabled')

        // クリアボタン押下
        await page.click('#postalClearBtn')

        // クリアボタン押下後、状態確認
        // 郵便番号が初期化されていること確認
        const postalNumberInput = await page.evaluate(() => {
          return document.querySelector('#postalNumber').value
        })
        expect(postalNumberInput).toBe('')

        // 郵便番号入力が可能になること確認
        const postalNumberReadonlyOff = await page.evaluate(() => {
          return document.querySelector('#postalNumber').getAttribute('readonly')
        })
        expect(postalNumberReadonlyOff).toBe(null)

        // 住所検索ボタン非活性化確認
        const postalSearchBtnActive = await page.evaluate(() => {
          return document.querySelector('#postalSearchBtn').getAttribute('disabled')
        })
        expect(postalSearchBtnActive).toBe('disabled')

        // クリアボタン非活性化確認
        const postalClearBtnInactive = await page.evaluate(() => {
          return document.querySelector('#postalClearBtn').getAttribute('disabled')
        })
        expect(postalClearBtnInactive).toBe('disabled')
      }

      await browser.close()
    })

    test('検索した郵便番号の結果が複数の場合：クリアボタン機能確認', async () => {
      const puppeteer = require('puppeteer')
      const browser = await puppeteer.launch({
        headless: true,
        ignoreHTTPSErrors: true
      })

      const page = await browser.newPage()
      await page.setCookie(acCookies[0])
      await page.goto('https://localhost:3000/tenant/register')
      if (page.url() === 'https://localhost:3000/tenant/register') {
        await page.type('#postalNumber', '1000004')
        await page.click('#postalSearchBtn')

        await page.waitForTimeout(500)

        await page.click('#modal-card-result > a:nth-child(1)')

        await page.waitForTimeout(300)

        // 住所入力後、状態確認
        // 郵便番号入力が不可になること確認
        const postalNumberReadonlyOn = await page.evaluate(() => {
          return document.querySelector('#postalNumber').getAttribute('readonly')
        })
        expect(postalNumberReadonlyOn).toBe('')

        // 住所検索ボタン非活性化確認
        const postalSearchBtnInactive = await page.evaluate(() => {
          return document.querySelector('#postalSearchBtn').getAttribute('disabled')
        })
        expect(postalSearchBtnInactive).toBe('disabled')

        // クリアボタン活性化確認
        const postalClearBtnActive = await page.evaluate(() => {
          return document.querySelector('#postalClearBtn').getAttribute('disabled')
        })
        expect(postalClearBtnActive).not.toBe('disabled')

        // クリアボタン押下
        await page.click('#postalClearBtn')

        // クリアボタン押下後、状態確認
        // 郵便番号が初期化されていること確認
        const postalNumberInput = await page.evaluate(() => {
          return document.querySelector('#postalNumber').value
        })
        expect(postalNumberInput).toBe('')

        // 郵便番号入力が可能になること確認
        const postalNumberReadonlyOff = await page.evaluate(() => {
          return document.querySelector('#postalNumber').getAttribute('readonly')
        })
        expect(postalNumberReadonlyOff).toBe(null)

        // 住所検索ボタン非活性化確認
        const postalSearchBtnActive = await page.evaluate(() => {
          return document.querySelector('#postalSearchBtn').getAttribute('disabled')
        })
        expect(postalSearchBtnActive).toBe('disabled')

        // クリアボタン非活性化確認
        const postalClearBtnInactive = await page.evaluate(() => {
          return document.querySelector('#postalClearBtn').getAttribute('disabled')
        })
        expect(postalClearBtnInactive).toBe('disabled')
      }

      await browser.close()
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
  })

  describe('3.DBにアカウント管理者のみ登録・一般ユーザ登録なし/アカウント管理者としてリクエスト', () => {
    let tenantCsrf

    // userContextが'NotTenantRegistered'ではない(登録済の)ため、アクセスできない
    test('/tenant/registerにアクセス：userContext不一致による400ステータスとエラーメッセージ', async () => {
      const res = await request(app)
        .get('/tenant/register')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(400)

      // CSRFのワンタイムトークン取得
      const dom = new JSDOM(res.text)
      tenantCsrf = dom.window.document.getElementsByName('_csrf')[0]?.value

      expect(res.text).toMatch(/不正なページからアクセスされたか、セッションタイムアウトが発生しました。/i) // タイトル
    })

    // 正しいCSRFトークンを取得していないため、アクセスできない
    test('/tenant/registerにPOST：csurfによる400ステータスとエラーメッセージ', async () => {
      const res = await request(app)
        .post('/tenant/register')
        .type('form')
        .send({ _csrf: tenantCsrf, termsCheck: 'on' })
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(400)

      expect(res.text).toMatch(/不正なページからアクセスされたか、セッションタイムアウトが発生しました。/i) // タイトル
    })
  })

  describe('4.DBにアカウント管理者のみ登録・一般ユーザ登録なし/一般ユーザとしてリクエスト', () => {
    let tenantCsrf

    // 正しいCSRFトークンを取得していないため、アクセスできない
    test('/tenant/registerにPOST：csurfによる400ステータスとエラーメッセージ', async () => {
      const res = await request(app)
        .post('/tenant/register')
        .type('form')
        .send({ _csrf: tenantCsrf, termsCheck: 'on' })
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
        .expect(400)

      expect(res.text).toMatch(/不正なページからアクセスされたか、セッションタイムアウトが発生しました。/i) // タイトル
    })
  })

  describe('5.DBにアカウント管理者・一般ユーザ共に登録済/アカウント管理者としてリクエスト', () => {
    let tenantCsrf

    // userContextが'NotTenantRegistered'ではない(登録済の)ため、アクセスできない
    test('/tenant/registerにアクセス：userContext不一致による400ステータスとエラーメッセージ', async () => {
      const res = await request(app)
        .get('/tenant/register')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(400)

      // CSRFのワンタイムトークン取得
      const dom = new JSDOM(res.text)
      tenantCsrf = dom.window.document.getElementsByName('_csrf')[0]?.value

      expect(res.text).toMatch(/不正なページからアクセスされたか、セッションタイムアウトが発生しました。/i) // タイトル
    })

    // 正しいCSRFトークンを取得していないため、アクセスできない
    test('/tenant/registerにPOST：csurfによる400ステータスとエラーメッセージ', async () => {
      const res = await request(app)
        .post('/tenant/register')
        .type('form')
        .send({ _csrf: tenantCsrf, termsCheck: 'on' })
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(400)

      expect(res.text).toMatch(/不正なページからアクセスされたか、セッションタイムアウトが発生しました。/i) // タイトル
    })
  })

  describe('6.DBにアカウント管理者・一般ユーザ共に登録済/一般ユーザとしてリクエスト', () => {
    let tenantCsrf

    // 正しいCSRFトークンを取得していないため、アクセスできない
    test('/tenant/registerにPOST：csurfによる400ステータスとエラーメッセージ', async () => {
      const res = await request(app)
        .post('/tenant/register')
        .type('form')
        .send({ _csrf: tenantCsrf, termsCheck: 'on' })
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
        .expect(400)

      expect(res.text).toMatch(/不正なページからアクセスされたか、セッションタイムアウトが発生しました。/i) // タイトル
    })
  })

  describe('7.DBに一般ユーザのみ登録・アカウント管理者登録なし/一般ユーザとしてリクエスト', () => {
    let tenantCsrf

    // 正しいCSRFトークンを取得していないため、アクセスできない
    test('/tenant/registerにPOST：csurfによる400ステータスとエラーメッセージ', async () => {
      const res = await request(app)
        .post('/tenant/register')
        .type('form')
        .send({ _csrf: tenantCsrf, termsCheck: 'on' })
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
        .expect(400)

      expect(res.text).toMatch(/不正なページからアクセスされたか、セッションタイムアウトが発生しました。/i) // タイトル
    })
  })

  describe('8.DBに一般ユーザのみ登録・アカウント管理者登録なし/アカウント管理者としてリクエスト', () => {
    let tenantCsrf

    // userContextが'NotTenantRegistered'ではない(登録済の)ため、アクセスできない
    test('/tenant/registerにアクセス：userContext不一致による400ステータスとエラーメッセージ', async () => {
      const res = await request(app)
        .get('/tenant/register')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(400)

      // CSRFのワンタイムトークン取得
      const dom = new JSDOM(res.text)
      tenantCsrf = dom.window.document.getElementsByName('_csrf')[0]?.value

      expect(res.text).toMatch(/不正なページからアクセスされたか、セッションタイムアウトが発生しました。/i) // タイトル
    })

    // 正しいCSRFトークンを取得していないため、アクセスできない
    test('/tenant/registerにPOST：csurfによる400ステータスとエラーメッセージ', async () => {
      const res = await request(app)
        .post('/tenant/register')
        .type('form')
        .send({ _csrf: tenantCsrf, termsCheck: 'on' })
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(400)

      expect(res.text).toMatch(/不正なページからアクセスされたか、セッションタイムアウトが発生しました。/i) // タイトル
    })
  })

  describe('後処理', () => {
    test('ContractとOrderデータ削除', async () => {
      await db.Contract.destroy({ where: { tenantId: testTenantId } })
      await db.Order.destroy({ where: { tenantId: testTenantId } })
    })

    test('全てのユーザを削除', async () => {
      // 一般ユーザを削除
      await request(app)
        .get('/user/delete')
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)

      // アカウント管理者を削除
      await request(app)
        .get('/user/delete')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
    })
  })
})
