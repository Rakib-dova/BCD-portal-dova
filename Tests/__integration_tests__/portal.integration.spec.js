'use strict'
const app = require('../../Application/app')
const request = require('supertest')
const { JSDOM } = require('jsdom')
const getTenantId = {}
const db = require('../../Application/models')

jest.setTimeout(60000) // jestのタイムアウトを60秒とする

const getCookies = require('./getCookies')

describe('ルーティングのインテグレーションテスト', () => {
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
    test('ポータルにアクセス：異常', async () => {
      const res = await request(app)
        .get('/portal')
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
  })

  describe('2.契約ステータス：登録申込', () => {
    test('基本情報設定画面アクセス：正常', async () => {
      const res = await request(app)
        .get('/portal')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(200)

      expect(res.text).toMatch(/ポータル - BConnectionデジタルトレード/i) // タイトルが含まれていること
    })
  })

  describe('3.契約ステータス：登録受付', () => {
    test('ポータルアクセス：', async () => {
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
        .get('/portal')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(200)

      expect(res.text).toMatch(/ポータル - BConnectionデジタルトレード/i) // タイトルが含まれていること
    })
  })

  describe('4.契約ステータス：契約中', () => {
    test('ポータルアクセス：正常', async () => {
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
        .get('/portal')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(200)

      expect(res.text).toMatch(/ポータル - BConnectionデジタルトレード/i) // タイトルが含まれていること
    })

    test('ポータル画面アイコン確認', async () => {
      const puppeteer = require('puppeteer')
      const browser = await puppeteer.launch({
        headless: true,
        ignoreHTTPSErrors: true
      })
      const page = await browser.newPage()
      await page.setCookie(acCookies[0])
      await page.goto('https://localhost:3000/portal', { waitUntil: 'networkidle0' })
      const pageUrl = await page.url()
      if (pageUrl === 'https://localhost:3000/portal') {
        // ページ表示完了まで待ち
        await page.waitForTimeout(1000)
        const pageIcons = await page.evaluate(() => {
          const iconTiles = []
          // 内部サービスアイコンとコンテンツを読み込み
          for (let row = 1; row < 3; row++) {
            for (let col = 1; col < 4; col++) {
              const iconObj = document.querySelector(
                `body > div.container.is-max-widescreen > div:nth-child(2) > div:nth-child(${row}) > div:nth-child(${col}) > div > a > div > div.media-content > p.title.is-5`
              )
              const contentObj = document.querySelector(
                `body > div.container.is-max-widescreen > div:nth-child(2) > div:nth-child(${row}) > div:nth-child(${col}) > div > a > div > div.media-content > p:nth-child(2)`
              )
              if (iconObj === null || iconObj === undefined) continue
              iconTiles.push({
                title: iconObj.innerText,
                content: contentObj.innerText
              })
            }
          }

          // 外部サービスアイコンとコンテンツを読み込み
          for (let row = 1; row < 3; row++) {
            const iconObj = document.querySelector(
              `body > div.container.is-max-widescreen > div:nth-child(3) > div > div:nth-child(${row}) > div > a > div > div.media-content > p.title.is-5`
            )
            const contentObj = document.querySelector(
              `body > div.container.is-max-widescreen > div:nth-child(3) > div > div:nth-child(${row}) > div > a > div > div.media-content > p:nth-child(2)`
            )
            if (iconObj === null || iconObj === undefined) continue
            iconTiles.push({
              title: iconObj.innerText,
              content: contentObj.innerText
            })
          }

          return iconTiles
        })

        // アイコンタイトル
        const iconTitle = [
          '請求書一括作成',
          '請求情報ダウンロード',
          '仕訳情報設定',
          'サポート',
          '設定',
          'ファクタリング',
          '銀行振込消込'
        ]

        // アイコンの説明
        const iconContent = [
          '指定ファイルをアップロードすることで、複数のドラフト状態の請求書を一括で作成できます。',
          '送受信した請求情報をCSV形式でダウンロードできます。',
          '勘定科目と補助科目をユーザーカスタマイズができます。',
          '設定方法、利用方法に関するお問い合わせが無料で利用できます。',
          '契約情報変更と解約を行うことができます。',
          '請求書（売掛金）を買い取らせていただくことで素早く簡単に現金化ができるサービスです。',
          '専用の振込口座をご利用いただくことで振込名義人によらず請求先を特定できるサービスです。'
        ]

        // アイコンの配置とタイトル、アイコン説明をチェックする
        iconTitle.forEach((item, idx) => {
          expect(pageIcons[idx].title).toBe(item)
          expect(pageIcons[idx].content).toBe(iconContent[idx])
        })

        // ブラウザ終了
        await page.close()
      }
    })
  })

  describe('5.契約ステータス：変更申込', () => {
    test('ポータルアクセス：正常', async () => {
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
        .get('/portal')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(200)

      expect(res.text).toMatch(/ポータル - BConnectionデジタルトレード/i) // タイトルが含まれていること
    })
  })

  describe('6.契約ステータス：変更受付', () => {
    test('ポータルアクセス：正常', async () => {
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
        .get('/portal')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(200)

      expect(res.text).toMatch(/ポータル - BConnectionデジタルトレード/i) // タイトルが含まれていること
    })
  })

  describe('7.契約ステータス：解約申込', () => {
    test('基本情報設定画面アクセス：準正常', async () => {
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
        .get('/portal')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(200)

      expect(res.text).toMatch(/現在解約手続き中です。/i) // タイトルが含まれていること
    })
  })

  describe('8.契約ステータス：解約受付', () => {
    test('基本情報設定画面アクセス：準正常', async () => {
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
        .get('/portal')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(200)

      expect(res.text).toMatch(/現在解約手続き中です。/i) // タイトルが含まれていること
    })
  })

  describe('9.契約ステータス：解約', () => {
    test('基本情報設定画面アクセス：準正常', async () => {
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
        .get('/portal')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(303)

      expect(res.headers.location).toMatch('/tenant/register') // タイトル
    })
  })

  afterAll(async () => {
    console.log('後処理処理')
    await db.User.destroy({ where: { tenantId: testTenantId } })
    await db.Tenant.destroy({ where: { tenantId: testTenantId } })
  })
})
