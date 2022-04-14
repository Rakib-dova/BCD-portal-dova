'use strict'
const app = require('../../Application/app')
const request = require('supertest')
const { JSDOM } = require('jsdom')
const db = require('../../Application/models')
const getTenantId = {}
let redirectUrl

jest.setTimeout(60000) // jestのタイムアウトを60秒とする

const getCookies = require('./getCookies')

describe('補助科目確認・変更のインテグレーションテスト', () => {
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
    // テナントステータスが「新規申込」、補助科目確認・変更ページ直接接続-利用不可
    test('管理者、契約ステータス：登録申込、補助科目確認・変更ページ直接接続-利用不可', async () => {
      const res = await request(app)
        .get('/subAccountCodeEdit')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(400)

      // 画面内容確認
      expect(res.text).toMatch(/不正なページからアクセスされたか、セッションタイムアウトが発生しました。/i)
    })

    test('一般ユーザ、契約ステータス：登録申込、補助科目確認・変更ページ直接接続-利用不可', async () => {
      const res = await request(app)
        .get('/subAccountCodeEdit')
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
        .expect(400)

      // 画面内容確認
      expect(res.text).toMatch(/不正なページからアクセスされたか、セッションタイムアウトが発生しました。/i)
    })

    test('補助科目登録', async () => {
      // 勘定科目登録'
      const contract = await db.Contract.findOne({
        where: {
          tenantId: testTenantId
        }
      })
      const v4 = require('uuid').v4
      const testAccountCode = new db.AccountCode({
        accountCodeId: v4(),
        contractId: contract.contractId,
        accountCodeName: 'インテグレーションテスト',
        accountCode: 'INTE0001'
      })
      await testAccountCode.save()

      const puppeteer = require('puppeteer')
      const browser = await puppeteer.launch({
        headless: true,
        ignoreHTTPSErrors: true
      })

      const page = await browser.newPage()
      await page.setCookie(acCookies[0])
      await page.goto('https://localhost:3000/registSubAccountCode')
      if (page.url() === 'https://localhost:3000/registSubAccountCode') {
        await page.type('#setSubAccountCodeInputId', 'subAccount')
        await page.type('#setSubAccountCodeNameInputId', 'subTest')
        await page.click('#btnOpenAccountCodeModal')
        await page.waitForTimeout(300)
        await page.click('#btnSearchAccountCode')
        await page.waitForTimeout(1000)
        await page.click('#displayFieldBody > tr:nth-child(1)')
        await page.waitForTimeout(500)
        await page.click('#btnCheck')
        await page.waitForTimeout(200)
        await page.click('#submit')
        await page.waitForTimeout(500)

        // 補助科目一覧画面に遷移確認
        expect(await page.url()).toBe('https://localhost:3000/subAccountCodeList')
      }
      await browser.close()
    })

    test('管理者、登録した補助科目の確認・変更画面へアクセス、利用可能', async () => {
      const puppeteer = require('puppeteer')
      const browser = await puppeteer.launch({
        headless: true,
        ignoreHTTPSErrors: true
      })
      const page = await browser.newPage()
      await page.setCookie(acCookies[0])
      await page.goto('https://localhost:3000/subAccountCodeList')

      redirectUrl = await page.evaluate(() => {
        return document
          .querySelector(
            'body > div.max-width > div > div > div.box > table > tbody > tr:nth-child(1) > td:nth-child(5) > a'
          )
          .getAttribute('href')
      })

      await page.click(
        'body > div.max-width > div > div > div.box > table > tbody > tr:nth-child(1) > td:nth-child(5) > a'
      )

      await page.waitForTimeout(500)

      // アップロードフォーマット変更画面にredirectする。
      expect(await page.url()).toBe(`https://localhost:3000${redirectUrl}`)

      await browser.close()
    })

    test('一般ユーザ、登録した補助科目の確認・変更画面へアクセス、利用可能', async () => {
      const puppeteer = require('puppeteer')
      const browser = await puppeteer.launch({
        headless: true,
        ignoreHTTPSErrors: true
      })
      const page = await browser.newPage()
      await page.setCookie(acCookies[0])
      await page.goto('https://localhost:3000/subAccountCodeList')

      await page.waitForTimeout(500)

      await page.click(
        'body > div.max-width > div > div > div.box > table > tbody > tr:nth-child(1) > td:nth-child(5) > a'
      )

      await page.waitForTimeout(500)

      // アップロードフォーマット変更画面にredirectする。
      expect(await page.url()).toBe(`https://localhost:3000${redirectUrl}`)

      await browser.close()
    })
  })

  describe('3.契約ステータス：登録受付', () => {
    // テナントステータスが「新規受付」、補助科目確認・変更ページ直接接続-利用不可
    test('管理者、契約ステータス：登録受付、補助科目確認・変更ページ直接接続-利用不可', async () => {
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
        .get('/subAccountCodeEdit')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(400)

      // 画面内容確認
      expect(res.text).toMatch(/不正なページからアクセスされたか、セッションタイムアウトが発生しました。/i)
    })

    test('一般ユーザ、契約ステータス：登録受付、補助科目確認・変更ページ直接接続-利用不可', async () => {
      const res = await request(app)
        .get('/subAccountCodeEdit')
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
        .expect(400)

      // 画面内容確認
      expect(res.text).toMatch(/不正なページからアクセスされたか、セッションタイムアウトが発生しました。/i)
    })

    test('管理者、登録した補助科目の確認・変更画面へアクセス、利用可能', async () => {
      const puppeteer = require('puppeteer')
      const browser = await puppeteer.launch({
        headless: true,
        ignoreHTTPSErrors: true
      })
      const page = await browser.newPage()
      await page.setCookie(acCookies[0])
      await page.goto('https://localhost:3000/subAccountCodeList')

      await page.waitForTimeout(500)

      await page.click(
        'body > div.max-width > div > div > div.box > table > tbody > tr:nth-child(1) > td:nth-child(5) > a'
      )

      await page.waitForTimeout(500)

      // アップロードフォーマット変更画面にredirectする。
      expect(await page.url()).toBe(`https://localhost:3000${redirectUrl}`)

      await browser.close()
    })

    test('一般ユーザ、登録した補助科目の確認・変更画面へアクセス、利用可能', async () => {
      const puppeteer = require('puppeteer')
      const browser = await puppeteer.launch({
        headless: true,
        ignoreHTTPSErrors: true
      })
      const page = await browser.newPage()
      await page.setCookie(acCookies[0])
      await page.goto('https://localhost:3000/subAccountCodeList')

      await page.waitForTimeout(500)

      await page.click(
        'body > div.max-width > div > div > div.box > table > tbody > tr:nth-child(1) > td:nth-child(5) > a'
      )

      await page.waitForTimeout(500)

      // アップロードフォーマット変更画面にredirectする。
      expect(await page.url()).toBe(`https://localhost:3000${redirectUrl}`)

      await browser.close()
    })
  })

  describe('4.契約ステータス：契約中', () => {
    // テナントステータスが「契約中」、補助科目確認・変更ページ直接接続-利用不可
    test('管理者、契約ステータス：契約中、補助科目確認・変更ページ直接接続-利用不可', async () => {
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
        .get('/subAccountCodeEdit')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(400)

      // 画面内容確認
      expect(res.text).toMatch(/不正なページからアクセスされたか、セッションタイムアウトが発生しました。/i)
    })

    test('一般ユーザ、契約ステータス：契約中、補助科目確認・変更ページ直接接続-利用不可', async () => {
      const res = await request(app)
        .get('/subAccountCodeEdit')
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
        .expect(400)

      // 画面内容確認
      expect(res.text).toMatch(/不正なページからアクセスされたか、セッションタイムアウトが発生しました。/i)
    })

    test('管理者、登録した補助科目の確認・変更画面へアクセス、利用可能', async () => {
      const puppeteer = require('puppeteer')
      const browser = await puppeteer.launch({
        headless: true,
        ignoreHTTPSErrors: true
      })
      const page = await browser.newPage()
      await page.setCookie(acCookies[0])
      await page.goto('https://localhost:3000/subAccountCodeList')

      await page.waitForTimeout(500)

      await page.click(
        'body > div.max-width > div > div > div.box > table > tbody > tr:nth-child(1) > td:nth-child(5) > a'
      )

      await page.waitForTimeout(500)

      // アップロードフォーマット変更画面にredirectする。
      expect(await page.url()).toBe(`https://localhost:3000${redirectUrl}`)

      await browser.close()
    })

    test('一般ユーザ、登録した補助科目の確認・変更画面へアクセス、利用可能', async () => {
      const puppeteer = require('puppeteer')
      const browser = await puppeteer.launch({
        headless: true,
        ignoreHTTPSErrors: true
      })
      const page = await browser.newPage()
      await page.setCookie(acCookies[0])
      await page.goto('https://localhost:3000/subAccountCodeList')

      await page.waitForTimeout(500)

      await page.click(
        'body > div.max-width > div > div > div.box > table > tbody > tr:nth-child(1) > td:nth-child(5) > a'
      )

      await page.waitForTimeout(500)

      // アップロードフォーマット変更画面にredirectする。
      expect(await page.url()).toBe(`https://localhost:3000${redirectUrl}`)

      await browser.close()
    })
    // 勘定科目コード検索機能確認
    test('勘定科目コード検索機能確認', async () => {
      const puppeteer = require('puppeteer')
      const browser = await puppeteer.launch({
        headless: true,
        ignoreHTTPSErrors: true
      })

      const page = await browser.newPage()
      await page.setCookie(acCookies[0])
      await page.goto(`https://localhost:3000${redirectUrl}`)
      if (page.url() === `https://localhost:3000${redirectUrl}`) {
        await page.type('#setSubAccountCodeInputId', '')
        await page.type('#setSubAccountCodeNameInputId', 'インテグレーションテスト')
        await page.click('#btnAccountCodeClear')
        await page.waitForTimeout(500)
        await page.click('#btnOpenAccountCodeModal')
        await page.waitForTimeout(500)
        await page.click('#btnSearchAccountCode')
        await page.waitForTimeout(1000)

        // 確認ボタンの非活性化確認
        const checkAccountCodeName = await page.evaluate(() => {
          return document.querySelector('#displayFieldBody > tr:nth-child(1) > td.columnAccountCodeName').innerText
        })

        expect(checkAccountCodeName).toMatch('インテグレーションテスト')
      }
      await browser.close()
    })

    // クリアボタン活性化及び機能確認
    test('クリアボタン活性化及び機能確認', async () => {
      const puppeteer = require('puppeteer')
      const browser = await puppeteer.launch({
        headless: true,
        ignoreHTTPSErrors: true
      })

      const page = await browser.newPage()
      await page.setCookie(acCookies[0])
      await page.goto(`https://localhost:3000${redirectUrl}`)
      if (page.url() === `https://localhost:3000${redirectUrl}`) {
        await page.type('#setSubAccountCodeInputId', '')
        await page.type('#setSubAccountCodeNameInputId', 'インテグレーションテスト')
        await page.click('#btnAccountCodeClear')
        await page.waitForTimeout(500)

        // クリアボタンの非活性化確認
        const checkAccountCodeClearInvisible = await page.evaluate(() => {
          return document.querySelector('#btnAccountCodeClear').getAttribute('class')
        })
        expect(checkAccountCodeClearInvisible).toMatch('button is-danger is-invisible')

        // 入力欄の非表示確認
        const checkAccountCodeInputIdResultInvisible = await page.evaluate(() => {
          return document.querySelector('#setAccountCodeInputIdResultColumn').getAttribute('class')
        })
        expect(checkAccountCodeInputIdResultInvisible).toMatch('column ml-0 pl-0 is-invisible')

        await page.click('#btnOpenAccountCodeModal')
        await page.waitForTimeout(500)
        await page.click('#btnSearchAccountCode')
        await page.waitForTimeout(1000)
        await page.click('#displayFieldBody > tr:nth-child(1)')
        await page.waitForTimeout(500)

        // クリアボタンの活性化確認
        const checkAccountCodeClear = await page.evaluate(() => {
          return document.querySelector('#btnAccountCodeClear').getAttribute('class')
        })
        expect(checkAccountCodeClear).toMatch('button is-danger')

        // 入力欄の表示確認
        const checkAccountCodeInputIdResult = await page.evaluate(() => {
          return document.querySelector('#setAccountCodeInputIdResultColumn').getAttribute('class')
        })
        expect(checkAccountCodeInputIdResult).toMatch('column ml-0 pl-0')
      }
      await browser.close()
    })

    test('「戻る」ボタン遷移確認（ポータル画面に遷移）', async () => {
      const puppeteer = require('puppeteer')
      const browser = await puppeteer.launch({
        headless: true,
        ignoreHTTPSErrors: true
      })
      const page = await browser.newPage()
      await page.setCookie(acCookies[0])
      await page.goto('https://localhost:3000/subAccountCodeList')

      await page.waitForTimeout(500)

      await page.click(
        'body > div.max-width > div > div > div.box > table > tbody > tr:nth-child(1) > td:nth-child(5) > a'
      )

      await page.waitForTimeout(500)

      await page.click('#return-btn')

      await page.waitForTimeout(500)

      // ポータル画面に遷移確認
      expect(await page.url()).toBe('https://localhost:3000/subAccountCodeList')

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
      await page.goto(`https://localhost:3000${redirectUrl}`)
      if (page.url() === `https://localhost:3000${redirectUrl}`) {
        const setSubAccountCodeInputId = await page.$('#setSubAccountCodeInputId')
        await setSubAccountCodeInputId.click({ clickCount: 3 })
        await page.type('#setSubAccountCodeInputId', 'intgrationTest')

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
      await page.goto(`https://localhost:3000${redirectUrl}`)
      if (page.url() === `https://localhost:3000${redirectUrl}`) {
        const setSubAccountCodeInputId = await page.$('#setSubAccountCodeInputId')
        await setSubAccountCodeInputId.click({ clickCount: 3 })
        await setSubAccountCodeInputId.type('12345678901234567890')

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
      await page.goto(`https://localhost:3000${redirectUrl}`)
      if (page.url() === `https://localhost:3000${redirectUrl}`) {
        const setSubAccountCodeInputId = await page.$('#setSubAccountCodeInputId')
        await setSubAccountCodeInputId.click({ clickCount: 3 })
        await setSubAccountCodeInputId.type('test1234567890')

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
      await page.goto(`https://localhost:3000${redirectUrl}`)
      if (page.url() === `https://localhost:3000${redirectUrl}`) {
        await page.evaluate(() => (document.querySelector('#setSubAccountCodeInputId').value = 'test1234567890'))
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
      await page.goto(`https://localhost:3000${redirectUrl}`)
      if (page.url() === `https://localhost:3000${redirectUrl}`) {
        const setSubAccountCodeInputId = await page.$('#setSubAccountCodeInputId')
        await setSubAccountCodeInputId.click({ clickCount: 3 })
        await setSubAccountCodeInputId.type('テスト')
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

    // 補助科目名41桁以上入力
    test('バリデーションチェック、補助科目名41桁以上入力', async () => {
      const puppeteer = require('puppeteer')
      const browser = await puppeteer.launch({
        headless: true,
        ignoreHTTPSErrors: true
      })

      const page = await browser.newPage()
      await page.setCookie(acCookies[0])
      await page.goto(`https://localhost:3000${redirectUrl}`)
      if (page.url() === `https://localhost:3000${redirectUrl}`) {
        const setSubAccountCodeNameInputId = await page.$('#setSubAccountCodeNameInputId')
        await setSubAccountCodeNameInputId.click({ clickCount: 3 })
        await setSubAccountCodeNameInputId.type('あいうえおabcdefg123456789あいうえおabcdefg123456789')

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
      await page.goto(`https://localhost:3000${redirectUrl}`)
      if (page.url() === `https://localhost:3000${redirectUrl}`) {
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

  describe('5.契約ステータス：変更申込', () => {
    // テナントステータスが「変更申込」、補助科目確認・変更ページ直接接続-利用不可
    test('管理者、契約ステータス：変更申込、補助科目確認・変更ページ直接接続-利用不可', async () => {
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
        .get('/subAccountCodeEdit')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(400)

      // 画面内容確認
      expect(res.text).toMatch(/不正なページからアクセスされたか、セッションタイムアウトが発生しました。/i)
    })

    test('一般ユーザ、契約ステータス：変更申込、補助科目確認・変更ページ直接接続-利用不可', async () => {
      const res = await request(app)
        .get('/subAccountCodeEdit')
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
        .expect(400)

      // 画面内容確認
      expect(res.text).toMatch(/不正なページからアクセスされたか、セッションタイムアウトが発生しました。/i)
    })

    test('管理者、登録した補助科目の確認・変更画面へアクセス、利用可能', async () => {
      const puppeteer = require('puppeteer')
      const browser = await puppeteer.launch({
        headless: true,
        ignoreHTTPSErrors: true
      })
      const page = await browser.newPage()
      await page.setCookie(acCookies[0])
      await page.goto('https://localhost:3000/subAccountCodeList')

      await page.click(
        'body > div.max-width > div > div > div.box > table > tbody > tr:nth-child(1) > td:nth-child(5) > a'
      )

      await page.waitForTimeout(500)

      // アップロードフォーマット変更画面にredirectする。
      expect(await page.url()).toBe(`https://localhost:3000${redirectUrl}`)

      await browser.close()
    })

    test('一般ユーザ、登録した補助科目の確認・変更画面へアクセス、利用可能', async () => {
      const puppeteer = require('puppeteer')
      const browser = await puppeteer.launch({
        headless: true,
        ignoreHTTPSErrors: true
      })
      const page = await browser.newPage()
      await page.setCookie(acCookies[0])
      await page.goto('https://localhost:3000/subAccountCodeList')

      await page.click(
        'body > div.max-width > div > div > div.box > table > tbody > tr:nth-child(1) > td:nth-child(5) > a'
      )

      await page.waitForTimeout(500)

      // アップロードフォーマット変更画面にredirectする。
      expect(await page.url()).toBe(`https://localhost:3000${redirectUrl}`)

      await browser.close()
    })
  })

  describe('6.契約ステータス：変更受付', () => {
    // テナントステータスが「変更受付」、補助科目確認・変更ページ直接接続-利用不可
    test('管理者、契約ステータス：変更受付、補助科目確認・変更ページ直接接続-利用不可', async () => {
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
        .get('/subAccountCodeEdit')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(400)

      // 画面内容確認
      expect(res.text).toMatch(/不正なページからアクセスされたか、セッションタイムアウトが発生しました。/i)
    })

    test('一般ユーザ、契約ステータス：変更受付、補助科目確認・変更ページ直接接続-利用不可', async () => {
      const res = await request(app)
        .get('/subAccountCodeEdit')
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
        .expect(400)

      // 画面内容確認
      expect(res.text).toMatch(/不正なページからアクセスされたか、セッションタイムアウトが発生しました。/i)
    })

    test('管理者、登録した補助科目の確認・変更画面へアクセス、利用可能', async () => {
      const puppeteer = require('puppeteer')
      const browser = await puppeteer.launch({
        headless: true,
        ignoreHTTPSErrors: true
      })
      const page = await browser.newPage()
      await page.setCookie(acCookies[0])
      await page.goto('https://localhost:3000/subAccountCodeList')

      await page.click(
        'body > div.max-width > div > div > div.box > table > tbody > tr:nth-child(1) > td:nth-child(5) > a'
      )

      await page.waitForTimeout(500)

      // アップロードフォーマット変更画面にredirectする。
      expect(await page.url()).toBe(`https://localhost:3000${redirectUrl}`)

      await browser.close()
    })

    test('一般ユーザ、登録した補助科目の確認・変更画面へアクセス、利用可能', async () => {
      const puppeteer = require('puppeteer')
      const browser = await puppeteer.launch({
        headless: true,
        ignoreHTTPSErrors: true
      })
      const page = await browser.newPage()
      await page.setCookie(acCookies[0])
      await page.goto('https://localhost:3000/subAccountCodeList')

      await page.click(
        'body > div.max-width > div > div > div.box > table > tbody > tr:nth-child(1) > td:nth-child(5) > a'
      )

      await page.waitForTimeout(500)

      // アップロードフォーマット変更画面にredirectする。
      expect(await page.url()).toBe(`https://localhost:3000${redirectUrl}`)

      await browser.close()
    })
  })

  describe('7.契約ステータス：解約申込', () => {
    // テナントステータスが「解約申込」、補助科目確認・変更ページ直接接続-利用不可
    test('管理者、契約ステータス：解約申込、補助科目確認・変更ページ直接接続-利用不可', async () => {
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
        .get('/subAccountCodeEdit')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(400)

      // 画面内容確認
      expect(res.text).toMatch(/不正なページからアクセスされたか、セッションタイムアウトが発生しました。/i)
    })

    test('一般ユーザ、契約ステータス：解約申込、補助科目確認・変更ページ直接接続-利用不可', async () => {
      const res = await request(app)
        .get('/subAccountCodeEdit')
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
        .expect(400)

      // 画面内容確認
      expect(res.text).toMatch(/不正なページからアクセスされたか、セッションタイムアウトが発生しました。/i)
    })

    test('管理者、登録した補助科目の確認・変更画面へアクセス、利用不可', async () => {
      const res = await request(app)
        .get(redirectUrl)
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(200)

      // 画面内容確認
      expect(res.text).toMatch(/現在解約手続き中です。/i)
    })

    test('一般ユーザ、登録した補助科目の確認・変更画面へアクセス、利用不可', async () => {
      const res = await request(app)
        .get(redirectUrl)
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
        .expect(200)

      // 画面内容確認
      expect(res.text).toMatch(/現在解約手続き中です。/i)
    })
  })

  describe('8.契約ステータス：解約受付', () => {
    // テナントステータスが「解約受付」、補助科目確認・変更ページ直接接続-利用不可
    test('管理者、契約ステータス：解約受付、補助科目確認・変更ページ直接接続-利用不可', async () => {
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
        .get('/subAccountCodeEdit')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(400)

      // 画面内容確認
      expect(res.text).toMatch(/不正なページからアクセスされたか、セッションタイムアウトが発生しました。/i)
    })

    test('一般ユーザ、契約ステータス：解約受付、補助科目確認・変更ページ直接接続-利用不可', async () => {
      const res = await request(app)
        .get('/subAccountCodeEdit')
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
        .expect(400)

      // 画面内容確認
      expect(res.text).toMatch(/不正なページからアクセスされたか、セッションタイムアウトが発生しました。/i)
    })

    test('管理者、登録した補助科目の確認・変更画面へアクセス、利用不可', async () => {
      const res = await request(app)
        .get(redirectUrl)
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(200)

      // 画面内容確認
      expect(res.text).toMatch(/現在解約手続き中です。/i)
    })

    test('一般ユーザ、登録した補助科目の確認・変更画面へアクセス、利用不可', async () => {
      const res = await request(app)
        .get(redirectUrl)
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
        .expect(200)

      // 画面内容確認
      expect(res.text).toMatch(/現在解約手続き中です。/i)
    })
  })

  describe('9.契約ステータス：解約', () => {
    // テナントステータスが「解約」、補助科目確認・変更ページ直接接続-利用不可
    test('管理者、契約ステータス：解約、補助科目確認・変更ページ直接接続-利用不可', async () => {
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
        .get('/subAccountCodeEdit')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(400)

      // 画面内容確認
      expect(res.text).toMatch(/不正なページからアクセスされたか、セッションタイムアウトが発生しました。/i)
    })

    test('一般ユーザ、契約ステータス：解約、補助科目確認・変更ページ直接接続-利用不可', async () => {
      const res = await request(app)
        .get('/subAccountCodeEdit')
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
        .expect(400)

      // 画面内容確認
      expect(res.text).toMatch(/不正なページからアクセスされたか、セッションタイムアウトが発生しました。/i)
    })

    test('管理者、登録した補助科目の確認・変更画面へアクセス、利用不可', async () => {
      const res = await request(app)
        .get(redirectUrl)
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(500)

      // 画面内容確認
      expect(res.text).toMatch(/お探しのページは見つかりませんでした。/i)
    })

    test('一般ユーザ、登録した補助科目の確認・変更画面へアクセス、利用不可', async () => {
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
