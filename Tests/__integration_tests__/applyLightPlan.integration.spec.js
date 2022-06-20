'use strict'
const request = require('supertest')
const puppeteer = require('puppeteer')
const { JSDOM } = require('jsdom')
const app = require('../../Application/app')
const db = require('../../Application/models')
const getCookies = require('./getCookies')

const getTenantId = {}

const applyLightPlanData = {
  commonCustomerId: '11111111111',
  contractorName: '契約者名',
  contractorKanaName: 'カナ',
  postalNumber: '1000004',
  contractAddressVal: '東京都千代田区大手町一丁目',
  banch1: '１番',
  tatemono1: '建物',
  contactPersonName: '連絡先担当者名',
  contactPhoneNumber: '000-0000-0000',
  contactMail: 'aaaaaa@aaa.com',
  campaignCode: '00000',
  salesPersonName: '販売担当者名',
  password: 'Aa11111111',
  passwordConfirm: 'Aa11111111',
  billMailingPostalNumber: '1000004',
  billMailingAddress: '東京都千代田区大手町一丁目',
  billMailingAddressBanchi1: '請求書送付先番地等',
  billMailingAddressBuilding1: '請求書送付先建物等',
  billMailingKanaName: '請求書送付先宛名',
  billMailingName: 'カナ',
  billMailingPersonName: '請求に関する連絡先',
  billMailingPhoneNumber: '000-0000-0000',
  billMailingMailAddress: 'aaa@aaa.com',
  openingDate: '2022-06-16',
  salesChannelCode: '000000',
  salesChannelName: '販売チャネル名',
  salesChannelDeptName: '部課名',
  salesChannelEmplyeeCode: '11111111',
  salesChannelPersonName: '担当者名',
  salesChannelDeptType: '{"code":"01","name":"Com第一営業本部"}',
  salesChannelPhoneNumber: '000-0000-0000',
  salesChannelMailAddress: 'aaa@aaa.com'
}

jest.setTimeout(60000) // jestのタイムアウトを60秒とする

describe('ライトプラン申込のインテグレーションテスト', () => {
  let acCookies
  // let userCookies
  let testTenantId

  describe('0.前準備', () => {
    test('/authにアクセス:oauth2認証をし、セッション用Cookieを取得', async () => {
      // アカウント管理者と一般ユーザのID/SECRETは、テストコマンドの引数から取得
      const options = require('minimist')(process.argv.slice(2))
      const adminId = options.adminid
      const adminSecret = options.adminsecret
      // const userId = options.userid
      // const userSecret = options.usersecret
      // --------------------アカウント管理者のCookieを取得---------------
      acCookies = await getCookies(app, request, getTenantId, adminId, adminSecret)
      // ---------------------一般ユーザのCookieを取得--------------------
      // userCookies = await getCookies(app, request, getTenantId, userId, userSecret)

      // Cookieを使ってローカル開発環境のDBからCookieと紐づくユーザを削除しておく

      // DBクリア
      await db.User.destroy({ where: { tenantId: getTenantId.id } })
      await db.Tenant.destroy({ where: { tenantId: getTenantId.id } })
    })

    test('テナントID設定', async () => {
      testTenantId = getTenantId.id
    })
  })

  describe('1.無償契約ステータス:未登録', () => {
    test('ライトプラン申込画面が表示されない、テナント登録画面へリダイレクト', async () => {
      const res = await request(app)
        .get('/applyLightPlan')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(303)

      // リダイレクト先
      expect(res.headers.location).toMatch('/tenant/register')
    })

    test('ライトプラン申込の登録(POST)ができない、テナント登録画面へリダイレクト', async () => {
      const res = await request(app)
        .post('/applyLightPlan/register')
        .send({ ...applyLightPlanData })
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(303)

      // リダイレクト先
      expect(res.headers.location).toMatch('/tenant/register')
    })
  })

  describe('2.契約ステータス:新規登録、ライトプランステータス:未申込', () => {
    let tenantCsrf
    test('利用登録画面へ遷移', async () => {
      const res = await request(app)
        .get('/tenant/register')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(200)

      // CSRFのワンタイムトークン取得
      const dom = new JSDOM(res.text)
      tenantCsrf = dom.window.document.getElementsByName('_csrf')[0]?.value

      // 画面内容確認
      expect(res.text).toMatch(/利用登録 - BConnectionデジタルトレード/i)
    })

    test('利用登録実施', async () => {
      const res = await request(app)
        .post('/tenant/register')
        .type('form')
        .send({ _csrf: tenantCsrf, termsCheck: 'on', salesPersonName: 'any' })
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(303)

      // リダイレクト先
      expect(res.header.location).toBe('/portal')
    })
    describe('ライトプラン申込画面の遷移・初期表示', () => {
      test('ライトプラン申込画面へ遷移', async () => {
        const res = await request(app)
          .get('/applyLightPlan')
          .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
          .expect(200)

        // 画面内容確認
        expect(res.text).toMatch(/ライトプラン申込 - BConnectionデジタルトレード/i)
      })

      test('ライトプラン申込画面の初期表示', async () => {
        const browser = await puppeteer.launch({
          headless: true,
          ignoreHTTPSErrors: true
        })

        const page = await browser.newPage()
        await page.setCookie(acCookies[0])
        await page.goto('https://localhost:3000/applyLightPlan')

        // 期待結果
        // URL
        expect(page.url()).toBe('https://localhost:3000/applyLightPlan')
        // 初期値
        expect(await page.$eval('#commonCustomerId', (el) => el.value)).toBe('')
        expect(await page.$eval('#contractorName', (el) => el.value)).toBe('')
        expect(await page.$eval('#contractorKanaName', (el) => el.value)).toBe('')
        expect(await page.$eval('#postalNumber', (el) => el.value)).toBe('')
        expect(await page.$eval('#contractAddressVal', (el) => el.value)).toBe('')
        expect(await page.$eval('#banch1', (el) => el.value)).toBe('')
        expect(await page.$eval('#tatemono1', (el) => el.value)).toBe('')
        expect(await page.$eval('#contactPersonName', (el) => el.value)).toBe('')
        expect(await page.$eval('#contactPhoneNumber', (el) => el.value)).toBe('')
        expect(await page.$eval('#contactMail', (el) => el.value)).toBe('')
        expect(await page.$eval('#campaignCode', (el) => el.value)).toBe('')
        expect(await page.$eval('#salesPersonName', (el) => el.value)).toBe('')
        expect(await page.$eval('#password', (el) => el.value)).toBe('')
        expect(await page.$eval('#passwordConfirm', (el) => el.value)).toBe('')
        expect(await page.$eval('#billMailingPostalNumber', (el) => el.value)).toBe('')
        expect(await page.$eval('#billMailingAddress', (el) => el.value)).toBe('')
        expect(await page.$eval('#billMailingAddressBanchi1', (el) => el.value)).toBe('')
        expect(await page.$eval('#billMailingAddressBuilding1', (el) => el.value)).toBe('')
        expect(await page.$eval('#billMailingKanaName', (el) => el.value)).toBe('')
        expect(await page.$eval('#billMailingName', (el) => el.value)).toBe('')
        expect(await page.$eval('#billMailingPersonName', (el) => el.value)).toBe('')
        expect(await page.$eval('#billMailingPhoneNumber', (el) => el.value)).toBe('')
        expect(await page.$eval('#billMailingMailAddress', (el) => el.value)).toBe('')
        expect(await page.$eval('#openingDate', (el) => el.value)).toBe('')
        expect(await page.$eval('#salesChannelCode', (el) => el.value)).toBe('')
        expect(await page.$eval('#salesChannelName', (el) => el.value)).toBe('')
        expect(await page.$eval('#salesChannelDeptName', (el) => el.value)).toBe('')
        expect(await page.$eval('#salesChannelEmplyeeCode', (el) => el.value)).toBe('')
        expect(await page.$eval('#salesChannelPersonName', (el) => el.value)).toBe('')
        expect(await page.$eval('#salesChannelDeptType', (el) => el.value)).toBe('')
        expect(await page.$eval('#salesChannelPhoneNumber', (el) => el.value)).toBe('')
        expect(await page.$eval('#salesChannelMailAddress', (el) => el.value)).toBe('')

        // readOnly
        expect(await page.$eval('#contractAddressVal', (el) => el.readOnly)).toBeTruthy()
        expect(await page.$eval('#billMailingAddress', (el) => el.readOnly)).toBeTruthy()

        // disabled
        expect(await page.$eval('#postalSearchBtn', (el) => el.disabled)).toBeTruthy()
        expect(await page.$eval('#postalClearBtn', (el) => el.disabled)).toBeTruthy()
        expect(await page.$eval('#billMailingSearchBtn', (el) => el.disabled)).toBeTruthy()
        expect(await page.$eval('#billMailingClearBtn', (el) => el.disabled)).toBeTruthy()
        expect(await page.$eval('#check', (el) => el.disabled)).toBeTruthy()
        expect(await page.$eval('#next-btn', (el) => el.disabled)).toBeTruthy()

        await browser.close()
      })
    })

    describe('契約者住所検索動作の確認', () => {
      let browser, page

      beforeEach(async () => {
        // DBクリア
        await db.Address.destroy({ where: {} })

        browser = await puppeteer.launch({
          headless: true,
          ignoreHTTPSErrors: true
        })

        page = await browser.newPage()
        await page.setCookie(acCookies[0])
        await page.goto('https://localhost:3000/applyLightPlan')
      })

      test('検索した郵便番号の結果がない', async () => {
        // 郵便番号の入力
        await page.type('#postalNumber', '1234567')

        // 期待結果
        expect(await page.$eval('#postalSearchBtn', (el) => el.disabled)).toBeFalsy()
        expect(await page.$eval('#postalClearBtn', (el) => el.disabled)).toBeTruthy()

        // 検索ボタンのクリック
        await page.click('#postalSearchBtn')
        await page.waitForTimeout(500)

        // 期待結果
        expect(await page.$eval('#searchPostalNumber-modal', (el) => el.classList?.value)).toMatch(/is-active/i)
        expect(await page.$eval('#modal-card-result', (el) => el.innerText)).toBe(
          '該当する住所が見つかりませんでした。\n住所検索が可能な郵便番号を入力してください。'
        )
        expect(await page.$eval('#postalSearchBtn', (el) => el.disabled)).toBeFalsy()
        expect(await page.$eval('#postalClearBtn', (el) => el.disabled)).toBeTruthy()
        expect(await page.$eval('#contractAddressVal', (el) => el.readOnly)).toBeTruthy()
        expect(await page.$eval('#contractAddressVal', (el) => el.value)).toBe('')
        expect(await page.$eval('#banch1', (el) => el.value)).toBe('')
        expect(await page.$eval('#tatemono1', (el) => el.value)).toBe('')

        // 住所の検索結果モーダルを閉じる
        await page.click('button.delete[data-target="searchPostalNumber-modal"]')

        // 期待結果
        expect(await page.$eval('#searchPostalNumber-modal', (el) => el.classList?.value)).not.toMatch(/is-active/i)
      })

      test('検索した郵便番号の結果が1件', async () => {
        // DBに1件住所情報を登録
        await db.Address.create({
          addressKey: '1',
          state: '東京都',
          city: '千代田区',
          address1: '大手町',
          address2: '一丁目',
          postalCode: '1234567'
        })

        // 郵便番号の入力
        await page.type('#postalNumber', '1234567')

        // 期待結果
        expect(await page.$eval('#postalSearchBtn', (el) => el.disabled)).toBeFalsy()
        expect(await page.$eval('#postalClearBtn', (el) => el.disabled)).toBeTruthy()

        // 検索ボタンのクリック
        await page.click('#postalSearchBtn')
        await page.waitForTimeout(500)

        // 期待結果
        expect(await page.$eval('#searchPostalNumber-modal', (el) => el.classList?.value)).not.toMatch(/is-active/i)
        expect(await page.$eval('#postalSearchBtn', (el) => el.disabled)).toBeTruthy()
        expect(await page.$eval('#postalClearBtn', (el) => el.disabled)).toBeFalsy()
        expect(await page.$eval('#contractAddressVal', (el) => el.readOnly)).toBeTruthy()
        expect(await page.$eval('#contractAddressVal', (el) => el.value)).toBe('東京都千代田区大手町一丁目')
        expect(await page.$eval('#banch1', (el) => el.value)).toBe('')
        expect(await page.$eval('#tatemono1', (el) => el.value)).toBe('')

        // 番地と建物等の入力
        await page.type('#banch1', '番地')
        await page.type('#tatemono1', '建物等')

        // クリアボタンのクリック
        await page.click('#postalClearBtn')

        // 期待結果
        expect(await page.$eval('#postalSearchBtn', (el) => el.disabled)).toBeTruthy()
        expect(await page.$eval('#postalClearBtn', (el) => el.disabled)).toBeTruthy()
        expect(await page.$eval('#postalNumber', (el) => el.value)).toBe('')
        expect(await page.$eval('#contractAddressVal', (el) => el.value)).toBe('')
        expect(await page.$eval('#banch1', (el) => el.value)).toBe('')
        expect(await page.$eval('#tatemono1', (el) => el.value)).toBe('')
      })

      test('検索した郵便番号の結果が2件以上', async () => {
        // DBに2件住所情報を登録
        await db.Address.bulkCreate([
          {
            addressKey: '1',
            state: '東京都',
            city: '千代田区',
            address1: '大手町',
            address2: '一丁目',
            postalCode: '1234567'
          },
          {
            addressKey: '2',
            state: '東京都',
            city: '千代田区',
            address1: '大手町',
            address2: '二丁目',
            postalCode: '1234567'
          }
        ])

        // 郵便番号の入力
        await page.type('#postalNumber', '1234567')

        // 期待結果
        expect(await page.$eval('#postalSearchBtn', (el) => el.disabled)).toBeFalsy()
        expect(await page.$eval('#postalClearBtn', (el) => el.disabled)).toBeTruthy()

        // 検索ボタンのクリック
        await page.click('#postalSearchBtn')
        await page.waitForTimeout(500)

        // 期待結果
        expect(await page.$eval('#searchPostalNumber-modal', (el) => el.classList?.value)).toMatch(/is-active/i)
        expect(await page.$eval('#modal-card-result', (el) => el.innerText)).toBe(
          '東京都千代田区大手町一丁目\n東京都千代田区大手町二丁目\n'
        )
        expect(await page.$eval('#postalSearchBtn', (el) => el.disabled)).toBeFalsy()
        expect(await page.$eval('#postalClearBtn', (el) => el.disabled)).toBeTruthy()
        expect(await page.$eval('#contractAddressVal', (el) => el.readOnly)).toBeTruthy()
        expect(await page.$eval('#contractAddressVal', (el) => el.value)).toBe('')
        expect(await page.$eval('#banch1', (el) => el.value)).toBe('')
        expect(await page.$eval('#tatemono1', (el) => el.value)).toBe('')

        // 住所の選択
        await page.click('#modal-card-result > a:nth-child(1)')

        // 期待結果
        expect(await page.$eval('#searchPostalNumber-modal', (el) => el.classList?.value)).not.toMatch(/is-active/i)
        expect(await page.$eval('#postalSearchBtn', (el) => el.disabled)).toBeTruthy()
        expect(await page.$eval('#postalClearBtn', (el) => el.disabled)).toBeFalsy()
        expect(await page.$eval('#contractAddressVal', (el) => el.readOnly)).toBeTruthy()
        expect(await page.$eval('#contractAddressVal', (el) => el.value)).toBe('東京都千代田区大手町一丁目')
        expect(await page.$eval('#banch1', (el) => el.value)).toBe('')
        expect(await page.$eval('#tatemono1', (el) => el.value)).toBe('')
        await page.waitForTimeout(500)

        // 番地と建物等の入力
        await page.type('#banch1', '番地')
        await page.type('#tatemono1', '建物等')

        // クリアボタンのクリック
        await page.click('#postalClearBtn')
        await page.waitForTimeout(500)

        // 期待結果
        expect(await page.$eval('#postalSearchBtn', (el) => el.disabled)).toBeTruthy()
        expect(await page.$eval('#postalClearBtn', (el) => el.disabled)).toBeTruthy()
        expect(await page.$eval('#postalNumber', (el) => el.value)).toBe('')
        expect(await page.$eval('#contractAddressVal', (el) => el.value)).toBe('')
        expect(await page.$eval('#banch1', (el) => el.value)).toBe('')
        expect(await page.$eval('#tatemono1', (el) => el.value)).toBe('')
      })

      afterEach(async () => {
        await browser.close()
        // DBクリア
        await db.Address.destroy({ where: {} })
      })
    })

    describe('請求情報住所検索動作の確認', () => {})
  })

  describe('後処理', () => {
    test('userデータ削除', async () => {
      await db.User.destroy({ where: { tenantId: testTenantId } })
      await db.Tenant.destroy({ where: { tenantId: testTenantId } })
    })
  })
})
