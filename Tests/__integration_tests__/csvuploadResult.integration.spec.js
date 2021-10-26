'use strict'
process.env.INVOICE_UPLOAD_PATH =
  process.env.INVOICE_UPLOAD_PATH ?? JSON.stringify({ INVOICE_UPLOAD_PATH: './testData' })

const app = require('../../Application/app')
const request = require('supertest')
const { JSDOM } = require('jsdom')
let testTenantId = null
const db = require('../../Application/models')
const getTenantId = {}
const csvUploadResultUrlParameter = '/csvuploadResult'
const localhost = 'https://localhost:3000'

jest.setTimeout(60000) // jestのタイムアウトを60秒とする

const getCookies = require('./getCookies')

describe('ルーティングのインテグレーションテスト', () => {
  let acCookies
  // let userCookies

  describe('0.前準備', () => {
    test('/authにアクセス：oauth2認証をし、セッション用Cookieを取得', async () => {
      // アカウント管理者と一般ユーザのID/SECRETは、テストコマンドの引数から取得
      const options = require('minimist')(process.argv.slice(2))
      const adminId = options.adminid
      const adminSecret = options.adminsecret
      // const userId = options.userid
      // const userSecret = options.usersecret
      // --------------------アカウント管理者のCookieを取得---------------
      acCookies = await getCookies(app, request, getTenantId, adminId, adminSecret)
      // ---------------------一般ユーザのCookieを取得--------------------
      // userCookies = await getCookies(app, request, getTenants, userId, userSecret)

      // Cookieを使ってローカル開発環境のDBからCookieと紐づくユーザを削除しておく

      // DBクリア
      await db.Contract.destroy({ where: { tenantId: testTenantId } })
      await db.Order.destroy({ where: { tenantId: testTenantId } })
    })
  })

  test('テナントID設定', async () => {
    testTenantId = getTenantId.id
  })

  describe('1.契約ステータス：新規登録', () => {
    // 利用登録前
    test('取込結果一覧アクセス：利用登録に遷移', async () => {
      const res = await request(app)
        .get(csvUploadResultUrlParameter)
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(303)

      expect(res.headers.location).toMatch('/tenant/register') // タイトル
    })

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

    // 契約ステータス：00
    test('取込結果一覧アクセス', async () => {
      const res = await request(app)
        .get(csvUploadResultUrlParameter)
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(200)

      expect(res.text).toMatch(/ - BConnectionデジタルトレード/i) // TITLE
      expect(res.text).toMatch(/取込結果一覧/i) // SUBTITLE
      expect(res.text).toMatch(/No/i) // 取り込み結果のカーラム
      expect(res.text).toMatch(/アップロード日時/i) // 取り込み結果のカーラム
      expect(res.text).toMatch(/ファイル名/i) // 取り込み結果のカーラム
      expect(res.text).toMatch(/取込結果/i) // 取り込み結果のカーラム
      expect(res.text).toMatch(/取込件数/i) // 取り込み結果のカーラム
      expect(res.text).toMatch(/請求書作成数/i) // 取り込み結果のカーラム
      expect(res.text).toMatch(/作成完了/i) // 取り込み結果のカーラム
      expect(res.text).toMatch(/スキップ/i) // 取り込み結果のカーラム
      expect(res.text).toMatch(/← 請求書一括作成/i) // 請求書一括作成に戻るリンク
    })
  })

  describe('2.契約ステータス：登録申込', () => {
    test('取込結果一覧アクセス：正常', async () => {
      const res = await request(app)
        .get(csvUploadResultUrlParameter)
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(200)

      expect(res.text).toMatch(/ - BConnectionデジタルトレード/i) // TITLE
      expect(res.text).toMatch(/取込結果一覧/i) // SUBTITLE
      expect(res.text).toMatch(/No/i) // 取り込み結果のカーラム
      expect(res.text).toMatch(/アップロード日時/i) // 取り込み結果のカーラム
      expect(res.text).toMatch(/ファイル名/i) // 取り込み結果のカーラム
      expect(res.text).toMatch(/取込結果/i) // 取り込み結果のカーラム
      expect(res.text).toMatch(/取込件数/i) // 取り込み結果のカーラム
      expect(res.text).toMatch(/請求書作成数/i) // 取り込み結果のカーラム
      expect(res.text).toMatch(/作成完了/i) // 取り込み結果のカーラム
      expect(res.text).toMatch(/スキップ/i) // 取り込み結果のカーラム
      expect(res.text).toMatch(/← 請求書一括作成/i) // 請求書一括作成に戻るリンク
    })
  })

  describe('3.契約ステータス：登録受付', () => {
    test('取込結果一覧アクセス：正常', async () => {
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
        .get(csvUploadResultUrlParameter)
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(200)

      expect(res.text).toMatch(/ - BConnectionデジタルトレード/i) // TITLE
      expect(res.text).toMatch(/取込結果一覧/i) // SUBTITLE
      expect(res.text).toMatch(/No/i) // 取り込み結果のカーラム
      expect(res.text).toMatch(/アップロード日時/i) // 取り込み結果のカーラム
      expect(res.text).toMatch(/ファイル名/i) // 取り込み結果のカーラム
      expect(res.text).toMatch(/取込結果/i) // 取り込み結果のカーラム
      expect(res.text).toMatch(/取込件数/i) // 取り込み結果のカーラム
      expect(res.text).toMatch(/請求書作成数/i) // 取り込み結果のカーラム
      expect(res.text).toMatch(/作成完了/i) // 取り込み結果のカーラム
      expect(res.text).toMatch(/スキップ/i) // 取り込み結果のカーラム
      expect(res.text).toMatch(/← 請求書一括作成/i) // 請求書一括作成に戻るリンク
    })
  })

  describe('4.契約ステータス：契約中', () => {
    test('取込結果一覧アクセス：正常', async () => {
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
        .get(csvUploadResultUrlParameter)
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(200)

      expect(res.text).toMatch(/ - BConnectionデジタルトレード/i) // TITLE
      expect(res.text).toMatch(/取込結果一覧/i) // SUBTITLE
      expect(res.text).toMatch(/No/i) // 取り込み結果のカーラム
      expect(res.text).toMatch(/アップロード日時/i) // 取り込み結果のカーラム
      expect(res.text).toMatch(/ファイル名/i) // 取り込み結果のカーラム
      expect(res.text).toMatch(/取込結果/i) // 取り込み結果のカーラム
      expect(res.text).toMatch(/取込件数/i) // 取り込み結果のカーラム
      expect(res.text).toMatch(/請求書作成数/i) // 取り込み結果のカーラム
      expect(res.text).toMatch(/作成完了/i) // 取り込み結果のカーラム
      expect(res.text).toMatch(/スキップ/i) // 取り込み結果のカーラム
      expect(res.text).toMatch(/← 請求書一括作成/i) // 請求書一括作成に戻るリンク
    })

    test('取り込み結果一覧から請求書一括作成へ移動', async () => {
      const puppeteer = require('puppeteer')
      const browser = await puppeteer.launch({
        headless: true,
        ignoreHTTPSErrors: true
      })
      const page = await browser.newPage()
      await page.setCookie(acCookies[0])
      await page.goto(`${localhost}${csvUploadResultUrlParameter}`)

      expect(await page.url()).toBe(`${localhost}${csvUploadResultUrlParameter}`)

      await page.click('body > div.max-width > div.columns.is-centered > div > div.mt-1.has-text-left > a')

      expect(await page.url()).toBe(`${localhost}/csvupload`)
    })

    test('取り込み結果一覧の詳細画面確認', async () => {
      const puppeteer = require('puppeteer')
      const browser = await puppeteer.launch({
        headless: false,
        ignoreHTTPSErrors: true
      })

      const page = await browser.newPage()
      await page.setCookie(acCookies[0])
      await page.goto(`${localhost}/csvupload`)

      expect(await page.url()).toBe(`${localhost}/csvupload`)

      const [fileChooser] = await Promise.all([page.waitForFileChooser(), page.click('#file-upload-btn')])

      await fileChooser.accept(['./testData/csvFormatUpload.csv'])

      await page.waitForTimeout(1000)

      await page.click('#start-upload-btn')

      await page.waitForTimeout(30000)
      await page.on('dialog', async (dialog) => {
        console.log(dialog)
        await dialog.accept()
      })

      await page.goto(`${localhost}${csvUploadResultUrlParameter}`)

      await page.click(
        'body > div.max-width > div.columns.is-centered > div > div.box.csvuploadResultBox > table > tbody > tr > td:nth-child(4) > button'
      )

      let clickResult = await page.evaluate(() => {
        if (document.querySelector('#csvuploadDetails-modal').attributes[0].value.match(/is-active/) !== null) {
          return document.querySelector('#csvuploadDetails-modal').attributes[0].value.match(/is-active/)[0]
        }
        return null
      })

      // 詳細画面ポップアップ画面のタグのクラスが「is-active」になることを確認
      expect(clickResult).toBe('is-active')

      await page.waitForTimeout(3000)

      await page.click('#csvuploadDetails-modal > div.modal-card.is-family-noto-sans.width-60 > footer > a')

      clickResult = await page.evaluate(() => {
        if (document.querySelector('#csvuploadDetails-modal').attributes[0].value.match(/is-active/) !== null) {
          return document.querySelector('#csvuploadDetails-modal').attributes[0].value.match(/is-active/)[0]
        }
        return null
      })

      expect(clickResult).toBe(null)

      await browser.close()
    })
  })

  describe('5.契約ステータス：変更申込', () => {
    test('取込結果一覧アクセス：正常', async () => {
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
        .get(csvUploadResultUrlParameter)
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(200)

      expect(res.text).toMatch(/ - BConnectionデジタルトレード/i) // TITLE
      expect(res.text).toMatch(/取込結果一覧/i) // SUBTITLE
      expect(res.text).toMatch(/No/i) // 取り込み結果のカーラム
      expect(res.text).toMatch(/アップロード日時/i) // 取り込み結果のカーラム
      expect(res.text).toMatch(/ファイル名/i) // 取り込み結果のカーラム
      expect(res.text).toMatch(/取込結果/i) // 取り込み結果のカーラム
      expect(res.text).toMatch(/取込件数/i) // 取り込み結果のカーラム
      expect(res.text).toMatch(/請求書作成数/i) // 取り込み結果のカーラム
      expect(res.text).toMatch(/作成完了/i) // 取り込み結果のカーラム
      expect(res.text).toMatch(/スキップ/i) // 取り込み結果のカーラム
      expect(res.text).toMatch(/← 請求書一括作成/i) // 請求書一括作成に戻るリンク
    })
  })

  describe('6.契約ステータス：変更受付', () => {
    test('取込結果一覧アクセス：正常', async () => {
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
        .get(csvUploadResultUrlParameter)
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(200)

      expect(res.text).toMatch(/ - BConnectionデジタルトレード/i) // TITLE
      expect(res.text).toMatch(/取込結果一覧/i) // SUBTITLE
      expect(res.text).toMatch(/No/i) // 取り込み結果のカーラム
      expect(res.text).toMatch(/アップロード日時/i) // 取り込み結果のカーラム
      expect(res.text).toMatch(/ファイル名/i) // 取り込み結果のカーラム
      expect(res.text).toMatch(/取込結果/i) // 取り込み結果のカーラム
      expect(res.text).toMatch(/取込件数/i) // 取り込み結果のカーラム
      expect(res.text).toMatch(/請求書作成数/i) // 取り込み結果のカーラム
      expect(res.text).toMatch(/作成完了/i) // 取り込み結果のカーラム
      expect(res.text).toMatch(/スキップ/i) // 取り込み結果のカーラム
      expect(res.text).toMatch(/← 請求書一括作成/i) // 請求書一括作成に戻るリンク
    })
  })

  describe('7.契約ステータス：解約申込', () => {
    test('取込結果一覧アクセス：準正常', async () => {
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
        .get(csvUploadResultUrlParameter)
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(200)

      expect(res.text).toMatch(/現在解約手続き中です。/i) // タイトルが含まれていること
    })
  })

  describe('8.契約ステータス：解約受付', () => {
    test('取込結果一覧アクセス：準正常', async () => {
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
        .get(csvUploadResultUrlParameter)
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(200)

      expect(res.text).toMatch(/現在解約手続き中です。/i) // タイトルが含まれていること
    })
  })

  describe('9.契約ステータス：解約', () => {
    test('取込結果一覧アクセス：準正常', async () => {
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
        .get(csvUploadResultUrlParameter)
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(303)

      expect(res.headers.location).toMatch('/tenant/register') // タイトル
    })
  })

  describe('後処理', () => {
    test('userデータ削除', async () => {
      await db.User.destroy({ where: { tenantId: testTenantId } })
      await db.Tenant.destroy({ where: { tenantId: testTenantId } })
    })
  })
})
