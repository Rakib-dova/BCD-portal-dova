'use strict'
const app = require('../../Application/app')
const request = require('supertest')
const { JSDOM } = require('jsdom')
const db = require('../../Application/models')
const getTenantId = {}

jest.setTimeout(60000) // jestのタイムアウトを60秒とする

const getCookies = require('./getCookies')

describe('請求書アップロードフォーマット設定画面（確認・変更）のインテグレーションテスト', () => {
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
    test('請求書アップロードフォーマット設定画面（確認・変更）へアクセス', async () => {
      const res = await request(app)
        .get('/uploadFormatEdit')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(400)

      expect(res.text).toMatch(/不正なページからアクセスされたか、セッションタイムアウトが発生しました。/i) // タイトル
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
    test('請求書アップロードフォーマット設定画面（確認・変更）へアクセス', async () => {
      const res = await request(app)
        .get('/uploadFormatEdit')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(400)

      expect(res.text).toMatch(/不正なページからアクセスされたか、セッションタイムアウトが発生しました。/i) // タイトルが含まれていること
    })
  })

  describe('3.契約ステータス：登録受付', () => {
    test('請求書アップロードフォーマット設定画面（確認・変更）へアクセス', async () => {
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
        .get('/uploadFormatEdit')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(400)

      expect(res.text).toMatch(/不正なページからアクセスされたか、セッションタイムアウトが発生しました。/i) // タイトルが含まれていること
    })
  })

  describe('4.契約ステータス：契約中', () => {
    test('請求書アップロードフォーマット設定画面（確認・変更）へアクセス', async () => {
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
        .get('/uploadFormatEdit')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(400)

      expect(res.text).toMatch(/不正なページからアクセスされたか、セッションタイムアウトが発生しました。/i) // タイトルが含まれていること
    })

    // アップロードフォーマットをアップロード
    test('アップロードフォーマットをアップロード', async () => {
      const path = require('path')
      const puppeteer = require('puppeteer')
      const browser = await puppeteer.launch({
        headless: true,
        ignoreHTTPSErrors: true
      })
      const page = await browser.newPage()
      await page.setCookie(acCookies[0])
      await page.goto('https://localhost:3000/uploadFormatList')
      await page.click('body > div.max-width > div:nth-child(3) > div > a')
      await page.type('#uploadFormatItemName', 'インテグレーションテスト設定')
      const uploadFileElementHand = await page.$('#dataFile')
      await uploadFileElementHand.uploadFile(path.resolve('./testData/csvFormatUpload.csv'))
      await page.type('#uploadFormatNumber', '1')
      await page.type('#defaultNumber', '2')
      await page.click('#submit')

      await page.waitForTimeout(1000)
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
      await page.click('#submit')

      await browser.close()
    })

    test('アップロードしたアップロードフォーマット変更画面へアクセス', async () => {
      const puppeteer = require('puppeteer')
      const browser = await puppeteer.launch({
        headless: true,
        ignoreHTTPSErrors: true
      })
      const page = await browser.newPage()
      await page.setCookie(acCookies[0])
      await page.goto('https://localhost:3000/uploadFormatList')

      const redirectUrl = await page.evaluate(() => {
        return document
          .querySelector(
            'body > div.max-width > div:nth-child(3) > div > div.box > table > tbody > tr > td:nth-child(5) > a'
          )
          .getAttribute('uuid')
      })

      await page.click(
        'body > div.max-width > div:nth-child(3) > div > div.box > table > tbody > tr > td:nth-child(5) > a'
      )

      await page.waitForTimeout(1000)

      // アップロードフォーマット変更画面にredirectする。
      expect(await page.url()).toBe(`https://localhost:3000/uploadFormatEdit/${redirectUrl}`)

      await browser.close()
    })

    test('請求書アップロードフォーマット設定画面（確認・変更）の「戻る」ボタン', async () => {
      const puppeteer = require('puppeteer')
      const browser = await puppeteer.launch({
        headless: true,
        ignoreHTTPSErrors: true
      })
      const page = await browser.newPage()
      await page.setCookie(acCookies[0])
      await page.goto('https://localhost:3000/uploadFormatList')

      const redirectUrl = await page.evaluate(() => {
        return document
          .querySelector(
            'body > div.max-width > div:nth-child(3) > div > div.box > table > tbody > tr > td:nth-child(5) > a'
          )
          .getAttribute('uuid')
      })

      await page.click(
        'body > div.max-width > div:nth-child(3) > div > div.box > table > tbody > tr > td:nth-child(5) > a'
      )

      await page.waitForTimeout(1000)

      // アップロードフォーマット設定画面に遷移する。
      expect(await page.url()).toBe(`https://localhost:3000/uploadFormatEdit/${redirectUrl}`)

      await page.click('#returnBtn')

      await page.waitForTimeout(1000)

      // アップロードフォーマット一覧画面にredirectする。
      expect(await page.url()).toBe('https://localhost:3000/uploadFormatList')

      browser.close()
    })

    test('請求書アップロードフォーマット設定画面（確認・変更）の基本情報画面の開く、閉じる', async () => {
      const puppeteer = require('puppeteer')
      const browser = await puppeteer.launch({
        headless: true,
        ignoreHTTPSErrors: true
      })
      const page = await browser.newPage()
      await page.setCookie(acCookies[0])
      await page.goto('https://localhost:3000/uploadFormatList')

      const redirectUrl = await page.evaluate(() => {
        return document
          .querySelector(
            'body > div.max-width > div:nth-child(3) > div > div.box > table > tbody > tr > td:nth-child(5) > a'
          )
          .getAttribute('uuid')
      })
      await page.click(
        'body > div.max-width > div:nth-child(3) > div > div.box > table > tbody > tr > td:nth-child(5) > a'
      )

      await page.waitForTimeout(1000)

      // 請求書アップロードフォーマット設定画面に遷移する。
      expect(await page.url()).toBe(`https://localhost:3000/uploadFormatEdit/${redirectUrl}`)

      await page.click('#editCsvBasicFormatBtn')

      await page.waitForTimeout(1000)

      let isModalIsActive = await page.evaluate(() => {
        return document.getElementById('csvBasicFormat-modal').classList.value
      })

      // 基本情報設定 確認modalが出る。
      expect(isModalIsActive).toMatch(/is-active/i)

      await page.click('#csvBasicEditCancelBtn')

      isModalIsActive = await page.evaluate(() => {
        return document.getElementById('csvBasicFormat-modal').classList.value
      })

      // 基本情報設定 確認modalが消える。
      expect(isModalIsActive).not.toMatch(/is-active/i)

      await browser.close()
    })

    test('請求書アップロードフォーマット設定画面（確認・変更）の基本情報画面の名称チェック：未入力の場合', async () => {
      const puppeteer = require('puppeteer')
      const browser = await puppeteer.launch({
        headless: true,
        ignoreHTTPSErrors: true
      })
      const page = await browser.newPage()
      await page.setCookie(acCookies[0])
      await page.goto('https://localhost:3000/uploadFormatList')

      // 基本情報設定変更画面開く
      await page.click(
        'body > div.max-width > div:nth-child(3) > div > div.box > table > tbody > tr > td:nth-child(5) > a'
      )

      await page.waitForTimeout(1000)

      await page.click('#editCsvBasicFormatBtn')

      // 基本情報設定変更画面開きをチェック
      const checkOpenedModal = await page.evaluate(() => {
        return Array.prototype.find.call(document.querySelector('#csvBasicFormat-modal').classList, (item) => {
          if (item === 'is-active') return true
          return false
        })
      })

      expect(checkOpenedModal).toBe('is-active')

      // 請求書アップロードフォーマット設定画面に遷移する。
      await page.focus('#basicUploadFormatItemName')
      await page.keyboard.press('End')
      for (let idx = 0; idx < 100; idx++) {
        await page.keyboard.press('Backspace')
      }

      await page.click('#csvBasicEditBtn')

      const noInputMessage = await page.evaluate(() => {
        return document.querySelector(
          '#csvBasicFormat-modal-card > section > div > div > div:nth-child(1) > div > div:nth-child(1) > div'
        ).innerText
      })

      expect(noInputMessage).toMatch(/未入力です。/)

      await browser.close()
    })

    test('請求書アップロードフォーマット設定画面（確認・変更）の基本情報画面の名称チェック：空白のみの場合', async () => {
      const puppeteer = require('puppeteer')
      const browser = await puppeteer.launch({
        headless: true,
        ignoreHTTPSErrors: true
      })
      const page = await browser.newPage()
      await page.setCookie(acCookies[0])
      await page.goto('https://localhost:3000/uploadFormatList')

      // 基本情報設定変更画面開く
      await page.click(
        'body > div.max-width > div:nth-child(3) > div > div.box > table > tbody > tr > td:nth-child(5) > a'
      )

      await page.waitForTimeout(1000)

      await page.click('#editCsvBasicFormatBtn')

      // 基本情報設定変更画面開きをチェック
      const checkOpenedModal = await page.evaluate(() => {
        return Array.prototype.find.call(document.querySelector('#csvBasicFormat-modal').classList, (item) => {
          if (item === 'is-active') return true
          return false
        })
      })

      expect(checkOpenedModal).toBe('is-active')

      // 請求書アップロードフォーマット設定画面に遷移する。
      await page.focus('#basicUploadFormatItemName')
      await page.keyboard.press('End')
      for (let idx = 0; idx < 100; idx++) {
        await page.keyboard.press('Backspace')
      }

      await page.keyboard.type(String.fromCharCode(32))

      await page.click('#csvBasicEditBtn')

      const noInputMessage = await page.evaluate(() => {
        return document.querySelector(
          '#csvBasicFormat-modal-card > section > div > div > div:nth-child(1) > div > div:nth-child(1) > div'
        ).innerText
      })

      expect(noInputMessage).toMatch(/未入力です。/)

      await browser.close()
    })

    test('請求書アップロードフォーマット設定画面（確認・変更）の基本情報画面で税、単位修正、確認画面に反映', async () => {
      const puppeteer = require('puppeteer')
      const browser = await puppeteer.launch({
        headless: true,
        ignoreHTTPSErrors: true
      })
      const page = await browser.newPage()
      await page.setCookie(acCookies[0])
      await page.goto('https://localhost:3000/uploadFormatList')

      const redirectUrl = await page.evaluate(() => {
        return document
          .querySelector(
            'body > div.max-width > div:nth-child(3) > div > div.box > table > tbody > tr > td:nth-child(5) > a'
          )
          .getAttribute('uuid')
      })

      await page.click(
        'body > div.max-width > div:nth-child(3) > div > div.box > table > tbody > tr > td:nth-child(5) > a'
      )

      await page.waitForTimeout(1000)

      // アップロードフォーマット設定画面に遷移する。
      expect(await page.url()).toBe(`https://localhost:3000/uploadFormatEdit/${redirectUrl}`)

      await page.click('#editCsvBasicFormatBtn')

      await page.waitForTimeout(1000)

      // 保存された基本情報設定名称消す
      await page.evaluate(() => {
        document.querySelector('#basicUploadFormatItemName').value = ''
      })
      // 新しい基本情報設定名称入力
      await page.type('#basicUploadFormatItemName', 'インテグレーションテスト変更')

      const basicTax = await page.evaluate(() => {
        return Array.prototype.map.call(document.querySelectorAll('.input-tax'), (item) => {
          return item.value
        })
      })

      basicTax.forEach((item) => {
        expect(item).toBe('')
      })

      const basicUnit = await page.evaluate(() => {
        return Array.prototype.map.call(document.querySelectorAll('.input-unit'), (item) => {
          return item.value
        })
      })

      basicUnit.forEach((item) => {
        expect(item).toBe('')
      })

      // 税変更
      const testTaxValue = ['AAA', 'BBB', 'CCC', 'DDD', 'EEE']
      await page.type(
        '#csvBasicFormat-modal-card > section > div > div > div:nth-child(2) > div.line-content > div:nth-child(1) > div > input',
        testTaxValue[0]
      )
      await page.type(
        '#csvBasicFormat-modal-card > section > div > div > div:nth-child(2) > div.line-content > div:nth-child(2) > div > input',
        testTaxValue[1]
      )
      await page.type(
        '#csvBasicFormat-modal-card > section > div > div > div:nth-child(2) > div.line-content > div:nth-child(3) > div > input',
        testTaxValue[2]
      )
      await page.type(
        '#csvBasicFormat-modal-card > section > div > div > div:nth-child(2) > div.line-content > div:nth-child(4) > div > input',
        testTaxValue[3]
      )
      await page.type(
        '#csvBasicFormat-modal-card > section > div > div > div:nth-child(2) > div.line-content > div:nth-child(5 ) > div > input',
        testTaxValue[4]
      )

      // 単位変更
      const testUnitValue = [
        'A1',
        'B1',
        'C1',
        'D1',
        'E1',
        'F1',
        'G1',
        'H1',
        'I1',
        'J1',
        'K1',
        'L1',
        'M1',
        'N1',
        'O1',
        'P1',
        'Q1',
        'R1',
        'S1',
        'T1',
        'U1',
        'V1',
        'W1',
        'X1',
        'Y1',
        'Z1',
        'A2',
        'B2',
        'C2',
        'D2',
        'E2',
        'F2',
        'G2',
        'H2',
        'I2',
        'J2',
        'K2',
        'L2'
      ]
      for (let idx = 0; idx < testUnitValue.length; idx++) {
        await page.type(
          `#csvBasicFormat-modal-card > section > div > div > div:nth-child(3) > div.line-content > div:nth-child(${
            idx + 1
          }) > div > input`,
          testUnitValue[idx]
        )
      }

      await page.click('#csvBasicEditBtn')

      const checkTax = await page.evaluate(() => {
        return Array.prototype.map.call(document.querySelectorAll('.tax'), (item) => {
          return item.value
        })
      })

      // 変更した税の値が表示されているか確認
      checkTax.forEach((item, idx) => {
        expect(item).toMatch(testTaxValue[idx])
      })

      const checkUnit = await page.evaluate(() => {
        return Array.prototype.map.call(document.querySelectorAll('.unit'), (item) => {
          return item.value
        })
      })

      // 変更した単位の値が表示されているか確認
      checkUnit.forEach((item, idx) => {
        expect(item).toMatch(testUnitValue[idx])
      })

      await browser.close()
    })

    test('請求書アップロードフォーマット設定画面（確認・変更）の基本情報画面で税、単位修正、アップロードフォーマットデータ番号、確認画面に反映', async () => {
      const puppeteer = require('puppeteer')
      const browser = await puppeteer.launch({
        headless: true,
        ignoreHTTPSErrors: true
      })
      const page = await browser.newPage()
      await page.setCookie(acCookies[0])
      await page.goto('https://localhost:3000/uploadFormatList')

      const redirectUrl = await page.evaluate(() => {
        return document
          .querySelector(
            'body > div.max-width > div:nth-child(3) > div > div.box > table > tbody > tr > td:nth-child(5) > a'
          )
          .getAttribute('uuid')
      })

      await page.click(
        'body > div.max-width > div:nth-child(3) > div > div.box > table > tbody > tr > td:nth-child(5) > a'
      )

      await page.waitForTimeout(1000)

      expect(await page.url()).toBe(`https://localhost:3000/uploadFormatEdit/${redirectUrl}`)

      await page.click('#editCsvBasicFormatBtn')

      await page.waitForTimeout(1000)

      // 保存された基本情報設定名称消す
      await page.evaluate(() => {
        document.querySelector('#basicUploadFormatItemName').value = ''
      })
      // 新しい基本情報設定名称入力
      await page.type('#basicUploadFormatItemName', 'インテグレーションテスト変更')

      const basicTax = await page.evaluate(() => {
        return Array.prototype.map.call(document.querySelectorAll('.input-tax'), (item) => {
          return item.value
        })
      })

      basicTax.forEach((item) => {
        expect(item).toBe('')
      })

      const basicUnit = await page.evaluate(() => {
        return Array.prototype.map.call(document.querySelectorAll('.input-unit'), (item) => {
          return item.value
        })
      })

      basicUnit.forEach((item) => {
        expect(item).toBe('')
      })

      // 税変更
      const testTaxValue = ['AAA', 'BBB', 'CCC', 'DDD', 'EEE']
      await page.type(
        '#csvBasicFormat-modal-card > section > div > div > div:nth-child(2) > div.line-content > div:nth-child(1) > div > input',
        testTaxValue[0]
      )
      await page.type(
        '#csvBasicFormat-modal-card > section > div > div > div:nth-child(2) > div.line-content > div:nth-child(2) > div > input',
        testTaxValue[1]
      )
      await page.type(
        '#csvBasicFormat-modal-card > section > div > div > div:nth-child(2) > div.line-content > div:nth-child(3) > div > input',
        testTaxValue[2]
      )
      await page.type(
        '#csvBasicFormat-modal-card > section > div > div > div:nth-child(2) > div.line-content > div:nth-child(4) > div > input',
        testTaxValue[3]
      )
      await page.type(
        '#csvBasicFormat-modal-card > section > div > div > div:nth-child(2) > div.line-content > div:nth-child(5 ) > div > input',
        testTaxValue[4]
      )

      // 単位変更
      const testUnitValue = [
        'A1',
        'B1',
        'C1',
        'D1',
        'E1',
        'F1',
        'G1',
        'H1',
        'I1',
        'J1',
        'K1',
        'L1',
        'M1',
        'N1',
        'O1',
        'P1',
        'Q1',
        'R1',
        'S1',
        'T1',
        'U1',
        'V1',
        'W1',
        'X1',
        'Y1',
        'Z1',
        'A2',
        'B2',
        'C2',
        'D2',
        'E2',
        'F2',
        'G2',
        'H2',
        'I2',
        'J2',
        'K2',
        'L2'
      ]
      for (let idx = 0; idx < testUnitValue.length; idx++) {
        await page.type(
          `#csvBasicFormat-modal-card > section > div > div > div:nth-child(3) > div.line-content > div:nth-child(${
            idx + 1
          }) > div > input`,
          testUnitValue[idx]
        )
      }

      await page.click('#csvBasicEditBtn')

      const checkTax = await page.evaluate(() => {
        return Array.prototype.map.call(document.querySelectorAll('.tax'), (item) => {
          return item.value
        })
      })

      // 確認画面に税の変更が適用されているのか確認
      checkTax.forEach((item, idx) => {
        expect(item).toMatch(testTaxValue[idx])
      })

      const checkUnit = await page.evaluate(() => {
        return Array.prototype.map.call(document.querySelectorAll('.unit'), (item) => {
          return item.value
        })
      })

      // 確認画面に単位の変更が適用されているのか確認
      checkUnit.forEach((item, idx) => {
        expect(item).toMatch(testUnitValue[idx])
      })

      const testItemValue = []
      for (let no = 1; no < 20; no++) {
        testItemValue.push(no)
      }

      const resultItemValue = await page.evaluate(() => {
        const testItemValue = []
        for (let no = 1; no < 20; no++) {
          testItemValue.push(no)
        }
        return Array.prototype.map.call(document.querySelectorAll('select'), (item, idx) => {
          item.selectedIndex = testItemValue[idx]
          return item.selectedIndex
        })
      })

      // 確認画面にアップロードフォーマットデータ番号の変更が適用されているのか確認
      resultItemValue.forEach((item, idx) => {
        expect(item).toBe(testItemValue[idx])
      })

      await browser.close()
    })

    test('請求書アップロードフォーマット設定画面（確認・変更）の基本情報画面で税、単位修正、アップロードフォーマットデータ番号、DB登録', async () => {
      const puppeteer = require('puppeteer')
      const browser = await puppeteer.launch({
        headless: true,
        ignoreHTTPSErrors: true
      })
      const page = await browser.newPage()
      await page.setCookie(acCookies[0])
      await page.goto('https://localhost:3000/uploadFormatList')

      const redirectUrl = await page.evaluate(() => {
        return document
          .querySelector(
            'body > div.max-width > div:nth-child(3) > div > div.box > table > tbody > tr > td:nth-child(5) > a'
          )
          .getAttribute('uuid')
      })

      await page.click(
        'body > div.max-width > div:nth-child(3) > div > div.box > table > tbody > tr > td:nth-child(5) > a'
      )

      await page.waitForTimeout(1000)

      expect(await page.url()).toBe(`https://localhost:3000/uploadFormatEdit/${redirectUrl}`)

      await page.click('#editCsvBasicFormatBtn')

      await page.waitForTimeout(1000)

      // 保存された基本情報設定名称消す
      await page.evaluate(() => {
        document.querySelector('#basicUploadFormatItemName').value = ''
      })
      // 新しい基本情報設定名称入力
      const replaceName = 'インテグレーションテスト変更'
      await page.type('#basicUploadFormatItemName', replaceName)

      const basicTax = await page.evaluate(() => {
        return Array.prototype.map.call(document.querySelectorAll('.input-tax'), (item) => {
          return item.value
        })
      })

      basicTax.forEach((item) => {
        expect(item).toBe('')
      })

      const basicUnit = await page.evaluate(() => {
        return Array.prototype.map.call(document.querySelectorAll('.input-unit'), (item) => {
          return item.value
        })
      })

      basicUnit.forEach((item) => {
        expect(item).toBe('')
      })

      // 税変更
      const testTaxValue = ['AAA', 'BBB', 'CCC', 'DDD', 'EEE']
      await page.type(
        '#csvBasicFormat-modal-card > section > div > div > div:nth-child(2) > div.line-content > div:nth-child(1) > div > input',
        testTaxValue[0]
      )
      await page.type(
        '#csvBasicFormat-modal-card > section > div > div > div:nth-child(2) > div.line-content > div:nth-child(2) > div > input',
        testTaxValue[1]
      )
      await page.type(
        '#csvBasicFormat-modal-card > section > div > div > div:nth-child(2) > div.line-content > div:nth-child(3) > div > input',
        testTaxValue[2]
      )
      await page.type(
        '#csvBasicFormat-modal-card > section > div > div > div:nth-child(2) > div.line-content > div:nth-child(4) > div > input',
        testTaxValue[3]
      )
      await page.type(
        '#csvBasicFormat-modal-card > section > div > div > div:nth-child(2) > div.line-content > div:nth-child(5 ) > div > input',
        testTaxValue[4]
      )

      // 単位変更
      const testUnitValue = [
        'A1',
        'B1',
        'C1',
        'D1',
        'E1',
        'F1',
        'G1',
        'H1',
        'I1',
        'J1',
        'K1',
        'L1',
        'M1',
        'N1',
        'O1',
        'P1',
        'Q1',
        'R1',
        'S1',
        'T1',
        'U1',
        'V1',
        'W1',
        'X1',
        'Y1',
        'Z1',
        'A2',
        'B2',
        'C2',
        'D2',
        'E2',
        'F2',
        'G2',
        'H2',
        'I2',
        'J2',
        'K2',
        'L2'
      ]
      for (let idx = 0; idx < testUnitValue.length; idx++) {
        await page.type(
          `#csvBasicFormat-modal-card > section > div > div > div:nth-child(3) > div.line-content > div:nth-child(${
            idx + 1
          }) > div > input`,
          testUnitValue[idx]
        )
      }

      await page.click('#csvBasicEditBtn')

      const checkTax = await page.evaluate(() => {
        return Array.prototype.map.call(document.querySelectorAll('.tax'), (item) => {
          return item.value
        })
      })

      checkTax.forEach((item, idx) => {
        expect(item).toMatch(testTaxValue[idx])
      })

      const checkUnit = await page.evaluate(() => {
        return Array.prototype.map.call(document.querySelectorAll('.unit'), (item) => {
          return item.value
        })
      })

      checkUnit.forEach((item, idx) => {
        expect(item).toMatch(testUnitValue[idx])
      })

      const testItemValue = []
      for (let no = 1; no < 20; no++) {
        testItemValue.push(no)
      }

      const resultItemValue = await page.evaluate(() => {
        const testItemValue = []
        for (let no = 1; no < 20; no++) {
          testItemValue.push(no)
        }
        return Array.prototype.map.call(document.querySelectorAll('select'), (item, idx) => {
          item.selectedIndex = testItemValue[idx]
          return item.selectedIndex
        })
      })

      resultItemValue.forEach((item, idx) => {
        expect(item).toBe(testItemValue[idx])
      })

      await page.click('#editConfirmBtn')

      const uploadDataHeaderItemAndData = await page.evaluate(() => {
        return Array.prototype.map.call(document.querySelectorAll('.dataItem'), (item, idx) => {
          const dataValue = document.querySelectorAll('.dataValue')[idx].innerText
          return {
            itemName: item.innerText,
            itemValue: dataValue
          }
        })
      })

      const selectUploadHeaderItemAndData = await page.evaluate(() => {
        return Array.prototype.map.call(document.querySelectorAll('.checkDataItem'), (item, idx) => {
          const dataValue = document.querySelectorAll('.checkDataValue')[idx].innerText
          return {
            checkItemName: item.innerText,
            checkItemValue: dataValue
          }
        })
      })

      selectUploadHeaderItemAndData.forEach((item, idx) => {
        expect(item.checkItemName).toMatch(uploadDataHeaderItemAndData[~~resultItemValue[idx] - 1].itemName)
        expect(item.checkItemValue).toMatch(uploadDataHeaderItemAndData[~~resultItemValue[idx] - 1].itemValue)
      })

      await page.click('#submit')

      expect(await page.url()).toMatch('https://localhost:3000/uploadFormatList')

      const uploadFormatName = await page.evaluate(() => {
        return document.querySelector(
          'body > div.max-width > div:nth-child(3) > div > div.box > table > tbody > tr > td.text-center.td-overflow'
        ).innerText
      })

      // 変更した設定名称が表示されること
      expect(uploadFormatName).toMatch(replaceName)
      await browser.close()
    })
  })

  describe('5.契約ステータス：変更申込', () => {
    test('請求書アップロードフォーマット設定画面（確認・変更）へアクセス', async () => {
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
        .get('/uploadFormatEdit')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(400)

      expect(res.text).toMatch(/不正なページからアクセスされたか、セッションタイムアウトが発生しました。/i) // タイトルが含まれていること
    })
  })

  describe('6.契約ステータス：変更受付', () => {
    test('請求書アップロードフォーマット設定画面（確認・変更）へアクセス', async () => {
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
        .get('/uploadFormatEdit')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(400)

      expect(res.text).toMatch(/不正なページからアクセスされたか、セッションタイムアウトが発生しました。/i) // タイトルが含まれていること
    })
  })

  describe('7.契約ステータス：解約申込', () => {
    test('請求書アップロードフォーマット設定画面（確認・変更）へアクセス', async () => {
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
        .get('/uploadFormatEdit')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(400)

      expect(res.text).toMatch(/不正なページからアクセスされたか、セッションタイムアウトが発生しました。/i) // タイトルが含まれていること
    })
  })

  describe('8.契約ステータス：解約受付', () => {
    test('請求書アップロードフォーマット設定画面（確認・変更）へアクセス', async () => {
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
        .get('/uploadFormatEdit')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(400)

      expect(res.text).toMatch(/不正なページからアクセスされたか、セッションタイムアウトが発生しました。/i) // タイトルが含まれていること
    })
  })

  describe('9.契約ステータス：解約', () => {
    test('請求書アップロードフォーマット設定画面（確認・変更）へアクセス', async () => {
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
        .get('/uploadFormatEdit')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(400)

      expect(res.text).toMatch(/不正なページからアクセスされたか、セッションタイムアウトが発生しました。/i) // タイトルが含まれていること
    })
  })

  describe('後処理', () => {
    test('userデータ削除', async () => {
      await db.User.destroy({ where: { tenantId: testTenantId } })
      await db.Tenant.destroy({ where: { tenantId: testTenantId } })
    })
  })
})
