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
  // let userCookies
  let testTenantId

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
      // userCookies = await getCookies(userId, userSecret)

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
    // 利用登録前
    test('請求書アップロードフォーマット一覧画面へアクセス', async () => {
      const res = await request(app)
        .get('/uploadFormatList')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(500)

      expect(res.text).toMatch(/上部メニューのHOMEボタンを押下し、トップページへお戻りください。/i) // タイトル
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
  })

  describe('2.契約ステータス：登録申込', () => {
    test('請求書アップロードフォーマット一覧画面へアクセス', async () => {
      const res = await request(app)
        .get('/uploadFormatList')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(200)

      expect(res.text).toMatch(/- BConnectionデジタルトレード/i) // タイトルが含まれていること
    })
  })

  describe('3.契約ステータス：登録受付', () => {
    test('請求書アップロードフォーマット一覧画面へアクセス', async () => {
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
        .get('/uploadFormatList')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(200)

      expect(res.text).toMatch(/- BConnectionデジタルトレード/i) // タイトルが含まれていること
    })

    test('請求書アップロードフォーマット一覧画面からポータル画面へ遷移', async () => {
      const puppeteer = require('puppeteer')
      const browser = await puppeteer.launch({
        headless: true,
        ignoreHTTPSErrors: true
      })

      // 新しいページ起動
      const page = await browser.newPage()
      await page.setCookie(acCookies[0])

      // アップロードフォーマット一覧画面へ移動
      await page.goto('https://localhost:3000/uploadFormatList')

      // ポータル画面へ移動
      await page.click('body > div.max-width > div:nth-child(3) > div > div.mt-1.has-text-left > a')

      // ポータル画面へ移動結果確認
      expect(await page.url()).toMatch('https://localhost:3000/portal')
      await browser.close()
    })

    test('請求書アップロードフォーマット一覧画面から請求書一覧画面へ遷移', async () => {
      const puppeteer = require('puppeteer')
      const browser = await puppeteer.launch({
        headless: true,
        ignoreHTTPSErrors: true
      })

      // 新しいページ起動
      const page = await browser.newPage()
      await page.setCookie(acCookies[0])

      // アップロードフォーマット一覧画面へ移動
      await page.goto('https://localhost:3000/uploadFormatList')

      // 請求書一覧画面へ移動
      await page.click('body > div.max-width > div:nth-child(3) > div > a.button.is-link.is-light.float-right')

      // 請求書一覧画面移動結果確認
      expect(await page.url()).toMatch('https://localhost:3000/csvupload')
      await browser.close()
    })
  })

  describe('4.契約ステータス：契約中', () => {
    test('請求書アップロードフォーマット一覧画面へアクセス', async () => {
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
        .get('/uploadFormatList')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(200)

      expect(res.text).toMatch(/- BConnectionデジタルトレード/i) // タイトルが含まれていること
    })

    test('削除ボタン押下し、ポップアップが表示', async () => {
      // ダイアログ確認用変数
      let dialogMessage = ''

      // アップロードフォーマット登録
      const path = require('path')
      const puppeteer = require('puppeteer')
      const browser = await puppeteer.launch({
        headless: true,
        ignoreHTTPSErrors: true
      })
      const page = await browser.newPage()
      await page.setCookie(acCookies[0])
      await page.goto('https://localhost:3000/uploadFormatList')
      await page.waitForTimeout(500)
      await page.click('body > div.max-width > div:nth-child(3) > div > a')
      await page.type('#uploadFormatItemName', 'インテグレーションテスト設定')
      const uploadFileElementHand = await page.$('#dataFile')
      await uploadFileElementHand.uploadFile(path.resolve('./testData/csvFormatUpload.csv'))
      await page.type('#uploadFormatNumber', '1')
      await page.type('#defaultNumber', '2')
      await page.click('#submit')

      await page.waitForTimeout(500)
      await page.select('#issueDate', '0')
      await page.select('#invoiceNumber', '1')
      await page.select('#tenantId', '2')
      await page.select('#paymentDate', '3')
      await page.select('#deliveryDate', '4')
      await page.select('#sellersItemNum', '5')
      await page.select('#itemName', '6')
      await page.select('#quantityValue', '7')
      await page.select('#quantityUnitCode', '8')
      await page.select('#priceValue', '9')
      await page.select('#taxRate', '10')

      await page.click('#confirmBtn')

      await page.waitForTimeout(500)

      await page.click('#submit')

      await page.waitForTimeout(500)

      // アップロードフォーマット登録後、画面遷移確認
      expect(await page.url()).toMatch('https://localhost:3000/uploadFormatList')

      // ダイアログ確認
      page.on('dialog', async (dialog) => {
        dialogMessage = dialog.message()
        await dialog.dismiss()
      })

      await page.click('#deleteButton')

      expect(dialogMessage).toBe('削除しますか？')
      await browser.close()
    })
  })

  describe('5.契約ステータス：変更申込', () => {
    test('請求書アップロードフォーマット一覧画面へアクセス', async () => {
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
        .get('/uploadFormatList')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(200)

      expect(res.text).toMatch(/- BConnectionデジタルトレード/i) // タイトルが含まれていること
    })
  })

  describe('6.契約ステータス：変更受付', () => {
    test('請求書アップロードフォーマット一覧画面へアクセス', async () => {
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
        .get('/uploadFormatList')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(200)

      expect(res.text).toMatch(/- BConnectionデジタルトレード/i) // タイトルが含まれていること
    })
  })

  describe('7.契約ステータス：解約申込', () => {
    test('請求書アップロードフォーマット一覧画面へアクセス', async () => {
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
        .get('/uploadFormatList')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(200)

      expect(res.text).toMatch(/- BConnectionデジタルトレード/i) // タイトルが含まれていること
    })
  })

  describe('8.契約ステータス：解約受付', () => {
    test('請求書アップロードフォーマット一覧画面へアクセス', async () => {
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
        .get('/uploadFormatList')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(200)

      expect(res.text).toMatch(/- BConnectionデジタルトレード/i) // タイトルが含まれていること
    })
  })

  describe('9.契約ステータス：解約', () => {
    test('請求書アップロードフォーマット一覧画面へアクセス', async () => {
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
        .get('/uploadFormatList')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(500)

      expect(res.text).toMatch(/上部メニューのHOMEボタンを押下し、トップページへお戻りください。/i) // タイトルが含まれていること
    })
  })

  describe('後処理', () => {
    test('userデータ削除', async () => {
      await db.User.destroy({ where: { tenantId: testTenantId } })
      await db.Tenant.destroy({ where: { tenantId: testTenantId } })
    })
  })
})
