'use strict'
const app = require('../../Application/app')
const request = require('supertest')
const { JSDOM } = require('jsdom')
const db = require('../../Application/models')
const getTenantId = {}

jest.setTimeout(60000) // jestのタイムアウトを60秒とする

const getCookies = require('./getCookies')

const changeData = {
  chkContractorName: 'on',
  contractorName: '変更ページテスト',
  contractorKanaName: 'ヘンコウページテスト'
}

describe('契約情報変更のインテグレーションテスト', () => {
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
    // 利用登録をしていないため、変更ページ利用できない
    test('管理者、契約ステータス：未登録、利用不可（GET）', async () => {
      const res = await request(app)
        .get('/change')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(500)

      expect(res.text).toMatch(/お探しのページは見つかりませんでした。/i) // 画面内容確認
    })

    // 利用登録をしていないため、変更機能利用できない
    test('管理者、契約ステータス：未登録、利用不可（POST）', async () => {
      const res = await request(app)
        .post('/change')
        .send({ ...changeData })
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(500)

      expect(res.text).toMatch(/お探しのページは見つかりませんでした。/i) // 画面内容確認
    })

    // 利用登録をしていないため、変更ページ利用できない
    test('一般ユーザ、契約ステータス：未登録、利用不可（GET）', async () => {
      const res = await request(app)
        .get('/change')
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
        .expect(500)

      expect(res.text).toMatch(/お探しのページは見つかりませんでした。/i) // 画面内容確認
    })

    // 利用登録をしていないため、変更機能利用できない
    test('一般ユーザ、契約ステータス：未登録、利用不可（POST）', async () => {
      const res = await request(app)
        .post('/change')
        .send({ ...changeData })
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
        .expect(500)

      expect(res.text).toMatch(/お探しのページは見つかりませんでした。/i) // 画面内容確認
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
    // テナントステータスが「新規申込」、変更ページ利用できない
    test('管理者、契約ステータス：登録申込、利用不可（GET）', async () => {
      const res = await request(app)
        .get('/change')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(200)

      expect(res.text).toMatch(/現在利用登録手続き中です。/i) // 画面内容確認
    })

    // テナントステータスが「新規申込」、変更機能利用できない
    test('管理者、契約ステータス：登録申込、利用不可（POST）', async () => {
      const res = await request(app)
        .post('/change')
        .send({ ...changeData })
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(200)

      expect(res.text).toMatch(/現在利用登録手続き中です。/i) // 画面内容確認
    })

    // 権限がないため、変更ページ利用できない
    test('一般ユーザ、権限がないため、利用不可（GET）', async () => {
      const res = await request(app)
        .get('/change')
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
        .expect(200)

      expect(res.text).toMatch(/本機能はご利用いただけません。/i) // 画面内容確認
    })

    // 権限がないため、変更機能利用できない
    test('一般ユーザ、権限がないため、利用不可（POST）', async () => {
      const res = await request(app)
        .post('/change')
        .send({ ...changeData })
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
        .expect(200)

      expect(res.text).toMatch(/本機能はご利用いただけません。/i) // 画面内容確認
    })
  })

  describe('4.契約ステータス：登録受付', () => {
    // テナントステータスが「新規受付」、変更ページ利用できない
    test('管理者、契約ステータス：登録受付、利用不可（GET）', async () => {
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
        .get('/change')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(200)

      expect(res.text).toMatch(/現在利用登録手続き中です。/i)
    })

    // テナントステータスが「新規受付」、変更機能利用できない
    test('管理者、契約ステータス：登録受付、利用不可（POST）', async () => {
      const res = await request(app)
        .post('/change')
        .send({ ...changeData })
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(200)

      expect(res.text).toMatch(/現在利用登録手続き中です。/i)
    })

    // 権限がないため、変更ページ利用できない
    test('一般ユーザ、権限がないため、利用不可（GET）', async () => {
      const res = await request(app)
        .get('/change')
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
        .expect(200)

      expect(res.text).toMatch(/本機能はご利用いただけません。/i) // 画面内容確認
    })

    // 権限がないため、変更機能利用できない
    test('一般ユーザ、権限がないため、利用不可（POST）', async () => {
      const res = await request(app)
        .post('/change')
        .send({ ...changeData })
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
        .expect(200)

      expect(res.text).toMatch(/本機能はご利用いただけません。/i) // 画面内容確認
    })
  })

  describe('5.契約ステータス：契約中', () => {
    test('管理者、契約ステータス：契約中、利用可能（GET）', async () => {
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
        .get('/change')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(200)

      expect(res.text).toMatch(/契約情報変更/i)
      expect(res.text).toMatch(/契約者名変更/i)
      expect(res.text).toMatch(/契約者住所変更/i)
      expect(res.text).toMatch(/契約者連絡先変更/i)
    })

    // 権限がないため、変更ページ利用できない
    test('一般ユーザ、権限がないため、利用不可（GET）', async () => {
      const res = await request(app)
        .get('/change')
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
        .expect(200)

      expect(res.text).toMatch(/本機能はご利用いただけません。/i) // 画面内容確認
    })

    // 権限がないため、変更機能利用できない
    test('一般ユーザ、権限がないため、利用不可（POST）', async () => {
      const res = await request(app)
        .post('/change')
        .send({ ...changeData })
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
        .expect(200)

      expect(res.text).toMatch(/本機能はご利用いただけません。/i) // 画面内容確認
    })

    test('管理者、契約ステータス：契約中, 契約名変更', async () => {
      // await db.Contract.update({ contractStatus: '00' }, { where: { tenantId: testTenantId } })
      const res = await request(app)
        .post('/change')
        .type('form')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .send({
          chkContractorName: 'on',
          contractorName: 'インテグレーションテスター',
          contractorKanaName: 'インテグレーションテスター'
        })
        .expect(302)

      expect(res.headers.location).toBe('/portal')
    })

    test('管理者、契約ステータス：契約中, 住所変更', async () => {
      // ステータス初期化
      await db.Contract.update({ contractStatus: '00' }, { where: { tenantId: testTenantId } })
      const res = await request(app)
        .post('/change')
        .type('form')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .send({
          chkContractAddress: 'on',
          postalNumber: '0601233',
          contractAddressVal: '東京都',
          banch1: '１',
          tatemono1: '建物１'
        })
        .expect(302)

      expect(res.headers.location).toBe('/portal')
    })

    test('管理者、契約ステータス：契約中, 連絡先', async () => {
      // ステータス初期化
      await db.Contract.update({ contractStatus: '00' }, { where: { tenantId: testTenantId } })
      const res = await request(app)
        .post('/change')
        .type('form')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .send({
          chkContractContact: 'on',
          contactPersonName: '連絡先コントラクター',
          contactPhoneNumber: '080-1234-5678',
          contactMail: 'changeContractor@test.com'
        })
        .expect(302)

      expect(res.headers.location).toBe('/portal')
    })

    test('管理者、契約ステータス：契約中, 契約名・住所変更', async () => {
      // ステータス初期化
      await db.Contract.update({ contractStatus: '00' }, { where: { tenantId: testTenantId } })
      const res = await request(app)
        .post('/change')
        .type('form')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .send({
          chkContractorName: 'on',
          contractorName: 'インテグレーションテスター',
          contractorKanaName: 'インテグレーションテスター',
          chkContractAddress: 'on',
          postalNumber: '0601233',
          contractAddressVal: '東京都',
          banch1: '１',
          tatemono1: '建物１'
        })
        .expect(302)

      expect(res.headers.location).toBe('/portal')
    })

    test('管理者、契約ステータス：契約中, 契約名・連絡先', async () => {
      // ステータス初期化
      await db.Contract.update({ contractStatus: '00' }, { where: { tenantId: testTenantId } })
      const res = await request(app)
        .post('/change')
        .type('form')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .send({
          chkContractorName: 'on',
          contractName: 'インテグレーションテスター',
          contractKanaName: 'インテグレーションテスター',
          chkContractContact: 'on',
          contactPersonName: '連絡先コントラクター',
          contactPhoneNumber: '080-1234-5678',
          contactMail: 'changeContractor@test.com'
        })
        .expect(302)

      expect(res.headers.location).toBe('/portal')
    })

    test('管理者、契約ステータス：契約中, 住所変更・連絡先', async () => {
      // ステータス初期化
      await db.Contract.update({ contractStatus: '00' }, { where: { tenantId: testTenantId } })
      const res = await request(app)
        .post('/change')
        .type('form')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .send({
          chkContractAddress: 'on',
          postalNumber: '0601233',
          contractAddressVal: '東京都',
          banch1: '１',
          tatemono1: '建物１',
          chkContractContact: 'on',
          contactPersonName: '連絡先コントラクター',
          contactPhoneNumber: '080-1234-5678',
          contactMail: 'changeContractor@test.com'
        })
        .expect(302)

      expect(res.headers.location).toBe('/portal')
    })

    test('管理者、契約ステータス：契約中, 契約名・住所変更・連絡先', async () => {
      // ステータス初期化
      await db.Contract.update({ contractStatus: '00' }, { where: { tenantId: testTenantId } })
      const res = await request(app)
        .post('/change')
        .type('form')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .send({
          chkContractorName: 'on',
          contractName: 'インテグレーションテスター',
          contractKanaName: 'インテグレーションテスター',
          chkContractAddress: 'on',
          postalNumber: '0601233',
          contractAddressVal: '東京都',
          banch1: '１',
          tatemono1: '建物１',
          chkContact: 'on',
          contactPersonName: '連絡先コントラクター',
          contactPhoneNumber: '080-1234-5678',
          contactMail: 'changeContact@test.com'
        })
        .expect(302)

      expect(res.headers.location).toBe('/portal')
    })

    // 契約者名未入力の場合
    test('管理者、契約ステータス：契約中, 契約者名未入力', async () => {
      const puppeteer = require('puppeteer')
      const browser = await puppeteer.launch({
        headless: true,
        ignoreHTTPSErrors: true
      })

      await db.Contract.update({ contractStatus: '00' }, { where: { tenantId: testTenantId } })
      const page = await browser.newPage()
      await page.setCookie(acCookies[0])
      await page.goto('https://localhost:3000/change')
      if (page.url() === 'https://localhost:3000/change') {
        await page.click('#chkContractorName')
        await page.click('#chkContractAddress')
        await page.click('#chkContractContact')
        await page.type('#contractorKanaName', 'テスト')
        await page.type('#postalNumber', '0600000')
        await page.click('#postalSearchBtn')
        await page.waitForTimeout(1000)
        await page.click('#modal-card-result > a:nth-child(1)')
        await page.type('#banch1', '２番')
        await page.type('#contactPersonName', '連絡先担当者名')
        await page.type('#contactPhoneNumber', '080-0000-0000')
        await page.type('#contactMail', 'test@test.co.jp')

        await page.waitForTimeout(500)

        await page.click('#next-btn')
        await page.waitForTimeout(500)
        const checkErrorMessage = await page.evaluate(() => {
          return document.querySelector('#contractorNameNoInput').getAttribute('class')
        })
        expect(checkErrorMessage).toBe('input-label-required')
      }

      await browser.close()
    })

    // 契約者名不正な値
    test('管理者、契約ステータス：契約中, 契約者名不正な値', async () => {
      const puppeteer = require('puppeteer')
      const browser = await puppeteer.launch({
        headless: true,
        ignoreHTTPSErrors: true
      })

      const page = await browser.newPage()
      await page.setCookie(acCookies[0])
      await page.goto('https://localhost:3000/change')
      if (page.url() === 'https://localhost:3000/change') {
        await page.click('#chkContractorName')
        await page.click('#chkContractAddress')
        await page.click('#chkContractContact')
        await page.type('#contractorName', 'abc')
        await page.type('#contractorKanaName', 'テスト')
        await page.type('#postalNumber', '0600000')
        await page.click('#postalSearchBtn')
        await page.waitForTimeout(1000)
        await page.click('#modal-card-result > a:nth-child(1)')
        await page.type('#banch1', '２番')
        await page.type('#contactPersonName', '連絡先担当者名')
        await page.type('#contactPhoneNumber', '080-0000-0000')
        await page.type('#contactMail', 'test@test.co.jp')

        await page.waitForTimeout(500)

        await page.click('#next-btn')
        await page.waitForTimeout(500)
        const checkErrorMessage = await page.evaluate(() => {
          return document.querySelector('#contractorNameWrongInput').getAttribute('class')
        })
        expect(checkErrorMessage).toBe('input-label-required')
      }
      await browser.close()
    })

    // 契約者カナ名未入力
    test('管理者、契約ステータス：契約中, 契約者カナ名未入力', async () => {
      const puppeteer = require('puppeteer')
      const browser = await puppeteer.launch({
        headless: true,
        ignoreHTTPSErrors: true
      })

      const page = await browser.newPage()
      await page.setCookie(acCookies[0])
      await page.goto('https://localhost:3000/change')
      if (page.url() === 'https://localhost:3000/change') {
        await page.click('#chkContractorName')
        await page.click('#chkContractAddress')
        await page.click('#chkContractContact')
        await page.type('#contractorName', 'テスト')
        await page.type('#postalNumber', '0600000')
        await page.click('#postalSearchBtn')
        await page.waitForTimeout(1000)
        await page.click('#modal-card-result > a:nth-child(1)')
        await page.type('#banch1', '２番')
        await page.type('#contactPersonName', '連絡先担当者名')
        await page.type('#contactPhoneNumber', '080-0000-0000')
        await page.type('#contactMail', 'test@test.co.jp')

        await page.waitForTimeout(500)

        await page.click('#next-btn')
        const checkErrorMessage = await page.evaluate(() => {
          return document.querySelector('#contractorKanaNameNoInput').getAttribute('class')
        })
        expect(checkErrorMessage).toBe('input-label-required')
      }
      await browser.close()
    })

    // 契約者カナ名不正な値
    test('管理者、契約ステータス：契約中, 契約者カナ名不正な値', async () => {
      const puppeteer = require('puppeteer')
      const browser = await puppeteer.launch({
        headless: true,
        ignoreHTTPSErrors: true
      })

      const page = await browser.newPage()
      await page.setCookie(acCookies[0])
      await page.goto('https://localhost:3000/change')
      if (page.url() === 'https://localhost:3000/change') {
        await page.click('#chkContractorName')
        await page.click('#chkContractAddress')
        await page.click('#chkContractContact')
        await page.type('#contractorName', 'テスト')
        await page.type('#contractorKanaName', 'abc')
        await page.type('#postalNumber', '0600000')
        await page.click('#postalSearchBtn')
        await page.waitForTimeout(1000)
        await page.click('#modal-card-result > a:nth-child(1)')
        await page.type('#banch1', '２番')
        await page.type('#contactPersonName', '連絡先担当者名')
        await page.type('#contactPhoneNumber', '080-0000-0000')
        await page.type('#contactMail', 'test@test.co.jp')

        await page.waitForTimeout(500)

        await page.click('#next-btn')
        const checkErrorMessage = await page.evaluate(() => {
          return document.querySelector('#contractorKanaNameWrongInput').getAttribute('class')
        })
        expect(checkErrorMessage).toBe('input-label-required')
      }
      await browser.close()
    })

    // 郵便番号未入力
    test('管理者、契約ステータス：契約中, 郵便番号未入力', async () => {
      const puppeteer = require('puppeteer')
      const browser = await puppeteer.launch({
        headless: true,
        ignoreHTTPSErrors: true
      })

      const page = await browser.newPage()
      await page.setCookie(acCookies[0])
      await page.goto('https://localhost:3000/change')
      if (page.url() === 'https://localhost:3000/change') {
        await page.click('#chkContractorName')
        await page.click('#chkContractAddress')
        await page.click('#chkContractContact')
        await page.type('#contractorName', 'テスト')
        await page.type('#contractorKanaName', 'abc')
        await page.type('#banch1', '２番')
        await page.type('#contactPersonName', '連絡先担当者名')
        await page.type('#contactPhoneNumber', '080-0000-0000')
        await page.type('#contactMail', 'test@test.co.jp')

        await page.waitForTimeout(500)

        await page.click('#next-btn')
        const checkErrorMessage = await page.evaluate(() => {
          return document.querySelector('#postalNumberNoInput').getAttribute('class')
        })
        expect(checkErrorMessage).toBe('input-label-required')
      }
      await browser.close()
    })

    // 郵便番号不正な値
    test('管理者、契約ステータス：契約中, 郵便番号不正な値', async () => {
      const puppeteer = require('puppeteer')
      const browser = await puppeteer.launch({
        headless: true,
        ignoreHTTPSErrors: true
      })

      const page = await browser.newPage()
      await page.setCookie(acCookies[0])
      await page.goto('https://localhost:3000/change')
      if (page.url() === 'https://localhost:3000/change') {
        await page.click('#chkContractorName')
        await page.click('#chkContractAddress')
        await page.click('#chkContractContact')
        await page.type('#contractorName', 'テスト')
        await page.type('#contractorKanaName', 'abc')
        await page.type('#postalNumber', 'aaaaaaa')
        await page.type('#banch1', '２番')
        await page.type('#contactPersonName', '連絡先担当者名')
        await page.type('#contactPhoneNumber', '080-0000-0000')
        await page.type('#contactMail', 'test@test.co.jp')

        await page.waitForTimeout(500)

        await page.click('#next-btn')
        const checkErrorMessage = await page.evaluate(() => {
          return document.querySelector('#postalNumberWrongInput').getAttribute('class')
        })
        expect(checkErrorMessage).toBe('input-label-required')
      }

      await browser.close()
    })

    // 住所未入力
    test('管理者、契約ステータス：契約中, 住所未入力', async () => {
      const puppeteer = require('puppeteer')
      const browser = await puppeteer.launch({
        headless: true,
        ignoreHTTPSErrors: true
      })

      const page = await browser.newPage()
      await page.setCookie(acCookies[0])
      await page.goto('https://localhost:3000/change')
      if (page.url() === 'https://localhost:3000/change') {
        await page.click('#chkContractorName')
        await page.click('#chkContractAddress')
        await page.click('#chkContractContact')
        await page.type('#contractorName', 'テスト')
        await page.type('#contractorKanaName', 'abc')
        await page.type('#postalNumber', '0600000')
        await page.type('#banch1', '２番')
        await page.type('#contactPersonName', '連絡先担当者名')
        await page.type('#contactPhoneNumber', '080-0000-0000')
        await page.type('#contactMail', 'test@test.co.jp')

        await page.waitForTimeout(500)

        await page.click('#next-btn')
        const checkErrorMessage = await page.evaluate(() => {
          return document.querySelector('#contractAddressValErrormessage').getAttribute('class')
        })
        expect(checkErrorMessage).toBe('input-label-required')
      }

      await browser.close()
    })

    // 番地未入力
    test('管理者、契約ステータス：契約中, 番地未入力', async () => {
      const puppeteer = require('puppeteer')
      const browser = await puppeteer.launch({
        headless: true,
        ignoreHTTPSErrors: true
      })

      const page = await browser.newPage()
      await page.setCookie(acCookies[0])
      await page.goto('https://localhost:3000/change')
      if (page.url() === 'https://localhost:3000/change') {
        await page.click('#chkContractorName')
        await page.click('#chkContractAddress')
        await page.click('#chkContractContact')
        await page.type('#contractorName', 'テスト')
        await page.type('#contractorKanaName', 'abc')
        await page.type('#postalNumber', '0600000')
        await page.click('#postalSearchBtn')
        await page.waitForTimeout(1000)
        await page.click('#modal-card-result > a:nth-child(1)')
        await page.type('#contactPersonName', '連絡先担当者名')
        await page.type('#contactPhoneNumber', '080-0000-0000')
        await page.type('#contactMail', 'test@test.co.jp')

        await page.waitForTimeout(500)

        await page.click('#next-btn')
        const checkErrorMessage = await page.evaluate(() => {
          return document.querySelector('#banch1NoInput').getAttribute('class')
        })
        expect(checkErrorMessage).toBe('input-label-required')
      }

      await browser.close()
    })

    // 番地不正な値
    test('管理者、契約ステータス：契約中, 番地不正な値', async () => {
      const puppeteer = require('puppeteer')
      const browser = await puppeteer.launch({
        headless: true,
        ignoreHTTPSErrors: true
      })

      const page = await browser.newPage()
      await page.setCookie(acCookies[0])
      await page.goto('https://localhost:3000/change')
      if (page.url() === 'https://localhost:3000/change') {
        await page.click('#chkContractorName')
        await page.click('#chkContractAddress')
        await page.click('#chkContractContact')
        await page.type('#contractorName', 'テスト')
        await page.type('#contractorKanaName', 'abc')
        await page.type('#postalNumber', '0600000')
        await page.click('#postalSearchBtn')
        await page.waitForTimeout(1000)
        await page.click('#modal-card-result > a:nth-child(1)')
        await page.type('#banch1', '1234')
        await page.type('#contactPersonName', '連絡先担当者名')
        await page.type('#contactPhoneNumber', '080-0000-0000')
        await page.type('#contactMail', 'test@test.co.jp')

        await page.waitForTimeout(500)

        await page.click('#next-btn')
        const checkErrorMessage = await page.evaluate(() => {
          return document.querySelector('#banch1WrongInput').getAttribute('class')
        })
        expect(checkErrorMessage).toBe('input-label-required')
      }
      await browser.close()
    })

    // 連絡先担当者名未入力
    test('管理者、契約ステータス：契約中, 連絡先担当者名未入力', async () => {
      const puppeteer = require('puppeteer')
      const browser = await puppeteer.launch({
        headless: true,
        ignoreHTTPSErrors: true
      })

      const page = await browser.newPage()
      await page.setCookie(acCookies[0])
      await page.goto('https://localhost:3000/change')
      if (page.url() === 'https://localhost:3000/change') {
        await page.click('#chkContractorName')
        await page.click('#chkContractAddress')
        await page.click('#chkContractContact')
        await page.type('#contractorName', 'テスト')
        await page.type('#contractorKanaName', 'abc')
        await page.type('#postalNumber', '0600000')
        await page.click('#postalSearchBtn')
        await page.waitForTimeout(1000)
        await page.click('#modal-card-result > a:nth-child(1)')
        await page.type('#banch1', '1234')
        await page.type('#contactPhoneNumber', '080-0000-0000')
        await page.type('#contactMail', 'test@test.co.jp')

        await page.waitForTimeout(500)

        await page.click('#next-btn')
        const checkErrorMessage = await page.evaluate(() => {
          return document.querySelector('#contactPersonNameNoInput').getAttribute('class')
        })
        expect(checkErrorMessage).toBe('input-label-required')
      }
      await browser.close()
    })

    // 連絡先担当者名不正な値
    test('管理者、契約ステータス：契約中, 連絡先担当者名不正な値', async () => {
      const puppeteer = require('puppeteer')
      const browser = await puppeteer.launch({
        headless: true,
        ignoreHTTPSErrors: true
      })

      const page = await browser.newPage()
      await page.setCookie(acCookies[0])
      await page.goto('https://localhost:3000/change')
      if (page.url() === 'https://localhost:3000/change') {
        await page.click('#chkContractorName')
        await page.click('#chkContractAddress')
        await page.click('#chkContractContact')
        await page.type('#contractorName', 'テスト')
        await page.type('#contractorKanaName', 'abc')
        await page.type('#postalNumber', '0600000')
        await page.click('#postalSearchBtn')
        await page.waitForTimeout(1000)
        await page.click('#modal-card-result > a:nth-child(1)')
        await page.type('#banch1', '1234')
        await page.type('#contactPersonName', 'abcd')
        await page.type('#contactPhoneNumber', '080-0000-0000')
        await page.type('#contactMail', 'test@test.co.jp')

        await page.waitForTimeout(500)

        await page.click('#next-btn')
        const checkErrorMessage = await page.evaluate(() => {
          return document.querySelector('#contactPersonNameWrongInput').getAttribute('class')
        })
        expect(checkErrorMessage).toBe('input-label-required')
      }
      await browser.close()
    })

    // 連絡先電話番号未入力
    test('管理者、契約ステータス：契約中, 連絡先電話番号未入力', async () => {
      const puppeteer = require('puppeteer')
      const browser = await puppeteer.launch({
        headless: true,
        ignoreHTTPSErrors: true
      })

      const page = await browser.newPage()
      await page.setCookie(acCookies[0])
      await page.goto('https://localhost:3000/change')
      if (page.url() === 'https://localhost:3000/change') {
        await page.click('#chkContractorName')
        await page.click('#chkContractAddress')
        await page.click('#chkContractContact')
        await page.type('#contractorName', 'テスト')
        await page.type('#contractorKanaName', 'abc')
        await page.type('#postalNumber', '1600000')
        await page.click('#postalSearchBtn')
        await page.waitForTimeout(2000)
        await page.click('#modal-card-result > a:nth-child(1)')
        await page.type('#banch1', '1234')
        await page.type('#contactPersonName', '連絡先')
        await page.type('#contactMail', 'test@test.co.jp')

        await page.waitForTimeout(500)

        await page.click('#next-btn')
        const checkErrorMessage = await page.evaluate(() => {
          return document.querySelector('#contactPhoneNumberNoInput').getAttribute('class')
        })
        expect(checkErrorMessage).toBe('input-label-required')
      }
      await browser.close()
    })

    // 連絡先メールアドレス未入力
    test('管理者、契約ステータス：契約中, 連絡先メールアドレス未入力', async () => {
      const puppeteer = require('puppeteer')
      const browser = await puppeteer.launch({
        headless: true,
        ignoreHTTPSErrors: true
      })

      const page = await browser.newPage()
      await page.setCookie(acCookies[0])
      await page.goto('https://localhost:3000/change')
      if (page.url() === 'https://localhost:3000/change') {
        await page.click('#chkContractorName')
        await page.click('#chkContractAddress')
        await page.click('#chkContractContact')
        await page.type('#contractorName', 'テスト')
        await page.type('#contractorKanaName', 'abc')
        await page.type('#postalNumber', '1600000')
        await page.click('#postalSearchBtn')
        await page.waitForTimeout(2000)
        await page.click('#modal-card-result > a:nth-child(1)')
        await page.type('#banch1', '1234')
        await page.type('#contactPersonName', '連絡先')
        await page.type('#contactPhoneNumber', '080-0000-0000')

        await page.waitForTimeout(500)

        await page.click('#next-btn')
        const checkErrorMessage = await page.evaluate(() => {
          return document.querySelector('#contactMailNoInput').getAttribute('class')
        })
        expect(checkErrorMessage).toBe('input-label-required')
      }
      await browser.close()
    })

    // 連絡先メールアドレス不正な値
    test('管理者、契約ステータス：契約中, 連絡先メールアドレス不正な値', async () => {
      const puppeteer = require('puppeteer')
      const browser = await puppeteer.launch({
        headless: true,
        ignoreHTTPSErrors: true
      })

      const page = await browser.newPage()
      await page.setCookie(acCookies[0])
      await page.goto('https://localhost:3000/change')
      if (page.url() === 'https://localhost:3000/change') {
        await page.click('#chkContractorName')
        await page.click('#chkContractAddress')
        await page.click('#chkContractContact')
        await page.type('#contractorName', 'テスト')
        await page.type('#contractorKanaName', 'abc')
        await page.type('#postalNumber', '1600000')
        await page.click('#postalSearchBtn')
        await page.waitForTimeout(2000)
        await page.click('#modal-card-result > a:nth-child(1)')
        await page.type('#banch1', '1234')
        await page.type('#contactPersonName', '連絡先')
        await page.type('#contactPhoneNumber', '080-0000-0000')
        await page.type('#contactMail', 'test')

        await page.waitForTimeout(500)

        await page.click('#next-btn')
        const checkErrorMessage = await page.evaluate(() => {
          return document.querySelector('#contactMailWorongInput').getAttribute('class')
        })
        expect(checkErrorMessage).toBe('input-label-required')
      }
    })
  })

  describe('6.契約ステータス：変更申込', () => {
    test('管理者、契約ステータス：変更申込、利用不可（GET）', async () => {
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
        .get('/change')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(200)

      expect(res.text).toMatch(/現在契約情報変更手続き中です。/i) // 画面内容確認
    })

    test('管理者、契約ステータス：変更申込、利用不可（POST）', async () => {
      const res = await request(app)
        .post('/change')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(200)

      expect(res.text).toMatch(/現在契約情報変更手続き中です。/i) // 画面内容確認
    })

    // 権限がないため、変更ページ利用できない
    test('一般ユーザ、権限がないため、利用不可（GET）', async () => {
      const res = await request(app)
        .get('/change')
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
        .expect(200)

      expect(res.text).toMatch(/本機能はご利用いただけません。/i) // 画面内容確認
    })

    // 権限がないため、変更機能利用できない
    test('一般ユーザ、権限がないため、利用不可（POST）', async () => {
      const res = await request(app)
        .post('/change')
        .send({ ...changeData })
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
        .expect(200)

      expect(res.text).toMatch(/本機能はご利用いただけません。/i) // 画面内容確認
    })
  })

  describe('7.契約ステータス：変更受付', () => {
    test('管理者、契約ステータス：変更受付、利用可能（GET）', async () => {
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
        .get('/change')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(200)

      expect(res.text).toMatch(/現在契約情報変更手続き中です。/i) // 画面内容確認
    })

    test('管理者、契約ステータス：変更申込、利用不可（POST）', async () => {
      const res = await request(app)
        .post('/change')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(200)

      expect(res.text).toMatch(/現在契約情報変更手続き中です。/i) // 画面内容確認
    })

    // 権限がないため、変更ページ利用できない
    test('一般ユーザ、権限がないため、利用不可（GET）', async () => {
      const res = await request(app)
        .get('/change')
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
        .expect(200)

      expect(res.text).toMatch(/本機能はご利用いただけません。/i) // 画面内容確認
    })

    // 権限がないため、変更機能利用できない
    test('一般ユーザ、権限がないため、利用不可（POST）', async () => {
      const res = await request(app)
        .post('/change')
        .send({ ...changeData })
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
        .expect(200)

      expect(res.text).toMatch(/本機能はご利用いただけません。/i) // 画面内容確認
    })
  })

  describe('8.契約ステータス：解約申込', () => {
    test('管理者、契約ステータス：解約申込、利用不可（GET）', async () => {
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
        .get('/change')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(200)

      expect(res.text).toMatch(/現在解約手続き中です。/i) // 画面内容確認
    })

    test('管理者、契約ステータス：解約申込、利用不可（POST）', async () => {
      const res = await request(app)
        .post('/change')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(200)

      expect(res.text).toMatch(/現在解約手続き中です。/i) // 画面内容確認
    })

    // 権限がないため、変更ページ利用できない
    test('一般ユーザ、権限がないため、利用不可（GET）', async () => {
      const res = await request(app)
        .get('/change')
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
        .expect(200)

      expect(res.text).toMatch(/現在解約手続き中です。/i) // 画面内容確認
    })

    // 権限がないため、変更機能利用できない
    test('一般ユーザ、権限がないため、利用不可（POST）', async () => {
      const res = await request(app)
        .post('/change')
        .send({ ...changeData })
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
        .expect(200)

      expect(res.text).toMatch(/現在解約手続き中です。/i) // 画面内容確認
    })
  })

  describe('9.契約ステータス：解約受付', () => {
    test('管理者、契約ステータス：解約受付、利用不可（GET）', async () => {
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
        .get('/change')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(200)

      expect(res.text).toMatch(/現在解約手続き中です。/i) // 画面内容確認
    })

    test('管理者、契約ステータス：解約受付、利用不可（POST）', async () => {
      const res = await request(app)
        .post('/change')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(200)

      expect(res.text).toMatch(/現在解約手続き中です。/i) // 画面内容確認
    })

    // 権限がないため、変更ページ利用できない
    test('一般ユーザ、権限がないため、利用不可（GET）', async () => {
      const res = await request(app)
        .get('/change')
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
        .expect(200)

      expect(res.text).toMatch(/現在解約手続き中です。/i) // 画面内容確認
    })

    // 権限がないため、変更機能利用できない
    test('一般ユーザ、権限がないため、利用不可（POST）', async () => {
      const res = await request(app)
        .post('/change')
        .send({ ...changeData })
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
        .expect(200)

      expect(res.text).toMatch(/現在解約手続き中です。/i) // 画面内容確認
    })
  })

  describe('10.契約ステータス：解約', () => {
    test('管理者、契約ステータス：解約、利用不可（GET）', async () => {
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
        .get('/change')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(500)

      expect(res.text).toMatch(/お探しのページは見つかりませんでした。/i) // 画面内容確認
    })

    test('管理者、契約ステータス：解約、利用不可（POST）', async () => {
      const res = await request(app)
        .post('/change')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(500)

      expect(res.text).toMatch(/お探しのページは見つかりませんでした。/i) // 画面内容確認
    })

    test('一般ユーザ、契約ステータス：解約、利用不可（GET）', async () => {
      const res = await request(app)
        .get('/change')
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
        .expect(500)

      expect(res.text).toMatch(/お探しのページは見つかりませんでした。/i) // 画面内容確認
    })

    test('一般ユーザ、契約ステータス：解約、利用不可（POST）', async () => {
      const res = await request(app)
        .post('/change')
        .send({ ...changeData })
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
        .expect(500)

      expect(res.text).toMatch(/お探しのページは見つかりませんでした。/i) // 画面内容確認
    })
  })

  describe('後処理', () => {
    test('userデータ削除', async () => {
      await db.User.destroy({ where: { tenantId: testTenantId } })
      await db.Tenant.destroy({ where: { tenantId: testTenantId } })
    })
  })
})
