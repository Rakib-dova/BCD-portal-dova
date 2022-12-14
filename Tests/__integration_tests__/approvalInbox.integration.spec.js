'use strict'
const app = require('../../Application/app')
const request = require('supertest')
const { JSDOM } = require('jsdom')
const db = require('../../Application/models')
const getTenantId = {}
let redirectUrl
let approvalInbox
jest.setTimeout(60000) // jestのタイムアウトを60秒とする

const getCookies = require('./getCookies')

describe('承認者が支払い依頼の内容を確認できる', () => {
  let acCookies
  let userCookies
  let testTenantId
  let acStatus11
  let userStatus11
  let acStatus40
  let userStatus40

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
    // テナントステータスが「登録申込」、パラメータがない場合
    test('管理者、契約ステータス：登録申込、パラメータがない場合-利用不可', async () => {
      const res = await request(app)
        .get('/approvalInbox')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(400)

      // 画面内容確認
      expect(res.text).toMatch(/不正なページからアクセスされたか、セッションタイムアウトが発生しました。/i)
    })

    test('一般ユーザ、契約ステータス：登録申込、パラメータがない場合-利用不可', async () => {
      const res = await request(app)
        .get('/approvalInbox')
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
        .expect(400)

      // 画面内容確認
      expect(res.text).toMatch(/不正なページからアクセスされたか、セッションタイムアウトが発生しました。/i)
    })

    test('管理者、支払依頼を出す', async () => {
      const contract = await db.Contract.findOne({
        where: {
          tenantId: testTenantId
        }
      })

      // 承認ルート登録
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
      await page.goto('https://localhost:3000/inboxList/1')

      await page.click('#informationTab > table > tbody > tr:nth-child(1) > td.text-center.display-row-td > a')

      await page.waitForTimeout(2000)

      redirectUrl = await page.evaluate(() => {
        return document.querySelector('#form > div.grouped-button > a.button.is-link').getAttribute('href')
      })

      approvalInbox = redirectUrl.replace('/requestApproval/', '')
      redirectUrl = '/approvalInbox/' + approvalInbox

      // 支払依頼へボタン押下
      await page.click('#form > div.grouped-button > a.button.is-link')

      await page.waitForTimeout(2000)

      // 支払依頼画面にredirectする。
      expect(page.url()).toBe(`https://localhost:3000/requestApproval/${approvalInbox}`)

      // 承認ルート選択ボタン押下
      await page.click('#btn-approveRouteInsert')

      await page.waitForTimeout(1000)

      // 承認ルート検索
      await page.click('#btnSearchApproveRoute')

      await page.waitForTimeout(2000)

      await page.click('#displayFieldApproveRouteResultBody > tr > td.btnSelect > a')

      await page.waitForTimeout(2500)

      // メッセージ入力
      await page.type('#inputMsg', 'インテグレーションテスト')

      await page.waitForTimeout(7000)

      // 支払依頼画面にredirectする。
      expect(page.url()).toBe(`https://localhost:3000/requestApproval/${approvalInbox}`)

      // 確認ボタン押下
      await page.click('#btn-confirm')

      await page.waitForTimeout(1000)

      // 依頼ボタン押下
      await page.click('#btn-approval')

      browser.close()
    })

    test('管理者、契約ステータス：登録申込、承認者ではない場合', async () => {
      const res = await request(app)
        .get(redirectUrl)
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(200)

      // 画面内容確認
      expect(res.text).toMatch(/支払依頼/i)
      expect(res.text).toMatch(/承認ルート名/i)
      expect(res.text).toMatch(/integrationApproveRoute/i)
      expect(res.text).toMatch(/承認順/i)
      expect(res.text).toMatch(/担当者名/i)
      expect(res.text).toMatch(/承認状況/i)
      expect(res.text).toMatch(/依頼済み/i)
      expect(res.text).toMatch(/一次承認/i)
      expect(res.text).toMatch(/処理中/i)
      expect(res.text).toMatch(/最終承認/i)
      expect(res.text).toMatch(/戻る/i)
    })

    test('一般ユーザ、契約ステータス：登録申込、承認者の場合', async () => {
      const res = await request(app)
        .get(redirectUrl)
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
        .expect(200)

      // 画面内容確認
      expect(res.text).toMatch(/支払依頼/i)

      expect(res.text).toMatch(/承認ルート名/i)
      expect(res.text).toMatch(/integrationApproveRoute/i)
      expect(res.text).toMatch(/承認順/i)
      expect(res.text).toMatch(/担当者名/i)
      expect(res.text).toMatch(/承認状況/i)
      expect(res.text).toMatch(/依頼済み/i)
      expect(res.text).toMatch(/一次承認/i)
      expect(res.text).toMatch(/処理中/i)
      expect(res.text).toMatch(/最終承認/i)
      expect(res.text).toMatch(/戻る/i)
    })
  })

  describe('3.契約ステータス：登録受付', () => {
    test('/authにアクセス：oauth2認証をし、セッション用Cookieを取得', async () => {
      // アカウント管理者と一般ユーザのID/SECRETは、テストコマンドの引数から取得
      acStatus11 = await getCookies(app, request, getTenantId, 'inte.test.user+11@gmail.com', '1q2w3e4r5t')
      userStatus11 = await getCookies(app, request, getTenantId, 'inte.test.user+11user@gmail.com', '1q2w3e4r5t')
    })

    test('管理者、契約ステータス：登録受付、承認者ではない場合、契約ステータス：登録受付、パラメータがない場合-利用不可', async () => {
      const cookie11Admin = `${acStatus11[0].name}=${acStatus11[0].value}`
      const res = await request(app).get('/approvalInbox').set('Cookie', cookie11Admin).expect(400)

      // 画面内容確認
      expect(res.text).toMatch(/不正なページからアクセスされたか、セッションタイムアウトが発生しました。/i)
    })

    test('一般ユーザ、契約ステータス：登録受付、パラメータがない場合-利用不可', async () => {
      const cookie11user = `${userStatus11[0].name}=${userStatus11[0].value}`
      const res = await request(app).get('/approvalInbox').set('Cookie', cookie11user).expect(400)

      // 画面内容確認
      expect(res.text).toMatch(/不正なページからアクセスされたか、セッションタイムアウトが発生しました。/i)
    })

    test('管理者、契約ステータス：登録受付、承認者ではない場合', async () => {
      const cookie11Admin = `${acStatus11[0].name}=${acStatus11[0].value}`
      const res = await request(app)
        .get('/approvalInbox/8fab4365-eaa9-51f3-ad8f-2027764c4732')
        .set('Cookie', cookie11Admin)
        .expect(200)

      // 画面内容確認
      expect(res.text).toMatch(/支払依頼/i)
      expect(res.text).toMatch(/承認ルート名/i)
      expect(res.text).toMatch(/承認順/i)
      expect(res.text).toMatch(/担当者名/i)
      expect(res.text).toMatch(/承認状況/i)
      expect(res.text).toMatch(/依頼済み/i)
      expect(res.text).toMatch(/借方/i)
      expect(res.text).toMatch(/貸方/i)
      expect(res.text).toMatch(/承認順/i)
      expect(res.text).toMatch(/処理中/i)
      expect(res.text).toMatch(/最終承認/i)
      expect(res.text).toMatch(/戻る/i)
    })

    test('一般ユーザ、契約ステータス：登録受付、承認者の場合', async () => {
      const cookie11user = `${userStatus11[0].name}=${userStatus11[0].value}`
      const res = await request(app)
        .get('/approvalInbox/8fab4365-eaa9-51f3-ad8f-2027764c4732')
        .set('Cookie', cookie11user)
        .expect(200)

      // 画面内容確認
      expect(res.text).toMatch(/支払依頼/i)
      expect(res.text).toMatch(/承認ルート名/i)
      expect(res.text).toMatch(/承認順/i)
      expect(res.text).toMatch(/担当者名/i)
      expect(res.text).toMatch(/承認状況/i)
      expect(res.text).toMatch(/依頼済み/i)
      expect(res.text).toMatch(/貸方/i)
      expect(res.text).toMatch(/借方/i)
      expect(res.text).toMatch(/承認順/i)
      expect(res.text).toMatch(/処理中/i)
      expect(res.text).toMatch(/最終承認/i)
      expect(res.text).toMatch(/戻る/i)
    })
  })

  describe('4.契約ステータス：契約中', () => {
    // テナントステータスが「契約中」、パラメータがない場合
    test('管理者、契約ステータス：契約中、パラメータがない場合-利用不可', async () => {
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
        .get('/approvalInbox')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(400)

      // 画面内容確認
      expect(res.text).toMatch(/不正なページからアクセスされたか、セッションタイムアウトが発生しました。/i)
    })

    test('一般ユーザ、契約ステータス：契約中、パラメータがない場合-利用不可', async () => {
      const res = await request(app)
        .get('/approvalInbox')
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
        .expect(400)

      // 画面内容確認
      expect(res.text).toMatch(/不正なページからアクセスされたか、セッションタイムアウトが発生しました。/i)
    })

    test('管理者、契約ステータス：契約中、承認者ではない場合', async () => {
      const res = await request(app)
        .get(redirectUrl)
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(200)

      // 画面内容確認
      expect(res.text).toMatch(/支払依頼/i)
      expect(res.text).toMatch(/承認ルート名/i)
      expect(res.text).toMatch(/integrationApproveRoute/i)
      expect(res.text).toMatch(/承認順/i)
      expect(res.text).toMatch(/担当者名/i)
      expect(res.text).toMatch(/承認状況/i)
      expect(res.text).toMatch(/依頼済み/i)
      expect(res.text).toMatch(/一次承認/i)
      expect(res.text).toMatch(/処理中/i)
      expect(res.text).toMatch(/最終承認/i)
      expect(res.text).toMatch(/戻る/i)
    })

    test('一般ユーザ、契約ステータス：契約中、承認者の場合', async () => {
      const res = await request(app)
        .get(redirectUrl)
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
        .expect(200)

      // 画面内容確認
      expect(res.text).toMatch(/支払依頼/i)

      expect(res.text).toMatch(/承認ルート名/i)
      expect(res.text).toMatch(/integrationApproveRoute/i)
      expect(res.text).toMatch(/承認順/i)
      expect(res.text).toMatch(/担当者名/i)
      expect(res.text).toMatch(/承認状況/i)
      expect(res.text).toMatch(/依頼済み/i)
      expect(res.text).toMatch(/一次承認/i)
      expect(res.text).toMatch(/処理中/i)
      expect(res.text).toMatch(/最終承認/i)
      expect(res.text).toMatch(/戻る/i)
    })

    test('「戻る」ボタン遷移確認（受領請求書への仕訳情報設定画面に遷移）', async () => {
      const puppeteer = require('puppeteer')
      const browser = await puppeteer.launch({
        headless: true,
        ignoreHTTPSErrors: true
      })
      const page = await browser.newPage()
      await page.setCookie(userCookies[0])
      await page.goto(`https://localhost:3000${redirectUrl}`)

      await browser.close()
    })
  })

  describe('5.契約ステータス：変更申込', () => {
    test('/authにアクセス：oauth2認証をし、セッション用Cookieを取得', async () => {
      // アカウント管理者と一般ユーザのID/SECRETは、テストコマンドの引数から取得
      acStatus40 = await getCookies(app, request, getTenantId, 'inte.test.user+40@gmail.com', '1q2w3e4r5t')
      userStatus40 = await getCookies(app, request, getTenantId, 'inte.test.user+40user@gmail.com', '1q2w3e4r5t')
    })

    test('管理者、契約ステータス：変更申込、パラメータがない場合-利用不可', async () => {
      const cookie40Admin = `${acStatus40[0].name}=${acStatus40[0].value}`
      const res = await request(app).get('/approvalInbox').set('Cookie', cookie40Admin).expect(400)

      // 画面内容確認
      expect(res.text).toMatch(/不正なページからアクセスされたか、セッションタイムアウトが発生しました。/i)
    })

    test('一般ユーザ、契約ステータス：変更申込、パラメータがない場合-利用不可', async () => {
      const cookie40user = `${userStatus40[0].name}=${userStatus40[0].value}`
      const res = await request(app).get('/approvalInbox').set('Cookie', cookie40user).expect(400)

      // 画面内容確認
      expect(res.text).toMatch(/不正なページからアクセスされたか、セッションタイムアウトが発生しました。/i)
    })

    test('管理者、契約ステータス：変更申込、承認者ではない場合', async () => {
      const cookie40Admin = `${acStatus40[0].name}=${acStatus40[0].value}`
      const res = await request(app)
        .get('/approvalInbox/1b35d673-cf9c-5a0d-a06b-a3add6113fe2')
        .set('Cookie', cookie40Admin)
        .expect(200)

      // 画面内容確認
      expect(res.text).toMatch(/支払依頼/i)
      expect(res.text).toMatch(/承認ルート名/i)
      expect(res.text).toMatch(/承認順/i)
      expect(res.text).toMatch(/担当者名/i)
      expect(res.text).toMatch(/承認状況/i)
      expect(res.text).toMatch(/依頼済み/i)
      expect(res.text).toMatch(/承認順/i)
      expect(res.text).toMatch(/借方/i)
      expect(res.text).toMatch(/貸方/i)
      expect(res.text).toMatch(/処理中/i)
      expect(res.text).toMatch(/最終承認/i)
      expect(res.text).toMatch(/戻る/i)
    })

    test('一般ユーザ、契約ステータス：変更申込、承認者の場合', async () => {
      const cookie40user = `${userStatus40[0].name}=${userStatus40[0].value}`
      const res = await request(app)
        .get('/approvalInbox/1b35d673-cf9c-5a0d-a06b-a3add6113fe2')
        .set('Cookie', cookie40user)
        .expect(200)

      // 画面内容確認
      expect(res.text).toMatch(/支払依頼/i)
      expect(res.text).toMatch(/承認ルート名/i)
      expect(res.text).toMatch(/承認順/i)
      expect(res.text).toMatch(/担当者名/i)
      expect(res.text).toMatch(/承認状況/i)
      expect(res.text).toMatch(/依頼済み/i)
      expect(res.text).toMatch(/承認順/i)
      expect(res.text).toMatch(/借方/i)
      expect(res.text).toMatch(/貸方/i)
      expect(res.text).toMatch(/処理中/i)
      expect(res.text).toMatch(/最終承認/i)
      expect(res.text).toMatch(/戻る/i)
    })
  })

  describe('6.契約ステータス：変更受付', () => {
    // テナントステータスが「変更受付」、パラメータがない場合
    test('管理者、契約ステータス：変更受付、パラメータがない場合-利用不可', async () => {
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
        .get('/approvalInbox')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(400)

      // 画面内容確認
      expect(res.text).toMatch(/不正なページからアクセスされたか、セッションタイムアウトが発生しました。/i)
    })

    test('一般ユーザ、契約ステータス：変更受付、パラメータがない場合-利用不可', async () => {
      const res = await request(app)
        .get('/approvalInbox')
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
        .expect(400)

      // 画面内容確認
      expect(res.text).toMatch(/不正なページからアクセスされたか、セッションタイムアウトが発生しました。/i)
    })

    test('管理者、契約ステータス：変更受付、承認者ではない場合', async () => {
      const res = await request(app)
        .get(redirectUrl)
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(200)

      // 画面内容確認
      expect(res.text).toMatch(/支払依頼/i)
      expect(res.text).toMatch(/承認ルート名/i)
      expect(res.text).toMatch(/integrationApproveRoute/i)
      expect(res.text).toMatch(/承認順/i)
      expect(res.text).toMatch(/担当者名/i)
      expect(res.text).toMatch(/承認状況/i)
      expect(res.text).toMatch(/依頼済み/i)
      expect(res.text).toMatch(/一次承認/i)
      expect(res.text).toMatch(/処理中/i)
      expect(res.text).toMatch(/最終承認/i)
      expect(res.text).toMatch(/戻る/i)
    })

    test('一般ユーザ、契約ステータス：変更受付、承認者の場合', async () => {
      const res = await request(app)
        .get(redirectUrl)
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
        .expect(200)

      // 画面内容確認
      expect(res.text).toMatch(/支払依頼/i)
      expect(res.text).toMatch(/承認ルート名/i)
      expect(res.text).toMatch(/integrationApproveRoute/i)
      expect(res.text).toMatch(/承認順/i)
      expect(res.text).toMatch(/担当者名/i)
      expect(res.text).toMatch(/承認状況/i)
      expect(res.text).toMatch(/依頼済み/i)
      expect(res.text).toMatch(/一次承認/i)
      expect(res.text).toMatch(/処理中/i)
      expect(res.text).toMatch(/最終承認/i)
      expect(res.text).toMatch(/戻る/i)
    })
  })

  describe('7.契約ステータス：解約申込', () => {
    // テナントステータスが「解約申込」、パラメータがない場合
    test('管理者、契約ステータス：解約申込、パラメータがない場合-利用不可', async () => {
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
        .get('/approvalInbox')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(400)

      // 画面内容確認
      expect(res.text).toMatch(/不正なページからアクセスされたか、セッションタイムアウトが発生しました。/i)
    })

    test('一般ユーザ、契約ステータス：解約申込、パラメータがない場合-利用不可', async () => {
      const res = await request(app)
        .get('/approvalInbox')
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
        .expect(400)

      // 画面内容確認
      expect(res.text).toMatch(/不正なページからアクセスされたか、セッションタイムアウトが発生しました。/i)
    })

    test('管理者、契約ステータス：解約申込、承認者ではない場合-利用不可', async () => {
      const res = await request(app)
        .get(redirectUrl)
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(200)

      // 画面内容確認
      expect(res.text).toMatch(/現在解約手続き中です。/i)
    })

    test('一般ユーザ、契約ステータス：解約申込、承認者の場合-利用不可', async () => {
      const res = await request(app)
        .get(redirectUrl)
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
        .expect(200)

      // 画面内容確認
      expect(res.text).toMatch(/現在解約手続き中です。/i)
    })
  })

  describe('8.契約ステータス：解約受付', () => {
    // テナントステータスが「解約受付」、パラメータがない場合
    test('管理者、契約ステータス：解約受付、パラメータがない場合-利用不可', async () => {
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
        .get('/approvalInbox')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(400)

      // 画面内容確認
      expect(res.text).toMatch(/不正なページからアクセスされたか、セッションタイムアウトが発生しました。/i)
    })

    test('一般ユーザ、契約ステータス：解約受付、パラメータがない場合-利用不可', async () => {
      const res = await request(app)
        .get('/approvalInbox')
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
        .expect(400)

      // 画面内容確認
      expect(res.text).toMatch(/不正なページからアクセスされたか、セッションタイムアウトが発生しました。/i)
    })

    test('管理者、契約ステータス：解約受付、承認者ではない場合-利用不可', async () => {
      const res = await request(app)
        .get(redirectUrl)
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(200)

      // 画面内容確認
      expect(res.text).toMatch(/現在解約手続き中です。/i)
    })

    test('一般ユーザ、契約ステータス：解約受付、承認者の場合-利用不可', async () => {
      const res = await request(app)
        .get(redirectUrl)
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
        .expect(200)

      // 画面内容確認
      expect(res.text).toMatch(/現在解約手続き中です。/i)
    })
  })

  describe('9.契約ステータス：解約', () => {
    // テナントステータスが「解約」、パラメータがない場合
    test('管理者、契約ステータス：解約、パラメータがない場合-利用不可', async () => {
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
        .get('/approvalInbox')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(400)

      // 画面内容確認
      expect(res.text).toMatch(/不正なページからアクセスされたか、セッションタイムアウトが発生しました。/i)
    })

    test('一般ユーザ、契約ステータス：解約受付、パラメータがない場合-利用不可', async () => {
      const res = await request(app)
        .get('/approvalInbox')
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
      const contract = await db.Contract.findOne({
        where: {
          tenantId: testTenantId
        }
      })

      const requestId = await db.RequestApproval.findOne({
        where: {
          contractId: contract.contractId
        }
      })

      if (requestId.length !== 0) {
        await db.Approval.destroy({ where: { requestId: requestId.requestId } })
        await db.RequestApproval.destroy({ where: { contractId: contract.contractId } })
      }
      await db.User.destroy({ where: { tenantId: testTenantId } })
      await db.Tenant.destroy({ where: { tenantId: testTenantId } })
    })
  })
})
