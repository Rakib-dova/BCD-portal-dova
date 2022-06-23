'use strict'
const request = require('supertest')
const puppeteer = require('puppeteer')
const app = require('../../Application/app')
const db = require('../../Application/models')
const constants = require('../../Application/constants')
const contractController = require('../../Application/controllers/contractController.js')
const getCookies = require('./getCookies')
const common = require('./common')

// 契約ステータス
const contractStatuses = constants.statusConstants.contractStatuses
// サービス種別
const serviceTypes = constants.statusConstants.serviceTypes
// オーダー種別
const orderTypes = constants.statusConstants.orderTypes

const getTenantId = {}

const wrongPatternError = '　入力値が間違いました。'
const lightPlanCanceling = '現在ライトプランは解約中です。'
const lightPlanUnregistered = '現在ライトプランは未契約です。'

const postData = {
  salesChannelCode: '000000',
  salesChannelName: '販売チャネル名',
  salesChannelDeptName: '部課名',
  salesChannelEmplyeeCode: '11111111',
  salesChannelPersonName: '担当者名',
  salesChannelDeptType: '{"code":"01","name":"Com第一営業本部"}',
  salesChannelPhoneNumber: '000-0000-0000',
  salesChannelMailAddress: 'aaa@aaa.com'
}

const lessOrderData = {
  contractBasicInfo: {
    tradeshiftId: 'any',
    orderId: '',
    orderType: '030',
    serviceType: '030',
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
    kaianPassword: ''
  }
}

const fullOrderData = {
  contractBasicInfo: {
    tradeshiftId: 'any',
    orderId: '',
    orderType: '030',
    serviceType: '030',
    contractChangeName: '',
    contractChangeAddress: '',
    contractChangeContact: '',
    appDate: '',
    OpeningDate: '',
    contractNumber: '',
    salesChannelCode: '000000',
    salesChannelName: '販売チャネル名',
    salesChannelDeptName: '部課名',
    salesChannelEmplyeeCode: '11111111',
    salesChannelPersonName: '担当者名',
    salesChannelDeptType: 'Com第一営業本部',
    salesChannelPhoneNumber: '000-0000-0000',
    salesChannelMailAddress: 'aaa@aaa.com',
    kaianPassword: ''
  }
}

/**
 * ライトプラン解約画面の全部項目の入力動作
 * @param {*} page
 */
const fillAll = async (page) => {
  // 全部入力
  await page.type('#salesChannelCode', postData.salesChannelCode)
  await page.type('#salesChannelName', postData.salesChannelName)
  await page.type('#salesChannelDeptName', postData.salesChannelDeptName)
  await page.type('#salesChannelEmplyeeCode', postData.salesChannelEmplyeeCode)
  await page.type('#salesChannelPersonName', postData.salesChannelPersonName)
  await page.select('#salesChannelDeptType', postData.salesChannelDeptType)
  await page.type('#salesChannelPhoneNumber', postData.salesChannelPhoneNumber)
  await page.type('#salesChannelMailAddress', postData.salesChannelMailAddress)
}

// jestのタイムアウトを60秒とする
jest.setTimeout(60000)

describe('ライトプラン解約のインテグレーションテスト', () => {
  let acCookies, userCookies, testTenantId

  test('beforeAll', async () => {
    // /authにアクセス:oauth2認証をし、セッション用Cookieを取得
    const options = require('minimist')(process.argv.slice(2))

    // アカウント管理者のID/SECRETは、テストコマンドの引数から取得
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
    lessOrderData.contractBasicInfo.tradeshiftId = testTenantId
    fullOrderData.contractBasicInfo.tradeshiftId = testTenantId

    // Cookieを使ってローカル開発環境のDBからCookieと紐づくユーザを削除しておく
    await db.User.destroy({ where: { tenantId: testTenantId } })
    await db.Tenant.destroy({ where: { tenantId: testTenantId } })
  })

  afterAll(async () => {
    // userデータ削除
    await db.User.destroy({ where: { tenantId: testTenantId } })
    await db.Tenant.destroy({ where: { tenantId: testTenantId } })
  })

  describe('無償契約ステータスに応じて画面の表示内容の確認', () => {
    describe('無償契約：未登録', () => {
      describe('管理者', () => {
        test('ライトプラン解約画面が表示されない、テナント登録画面へリダイレクト', async () => {
          const res = await request(app)
            .get('/cancelLightPlan')
            .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
            .expect(303)

          // リダイレクト先
          expect(res.headers.location).toMatch('/tenant/register')
        })

        test('ライトプラン解約の登録(POST)ができない、テナント登録画面へリダイレクト', async () => {
          const res = await request(app)
            .post('/cancelLightPlan/register')
            .send({ ...postData })
            .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
            .expect(303)

          // リダイレクト先
          expect(res.headers.location).toMatch('/tenant/register')
        })
      })

      describe('一般ユーザ', () => {
        test('ライトプラン解約画面が表示されない、テナント登録画面へリダイレクト', async () => {
          const res = await request(app)
            .get('/cancelLightPlan')
            .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
            .expect(303)

          // リダイレクト先
          expect(res.headers.location).toMatch('/tenant/register')
        })

        test('ライトプラン解約の登録(POST)ができない、テナント登録画面へリダイレクト', async () => {
          const res = await request(app)
            .post('/cancelLightPlan/register')
            .send({ ...postData })
            .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
            .expect(303)

          // リダイレクト先
          expect(res.headers.location).toMatch('/tenant/register')
        })
      })
    })

    describe('無償契約：登録済', () => {
      beforeAll(async () => {
        // BCD無償契約の利用登録
        await common.bcdRegister(acCookies[0])
      })

      afterAll(async () => {
        // userデータ削除
        await db.User.destroy({ where: { tenantId: testTenantId } })
        await db.Tenant.destroy({ where: { tenantId: testTenantId } })
      })

      describe('1.無償契約ステータス：登録申込(10)', () => {
        describe('管理者', () => {
          test('ライトプラン解約画面が表示されない、「現在利用登録手続き中です。」が表示される', async () => {
            const res = await request(app)
              .get('/cancelLightPlan')
              .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
              .expect(200)

            // 画面内容確認
            expect(res.text).toMatch(/現在利用登録手続き中です。/i)
          })

          test('ライトプラン解約の登録(POST)ができない、「現在利用登録手続き中です。」が表示される', async () => {
            const res = await request(app)
              .post('/cancelLightPlan/register')
              .send({ ...postData })
              .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
              .expect(200)

            // 画面内容確認
            expect(res.text).toMatch(/現在利用登録手続き中です。/i)
          })
        })

        describe('一般ユーザ', () => {
          test('ライトプラン解約画面が表示されない、「現在利用登録手続き中です。」が表示される', async () => {
            const res = await request(app)
              .get('/cancelLightPlan')
              .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
              .expect(200)

            // 画面内容確認
            expect(res.text).toMatch(/現在利用登録手続き中です。/i)
          })

          test('ライトプラン解約の登録(POST)ができない、「現在利用登録手続き中です。」が表示される', async () => {
            const res = await request(app)
              .post('/cancelLightPlan/register')
              .send({ ...postData })
              .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
              .expect(200)

            // 画面内容確認
            expect(res.text).toMatch(/現在利用登録手続き中です。/i)
          })
        })
      })

      describe('2.無償契約ステータス：登録受付(11)', () => {
        beforeAll(async () => {
          await db.Contract.update(
            {
              contractStatus: contractStatuses.newContractReceive
            },
            {
              where: {
                tenantId: testTenantId,
                serviceType: serviceTypes.bcd
              }
            }
          )
        })

        describe('管理者', () => {
          test('ライトプラン解約画面が表示されない、「現在利用登録手続き中です。」が表示される', async () => {
            const res = await request(app)
              .get('/cancelLightPlan')
              .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
              .expect(200)

            // 画面内容確認
            expect(res.text).toMatch(/現在利用登録手続き中です。/i)
          })

          test('ライトプラン解約の登録(POST)ができない、「現在利用登録手続き中です。」が表示される', async () => {
            const res = await request(app)
              .post('/cancelLightPlan/register')
              .send({ ...postData })
              .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
              .expect(200)

            // 画面内容確認
            expect(res.text).toMatch(/現在利用登録手続き中です。/i)
          })
        })

        describe('一般ユーザ', () => {
          test('ライトプラン解約画面が表示されない、「現在利用登録手続き中です。」が表示される', async () => {
            const res = await request(app)
              .get('/cancelLightPlan')
              .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
              .expect(200)

            // 画面内容確認
            expect(res.text).toMatch(/現在利用登録手続き中です。/i)
          })

          test('ライトプラン解約の登録(POST)ができない、「現在利用登録手続き中です。」が表示される', async () => {
            const res = await request(app)
              .post('/cancelLightPlan/register')
              .send({ ...postData })
              .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
              .expect(200)

            // 画面内容確認
            expect(res.text).toMatch(/現在利用登録手続き中です。/i)
          })
        })
      })

      describe('3.無償契約ステータス：契約中(00)', () => {
        beforeAll(async () => {
          await db.Order.destroy({ where: { tenantId: testTenantId } })
          await db.Contract.update(
            {
              numberN: '1234567890',
              contractStatus: contractStatuses.onContract
            },
            {
              where: {
                tenantId: testTenantId,
                serviceType: serviceTypes.bcd
              }
            }
          )
        })

        describe('管理者', () => {
          test('ライトプラン解約画面が表示されない、「現在ライトプランは未契約です。」が表示される', async () => {
            const res = await request(app)
              .get('/cancelLightPlan')
              .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
              .expect(200)

            // 画面内容確認
            expect(res.text).toMatch(/現在ライトプランは未契約です。/i)
          })
        })

        describe('一般ユーザ', () => {
          test('ライトプラン解約画面が表示されない、「現在ライトプランは未契約です。」が表示される', async () => {
            const res = await request(app)
              .get('/cancelLightPlan')
              .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
              .expect(200)

            // 画面内容確認
            expect(res.text).toMatch(/現在ライトプランは未契約です。/i)
          })
        })
      })

      describe('4.無償契約ステータス：変更申込(40)', () => {
        beforeAll(async () => {
          await db.Contract.update(
            {
              contractStatus: contractStatuses.simpleChangeContractOrder
            },
            {
              where: {
                tenantId: testTenantId,
                serviceType: serviceTypes.bcd
              }
            }
          )
        })

        describe('管理者', () => {
          test('ライトプラン解約画面が表示されない、「現在ライトプランは未契約です。」が表示される', async () => {
            const res = await request(app)
              .get('/cancelLightPlan')
              .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
              .expect(200)

            // 画面内容確認
            expect(res.text).toMatch(/現在ライトプランは未契約です。/i)
          })
        })

        describe('一般ユーザ', () => {
          test('ライトプラン解約画面が表示されない、「現在ライトプランは未契約です。」が表示される', async () => {
            const res = await request(app)
              .get('/cancelLightPlan')
              .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
              .expect(200)

            // 画面内容確認
            expect(res.text).toMatch(/現在ライトプランは未契約です。/i)
          })
        })
      })

      describe('5.無償契約ステータス：変更受付(41)', () => {
        beforeAll(async () => {
          await db.Contract.update(
            {
              contractStatus: contractStatuses.simpleChangeContractReceive
            },
            {
              where: {
                tenantId: testTenantId,
                serviceType: serviceTypes.bcd
              }
            }
          )
        })

        describe('管理者', () => {
          test('ライトプラン解約画面が表示されない、「現在ライトプランは未契約です。」が表示される', async () => {
            const res = await request(app)
              .get('/cancelLightPlan')
              .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
              .expect(200)

            // 画面内容確認
            expect(res.text).toMatch(/現在ライトプランは未契約です。/i)
          })
        })

        describe('一般ユーザ', () => {
          test('ライトプラン解約画面が表示されない、「現在ライトプランは未契約です。」が表示される', async () => {
            const res = await request(app)
              .get('/cancelLightPlan')
              .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
              .expect(200)

            // 画面内容確認
            expect(res.text).toMatch(/現在ライトプランは未契約です。/i)
          })
        })
      })

      describe('6.無償契約ステータス：解約申込(30)', () => {
        beforeAll(async () => {
          await db.Contract.update(
            {
              contractStatus: contractStatuses.cancellationOrder
            },
            {
              where: {
                tenantId: testTenantId,
                serviceType: serviceTypes.bcd
              }
            }
          )
        })

        describe('管理者', () => {
          test('ライトプラン解約画面が表示されない、「現在解約手続き中です。」が表示される', async () => {
            const res = await request(app)
              .get('/cancelLightPlan')
              .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
              .expect(200)

            // 画面内容確認
            expect(res.text).toMatch(/現在解約手続き中です。/i)
          })

          test('ライトプラン解約の登録(POST)ができない、「現在解約手続き中です。」が表示される', async () => {
            const res = await request(app)
              .post('/cancelLightPlan/register')
              .send({ ...postData })
              .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
              .expect(200)

            // 画面内容確認
            expect(res.text).toMatch(/現在解約手続き中です。/i)
          })
        })

        describe('一般ユーザ', () => {
          test('ライトプラン解約画面が表示されない、「現在解約手続き中です。」が表示される', async () => {
            const res = await request(app)
              .get('/cancelLightPlan')
              .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
              .expect(200)

            // 画面内容確認
            expect(res.text).toMatch(/現在解約手続き中です。/i)
          })

          test('ライトプラン解約の登録(POST)ができない、「現在解約手続き中です。」が表示される', async () => {
            const res = await request(app)
              .post('/cancelLightPlan/register')
              .send({ ...postData })
              .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
              .expect(200)

            // 画面内容確認
            expect(res.text).toMatch(/現在解約手続き中です。/i)
          })
        })
      })

      describe('7.無償契約ステータス：解約受付(31)', () => {
        beforeAll(async () => {
          await db.Contract.update(
            {
              contractStatus: contractStatuses.cancellationOrder
            },
            {
              where: {
                tenantId: testTenantId,
                serviceType: serviceTypes.bcd
              }
            }
          )
        })

        describe('管理者', () => {
          test('ライトプラン解約画面が表示されない、「現在解約手続き中です。」が表示される', async () => {
            const res = await request(app)
              .get('/cancelLightPlan')
              .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
              .expect(200)

            // 画面内容確認
            expect(res.text).toMatch(/現在解約手続き中です。/i)
          })

          test('ライトプラン解約の登録(POST)ができない、「現在解約手続き中です。」が表示される', async () => {
            const res = await request(app)
              .post('/cancelLightPlan/register')
              .send({ ...postData })
              .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
              .expect(200)

            // 画面内容確認
            expect(res.text).toMatch(/現在解約手続き中です。/i)
          })
        })

        describe('一般ユーザ', () => {
          test('ライトプラン解約画面が表示されない、「現在解約手続き中です。」が表示される', async () => {
            const res = await request(app)
              .get('/cancelLightPlan')
              .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
              .expect(200)

            // 画面内容確認
            expect(res.text).toMatch(/現在解約手続き中です。/i)
          })

          test('ライトプラン解約の登録(POST)ができない、「現在解約手続き中です。」が表示される', async () => {
            const res = await request(app)
              .post('/cancelLightPlan/register')
              .send({ ...postData })
              .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
              .expect(200)

            // 画面内容確認
            expect(res.text).toMatch(/現在解約手続き中です。/i)
          })
        })
      })

      describe('8.無償契約ステータス：解約(99)', () => {
        beforeAll(async () => {
          await db.Contract.update(
            {
              contractStatus: contractStatuses.canceledContract,
              deleteFlag: true
            },
            {
              where: {
                tenantId: testTenantId,
                serviceType: serviceTypes.bcd
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
        })

        describe('管理者', () => {
          test('ライトプラン解約画面が表示されない、テナント登録画面へリダイレクト', async () => {
            const res = await request(app)
              .get('/cancelLightPlan')
              .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
              .expect(303)

            // リダイレクト先
            expect(res.headers.location).toMatch('/tenant/register')
          })

          test('ライトプラン解約の登録(POST)ができない、テナント登録画面へリダイレクト', async () => {
            const res = await request(app)
              .post('/cancelLightPlan/register')
              .send({ ...postData })
              .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
              .expect(303)

            // リダイレクト先
            expect(res.headers.location).toMatch('/tenant/register')
          })
        })

        describe('一般ユーザ', () => {
          test('ライトプラン解約画面が表示されない、テナント登録画面へリダイレクト', async () => {
            const res = await request(app)
              .get('/cancelLightPlan')
              .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
              .expect(303)

            // リダイレクト先
            expect(res.headers.location).toMatch('/tenant/register')
          })

          test('ライトプラン解約の登録(POST)ができない、テナント登録画面へリダイレクト', async () => {
            const res = await request(app)
              .post('/cancelLightPlan/register')
              .send({ ...postData })
              .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
              .expect(303)

            // リダイレクト先
            expect(res.headers.location).toMatch('/tenant/register')
          })
        })
      })
    })
  })

  describe('ライトプラン契約ステータスに応じて画面の表示内容の確認', () => {
    let browser, page

    beforeAll(async () => {
      // BCD無償契約の利用登録
      await common.bcdRegister(acCookies[0])

      await db.Order.destroy({ where: { tenantId: testTenantId } })
      await db.Contract.update(
        {
          numberN: '1234567890',
          contractStatus: contractStatuses.onContract
        },
        {
          where: {
            tenantId: testTenantId,
            serviceType: serviceTypes.bcd
          }
        }
      )
    })

    afterAll(async () => {
      // userデータ削除
      await db.User.destroy({ where: { tenantId: testTenantId } })
      await db.Tenant.destroy({ where: { tenantId: testTenantId } })
    })

    beforeEach(async () => {
      // ライトプラン解約画面の初期
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

    describe('ライトプラン:未申込', () => {
      test('「現在ライトプランは未契約です。」が表示される', async () => {
        await page.goto('https://localhost:3000/cancelLightPlan')

        // 期待結果
        expect(await page.$eval('.subtitle', (el) => el.textContent)).toBe(lightPlanUnregistered)
      })
    })

    describe('ライトプラン:申込済', () => {
      beforeAll(async () => {
        // ライトプラン申込
        await common.lightPlanRegister(acCookies[0])
      })

      describe('「現在ライトプランは未契約です。」が表示される', () => {
        test('ライトプラン契約ステータス:10', async () => {
          await page.goto('https://localhost:3000/cancelLightPlan')

          // 期待結果
          expect(await page.$eval('.subtitle', (el) => el.textContent)).toBe(lightPlanUnregistered)
        })

        test('ライトプラン契約ステータス:11', async () => {
          // 準備
          await db.Contract.update(
            {
              contractStatus: contractStatuses.newContractReceive
            },
            {
              where: {
                tenantId: testTenantId,
                serviceType: serviceTypes.lightPlan
              }
            }
          )

          await page.goto('https://localhost:3000/cancelLightPlan')

          // 期待結果
          expect(await page.$eval('.subtitle', (el) => el.textContent)).toBe(lightPlanUnregistered)
        })

        test('ライトプラン契約ステータス:12', async () => {
          // 準備
          await db.Contract.update(
            {
              contractStatus: contractStatuses.newContractBeforeCompletion
            },
            {
              where: {
                tenantId: testTenantId,
                serviceType: serviceTypes.lightPlan
              }
            }
          )

          await page.goto('https://localhost:3000/cancelLightPlan')

          // 期待結果
          expect(await page.$eval('.subtitle', (el) => el.textContent)).toBe(lightPlanUnregistered)
        })

        test('ライトプラン契約ステータス:12', async () => {
          // 準備
          await db.Contract.update(
            {
              contractStatus: contractStatuses.canceledContract
            },
            {
              where: {
                tenantId: testTenantId,
                serviceType: serviceTypes.lightPlan
              }
            }
          )

          await page.goto('https://localhost:3000/cancelLightPlan')

          // 期待結果
          expect(await page.$eval('.subtitle', (el) => el.textContent)).toBe(lightPlanUnregistered)
        })
      })

      describe('ライトプラン解約画面が表示される', () => {
        test('ライトプラン契約ステータス:00', async () => {
          // 準備
          await db.Contract.update(
            {
              contractStatus: contractStatuses.onContract
            },
            {
              where: {
                tenantId: testTenantId,
                serviceType: serviceTypes.lightPlan
              }
            }
          )

          await page.goto('https://localhost:3000/cancelLightPlan')

          // 期待結果
          expect(await page.title()).toBe('ライトプラン解約 - BConnectionデジタルトレード')
        })
      })

      describe('「現在ライトプランは未契約です。」が表示される', () => {
        test('ライトプラン契約ステータス:30', async () => {
          // 準備
          await db.Contract.update(
            {
              contractStatus: contractStatuses.cancellationOrder
            },
            {
              where: {
                tenantId: testTenantId,
                serviceType: serviceTypes.lightPlan
              }
            }
          )

          await page.goto('https://localhost:3000/cancelLightPlan')

          // 期待結果
          expect(await page.$eval('.subtitle', (el) => el.textContent)).toBe(lightPlanCanceling)
        })

        test('ライトプラン契約ステータス:31', async () => {
          // 準備
          await db.Contract.update(
            {
              contractStatus: contractStatuses.cancellationReceive
            },
            {
              where: {
                tenantId: testTenantId,
                serviceType: serviceTypes.lightPlan
              }
            }
          )

          await page.goto('https://localhost:3000/cancelLightPlan')

          // 期待結果
          expect(await page.$eval('.subtitle', (el) => el.textContent)).toBe(lightPlanCanceling)
        })
      })
    })
  })

  describe('ライトプラン解約画面動作の確認', () => {
    let browser, page

    beforeEach(async () => {
      // ライトプラン解約画面の初期
      browser = await puppeteer.launch({
        headless: true,
        ignoreHTTPSErrors: true
      })
      page = await browser.newPage()
      await page.setCookie(acCookies[0])
      await page.goto('https://localhost:3000/cancelLightPlan')
    })

    afterEach(async () => {
      await browser.close()
    })

    afterAll(async () => {
      // userデータ削除
      await db.User.destroy({ where: { tenantId: testTenantId } })
      await db.Tenant.destroy({ where: { tenantId: testTenantId } })
    })

    test('beforeAll', async () => {
      // BCD無償契約の利用登録
      await common.bcdRegister(acCookies[0])

      await db.Contract.update(
        {
          numberN: '1234567890',
          contractStatus: contractStatuses.onContract
        },
        {
          where: {
            tenantId: testTenantId,
            serviceType: serviceTypes.bcd
          }
        }
      )

      // ライトプラン申込
      await common.lightPlanRegister(acCookies[0])

      await db.Contract.update(
        {
          numberN: '000000000',
          contractStatus: contractStatuses.onContract
        },
        {
          where: {
            tenantId: testTenantId,
            serviceType: serviceTypes.lightPlan
          }
        }
      )
      await db.Order.destroy({ where: { tenantId: testTenantId } })
    })

    describe('ライトプラン解約画面の初期表示', () => {
      test('ライトプラン解約画面の初期表示', async () => {
        // 期待結果
        // URL
        expect(await page.url()).toBe('https://localhost:3000/cancelLightPlan')
        expect(await page.title()).toBe('ライトプラン解約 - BConnectionデジタルトレード')
        // 初期値
        expect(await page.$eval('#salesChannelCode', (el) => el.value)).toBe('')
        expect(await page.$eval('#salesChannelName', (el) => el.value)).toBe('')
        expect(await page.$eval('#salesChannelDeptName', (el) => el.value)).toBe('')
        expect(await page.$eval('#salesChannelEmplyeeCode', (el) => el.value)).toBe('')
        expect(await page.$eval('#salesChannelPersonName', (el) => el.value)).toBe('')
        expect(await page.$eval('#salesChannelDeptType', (el) => el.value)).toBe('')
        expect(await page.$eval('#salesChannelPhoneNumber', (el) => el.value)).toBe('')
        expect(await page.$eval('#salesChannelMailAddress', (el) => el.value)).toBe('')
      })
    })

    describe('次へボタンと確認モーダルの動作の確認', () => {
      test('全部未入力の場合、バリデーションメッセージがない(全部未入力)', async () => {
        // 次へボタンのクリック
        await page.click('#cancelltion-button')
        await page.waitForTimeout(500)

        // 期待結果
        expect(await page.$eval('#salesChannelCodeMessage', (el) => el.textContent)).toBe('')
        expect(await page.$eval('#salesChannelNameMessage', (el) => el.textContent)).toBe('')
        expect(await page.$eval('#salesChannelDeptNameMessage', (el) => el.textContent)).toBe('')
        expect(await page.$eval('#salesChannelEmplyeeCodeMessage', (el) => el.textContent)).toBe('')
        expect(await page.$eval('#salesChannelPersonNameMessage', (el) => el.textContent)).toBe('')
        expect(await page.$eval('#salesChannelPhoneNumberMessage', (el) => el.textContent)).toBe('')
        expect(await page.$eval('#salesChannelMailAddressMessage', (el) => el.textContent)).toBe('')

        // 解約確認モーダルの期待結果
        expect(await page.$eval('#cancellation-modal', (el) => el.classList?.value)).toMatch(/is-active/i)
        expect(await page.$eval('#resalesChannelCode', (el) => el.textContent)).toBe('')
        expect(await page.$eval('#resalesChannelName', (el) => el.textContent)).toBe('')
        expect(await page.$eval('#resalesChannelDeptName', (el) => el.textContent)).toBe('')
        expect(await page.$eval('#resalesChannelEmplyeeCode', (el) => el.textContent)).toBe('')
        expect(await page.$eval('#resalesChannelPersonName', (el) => el.textContent)).toBe('')
        expect(await page.$eval('#resalesChannelDeptType', (el) => el.textContent)).toBe('')
        expect(await page.$eval('#resalesChannelPhoneNumber', (el) => el.textContent)).toBe('')
        expect(await page.$eval('#resalesChannelMailAddress', (el) => el.textContent)).toBe('')
      })

      test('全部誤入力の場合、バリデーションメッセージが表示される(全部誤入力)', async () => {
        // 入力
        await page.type('#salesChannelCode', 'あああ')
        await page.type('#salesChannelName', '111')
        await page.type('#salesChannelDeptName', '111')
        await page.type('#salesChannelEmplyeeCode', 'あああ')
        await page.type('#salesChannelPersonName', '111')
        await page.type('#salesChannelPhoneNumber', '111')
        await page.type('#salesChannelMailAddress', '111')

        // 次へボタンのクリック
        await page.click('#cancelltion-button')
        await page.waitForTimeout(500)

        // 期待結果
        expect(await page.$eval('#salesChannelCodeMessage', (el) => el.textContent)).toBe(wrongPatternError)
        expect(await page.$eval('#salesChannelNameMessage', (el) => el.textContent)).toBe(wrongPatternError)
        expect(await page.$eval('#salesChannelDeptNameMessage', (el) => el.textContent)).toBe(wrongPatternError)
        expect(await page.$eval('#salesChannelEmplyeeCodeMessage', (el) => el.textContent)).toBe(wrongPatternError)
        expect(await page.$eval('#salesChannelPersonNameMessage', (el) => el.textContent)).toBe(wrongPatternError)
        expect(await page.$eval('#salesChannelPhoneNumberMessage', (el) => el.textContent)).toBe(wrongPatternError)
        expect(await page.$eval('#salesChannelMailAddressMessage', (el) => el.textContent)).toBe(wrongPatternError)
      })

      test('入力値が直した場合、バリデーションメッセージがクリアされる(全部誤入力⇒全部クリア)', async () => {
        // 入力
        await page.type('#salesChannelCode', 'あああ')
        await page.type('#salesChannelName', '111')
        await page.type('#salesChannelDeptName', '111')
        await page.type('#salesChannelEmplyeeCode', 'あああ')
        await page.type('#salesChannelPersonName', '111')
        await page.type('#salesChannelPhoneNumber', '111')
        await page.type('#salesChannelMailAddress', '111')

        // 次へボタンのクリック
        await page.click('#cancelltion-button')
        await page.waitForTimeout(500)

        // 全部クリア
        await page.$eval('#salesChannelCode', (el) => (el.value = ''))
        await page.$eval('#salesChannelName', (el) => (el.value = ''))
        await page.$eval('#salesChannelDeptName', (el) => (el.value = ''))
        await page.$eval('#salesChannelEmplyeeCode', (el) => (el.value = ''))
        await page.$eval('#salesChannelPersonName', (el) => (el.value = ''))
        await page.$eval('#salesChannelDeptType', (el) => (el.value = ''))
        await page.$eval('#salesChannelPhoneNumber', (el) => (el.value = ''))
        await page.$eval('#salesChannelMailAddress', (el) => (el.value = ''))

        // 次へボタンのクリック
        await page.click('#cancelltion-button')
        await page.waitForTimeout(500)

        // 期待結果
        expect(await page.$eval('#salesChannelCodeMessage', (el) => el.textContent)).toBe('')
        expect(await page.$eval('#salesChannelNameMessage', (el) => el.textContent)).toBe('')
        expect(await page.$eval('#salesChannelDeptNameMessage', (el) => el.textContent)).toBe('')
        expect(await page.$eval('#salesChannelEmplyeeCodeMessage', (el) => el.textContent)).toBe('')
        expect(await page.$eval('#salesChannelPersonNameMessage', (el) => el.textContent)).toBe('')
        expect(await page.$eval('#salesChannelPhoneNumberMessage', (el) => el.textContent)).toBe('')
        expect(await page.$eval('#salesChannelMailAddressMessage', (el) => el.textContent)).toBe('')

        // 解約確認モーダルの期待結果
        expect(await page.$eval('#cancellation-modal', (el) => el.classList?.value)).toMatch(/is-active/i)
        expect(await page.$eval('#resalesChannelCode', (el) => el.textContent)).toBe('')
        expect(await page.$eval('#resalesChannelName', (el) => el.textContent)).toBe('')
        expect(await page.$eval('#resalesChannelDeptName', (el) => el.textContent)).toBe('')
        expect(await page.$eval('#resalesChannelEmplyeeCode', (el) => el.textContent)).toBe('')
        expect(await page.$eval('#resalesChannelPersonName', (el) => el.textContent)).toBe('')
        expect(await page.$eval('#resalesChannelDeptType', (el) => el.textContent)).toBe('')
        expect(await page.$eval('#resalesChannelPhoneNumber', (el) => el.textContent)).toBe('')
        expect(await page.$eval('#resalesChannelMailAddress', (el) => el.textContent)).toBe('')
      })

      test('解約確認モーダルの表示内容の確認(全部入力⇒次へ⇒キャンセル⇒次へ⇒✖（閉じる）⇒次へ)', async () => {
        // 確認モーダルの表示内容の確認
        const checkCancellationModal = async (page) => {
          expect(await page.$eval('#cancellation-modal', (el) => el.classList?.value)).toMatch(/is-active/i)
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

        // 次へボタンのクリック
        await page.click('#cancelltion-button')
        await page.waitForTimeout(500)

        // 期待結果
        await checkCancellationModal(page)

        // キャンセルボタンのクリック
        await page.click('a.button.cancel-button[data-target="cancellation-modal"]')
        await page.waitForTimeout(500)

        // 期待結果
        expect(await page.$eval('#cancellation-modal', (el) => el.classList?.value)).not.toMatch(/is-active/i)

        // 次へボタンのクリック
        await page.click('#cancelltion-button')
        await page.waitForTimeout(500)

        // 期待結果
        await checkCancellationModal(page)

        // 確認モーダルを閉じる
        await page.click('button.delete[data-target="cancellation-modal"]')
        expect(await page.$eval('#cancellation-modal', (el) => el.classList?.value)).not.toMatch(/is-active/i)

        // 次へボタンのクリック
        await page.click('#cancelltion-button')
        await page.waitForTimeout(500)

        // 期待結果
        await checkCancellationModal(page)
      })
    })

    describe('戻るボタンの動作の確認', () => {
      test('戻るボタンのクリック', async () => {
        // 登録ボタンのクリック
        await page.click('#return-btn')
        await page.waitForTimeout(500)

        // 期待結果
        expect(await page.url()).toBe('https://localhost:3000/portal')
      })
    })

    describe('解約ボタンの動作の確認', () => {
      afterEach(async () => {
        // DBクリア
        await db.Order.destroy({ where: { orderType: orderTypes.cancelOrder } })
        await db.Contract.update(
          {
            contractStatus: contractStatuses.onContract
          },
          {
            where: {
              tenantId: testTenantId,
              serviceType: serviceTypes.lightPlan
            }
          }
        )
      })

      test('最低限情報登録', async () => {
        // 次へボタンのクリック
        await page.click('#cancelltion-button')
        await page.waitForTimeout(500)

        // 解約ボタンのクリック
        await page.click('#submit')
        await page.waitForTimeout(500)

        // 期待結果
        expect(await page.url()).toBe('https://localhost:3000/portal')
        expect(await page.$eval('#message-info', (el) => el.title)).toBe('ライトプラン解約が完了いたしました。')

        // DB確認
        const contracts = await contractController.findContracts(
          { tenantId: testTenantId, serviceType: serviceTypes.lightPlan },
          null
        )
        expect(contracts?.length).toBe(1)
        expect(contracts[0].contractStatus).toBe(contractStatuses.cancellationOrder)

        const order = await db.Order.findOne({
          where: { contractId: contracts[0].contractId }
        })
        expect(order.orderType).toBe(orderTypes.cancelOrder)
        expect(order.orderData).toBe(JSON.stringify(lessOrderData))
      })

      test('全部情報登録', async () => {
        // 全部入力
        await fillAll(page)

        // 次へボタンのクリック
        await page.click('#cancelltion-button')
        await page.waitForTimeout(500)

        // 解約ボタンのクリック
        await page.click('#submit')
        await page.waitForTimeout(500)

        // 期待結果
        expect(await page.url()).toBe('https://localhost:3000/portal')
        expect(await page.$eval('#message-info', (el) => el.title)).toBe('ライトプラン解約が完了いたしました。')

        // DB確認
        const contracts = await contractController.findContracts(
          { tenantId: testTenantId, serviceType: serviceTypes.lightPlan },
          null
        )
        expect(contracts?.length).toBe(1)
        expect(contracts[0].contractStatus).toBe(contractStatuses.cancellationOrder)

        const order = await db.Order.findOne({
          where: { contractId: contracts[0].contractId }
        })
        expect(order.orderType).toBe(orderTypes.cancelOrder)
        expect(order.orderData).toBe(JSON.stringify(fullOrderData))
      })
    })

    describe('再解約の確認', () => {
      test('解約⇒再契約⇒再解約', async () => {
        // 次へボタンのクリック
        await page.click('#cancelltion-button')
        await page.waitForTimeout(500)

        // 解約ボタンのクリック
        await page.click('#submit')
        await page.waitForTimeout(500)

        // 解約済にする
        await db.Contract.update(
          {
            contractStatus: contractStatuses.canceledContract
          },
          {
            where: {
              tenantId: testTenantId,
              serviceType: serviceTypes.lightPlan
            }
          }
        )

        // ライトプラン申込
        await common.lightPlanRegister(acCookies[0])
        await page.waitForTimeout(500)

        await db.Contract.update(
          {
            contractStatus: contractStatuses.onContract
          },
          {
            where: {
              tenantId: testTenantId,
              serviceType: serviceTypes.lightPlan,
              contractStatus: contractStatuses.newContractOrder
            }
          }
        )
        await db.Order.destroy({ where: { tenantId: testTenantId } })

        await browser.close()

        // ライトプラン解約画面の初期
        browser = await puppeteer.launch({
          headless: true,
          ignoreHTTPSErrors: true
        })
        page = await browser.newPage()
        await page.setCookie(acCookies[0])
        await page.goto('https://localhost:3000/cancelLightPlan')

        // 次へボタンのクリック
        await page.click('#cancelltion-button')
        await page.waitForTimeout(500)

        // 解約ボタンのクリック
        await page.click('#submit')
        await page.waitForTimeout(500)

        // 期待結果
        expect(await page.url()).toBe('https://localhost:3000/portal')
        expect(await page.$eval('#message-info', (el) => el.title)).toBe('ライトプラン解約が完了いたしました。')

        // DB確認
        const contracts = await contractController.findContracts(
          { tenantId: testTenantId, serviceType: serviceTypes.lightPlan },
          [['createdAt', 'ASC']]
        )
        expect(contracts?.length).toBe(2)
        expect(contracts[1].contractStatus).toBe(contractStatuses.cancellationOrder)

        const order = await db.Order.findOne({
          where: { contractId: contracts[1].contractId }
        })
        expect(order.orderType).toBe(orderTypes.cancelOrder)
        expect(order.orderData).toBe(JSON.stringify(lessOrderData))
      })
    })
  })
})
