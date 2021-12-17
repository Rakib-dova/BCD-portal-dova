'use strict'
const app = require('../../Application/app')
const request = require('supertest')
const { JSDOM } = require('jsdom')
const db = require('../../Application/models')
const getTenantId = {}

jest.setTimeout(60000) // jestのタイムアウトを60秒とする

const getCookies = require('./getCookies')

describe('補助科目作成のインテグレーションテスト', () => {
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
    // 利用登録をしていないため、補助科目作成ページ利用できない
    test('管理者、契約ステータス：未登録、利用不可', async () => {
      const res = await request(app)
        .get('/registSubAccountCode')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(500)

      // 画面内容確認
      expect(res.text).toMatch(/お探しのページは見つかりませんでした。/i)
    })

    // 利用登録をしていないため、補助科目作成ページ利用できない
    test('一般ユーザ、契約ステータス：未登録、利用不可', async () => {
      const res = await request(app)
        .get('/registSubAccountCode')
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
    // テナントステータスが「新規申込」、補助科目作成ページ利用可能
    test('管理者、契約ステータス：登録申込、利用可能', async () => {
      const res = await request(app)
        .get('/registSubAccountCode')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(200)

      // 画面内容確認
      expect(res.text).toMatch(/補助科目/i)
      expect(res.text).toMatch(/検索/i)
      expect(res.text).toMatch(/補助科目コード/i)
      expect(res.text).toMatch(/補助科目名/i)
    })

    test('一般ユーザ、契約ステータス：登録申込、利用可能', async () => {
      const res = await request(app)
        .get('/registSubAccountCode')
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
        .expect(200)

      // 画面内容確認
      expect(res.text).toMatch(/補助科目/i)
      expect(res.text).toMatch(/検索/i)
      expect(res.text).toMatch(/補助科目コード/i)
      expect(res.text).toMatch(/補助科目名/i)
    })
  })

  describe('4.契約ステータス：登録受付', () => {
    // テナントステータスが「新規受付」、補助科目作成ページ利用可能
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
        .get('/registSubAccountCode')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(200)

      // 画面内容確認
      expect(res.text).toMatch(/補助科目/i)
      expect(res.text).toMatch(/検索/i)
      expect(res.text).toMatch(/補助科目コード/i)
      expect(res.text).toMatch(/補助科目名/i)
    })

    test('一般ユーザ、契約ステータス：登録受付、利用可能', async () => {
      const res = await request(app)
        .get('/registSubAccountCode')
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
        .expect(200)

      // 画面内容確認
      expect(res.text).toMatch(/補助科目/i)
      expect(res.text).toMatch(/検索/i)
      expect(res.text).toMatch(/補助科目コード/i)
      expect(res.text).toMatch(/補助科目名/i)
    })
  })

  describe('5.契約ステータス：契約中', () => {
    // テナントステータスが「契約中」、補助科目作成ページ利用可能
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
        .get('/registSubAccountCode')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(200)

      // 画面内容確認
      expect(res.text).toMatch(/補助科目/i)
      expect(res.text).toMatch(/検索/i)
      expect(res.text).toMatch(/補助科目コード/i)
      expect(res.text).toMatch(/補助科目名/i)
    })

    test('一般ユーザ、契約ステータス：契約中、利用可能', async () => {
      const res = await request(app)
        .get('/registSubAccountCode')
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
        .expect(200)

      // 画面内容確認
      expect(res.text).toMatch(/補助科目/i)
      expect(res.text).toMatch(/検索/i)
      expect(res.text).toMatch(/補助科目コード/i)
      expect(res.text).toMatch(/補助科目名/i)
    })

    // バリデーションチェック

    // 補助科目コード未入力
    test('バリデーションチェック、補助科目コード未入力', async () => {
      const puppeteer = require('puppeteer')
      const browser = await puppeteer.launch({
        headless: true,
        ignoreHTTPSErrors: true
      })

      const page = await browser.newPage()
      await page.setCookie(acCookies[0])
      await page.goto('https://localhost:3000/registSubAccountCode')
      if (page.url() === 'https://localhost:3000/registSubAccountCode') {
        await page.type('#setSubAccountCodeInputId', '')
        await page.type('#setSubAccountCodeNameInputId', 'インテグレーションテスト')

        await page.waitForTimeout(500)

        await page.click('#btnCheck')

        // エラーメッセージが表示されること確認
        const checkErrorMessage = await page.evaluate(() => {
          return document.querySelector('#RequiredErrorMesageForCode').getAttribute('class')
        })

        expect(checkErrorMessage).toBe('input-label-required')
      }
      await browser.close()
    })

    // 補助科目コード11桁以上の場合（英語）
    test('バリデーションチェック、補助科目コード11桁以上の場合（英語）', async () => {
      const puppeteer = require('puppeteer')
      const browser = await puppeteer.launch({
        headless: true,
        ignoreHTTPSErrors: true
      })

      const page = await browser.newPage()
      await page.setCookie(acCookies[0])
      await page.goto('https://localhost:3000/registSubAccountCode')
      if (page.url() === 'https://localhost:3000/registSubAccountCode') {
        await page.type('#setSubAccountCodeInputId', 'intgrationTest')
        await page.type('#setSubAccountCodeNameInputId', '')

        await page.waitForTimeout(500)

        await page.click('#btnCheck')

        // 入力値が変わっていること確認
        const checkSetSubAccountCodeInputId = await page.evaluate(() => {
          return document.querySelector('#setSubAccountCodeInputId').value
        })

        expect(checkSetSubAccountCodeInputId.length).toBe(10)
        expect(checkSetSubAccountCodeInputId).toBe('intgration')
      }
      await browser.close()
    })

    // 補助科目コード11桁以上の場合（数字）
    test('バリデーションチェック、補助科目コード11桁以上の場合（数字）', async () => {
      const puppeteer = require('puppeteer')
      const browser = await puppeteer.launch({
        headless: true,
        ignoreHTTPSErrors: true
      })

      const page = await browser.newPage()
      await page.setCookie(acCookies[0])
      await page.goto('https://localhost:3000/registSubAccountCode')
      if (page.url() === 'https://localhost:3000/registSubAccountCode') {
        await page.type('#setSubAccountCodeInputId', '12345678901234567890')
        await page.type('#setSubAccountCodeNameInputId', '')

        await page.waitForTimeout(500)

        await page.click('#btnCheck')

        // 入力値が変わっていること確認
        const checkSetSubAccountCodeInputId = await page.evaluate(() => {
          return document.querySelector('#setSubAccountCodeInputId').value
        })

        expect(checkSetSubAccountCodeInputId.length).toBe(10)
        expect(checkSetSubAccountCodeInputId).toBe('1234567890')
      }
      await browser.close()
    })

    // 補助科目コード11桁以上の場合（英・数字）
    test('バリデーションチェック、補助科目コード11桁以上の場合（英・数字）', async () => {
      const puppeteer = require('puppeteer')
      const browser = await puppeteer.launch({
        headless: true,
        ignoreHTTPSErrors: true
      })

      const page = await browser.newPage()
      await page.setCookie(acCookies[0])
      await page.goto('https://localhost:3000/registSubAccountCode')
      if (page.url() === 'https://localhost:3000/registSubAccountCode') {
        await page.type('#setSubAccountCodeInputId', 'test1234567890')
        await page.type('#setSubAccountCodeNameInputId', '')

        await page.waitForTimeout(500)

        await page.click('#btnCheck')

        // 入力値が変わっていること確認
        const checkSetSubAccountCodeInputId = await page.evaluate(() => {
          return document.querySelector('#setSubAccountCodeInputId').value
        })

        expect(checkSetSubAccountCodeInputId.length).toBe(10)
        expect(checkSetSubAccountCodeInputId).toBe('test123456')
      }
      await browser.close()
    })

    // 補助科目コードをコンソールで11桁以上を入力した場合
    test('バリデーションチェック、補助科目コードをコンソールで11桁以上を入力した場合', async () => {
      const puppeteer = require('puppeteer')
      const browser = await puppeteer.launch({
        headless: true,
        ignoreHTTPSErrors: true
      })

      const page = await browser.newPage()
      await page.setCookie(acCookies[0])
      await page.goto('https://localhost:3000/registSubAccountCode')
      if (page.url() === 'https://localhost:3000/registSubAccountCode') {
        await page.evaluate(() => (document.querySelector('#setSubAccountCodeInputId').value = 'test1234567890'))
        await page.type('#setSubAccountCodeNameInputId', 'test')

        await page.waitForTimeout(500)

        await page.click('#btnCheck')

        // エラーメッセージが表示されること確認
        const checkErrorMessage = await page.evaluate(() => {
          return document.querySelector('#RequiredErrorMesageForCode').getAttribute('class')
        })

        expect(checkErrorMessage).toBe('input-label-required')
      }
      await browser.close()
    })

    // 補助科目コード英・数字以外入力
    test('バリデーションチェック、補助科目コード英・数字以外入力', async () => {
      const puppeteer = require('puppeteer')
      const browser = await puppeteer.launch({
        headless: true,
        ignoreHTTPSErrors: true
      })

      const page = await browser.newPage()
      await page.setCookie(acCookies[0])
      await page.goto('https://localhost:3000/registSubAccountCode')
      if (page.url() === 'https://localhost:3000/registSubAccountCode') {
        await page.type('#setSubAccountCodeInputId', 'テスト')
        await page.type('#setSubAccountCodeNameInputId', 'インテグレーションテスト')

        await page.waitForTimeout(500)

        await page.click('#btnCheck')

        // エラーメッセージが表示されること確認
        const checkErrorMessage = await page.evaluate(() => {
          return document.querySelector('#RequiredErrorMesageForCode').getAttribute('class')
        })

        expect(checkErrorMessage).toBe('input-label-required')
      }
      await browser.close()
    })

    // 補助科目名未入力
    test('バリデーションチェック、補助科目名未入力', async () => {
      const puppeteer = require('puppeteer')
      const browser = await puppeteer.launch({
        headless: true,
        ignoreHTTPSErrors: true
      })

      const page = await browser.newPage()
      await page.setCookie(acCookies[0])
      await page.goto('https://localhost:3000/registSubAccountCode')
      if (page.url() === 'https://localhost:3000/registSubAccountCode') {
        await page.type('#setSubAccountCodeInputId', 'test')
        await page.type('#setSubAccountCodeNameInputId', '')

        await page.waitForTimeout(500)

        await page.click('#btnCheck')

        // エラーメッセージが表示されること確認
        const checkErrorMessage = await page.evaluate(() => {
          return document.querySelector('#RequiredErrorMesageForName').getAttribute('class')
        })

        expect(checkErrorMessage).toBe('input-label-required')
      }
      await browser.close()
    })

    // 補助科目名41桁以上入力
    test('バリデーションチェック、補助科目名41桁以上入力', async () => {
      const puppeteer = require('puppeteer')
      const browser = await puppeteer.launch({
        headless: true,
        ignoreHTTPSErrors: true
      })

      const page = await browser.newPage()
      await page.setCookie(acCookies[0])
      await page.goto('https://localhost:3000/registSubAccountCode')
      if (page.url() === 'https://localhost:3000/registSubAccountCode') {
        await page.type('#setSubAccountCodeInputId', '')
        await page.type('#setSubAccountCodeNameInputId', 'あいうえおabcdefg123456789あいうえおabcdefg123456789')

        await page.waitForTimeout(500)

        await page.click('#btnCheck')

        // 入力値が変わっていること確認
        const checkSetSubAccountCodeNameInputId = await page.evaluate(() => {
          return document.querySelector('#setSubAccountCodeNameInputId').value
        })

        expect(checkSetSubAccountCodeNameInputId.length).toBe(40)
        expect(checkSetSubAccountCodeNameInputId).toBe('あいうえおabcdefg123456789あいうえおabcdefg1234567')
      }
      await browser.close()
    })

    // 補助科目名をコンソールで41桁以上を入力した場合
    test('バリデーションチェック、補助科目名をコンソールで41桁以上を入力した場合', async () => {
      const puppeteer = require('puppeteer')
      const browser = await puppeteer.launch({
        headless: true,
        ignoreHTTPSErrors: true
      })

      const page = await browser.newPage()
      await page.setCookie(acCookies[0])
      await page.goto('https://localhost:3000/registSubAccountCode')
      if (page.url() === 'https://localhost:3000/registSubAccountCode') {
        await page.type('#setSubAccountCodeInputId', 'test')
        await page.evaluate(
          () =>
            (document.querySelector('#setSubAccountCodeNameInputId').value =
              'あいうえおabcdefg123456789あいうえおabcdefg123456789')
        )

        await page.waitForTimeout(500)

        await page.click('#btnCheck')

        // エラーメッセージが表示されること確認
        const checkErrorMessage = await page.evaluate(() => {
          return document.querySelector('#RequiredErrorMesageForName').getAttribute('class')
        })

        expect(checkErrorMessage).toBe('input-label-required')
      }
      await browser.close()
    })
  })

  describe('6.契約ステータス：変更申込', () => {
    // テナントステータスが「変更申込」、補助科目作成ページ利用可能
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
        .get('/registSubAccountCode')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(200)

      // 画面内容確認
      expect(res.text).toMatch(/補助科目/i)
      expect(res.text).toMatch(/検索/i)
      expect(res.text).toMatch(/補助科目コード/i)
      expect(res.text).toMatch(/補助科目名/i)
    })

    test('一般ユーザ、契約ステータス：変更申込、利用可能', async () => {
      const res = await request(app)
        .get('/registSubAccountCode')
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
        .expect(200)

      // 画面内容確認
      expect(res.text).toMatch(/補助科目/i)
      expect(res.text).toMatch(/検索/i)
      expect(res.text).toMatch(/補助科目コード/i)
      expect(res.text).toMatch(/補助科目名/i)
    })
  })

  describe('7.契約ステータス：変更受付', () => {
    // テナントステータスが「変更受付」、補助科目作成ページ利用可能
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
        .get('/registSubAccountCode')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(200)

      // 画面内容確認
      expect(res.text).toMatch(/補助科目/i)
      expect(res.text).toMatch(/検索/i)
      expect(res.text).toMatch(/補助科目コード/i)
      expect(res.text).toMatch(/補助科目名/i)
    })

    test('一般ユーザ、契約ステータス：変更受付、利用可能', async () => {
      const res = await request(app)
        .get('/registSubAccountCode')
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
        .expect(200)

      // 画面内容確認
      expect(res.text).toMatch(/補助科目/i)
      expect(res.text).toMatch(/検索/i)
      expect(res.text).toMatch(/補助科目コード/i)
      expect(res.text).toMatch(/補助科目名/i)
    })
  })

  describe('8.契約ステータス：解約申込', () => {
    // テナントステータスが「解約申込」、補助科目作成ページ利用不可
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
        .get('/registSubAccountCode')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(200)

      // 画面内容確認
      expect(res.text).toMatch(/現在解約手続き中です。/i)
    })

    test('一般ユーザ、契約ステータス：解約申込、利用不可', async () => {
      const res = await request(app)
        .get('/registSubAccountCode')
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
        .expect(200)

      // 画面内容確認
      expect(res.text).toMatch(/現在解約手続き中です。/i)
    })
  })

  describe('9.契約ステータス：解約受付', () => {
    // テナントステータスが「解約受付」、補助科目作成ページ利用不可
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
        .get('/registSubAccountCode')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(200)

      // 画面内容確認
      expect(res.text).toMatch(/現在解約手続き中です。/i)
    })

    test('一般ユーザ、契約ステータス：解約受付、利用不可', async () => {
      const res = await request(app)
        .get('/registSubAccountCode')
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
        .expect(200)

      // 画面内容確認
      expect(res.text).toMatch(/現在解約手続き中です。/i)
    })
  })

  describe('10.契約ステータス：解約', () => {
    // テナントステータスが「解約」、補助科目作成ページ利用不可
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
        .get('/registSubAccountCode')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(500)

      // 画面内容確認
      expect(res.text).toMatch(/お探しのページは見つかりませんでした。/i)
    })

    test('一般ユーザ、契約ステータス：解約、利用不可', async () => {
      const res = await request(app)
        .get('/registSubAccountCode')
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
