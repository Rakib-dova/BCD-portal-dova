'use strict'
const app = require('../../Application/app')
const request = require('supertest')
const { JSDOM } = require('jsdom')
const db = require('../../Application/models')
const getTenantId = {}

jest.setTimeout(60000) // jestのタイムアウトを60秒とする

const getCookies = require('./getCookies')

describe('承認ルート一覧のインテグレーションテスト', () => {
  let acCookies
  let userCookies
  let testTenantId
  let userId

  describe('0.前準備', () => {
    test('/authにアクセス：oauth2認証をし、セッション用Cookieを取得', async () => {
      // アカウント管理者と一般ユーザのID/SECRETは、テストコマンドの引数から取得
      const options = require('minimist')(process.argv.slice(2))
      const adminId = options.adminid
      const adminSecret = options.adminsecret
      userId = options.userid
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
    // 利用登録をしていないため、承認ルート一覧ページ利用できない
    test('管理者、契約ステータス：未登録、利用不可', async () => {
      const res = await request(app)
        .get('/approveRouteList')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(500)

      // 画面内容確認
      expect(res.text).toMatch(/お探しのページは見つかりませんでした。/i)
    })

    test('一般ユーザ、契約ステータス：未登録、利用不可', async () => {
      const res = await request(app)
        .get('/approveRouteList')
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
        .expect(500)

      // 画面内容確認
      expect(res.text).toMatch(/お探しのページは見つかりませんでした。/i)
    })
  })

  describe('2.契約ステータス：新規登録', () => {
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

  describe('3.契約ステータス：登録申込', () => {
    // テナントステータスが「新規申込」、承認ルート一覧ページ利用可能
    test('管理者、契約ステータス：登録申込、利用可能', async () => {
      const res = await request(app)
        .get('/approveRouteList')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(200)

      // 画面内容確認
      expect(res.text).toMatch(/承認ルート一覧/i)
      expect(res.text).toMatch(/新規登録する/i)
      expect(res.text).toMatch(/←Homeへ戻る/i)
    })

    test('一般ユーザ、契約ステータス：登録申込、利用可能', async () => {
      const res = await request(app)
        .get('/approveRouteList')
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
        .expect(200)

      // 画面内容確認
      expect(res.text).toMatch(/承認ルート一覧/i)
      expect(res.text).toMatch(/新規登録する/i)
      expect(res.text).toMatch(/←Homeへ戻る/i)
    })
  })

  describe('4.契約ステータス：登録受付', () => {
    // テナントステータスが「新規受付」、承認ルート一覧ページ利用可能
    test('管理者、契約ステータス：登録受付、利用可能', async () => {
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
        .get('/approveRouteList')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(200)

      // 画面内容確認
      expect(res.text).toMatch(/承認ルート一覧/i)
      expect(res.text).toMatch(/新規登録する/i)
      expect(res.text).toMatch(/←Homeへ戻る/i)
    })

    test('一般ユーザ、契約ステータス：登録受付、利用可能', async () => {
      const res = await request(app)
        .get('/approveRouteList')
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
        .expect(200)

      // 画面内容確認
      expect(res.text).toMatch(/承認ルート一覧/i)
      expect(res.text).toMatch(/新規登録する/i)
      expect(res.text).toMatch(/←Homeへ戻る/i)
    })
  })

  describe('5.契約ステータス：契約中', () => {
    // テナントステータスが「契約中」、承認ルート一覧ページ利用可能
    test('管理者、契約ステータス：契約中、利用可能', async () => {
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
        .get('/approveRouteList')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(200)

      // 画面内容確認
      expect(res.text).toMatch(/承認ルート一覧/i)
      expect(res.text).toMatch(/新規登録する/i)
      expect(res.text).toMatch(/←Homeへ戻る/i)
    })

    test('一般ユーザ、契約ステータス：契約中、利用可能', async () => {
      const res = await request(app)
        .get('/approveRouteList')
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
        .expect(200)

      // 画面内容確認
      expect(res.text).toMatch(/承認ルート一覧/i)
      expect(res.text).toMatch(/新規登録する/i)
      expect(res.text).toMatch(/←Homeへ戻る/i)
    })

    // 機能・遷移確認
    test('登録した承認ルートが１件もない場合、画面確認', async () => {
      const res = await request(app)
        .get('/approveRouteList')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(200)

      // 画面内容確認
      expect(res.text).toMatch(/承認ルート一覧/i)
      expect(res.text).toMatch(/新規登録する/i)
      expect(res.text).toMatch(/現在、承認ルートはありません。/i)
      expect(res.text).toMatch(/新規登録するボタンから登録を行って下さい。/i)

      expect(res.text).toMatch(/←Homeへ戻る/i)
    })

    test('「新規登録する」ボタン遷移確認（承認ルート登録画面に遷移）', async () => {
      const puppeteer = require('puppeteer')
      const browser = await puppeteer.launch({
        headless: true,
        ignoreHTTPSErrors: true
      })

      const page = await browser.newPage()
      await page.setCookie(acCookies[0])
      await page.goto('https://localhost:3000/approveRouteList')
      if (page.url() === 'https://localhost:3000/approveRouteList') {
        await page.click('body > div.max-width > div > div > a')

        await page.waitForTimeout(500)

        // 承認ルート登録画面に遷移確認
        expect(await page.url()).toBe('https://localhost:3000/registApproveRoute')
      }
      await browser.close()
    })

    test('登録した承認ルートがある場合、画面確認', async () => {
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
        deleteFlag: 0
      })
      await testApproveRoute.save()

      const testApproveUser = new db.ApproveUser({
        approveRouteId: testApproveRoute.approveRouteId,
        approveUser: userId,
        prevApproveUser: null,
        nextApproveUser: null,
        isLastApproveUser: 0
      })
      await testApproveUser.save()

      const res = await request(app)
        .get('/approveRouteList')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(200)

      // 画面内容確認
      expect(res.text).toMatch(/承認ルート一覧/i)
      expect(res.text).toMatch(/新規登録する/i)
      expect(res.text).toMatch(/No/i)
      expect(res.text).toMatch(/承認ルート名/i)
      expect(res.text).toMatch(/integrationApproveRoute/i)
      expect(res.text).toMatch(/登録されている承認者数/i)
      expect(res.text).toMatch(/1/i)
      expect(res.text).toMatch(/確認・変更する/i)
      expect(res.text).toMatch(/削除/i)
      expect(res.text).toMatch(/非表示/i)
      expect(res.text).toMatch(/←Homeへ戻る/i)
    })

    test('承認ルート登録画面「戻る」ボタン遷移確認（承認ルート一覧画面に遷移）', async () => {
      const puppeteer = require('puppeteer')
      const browser = await puppeteer.launch({
        headless: true,
        ignoreHTTPSErrors: true
      })

      const page = await browser.newPage()
      await page.setCookie(acCookies[0])
      await page.goto('https://localhost:3000/registApproveRoute')
      if (page.url() === 'https://localhost:3000/registApproveRoute') {
        await page.click('#form > article > div > div > div.grouped-button > a.button.mr-6')

        await page.waitForTimeout(500)

        // 承認ルート一覧画面に遷移確認
        expect(await page.url()).toBe('https://localhost:3000/approveRouteList')
      }
      await browser.close()
    })
  })

  describe('6.契約ステータス：変更申込', () => {
    // テナントステータスが「変更申込」、承認ルート一覧ページ利用可能
    test('管理者、契約ステータス：変更申込、利用可能', async () => {
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
        .get('/approveRouteList')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(200)

      // 画面内容確認
      expect(res.text).toMatch(/承認ルート一覧/i)
      expect(res.text).toMatch(/←Homeへ戻る/i)
    })

    test('一般ユーザ、契約ステータス：変更申込、利用可能', async () => {
      const res = await request(app)
        .get('/approveRouteList')
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
        .expect(200)

      // 画面内容確認
      expect(res.text).toMatch(/承認ルート一覧/i)
      expect(res.text).toMatch(/←Homeへ戻る/i)
    })
  })

  describe('7.契約ステータス：変更受付', () => {
    // テナントステータスが「変更受付」、承認ルート一覧ページ利用可能
    test('管理者、契約ステータス：変更受付、利用可能', async () => {
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
        .get('/approveRouteList')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(200)

      // 画面内容確認
      expect(res.text).toMatch(/承認ルート一覧/i)
      expect(res.text).toMatch(/←Homeへ戻る/i)
    })

    test('一般ユーザ、契約ステータス：変更受付、利用可能', async () => {
      const res = await request(app)
        .get('/approveRouteList')
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
        .expect(200)

      // 画面内容確認
      expect(res.text).toMatch(/承認ルート一覧/i)
      expect(res.text).toMatch(/←Homeへ戻る/i)
    })
  })

  describe('8.契約ステータス：解約申込', () => {
    // テナントステータスが「解約申込」、承認ルート一覧ページ利用不可
    test('管理者、契約ステータス：解約申込、利用不可', async () => {
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
        .get('/approveRouteList')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(200)

      // 画面内容確認
      expect(res.text).toMatch(/現在解約手続き中です。/i)
    })

    test('一般ユーザ、契約ステータス：解約申込、利用不可', async () => {
      const res = await request(app)
        .get('/approveRouteList')
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
        .expect(200)

      // 画面内容確認
      expect(res.text).toMatch(/現在解約手続き中です。/i)
    })
  })

  describe('9.契約ステータス：解約受付', () => {
    // テナントステータスが「解約受付」、承認ルート一覧ページ利用不可
    test('管理者、契約ステータス：解約受付、利用不可', async () => {
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
        .get('/approveRouteList')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(200)

      // 画面内容確認
      expect(res.text).toMatch(/現在解約手続き中です。/i)
    })

    test('一般ユーザ、契約ステータス：解約受付、利用不可', async () => {
      const res = await request(app)
        .get('/approveRouteList')
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
        .expect(200)

      // 画面内容確認
      expect(res.text).toMatch(/現在解約手続き中です。/i)
    })
  })

  describe('10.契約ステータス：解約', () => {
    // テナントステータスが「解約」、承認ルート一覧ページ利用不可
    test('管理者、契約ステータス：解約、利用不可', async () => {
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
        .get('/approveRouteList')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(500)

      // 画面内容確認
      expect(res.text).toMatch(/お探しのページは見つかりませんでした。/i)
    })

    test('一般ユーザ、契約ステータス：解約、利用不可', async () => {
      const res = await request(app)
        .get('/approveRouteList')
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
