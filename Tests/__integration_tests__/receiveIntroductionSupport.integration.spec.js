'use strict'
const app = require('../../Application/app')
const request = require('supertest')
const puppeteer = require('puppeteer')
const constants = require('../../Application/constants')
const contractController = require('../../Application/controllers/contractController.js')
const getTenantId = {}
const { JSDOM } = require('jsdom')
const db = require('../../Application/models')

const requiredError = '　未入力です。'
const wrongPatternError = '　入力値が間違いました。'
const passwordConfirmError = '　入力されたパスワードが一致しません。'
const pastOpeningDateError = '　過去の日付を設定できません。'
const introductionSupportRegistering = '導入支援サービスは申し込み済です。'

jest.setTimeout(60000) // jestのタイムアウトを60秒とする

const getCookies = require('./getCookies')
// const { slice } = require('../../Application/obc/routes/helpers/middleware')
const postData = {
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
  openingDate: '2222-06-16',
  salesChannelCode: '000000',
  salesChannelName: '販売チャネル名',
  salesChannelDeptName: '部課名',
  salesChannelEmplyeeCode: '11111111',
  salesChannelPersonName: '担当者名',
  salesChannelDeptType: '{"code":"01","name":"Com第一営業本部"}',
  salesChannelPhoneNumber: '000-0000-0000',
  salesChannelMailAddress: 'aaa@aaa.com'
}

const receiveIntroductionSupportData = {
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
const requiredOnlyOrderData = {
  contractBasicInfo: {
    tradeshiftId: '2b95d31b-60c6-4c47-a813-17092d8c7434',
    orderId: '',
    orderType: '010',
    serviceType: '020',
    contractChangeName: '',
    contractChangeAddress: '',
    contractChangeContact: '',
    appDate: '',
    OpeningDate: '',
    contractNumber: '',
    salesChannelCode: '79100100',
    salesChannelName: 'ＰＳ本部＿ＡＰＳ部＿第二ＳＣ部門一Ｇ四Ｔ',
    salesChannelDeptName: '第二ＳＣ部門　第一グループ',
    salesChannelEmplyeeCode: '',
    salesChannelPersonName: 'デジトレアプリ担当',
    salesChannelDeptType: 'アプリケーションサービス部',
    salesChannelPhoneNumber: '050-3383-9608',
    salesChannelMailAddress: 'digitaltrade-ap-ops@ntt.com',
    kaianPassword: 'Aa11111111',
    campaignCode: '',
    salesPersonName: ''
  },
  contractAccountInfo: {
    contractAccountId: '',
    customerType: '',
    commonCustomerId: '11111111111',
    contractorName: '契約者名',
    contractorKanaName: 'カナ',
    postalNumber: '1000004',
    contractAddress: '東京都千代田区大手町一丁目',
    banch1: '１番',
    tatemono1: ''
  },
  contactList: [
    {
      contactType: '',
      contactPersonName: '連絡先担当者名',
      contactPhoneNumber: '000-0000-0000',
      contactMail: 'aaaaaa@aaa.com',
      billMailingPostalNumber: '1000004',
      billMailingAddress: '東京都千代田区大手町一丁目',
      billMailingAddressBanchi1: '請求書送付先番地等',
      billMailingAddressBuilding1: '',
      billMailingKanaName: '請求書送付先宛名',
      billMailingName: 'カナ',
      billMailingPersonName: '請求に関する連絡先',
      billMailingPhoneNumber: '000-0000-0000',
      billMailingMailAddress: 'aaa@aaa.com'
    }
  ],
  prdtList: [{ prdtCode: 'BF4022000000100', idnumber: '', appType: '010' }]
}

const addressDbReset = async () => {
  // 住所情報クリア
  await db.Address.destroy({ where: {} })
  // DBに1件住所情報を登録
  await db.Address.findOrCreate({
    where: { addressKey: '1' },
    defaults: {
      addressKey: '1',
      state: '東京都',
      city: '千代田区',
      address1: '大手町',
      address2: '一丁目',
      postalCode: '1000004'
    }
  })
}

/**
 * 利用規約のスクロール⇒同意チェックボックスのチェック⇒次へボタンのクリック
 * @param {*} page
 */
const showConfirm = async (page) => {
  await page.waitForTimeout(1000)
  // 利用規約のスクロール
  await page.$eval('#terms-of-service', (el) => {
    return el.contentWindow.scroll(0, 20000)
  })
  await page.waitForTimeout(1000)

  // 同意チェックボックスをチェックする
  await page.click('#check')
  await page.waitForTimeout(500)

  // 次へボタンのクリック
  await page.click('#next-btn')
  await page.waitForTimeout(500)
}

/**
 * ライトプラン申込画面の必須項目のみ入力動作
 * @param {*} page
 */
const fillRequiredOnly = async (page) => {
  // 最低限入力（必須のみ）
  await page.type('#commonCustomerId', postData.commonCustomerId)
  await page.type('#contractorName', postData.contractorName)
  await page.type('#contractorKanaName', postData.contractorKanaName)
  await page.type('#postalNumber', postData.postalNumber)
  // 検索ボタンのクリック
  await page.click('#postalSearchBtn')
  await page.waitForTimeout(500)
  await page.type('#banch1', postData.banch1)
  await page.type('#contactPersonName', postData.contactPersonName)
  await page.type('#contactPhoneNumber', postData.contactPhoneNumber)
  await page.type('#contactMail', postData.contactMail)
  await page.type('#password', postData.password)
  await page.type('#passwordConfirm', postData.passwordConfirm)
  await page.type('#billMailingPostalNumber', postData.billMailingPostalNumber)
  // 検索ボタンのクリック
  await page.click('#billMailingSearchBtn')
  await page.waitForTimeout(500)
  await page.type('#billMailingAddressBanchi1', postData.billMailingAddressBanchi1)
  await page.type('#billMailingKanaName', postData.billMailingKanaName)
  await page.type('#billMailingName', postData.billMailingName)
  await page.type('#billMailingPersonName', postData.billMailingPersonName)
  await page.type('#billMailingPhoneNumber', postData.billMailingPhoneNumber)
  await page.type('#billMailingMailAddress', postData.billMailingMailAddress)
}

/**
 * ライトプラン申込画面の全部項目の入力動作
 * @param {*} page
 */
const fillAll = async (page) => {
  // 全部入力
  await page.type('#commonCustomerId', postData.commonCustomerId)
  await page.type('#contractorName', postData.contractorName)
  await page.type('#contractorKanaName', postData.contractorKanaName)
  await page.type('#postalNumber', postData.postalNumber)
  // 検索ボタンのクリック
  await page.click('#postalSearchBtn')
  await page.waitForTimeout(500)
  await page.type('#banch1', postData.banch1)
  await page.type('#tatemono1', postData.tatemono1)
  await page.type('#contactPersonName', postData.contactPersonName)
  await page.type('#contactPhoneNumber', postData.contactPhoneNumber)
  await page.type('#contactMail', postData.contactMail)
  await page.type('#campaignCode', postData.campaignCode)
  await page.type('#salesPersonName', postData.salesPersonName)
  await page.type('#password', postData.password)
  await page.type('#passwordConfirm', postData.passwordConfirm)
  await page.type('#billMailingPostalNumber', postData.billMailingPostalNumber)
  // 検索ボタンのクリック
  await page.click('#billMailingSearchBtn')
  await page.waitForTimeout(500)
  await page.type('#billMailingAddressBanchi1', postData.billMailingAddressBanchi1)
  await page.type('#billMailingAddressBuilding1', postData.billMailingAddressBuilding1)
  await page.type('#billMailingKanaName', postData.billMailingKanaName)
  await page.type('#billMailingName', postData.billMailingName)
  await page.type('#billMailingPersonName', postData.billMailingPersonName)
  await page.type('#billMailingPhoneNumber', postData.billMailingPhoneNumber)
  await page.type('#billMailingMailAddress', postData.billMailingMailAddress)
  await page.type('#openingDate', '00' + postData.openingDate)
  await page.type('#salesChannelCode', postData.salesChannelCode)
  await page.type('#salesChannelName', postData.salesChannelName)
  await page.type('#salesChannelDeptName', postData.salesChannelDeptName)
  await page.type('#salesChannelEmplyeeCode', postData.salesChannelEmplyeeCode)
  await page.type('#salesChannelPersonName', postData.salesChannelPersonName)
  await page.select('#salesChannelDeptType', postData.salesChannelDeptType)
  await page.type('#salesChannelPhoneNumber', postData.salesChannelPhoneNumber)
  await page.type('#salesChannelMailAddress', postData.salesChannelMailAddress)
}

describe('導入支援インテグレーションテスト', () => {
  let acCookies
  let userCookies
  let testTenantId

  beforeAll(async () => {
    // /authにアクセス：oauth2認証をし、セッション用Cookieを取得
    const options = require('minimist')(process.argv.slice(2))
    // アカウント管理者と一般ユーザのID/SECRETは、テストコマンドの引数から取得
    const adminId = options.adminid
    const adminSecret = options.adminsecret
    const userId = options.userid
    const userSecret = options.usersecret
    // --------------------アカウント管理者のCookieを取得---------------
    acCookies = await getCookies(app, request, getTenantId, adminId, adminSecret)
    // ---------------------一般ユーザのCookieを取得--------------------
    userCookies = await getCookies(app, request, getTenantId, userId, userSecret)

    // テナントID設定
    testTenantId = getTenantId.id

    // Cookieを使ってローカル開発環境のDBからCookieと紐づくユーザを削除しておく
    // DBクリア
    // await db.User.destroy({ where: { tenantId: getTenantId.id } })
    // await db.Tenant.destroy({ where: { tenantId: getTenantId.id } })
    await db.User.destroy({ where: { tenantId: testTenantId } })
    await db.Tenant.destroy({ where: { tenantId: testTenantId } })

    // 住所情報リセット
    await addressDbReset()
  })
  // describe('0.前準備', () => {
  //   test('/authにアクセス：oauth2認証をし、セッション用Cookieを取得', async () => {
  //     // /authにアクセス：oauth2認証をし、セッション用Cookieを取得
  //     const options = require('minimist')(process.argv.slice(2))
  //     // アカウント管理者と一般ユーザのID/SECRETは、テストコマンドの引数から取得
  //     const adminId = options.adminid
  //     const adminSecret = options.adminsecret
  //     const userId = options.userid
  //     const userSecret = options.usersecret
  //     // --------------------アカウント管理者のCookieを取得---------------
  //     acCookies = await getCookies(app, request, getTenantId, adminId, adminSecret)
  //     // ---------------------一般ユーザのCookieを取得--------------------
  //     userCookies = await getCookies(app, request, getTenantId, userId, userSecret)

  //     // テナントID設定
  //     testTenantId = getTenantId.id

  //     // Cookieを使ってローカル開発環境のDBからCookieと紐づくユーザを削除しておく
  //     // DBクリア
  //     await db.User.destroy({ where: { tenantId: getTenantId.id } })
  //     await db.Tenant.destroy({ where: { tenantId: getTenantId.id } })

  //     // 住所情報リセット
  //     await addressDbReset()

  //     // // アカウント管理者を削除
  //     // await request(app)
  //     //   .get('/user/delete')
  //     //   .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
  //     // // 一般ユーザを削除
  //     // await request(app)
  //     //   .get('/user/delete')
  //     //   .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
  //   })
  // })

  // test('テナントID設定', async () => {
  //   testTenantId = getTenantId.id
  // })

  describe('1.無償契約ステータス：未登録', () => {
    describe('管理者', () => {
      test('ライトプラン申込画面が表示されない、テナント登録画面へリダイレクト', async () => {
        const res = await request(app)
          .get('/receiveIntroductionSupport')
          .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
          .expect(303)
        // リダイレクト先
        expect(res.headers.location).toMatch('/tenant/register')
      })

      test('導入支援申込の登録（POST）ができない、テナント登録画面へリダイレクト', async () => {
        const res = await request(app)
          .post('/receiveIntroductionSupport/register')
          .send({ ...receiveIntroductionSupportData })
          .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
          .expect(303)

        // リダイレクト先
        expect(res.headers.location).toMatch('/tenant/register')
      })
    })
    describe('一般ユーザ', () => {
      test('導入支援申込画面が表示されない、テナント登録画面へリダイレクト', async () => {
        const res = await request(app)
          .get('/receiveIntroductionSupport')
          .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
          .expect(303)

        // リダイレクト先
        expect(res.headers.location).toMatch('/tenant/register')
      })
      test('ライトプラン申込の登録(POST)ができない、テナント登録画面へリダイレクト', async () => {
        const res = await request(app)
          .post('/receiveIntroductionSupport/register')
          .send({ ...postData })
          .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
          .expect(303)
        // リダイレクト先
        expect(res.headers.location).toMatch('/tenant/register')
      })
    })
  })

  describe('2.契約ステータス：新規登録', () => {
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

    // describe('導入支援申込画面の遷移・初期表示', () => {
    //   test('導入支援申込画面へ遷移', async () => {
    //     const res = await request(app)
    //       .get('/receiveIntroductionSupport')
    //       .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
    //       .expect(200)
    //     // 画面内容確認
    //     // expect(page.url()).toBe('https://localhost:3000/receiveIntroductionSupport')
    //     expect(res.text).toContain('導入支援サービス申し込み - BConnectionデジタルトレード')
    //   })

    //   test('導入支援申込画面の初期表示', async () => {
    //     const browser = await puppeteer.launch({
    //       headless: true,
    //       ignoreHTTPSErrors: true
    //     })

    //     const page = await browser.newPage()
    //     await page.setCookie(acCookies[0])
    //     await page.goto('https://localhost:3000/receiveIntroductionSupport')

    //     // 期待結果
    //     // URL
    //     expect(page.url()).toBe('https://localhost:3000/receiveIntroductionSupport')
    //     // 初期値
    //     expect(await page.$eval('#commonCustomerId', (el) => el.value)).toBe('')
    //     expect(await page.$eval('#contractorName', (el) => el.value)).toBe('')
    //     expect(await page.$eval('#contractorKanaName', (el) => el.value)).toBe('')
    //     expect(await page.$eval('#postalNumber', (el) => el.value)).toBe('')
    //     expect(await page.$eval('#contractAddressVal', (el) => el.value)).toBe('')
    //     expect(await page.$eval('#banch1', (el) => el.value)).toBe('')
    //     expect(await page.$eval('#tatemono1', (el) => el.value)).toBe('')
    //     expect(await page.$eval('#contactPersonName', (el) => el.value)).toBe('')
    //     expect(await page.$eval('#contactPhoneNumber', (el) => el.value)).toBe('')
    //     expect(await page.$eval('#contactMail', (el) => el.value)).toBe('')
    //     expect(await page.$eval('#campaignCode', (el) => el.value)).toBe('')
    //     expect(await page.$eval('#salesPersonName', (el) => el.value)).toBe('')
    //     expect(await page.$eval('#password', (el) => el.value)).toBe('')
    //     expect(await page.$eval('#passwordConfirm', (el) => el.value)).toBe('')
    //     expect(await page.$eval('#billMailingPostalNumber', (el) => el.value)).toBe('')
    //     expect(await page.$eval('#billMailingAddress', (el) => el.value)).toBe('')
    //     expect(await page.$eval('#billMailingAddressBanchi1', (el) => el.value)).toBe('')
    //     expect(await page.$eval('#billMailingAddressBuilding1', (el) => el.value)).toBe('')
    //     expect(await page.$eval('#billMailingKanaName', (el) => el.value)).toBe('')
    //     expect(await page.$eval('#billMailingName', (el) => el.value)).toBe('')
    //     expect(await page.$eval('#billMailingPersonName', (el) => el.value)).toBe('')
    //     expect(await page.$eval('#billMailingPhoneNumber', (el) => el.value)).toBe('')
    //     expect(await page.$eval('#billMailingMailAddress', (el) => el.value)).toBe('')
    //     expect(await page.$eval('#openingDate', (el) => el.value)).toBe('')
    //     expect(await page.$eval('#salesChannelCode', (el) => el.value)).toBe('')
    //     expect(await page.$eval('#salesChannelName', (el) => el.value)).toBe('')
    //     expect(await page.$eval('#salesChannelDeptName', (el) => el.value)).toBe('')
    //     expect(await page.$eval('#salesChannelEmplyeeCode', (el) => el.value)).toBe('')
    //     expect(await page.$eval('#salesChannelPersonName', (el) => el.value)).toBe('')
    //     expect(await page.$eval('#salesChannelDeptType', (el) => el.value)).toBe('')
    //     expect(await page.$eval('#salesChannelPhoneNumber', (el) => el.value)).toBe('')
    //     expect(await page.$eval('#salesChannelMailAddress', (el) => el.value)).toBe('')
    //     // readOnly
    //     expect(await page.$eval('#contractAddressVal', (el) => el.readOnly)).toBeTruthy()
    //     expect(await page.$eval('#billMailingAddress', (el) => el.readOnly)).toBeTruthy()

    //     // disabled
    //     const isDisabled = await page.$eval('#postalSearchBtn', (el) => {
    //       return el.disabled
    //     })
    //     expect(isDisabled).toBeTruthy()
    //     expect(await page.$eval('#postalSearchBtn', (el) => el.disabled)).toBeTruthy()
    //     expect(await page.$eval('#postalClearBtn', (el) => el.disabled)).toBeTruthy()
    //     expect(await page.$eval('#billMailingSearchBtn', (el) => el.disabled)).toBeTruthy()
    //     expect(await page.$eval('#billMailingClearBtn', (el) => el.disabled)).toBeTruthy()
    //     expect(await page.$eval('#check', (el) => el.disabled)).toBeTruthy()
    //     expect(await page.$eval('#next-btn', (el) => el.disabled)).toBeTruthy()

    //     await browser.close()
    //   })
    // })

    // describe('契約者住所検索動作の確認', () => {
    //   let browser, page
    //   beforeEach(async () => {
    //     // DBクリア
    //     await db.Address.destroy({ where: {} })
    //     browser = await puppeteer.launch({
    //       headless: true,
    //       ignoreHTTPSErrors: true
    //     })
    //     page = await browser.newPage()
    //     await page.setCookie(acCookies[0])
    //     await page.goto('https://localhost:3000/receiveIntroductionSupport')
    //   })
    //   test('検索した郵便番号の結果がない', async () => {
    //     // 郵便番号の入力
    //     await page.type('#postalNumber', '1234567')
    //     // 期待結果
    //     expect(await page.$eval('#postalSearchBtn', (el) => el.disabled)).toBeFalsy()
    //     expect(await page.$eval('#postalClearBtn', (el) => el.disabled)).toBeTruthy()
    //     // 検索ボタンのクリック
    //     await page.click('#postalSearchBtn')
    //     await page.waitForTimeout(500)
    //     // 期待結果
    //     expect(await page.$eval('#searchPostalNumber-modal', (el) => el.classList?.value)).toMatch(/is-active/i)
    //     expect(await page.$eval('#modal-card-result', (el) => el.innerText)).toBe(
    //       '該当する住所が見つかりませんでした。\n住所検索が可能な郵便番号を入力してください。'
    //     )
    //     expect(await page.$eval('#postalSearchBtn', (el) => el.disabled)).toBeFalsy()
    //     expect(await page.$eval('#postalClearBtn', (el) => el.disabled)).toBeTruthy()
    //     expect(await page.$eval('#contractAddressVal', (el) => el.readOnly)).toBeTruthy()
    //     expect(await page.$eval('#contractAddressVal', (el) => el.value)).toBe('')
    //     expect(await page.$eval('#banch1', (el) => el.value)).toBe('')
    //     expect(await page.$eval('#tatemono1', (el) => el.value)).toBe('')
    //     // 住所の検索結果モーダルを閉じる
    //     await page.click('button.delete[data-target="searchPostalNumber-modal"]')
    //     // 期待結果
    //     expect(await page.$eval('#searchPostalNumber-modal', (el) => el.classList?.value)).not.toMatch(/is-active/i)
    //   })

    //   test('検索した郵便番号の結果が1件', async () => {
    //     // DBに1件住所情報を登録
    //     await db.Address.create({
    //       addressKey: '1',
    //       state: '東京都',
    //       city: '千代田区',
    //       address1: '大手町',
    //       address2: '一丁目',
    //       postalCode: '1234567'
    //     })
    //     // 郵便番号の入力
    //     await page.type('#postalNumber', '1234567')
    //     // 期待結果
    //     expect(await page.$eval('#postalSearchBtn', (el) => el.disabled)).toBeFalsy()
    //     expect(await page.$eval('#postalClearBtn', (el) => el.disabled)).toBeTruthy()
    //     // 検索ボタンのクリック
    //     await page.click('#postalSearchBtn')
    //     await page.waitForTimeout(500)
    //     // 期待結果
    //     expect(await page.$eval('#searchPostalNumber-modal', (el) => el.classList?.value)).not.toMatch(/is-active/i)
    //     expect(await page.$eval('#postalSearchBtn', (el) => el.disabled)).toBeTruthy()
    //     expect(await page.$eval('#postalClearBtn', (el) => el.disabled)).toBeFalsy()
    //     expect(await page.$eval('#contractAddressVal', (el) => el.readOnly)).toBeTruthy()
    //     expect(await page.$eval('#contractAddressVal', (el) => el.value)).toBe('東京都千代田区大手町一丁目')
    //     expect(await page.$eval('#banch1', (el) => el.value)).toBe('')
    //     expect(await page.$eval('#tatemono1', (el) => el.value)).toBe('')
    //     // 番地と建物等の入力
    //     await page.type('#banch1', '番地')
    //     await page.type('#tatemono1', '建物等')

    //     // クリアボタンのクリック
    //     await page.click('#postalClearBtn')

    //     // 期待結果
    //     expect(await page.$eval('#postalSearchBtn', (el) => el.disabled)).toBeTruthy()
    //     expect(await page.$eval('#postalClearBtn', (el) => el.disabled)).toBeTruthy()
    //     expect(await page.$eval('#postalNumber', (el) => el.value)).toBe('')
    //     expect(await page.$eval('#contractAddressVal', (el) => el.value)).toBe('')
    //     expect(await page.$eval('#banch1', (el) => el.value)).toBe('')
    //     expect(await page.$eval('#tatemono1', (el) => el.value)).toBe('')
    //   })
    //   test('検索した郵便番号の結果が2件以上', async () => {
    //     // DBに2件住所情報を登録
    //     await db.Address.bulkCreate([
    //       {
    //         addressKey: '1',
    //         state: '東京都',
    //         city: '千代田区',
    //         address1: '大手町',
    //         address2: '一丁目',
    //         postalCode: '1234567'
    //       },
    //       {
    //         addressKey: '2',
    //         state: '東京都',
    //         city: '千代田区',
    //         address1: '大手町',
    //         address2: '二丁目',
    //         postalCode: '1234567'
    //       }
    //     ])
    //     // 郵便番号の入力
    //     await page.type('#postalNumber', '1234567')
    //     // 期待結果
    //     expect(await page.$eval('#postalSearchBtn', (el) => el.disabled)).toBeFalsy()
    //     expect(await page.$eval('#postalClearBtn', (el) => el.disabled)).toBeTruthy()
    //     // 検索ボタンのクリック
    //     await page.click('#postalSearchBtn')
    //     await page.waitForTimeout(500)
    //     // 期待結果
    //     expect(await page.$eval('#searchPostalNumber-modal', (el) => el.classList?.value)).toMatch(/is-active/i)
    //     expect(await page.$eval('#modal-card-result', (el) => el.innerText)).toBe(
    //       '東京都千代田区大手町一丁目\n東京都千代田区大手町二丁目\n'
    //     )
    //     expect(await page.$eval('#postalSearchBtn', (el) => el.disabled)).toBeFalsy()
    //     expect(await page.$eval('#postalClearBtn', (el) => el.disabled)).toBeTruthy()
    //     expect(await page.$eval('#contractAddressVal', (el) => el.readOnly)).toBeTruthy()
    //     expect(await page.$eval('#contractAddressVal', (el) => el.value)).toBe('')
    //     expect(await page.$eval('#banch1', (el) => el.value)).toBe('')
    //     expect(await page.$eval('#tatemono1', (el) => el.value)).toBe('')
    //     // 住所の選択
    //     await page.click('#modal-card-result > a:nth-child(1)')
    //     // 期待結果
    //     expect(await page.$eval('#searchPostalNumber-modal', (el) => el.classList?.value)).not.toMatch(/is-active/i)
    //     expect(await page.$eval('#postalSearchBtn', (el) => el.disabled)).toBeTruthy()
    //     expect(await page.$eval('#postalClearBtn', (el) => el.disabled)).toBeFalsy()
    //     expect(await page.$eval('#contractAddressVal', (el) => el.readOnly)).toBeTruthy()
    //     expect(await page.$eval('#contractAddressVal', (el) => el.value)).toBe('東京都千代田区大手町一丁目')
    //     expect(await page.$eval('#banch1', (el) => el.value)).toBe('')
    //     expect(await page.$eval('#tatemono1', (el) => el.value)).toBe('')
    //     await page.waitForTimeout(500)
    //     // 番地と建物等の入力
    //     await page.type('#banch1', '番地')
    //     await page.type('#tatemono1', '建物等')
    //     // クリアボタンのクリック
    //     await page.click('#postalClearBtn')
    //     await page.waitForTimeout(500)
    //     // 期待結果
    //     expect(await page.$eval('#postalSearchBtn', (el) => el.disabled)).toBeTruthy()
    //     expect(await page.$eval('#postalClearBtn', (el) => el.disabled)).toBeTruthy()
    //     expect(await page.$eval('#postalNumber', (el) => el.value)).toBe('')
    //     expect(await page.$eval('#contractAddressVal', (el) => el.value)).toBe('')
    //     expect(await page.$eval('#banch1', (el) => el.value)).toBe('')
    //     expect(await page.$eval('#tatemono1', (el) => el.value)).toBe('')
    //   })
    //   afterEach(async () => {
    //     await browser.close()
    //     // DBクリア
    //     await db.Address.destroy({ where: {} })
    //   })
    // })
    // describe('請求情報住所検索動作の確認', () => {
    //   let browser, page
    //   beforeEach(async () => {
    //     // DBクリア
    //     await db.Address.destroy({ where: {} })
    //     browser = await puppeteer.launch({
    //       headless: true,
    //       ignoreHTTPSErrors: true
    //     })
    //     page = await browser.newPage()
    //     await page.setCookie(acCookies[0])
    //     await page.goto('https://localhost:3000/receiveIntroductionSupport')
    //   })
    //   test('検索した郵便番号の結果がない', async () => {
    //     // 郵便番号の入力
    //     await page.type('#billMailingPostalNumber', '1234567')
    //     // 期待結果
    //     expect(await page.$eval('#billMailingSearchBtn', (el) => el.disabled)).toBeFalsy()
    //     expect(await page.$eval('#billMailingClearBtn', (el) => el.disabled)).toBeTruthy()
    //     // 検索ボタンのクリック
    //     await page.click('#billMailingSearchBtn')
    //     await page.waitForTimeout(500)
    //     // 期待結果
    //     expect(await page.$eval('#searchPostalNumber-modal', (el) => el.classList?.value)).toMatch(/is-active/i)
    //     expect(await page.$eval('#modal-card-result', (el) => el.innerText)).toBe(
    //       '該当する住所が見つかりませんでした。\n住所検索が可能な郵便番号を入力してください。'
    //     )
    //     expect(await page.$eval('#billMailingSearchBtn', (el) => el.disabled)).toBeFalsy()
    //     expect(await page.$eval('#billMailingClearBtn', (el) => el.disabled)).toBeTruthy()
    //     expect(await page.$eval('#billMailingAddress', (el) => el.readOnly)).toBeTruthy()
    //     expect(await page.$eval('#billMailingAddress', (el) => el.value)).toBe('')
    //     expect(await page.$eval('#billMailingAddressBanchi1', (el) => el.value)).toBe('')
    //     expect(await page.$eval('#billMailingAddressBuilding1', (el) => el.value)).toBe('')
    //     // 住所の検索結果モーダルを閉じる
    //     await page.click('button.delete[data-target="searchPostalNumber-modal"]')
    //     // 期待結果
    //     expect(await page.$eval('#searchPostalNumber-modal', (el) => el.classList?.value)).not.toMatch(/is-active/i)
    //   })
    //   test('検索した郵便番号の結果が1件', async () => {
    //     // DBに1件住所情報を登録
    //     await db.Address.create({
    //       addressKey: '1',
    //       state: '東京都',
    //       city: '千代田区',
    //       address1: '大手町',
    //       address2: '一丁目',
    //       postalCode: '1234567'
    //     })
    //     // 郵便番号の入力
    //     await page.type('#billMailingPostalNumber', '1234567')
    //     // 期待結果
    //     expect(await page.$eval('#billMailingSearchBtn', (el) => el.disabled)).toBeFalsy()
    //     expect(await page.$eval('#billMailingClearBtn', (el) => el.disabled)).toBeTruthy()
    //     // 検索ボタンのクリック
    //     await page.click('#billMailingSearchBtn')
    //     await page.waitForTimeout(500)
    //     // 期待結果
    //     expect(await page.$eval('#searchPostalNumber-modal', (el) => el.classList?.value)).not.toMatch(/is-active/i)
    //     expect(await page.$eval('#billMailingSearchBtn', (el) => el.disabled)).toBeTruthy()
    //     expect(await page.$eval('#billMailingClearBtn', (el) => el.disabled)).toBeFalsy()
    //     expect(await page.$eval('#billMailingAddress', (el) => el.readOnly)).toBeTruthy()
    //     expect(await page.$eval('#billMailingAddress', (el) => el.value)).toBe('東京都千代田区大手町一丁目')
    //     expect(await page.$eval('#billMailingAddressBanchi1', (el) => el.value)).toBe('')
    //     expect(await page.$eval('#billMailingAddressBuilding1', (el) => el.value)).toBe('')
    //     // 番地と建物等の入力
    //     await page.type('#billMailingAddressBanchi1', '番地')
    //     await page.type('#billMailingAddressBuilding1', '建物等')
    //     // クリアボタンのクリック
    //     await page.click('#billMailingClearBtn')
    //     // 期待結果
    //     expect(await page.$eval('#billMailingSearchBtn', (el) => el.disabled)).toBeTruthy()
    //     expect(await page.$eval('#billMailingClearBtn', (el) => el.disabled)).toBeTruthy()
    //     expect(await page.$eval('#billMailingPostalNumber', (el) => el.value)).toBe('')
    //     expect(await page.$eval('#billMailingAddress', (el) => el.value)).toBe('')
    //     expect(await page.$eval('#billMailingAddressBanchi1', (el) => el.value)).toBe('')
    //     expect(await page.$eval('#billMailingAddressBuilding1', (el) => el.value)).toBe('')
    //   })
    //   test('検索した郵便番号の結果が2件以上', async () => {
    //     // DBに2件住所情報を登録
    //     await db.Address.bulkCreate([
    //       {
    //         addressKey: '1',
    //         state: '東京都',
    //         city: '千代田区',
    //         address1: '大手町',
    //         address2: '一丁目',
    //         postalCode: '1234567'
    //       },
    //       {
    //         addressKey: '2',
    //         state: '東京都',
    //         city: '千代田区',
    //         address1: '大手町',
    //         address2: '二丁目',
    //         postalCode: '1234567'
    //       }
    //     ])
    //     // 郵便番号の入力
    //     await page.type('#billMailingPostalNumber', '1234567')
    //     // 期待結果
    //     expect(await page.$eval('#billMailingSearchBtn', (el) => el.disabled)).toBeFalsy()
    //     expect(await page.$eval('#billMailingClearBtn', (el) => el.disabled)).toBeTruthy()
    //     // 検索ボタンのクリック
    //     await page.click('#billMailingSearchBtn')
    //     await page.waitForTimeout(500)
    //     // 期待結果
    //     expect(await page.$eval('#searchPostalNumber-modal', (el) => el.classList?.value)).toMatch(/is-active/i)
    //     expect(await page.$eval('#modal-card-result', (el) => el.innerText)).toBe(
    //       '東京都千代田区大手町一丁目\n東京都千代田区大手町二丁目\n'
    //     )
    //     expect(await page.$eval('#billMailingSearchBtn', (el) => el.disabled)).toBeFalsy()
    //     expect(await page.$eval('#billMailingClearBtn', (el) => el.disabled)).toBeTruthy()
    //     expect(await page.$eval('#billMailingAddress', (el) => el.readOnly)).toBeTruthy()
    //     expect(await page.$eval('#billMailingAddress', (el) => el.value)).toBe('')
    //     expect(await page.$eval('#billMailingAddressBanchi1', (el) => el.value)).toBe('')
    //     expect(await page.$eval('#billMailingAddressBuilding1', (el) => el.value)).toBe('')
    //     // 住所の選択
    //     await page.click('#modal-card-result > a:nth-child(1)')
    //     // 期待結果
    //     expect(await page.$eval('#searchPostalNumber-modal', (el) => el.classList?.value)).not.toMatch(/is-active/i)
    //     expect(await page.$eval('#billMailingSearchBtn', (el) => el.disabled)).toBeTruthy()
    //     expect(await page.$eval('#billMailingClearBtn', (el) => el.disabled)).toBeFalsy()
    //     expect(await page.$eval('#billMailingAddress', (el) => el.readOnly)).toBeTruthy()
    //     expect(await page.$eval('#billMailingAddress', (el) => el.value)).toBe('東京都千代田区大手町一丁目')
    //     expect(await page.$eval('#billMailingAddressBanchi1', (el) => el.value)).toBe('')
    //     expect(await page.$eval('#billMailingAddressBuilding1', (el) => el.value)).toBe('')
    //     await page.waitForTimeout(500)
    //     // 番地と建物等の入力
    //     await page.type('#billMailingAddressBanchi1', '番地')
    //     await page.type('#billMailingAddressBuilding1', '建物等')
    //     // クリアボタンのクリック
    //     await page.click('#billMailingClearBtn')
    //     await page.waitForTimeout(500)
    //     // 期待結果
    //     expect(await page.$eval('#billMailingSearchBtn', (el) => el.disabled)).toBeTruthy()
    //     expect(await page.$eval('#billMailingClearBtn', (el) => el.disabled)).toBeTruthy()
    //     expect(await page.$eval('#billMailingPostalNumber', (el) => el.value)).toBe('')
    //     expect(await page.$eval('#billMailingAddress', (el) => el.value)).toBe('')
    //     expect(await page.$eval('#billMailingAddressBanchi1', (el) => el.value)).toBe('')
    //     expect(await page.$eval('#billMailingAddressBuilding1', (el) => el.value)).toBe('')
    //   })
    // afterEach(async () => {
    //   await browser.close()
    //   // DBクリア
    //   await db.Address.destroy({ where: {} })
    // })
  })

  describe('3.無償契約ステータス：登録申込', () => {
    describe('管理者', () => {
      test('導入支援申込画面へ遷移', async () => {
        const res = await request(app)
          .get('/receiveIntroductionSupport')
          .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
          .expect(200)
        // 画面内容確認
        expect(res.text).toMatch(/導入支援サービス申し込み - BConnectionデジタルトレード/i)
      })
    })
    describe('一般ユーザ', () => {
      test('導入支援申込画面へ遷移', async () => {
        const res = await request(app)
          .get('/receiveIntroductionSupport')
          .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
          .expect(200)
        // 画面内容確認
        expect(res.text).toMatch(/導入支援サービス申し込み - BConnectionデジタルトレード/i)
      })
    })
  })

  describe('4.無償契約ステータス：登録受付', () => {
    beforeAll(async () => {
      await db.Contract.update(
        {
          contractStatus: constants.statusConstants.contractStatuses.newContractReceive
        },
        {
          where: {
            tenantId: testTenantId,
            serviceType: constants.statusConstants.serviceTypes.bcd
          }
        }
      )
    })
    describe('管理者', () => {
      test('導入支援申込画面へ遷移', async () => {
        const res = await request(app)
          .get('/receiveIntroductionSupport')
          .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
          .expect(200)
        // 画面内容確認
        expect(res.text).toMatch(/導入支援サービス申し込み - BConnectionデジタルトレード/i)
      })
    })
    describe('一般ユーザ', () => {
      test('導入支援申込画面へ遷移', async () => {
        const res = await request(app)
          .get('/receiveIntroductionSupport')
          .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
          .expect(200)
        // 画面内容確認
        expect(res.text).toMatch(/導入支援サービス申し込み - BConnectionデジタルトレード/i)
      })
    })
  })

  describe('5.無償契約ステータス：契約中', () => {
    beforeAll(async () => {
      await db.Order.destroy({ where: { tenantId: testTenantId } })
      await db.Contract.update(
        {
          numberN: '1234567890',
          contractStatus: constants.statusConstants.contractStatuses.onContract
        },
        {
          where: {
            tenantId: testTenantId,
            serviceType: constants.statusConstants.serviceTypes.bcd
          }
        }
      )
    })
    describe('導入支援：未申込', () => {
      let browser, page
      beforeEach(async () => {
        // ライトプラン申込画面の初期
        browser = await puppeteer.launch({
          headless: true,
          ignoreHTTPSErrors: true
        })
        page = await browser.newPage()
        await page.setCookie(acCookies[0])
        await page.goto('https://localhost:3000/receiveIntroductionSupport')
      })
      afterEach(async () => {
        await browser.close()
      })
      describe('ライトプラン申込画面の遷移・初期表示', () => {
        test('ライトプラン申込画面へ遷移', async () => {
          const res = await request(app)
            .get('/receiveIntroductionSupport')
            .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
            .expect(200)
          // 画面内容確認
          expect(res.text).toMatch(/導入支援サービス申し込み - BConnectionデジタルトレード/i)
        })
        test('導入支援申込画面の初期表示', async () => {
          const browser = await puppeteer.launch({
            headless: true,
            ignoreHTTPSErrors: true
          })
          const page = await browser.newPage()
          await page.setCookie(acCookies[0])
          await page.goto('https://localhost:3000/receiveIntroductionSupport')
          // 期待結果
          // URL
          expect(page.url()).toBe('https://localhost:3000/receiveIntroductionSupport')
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
      describe('住所検索動作の確認', () => {
        beforeEach(async () => {
          // DBクリア
          await db.Address.destroy({ where: {} })
        })
        afterAll(async () => {
          // 住所情報リセット
          await addressDbReset()
        })
        describe('契約者住所検索', () => {
          test('検索した郵便番号の結果がない', async () => {
            // 郵便番号の入力
            await page.type('#postalNumber', '1000004')

            // 期待結果
            expect(await page.$eval('#postalSearchBtn', (el) => el.disabled)).toBeFalsy()
            expect(await page.$eval('#postalClearBtn', (el) => el.disabled)).toBeTruthy()

            // 番地と建物等の入力
            await page.type('#banch1', '番地')
            await page.type('#tatemono1', '建物等')

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
            expect(await page.$eval('#postalNumber', (el) => el.readOnly)).toBeFalsy()
            expect(await page.$eval('#contractAddressVal', (el) => el.readOnly)).toBeTruthy()
            expect(await page.$eval('#contractAddressVal', (el) => el.value)).toBe('')
            //  番地と建物等がクリアされない
            expect(await page.$eval('#banch1', (el) => el.value)).toBe('番地')
            expect(await page.$eval('#tatemono1', (el) => el.value)).toBe('建物等')

            // 住所の検索結果モーダルを閉じる
            await page.click('button.delete[data-target="searchPostalNumber-modal"]')

            // 期待結果
            expect(await page.$eval('#searchPostalNumber-modal', (el) => el.classList?.value)).not.toMatch(/is-active/i)
          })
          test('検索した郵便番号の結果が1件', async () => {
            // DBに1件住所情報を登録
            await db.Address.findOrCreate({
              where: { addressKey: '1' },
              defaults: {
                addressKey: '1',
                state: '東京都',
                city: '千代田区',
                address1: '大手町',
                address2: '一丁目',
                postalCode: '1000004'
              }
            })

            // 郵便番号の入力
            await page.type('#postalNumber', '1000004')

            // 期待結果
            expect(await page.$eval('#postalSearchBtn', (el) => el.disabled)).toBeFalsy()
            expect(await page.$eval('#postalClearBtn', (el) => el.disabled)).toBeTruthy()

            // 番地と建物等の入力
            await page.type('#banch1', '番地')
            await page.type('#tatemono1', '建物等')

            // 検索ボタンのクリック
            await page.click('#postalSearchBtn')
            await page.waitForTimeout(500)

            // 期待結果
            expect(await page.$eval('#searchPostalNumber-modal', (el) => el.classList?.value)).not.toMatch(/is-active/i)
            expect(await page.$eval('#postalSearchBtn', (el) => el.disabled)).toBeTruthy()
            expect(await page.$eval('#postalClearBtn', (el) => el.disabled)).toBeFalsy()
            expect(await page.$eval('#postalNumber', (el) => el.readOnly)).toBeTruthy()
            expect(await page.$eval('#contractAddressVal', (el) => el.readOnly)).toBeTruthy()
            expect(await page.$eval('#contractAddressVal', (el) => el.value)).toBe('東京都千代田区大手町一丁目')
            //  番地と建物等がクリアされる
            expect(await page.$eval('#banch1', (el) => el.value)).toBe('')
            expect(await page.$eval('#tatemono1', (el) => el.value)).toBe('')

            // 番地と建物等の入力
            await page.type('#banch1', '番地')
            await page.type('#tatemono1', '建物等')

            // クリアボタンのクリック
            await page.click('#postalClearBtn')

            // 期待結果
            expect(await page.$eval('#postalNumber', (el) => el.readOnly)).toBeFalsy()
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
                postalCode: '1000004'
              },
              {
                addressKey: '2',
                state: '東京都',
                city: '千代田区',
                address1: '大手町',
                address2: '二丁目',
                postalCode: '1000004'
              }
            ])

            // 郵便番号の入力
            await page.type('#postalNumber', '1000004')

            // 期待結果
            expect(await page.$eval('#postalSearchBtn', (el) => el.disabled)).toBeFalsy()
            expect(await page.$eval('#postalClearBtn', (el) => el.disabled)).toBeTruthy()

            // 番地と建物等の入力
            await page.type('#banch1', '番地')
            await page.type('#tatemono1', '建物等')

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
            expect(await page.$eval('#postalNumber', (el) => el.readOnly)).toBeFalsy()
            expect(await page.$eval('#contractAddressVal', (el) => el.readOnly)).toBeTruthy()
            expect(await page.$eval('#contractAddressVal', (el) => el.value)).toBe('')
            //  番地と建物等がクリアされない
            expect(await page.$eval('#banch1', (el) => el.value)).toBe('番地')
            expect(await page.$eval('#tatemono1', (el) => el.value)).toBe('建物等')

            // 住所の選択
            await page.click('#modal-card-result > a:nth-child(1)')

            // 期待結果
            expect(await page.$eval('#searchPostalNumber-modal', (el) => el.classList?.value)).not.toMatch(/is-active/i)
            expect(await page.$eval('#postalSearchBtn', (el) => el.disabled)).toBeTruthy()
            expect(await page.$eval('#postalClearBtn', (el) => el.disabled)).toBeFalsy()
            expect(await page.$eval('#postalNumber', (el) => el.readOnly)).toBeTruthy()
            expect(await page.$eval('#contractAddressVal', (el) => el.readOnly)).toBeTruthy()
            expect(await page.$eval('#contractAddressVal', (el) => el.value)).toBe('東京都千代田区大手町一丁目')
            //  番地と建物等がクリアされる
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
            expect(await page.$eval('#postalNumber', (el) => el.readOnly)).toBeFalsy()
            expect(await page.$eval('#contractAddressVal', (el) => el.value)).toBe('')
            expect(await page.$eval('#banch1', (el) => el.value)).toBe('')
            expect(await page.$eval('#tatemono1', (el) => el.value)).toBe('')
          })
        })
        describe('請求情報住所検索', () => {
          test('検索した郵便番号の結果がない', async () => {
            // 郵便番号の入力
            await page.type('#billMailingPostalNumber', '1000004')

            // 期待結果
            expect(await page.$eval('#billMailingSearchBtn', (el) => el.disabled)).toBeFalsy()
            expect(await page.$eval('#billMailingClearBtn', (el) => el.disabled)).toBeTruthy()

            // 番地と建物等の入力
            await page.type('#billMailingAddressBanchi1', '番地')
            await page.type('#billMailingAddressBuilding1', '建物等')

            // 検索ボタンのクリック
            await page.click('#billMailingSearchBtn')
            await page.waitForTimeout(500)

            // 期待結果
            expect(await page.$eval('#searchPostalNumber-modal', (el) => el.classList?.value)).toMatch(/is-active/i)
            expect(await page.$eval('#modal-card-result', (el) => el.innerText)).toBe(
              '該当する住所が見つかりませんでした。\n住所検索が可能な郵便番号を入力してください。'
            )
            expect(await page.$eval('#billMailingSearchBtn', (el) => el.disabled)).toBeFalsy()
            expect(await page.$eval('#billMailingClearBtn', (el) => el.disabled)).toBeTruthy()
            expect(await page.$eval('#billMailingPostalNumber', (el) => el.readOnly)).toBeFalsy()
            expect(await page.$eval('#billMailingAddress', (el) => el.readOnly)).toBeTruthy()
            expect(await page.$eval('#billMailingAddress', (el) => el.value)).toBe('')
            //  番地と建物等がクリアされない
            expect(await page.$eval('#billMailingAddressBanchi1', (el) => el.value)).toBe('番地')
            expect(await page.$eval('#billMailingAddressBuilding1', (el) => el.value)).toBe('建物等')

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
              postalCode: '1000004'
            })

            // 郵便番号の入力
            await page.type('#billMailingPostalNumber', '1000004')

            // 期待結果
            expect(await page.$eval('#billMailingSearchBtn', (el) => el.disabled)).toBeFalsy()
            expect(await page.$eval('#billMailingClearBtn', (el) => el.disabled)).toBeTruthy()

            // 番地と建物等の入力
            await page.type('#billMailingAddressBanchi1', '番地')
            await page.type('#billMailingAddressBuilding1', '建物等')

            // 検索ボタンのクリック
            await page.click('#billMailingSearchBtn')
            await page.waitForTimeout(500)

            // 期待結果
            expect(await page.$eval('#searchPostalNumber-modal', (el) => el.classList?.value)).not.toMatch(/is-active/i)
            expect(await page.$eval('#billMailingSearchBtn', (el) => el.disabled)).toBeTruthy()
            expect(await page.$eval('#billMailingClearBtn', (el) => el.disabled)).toBeFalsy()
            expect(await page.$eval('#billMailingPostalNumber', (el) => el.readOnly)).toBeTruthy()
            expect(await page.$eval('#billMailingAddress', (el) => el.readOnly)).toBeTruthy()
            expect(await page.$eval('#billMailingAddress', (el) => el.value)).toBe('東京都千代田区大手町一丁目')
            // 番地と建物等がクリアされる
            expect(await page.$eval('#billMailingAddressBanchi1', (el) => el.value)).toBe('')
            expect(await page.$eval('#billMailingAddressBuilding1', (el) => el.value)).toBe('')

            // 番地と建物等の入力
            await page.type('#billMailingAddressBanchi1', '番地')
            await page.type('#billMailingAddressBuilding1', '建物等')

            // クリアボタンのクリック
            await page.click('#billMailingClearBtn')

            // 期待結果
            expect(await page.$eval('#billMailingSearchBtn', (el) => el.disabled)).toBeTruthy()
            expect(await page.$eval('#billMailingClearBtn', (el) => el.disabled)).toBeTruthy()
            expect(await page.$eval('#billMailingPostalNumber', (el) => el.readOnly)).toBeFalsy()
            expect(await page.$eval('#billMailingPostalNumber', (el) => el.value)).toBe('')
            expect(await page.$eval('#billMailingAddress', (el) => el.value)).toBe('')
            expect(await page.$eval('#billMailingAddressBanchi1', (el) => el.value)).toBe('')
            expect(await page.$eval('#billMailingAddressBuilding1', (el) => el.value)).toBe('')
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
                postalCode: '1000004'
              },
              {
                addressKey: '2',
                state: '東京都',
                city: '千代田区',
                address1: '大手町',
                address2: '二丁目',
                postalCode: '1000004'
              }
            ])

            // 郵便番号の入力
            await page.type('#billMailingPostalNumber', '1000004')

            // 期待結果
            expect(await page.$eval('#billMailingSearchBtn', (el) => el.disabled)).toBeFalsy()
            expect(await page.$eval('#billMailingClearBtn', (el) => el.disabled)).toBeTruthy()

            // 番地と建物等の入力
            await page.type('#billMailingAddressBanchi1', '番地')
            await page.type('#billMailingAddressBuilding1', '建物等')

            // 検索ボタンのクリック
            await page.click('#billMailingSearchBtn')
            await page.waitForTimeout(500)

            // 期待結果
            expect(await page.$eval('#searchPostalNumber-modal', (el) => el.classList?.value)).toMatch(/is-active/i)
            expect(await page.$eval('#modal-card-result', (el) => el.innerText)).toBe(
              '東京都千代田区大手町一丁目\n東京都千代田区大手町二丁目\n'
            )
            expect(await page.$eval('#billMailingSearchBtn', (el) => el.disabled)).toBeFalsy()
            expect(await page.$eval('#billMailingClearBtn', (el) => el.disabled)).toBeTruthy()
            expect(await page.$eval('#billMailingPostalNumber', (el) => el.readOnly)).toBeFalsy()
            expect(await page.$eval('#billMailingAddress', (el) => el.readOnly)).toBeTruthy()
            expect(await page.$eval('#billMailingAddress', (el) => el.value)).toBe('')
            // 番地と建物等がクリアされない
            expect(await page.$eval('#billMailingAddressBanchi1', (el) => el.value)).toBe('番地')
            expect(await page.$eval('#billMailingAddressBuilding1', (el) => el.value)).toBe('建物等')

            // 住所の選択
            await page.click('#modal-card-result > a:nth-child(1)')

            // 期待結果
            expect(await page.$eval('#searchPostalNumber-modal', (el) => el.classList?.value)).not.toMatch(/is-active/i)
            expect(await page.$eval('#billMailingSearchBtn', (el) => el.disabled)).toBeTruthy()
            expect(await page.$eval('#billMailingClearBtn', (el) => el.disabled)).toBeFalsy()
            expect(await page.$eval('#billMailingPostalNumber', (el) => el.readOnly)).toBeTruthy()
            expect(await page.$eval('#billMailingAddress', (el) => el.readOnly)).toBeTruthy()
            expect(await page.$eval('#billMailingAddress', (el) => el.value)).toBe('東京都千代田区大手町一丁目')
            // 番地と建物等がクリアされる
            expect(await page.$eval('#billMailingAddressBanchi1', (el) => el.value)).toBe('')
            expect(await page.$eval('#billMailingAddressBuilding1', (el) => el.value)).toBe('')
            await page.waitForTimeout(500)

            // 番地と建物等の入力
            await page.type('#billMailingAddressBanchi1', '番地')
            await page.type('#billMailingAddressBuilding1', '建物等')

            // クリアボタンのクリック
            await page.click('#billMailingClearBtn')
            await page.waitForTimeout(500)

            // 期待結果
            expect(await page.$eval('#billMailingSearchBtn', (el) => el.disabled)).toBeTruthy()
            expect(await page.$eval('#billMailingClearBtn', (el) => el.disabled)).toBeTruthy()
            expect(await page.$eval('#billMailingPostalNumber', (el) => el.readOnly)).toBeFalsy()
            expect(await page.$eval('#billMailingPostalNumber', (el) => el.value)).toBe('')
            expect(await page.$eval('#billMailingAddress', (el) => el.value)).toBe('')
            expect(await page.$eval('#billMailingAddressBanchi1', (el) => el.value)).toBe('')
            expect(await page.$eval('#billMailingAddressBuilding1', (el) => el.value)).toBe('')
          })
        })
      })
      describe('次へボタンと確認モーダルの動作の確認', () => {
        let browser, page
        beforeEach(async () => {
          browser = await puppeteer.launch({
            headless: true,
            ignoreHTTPSErrors: true
          })
          page = await browser.newPage()
          await page.setCookie(acCookies[0])
          await page.goto('https://localhost:3000/receiveIntroductionSupport')
        })
        afterEach(async () => {
          await browser.close()
        })
        test('利用規約のスクロール、同意チェックボックスのチェック・チェック外す', async () => {
          // スクロール前
          expect(await page.$eval('#check', (el) => el.disabled)).toBeTruthy()
          expect(await page.$eval('#next-btn', (el) => el.disabled)).toBeTruthy()
          await page.waitForTimeout(1000)

          // 利用規約のスクロール
          await page.$eval('#terms-of-service', (el) => {
            return el.contentWindow.scroll(0, 20000)
          })
          await page.waitForTimeout(1000)

          // 期待結果
          expect(await page.$eval('#check', (el) => el.disabled)).toBeFalsy()
          expect(await page.$eval('#next-btn', (el) => el.disabled)).toBeTruthy()

          // 同意チェックボックスをチェックする
          await page.click('#check')
          await page.waitForTimeout(500)

          // 期待結果
          expect(await page.$eval('#next-btn', (el) => el.disabled)).toBeFalsy()

          // 同意チェックボックスをチェック外す
          await page.click('#check')
          await page.waitForTimeout(500)

          // 期待結果
          expect(await page.$eval('#next-btn', (el) => el.disabled)).toBeTruthy()
        })
        test('バリデーション-全部未入力', async () => {
          // 利用規約のスクロール⇒同意チェックボックスのチェック⇒次へボタンのクリック
          await showConfirm(page)
          // 期待結果
          expect(await page.$eval('#commonCustomerIdMessage', (el) => el.textContent)).toBe(requiredError)
          expect(await page.$eval('#contractorNameMessage', (el) => el.textContent)).toBe(requiredError)
          expect(await page.$eval('#contractorKanaNameMessage', (el) => el.textContent)).toBe(requiredError)
          expect(await page.$eval('#postalNumberMessage', (el) => el.textContent)).toBe(requiredError)
          expect(await page.$eval('#contractAddressValMessage', (el) => el.textContent)).toBe(requiredError)
          expect(await page.$eval('#banch1Message', (el) => el.textContent)).toBe(requiredError)
          expect(await page.$eval('#contactPersonNameMessage', (el) => el.textContent)).toBe(requiredError)
          expect(await page.$eval('#contactPhoneNumberMessage', (el) => el.textContent)).toBe(requiredError)
          expect(await page.$eval('#contactMailMessage', (el) => el.textContent)).toBe(requiredError)
          expect(await page.$eval('#passwordMessage', (el) => el.textContent)).toBe(requiredError)
          expect(await page.$eval('#passwordConfirmMessage', (el) => el.textContent)).toBe(requiredError)
          expect(await page.$eval('#billMailingPostalNumberMessage', (el) => el.textContent)).toBe(requiredError)
          expect(await page.$eval('#billMailingAddressMessage', (el) => el.textContent)).toBe(requiredError)
          expect(await page.$eval('#billMailingAddressBanchi1Message', (el) => el.textContent)).toBe(requiredError)
          expect(await page.$eval('#billMailingKanaNameMessage', (el) => el.textContent)).toBe(requiredError)
          expect(await page.$eval('#billMailingNameMessage', (el) => el.textContent)).toBe(requiredError)
          expect(await page.$eval('#billMailingPersonNameMessage', (el) => el.textContent)).toBe(requiredError)
          expect(await page.$eval('#billMailingPhoneNumberMessage', (el) => el.textContent)).toBe(requiredError)
          expect(await page.$eval('#billMailingMailAddressMessage', (el) => el.textContent)).toBe(requiredError)
        })
        test('バリデーション-全部誤入力', async () => {
          // 入力
          await page.type('#commonCustomerId', 'あああああああああああ')
          await page.type('#contractorName', '111')
          await page.type('#contractorKanaName', '111')
          await page.type('#postalNumber', '111')
          await page.type('#banch1', '111')
          await page.type('#tatemono1', '111')
          await page.type('#contactPersonName', '111')
          await page.type('#contactPhoneNumber', '111')
          await page.type('#contactMail', '111')
          await page.type('#campaignCode', 'あああ')
          await page.type('#password', '111')
          await page.type('#passwordConfirm', '111')
          await page.type('#billMailingPostalNumber', '111')
          await page.type('#billMailingAddressBanchi1', '111')
          await page.type('#billMailingAddressBuilding1', '111')
          await page.type('#billMailingKanaName', '111')
          await page.type('#billMailingName', '111')
          await page.type('#billMailingPersonName', '111')
          await page.type('#billMailingPhoneNumber', '111')
          await page.type('#billMailingMailAddress', '111')
          await page.type('#openingDate', '111')
          await page.type('#salesChannelCode', 'あああ')
          await page.type('#salesChannelName', '111')
          await page.type('#salesChannelDeptName', '111')
          await page.type('#salesChannelEmplyeeCode', 'あああ')
          await page.type('#salesChannelPersonName', '111')
          await page.type('#salesChannelPhoneNumber', '111')
          await page.type('#salesChannelMailAddress', '111')

          // 利用規約のスクロール⇒同意チェックボックスのチェック⇒次へボタンのクリック
          await showConfirm(page)

          // 期待結果
          expect(await page.$eval('#commonCustomerIdMessage', (el) => el.textContent)).toBe(wrongPatternError)
          expect(await page.$eval('#contractorNameMessage', (el) => el.textContent)).toBe(wrongPatternError)
          expect(await page.$eval('#contractorKanaNameMessage', (el) => el.textContent)).toBe(wrongPatternError)
          expect(await page.$eval('#postalNumberMessage', (el) => el.textContent)).toBe(wrongPatternError)
          expect(await page.$eval('#banch1Message', (el) => el.textContent)).toBe(wrongPatternError)
          expect(await page.$eval('#tatemono1Message', (el) => el.textContent)).toBe(wrongPatternError)
          expect(await page.$eval('#contactPersonNameMessage', (el) => el.textContent)).toBe(wrongPatternError)
          expect(await page.$eval('#contactPhoneNumberMessage', (el) => el.textContent)).toBe(wrongPatternError)
          expect(await page.$eval('#contactMailMessage', (el) => el.textContent)).toBe(wrongPatternError)
          expect(await page.$eval('#campaignCodeMessage', (el) => el.textContent)).toBe(wrongPatternError)
          expect(await page.$eval('#passwordMessage', (el) => el.textContent)).toBe(wrongPatternError)
          expect(await page.$eval('#passwordConfirmMessage', (el) => el.textContent)).toBe(wrongPatternError)
          expect(await page.$eval('#billMailingPostalNumberMessage', (el) => el.textContent)).toBe(wrongPatternError)
          expect(await page.$eval('#billMailingAddressBanchi1Message', (el) => el.textContent)).toBe(wrongPatternError)
          expect(await page.$eval('#billMailingAddressBuilding1Message', (el) => el.textContent)).toBe(
            wrongPatternError
          )
          expect(await page.$eval('#billMailingKanaNameMessage', (el) => el.textContent)).toBe(wrongPatternError)
          expect(await page.$eval('#billMailingNameMessage', (el) => el.textContent)).toBe(wrongPatternError)
          expect(await page.$eval('#billMailingPersonNameMessage', (el) => el.textContent)).toBe(wrongPatternError)
          expect(await page.$eval('#billMailingPhoneNumberMessage', (el) => el.textContent)).toBe(wrongPatternError)
          expect(await page.$eval('#billMailingMailAddressMessage', (el) => el.textContent)).toBe(wrongPatternError)
          expect(await page.$eval('#openingDateMessage', (el) => el.textContent)).toBe(wrongPatternError)
          expect(await page.$eval('#salesChannelCodeMessage', (el) => el.textContent)).toBe(wrongPatternError)
          expect(await page.$eval('#salesChannelNameMessage', (el) => el.textContent)).toBe(wrongPatternError)
          expect(await page.$eval('#salesChannelDeptNameMessage', (el) => el.textContent)).toBe(wrongPatternError)
          expect(await page.$eval('#salesChannelEmplyeeCodeMessage', (el) => el.textContent)).toBe(wrongPatternError)
          expect(await page.$eval('#salesChannelPersonNameMessage', (el) => el.textContent)).toBe(wrongPatternError)
          expect(await page.$eval('#salesChannelPhoneNumberMessage', (el) => el.textContent)).toBe(wrongPatternError)
          expect(await page.$eval('#salesChannelMailAddressMessage', (el) => el.textContent)).toBe(wrongPatternError)
        })
        test('バリデーション-特殊チェック(パスワード、開通希望日)', async () => {
          // 入力
          await page.type('#password', 'Aa111111')
          await page.type('#passwordConfirm', 'Aa222222')
          await page.type('#openingDate', '2022')
          await page.keyboard.press('ArrowRight')
          await page.type('#openingDate', '06')
          await page.keyboard.press('ArrowRight')
          await page.type('#openingDate', '19')
          // 利用規約のスクロール⇒同意チェックボックスのチェック⇒次へボタンのクリック
          await showConfirm(page)
          // 期待結果
          expect(await page.$eval('#passwordMessage', (el) => el.textContent)).toBe(passwordConfirmError)
          expect(await page.$eval('#openingDateMessage', (el) => el.textContent)).toBe(pastOpeningDateError)
        })
        test('バリデーション-全部未入力⇒最低限入力（必須のみ）', async () => {
          // 利用規約のスクロール⇒同意チェックボックスのチェック⇒次へボタンのクリック
          await showConfirm(page)
          // ライトプラン申込画面の必須項目のみ入力動作
          await fillRequiredOnly(page)
          // 次へボタンのクリック
          await page.click('#next-btn')
          await page.waitForTimeout(500)
          // 期待結果
          expect(await page.$eval('#confirmregister-modal', (el) => el.classList?.value)).toMatch(/is-active/i)
          expect(await page.$eval('#commonCustomerIdMessage', (el) => el.textContent)).toBe('')
          expect(await page.$eval('#contractorNameMessage', (el) => el.textContent)).toBe('')
          expect(await page.$eval('#contractorKanaNameMessage', (el) => el.textContent)).toBe('')
          expect(await page.$eval('#postalNumberMessage', (el) => el.textContent)).toBe('')
          expect(await page.$eval('#contractAddressValMessage', (el) => el.textContent)).toBe('')
          expect(await page.$eval('#banch1Message', (el) => el.textContent)).toBe('')
          expect(await page.$eval('#contactPersonNameMessage', (el) => el.textContent)).toBe('')
          expect(await page.$eval('#contactPhoneNumberMessage', (el) => el.textContent)).toBe('')
          expect(await page.$eval('#contactMailMessage', (el) => el.textContent)).toBe('')
          expect(await page.$eval('#passwordMessage', (el) => el.textContent)).toBe('')
          expect(await page.$eval('#passwordConfirmMessage', (el) => el.textContent)).toBe('')
          expect(await page.$eval('#billMailingPostalNumberMessage', (el) => el.textContent)).toBe('')
          expect(await page.$eval('#billMailingAddressMessage', (el) => el.textContent)).toBe('')
          expect(await page.$eval('#billMailingAddressBanchi1Message', (el) => el.textContent)).toBe('')
          expect(await page.$eval('#billMailingKanaNameMessage', (el) => el.textContent)).toBe('')
          expect(await page.$eval('#billMailingNameMessage', (el) => el.textContent)).toBe('')
          expect(await page.$eval('#billMailingPersonNameMessage', (el) => el.textContent)).toBe('')
          expect(await page.$eval('#billMailingPhoneNumberMessage', (el) => el.textContent)).toBe('')
          expect(await page.$eval('#billMailingMailAddressMessage', (el) => el.textContent)).toBe('')
        })
        test('確認モーダルの表示内容の確認-最低限入力（必須のみ）⇒次へ', async () => {
          // 導入支援申込画面の必須項目のみ入力動作
          await fillRequiredOnly(page)
          // 利用規約のスクロール⇒同意チェックボックスのチェック⇒次へボタンのクリック
          await showConfirm(page)
          // 期待結果
          expect(await page.$eval('#confirmregister-modal', (el) => el.classList?.value)).toMatch(/is-active/i)
          expect(await page.$eval('#recommonCustomerId', (el) => el.textContent)).toBe(postData.commonCustomerId)
          expect(await page.$eval('#recontractorName', (el) => el.textContent)).toBe(postData.contractorName)
          expect(await page.$eval('#recontractorKanaName', (el) => el.textContent)).toBe(postData.contractorKanaName)
          expect(await page.$eval('#repostalNumber', (el) => el.textContent)).toBe(postData.postalNumber)
          expect(await page.$eval('#recontractAddressVal', (el) => el.textContent)).toBe(
            postData.contractAddressVal + postData.banch1
          )
          expect(await page.$eval('#recontactPersonName', (el) => el.textContent)).toBe(postData.contactPersonName)
          expect(await page.$eval('#recontactPhoneNumber', (el) => el.textContent)).toBe(postData.contactPhoneNumber)
          expect(await page.$eval('#recontactMail', (el) => el.textContent)).toBe(postData.contactMail)
          expect(await page.$eval('#repassword', (el) => el.textContent)).toBe(postData.password)
          expect(await page.$eval('#rebillMailingPostalNumber', (el) => el.textContent)).toBe(
            postData.billMailingPostalNumber
          )
          expect(await page.$eval('#rebillMailingAddress', (el) => el.textContent)).toBe(
            postData.billMailingAddress + postData.billMailingAddressBanchi1
          )
          expect(await page.$eval('#rebillMailingKanaName', (el) => el.textContent)).toBe(postData.billMailingKanaName)
          expect(await page.$eval('#rebillMailingName', (el) => el.textContent)).toBe(postData.billMailingName)
          expect(await page.$eval('#rebillMailingPersonName', (el) => el.textContent)).toBe(
            postData.billMailingPersonName
          )
          expect(await page.$eval('#rebillMailingPhoneNumber', (el) => el.textContent)).toBe(
            postData.billMailingPhoneNumber
          )
          expect(await page.$eval('#rebillMailingMailAddress', (el) => el.textContent)).toBe(
            postData.billMailingMailAddress
          )
          expect(await page.$eval('#reopeningDate', (el) => el.textContent)).toBe('')
          expect(await page.$eval('#resalesChannelCode', (el) => el.textContent)).toBe('')
          expect(await page.$eval('#resalesChannelName', (el) => el.textContent)).toBe('')
          expect(await page.$eval('#resalesChannelDeptName', (el) => el.textContent)).toBe('')
          expect(await page.$eval('#resalesChannelEmplyeeCode', (el) => el.textContent)).toBe('')
          expect(await page.$eval('#resalesChannelPersonName', (el) => el.textContent)).toBe('')
          expect(await page.$eval('#resalesChannelDeptType', (el) => el.textContent)).toBe('')
          expect(await page.$eval('#resalesChannelPhoneNumber', (el) => el.textContent)).toBe('')
          expect(await page.$eval('#resalesChannelMailAddress', (el) => el.textContent)).toBe('')
        })
        test('確認モーダルの表示内容の確認-全部入力⇒次へ⇒キャンセル⇒次へ⇒✖（閉じる）⇒次へ', async () => {
          // 確認モーダルの表示内容の確認
          const checkConfirmregisterModal = async (page) => {
            expect(await page.$eval('#confirmregister-modal', (el) => el.classList?.value)).toMatch(/is-active/i)
            expect(await page.$eval('#recommonCustomerId', (el) => el.textContent)).toBe(postData.commonCustomerId)
            expect(await page.$eval('#recontractorName', (el) => el.textContent)).toBe(postData.contractorName)
            expect(await page.$eval('#recontractorKanaName', (el) => el.textContent)).toBe(postData.contractorKanaName)
            expect(await page.$eval('#repostalNumber', (el) => el.textContent)).toBe(postData.postalNumber)
            expect(await page.$eval('#recontractAddressVal', (el) => el.textContent)).toBe(
              postData.contractAddressVal + postData.banch1 + postData.tatemono1
            )
            expect(await page.$eval('#recontactPersonName', (el) => el.textContent)).toBe(postData.contactPersonName)
            expect(await page.$eval('#recontactPhoneNumber', (el) => el.textContent)).toBe(postData.contactPhoneNumber)
            expect(await page.$eval('#recontactMail', (el) => el.textContent)).toBe(postData.contactMail)
            expect(await page.$eval('#repassword', (el) => el.textContent)).toBe(postData.password)
            expect(await page.$eval('#rebillMailingPostalNumber', (el) => el.textContent)).toBe(
              postData.billMailingPostalNumber
            )
            expect(await page.$eval('#rebillMailingAddress', (el) => el.textContent)).toBe(
              postData.billMailingAddress + postData.billMailingAddressBanchi1 + postData.billMailingAddressBuilding1
            )
            expect(await page.$eval('#rebillMailingKanaName', (el) => el.textContent)).toBe(
              postData.billMailingKanaName
            )
            expect(await page.$eval('#rebillMailingName', (el) => el.textContent)).toBe(postData.billMailingName)
            expect(await page.$eval('#rebillMailingPersonName', (el) => el.textContent)).toBe(
              postData.billMailingPersonName
            )
            expect(await page.$eval('#rebillMailingPhoneNumber', (el) => el.textContent)).toBe(
              postData.billMailingPhoneNumber
            )
            expect(await page.$eval('#rebillMailingMailAddress', (el) => el.textContent)).toBe(
              postData.billMailingMailAddress
            )
            expect(await page.$eval('#reopeningDate', (el) => el.textContent)).toBe(postData.openingDate)
            expect(await page.$eval('#resalesChannelCode', (el) => el.textContent)).toBe(postData.salesChannelCode)
            expect(await page.$eval('#resalesChannelName', (el) => el.textContent)).toBe(postData.salesChannelName)
            expect(await page.$eval('#resalesChannelDeptName', (el) => el.textContent)).toBe(
              postData.salesChannelDeptName
            )
            expect(await page.$eval('#resalesChannelEmplyeeCode', (el) => el.textContent)).toBe(
              postData.salesChannelEmplyeeCode
            )
            expect(await page.$eval('#resalesChannelPersonName', (el) => el.textContent)).toBe(
              postData.salesChannelPersonName
            )
            expect(await page.$eval('#resalesChannelDeptType', (el) => el.textContent)).toBe(
              JSON.parse(postData.salesChannelDeptType)?.name
            )
            expect(await page.$eval('#resalesChannelPhoneNumber', (el) => el.textContent)).toBe(
              postData.salesChannelPhoneNumber
            )
            expect(await page.$eval('#resalesChannelMailAddress', (el) => el.textContent)).toBe(
              postData.salesChannelMailAddress
            )
          }
          // 全部入力
          await fillAll(page)
          // 利用規約のスクロール⇒同意チェックボックスのチェック⇒次へボタンのクリック
          await showConfirm(page)
          // 期待結果
          await checkConfirmregisterModal(page)

          // キャンセルボタンのクリック
          await page.click('a.button.cancel-button[data-target="confirmregister-modal"]')
          await page.waitForTimeout(500)
          // 期待結果
          expect(await page.$eval('#confirmregister-modal', (el) => el.classList?.value)).not.toMatch(/is-active/i)

          // 次へボタンのクリック
          await page.click('#next-btn')
          await page.waitForTimeout(500)
          // 期待結果
          await checkConfirmregisterModal(page)

          // 確認モーダルを閉じる
          await page.click('button.delete[data-target="confirmregister-modal"]')
          // 期待結果
          expect(await page.$eval('#confirmregister-modal', (el) => el.classList?.value)).not.toMatch(/is-active/i)

          // 次へボタンのクリック
          await page.click('#next-btn')
          await page.waitForTimeout(500)
          // 期待結果
          await checkConfirmregisterModal(page)
        })
      })
      describe('登録ボタンの動作の確認', () => {
        afterEach(async () => {
          // DBクリア
          await db.Contract.destroy({ where: { serviceType: '020' } })
        })

        test('最低限情報登録', async () => {
          // 導入支援申込画面の必須項目のみ入力動作
          await fillRequiredOnly(page)
          // 利用規約のスクロール⇒同意チェックボックスのチェック⇒次へボタンのクリック
          await showConfirm(page)
          // 登録ボタンのクリック
          await page.click('#submit')
          await page.waitForTimeout(500)
          // 期待結果
          expect(page.url()).toBe('https://localhost:3000/portal')
          expect(await page.$eval('#message-info', (el) => el.title)).toBe(
            '導入支援サービスの申し込みが完了いたしました。'
          )

          // DB確認
          const contracts = await contractController.findContracts(
            { tenantId: testTenantId, serviceType: constants.statusConstants.serviceTypes.introductionSupport },
            null
          )
          expect(contracts?.length).toBe(1)
          expect(contracts[0].contractStatus).toBe(constants.statusConstants.contractStatuses.newContractOrder)

          const order = await db.Order.findOne({
            where: { contractId: contracts[0].contractId }
          })
          expect(order.orderType).toBe(constants.statusConstants.orderTypes.newOrder)
          // expect(order.orderData).toBe(JSON.stringify(requiredOnlyOrderData))
          const a = JSON.parse(order.orderData)
          delete a.contractBasicInfo.tradeshiftId
          const b = requiredOnlyOrderData
          delete b.contractBasicInfo.tradeshiftId
          expect(JSON.stringify(a)).toBe(JSON.stringify(b))
        })
        test('全部情報登録', async () => {
          // 全部入力
          await fillAll(page)
          // 利用規約のスクロール⇒同意チェックボックスのチェック⇒次へボタンのクリック
          await showConfirm(page)
          // 登録ボタンのクリック
          await page.click('#submit')
          await page.waitForTimeout(500)
          // 期待結果
          expect(page.url()).toBe('https://localhost:3000/portal')
          expect(await page.$eval('#message-info', (el) => el.title)).toBe(
            '導入支援サービスの申し込みが完了いたしました。'
          )
          // DB確認
          const contracts = await contractController.findContracts(
            { tenantId: testTenantId, serviceType: constants.statusConstants.serviceTypes.introductionSupport },
            null
          )
          expect(contracts?.length).toBe(1)
          expect(contracts[0].contractStatus).toBe(constants.statusConstants.contractStatuses.newContractOrder)

          const order = await db.Order.findOne({
            where: { contractId: contracts[0].contractId }
          })
          expect(order.orderType).toBe(constants.statusConstants.orderTypes.newOrder)
          const a = JSON.parse(order.orderData)
          delete a.contractBasicInfo.tradeshiftId
          // expect(order.orderData).toBe(
          expect(JSON.stringify(a)).toBe(
            JSON.stringify({
              contractBasicInfo: {
                // tradeshiftId: '2b95d31b-60c6-4c47-a813-17092d8c7434',
                orderId: '',
                orderType: '010',
                serviceType: '020',
                contractChangeName: '',
                contractChangeAddress: '',
                contractChangeContact: '',
                appDate: '',
                OpeningDate: '22220616',
                contractNumber: '',
                salesChannelCode: '000000',
                salesChannelName: '販売チャネル名',
                salesChannelDeptName: '部課名',
                salesChannelEmplyeeCode: '11111111',
                salesChannelPersonName: '担当者名',
                salesChannelDeptType: 'Com第一営業本部',
                salesChannelPhoneNumber: '000-0000-0000',
                salesChannelMailAddress: 'aaa@aaa.com',
                kaianPassword: 'Aa11111111',
                campaignCode: '00000',
                salesPersonName: '販売担当者名'
              },
              contractAccountInfo: {
                contractAccountId: '',
                customerType: '',
                commonCustomerId: '11111111111',
                contractorName: '契約者名',
                contractorKanaName: 'カナ',
                postalNumber: '1000004',
                contractAddress: '東京都千代田区大手町一丁目',
                banch1: '１番',
                tatemono1: '建物'
              },
              contactList: [
                {
                  contactType: '',
                  contactPersonName: '連絡先担当者名',
                  contactPhoneNumber: '000-0000-0000',
                  contactMail: 'aaaaaa@aaa.com',
                  billMailingPostalNumber: '1000004',
                  billMailingAddress: '東京都千代田区大手町一丁目',
                  billMailingAddressBanchi1: '請求書送付先番地等',
                  billMailingAddressBuilding1: '請求書送付先建物等',
                  billMailingKanaName: '請求書送付先宛名',
                  billMailingName: 'カナ',
                  billMailingPersonName: '請求に関する連絡先',
                  billMailingPhoneNumber: '000-0000-0000',
                  billMailingMailAddress: 'aaa@aaa.com'
                }
              ],
              prdtList: [{ prdtCode: 'BF4022000000100', idnumber: '', appType: '010' }]
            })
          )
        })
      })
    })

    describe('導入支援:申込済', () => {
      let browser, page
      beforeAll(async () => {
        // ------導入支援申込
        const browser = await puppeteer.launch({
          headless: true,
          ignoreHTTPSErrors: true
        })
        const page = await browser.newPage()
        await page.setCookie(acCookies[0])
        await page.goto('https://localhost:3000/receiveIntroductionSupport')

        // 導入支援申込画面の必須項目のみ入力動作
        await fillRequiredOnly(page)
        // 利用規約のスクロール⇒同意チェックボックスのチェック⇒次へボタンのクリック
        await showConfirm(page)
        // 登録ボタンのクリック
        await page.click('#submit')
        await page.waitForTimeout(500)
        await browser.close()
      })
      beforeEach(async () => {
        browser = await puppeteer.launch({
          headless: true,
          ignoreHTTPSErrors: true
        })
        page = await browser.newPage()
        await page.setCookie(acCookies[0])
      })
      afterEach(async () => {
        await browser.close()
      })
      afterAll(async () => {
        // DBクリア
        await db.Contract.destroy({ where: { serviceType: '020' } })
      })
      describe('申込中:現在導入支援は申込中です。', () => {
        test('導入支援契約ステータス:10', async () => {
          await page.goto('https://localhost:3000/receiveIntroductionSupport')
          // 期待結果
          expect(await page.$eval('.subtitle', (el) => el.textContent)).toBe(introductionSupportRegistering)
        })
        test('導入支援契約ステータス:11', async () => {
          // 準備
          await db.Contract.update(
            {
              contractStatus: constants.statusConstants.contractStatuses.newContractReceive
            },
            {
              where: {
                tenantId: testTenantId,
                serviceType: constants.statusConstants.serviceTypes.introductionSupport
              }
            }
          )
          await page.goto('https://localhost:3000/receiveIntroductionSupport')

          // 期待結果
          expect(await page.$eval('.subtitle', (el) => el.textContent)).toBe(introductionSupportRegistering)
        })
        test('導入支援契約ステータス:12', async () => {
          // 準備
          await db.Contract.update(
            {
              contractStatus: constants.statusConstants.contractStatuses.newContractBeforeCompletion
            },
            {
              where: {
                tenantId: testTenantId,
                serviceType: constants.statusConstants.serviceTypes.introductionSupport
              }
            }
          )
          await page.goto('https://localhost:3000/receiveIntroductionSupport')

          // 期待結果
          expect(await page.$eval('.subtitle', (el) => el.textContent)).toBe(introductionSupportRegistering)
        })
      })
    })
  })
})
