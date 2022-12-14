'use strict'
const app = require('../../Application/app')
const request = require('supertest')
const { JSDOM } = require('jsdom')
const db = require('../../Application/models')
const getTenantId = {}

jest.setTimeout(60000) // jestのタイムアウトを60秒とする

const getCookies = require('./getCookies')

describe('請求書アップロードフォーマット一覧のインテグレーションテスト', () => {
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
    // 利用登録をしていないため、請求書ダウンロードページ利用できない
    test('管理者、契約ステータス：未登録、利用不可', async () => {
      const res = await request(app)
        .get('/csvDownload')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(500)

      expect(res.text).toMatch(/上部メニューのHOMEボタンを押下し、トップページへお戻りください。/i) // タイトル
    })

    test('一般ユーザ、契約ステータス：未登録、利用不可', async () => {
      const res = await request(app)
        .get('/csvDownload')
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
        .expect(500)

      expect(res.text).toMatch(/上部メニューのHOMEボタンを押下し、トップページへお戻りください。/i) // タイトル
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

  describe('3.契約ステータス：登録申込', () => {
    test('管理者、契約ステータス：登録申込、利用可能', async () => {
      const res = await request(app)
        .get('/csvDownload')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(200)

      expect(res.text).toMatch(/- BConnectionデジタルトレード/i) // タイトルが含まれていること
      expect(res.text).toMatch(/請求書番号/i) // 請求書番号ラベルがあること
      expect(res.text).toMatch(/ステータス/i) // ステータスラベルがあること
      expect(res.text).toMatch(/送信済み\/受信済み/i) // ステータスリスト確認
      expect(res.text).toMatch(/受理済み/i) // ステータスリスト確認
      expect(res.text).toMatch(/送金済み/i) // ステータスリスト確認
      expect(res.text).toMatch(/入金確認済み/i) // ステータスリスト確認
      expect(res.text).toMatch(/販売\/購入/i) // 販売/購入ラベルがあること
      expect(res.text).toMatch(/発行日/i) // 発行日ラベルがあること
      expect(res.text).toMatch(/送信企業/i) // 送信企業ラベルがあること
      expect(res.text).toMatch(/受信企業/i) // 受信企業ラベルがあること
    })

    test('一般ユーザ、契約ステータス：登録申込、利用可能', async () => {
      const res = await request(app)
        .get('/csvDownload')
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
        .expect(200)

      expect(res.text).toMatch(/- BConnectionデジタルトレード/i) // タイトルが含まれていること
      expect(res.text).toMatch(/請求書番号/i) // 請求書番号ラベルがあること
      expect(res.text).toMatch(/ステータス/i) // ステータスラベルがあること
      expect(res.text).toMatch(/送信済み\/受信済み/i) // ステータスリスト確認
      expect(res.text).toMatch(/受理済み/i) // ステータスリスト確認
      expect(res.text).toMatch(/送金済み/i) // ステータスリスト確認
      expect(res.text).toMatch(/入金確認済み/i) // ステータスリスト確認
      expect(res.text).toMatch(/販売\/購入/i) // 販売/購入ラベルがあること
      expect(res.text).toMatch(/発行日/i) // 発行日ラベルがあること
      expect(res.text).toMatch(/送信企業/i) // 送信企業ラベルがあること
      expect(res.text).toMatch(/受信企業/i) // 受信企業ラベルがあること
    })
  })

  describe('4.契約ステータス：登録受付', () => {
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
        .get('/csvDownload')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(200)

      expect(res.text).toMatch(/- BConnectionデジタルトレード/i) // タイトルが含まれていること
      expect(res.text).toMatch(/請求書番号/i) // 請求書番号ラベルがあること
      expect(res.text).toMatch(/ステータス/i) // ステータスラベルがあること
      expect(res.text).toMatch(/送信済み\/受信済み/i) // ステータスリスト確認
      expect(res.text).toMatch(/受理済み/i) // ステータスリスト確認
      expect(res.text).toMatch(/送金済み/i) // ステータスリスト確認
      expect(res.text).toMatch(/入金確認済み/i) // ステータスリスト確認
      expect(res.text).toMatch(/販売\/購入/i) // 販売/購入ラベルがあること
      expect(res.text).toMatch(/発行日/i) // 発行日ラベルがあること
      expect(res.text).toMatch(/送信企業/i) // 送信企業ラベルがあること
      expect(res.text).toMatch(/受信企業/i) // 受信企業ラベルがあること
    })

    test('一般ユーザ、契約ステータス：登録受付、利用可能', async () => {
      const res = await request(app)
        .get('/csvDownload')
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
        .expect(200)

      expect(res.text).toMatch(/- BConnectionデジタルトレード/i) // タイトルが含まれていること
      expect(res.text).toMatch(/請求書番号/i) // 請求書番号ラベルがあること
      expect(res.text).toMatch(/ステータス/i) // ステータスラベルがあること
      expect(res.text).toMatch(/送信済み\/受信済み/i) // ステータスリスト確認
      expect(res.text).toMatch(/受理済み/i) // ステータスリスト確認
      expect(res.text).toMatch(/送金済み/i) // ステータスリスト確認
      expect(res.text).toMatch(/入金確認済み/i) // ステータスリスト確認
      expect(res.text).toMatch(/販売\/購入/i) // 販売/購入ラベルがあること
      expect(res.text).toMatch(/発行日/i) // 発行日ラベルがあること
      expect(res.text).toMatch(/送信企業/i) // 送信企業ラベルがあること
      expect(res.text).toMatch(/受信企業/i) // 受信企業ラベルがあること
    })
  })

  describe('5.契約ステータス：契約中', () => {
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
        .get('/csvDownload')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(200)

      expect(res.text).toMatch(/- BConnectionデジタルトレード/i) // タイトルが含まれていること
      expect(res.text).toMatch(/請求書番号/i) // 請求書番号ラベルがあること
      expect(res.text).toMatch(/ステータス/i) // ステータスラベルがあること
      expect(res.text).toMatch(/送信済み\/受信済み/i) // ステータスリスト確認
      expect(res.text).toMatch(/受理済み/i) // ステータスリスト確認
      expect(res.text).toMatch(/送金済み/i) // ステータスリスト確認
      expect(res.text).toMatch(/入金確認済み/i) // ステータスリスト確認
      expect(res.text).toMatch(/販売\/購入/i) // 販売/購入ラベルがあること
      expect(res.text).toMatch(/発行日/i) // 発行日ラベルがあること
      expect(res.text).toMatch(/送信企業/i) // 送信企業ラベルがあること
      expect(res.text).toMatch(/受信企業/i) // 受信企業ラベルがあること
    })

    test('一般ユーザ、契約ステータス：契約中、利用可能', async () => {
      const res = await request(app)
        .get('/csvDownload')
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
        .expect(200)

      expect(res.text).toMatch(/- BConnectionデジタルトレード/i) // タイトルが含まれていること
      expect(res.text).toMatch(/請求書番号/i) // 請求書番号ラベルがあること
      expect(res.text).toMatch(/ステータス/i) // ステータスラベルがあること
      expect(res.text).toMatch(/送信済み\/受信済み/i) // ステータスリスト確認
      expect(res.text).toMatch(/受理済み/i) // ステータスリスト確認
      expect(res.text).toMatch(/送金済み/i) // ステータスリスト確認
      expect(res.text).toMatch(/入金確認済み/i) // ステータスリスト確認
      expect(res.text).toMatch(/販売\/購入/i) // 販売/購入ラベルがあること
      expect(res.text).toMatch(/発行日/i) // 発行日ラベルがあること
      expect(res.text).toMatch(/送信企業/i) // 送信企業ラベルがあること
      expect(res.text).toMatch(/受信企業/i) // 受信企業ラベルがあること
    })

    // 送信企業ボタン確認
    test('送信企業ボタン確認（全選択、全解除）', async () => {
      const puppeteer = require('puppeteer')
      const browser = await puppeteer.launch({
        headless: true,
        ignoreHTTPSErrors: true
      })

      await db.Contract.update({ contractStatus: '00' }, { where: { tenantId: testTenantId } })
      const page = await browser.newPage()
      await page.setCookie(acCookies[0])
      await page.goto('https://localhost:3000/csvDownload')
      if (page.url() === 'https://localhost:3000/csvDownload') {
        await page.click('#sendToSearchBtn')

        await page.waitForTimeout(2000)

        // 全選択ボタン確認
        const checkAllSelectSentToBtn = await page.evaluate(() => {
          return document.querySelector('#allSelectSentToBtn').innerText
        })
        expect(checkAllSelectSentToBtn).toBe('全選択')

        // 全解除ボタン確認
        const checkAllClearSentToBtn = await page.evaluate(() => {
          return document.querySelector('#allClearSentToBtn').innerText
        })
        expect(checkAllClearSentToBtn).toBe('全解除')
      }

      await browser.close()
    })

    // 受信企業ボタン確認
    test('受信企業ボタン確認（全選択、全解除）', async () => {
      const puppeteer = require('puppeteer')
      const browser = await puppeteer.launch({
        headless: true,
        ignoreHTTPSErrors: true
      })

      await db.Contract.update({ contractStatus: '00' }, { where: { tenantId: testTenantId } })
      const page = await browser.newPage()
      await page.setCookie(acCookies[0])
      await page.goto('https://localhost:3000/csvDownload')
      if (page.url() === 'https://localhost:3000/csvDownload') {
        await page.click('#sendBySearchBtn')

        await page.waitForTimeout(2000)

        // 全選択ボタン確認
        const checkAllSelectSentByBtn = await page.evaluate(() => {
          return document.querySelector('#allSelectSentByBtn').innerText
        })
        expect(checkAllSelectSentByBtn).toBe('全選択')

        // 全解除ボタン確認
        const checkAllClearSentByBtn = await page.evaluate(() => {
          return document.querySelector('#allClearSentByBtn').innerText
        })
        expect(checkAllClearSentByBtn).toBe('全解除')
      }

      await browser.close()
    })
  })

  describe('6.契約ステータス：変更申込', () => {
    test('管理者、契約ステータス：変更申込、利用可能', async () => {
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
        .get('/csvDownload')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(200)

      expect(res.text).toMatch(/- BConnectionデジタルトレード/i) // タイトルが含まれていること
      expect(res.text).toMatch(/請求書番号/i) // 請求書番号ラベルがあること
      expect(res.text).toMatch(/ステータス/i) // ステータスラベルがあること
      expect(res.text).toMatch(/送信済み\/受信済み/i) // ステータスリスト確認
      expect(res.text).toMatch(/受理済み/i) // ステータスリスト確認
      expect(res.text).toMatch(/送金済み/i) // ステータスリスト確認
      expect(res.text).toMatch(/入金確認済み/i) // ステータスリスト確認
      expect(res.text).toMatch(/販売\/購入/i) // 販売/購入ラベルがあること
      expect(res.text).toMatch(/発行日/i) // 発行日ラベルがあること
      expect(res.text).toMatch(/送信企業/i) // 送信企業ラベルがあること
      expect(res.text).toMatch(/受信企業/i) // 受信企業ラベルがあること
    })

    test('一般ユーザ、契約ステータス：変更申込、利用可能', async () => {
      const res = await request(app)
        .get('/csvDownload')
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
        .expect(200)

      expect(res.text).toMatch(/- BConnectionデジタルトレード/i) // タイトルが含まれていること
      expect(res.text).toMatch(/請求書番号/i) // 請求書番号ラベルがあること
      expect(res.text).toMatch(/ステータス/i) // ステータスラベルがあること
      expect(res.text).toMatch(/送信済み\/受信済み/i) // ステータスリスト確認
      expect(res.text).toMatch(/受理済み/i) // ステータスリスト確認
      expect(res.text).toMatch(/送金済み/i) // ステータスリスト確認
      expect(res.text).toMatch(/入金確認済み/i) // ステータスリスト確認
      expect(res.text).toMatch(/販売\/購入/i) // 販売/購入ラベルがあること
      expect(res.text).toMatch(/発行日/i) // 発行日ラベルがあること
      expect(res.text).toMatch(/送信企業/i) // 送信企業ラベルがあること
      expect(res.text).toMatch(/受信企業/i) // 受信企業ラベルがあること
    })
  })

  describe('7.契約ステータス：変更受付', () => {
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
        .get('/csvDownload')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(200)

      expect(res.text).toMatch(/- BConnectionデジタルトレード/i) // タイトルが含まれていること
      expect(res.text).toMatch(/請求書番号/i) // 請求書番号ラベルがあること
      expect(res.text).toMatch(/ステータス/i) // ステータスラベルがあること
      expect(res.text).toMatch(/送信済み\/受信済み/i) // ステータスリスト確認
      expect(res.text).toMatch(/受理済み/i) // ステータスリスト確認
      expect(res.text).toMatch(/送金済み/i) // ステータスリスト確認
      expect(res.text).toMatch(/入金確認済み/i) // ステータスリスト確認
      expect(res.text).toMatch(/販売\/購入/i) // 販売/購入ラベルがあること
      expect(res.text).toMatch(/発行日/i) // 発行日ラベルがあること
      expect(res.text).toMatch(/送信企業/i) // 送信企業ラベルがあること
      expect(res.text).toMatch(/受信企業/i) // 受信企業ラベルがあること
    })

    test('一般ユーザ、契約ステータス：変更受付、利用可能', async () => {
      const res = await request(app)
        .get('/csvDownload')
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
        .expect(200)

      expect(res.text).toMatch(/- BConnectionデジタルトレード/i) // タイトルが含まれていること
      expect(res.text).toMatch(/請求書番号/i) // 請求書番号ラベルがあること
      expect(res.text).toMatch(/ステータス/i) // ステータスラベルがあること
      expect(res.text).toMatch(/送信済み\/受信済み/i) // ステータスリスト確認
      expect(res.text).toMatch(/受理済み/i) // ステータスリスト確認
      expect(res.text).toMatch(/送金済み/i) // ステータスリスト確認
      expect(res.text).toMatch(/入金確認済み/i) // ステータスリスト確認
      expect(res.text).toMatch(/販売\/購入/i) // 販売/購入ラベルがあること
      expect(res.text).toMatch(/発行日/i) // 発行日ラベルがあること
      expect(res.text).toMatch(/送信企業/i) // 送信企業ラベルがあること
      expect(res.text).toMatch(/受信企業/i) // 受信企業ラベルがあること
    })
  })

  describe('8.契約ステータス：解約申込', () => {
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
        .get('/csvDownload')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(200)

      expect(res.text).toMatch(/現在解約手続き中です。/i) // 画面内容確認
    })

    test('一般ユーザ、契約ステータス：解約申込、利用不可', async () => {
      const res = await request(app)
        .get('/csvDownload')
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
        .expect(200)

      expect(res.text).toMatch(/現在解約手続き中です。/i) // 画面内容確認
    })
  })

  describe('9.契約ステータス：解約受付', () => {
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
        .get('/csvDownload')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(200)

      expect(res.text).toMatch(/現在解約手続き中です。/i) // 画面内容確認
    })

    test('一般ユーザ、契約ステータス：解約受付、利用不可', async () => {
      const res = await request(app)
        .get('/csvDownload')
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
        .expect(200)

      expect(res.text).toMatch(/現在解約手続き中です。/i) // 画面内容確認
    })
  })

  describe('10.契約ステータス：解約', () => {
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
        .get('/csvDownload')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(500)

      expect(res.text).toMatch(/上部メニューのHOMEボタンを押下し、トップページへお戻りください。/i) // 画面内容確認
    })

    test('一般ユーザ、契約ステータス：解約、利用不可', async () => {
      const res = await request(app)
        .get('/csvDownload')
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
        .expect(500)

      expect(res.text).toMatch(/上部メニューのHOMEボタンを押下し、トップページへお戻りください。/i) // 画面内容確認
    })
  })

  describe('後処理', () => {
    test('userデータ削除', async () => {
      await db.User.destroy({ where: { tenantId: testTenantId } })
      await db.Tenant.destroy({ where: { tenantId: testTenantId } })
    })
  })
})
