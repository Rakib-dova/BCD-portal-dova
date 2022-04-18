'use strict'
const app = require('../../Application/app')
const request = require('supertest')
const { JSDOM } = require('jsdom')
const db = require('../../Application/models')
const getTenantId = {}
let redirectUrl

jest.setTimeout(80000) // jestのタイムアウトを60秒とする

const getCookies = require('./getCookies')

describe('支払依頼画面のインテグレーションテスト', () => {
  let acCookies
  let userCookies
  let testTenantId
  // let acStatus10
  let acStatus11
  let userStatus11
  // let acStatus30
  // let acStatus40

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
      // await db.User.destroy({ where: { tenantId: getTenantId.id } })
      // await db.Tenant.destroy({ where: { tenantId: getTenantId.id } })
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
    // テナントステータスが「登録申込」、支払依頼画面直接接続-利用不可
    test('管理者、契約ステータス：登録申込、支払依頼画面直接接続-利用不可', async () => {
      const res = await request(app)
        .get('/requestApproval')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(400)

      // 画面内容確認
      expect(res.text).toMatch(/不正なページからアクセスされたか、セッションタイムアウトが発生しました。/i)
    })

    test('一般ユーザ、契約ステータス：登録申込、支払依頼画面直接接続-利用不可', async () => {
      const res = await request(app)
        .get('/requestApproval')
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
        .expect(400)

      // 画面内容確認
      expect(res.text).toMatch(/不正なページからアクセスされたか、セッションタイムアウトが発生しました。/i)
    })

    test('管理者、支払依頼画面へアクセス、利用可能', async () => {
      const coookie = `${acCookies[0].name}=${acCookies[0].value}`
      const res = await request(app).get('/inboxList/1').set('Cookie', coookie).expect(200)

      // 画面内容確認
      expect(res.text).toMatch(/支払依頼一覧/i)
    })

    test('一般ユーザ、支払依頼画面へアクセス、利用可能', async () => {
      const coookie = `${userCookies[0].name}=${userCookies[0].value}`
      const res = await request(app).get('/inboxList/1').set('Cookie', coookie).expect(200)

      // 画面内容確認
      expect(res.text).toMatch(/支払依頼一覧/i)
    })
  })

  describe('3.契約ステータス：登録受付', () => {
    test('/authにアクセス：oauth2認証をし、セッション用Cookieを取得', async () => {
      // アカウント管理者と一般ユーザのID/SECRETは、テストコマンドの引数から取得
      acStatus11 = await getCookies(app, request, getTenantId, 'inte.test.user+11@gmail.com', '1q2w3e4r5t')
      userStatus11 = await getCookies(app, request, getTenantId, 'inte.test.user+11user@gmail.com', '1q2w3e4r5t')
    })

    test('管理者、契約ステータス：登録受付、支払依頼画面直接接続-利用不可', async () => {
      const cookie11 = `${acStatus11[0].name}=${acStatus11[0].value}`
      const res = await request(app).get('/requestApproval').set('Cookie', cookie11).expect(400)

      // 画面内容確認
      expect(res.text).toMatch(/不正なページからアクセスされたか、セッションタイムアウトが発生しました。/i)
    })

    test('一般ユーザ、契約ステータス：登録受付、支払依頼画面直接接続-利用不可', async () => {
      const cookie11user = `${userStatus11[0].name}=${userStatus11[0].value}`
      const res = await request(app).get('/requestApproval').set('Cookie', cookie11user).expect(400)

      // 画面内容確認
      expect(res.text).toMatch(/不正なページからアクセスされたか、セッションタイムアウトが発生しました。/i)
    })

    test('管理者、支払依頼画面へアクセス、利用可能', async () => {
      const cookie11 = `${acStatus11[0].name}=${acStatus11[0].value}`
      let res = await request(app).get('/inboxList/1').set('Cookie', cookie11).expect(200)

      // 支払依頼画面へテスト対象請求書番号確認
      const uuidIndex = res.text.search(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/)
      const uuid = res.text.substring(uuidIndex, uuidIndex + 36)
      const inboxUrl = `/inbox/${uuid}`

      // 仕訳情報画面へ遷移できること確認
      res = await request(app).get(inboxUrl).set('Cookie', cookie11).expect(200)

      // 支払依頼へ遷移できること確認
      const requestUrl = `/requestApproval/${uuid}`
      res = await request(app).get(requestUrl).set('Cookie', cookie11).expect(200)

      expect(res.text).toMatch(/借方/)
      expect(res.text).toMatch(/貸方/)
    })

    test('一般ユーザ、支払依頼画面へアクセス、利用可能', async () => {
      const cookie11user = `${userStatus11[0].name}=${userStatus11[0].value}`
      let res = await request(app).get('/inboxList/1').set('Cookie', cookie11user).expect(200)

      // 支払依頼画面へテスト対象請求書番号確認
      const uuidIndex = res.text.search(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/)
      const uuid = res.text.substring(uuidIndex, uuidIndex + 36)
      const inboxUrl = `/inbox/${uuid}`

      // 仕訳情報画面へ遷移できること確認
      res = await request(app).get(inboxUrl).set('Cookie', cookie11user).expect(200)

      // 支払依頼へ遷移できること確認
      const requestUrl = `/requestApproval/${uuid}`
      res = await request(app).get(requestUrl).set('Cookie', cookie11user).expect(200)

      expect(res.text).toMatch(/借方/)
      expect(res.text).toMatch(/貸方/)
    })
  })

  describe('4.契約ステータス：契約中', () => {
    // テナントステータスが「契約中」、支払依頼画面直接接続-利用不可
    test('管理者、契約ステータス：契約中、支払依頼画面直接接続-利用不可', async () => {
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
        .get('/requestApproval')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(400)

      // 画面内容確認
      expect(res.text).toMatch(/不正なページからアクセスされたか、セッションタイムアウトが発生しました。/i)
    })

    test('一般ユーザ、契約ステータス：契約中、支払依頼画面直接接続-利用不可', async () => {
      const res = await request(app)
        .get('/requestApproval')
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
        .expect(400)

      // 画面内容確認
      expect(res.text).toMatch(/不正なページからアクセスされたか、セッションタイムアウトが発生しました。/i)
    })

    test('管理者、支払依頼画面へアクセス、利用可能', async () => {
      const puppeteer = require('puppeteer')
      const browser = await puppeteer.launch({
        headless: true,
        ignoreHTTPSErrors: true
      })
      const page = await browser.newPage()
      await page.setCookie(acCookies[0])
      await page.goto('https://localhost:3000/inboxList/1')

      await page.click('#informationTab > table > tbody > tr:nth-child(1) > td.text-center.display-row-td > a')

      await page.waitForTimeout(5000)

      await page.click('#form > div.grouped-button > a.button.is-link')

      await page.waitForTimeout(1000)

      // 支払依頼画面にredirectする。
      expect(await page.url()).toBe(`https://localhost:3000${redirectUrl}`)

      browser.close()
    })

    test('一般ユーザ、支払依頼画面へアクセス、利用可能', async () => {
      const puppeteer = require('puppeteer')
      const browser = await puppeteer.launch({
        headless: true,
        ignoreHTTPSErrors: true
      })
      const page = await browser.newPage()
      await page.setCookie(acCookies[0])
      await page.goto('https://localhost:3000/inboxList/1')

      await page.click('#informationTab > table > tbody > tr:nth-child(1) > td.text-center.display-row-td > a')

      await page.waitForTimeout(5000)

      await page.click('#form > div.grouped-button > a.button.is-link')

      await page.waitForTimeout(1000)

      // 支払依頼画面にredirectする。
      expect(await page.url()).toBe(`https://localhost:3000${redirectUrl}`)

      browser.close()
    })

    test('「仕訳情報設定へ」ボタン遷移確認（受領した請求書一覧画面に遷移）', async () => {
      const puppeteer = require('puppeteer')
      const browser = await puppeteer.launch({
        headless: true,
        ignoreHTTPSErrors: true
      })
      const page = await browser.newPage()
      await page.setCookie(acCookies[0])
      await page.goto(`https://localhost:3000${redirectUrl}`)

      await page.click('#form > div.field.is-grouped.is-grouped-centered > div > div > div > a.button.mr-6')

      await page.waitForTimeout(5000)

      const inboxUrl = 'inbox/' + redirectUrl.split('/')[2]

      // 受領した請求書一覧画面に遷移確認
      expect(await page.url()).toBe(`https://localhost:3000/${inboxUrl}`)

      await browser.close()
    })

    // 支払依頼画面内容確認
    test('管理者、支払依頼画面内容確認', async () => {
      const res = await request(app)
        .get(redirectUrl)
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(200)

      // 画面内容確認
      expect(res.text).toMatch(/請求書番号/i)
      expect(res.text).toMatch(/宛先/i)
      expect(res.text).toMatch(/差出人/i)
      expect(res.text).toMatch(/仕訳情報/i)
      expect(res.text).toMatch(/勘定科目コード/i)
      expect(res.text).toMatch(/補助科目コード/i)
      expect(res.text).toMatch(/部門コード/i)
      expect(res.text).toMatch(/計上金額/i)
      expect(res.text).toMatch(/合計 円/i)
      expect(res.text).toMatch(/メッセージ/i)
      expect(res.text).toMatch(/仕訳情報設定へ/i)
      expect(res.text).toMatch(/確認/i)
    })

    test('一般ユーザ、支払依頼画面内容確認', async () => {
      const res = await request(app)
        .get(redirectUrl)
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(200)

      // 画面内容確認
      expect(res.text).toMatch(/請求書番号/i)
      expect(res.text).toMatch(/宛先/i)
      expect(res.text).toMatch(/差出人/i)
      expect(res.text).toMatch(/仕訳情報/i)
      expect(res.text).toMatch(/勘定科目コード/i)
      expect(res.text).toMatch(/補助科目コード/i)
      expect(res.text).toMatch(/部門コード/i)
      expect(res.text).toMatch(/計上金額/i)
      expect(res.text).toMatch(/合計 円/i)
      expect(res.text).toMatch(/メッセージ/i)
      expect(res.text).toMatch(/仕訳情報設定へ/i)
      expect(res.text).toMatch(/確認/i)
    })

    test('メッセージ入力文字数確認（1,500文字まで）', async () => {
      const puppeteer = require('puppeteer')
      const browser = await puppeteer.launch({
        headless: true,
        ignoreHTTPSErrors: true
      })
      const page = await browser.newPage()
      await page.setCookie(acCookies[0])
      await page.goto(`https://localhost:3000${redirectUrl}`)

      await page.type(
        '#inputMsg',
        'あいうえおかきくけこさしすせそらりるれろabcdefghijk1234567890あいうえおかきくけこさしすせそらりるれろabcdefghijk1234567890あいうえおかきくけこさしすせそらりるれろabcdefghijk1234567890あいうえおかきくけこさしすせそらりるれろabcdefghijk1234567890あいうえおかきくけこさしすせそらりるれろabcdefghijk1234567890あいうえおかきくけこさしすせそらりるれろabcdefghijk1234567890あいうえおかきくけこさしすせそらりるれろabcdefghijk1234567890あいうえおかきくけこさしすせそらりるれろabcdefghijk1234567890あいうえおかきくけこさしすせそらりるれろabcdefghijk1234567890あいうえおかきくけこさしすせそらりるれろabcdefghijk1234567890あいうえおかきくけこさしすせそらりるれろabcdefghijk1234567890あいうえおかきくけこさしすせそらりるれろabcdefghijk1234567890あいうえおかきくけこさしすせそらりるれろabcdefghijk1234567890あいうえおかきくけこさしすせそらりるれろabcdefghijk1234567890あいうえおかきくけこさしすせそらりるれろabcdefghijk1234567890あいうえおかきくけこさしすせそらりるれろabcdefghijk1234567890あいうえおかきくけこさしすせそらりるれろabcdefghijk1234567890あいうえおかきくけこさしすせそらりるれろabcdefghijk1234567890あいうえおかきくけこさしすせそらりるれろabcdefghijk1234567890あいうえおかきくけこさしすせそらりるれろabcdefghijk1234567890あいうえおかきくけこさしすせそらりるれろabcdefghijk1234567890あいうえおかきくけこさしすせそらりるれろabcdefghijk1234567890あいうえおかきくけこさしすせそらりるれろabcdefghijk1234567890あいうえおかきくけこさしすせそらりるれろabcdefghijk1234567890あいうえおかきくけこさしすせそらりるれろabcdefghijk1234567890あいうえおかきくけこさしすせそらりるれろabcdefghijk1234567890あいうえおかきくけこさしすせそらりるれろabcdefghijk1234567890あいうえおかきくけこさしすせそらりるれろabcdefghijk1234567890あいうえおかきくけこさしすせそらりるれろabcdefghijk1234567890あいうえおかきくけこさしすせそらりるれろabcdefghijk1234567890あいうえおかきくけこさしすせそらりるれろabcdefghijk1234567890あいうえおかきくけこさしすせそらりるれろabcdefghijk1234567890あいうえおかきくけこさしすせそらりるれろabcdefghijk1234567890あいうえおかきくけこさしすせそらりるれろabcdefghijk1234567890あいうえおかきくけこさしすせそらりるれろabcdefghijk1234567890あいうえおかきくけこさしすせそらりるれろabcdefghijk1234567890あいうえおかきくけこさしすせそらりるれろabcdefg'
      )

      await page.waitForTimeout(500)

      const msg = await page.evaluate(() => {
        return document.querySelector('#inputMsg').value
      })

      // 受領した請求書一覧画面に遷移確認
      expect(msg).toBe(
        'あいうえおかきくけこさしすせそらりるれろabcdefghijk1234567890あいうえおかきくけこさしすせそらりるれろabcdefghijk1234567890あいうえおかきくけこさしすせそらりるれろabcdefghijk1234567890あいうえおかきくけこさしすせそらりるれろabcdefghijk1234567890あいうえおかきくけこさしすせそらりるれろabcdefghijk1234567890あいうえおかきくけこさしすせそらりるれろabcdefghijk1234567890あいうえおかきくけこさしすせそらりるれろabcdefghijk1234567890あいうえおかきくけこさしすせそらりるれろabcdefghijk1234567890あいうえおかきくけこさしすせそらりるれろabcdefghijk1234567890あいうえおかきくけこさしすせそらりるれろabcdefghijk1234567890あいうえおかきくけこさしすせそらりるれろabcdefghijk1234567890あいうえおかきくけこさしすせそらりるれろabcdefghijk1234567890あいうえおかきくけこさしすせそらりるれろabcdefghijk1234567890あいうえおかきくけこさしすせそらりるれろabcdefghijk1234567890あいうえおかきくけこさしすせそらりるれろabcdefghijk1234567890あいうえおかきくけこさしすせそらりるれろabcdefghijk1234567890あいうえおかきくけこさしすせそらりるれろabcdefghijk1234567890あいうえおかきくけこさしすせそらりるれろabcdefghijk1234567890あいうえおかきくけこさしすせそらりるれろabcdefghijk1234567890あいうえおかきくけこさしすせそらりるれろabcdefghijk1234567890あいうえおかきくけこさしすせそらりるれろabcdefghijk1234567890あいうえおかきくけこさしすせそらりるれろabcdefghijk1234567890あいうえおかきくけこさしすせそらりるれろabcdefghijk1234567890あいうえおかきくけこさしすせそらりるれろabcdefghijk1234567890あいうえおかきくけこさしすせそらりるれろabcdefghijk1234567890あいうえおかきくけこさしすせそらりるれろabcdefghijk1234567890あいうえおかきくけこさしすせそらりるれろabcdefghijk1234567890あいうえおかきくけこさしすせそらりるれろabcdefghijk1234567890あいうえおかきくけこさしすせそらりるれろabcdefghijk1234567890あいうえおかきくけこさしすせそらりるれろabcdefghijk1234567890あいうえおかきくけこさしすせそらりるれろabcdefghijk1234567890あいうえおかきくけこさしすせそらりるれろabcdefghijk1234567890あいうえおかきくけこさしすせそらりるれろabcdefghijk1234567890あいうえおかきくけこさしすせそらりるれろabcdefghijk1234567890あいうえおかきくけこさしすせそらりるれろabcdefghijk1234567890あいうえおかきくけこさしすせそらりるれろabcdefghijk1234567890あいうえおかきくけこさしすせそらりるれろabcd'
      )

      await browser.close()
    })

    test('承認ルート検索モーダル確認', async () => {
      const puppeteer = require('puppeteer')
      const browser = await puppeteer.launch({
        headless: true,
        ignoreHTTPSErrors: true
      })
      const page = await browser.newPage()
      await page.setCookie(acCookies[0])
      await page.goto(`https://localhost:3000${redirectUrl}`)

      await page.click('#btn-approveRouteInsert')

      await page.waitForTimeout(500)

      // 仕訳一括設定モーダル開きをチェック
      const checkOpenedModal = await page.evaluate(() => {
        return Array.prototype.find.call(document.querySelector('#approveRoute-modal').classList, (item) => {
          if (item === 'is-active') return true
          return false
        })
      })

      expect(checkOpenedModal).toBe('is-active')

      await browser.close()
    })

    test('承認ルート選択した場合,表示確認', async () => {
      const contract = await db.Contract.findOne({
        where: {
          tenantId: testTenantId
        }
      })

      const v4 = require('uuid').v4
      const testApproveRoute = new db.ApproveRoute({
        approveRouteId: v4(),
        contractId: contract.contractId,
        approveRouteName: 'integrationApproveRoute',
        deleteFlag: 0,
        updateFlag: 0
      })
      await testApproveRoute.save()

      const testApproveUserId1 = v4()
      const testApproveUserId2 = v4()
      const testApproveUser1 = new db.ApproveUser({
        approveUserId: testApproveUserId1,
        approveRouteId: testApproveRoute.approveRouteId,
        approveUser: 'aa974511-8188-4022-bd86-45e251fd259e',
        prevApproveUser: null,
        nextApproveUser: testApproveUserId2,
        isLastApproveUser: 0
      })
      await testApproveUser1.save()

      const testApproveUser2 = new db.ApproveUser({
        approveUserId: testApproveUserId2,
        approveRouteId: testApproveRoute.approveRouteId,
        approveUser: '53607702-b94b-4a94-9459-6cf3acd65603',
        prevApproveUser: testApproveUserId1,
        nextApproveUser: null,
        isLastApproveUser: 1
      })
      await testApproveUser2.save()

      const puppeteer = require('puppeteer')
      const browser = await puppeteer.launch({
        headless: true,
        ignoreHTTPSErrors: true
      })
      const page = await browser.newPage()
      await page.setCookie(acCookies[0])
      await page.goto(`https://localhost:3000${redirectUrl}`)

      // 承認ルート選択ボタン押下
      await page.click('#btn-approveRouteInsert')

      await page.waitForTimeout(1000)

      // 承認ルート検索
      await page.click('#btnSearchApproveRoute')

      await page.waitForTimeout(3000)

      await page.click('#displayFieldApproveRouteResultBody > tr > td.btnSelect > a')

      await page.waitForTimeout(2500)

      // 承認ルートテーブル確認
      const checkkApproveList = await page.evaluate(() => {
        const displayDetailApproveRouteTable = document.querySelectorAll('#displayDetailApproveRouteTable > div')
        const result = []
        displayDetailApproveRouteTable.forEach((item) => {
          result.push(item.innerText)
        })
        return result
      })

      expect(checkkApproveList[0]).toMatch('承認順')
      expect(checkkApproveList[0]).toMatch('承認者')
      expect(checkkApproveList[1]).toMatch('一次承認')
      expect(checkkApproveList[2]).toMatch('最終承認')

      await browser.close()
    })

    test('支払依頼時ダイアログ確認', async () => {
      const contract = await db.Contract.findOne({
        where: {
          tenantId: testTenantId
        }
      })

      const v4 = require('uuid').v4
      const testApproveRoute = new db.ApproveRoute({
        approveRouteId: v4(),
        contractId: contract.contractId,
        approveRouteName: 'integrationApproveRoute',
        deleteFlag: 0,
        updateFlag: 0
      })
      await testApproveRoute.save()

      const testApproveUser = new db.ApproveUser({
        approveUserId: v4(),
        approveRouteId: testApproveRoute.approveRouteId,
        approveUser: 'aa974511-8188-4022-bd86-45e251fd259e',
        prevApproveUser: null,
        nextApproveUser: null,
        isLastApproveUser: 1
      })
      await testApproveUser.save()

      const puppeteer = require('puppeteer')
      const browser = await puppeteer.launch({
        headless: true,
        ignoreHTTPSErrors: true
      })
      const page = await browser.newPage()
      await page.setCookie(acCookies[0])
      await page.goto(`https://localhost:3000${redirectUrl}`)

      // 承認ルート選択ボタン押下
      await page.click('#btn-approveRouteInsert')

      await page.waitForTimeout(1000)

      // 承認ルート検索
      await page.click('#btnSearchApproveRoute')

      await page.waitForTimeout(3000)

      await page.click('#displayFieldApproveRouteResultBody > tr > td.btnSelect > a')

      await page.waitForTimeout(2500)

      // メッセージ入力
      await page.type('#inputMsg', 'インテグレーションテスト')

      // 支払依頼画面にredirectする。
      expect(page.url()).toBe(`https://localhost:3000${redirectUrl}`)

      // 確認ボタン押下
      await page.click('#btn-confirm')

      await page.waitForTimeout(1000)

      // 依頼ボタン押下
      await page.click('#btn-approval')

      await browser.close()
    })
  })

  describe('5.契約ステータス：変更申込', () => {
    // テナントステータスが「変更申込」、支払依頼画面直接接続-利用不可
    test('管理者、契約ステータス：変更申込、支払依頼画面直接接続-利用不可', async () => {
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

      // 支払依頼削除
      const requestId = await db.RequestApproval.findOne({
        where: {
          contractId: contract.contractId
        }
      })

      if (requestId && requestId.length !== 0) {
        await db.Approval.destroy({ where: { requestId: requestId.requestId } })
        await db.RequestApproval.destroy({ where: { contractId: contract.contractId } })
      }

      const res = await request(app)
        .get('/requestApproval')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(400)

      // 画面内容確認
      expect(res.text).toMatch(/不正なページからアクセスされたか、セッションタイムアウトが発生しました。/i)
    })

    test('一般ユーザ、契約ステータス：変更申込、支払依頼画面直接接続-利用不可', async () => {
      const res = await request(app)
        .get('/requestApproval')
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
        .expect(400)

      // 画面内容確認
      expect(res.text).toMatch(/不正なページからアクセスされたか、セッションタイムアウトが発生しました。/i)
    })

    test('管理者、支払依頼画面へアクセス、利用可能', async () => {
      const puppeteer = require('puppeteer')
      const browser = await puppeteer.launch({
        headless: true,
        ignoreHTTPSErrors: true
      })
      const page = await browser.newPage()
      await page.setCookie(acCookies[0])
      await page.goto('https://localhost:3000/inboxList/1')

      await page.click('#informationTab > table > tbody > tr:nth-child(1) > td.text-center.display-row-td > a')

      await page.waitForTimeout(5000)

      await page.click('#form > div.grouped-button > a.button.is-link')

      await page.waitForTimeout(1000)

      // 支払依頼画面にredirectする。
      expect(await page.url()).toBe(`https://localhost:3000${redirectUrl}`)

      browser.close()
    })

    test('一般ユーザ、支払依頼画面へアクセス、利用可能', async () => {
      const puppeteer = require('puppeteer')
      const browser = await puppeteer.launch({
        headless: true,
        ignoreHTTPSErrors: true
      })
      const page = await browser.newPage()
      await page.setCookie(acCookies[0])
      await page.goto('https://localhost:3000/inboxList/1')

      await page.click('#informationTab > table > tbody > tr:nth-child(1) > td.text-center.display-row-td > a')

      await page.waitForTimeout(5000)

      await page.click('#form > div.grouped-button > a.button.is-link')

      await page.waitForTimeout(1000)

      // 支払依頼画面にredirectする。
      expect(await page.url()).toBe(`https://localhost:3000${redirectUrl}`)

      browser.close()
    })
  })

  describe('6.契約ステータス：変更受付', () => {
    // テナントステータスが「変更受付」、支払依頼画面直接接続-利用不可
    test('管理者、契約ステータス：変更受付、支払依頼画面直接接続-利用不可', async () => {
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
        .get('/requestApproval')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(400)

      // 画面内容確認
      expect(res.text).toMatch(/不正なページからアクセスされたか、セッションタイムアウトが発生しました。/i)
    })

    test('一般ユーザ、契約ステータス：変更受付、支払依頼画面直接接続-利用不可', async () => {
      const res = await request(app)
        .get('/requestApproval')
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
        .expect(400)

      // 画面内容確認
      expect(res.text).toMatch(/不正なページからアクセスされたか、セッションタイムアウトが発生しました。/i)
    })

    test('管理者、支払依頼画面へアクセス、利用可能', async () => {
      const puppeteer = require('puppeteer')
      const browser = await puppeteer.launch({
        headless: true,
        ignoreHTTPSErrors: true
      })
      const page = await browser.newPage()
      await page.setCookie(acCookies[0])
      await page.goto('https://localhost:3000/inboxList/1')

      await page.click('#informationTab > table > tbody > tr:nth-child(1) > td.text-center.display-row-td > a')

      await page.waitForTimeout(5000)

      await page.click('#form > div.grouped-button > a.button.is-link')

      await page.waitForTimeout(1000)

      // 支払依頼画面にredirectする。
      expect(await page.url()).toBe(`https://localhost:3000${redirectUrl}`)

      browser.close()
    })

    test('一般ユーザ、支払依頼画面へアクセス、利用可能', async () => {
      const puppeteer = require('puppeteer')
      const browser = await puppeteer.launch({
        headless: true,
        ignoreHTTPSErrors: true
      })
      const page = await browser.newPage()
      await page.setCookie(acCookies[0])
      await page.goto('https://localhost:3000/inboxList/1')

      await page.click('#informationTab > table > tbody > tr:nth-child(1) > td.text-center.display-row-td > a')

      await page.waitForTimeout(5000)

      await page.click('#form > div.grouped-button > a.button.is-link')

      await page.waitForTimeout(1000)

      // 支払依頼画面にredirectする。
      expect(await page.url()).toBe(`https://localhost:3000${redirectUrl}`)

      browser.close()
    })
  })

  describe('7.契約ステータス：解約申込', () => {
    // テナントステータスが「解約申込」、支払依頼画面直接接続-利用不可
    test('管理者、契約ステータス：解約申込、支払依頼画面直接接続-利用不可', async () => {
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
        .get('/requestApproval')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(400)

      // 画面内容確認
      expect(res.text).toMatch(/不正なページからアクセスされたか、セッションタイムアウトが発生しました。/i)
    })

    test('一般ユーザ、契約ステータス：解約申込、支払依頼画面直接接続-利用不可', async () => {
      const res = await request(app)
        .get('/requestApproval')
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
        .expect(400)

      // 画面内容確認
      expect(res.text).toMatch(/不正なページからアクセスされたか、セッションタイムアウトが発生しました。/i)
    })

    test('管理者、支払依頼画面へアクセス、利用不可', async () => {
      const res = await request(app)
        .get(redirectUrl)
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(200)

      // 画面内容確認
      expect(res.text).toMatch(/現在解約手続き中です。/i)
    })

    test('一般ユーザ、支払依頼画面へアクセス、利用不可', async () => {
      const res = await request(app)
        .get(redirectUrl)
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
        .expect(200)

      // 画面内容確認
      expect(res.text).toMatch(/現在解約手続き中です。/i)
    })
  })

  describe('8.契約ステータス：解約受付', () => {
    // テナントステータスが「解約受付」、支払依頼画面直接接続-利用不可
    test('管理者、契約ステータス：解約受付、支払依頼画面直接接続-利用不可', async () => {
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
        .get('/requestApproval')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(400)

      // 画面内容確認
      expect(res.text).toMatch(/不正なページからアクセスされたか、セッションタイムアウトが発生しました。/i)
    })

    test('一般ユーザ、契約ステータス：解約受付、支払依頼画面直接接続-利用不可', async () => {
      const res = await request(app)
        .get('/requestApproval')
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
        .expect(400)

      // 画面内容確認
      expect(res.text).toMatch(/不正なページからアクセスされたか、セッションタイムアウトが発生しました。/i)
    })

    test('管理者、支払依頼画面へアクセス、利用不可', async () => {
      const res = await request(app)
        .get(redirectUrl)
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(200)

      // 画面内容確認
      expect(res.text).toMatch(/現在解約手続き中です。/i)
    })

    test('一般ユーザ、支払依頼画面へアクセス、利用不可', async () => {
      const res = await request(app)
        .get(redirectUrl)
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
        .expect(200)

      // 画面内容確認
      expect(res.text).toMatch(/現在解約手続き中です。/i)
    })
  })

  describe('9.契約ステータス：解約', () => {
    // テナントステータスが「解約」、支払依頼画面直接接続-利用不可
    test('管理者、契約ステータス：解約、支払依頼画面直接接続-利用不可', async () => {
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
        .get('/requestApproval')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(400)

      // 画面内容確認
      expect(res.text).toMatch(/不正なページからアクセスされたか、セッションタイムアウトが発生しました。/i)
    })

    test('一般ユーザ、契約ステータス：解約、支払依頼画面直接接続-利用不可', async () => {
      const res = await request(app)
        .get('/requestApproval')
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
        .expect(400)

      // 画面内容確認
      expect(res.text).toMatch(/不正なページからアクセスされたか、セッションタイムアウトが発生しました。/i)
    })

    test('管理者、支払依頼画面へアクセス、利用不可', async () => {
      const res = await request(app)
        .get(redirectUrl)
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(500)

      // 画面内容確認
      expect(res.text).toMatch(/お探しのページは見つかりませんでした。/i)
    })

    test('一般ユーザ、支払依頼画面へアクセス、利用不可', async () => {
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
