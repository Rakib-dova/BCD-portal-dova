'use strict'
const app = require('../../Application/app')
const request = require('supertest')
const { JSDOM } = require('jsdom')
let testTenantId = null
const db = require('../../Application/models')

jest.setTimeout(60000) // jestのタイムアウトを60秒とする

const getCookies = async (username, password) => {
  const page = await browser.newPage()

  const res = await request(app).get('/auth')

  await page.goto(res.headers.location) // Tradeshift Oauth2認証ログインページをヘッドレスブラウザで開く

  expect(await page.title()).toBe('ログイン | Tradeshift')
  console.log('次のページに遷移しました：' + (await page.title())) // 「ログイン | Tradeshift」のはず

  await page.type('input[name="j_username"]', username)
  await page.type('input[name="j_password"]', password)

  // await page.click('body button#proceed') //page.clickで何故か押せない…
  // await page.evaluate((body) => body.querySelector('button#proceed').click(), await page.$('body'))
  // クッキー使用の許諾をクリック
  await page.click('#cookie-consent-accept-all')
  // 進むボタンをクリック（クッキー許諾後は、page.click使用可能）
  await page.click('#proceed')

  // Oauth2認証後、ヘッドレスブラウザ内ではアプリにリダイレクトしている
  await page.waitForTimeout(10000) // 10秒待つことにする

  // テナントId取得
  if (!testTenantId) {
    await page.goto('https://sandbox.tradeshift.com')
    const tradeshiftConfig = await page.evaluate(() => {
      return window.ts.chrome.config
    })
    testTenantId = tradeshiftConfig.companyId
  }

  await page.goto(res.headers.location)
  // expect(await page.title()).toMatch('利用登録 - BConnectionデジタルトレード')
  console.log('次のページに遷移しました：' + (await page.title())) // 「XXX - BConnectionデジタルトレード」となるはず

  const cookies = await page.cookies() // cookieを奪取

  // ヘッドレスブラウザ内のCookieを削除しておく
  const client = await page.target().createCDPSession()
  await client.send('Network.clearBrowserCookies')
  await client.send('Network.clearBrowserCache')

  return cookies
}

describe('ルーティングのインテグレーションテスト', () => {
  let acCookies, userCookies
  const contractData = {
    campaignCode: '0123456789',
    password: '1q2w3e4r5t',
    contractorName: 'インテグレーションテスター',
    contractorKanaName: 'インテグレーションテスター',
    postalNumber: '1001234',
    contractAddressVal: '東京都中央区日比谷公園',
    banch1: '１',
    tatemono1: '建物',
    contactPersonName: '担当者',
    contactPhoneNumber: '080-1234-5678',
    contactMail: 'test@test'
  }

  const csvData = {
    filename: 'integration_test_csv_file',
    fileData: Buffer.from(
      `発行日,請求書番号,テナントID,支払期日,納品日,備考,銀行名,支店名,科目,口座番号,口座名義,その他特異事項,明細-項目ID,明細-内容,明細-数量,明細-単位,明細-単価,明細-税（消費税／軽減税率／不課税／免税／非課税）,明細-備考
    2021-06-14,INTE_TEST_INVOICE_1_1,3cfebb4f-2338-4dc7-9523-5423a027a880,2021-03-31,2021-03-17,test111,testsiten,testbank,普通,1230012,kang_test,特記事項テストです。,001,PC,100,個,100000,消費税,アップロードテスト`
    ).toString('base64')
  }

  const changeData = {
    chkContractorName: 'on',
    contractorName: '変更ページテスト',
    contractorKanaName: 'ヘンコウページテスト'
  }

  describe('0.前準備', () => {
    test('/authにアクセス：oauth2認証をし、セッション用Cookieを取得', async () => {
      // アカウント管理者と一般ユーザのID/SECRETは、テストコマンドの引数から取得
      const options = require('minimist')(process.argv.slice(2))
      const adminId = options.adminid
      const adminSecret = options.adminsecret
      const userId = options.userid
      const userSecret = options.usersecret
      // --------------------アカウント管理者のCookieを取得---------------
      acCookies = await getCookies(adminId, adminSecret)
      // ---------------------一般ユーザのCookieを取得--------------------
      userCookies = await getCookies(userId, userSecret)

      // Cookieを使ってローカル開発環境のDBからCookieと紐づくユーザを削除しておく

      // DBクリア
      await db.Contract.destroy({ where: { tenantId: testTenantId } })
      await db.Order.destroy({ where: { tenantId: testTenantId } })

      // アカウント管理者を削除
      await request(app)
        .get('/user/delete')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)

      // 一般ユーザを削除
      await request(app)
        .get('/user/delete')
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
    })
  })

  describe('1.DBにアカウント管理者・一般ユーザ共に登録なし/一般ユーザとしてリクエスト', () => {
    // DB状態:
    //   テナント：
    //    試験前：未登録
    //    試験後(期待値)：未登録
    //
    //   アカウント管理者：
    //    試験前：未登録
    //    試験後(期待値)：未登録
    //
    //   一般ユーザ：
    //    試験前：未登録
    //    試験後(期待値)：未登録

    // /authにリダイレクトする
    test('/indexにアクセス：303ステータスと/authにリダイレクト', async () => {
      const res = await request(app)
        .get('/')
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
        .expect(303)

      expect(res.header.location).toBe('/auth') // リダイレクト先は/auth
    })

    // テナント未登録のため、テナントの利用登録画面にリダイレクトする
    test('/portalにアクセス：303ステータスと/tenant/registerにリダイレクト', async () => {
      const res = await request(app)
        .get('/portal')
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
        .expect(303)

      expect(res.header.location).toBe('/tenant/register') // リダイレクト先は/tenant/register
    })

    // 住所検索成功
    test('住所検索：1件以上', async () => {
      const res = await request(app)
        .post('/searchAddress')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .set('Content-Type', 'application/json')
        .send({ postalNumber: '0600000' })
        .expect(200)
      expect(res.status).toBe(200)
      expect(res.body.addressList[0].address).toBe('北海道札幌市中央区')
      expect(res.body.addressList[1].address).toBe('北海道札幌市中央区円山')
    })

    test('住所検索:結果0件', async () => {
      const res = await request(app)
        .post('/searchAddress')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .set('Content-Type', 'application/json')
        .send({ postalNumber: '1234567' })
        .expect(200)

      expect(res.status).toBe(200)
      expect(res.body.addressList.length).toBe(0)
    })

    // 住所検索失敗
    test('住所検索失敗-パラメータなし', async () => {
      const res = await request(app)
        .post('/searchAddress')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .set('Content-Type', 'application/json')
        .send({ postalNumberl: '1234567' })
        .expect(400)

      expect(res.status).toBe(400)
    })

    // 住所検索失敗
    test('住所検索失敗-正しくないパラメータ値', async () => {
      const res = await request(app)
        .post('/searchAddress')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .set('Content-Type', 'application/json')
        .send({ postalNumberl: '123456a' })
        .expect(400)

      expect(res.status).toBe(400)
    })

    let userCsrf, tenantCsrf
    // userContextが'NotUserRegistered'(tenant側の登録が先に必要)のため、アクセスできない
    test('/user/registerにアクセス：userContext不一致による400ステータスとエラーメッセージ', async () => {
      const res = await request(app)
        .get('/user/register')
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
        .expect(400)

      // CSRFのワンタイムトークン取得
      const dom = new JSDOM(res.text)
      userCsrf = dom.window.document.getElementsByName('_csrf')[0]?.value

      expect(res.text).toMatch(/不正なページからアクセスされたか、セッションタイムアウトが発生しました。/i) // タイトル
    })

    // 正しいCSRFトークンを取得していないため、アクセスできない
    test('/user/registerにPOST：csurfによる400ステータスとエラーメッセージ', async () => {
      const res = await request(app)
        .post('/user/register')
        .type('form')
        .send({ _csrf: userCsrf, termsCheck: 'on' })
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
        .expect(400)

      expect(res.text).toMatch(/不正なページからアクセスされたか、セッションタイムアウトが発生しました。/i) // タイトル
    })

    // 管理者権限がないため、アクセスできない
    test('/tenant/registerにアクセス：管理者権限不足による利用不可画面表示', async () => {
      const res = await request(app)
        .get('/tenant/register')
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
        .expect(200)

      // CSRFのワンタイムトークン取得
      const dom = new JSDOM(res.text)
      tenantCsrf = dom.window.document.getElementsByName('_csrf')[0]?.value

      expect(res.text).toMatch(/テナント管理者権限のあるユーザで再度操作をお試しください。/i) // タイトル
    })

    // 正しいCSRFトークンを取得していないため、アクセスできない
    test('/tenant/registerにPOST：csurfによる400ステータスとエラーメッセージ', async () => {
      const res = await request(app)
        .post('/tenant/register')
        .type('form')
        .send({ _csrf: tenantCsrf, termsCheck: 'on' })
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
        .expect(400)

      expect(res.text).toMatch(/不正なページからアクセスされたか、セッションタイムアウトが発生しました。/i) // タイトル
    })

    // 利用登録をしていないため、請求書一括アップロードページ利用できない
    test('/csvuploadにGET：制御による400ステータスとエラーメッセージ', async () => {
      const res = await request(app)
        .get('/csvupload')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(400)

      expect(res.text).toMatch(/不正なページからアクセスされたか、セッションタイムアウトが発生しました。/i) // タイトル
    })

    // 利用登録をしていないため、請求書一括アップロード機能利用できない
    test('/csvuploadにPOST：制御による400ステータスとエラーメッセージ', async () => {
      const res = await request(app)
        .post('/csvupload')
        .set('Content-Type', 'application/json')
        .send({ ...csvData })
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(400)

      expect(res.text).toMatch(/不正なページからアクセスされたか、セッションタイムアウトが発生しました。/i) // タイトル
    })

    test('/csvuploadResultにGET：制御による400ステータスとエラーメッセージ:管理者', async () => {
      const res = await request(app)
        .get('/csvupload')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(400)

      expect(res.text).toMatch(/不正なページからアクセスされたか、セッションタイムアウトが発生しました。/i) // タイトル
    })

    test('/csvuploadResultにGET：制御による400ステータスとエラーメッセージ:一般ユーザー', async () => {
      const res = await request(app)
        .get('/csvupload')
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
        .expect(400)

      expect(res.text).toMatch(/不正なページからアクセスされたか、セッションタイムアウトが発生しました。/i) // タイトル
    })

    // 利用登録をしていないため、変更ページ利用できない
    test('/changeにGET：制御による400ステータスとエラーメッセージ', async () => {
      const res = await request(app)
        .get('/change')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(400)

      expect(res.text).toMatch(/不正なページからアクセスされたか、セッションタイムアウトが発生しました。/i) // タイトル
    })

    // 利用登録をしていないため、変更機能利用できない
    test('/changeにPOST：制御による400ステータスとエラーメッセージ', async () => {
      const res = await request(app)
        .post('/change')
        .send({ ...changeData })
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(400)

      expect(res.text).toMatch(/不正なページからアクセスされたか、セッションタイムアウトが発生しました。/i) // タイトル
    })

    // 利用登録をしていないため、解約ページ利用できない
    test('/cancellationにGET：制御による400ステータスとエラーメッセージ', async () => {
      const res = await request(app)
        .get('/cancellation')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(400)

      expect(res.text).toMatch(/不正なページからアクセスされたか、セッションタイムアウトが発生しました。/i) // タイトル
    })

    // 利用登録をしていないため、解約機能利用できない
    test('/cancellationにPOST：制御による400ステータスとエラーメッセージ', async () => {
      const res = await request(app)
        .post('/cancellation')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(400)

      expect(res.text).toMatch(/不正なページからアクセスされたか、セッションタイムアウトが発生しました。/i) // タイトル
    })
  })

  describe('2.DBにアカウント管理者・一般ユーザ共に登録なし/アカウント管理者としてリクエスト', () => {
    // DB状態:
    //   テナント：
    //    試験前：未登録
    //    試験後(期待値)：登録
    //
    //   アカウント管理者：
    //    試験前：未登録
    //    試験後(期待値)：登録
    //
    //   一般ユーザ：
    //    試験前：未登録
    //    試験後(期待値)：未登録

    // /authにリダイレクトする
    test('/indexにアクセス：303ステータスと/authにリダイレクト', async () => {
      const res = await request(app)
        .get('/')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(303)

      expect(res.header.location).toBe('/auth') // リダイレクト先は/auth
    })

    // テナント未登録のため、テナントの利用登録画面にリダイレクトする
    test('/portalにアクセス：303ステータスと/tenant/registerにリダイレクト', async () => {
      const res = await request(app)
        .get('/portal')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(303)

      expect(res.header.location).toBe('/tenant/register') // リダイレクト先は/tenant/register
    })

    let userCsrf, tenantCsrf
    // userContextが'NotUserRegistered'(tenant側の登録が先に必要)のため、アクセスできない
    test('/user/registerにアクセス：userContext不一致による400ステータスとエラーメッセージ', async () => {
      const res = await request(app)
        .get('/user/register')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(400)

      // CSRFのワンタイムトークン取得
      const dom = new JSDOM(res.text)
      userCsrf = dom.window.document.getElementsByName('_csrf')[0]?.value

      expect(res.text).toMatch(/不正なページからアクセスされたか、セッションタイムアウトが発生しました。/i) // タイトル
    })

    // 正しいCSRFトークンを取得していないため、アクセスできない
    test('/user/registerにPOST：csurfによる400ステータスとエラーメッセージ', async () => {
      const res = await request(app)
        .post('/user/register')
        .type('form')
        .send({ _csrf: userCsrf, termsCheck: 'on' })
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(400)

      expect(res.text).toMatch(/不正なページからアクセスされたか、セッションタイムアウトが発生しました。/i) // タイトル
    })

    // テナントの利用登録録画面が正常に表示される
    test('/tenant/registerにアクセス：200ステータスとテナントの利用登録画面表示', async () => {
      const res = await request(app)
        .get('/tenant/register')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(200)

      // CSRFのワンタイムトークン取得
      const dom = new JSDOM(res.text)
      tenantCsrf = dom.window.document.getElementsByName('_csrf')[0]?.value

      expect(res.text).toMatch(/利用登録 - BConnectionデジタルトレード/i) // タイトル
    })

    // 契約者名未入力の場合
    test('/tenant/registerにアクセス：契約者名未入力', async () => {
      let clickResult
      const page = await browser.newPage()
      await page.setCookie(acCookies[0])
      await page.goto('https://localhost:3000/tenant/register')
      if (page.url() === 'https://localhost:3000/tenant/register') {
        await page.evaluate(() => {
          document.querySelector('#contractorName').value = ''
          document.querySelector('#contractorKanaName').value = 'テスト'
          document.querySelector('#postalNumber').value = '0600000'
          document.querySelector('#contractAddressVal').value = '北海道札幌市中央区'
          document.querySelector('#banch1').value = '２番'
          document.querySelector('#contactPersonName').value = '連絡先担当者名'
          document.querySelector('#contactPhoneNumber').value = '080-0000-0000'
          document.querySelector('#contactMail').value = 'test@test.co.jp'
          document.querySelector('#password').value = 'Abcd1234'
          document.querySelector('#passwordConfirm').value = 'Abcd1234'
          document.querySelector('#check').disabled = false
          document.querySelector('#check').checked = true
          document.querySelector('#check').value = 'on'
          document.querySelector('#next-btn').disabled = false
        })

        await page.waitForTimeout(500)

        const selector = await page.$('#next-btn')
        await selector.click({ clickCount: 1 })
        clickResult = await page.evaluate(() => {
          if (document.getElementById('caution').innerHTML.match('未入力です。') !== null) {
            return document.getElementById('caution').innerHTML.match('未入力です。')[0]
          }
          return null
        })
      }
      // '未入力です。'があること
      expect(clickResult).toBe('未入力です。')
    })

    // 契約者名不正な値
    test('/tenant/registerにアクセス：契約者名不正な値', async () => {
      let clickResult
      const page = await browser.newPage()
      await page.setCookie(acCookies[0])
      await page.goto('https://localhost:3000/tenant/register')
      if (page.url() === 'https://localhost:3000/tenant/register') {
        await page.evaluate(() => {
          document.querySelector('#contractorName').value = 'abc'
          document.querySelector('#contractorName').setAttribute('aria-invalid', 'true')
          document.querySelector('#contractorKanaName').value = 'テスト'
          document.querySelector('#postalNumber').value = '0600000'
          document.querySelector('#contractAddressVal').value = '北海道札幌市中央区'
          document.querySelector('#banch1').value = '２番'
          document.querySelector('#contactPersonName').value = '連絡先担当者名'
          document.querySelector('#contactPhoneNumber').value = '080-0000-0000'
          document.querySelector('#contactMail').value = 'test@test.co.jp'
          document.querySelector('#password').value = 'Abcd1234'
          document.querySelector('#passwordConfirm').value = 'Abcd1234'
          document.querySelector('#check').disabled = false
          document.querySelector('#check').checked = true
          document.querySelector('#check').value = 'on'
          document.querySelector('#next-btn').disabled = false
        })

        await page.waitForTimeout(500)

        const selector = await page.$('#next-btn')
        await selector.click({ clickCount: 1 })
        clickResult = await page.evaluate(() => {
          if (document.getElementById('caution').innerHTML.match('入力値が間違いました。') !== null) {
            return document.getElementById('caution').innerHTML.match('入力値が間違いました。')[0]
          }
          return null
        })
      }
      // '入力値が間違いました。'があること
      expect(clickResult).toBe('入力値が間違いました。')
    })

    // 契約者カナ名未入力
    test('/tenant/registerにアクセス：契約者カナ名未入力', async () => {
      let clickResult
      const page = await browser.newPage()
      await page.setCookie(acCookies[0])
      await page.goto('https://localhost:3000/tenant/register')
      if (page.url() === 'https://localhost:3000/tenant/register') {
        await page.evaluate(() => {
          document.querySelector('#contractorName').value = 'テスト'
          document.querySelector('#contractorKanaName').value = ''
          document.querySelector('#postalNumber').value = '0600000'
          document.querySelector('#contractAddressVal').value = '北海道札幌市中央区'
          document.querySelector('#banch1').value = '２番'
          document.querySelector('#contactPersonName').value = '連絡先担当者名'
          document.querySelector('#contactPhoneNumber').value = '080-0000-0000'
          document.querySelector('#contactMail').value = 'test@test.co.jp'
          document.querySelector('#password').value = 'Abcd1234'
          document.querySelector('#passwordConfirm').value = 'Abcd1234'
          document.querySelector('#check').disabled = false
          document.querySelector('#check').checked = true
          document.querySelector('#check').value = 'on'
          document.querySelector('#next-btn').disabled = false
        })

        await page.waitForTimeout(500)

        const selector = await page.$('#next-btn')
        await selector.click({ clickCount: 1 })
        clickResult = await page.evaluate(() => {
          if (document.getElementById('caution').innerHTML.match('未入力です。') !== null) {
            return document.getElementById('caution').innerHTML.match('未入力です。')[0]
          }
          return null
        })
      }
      // '未入力です。'があること
      expect(clickResult).toBe('未入力です。')
    })

    // 契約者カナ名不正な値
    test('/tenant/registerにアクセス：契約者カナ名不正な値', async () => {
      let clickResult
      const page = await browser.newPage()
      await page.setCookie(acCookies[0])
      await page.goto('https://localhost:3000/tenant/register')
      if (page.url() === 'https://localhost:3000/tenant/register') {
        await page.evaluate(() => {
          document.querySelector('#contractorName').value = 'テスト'
          document.querySelector('#contractorKanaName').value = 'test'
          document.querySelector('#contractorKanaName').setAttribute('aria-invalid', 'true')
          document.querySelector('#postalNumber').value = '0600000'
          document.querySelector('#contractAddressVal').value = '北海道札幌市中央区'
          document.querySelector('#banch1').value = '２番'
          document.querySelector('#contactPersonName').value = '連絡先担当者名'
          document.querySelector('#contactPhoneNumber').value = '080-0000-0000'
          document.querySelector('#contactMail').value = 'test@test.co.jp'
          document.querySelector('#password').value = 'Abcd1234'
          document.querySelector('#passwordConfirm').value = 'Abcd1234'
          document.querySelector('#check').disabled = false
          document.querySelector('#check').checked = true
          document.querySelector('#check').value = 'on'
          document.querySelector('#next-btn').disabled = false
        })

        await page.waitForTimeout(500)

        const selector = await page.$('#next-btn')
        await selector.click({ clickCount: 1 })
        clickResult = await page.evaluate(() => {
          if (document.getElementById('caution').innerHTML.match('入力値が間違いました。') !== null) {
            return document.getElementById('caution').innerHTML.match('入力値が間違いました。')[0]
          }
          return null
        })
      }
      // '入力値が間違いました。'があること
      expect(clickResult).toBe('入力値が間違いました。')
    })

    // 郵便番号未入力
    test('/tenant/registerにアクセス：郵便番号未入力', async () => {
      let clickResult
      const page = await browser.newPage()
      await page.setCookie(acCookies[0])
      await page.goto('https://localhost:3000/tenant/register')
      if (page.url() === 'https://localhost:3000/tenant/register') {
        await page.evaluate(() => {
          document.querySelector('#contractorName').value = 'テスト'
          document.querySelector('#contractorKanaName').value = 'テスト'
          document.querySelector('#postalNumber').value = ''
          document.querySelector('#contractAddressVal').value = '北海道札幌市中央区'
          document.querySelector('#banch1').value = '２番'
          document.querySelector('#contactPersonName').value = '連絡先担当者名'
          document.querySelector('#contactPhoneNumber').value = '080-0000-0000'
          document.querySelector('#contactMail').value = 'test@test.co.jp'
          document.querySelector('#password').value = 'Abcd1234'
          document.querySelector('#passwordConfirm').value = 'Abcd1234'
          document.querySelector('#check').disabled = false
          document.querySelector('#check').checked = true
          document.querySelector('#check').value = 'on'
          document.querySelector('#next-btn').disabled = false
        })

        await page.waitForTimeout(500)

        const selector = await page.$('#next-btn')
        await selector.click({ clickCount: 1 })
        clickResult = await page.evaluate(() => {
          if (document.getElementById('caution').innerHTML.match('未入力です。') !== null) {
            return document.getElementById('caution').innerHTML.match('未入力です。')[0]
          }
          return null
        })
      }
      // '未入力です。'があること
      expect(clickResult).toBe('未入力です。')
    })

    // 郵便番号不正な値
    test('/tenant/registerにアクセス：郵便番号不正な値', async () => {
      let clickResult
      const page = await browser.newPage()
      await page.setCookie(acCookies[0])
      await page.goto('https://localhost:3000/tenant/register')
      if (page.url() === 'https://localhost:3000/tenant/register') {
        await page.evaluate(() => {
          document.querySelector('#contractorName').value = 'テスト'
          document.querySelector('#contractorKanaName').value = 'テスト'
          document.querySelector('#postalNumber').value = 'test'
          document.querySelector('#postalNumber').setAttribute('aria-invalid', 'true')
          document.querySelector('#contractAddressVal').value = '北海道札幌市中央区'
          document.querySelector('#banch1').value = '２番'
          document.querySelector('#contactPersonName').value = '連絡先担当者名'
          document.querySelector('#contactPhoneNumber').value = '080-0000-0000'
          document.querySelector('#contactMail').value = 'test@test.co.jp'
          document.querySelector('#password').value = 'Abcd1234'
          document.querySelector('#passwordConfirm').value = 'Abcd1234'
          document.querySelector('#check').disabled = false
          document.querySelector('#check').checked = true
          document.querySelector('#check').value = 'on'
          document.querySelector('#next-btn').disabled = false
        })

        await page.waitForTimeout(500)

        const selector = await page.$('#next-btn')
        await selector.click({ clickCount: 1 })
        clickResult = await page.evaluate(() => {
          if (document.getElementById('caution').innerHTML.match('入力値が間違いました。') !== null) {
            return document.getElementById('caution').innerHTML.match('入力値が間違いました。')[0]
          }
          return null
        })
      }
      // '入力値が間違いました。'があること
      expect(clickResult).toBe('入力値が間違いました。')
    })

    // 住所の検索結果未入力
    test('/tenant/registerにアクセス：住所の検索結果未入力', async () => {
      let clickResult
      const page = await browser.newPage()
      await page.setCookie(acCookies[0])
      await page.goto('https://localhost:3000/tenant/register')
      if (page.url() === 'https://localhost:3000/tenant/register') {
        await page.evaluate(() => {
          document.querySelector('#contractorName').value = 'テスト'
          document.querySelector('#contractorKanaName').value = 'テスト'
          document.querySelector('#postalNumber').value = '0600000'
          document.querySelector('#contractAddressVal').value = ''
          document.querySelector('#banch1').value = '２番'
          document.querySelector('#contactPersonName').value = '連絡先担当者名'
          document.querySelector('#contactPhoneNumber').value = '080-0000-0000'
          document.querySelector('#contactMail').value = 'test@test.co.jp'
          document.querySelector('#password').value = 'Abcd1234'
          document.querySelector('#passwordConfirm').value = 'Abcd1234'
          document.querySelector('#check').disabled = false
          document.querySelector('#check').checked = true
          document.querySelector('#check').value = 'on'
          document.querySelector('#next-btn').disabled = false
        })

        await page.waitForTimeout(500)

        const selector = await page.$('#next-btn')
        await selector.click({ clickCount: 1 })
        clickResult = await page.evaluate(() => {
          if (document.getElementById('caution').innerHTML.match('未入力です。') !== null) {
            return document.getElementById('caution').innerHTML.match('未入力です。')[0]
          }
          return null
        })
      }
      // '未入力です。'があること
      expect(clickResult).toBe('未入力です。')
    })

    // 番地未入力
    test('/tenant/registerにアクセス：番地未入力', async () => {
      let clickResult
      const page = await browser.newPage()
      await page.setCookie(acCookies[0])
      await page.goto('https://localhost:3000/tenant/register')
      if (page.url() === 'https://localhost:3000/tenant/register') {
        await page.evaluate(() => {
          document.querySelector('#contractorName').value = 'テスト'
          document.querySelector('#contractorKanaName').value = 'テスト'
          document.querySelector('#postalNumber').value = '0600000'
          document.querySelector('#contractAddressVal').value = '北海道札幌市中央区'
          document.querySelector('#banch1').value = ''
          document.querySelector('#contactPersonName').value = '連絡先担当者名'
          document.querySelector('#contactPhoneNumber').value = '080-0000-0000'
          document.querySelector('#contactMail').value = 'test@test.co.jp'
          document.querySelector('#password').value = 'Abcd1234'
          document.querySelector('#passwordConfirm').value = 'Abcd1234'
          document.querySelector('#check').disabled = false
          document.querySelector('#check').checked = true
          document.querySelector('#check').value = 'on'
          document.querySelector('#next-btn').disabled = false
        })

        await page.waitForTimeout(500)

        const selector = await page.$('#next-btn')
        await selector.click({ clickCount: 1 })
        clickResult = await page.evaluate(() => {
          if (document.getElementById('caution').innerHTML.match('未入力です。') !== null) {
            return document.getElementById('caution').innerHTML.match('未入力です。')[0]
          }
          return null
        })
      }
      // '未入力です。'があること
      expect(clickResult).toBe('未入力です。')
    })

    // 番地不正な値
    test('/tenant/registerにアクセス：番地不正な値', async () => {
      let clickResult
      const page = await browser.newPage()
      await page.setCookie(acCookies[0])
      await page.goto('https://localhost:3000/tenant/register')
      if (page.url() === 'https://localhost:3000/tenant/register') {
        await page.evaluate(() => {
          document.querySelector('#contractorName').value = 'テスト'
          document.querySelector('#contractorKanaName').value = 'テスト'
          document.querySelector('#postalNumber').value = '0600000'
          document.querySelector('#contractAddressVal').value = '北海道札幌市中央区'
          document.querySelector('#banch1').value = 'test'
          document.querySelector('#banch1').setAttribute('aria-invalid', 'true')
          document.querySelector('#contactPersonName').value = '連絡先担当者名'
          document.querySelector('#contactPhoneNumber').value = '080-0000-0000'
          document.querySelector('#contactMail').value = 'test@test.co.jp'
          document.querySelector('#password').value = 'Abcd1234'
          document.querySelector('#passwordConfirm').value = 'Abcd1234'
          document.querySelector('#check').disabled = false
          document.querySelector('#check').checked = true
          document.querySelector('#check').value = 'on'
          document.querySelector('#next-btn').disabled = false
        })

        await page.waitForTimeout(500)

        const selector = await page.$('#next-btn')
        await selector.click({ clickCount: 1 })
        clickResult = await page.evaluate(() => {
          if (document.getElementById('caution').innerHTML.match('入力値が間違いました。') !== null) {
            return document.getElementById('caution').innerHTML.match('入力値が間違いました。')[0]
          }
          return null
        })
      }
      // '入力値が間違いました。'があること
      expect(clickResult).toBe('入力値が間違いました。')
    })

    // 連絡先担当者名未入力
    test('/tenant/registerにアクセス：連絡先担当者名未入力', async () => {
      let clickResult
      const page = await browser.newPage()
      await page.setCookie(acCookies[0])
      await page.goto('https://localhost:3000/tenant/register')
      if (page.url() === 'https://localhost:3000/tenant/register') {
        await page.evaluate(() => {
          document.querySelector('#contractorName').value = 'テスト'
          document.querySelector('#contractorKanaName').value = 'テスト'
          document.querySelector('#postalNumber').value = '0600000'
          document.querySelector('#contractAddressVal').value = '北海道札幌市中央区'
          document.querySelector('#banch1').value = '２番'
          document.querySelector('#contactPersonName').value = ''
          document.querySelector('#contactPhoneNumber').value = '080-0000-0000'
          document.querySelector('#contactMail').value = 'test@test.co.jp'
          document.querySelector('#password').value = 'Abcd1234'
          document.querySelector('#passwordConfirm').value = 'Abcd1234'
          document.querySelector('#check').disabled = false
          document.querySelector('#check').checked = true
          document.querySelector('#check').value = 'on'
          document.querySelector('#next-btn').disabled = false
        })

        await page.waitForTimeout(500)

        const selector = await page.$('#next-btn')
        await selector.click({ clickCount: 1 })
        clickResult = await page.evaluate(() => {
          if (document.getElementById('caution').innerHTML.match('未入力です。') !== null) {
            return document.getElementById('caution').innerHTML.match('未入力です。')[0]
          }
          return null
        })
      }
      // '未入力です。'があること
      expect(clickResult).toBe('未入力です。')
    })

    // 連絡先担当者名不正な値
    test('/tenant/registerにアクセス：連絡先担当者名不正な値', async () => {
      let clickResult
      const page = await browser.newPage()
      await page.setCookie(acCookies[0])
      await page.goto('https://localhost:3000/tenant/register')
      if (page.url() === 'https://localhost:3000/tenant/register') {
        await page.evaluate(() => {
          document.querySelector('#contractorName').value = 'テスト'
          document.querySelector('#contractorKanaName').value = 'テスト'
          document.querySelector('#postalNumber').value = '0600000'
          document.querySelector('#contractAddressVal').value = '北海道札幌市中央区'
          document.querySelector('#banch1').value = '２番'
          document.querySelector('#contactPersonName').value = 'test'
          document.querySelector('#contactPersonName').setAttribute('aria-invalid', 'true')
          document.querySelector('#contactPhoneNumber').value = '080-0000-0000'
          document.querySelector('#contactMail').value = 'test@test.co.jp'
          document.querySelector('#password').value = 'Abcd1234'
          document.querySelector('#passwordConfirm').value = 'Abcd1234'
          document.querySelector('#check').disabled = false
          document.querySelector('#check').checked = true
          document.querySelector('#check').value = 'on'
          document.querySelector('#next-btn').disabled = false
        })

        await page.waitForTimeout(500)

        const selector = await page.$('#next-btn')
        await selector.click({ clickCount: 1 })
        clickResult = await page.evaluate(() => {
          if (document.getElementById('caution').innerHTML.match('入力値が間違いました。') !== null) {
            return document.getElementById('caution').innerHTML.match('入力値が間違いました。')[0]
          }
          return null
        })
      }
      // '入力値が間違いました。'があること
      expect(clickResult).toBe('入力値が間違いました。')
    })

    // 連絡先電話番号未入力
    test('/tenant/registerにアクセス：連絡先電話番号未入力', async () => {
      let clickResult
      const page = await browser.newPage()
      await page.setCookie(acCookies[0])
      await page.goto('https://localhost:3000/tenant/register')
      if (page.url() === 'https://localhost:3000/tenant/register') {
        await page.evaluate(() => {
          document.querySelector('#contractorName').value = 'テスト'
          document.querySelector('#contractorKanaName').value = 'テスト'
          document.querySelector('#postalNumber').value = '0600000'
          document.querySelector('#contractAddressVal').value = '北海道札幌市中央区'
          document.querySelector('#banch1').value = '２番'
          document.querySelector('#contactPersonName').value = '連絡先担当者名'
          document.querySelector('#contactPhoneNumber').value = ''
          document.querySelector('#contactMail').value = 'test@test.co.jp'
          document.querySelector('#password').value = 'Abcd1234'
          document.querySelector('#passwordConfirm').value = 'Abcd1234'
          document.querySelector('#check').disabled = false
          document.querySelector('#check').checked = true
          document.querySelector('#check').value = 'on'
          document.querySelector('#next-btn').disabled = false
        })

        await page.waitForTimeout(500)

        const selector = await page.$('#next-btn')
        await selector.click({ clickCount: 1 })
        clickResult = await page.evaluate(() => {
          if (document.getElementById('caution').innerHTML.match('未入力です。') !== null) {
            return document.getElementById('caution').innerHTML.match('未入力です。')[0]
          }
          return null
        })
      }
      // '未入力です。'があること
      expect(clickResult).toBe('未入力です。')
    })

    // 連絡先電話番号不正な値
    test('/tenant/registerにアクセス：連絡先電話番号不正な値', async () => {
      let clickResult
      const page = await browser.newPage()
      await page.setCookie(acCookies[0])
      await page.goto('https://localhost:3000/tenant/register')
      if (page.url() === 'https://localhost:3000/tenant/register') {
        await page.evaluate(() => {
          document.querySelector('#contractorName').value = 'テスト'
          document.querySelector('#contractorKanaName').value = 'テスト'
          document.querySelector('#postalNumber').value = '0600000'
          document.querySelector('#contractAddressVal').value = '北海道札幌市中央区'
          document.querySelector('#banch1').value = '２番'
          document.querySelector('#contactPersonName').value = '連絡先担当者名'
          document.querySelector('#contactPhoneNumber').value = 'test'
          document.querySelector('#contactPhoneNumber').setAttribute('aria-invalid', 'true')
          document.querySelector('#contactMail').value = 'test@test.co.jp'
          document.querySelector('#password').value = 'Abcd1234'
          document.querySelector('#passwordConfirm').value = 'Abcd1234'
          document.querySelector('#check').disabled = false
          document.querySelector('#check').checked = true
          document.querySelector('#check').value = 'on'
          document.querySelector('#next-btn').disabled = false
        })

        await page.waitForTimeout(500)

        const selector = await page.$('#next-btn')
        await selector.click({ clickCount: 1 })
        clickResult = await page.evaluate(() => {
          if (document.getElementById('caution').innerHTML.match('入力値が間違いました。') !== null) {
            return document.getElementById('caution').innerHTML.match('入力値が間違いました。')[0]
          }
          return null
        })
      }
      // '入力値が間違いました。'があること
      expect(clickResult).toBe('入力値が間違いました。')
    })

    // 連絡先メールアドレス未入力
    test('/tenant/registerにアクセス：連絡先メールアドレス未入力', async () => {
      let clickResult
      const page = await browser.newPage()
      await page.setCookie(acCookies[0])
      await page.goto('https://localhost:3000/tenant/register')
      if (page.url() === 'https://localhost:3000/tenant/register') {
        await page.evaluate(() => {
          document.querySelector('#contractorName').value = 'テスト'
          document.querySelector('#contractorKanaName').value = 'テスト'
          document.querySelector('#postalNumber').value = '0600000'
          document.querySelector('#contractAddressVal').value = '北海道札幌市中央区'
          document.querySelector('#banch1').value = '２番'
          document.querySelector('#contactPersonName').value = '連絡先担当者名'
          document.querySelector('#contactPhoneNumber').value = '080-0000-0000'
          document.querySelector('#contactMail').value = ''
          document.querySelector('#password').value = 'Abcd1234'
          document.querySelector('#passwordConfirm').value = 'Abcd1234'
          document.querySelector('#check').disabled = false
          document.querySelector('#check').checked = true
          document.querySelector('#check').value = 'on'
          document.querySelector('#next-btn').disabled = false
        })

        await page.waitForTimeout(500)

        const selector = await page.$('#next-btn')
        await selector.click({ clickCount: 1 })
        clickResult = await page.evaluate(() => {
          if (document.getElementById('caution').innerHTML.match('未入力です。') !== null) {
            return document.getElementById('caution').innerHTML.match('未入力です。')[0]
          }
          return null
        })
      }
      // '未入力です。'があること
      expect(clickResult).toBe('未入力です。')
    })

    // 連絡先メールアドレス不正な値
    test('/tenant/registerにアクセス：連絡先メールアドレス不正な値', async () => {
      let clickResult
      const page = await browser.newPage()
      await page.setCookie(acCookies[0])
      await page.goto('https://localhost:3000/tenant/register')
      if (page.url() === 'https://localhost:3000/tenant/register') {
        await page.evaluate(() => {
          document.querySelector('#contractorName').value = 'テスト'
          document.querySelector('#contractorKanaName').value = 'テスト'
          document.querySelector('#postalNumber').value = '0600000'
          document.querySelector('#contractAddressVal').value = '北海道札幌市中央区'
          document.querySelector('#banch1').value = '２番'
          document.querySelector('#contactPersonName').value = '連絡先担当者名'
          document.querySelector('#contactPhoneNumber').value = '080-0000-0000'
          document.querySelector('#contactMail').value = 'test'
          document.querySelector('#contactMail').setAttribute('aria-invalid', 'true')
          document.querySelector('#password').value = 'Abcd1234'
          document.querySelector('#passwordConfirm').value = 'Abcd1234'
          document.querySelector('#check').disabled = false
          document.querySelector('#check').checked = true
          document.querySelector('#check').value = 'on'
          document.querySelector('#next-btn').disabled = false
        })

        await page.waitForTimeout(500)

        const selector = await page.$('#next-btn')
        await selector.click({ clickCount: 1 })
        clickResult = await page.evaluate(() => {
          if (document.getElementById('caution').innerHTML.match('入力値が間違いました。') !== null) {
            return document.getElementById('caution').innerHTML.match('入力値が間違いました。')[0]
          }
          return null
        })
      }
      // '入力値が間違いました。'があること
      expect(clickResult).toBe('入力値が間違いました。')
    })

    // パスワード未入力
    test('/tenant/registerにアクセス：パスワード未入力', async () => {
      let clickResult
      const page = await browser.newPage()
      await page.setCookie(acCookies[0])
      await page.goto('https://localhost:3000/tenant/register')
      if (page.url() === 'https://localhost:3000/tenant/register') {
        await page.evaluate(() => {
          document.querySelector('#contractorName').value = 'テスト'
          document.querySelector('#contractorKanaName').value = 'テスト'
          document.querySelector('#postalNumber').value = '0600000'
          document.querySelector('#contractAddressVal').value = '北海道札幌市中央区'
          document.querySelector('#banch1').value = '２番'
          document.querySelector('#contactPersonName').value = '連絡先担当者名'
          document.querySelector('#contactPhoneNumber').value = '080-0000-0000'
          document.querySelector('#contactMail').value = 'test@test.co.jp'
          document.querySelector('#password').value = ''
          document.querySelector('#passwordConfirm').value = ''
          document.querySelector('#check').disabled = false
          document.querySelector('#check').checked = true
          document.querySelector('#check').value = 'on'
          document.querySelector('#next-btn').disabled = false
        })

        await page.waitForTimeout(500)

        const selector = await page.$('#next-btn')
        await selector.click({ clickCount: 1 })
        clickResult = await page.evaluate(() => {
          if (document.getElementById('caution').innerHTML.match('未入力です。') !== null) {
            return document.getElementById('caution').innerHTML.match('未入力です。')[0]
          }
          return null
        })
      }
      // '未入力です。'があること
      expect(clickResult).toBe('未入力です。')
    })

    // パスワード不正な値
    test('/tenant/registerにアクセス：パスワード不正な値', async () => {
      let clickResult
      const page = await browser.newPage()
      await page.setCookie(acCookies[0])
      await page.goto('https://localhost:3000/tenant/register')
      if (page.url() === 'https://localhost:3000/tenant/register') {
        await page.evaluate(() => {
          document.querySelector('#contractorName').value = 'テスト'
          document.querySelector('#contractorKanaName').value = 'テスト'
          document.querySelector('#postalNumber').value = '0600000'
          document.querySelector('#contractAddressVal').value = '北海道札幌市中央区'
          document.querySelector('#banch1').value = '２番'
          document.querySelector('#contactPersonName').value = '連絡先担当者名'
          document.querySelector('#contactPhoneNumber').value = '080-0000-0000'
          document.querySelector('#contactMail').value = 'test@test.co.jp'
          document.querySelector('#password').value = '1234'
          document.querySelector('#password').setAttribute('aria-invalid', 'true')
          document.querySelector('#passwordConfirm').value = '1234'
          document.querySelector('#check').disabled = false
          document.querySelector('#check').checked = true
          document.querySelector('#check').value = 'on'
          document.querySelector('#next-btn').disabled = false
        })

        await page.waitForTimeout(500)

        const selector = await page.$('#next-btn')
        await selector.click({ clickCount: 1 })
        clickResult = await page.evaluate(() => {
          if (document.getElementById('caution').innerHTML.match('入力値が間違いました。') !== null) {
            return document.getElementById('caution').innerHTML.match('入力値が間違いました。')[0]
          }
          return null
        })
      }
      // '入力値が間違いました。'があること
      expect(clickResult).toBe('入力値が間違いました。')
    })

    // パスワード確認不正な値
    test('/tenant/registerにアクセス：パスワード確認不正な値', async () => {
      let clickResult
      const page = await browser.newPage()
      await page.setCookie(acCookies[0])
      await page.goto('https://localhost:3000/tenant/register')
      if (page.url() === 'https://localhost:3000/tenant/register') {
        await page.evaluate(() => {
          document.querySelector('#contractorName').value = 'テスト'
          document.querySelector('#contractorKanaName').value = 'テスト'
          document.querySelector('#postalNumber').value = '0600000'
          document.querySelector('#contractAddressVal').value = '北海道札幌市中央区'
          document.querySelector('#banch1').value = '２番'
          document.querySelector('#contactPersonName').value = '連絡先担当者名'
          document.querySelector('#contactPhoneNumber').value = '080-0000-0000'
          document.querySelector('#contactMail').value = 'test@test.co.jp'
          document.querySelector('#password').value = 'Abcd1234'
          document.querySelector('#passwordConfirm').value = '1234'
          document.querySelector('#passwordConfirm').setAttribute('aria-invalid', 'true')
          document.querySelector('#check').disabled = false
          document.querySelector('#check').checked = true
          document.querySelector('#check').value = 'on'
          document.querySelector('#next-btn').disabled = false
        })

        await page.waitForTimeout(500)

        const selector = await page.$('#next-btn')
        await selector.click({ clickCount: 1 })
        clickResult = await page.evaluate(() => {
          if (document.getElementById('caution').innerHTML.match('入力値が間違いました。') !== null) {
            return document.getElementById('caution').innerHTML.match('入力値が間違いました。')[0]
          }
          return null
        })
      }
      // '入力値が間違いました。'があること
      expect(clickResult).toBe('入力値が間違いました。')
    })

    // 正常にテナントが登録され、ポータルにリダイレクトされる
    test('/tenant/registerにPOST：303ステータスと/portalにリダイレクト(アカウント管理者とテナント登録成功)', async () => {
      const res = await request(app)
        .post('/tenant/register')
        .type('form')
        .send({ _csrf: tenantCsrf, termsCheck: 'on' })
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(303)

      expect(res.header.location).toBe('/portal') // リダイレクト先は/portal
    })

    test('/tenant/registerにアクセス：ステータス「新規申込」、400ステータスとエラーメッセージ', async () => {
      const res = await request(app)
        .get('/tenant/register')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(400)

      expect(res.text).toMatch(/不正なページからアクセスされたか、セッションタイムアウトが発生しました。/i) // タイトル
    })

    test('/tenant/registerにPOST：ステータス「新規申込」、新規登録、400ステータスとエラーメッセージ', async () => {
      const res = await request(app)
        .post('/tenant/register')
        .type('form')
        .send({ ...contractData, _csrf: tenantCsrf, termsCheck: 'on' })
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(400)

      expect(res.text).toMatch(/不正なページからアクセスされたか、セッションタイムアウトが発生しました。/i) // タイトル
    })

    // テナントステータスが「新規申込」、請求書一括アップロードページ利用できる
    test('/csvuploadにGET：利用できる', async () => {
      const res = await request(app)
        .get('/csvupload')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(200)

      expect(res.text).toMatch(/ - BConnectionデジタルトレード/i) // タイトル
      expect(res.text).toMatch(/請求書一括作成/i) // タイトル
      expect(res.text).toMatch(/ファイルを選択してください/i) // タイトル
      expect(res.text).toMatch(/取込結果一覧 →/i) // タイトル
    })

    // テナントステータスが「新規申込」、請求書一括アップロードページ利用できる
    test('/csvuploadにPOST：利用できる', async () => {
      const res = await request(app)
        .post('/csvupload')
        .set('Content-Type', 'application/json')
        .send({ ...csvData })
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(200)

      switch (res.text) {
        case 'OK':
          expect(res.text).toMatch('OK')
          break
        case '重複の請求書番号があります。':
          expect(res.text).toMatch('重複の請求書番号があります。')
          break
      }
    })

    // テナントステータスが「新規申込」、取り込み結果ページ利用できる
    test('/csvuploadResultにGET：利用できる', async () => {
      const res = await request(app)
        .get('/csvuploadResult')
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
      expect(res.text).toMatch(/← csv一括アップロード/i) // CSV一括アップロードに戻るリンク
    })

    // テナントステータスが「新規申込」、変更ページ利用できない
    test('/changeにGET：制御による新規申込中エラー', async () => {
      const res = await request(app)
        .get('/change')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(200)

      expect(res.text).toMatch(/現在利用登録手続き中です。/i)
    })

    // テナントステータスが「新規申込」、変更機能利用できない
    test('/changeにPOST：制御による新規申込中エラー', async () => {
      const res = await request(app)
        .post('/change')
        .send({ ...changeData })
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(200)

      expect(res.text).toMatch(/現在利用登録手続き中です。/i)
    })

    // テナントステータスが「新規申込」、解約ページ利用できない
    test('/cancellationにGET：制御による新規申込中エラー', async () => {
      const res = await request(app)
        .get('/cancellation')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(200)

      expect(res.text).toMatch(/現在利用登録手続き中です。/i)
    })

    // テナントステータスが「新規申込」、解約機能利用できない
    test('/cancellationにPOST：制御による新規申込中エラー', async () => {
      const res = await request(app)
        .post('/cancellation')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(200)

      expect(res.text).toMatch(/現在利用登録手続き中です。/i)
    })

    // 契約ステータスを「新規申込」から「新規受付」に変更
    test('契約ステータス変更：「新規申込」→ 「新規受付」', async () => {
      await db.Contract.update({ contractStatus: 11 }, { where: { tenantId: testTenantId } })
      await db.Contract.findOne({ where: { tenantId: testTenantId } })
    })

    // テナントステータスが「新規受付」、利用登録ページ利用できない
    test('/tenant/registerにアクセス：ステータス「新規受付」、400ステータスとエラーメッセージ', async () => {
      const res = await request(app)
        .get('/tenant/register')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(400)

      expect(res.text).toMatch(/不正なページからアクセスされたか、セッションタイムアウトが発生しました。/i) // タイトル
    })

    test('/tenant/registerにPOST：ステータス「新規受付」、新規登録、400ステータスとエラーメッセージ', async () => {
      const res = await request(app)
        .post('/tenant/register')
        .type('form')
        .send({ ...contractData, _csrf: tenantCsrf, termsCheck: 'on' })
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(400)

      expect(res.text).toMatch(/不正なページからアクセスされたか、セッションタイムアウトが発生しました。/i) // タイトル
    })

    // テナントステータスが「新規受付」、請求書一括アップロードページ利用できる
    test('/csvuploadにGET：利用できる', async () => {
      const res = await request(app)
        .get('/csvupload')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(200)

      expect(res.text).toMatch(/ - BConnectionデジタルトレード/i) // タイトル
      expect(res.text).toMatch(/請求書一括作成/i) // タイトル
      expect(res.text).toMatch(/ファイルを選択してください/i) // タイトル
      expect(res.text).toMatch(/取込結果一覧 →/i) // タイトル
    })

    // テナントステータスが「新規受付」、請求書一括アップロードページ利用できる
    test('/csvuploadにPOST：利用できる', async () => {
      const res = await request(app)
        .post('/csvupload')
        .set('Content-Type', 'application/json')
        .send({ ...csvData })
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(200)

      switch (res.text) {
        case 'OK':
          expect(res.text).toMatch('OK')
          break
        case '重複の請求書番号があります。':
          expect(res.text).toMatch('重複の請求書番号があります。')
          break
      }
    })

    // テナントステータスが「新規受付」、変更ページ利用できない
    test('/changeにGET：制御による新規申込中エラー', async () => {
      const res = await request(app)
        .get('/change')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(200)

      expect(res.text).toMatch(/現在利用登録手続き中です。/i)
    })

    // テナントステータスが「新規受付」、変更機能利用できない
    test('/changeにPOST：制御による新規申込中エラー', async () => {
      const res = await request(app)
        .post('/change')
        .send({ ...changeData })
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(200)

      expect(res.text).toMatch(/現在利用登録手続き中です。/i)
    })

    // テナントステータスが「新規受付」、解約ページ利用できない
    test('/cancellationにGET：制御による新規申込中エラー', async () => {
      const res = await request(app)
        .get('/cancellation')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(200)

      expect(res.text).toMatch(/現在利用登録手続き中です。/i)
    })

    // テナントステータスが「新規受付」、解約機能利用できない
    test('/cancellationにPOST：制御による新規申込中エラー', async () => {
      const res = await request(app)
        .post('/cancellation')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(200)

      expect(res.text).toMatch(/現在利用登録手続き中です。/i)
    })
  })

  describe('3.DBにアカウント管理者のみ登録・一般ユーザ登録なし/アカウント管理者としてリクエスト', () => {
    // DB状態:
    //   テナント：
    //    試験前：登録済
    //    試験後(期待値)：登録済
    //
    //   アカウント管理者：
    //    試験前：登録済
    //    試験後(期待値)：登録済
    //
    //   一般ユーザ：
    //    試験前：未登録
    //    試験後(期待値)：未登録

    // /authにリダイレクトする
    test('/indexにアクセス：303ステータスと/authにリダイレクト', async () => {
      const res = await request(app)
        .get('/')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(303)

      expect(res.header.location).toBe('/auth') // リダイレクト先は/auth
    })

    // (登録画面には遷移せず)正常にportalが表示される
    test('/portalにアクセス：200ステータスとportal画面表示', async () => {
      const res = await request(app)
        .get('/portal')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(200)

      expect(res.text).toMatch(/ポータル - BConnectionデジタルトレード/i) // タイトルが含まれていること
    })

    let userCsrf, tenantCsrf
    // userContextが'NotUserRegistered'ではない(登録済の)ため、アクセスできない
    test('/user/registerにアクセス：userContext不一致による400ステータスとエラーメッセージ', async () => {
      const res = await request(app)
        .get('/user/register')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(400)

      // CSRFのワンタイムトークン取得
      const dom = new JSDOM(res.text)
      userCsrf = dom.window.document.getElementsByName('_csrf')[0]?.value

      expect(res.text).toMatch(/不正なページからアクセスされたか、セッションタイムアウトが発生しました。/i) // タイトル
    })

    // 正しいCSRFトークンを取得していないため、アクセスできない
    test('/user/registerにPOST：csurfによる400ステータスとエラーメッセージ', async () => {
      const res = await request(app)
        .post('/user/register')
        .type('form')
        .send({ _csrf: userCsrf, termsCheck: 'on' })
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(400)

      expect(res.text).toMatch(/不正なページからアクセスされたか、セッションタイムアウトが発生しました。/i) // タイトル
    })

    // userContextが'NotTenantRegistered'ではない(登録済の)ため、アクセスできない
    test('/tenant/registerにアクセス：userContext不一致による400ステータスとエラーメッセージ', async () => {
      const res = await request(app)
        .get('/tenant/register')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(400)

      // CSRFのワンタイムトークン取得
      const dom = new JSDOM(res.text)
      tenantCsrf = dom.window.document.getElementsByName('_csrf')[0]?.value

      expect(res.text).toMatch(/不正なページからアクセスされたか、セッションタイムアウトが発生しました。/i) // タイトル
    })

    // 正しいCSRFトークンを取得していないため、アクセスできない
    test('/tenant/registerにPOST：csurfによる400ステータスとエラーメッセージ', async () => {
      const res = await request(app)
        .post('/tenant/register')
        .type('form')
        .send({ _csrf: tenantCsrf, termsCheck: 'on' })
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(400)

      expect(res.text).toMatch(/不正なページからアクセスされたか、セッションタイムアウトが発生しました。/i) // タイトル
    })

    // テナントステータスが「登録受付」、取り込み結果ページ利用できる
    test('/csvuploadResultにGET：利用できる', async () => {
      await db.Contract.update({ contractStatus: '11' }, { where: { tenantId: testTenantId } })
      const res = await request(app)
        .get('/csvuploadResult')
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
      expect(res.text).toMatch(/← csv一括アップロード/i) // CSV一括アップロードに戻るリンク
    })
  })

  describe('4.DBにアカウント管理者のみ登録・一般ユーザ登録なし/一般ユーザとしてリクエスト', () => {
    // DB状態:
    //   テナント：
    //    試験前：登録済
    //    試験後(期待値)：登録済
    //
    //   アカウント管理者：
    //    試験前：登録済
    //    試験後(期待値)：登録済
    //
    //   一般ユーザ：
    //    試験前：未登録
    //    試験後(期待値)：登録

    // /authにリダイレクトする
    test('/indexにアクセス：303ステータスと/authにリダイレクト', async () => {
      const res = await request(app)
        .get('/')
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
        .expect(303)

      expect(res.header.location).toBe('/auth') // リダイレクト先は/auth
    })

    // テナント登録済/ユーザ未登録のため、ユーザ登録する
    test('/portalにアクセス：ユーザ登録', async () => {
      const res = await request(app)
        .get('/portal')
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
        .expect(200)

      // CSRFのワンタイムトークン取得
      const dom = new JSDOM(res.text)
      userCsrf = dom.window.document.getElementsByName('_csrf')[0]?.value

      expect(res.text).toMatch(/ポータル - BConnectionデジタルトレード/i) // タイトル
    })

    let userCsrf, tenantCsrf
    // ユーザの利用登録画面が表示されない
    test('/user/registerにアクセス：400ステータスとエラーメッセージ', async () => {
      const res = await request(app)
        .get('/user/register')
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
        .expect(400)

      // CSRFのワンタイムトークン取得
      const dom = new JSDOM(res.text)
      userCsrf = dom.window.document.getElementsByName('_csrf')[0]?.value

      expect(res.text).toMatch(/不正なページからアクセスされたか、セッションタイムアウトが発生しました。/i) // タイトル
    })

    // 一般ユーザが登録されない、アクセスできない
    test('/user/registerにPOST：400ステータスとエラーメッセージ', async () => {
      const res = await request(app)
        .post('/user/register')
        .type('form')
        .send({ _csrf: userCsrf, termsCheck: 'on' })
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
        .expect(400)

      expect(res.text).toMatch(/不正なページからアクセスされたか、セッションタイムアウトが発生しました。/i) // タイトル
    })

    // userContextが'NotTenantRegistered'ではない(登録済の)ため、アクセスできない
    test('/tenant/registerにアクセス：userContext不一致による400ステータスとエラーメッセージ', async () => {
      const res = await request(app)
        .get('/tenant/register')
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
        .expect(400)

      // CSRFのワンタイムトークン取得
      const dom = new JSDOM(res.text)
      tenantCsrf = dom.window.document.getElementsByName('_csrf')[0]?.value

      expect(res.text).toMatch(/不正なページからアクセスされたか、セッションタイムアウトが発生しました。/i) // タイトル
    })

    // 正しいCSRFトークンを取得していないため、アクセスできない
    test('/tenant/registerにPOST：csurfによる400ステータスとエラーメッセージ', async () => {
      const res = await request(app)
        .post('/tenant/register')
        .type('form')
        .send({ _csrf: tenantCsrf, termsCheck: 'on' })
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
        .expect(400)

      expect(res.text).toMatch(/不正なページからアクセスされたか、セッションタイムアウトが発生しました。/i) // タイトル
    })

    // テナントステータスが「登録受付」、取り込み結果ページ利用できる
    test('/csvuploadResultにGET：利用できる', async () => {
      await db.Contract.update({ contractStatus: '11' }, { where: { tenantId: testTenantId } })
      const res = await request(app)
        .get('/csvuploadResult')
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
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
      expect(res.text).toMatch(/← csv一括アップロード/i) // CSV一括アップロードに戻るリンク
    })
  })

  describe('5.DBにアカウント管理者・一般ユーザ共に登録済/アカウント管理者としてリクエスト', () => {
    // DB状態:
    //   テナント：
    //    試験前：登録済
    //    試験後(期待値)：登録済
    //
    //   アカウント管理者：
    //    試験前：登録済
    //    試験後(期待値)：登録済
    //
    //   一般ユーザ：
    //    試験前：登録済
    //    試験後(期待値)：登録済

    // /authにリダイレクトする
    test('/indexにアクセス：303ステータスと/authにリダイレクト', async () => {
      const res = await request(app)
        .get('/')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(303)

      expect(res.header.location).toBe('/auth') // リダイレクト先は/auth
    })

    // (登録画面に遷移せず)正常にportal画面が表示される
    test('/portalにアクセス：200ステータスとportal画面表示', async () => {
      const res = await request(app)
        .get('/portal')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(200)

      expect(res.text).toMatch(/ポータル - BConnectionデジタルトレード/i) // タイトルが含まれていること
    })

    // (登録画面に遷移せず)正常にお知らせ画面が表示される
    test('管理者、/portalにアクセス：お知らせ画面が表示されること', async () => {
      const res = await request(app)
        .get('/portal')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(200)

      expect(res.text).toMatch(/お知らせ/i) // タイトルが含まれていること
    })

    // (登録画面に遷移せず)正常にお知らせ画面が表示される
    test('一般ユーザ、、/portalにアクセス：お知らせ画面が表示されること', async () => {
      const res = await request(app)
        .get('/portal')
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
        .expect(200)

      expect(res.text).toMatch(/お知らせ/i) // タイトルが含まれていること
    })

    test('管理者、/portalにアクセス：もっと見るボタンのリンク確認', async () => {
      let hrefResult
      const page = await browser.newPage()
      await page.setCookie(acCookies[0])
      await page.goto('https://localhost:3000/portal')
      page.waitForNavigation()
      if (page.url() === 'https://localhost:3000/portal') {
        hrefResult = await page.evaluate(() => {
          if (document.querySelector('#informationTab > div > a').href !== null) {
            return document.querySelector('#informationTab > div > a').href
          }
          return null
        })
      }

      expect(hrefResult).toBe('https://support.ntt.com/mail/information/search?parentGoodsCode=512')
    })

    test('一般ユーザ、/portalにアクセス：もっと見るボタンのリンク確認', async () => {
      let hrefResult
      const page = await browser.newPage()
      await page.setCookie(userCookies[0])
      await page.goto('https://localhost:3000/portal')
      page.waitForNavigation()
      if (page.url() === 'https://localhost:3000/portal') {
        hrefResult = await page.evaluate(() => {
          if (document.querySelector('#informationTab > div > a').href !== null) {
            return document.querySelector('#informationTab > div > a').href
          }
          return null
        })
      }

      expect(hrefResult).toBe('https://support.ntt.com/mail/information/search?parentGoodsCode=512')
    })

    test('管理者, お知らせ-工事情報表示及び「もっと見る」ボタンで遷移', async () => {
      const res = await request(app)
        .get('/portal')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(200)
      expect(res.text).toMatch(/ポータル - BConnectionデジタルトレード/i) // タイトルが含まれていること

      const httpsUrl = 'https://localhost:3000'
      const sitePath = `${httpsUrl}${res.req.path}`
      const puppeteer = require('puppeteer')
      const browser = await puppeteer.launch({
        ignoreHTTPSErrors: true
      })
      const page = await browser.newPage()
      await page.setCookie(acCookies[0])
      await page.goto(`${sitePath}`, {
        waitUntil: 'networkidle0'
      })
      if (page.url() === `${sitePath}`) {
        await page.click('#constructTab')
        await page.waitForTimeout(500)

        const constructInformation = await page.evaluate(() => {
          return document
            .querySelector(
              'body > div.container.is-max-widescreen > columns > div > div > div > div.tabs.is-centered.is-boxed.is-medium > ul > li:nth-child(2)'
            )
            .getAttribute('class')
        })
        expect(constructInformation).toBe('is-active')

        const consturctRssUrl = 'https://support.ntt.com/informationRss/goods/rss/mail'
        const checkedPage = await browser.newPage()
        await checkedPage.goto(`${consturctRssUrl}`, {
          waitUntil: 'networkidle0'
        })
        const constructUrlRss = await checkedPage.evaluate(() => {
          const date1 = new Date(document.body.children[0].children[1].children[2].innerText)
          const date2 = new Date(document.body.children[0].children[2].children[2].innerText)
          const date3 = new Date(document.body.children[0].children[3].children[2].innerText)
          const doc = [
            {
              title: document.body.children[0].children[1].children[0].innerText,
              link: document.body.children[0].children[1].innerText
                .replace(/\d{4}-\d{1,2}-\d{1,2}T\d{2}:\d{2}:\d{2}Z/, '')
                .trim(),
              date: `${date1.getFullYear()}年${date1.getMonth() + 1}月${date1.getDate()}日`
            },
            {
              title: document.body.children[0].children[2].children[0].innerText,
              link: document.body.children[0].children[2].innerText
                .replace(/\d{4}-\d{1,2}-\d{1,2}T\d{2}:\d{2}:\d{2}Z/, '')
                .trim(),
              date: `${date2.getFullYear()}年${date2.getMonth() + 1}月${date2.getDate()}日`
            },
            {
              title: document.body.children[0].children[3].children[0].innerText,
              link: document.body.children[0].children[3].innerText
                .replace(/\d{4}-\d{1,2}-\d{1,2}T\d{2}:\d{2}:\d{2}Z/, '')
                .trim(),
              date: `${date3.getFullYear()}年${date3.getMonth() + 1}月${date3.getDate()}日`
            }
          ]
          return doc
        })

        const constructRss = await page.evaluate(() => {
          return [
            {
              title: document.querySelector('#constructTab > table > tbody > tr:nth-child(1) > td.newsTitle > a')
                .innerText,
              link: document.querySelector('#constructTab > table > tbody > tr:nth-child(1) > td.newsTitle > a').href,
              date: document.querySelector('#constructTab > table > tbody > tr:nth-child(1) > td.newsDate').innerText
            },
            {
              title: document.querySelector('#constructTab > table > tbody > tr:nth-child(2) > td.newsTitle > a')
                .innerText,
              link: document.querySelector('#constructTab > table > tbody > tr:nth-child(2) > td.newsTitle > a').href,
              date: document.querySelector('#constructTab > table > tbody > tr:nth-child(2) > td.newsDate').innerText
            },
            {
              title: document.querySelector('#constructTab > table > tbody > tr:nth-child(3) > td.newsTitle > a')
                .innerText,
              link: document.querySelector('#constructTab > table > tbody > tr:nth-child(3) > td.newsTitle > a').href,
              date: document.querySelector('#constructTab > table > tbody > tr:nth-child(3) > td.newsDate').innerText
            }
          ]
        })

        await checkedPage.close()

        let idx = 0
        constructRss.forEach((item) => {
          expect(item.title).toBe(constructUrlRss[idx].title)
          expect(item.link).toBe(constructUrlRss[idx].link)
          expect(item.date).toBe(constructUrlRss[idx].date)
          idx++
        })

        const constructUrl = await page.evaluate(() => {
          return document.querySelector('#constructTab > div > a').href
        })
        page.click('#constructTab > div > a')
        await page.waitForTimeout(500)
        const pages = await browser.pages()
        const newTapPage = pages[pages.length - 1]
        expect(newTapPage.url()).toBe(constructUrl)
        await browser.close()
      }
    })

    test('一般ユーザ, お知らせ-工事情報表示及び「もっと見る」ボタンで遷移', async () => {
      const res = await request(app)
        .get('/portal')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(200)
      expect(res.text).toMatch(/ポータル - BConnectionデジタルトレード/i) // タイトルが含まれていること

      const httpsUrl = 'https://localhost:3000'
      const sitePath = `${httpsUrl}${res.req.path}`
      const puppeteer = require('puppeteer')
      const browser = await puppeteer.launch({
        ignoreHTTPSErrors: true
      })
      const page = await browser.newPage()
      await page.setCookie(userCookies[0])
      await page.goto(`${sitePath}`, {
        waitUntil: 'networkidle0'
      })
      if (page.url() === `${sitePath}`) {
        await page.click('#constructTab')
        await page.waitForTimeout(500)

        const constructInformation = await page.evaluate(() => {
          return document
            .querySelector(
              'body > div.container.is-max-widescreen > columns > div > div > div > div.tabs.is-centered.is-boxed.is-medium > ul > li:nth-child(2)'
            )
            .getAttribute('class')
        })
        expect(constructInformation).toBe('is-active')

        const consturctRssUrl = 'https://support.ntt.com/informationRss/goods/rss/mail'
        const checkedPage = await browser.newPage()
        await checkedPage.goto(`${consturctRssUrl}`, {
          waitUntil: 'networkidle0'
        })
        const constructUrlRss = await checkedPage.evaluate(() => {
          const date1 = new Date(document.body.children[0].children[1].children[2].innerText)
          const date2 = new Date(document.body.children[0].children[2].children[2].innerText)
          const date3 = new Date(document.body.children[0].children[3].children[2].innerText)
          const doc = [
            {
              title: document.body.children[0].children[1].children[0].innerText,
              link: document.body.children[0].children[1].innerText
                .replace(/\d{4}-\d{1,2}-\d{1,2}T\d{2}:\d{2}:\d{2}Z/, '')
                .trim(),
              date: `${date1.getFullYear()}年${date1.getMonth() + 1}月${date1.getDate()}日`
            },
            {
              title: document.body.children[0].children[2].children[0].innerText,
              link: document.body.children[0].children[2].innerText
                .replace(/\d{4}-\d{1,2}-\d{1,2}T\d{2}:\d{2}:\d{2}Z/, '')
                .trim(),
              date: `${date2.getFullYear()}年${date2.getMonth() + 1}月${date2.getDate()}日`
            },
            {
              title: document.body.children[0].children[3].children[0].innerText,
              link: document.body.children[0].children[3].innerText
                .replace(/\d{4}-\d{1,2}-\d{1,2}T\d{2}:\d{2}:\d{2}Z/, '')
                .trim(),
              date: `${date3.getFullYear()}年${date3.getMonth() + 1}月${date3.getDate()}日`
            }
          ]
          return doc
        })

        const constructRss = await page.evaluate(() => {
          return [
            {
              title: document.querySelector('#constructTab > table > tbody > tr:nth-child(1) > td.newsTitle > a')
                .innerText,
              link: document.querySelector('#constructTab > table > tbody > tr:nth-child(1) > td.newsTitle > a').href,
              date: document.querySelector('#constructTab > table > tbody > tr:nth-child(1) > td.newsDate').innerText
            },
            {
              title: document.querySelector('#constructTab > table > tbody > tr:nth-child(2) > td.newsTitle > a')
                .innerText,
              link: document.querySelector('#constructTab > table > tbody > tr:nth-child(2) > td.newsTitle > a').href,
              date: document.querySelector('#constructTab > table > tbody > tr:nth-child(2) > td.newsDate').innerText
            },
            {
              title: document.querySelector('#constructTab > table > tbody > tr:nth-child(3) > td.newsTitle > a')
                .innerText,
              link: document.querySelector('#constructTab > table > tbody > tr:nth-child(3) > td.newsTitle > a').href,
              date: document.querySelector('#constructTab > table > tbody > tr:nth-child(3) > td.newsDate').innerText
            }
          ]
        })

        await checkedPage.close()

        let idx = 0
        constructRss.forEach((item) => {
          expect(item.title).toBe(constructUrlRss[idx].title)
          expect(item.link).toBe(constructUrlRss[idx].link)
          expect(item.date).toBe(constructUrlRss[idx].date)
          idx++
        })

        const constructUrl = await page.evaluate(() => {
          return document.querySelector('#constructTab > div > a').href
        })
        page.click('#constructTab > div > a')
        await page.waitForTimeout(500)
        const pages = await browser.pages()
        const newTapPage = pages[pages.length - 1]
        expect(newTapPage.url()).toBe(constructUrl)
        await browser.close()
      }
    })

    let userCsrf, tenantCsrf
    // userContextが'NotUserRegistered'ではない(登録済の)ため、アクセスできない
    test('/user/registerにアクセス：userContext不一致による400ステータスとエラーメッセージ', async () => {
      const res = await request(app)
        .get('/user/register')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(400)

      // CSRFのワンタイムトークン取得
      const dom = new JSDOM(res.text)
      userCsrf = dom.window.document.getElementsByName('_csrf')[0]?.value

      expect(res.text).toMatch(/不正なページからアクセスされたか、セッションタイムアウトが発生しました。/i) // タイトル
    })

    // 正しいCSRFトークンを取得していないため、アクセスできない
    test('/user/registerにPOST：csurfによる400ステータスとエラーメッセージ', async () => {
      const res = await request(app)
        .post('/user/register')
        .type('form')
        .send({ _csrf: userCsrf, termsCheck: 'on' })
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(400)

      expect(res.text).toMatch(/不正なページからアクセスされたか、セッションタイムアウトが発生しました。/i) // タイトル
    })

    // userContextが'NotTenantRegistered'ではない(登録済の)ため、アクセスできない
    test('/tenant/registerにアクセス：userContext不一致による400ステータスとエラーメッセージ', async () => {
      const res = await request(app)
        .get('/tenant/register')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(400)

      // CSRFのワンタイムトークン取得
      const dom = new JSDOM(res.text)
      tenantCsrf = dom.window.document.getElementsByName('_csrf')[0]?.value

      expect(res.text).toMatch(/不正なページからアクセスされたか、セッションタイムアウトが発生しました。/i) // タイトル
    })

    // 正しいCSRFトークンを取得していないため、アクセスできない
    test('/tenant/registerにPOST：csurfによる400ステータスとエラーメッセージ', async () => {
      const res = await request(app)
        .post('/tenant/register')
        .type('form')
        .send({ _csrf: tenantCsrf, termsCheck: 'on' })
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(400)

      expect(res.text).toMatch(/不正なページからアクセスされたか、セッションタイムアウトが発生しました。/i) // タイトル
    })

    // 正常にportal画面が表示された後csvuploadページに遷移する。
    test('/csvuploadにGET：正常にportal画面が表示された後csvuploadページに遷移する', async () => {
      const res = await request(app)
        .get('/csvupload')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(200)

      expect(res.text).toMatch(/ - BConnectionデジタルトレード/i) // タイトルが含まれていること
    })

    // 契約者情報変更
    test('管理者、契約ステータス：10, /change', async () => {
      const res = await request(app)
        .get('/change')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(200)

      expect(res.text).toMatch(/現在利用登録手続き中です。/i) // 画面内容
    })

    test('一般ユーザ、契約ステータス：10, /change', async () => {
      const res = await request(app)
        .get('/change')
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
        .expect(200)

      expect(res.text).toMatch(/本機能はご利用いただけません。/i) // 画面内容
    })

    test('管理者、契約ステータス：11, /change', async () => {
      // 契約ステータス変更(受け取り完了)
      await db.Contract.update({ contractStatus: '11' }, { where: { tenantId: testTenantId } })
      const res = await request(app)
        .get('/change')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(200)

      expect(res.text).toMatch(/現在利用登録手続き中です。/i) // 画面内容
    })

    test('一般ユーザ、契約ステータス：11, /change', async () => {
      const res = await request(app)
        .get('/change')
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
        .expect(200)

      expect(res.text).toMatch(/本機能はご利用いただけません。/i) // 画面内容
    })

    test('管理者、契約ステータス：40, /change', async () => {
      await db.Contract.update({ contractStatus: '40' }, { where: { tenantId: testTenantId } })
      const res = await request(app)
        .get('/change')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(200)

      expect(res.text).toMatch(/現在契約情報変更手続き中です。/i) // 画面内容
    })

    test('一般ユーザ、契約ステータス：40, /change', async () => {
      const res = await request(app)
        .get('/change')
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
        .expect(200)

      expect(res.text).toMatch(/本機能はご利用いただけません。/i) // 画面内容
    })

    test('管理者、契約ステータス：41, /change', async () => {
      // 契約ステータス変更(受け取り完了)
      await db.Contract.update({ contractStatus: '41' }, { where: { tenantId: testTenantId } })
      const res = await request(app)
        .get('/change')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(200)

      expect(res.text).toMatch(/現在契約情報変更手続き中です。/i) // 画面内容
    })

    test('一般ユーザ、契約ステータス：41, /change', async () => {
      const res = await request(app)
        .get('/change')
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
        .expect(200)

      expect(res.text).toMatch(/本機能はご利用いただけません。/i) // 画面内容
    })

    test('管理者、契約ステータス：00, /change', async () => {
      // 契約ステータス変更(利用登録済み)
      await db.Contract.update({ contractStatus: '00' }, { where: { tenantId: testTenantId } })
      const res = await request(app)
        .get('/change')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(200)

      expect(res.text).toMatch(/契約情報変更/i)
      expect(res.text).toMatch(/契約者名変更/i)
      expect(res.text).toMatch(/契約者住所変更/i)
      expect(res.text).toMatch(/契約者連絡先変更/i)
    })

    test('一般ユーザ、契約ステータス：00、 /change', async () => {
      // 契約ステータス変更(利用登録済み)
      const res = await request(app)
        .get('/change')
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
        .expect(200)

      expect(res.text).toMatch(/本機能はご利用いただけません。/i) // 画面内容
    })

    test('管理者、契約ステータス：00, 契約名変更, /change', async () => {
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

    test('管理者、契約ステータス：00, 住所変更, /change', async () => {
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

    test('管理者、契約ステータス：00, 連絡先, /change', async () => {
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

    test('管理者、契約ステータス：00, 契約名・住所変更, /change', async () => {
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

    test('管理者、契約ステータス：00, 契約名・連絡先, /change', async () => {
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

    test('管理者、契約ステータス：00, 住所変更・連絡先, /change', async () => {
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

    test('管理者、契約ステータス：00, 契約名・住所変更・連絡先, /change', async () => {
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
    test('管理者、契約ステータス：00, 契約者名未入力', async () => {
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
    })

    // 契約者名不正な値
    test('管理者、契約ステータス：00, 契約者名不正な値', async () => {
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
    })

    // 契約者カナ名未入力
    test('管理者、契約ステータス：00, 契約者カナ名未入力', async () => {
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
    })

    // 契約者カナ名不正な値
    test('管理者、契約ステータス：00, 契約者カナ名不正な値', async () => {
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
    })

    // 郵便番号未入力
    test('管理者、契約ステータス：00, 郵便番号未入力', async () => {
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
    })

    // 郵便番号不正な値
    test('管理者、契約ステータス：00, 郵便番号不正な値', async () => {
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
    })

    // 住所の検索結果未入力
    test('管理者、契約ステータス：00, 住所の検索結果未入力', async () => {
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
    })

    // 番地未入力
    test('管理者、契約ステータス：00, 番地未入力', async () => {
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
    })

    // 番地不正な値
    test('管理者、契約ステータス：00, 番地不正な値', async () => {
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
    })

    // 連絡先担当者名未入力
    test('管理者、契約ステータス：00, 連絡先担当者名未入力', async () => {
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
    })

    // 連絡先担当者名不正な値
    test('管理者、契約ステータス：00, 連絡先担当者名不正な値', async () => {
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
    })

    // 連絡先電話番号未入力
    test('管理者、契約ステータス：00, 連絡先電話番号未入力', async () => {
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
        await page.type('#contactPersonName', '連絡先')
        await page.type('#contactMail', 'test@test.co.jp')

        await page.waitForTimeout(500)

        await page.click('#next-btn')
        const checkErrorMessage = await page.evaluate(() => {
          return document.querySelector('#contactPhoneNumberNoInput').getAttribute('class')
        })
        expect(checkErrorMessage).toBe('input-label-required')
      }
    })

    // 連絡先電話番号不正な値
    test('管理者、契約ステータス：00, 連絡先電話番号不正な値', async () => {
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
        await page.type('#contactPersonName', '連絡先')
        await page.type('#contactPhoneNumber', '08000000000')
        await page.type('#contactMail', 'test@test.co.jp')

        await page.waitForTimeout(500)

        await page.click('#next-btn')
        const checkErrorMessage = await page.evaluate(() => {
          return document.querySelector('#contactPhoneNumberWorngInput').getAttribute('class')
        })
        expect(checkErrorMessage).toBe('input-label-required')
      }
    })

    // 連絡先メールアドレス未入力
    test('管理者、契約ステータス：00, 連絡先メールアドレス未入力', async () => {
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
        await page.type('#contactPersonName', '連絡先')
        await page.type('#contactPhoneNumber', '08000000000')

        await page.waitForTimeout(500)

        await page.click('#next-btn')
        const checkErrorMessage = await page.evaluate(() => {
          return document.querySelector('#contactMailNoInput').getAttribute('class')
        })
        expect(checkErrorMessage).toBe('input-label-required')
      }
    })

    // 連絡先メールアドレス不正な値
    test('管理者、契約ステータス：00, 連絡先メールアドレス不正な値', async () => {
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
        await page.type('#contactPersonName', '連絡先')
        await page.type('#contactPhoneNumber', '08000000000')
        await page.type('#contactMail', 'testtest')

        await page.waitForTimeout(500)

        await page.click('#next-btn')
        const checkErrorMessage = await page.evaluate(() => {
          return document.querySelector('#contactMailWorongInput').getAttribute('class')
        })
        expect(checkErrorMessage).toBe('input-label-required')
      }
    })

    test('管理者、契約ステータス：30, /change', async () => {
      await db.Contract.update({ contractStatus: '30' }, { where: { tenantId: testTenantId } })
      const res = await request(app)
        .get('/change')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(200)

      expect(res.text).toMatch(/現在解約手続き中です。/i) // 画面内容
    })

    test('一般ユーザ、契約ステータス：30, /change', async () => {
      // 契約ステータス変更(利用登録済み)
      const res = await request(app)
        .get('/change')
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
        .expect(200)

      expect(res.text).toMatch(/現在解約手続き中です。/i) // 画面内容
    })

    test('管理者、契約ステータス：31, /change', async () => {
      await db.Contract.update({ contractStatus: '31' }, { where: { tenantId: testTenantId } })
      const res = await request(app)
        .get('/change')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(200)

      expect(res.text).toMatch(/現在解約手続き中です。/i) // 画面内容
    })

    test('一般ユーザ、契約ステータス：31, /change', async () => {
      // 契約ステータス変更(利用登録済み)
      const res = await request(app)
        .get('/change')
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
        .expect(200)

      expect(res.text).toMatch(/現在解約手続き中です。/i) // 画面内容
    })

    test('管理者、契約ステータス：99, /change', async () => {
      // 契約ステータス変更(利用登録済み)
      await db.Contract.update({ contractStatus: '99', deleteFlag: 'true' }, { where: { tenantId: testTenantId } })
      const res = await request(app)
        .get('/change')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(400)

      expect(res.text).toMatch(/不正なページからアクセスされたか、セッションタイムアウトが発生しました。/i)
    })

    test('一般ユーザ、契約ステータス：99, /change', async () => {
      // 契約ステータス変更(利用登録済み)
      await db.Contract.update({ contractStatus: '99' }, { where: { tenantId: testTenantId } })
      const res = await request(app)
        .get('/change')
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
        .expect(400)

      expect(res.text).toMatch(/不正なページからアクセスされたか、セッションタイムアウトが発生しました。/i)
    })

    test('管理者、契約ステータス：10, /cancellation', async () => {
      await db.Contract.update({ contractStatus: '10', deleteFlag: 'false' }, { where: { tenantId: testTenantId } })
      const res = await request(app)
        .get('/cancellation')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(200)

      expect(res.text).toMatch(/現在利用登録手続き中です。/i) // 画面内容
    })

    test('一般ユーザ、契約ステータス：10, /cancellation', async () => {
      const res = await request(app)
        .get('/cancellation')
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
        .expect(200)

      expect(res.text).toMatch(/本機能はご利用いただけません。/i)
    })

    test('管理者、契約ステータス：11, /cancellation', async () => {
      // 契約ステータス変更(受け取り完了)
      await db.Contract.update({ contractStatus: '11' }, { where: { tenantId: testTenantId } })
      const res = await request(app)
        .get('/cancellation')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(200)

      expect(res.text).toMatch(/現在利用登録手続き中です。/i) // 画面内容
    })

    test('一般ユーザ、契約ステータス：11, /cancellation', async () => {
      const res = await request(app)
        .get('/cancellation')
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
        .expect(200)

      expect(res.text).toMatch(/本機能はご利用いただけません。/i)
    })

    test('管理者、契約ステータス：40, /cancellation', async () => {
      await db.Contract.update({ contractStatus: '40' }, { where: { tenantId: testTenantId } })
      const res = await request(app)
        .get('/cancellation')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(200)

      expect(res.text).toMatch(/現在契約情報変更手続き中です。/i) // 画面内容
    })

    test('管理者、契約ステータス：41, /cancellation', async () => {
      // 契約ステータス変更(受け取り完了)
      await db.Contract.update({ contractStatus: '41' }, { where: { tenantId: testTenantId } })
      const res = await request(app)
        .get('/cancellation')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(200)

      expect(res.text).toMatch(/現在契約情報変更手続き中です。/i) // 画面内容
    })

    test('一般ユーザ、契約ステータス：40, /cancellation', async () => {
      await db.Contract.update({ contractStatus: '40' }, { where: { tenantId: testTenantId } })
      const res = await request(app)
        .get('/cancellation')
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
        .expect(200)

      expect(res.text).toMatch(/本機能はご利用いただけません。/i)
    })

    test('一般ユーザ、契約ステータス：41, /cancellation', async () => {
      await db.Contract.update({ contractStatus: '41' }, { where: { tenantId: testTenantId } })
      const res = await request(app)
        .get('/cancellation')
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
        .expect(200)

      expect(res.text).toMatch(/本機能はご利用いただけません。/i)
    })

    test('管理者、契約ステータス：00, /cancellation', async () => {
      // 契約ステータス変更(利用登録済み)
      await db.Contract.update({ contractStatus: '00' }, { where: { tenantId: testTenantId } })
      const res = await request(app)
        .get('/cancellation')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(200)

      expect(res.text).toMatch(/解約/i)
      expect(res.text).toMatch(/解約する前に以下の内容をご確認ください。/i)
    })

    test('一般ユーザ、契約ステータス：00, /cancellation', async () => {
      // 契約ステータス変更(利用登録済み)
      const res = await request(app)
        .get('/cancellation')
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
        .expect(200)

      expect(res.text).toMatch(/本機能はご利用いただけません。/i)
    })

    test('管理者、契約ステータス：30, /cancellation', async () => {
      await db.Contract.update({ contractStatus: '30' }, { where: { tenantId: testTenantId } })
      const res = await request(app)
        .get('/cancellation')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(200)

      expect(res.text).toMatch(/現在解約手続き中です。/i) // 画面内容
    })

    test('一般ユーザ、契約ステータス：30, /cancellation', async () => {
      const res = await request(app)
        .get('/cancellation')
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
        .expect(200)

      expect(res.text).toMatch(/現在解約手続き中です。/i)
    })

    test('管理者、契約ステータス：31, /cancellation', async () => {
      await db.Contract.update({ contractStatus: '31' }, { where: { tenantId: testTenantId } })
      const res = await request(app)
        .get('/cancellation')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(200)

      expect(res.text).toMatch(/現在解約手続き中です。/i) // 画面内容
    })

    test('一般ユーザ、契約ステータス：31, /cancellation', async () => {
      const res = await request(app)
        .get('/cancellation')
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
        .expect(200)

      expect(res.text).toMatch(/現在解約手続き中です。/i)
    })

    test('管理者、契約ステータス：99, /cancellation', async () => {
      // 契約ステータス変更(利用登録済み)
      await db.Contract.update({ contractStatus: '99', deleteFlag: 'true' }, { where: { tenantId: testTenantId } })
      const res = await request(app)
        .get('/cancellation')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(400)

      expect(res.text).toMatch(/不正なページからアクセスされたか、セッションタイムアウトが発生しました。/i)
    })

    test('一般ユーザ、契約ステータス：99, /cancellation', async () => {
      // 契約ステータス変更(利用登録済み)
      await db.Contract.update({ contractStatus: '99' }, { where: { tenantId: testTenantId } })
      const res = await request(app)
        .get('/cancellation')
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
        .expect(400)

      expect(res.text).toMatch(/不正なページからアクセスされたか、セッションタイムアウトが発生しました。/i)
    })

    test('管理者、契約ステータス：10, /csvupload', async () => {
      await db.Contract.update({ contractStatus: '10', deleteFlag: 'false' }, { where: { tenantId: testTenantId } })
      const res = await request(app)
        .get('/csvupload')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(200)

      expect(res.text).toMatch(/請求書一括作成/i)
      expect(res.text).toMatch(/csv upload/i)
    })

    test('管理者、契約ステータス：11, /csvupload', async () => {
      // 契約ステータス変更(受け取り完了)
      await db.Contract.update({ contractStatus: '11' }, { where: { tenantId: testTenantId } })
      const res = await request(app)
        .get('/csvupload')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(200)

      expect(res.text).toMatch(/請求書一括作成/i)
      expect(res.text).toMatch(/csv upload/i)
    })

    test('一般ユーザ、契約ステータス：10, /csvupload', async () => {
      await db.Contract.update({ contractStatus: '10' }, { where: { tenantId: testTenantId } })
      const res = await request(app)
        .get('/csvupload')
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
        .expect(200)

      expect(res.text).toMatch(/請求書一括作成/i)
      expect(res.text).toMatch(/csv upload/i)
    })

    test('一般ユーザ、契約ステータス：11, /csvupload', async () => {
      await db.Contract.update({ contractStatus: '11' }, { where: { tenantId: testTenantId } })
      const res = await request(app)
        .get('/csvupload')
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
        .expect(200)

      expect(res.text).toMatch(/請求書一括作成/i)
      expect(res.text).toMatch(/csv upload/i)
    })

    test('管理者、契約ステータス：40, /csvupload', async () => {
      await db.Contract.update({ contractStatus: '40' }, { where: { tenantId: testTenantId } })
      const res = await request(app)
        .get('/csvupload')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(200)

      expect(res.text).toMatch(/請求書一括作成/i)
      expect(res.text).toMatch(/csv upload/i)
    })

    test('管理者、契約ステータス：40, /csvuploadResult', async () => {
      const res = await request(app)
        .get('/csvuploadResult')
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
      expect(res.text).toMatch(/← csv一括アップロード/i) // CSV一括アップロードに戻るリンク
    })

    test('一般ユーザ、契約ステータス：40, /csvupload', async () => {
      await db.Contract.update({ contractStatus: '40' }, { where: { tenantId: testTenantId } })
      const res = await request(app)
        .get('/csvupload')
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
        .expect(200)

      expect(res.text).toMatch(/請求書一括作成/i)
      expect(res.text).toMatch(/csv upload/i)
    })

    test('一般ユーザ、契約ステータス：40, /csvuploadResult', async () => {
      const res = await request(app)
        .get('/csvuploadResult')
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
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
      expect(res.text).toMatch(/← csv一括アップロード/i) // CSV一括アップロードに戻るリンク
    })

    test('管理者、契約ステータス：41, /csvupload', async () => {
      // 契約ステータス変更(受け取り完了)
      await db.Contract.update({ contractStatus: '41' }, { where: { tenantId: testTenantId } })
      const res = await request(app)
        .get('/csvupload')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(200)

      expect(res.text).toMatch(/請求書一括作成/i)
      expect(res.text).toMatch(/csv upload/i)
    })

    test('管理者、契約ステータス：41, /csvuploadResult', async () => {
      const res = await request(app)
        .get('/csvuploadResult')
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
      expect(res.text).toMatch(/← csv一括アップロード/i) // CSV一括アップロードに戻るリンク
    })

    test('一般ユーザ、契約ステータス：41, /csvupload', async () => {
      await db.Contract.update({ contractStatus: '41' }, { where: { tenantId: testTenantId } })
      const res = await request(app)
        .get('/csvupload')
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
        .expect(200)

      expect(res.text).toMatch(/請求書一括作成/i)
      expect(res.text).toMatch(/csv upload/i)
    })

    test('一般ユーザ、契約ステータス：41, /csvuploadResult', async () => {
      const res = await request(app)
        .get('/csvuploadResult')
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
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
      expect(res.text).toMatch(/← csv一括アップロード/i) // CSV一括アップロードに戻るリンク
    })

    test('管理者、契約ステータス：00, /csvupload', async () => {
      // 契約ステータス変更(利用登録済み)
      await db.Contract.update({ contractStatus: '00' }, { where: { tenantId: testTenantId } })
      const res = await request(app)
        .get('/csvupload')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(200)

      expect(res.text).toMatch(/請求書一括作成/i)
      expect(res.text).toMatch(/csv upload/i)
    })

    test('管理者、契約ステータス：00, /csvuploadResult', async () => {
      const res = await request(app)
        .get('/csvuploadResult')
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
      expect(res.text).toMatch(/← csv一括アップロード/i) // CSV一括アップロードに戻るリンク
    })

    test('一般ユーザ、契約ステータス：00, /csvupload', async () => {
      // 契約ステータス変更(利用登録済み)
      const res = await request(app)
        .get('/csvupload')
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
        .expect(200)

      expect(res.text).toMatch(/請求書一括作成/i)
      expect(res.text).toMatch(/csv upload/i)
    })

    test('一般ユーザ、契約ステータス：00, /csvuploadResult', async () => {
      const res = await request(app)
        .get('/csvuploadResult')
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
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
      expect(res.text).toMatch(/← csv一括アップロード/i) // CSV一括アップロードに戻るリンク
    })

    test('管理者、契約ステータス：30, /csvupload', async () => {
      await db.Contract.update({ contractStatus: '30' }, { where: { tenantId: testTenantId } })
      const res = await request(app)
        .get('/csvupload')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(200)

      expect(res.text).toMatch(/現在解約手続き中です。/i) // 画面内容
    })

    test('管理者、契約ステータス：30, /csvuploadResult', async () => {
      const res = await request(app)
        .get('/csvuploadResult')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(200)

      expect(res.text).toMatch(/現在解約手続き中です。/i) // 画面内容
    })

    test('一般ユーザ、契約ステータス：30, /csvupload', async () => {
      // 契約ステータス変更(利用登録済み)
      const res = await request(app)
        .get('/csvupload')
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
        .expect(200)

      expect(res.text).toMatch(/現在解約手続き中です。/i) // 画面内容
    })

    test('一般ユーザ、契約ステータス：30, /csvuploadResult', async () => {
      const res = await request(app)
        .get('/csvuploadResult')
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
        .expect(200)

      expect(res.text).toMatch(/現在解約手続き中です。/i) // 画面内容
    })

    test('管理者、契約ステータス：31, /csvupload', async () => {
      await db.Contract.update({ contractStatus: '31' }, { where: { tenantId: testTenantId } })
      const res = await request(app)
        .get('/csvupload')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(200)

      expect(res.text).toMatch(/現在解約手続き中です。/i) // 画面内容
    })

    test('管理者、契約ステータス：31, /csvuploadResult', async () => {
      const res = await request(app)
        .get('/csvuploadResult')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(200)

      expect(res.text).toMatch(/現在解約手続き中です。/i) // 画面内容
    })

    test('一般ユーザ、契約ステータス：31, /csvupload', async () => {
      const res = await request(app)
        .get('/csvupload')
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
        .expect(200)

      expect(res.text).toMatch(/現在解約手続き中です。/i) // 画面内容
    })

    test('一般ユーザ、契約ステータス：31, /csvuploadResult', async () => {
      const res = await request(app)
        .get('/csvuploadResult')
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
        .expect(200)

      expect(res.text).toMatch(/現在解約手続き中です。/i) // 画面内容
    })

    test('管理者、契約ステータス：99, /csvupload', async () => {
      // 契約ステータス変更(利用登録済み)
      await db.Contract.update({ contractStatus: '99', deleteFlag: 'true' }, { where: { tenantId: testTenantId } })
      const res = await request(app)
        .get('/csvupload')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(400)

      expect(res.text).toMatch(/不正なページからアクセスされたか、セッションタイムアウトが発生しました。/i)
    })

    test('管理者、契約ステータス：99, /csvuploadResult', async () => {
      const res = await request(app)
        .get('/csvuploadResult')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(400)

      expect(res.text).toMatch(/不正なページからアクセスされたか、セッションタイムアウトが発生しました。/i)
    })

    test('一般ユーザ、契約ステータス：99, /csvupload', async () => {
      // 契約ステータス変更(利用登録済み)
      await db.Contract.update({ contractStatus: '99' }, { where: { tenantId: testTenantId } })
      const res = await request(app)
        .get('/csvupload')
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
        .expect(400)

      expect(res.text).toMatch(/不正なページからアクセスされたか、セッションタイムアウトが発生しました。/i)
    })

    test('一般ユーザ、契約ステータス：99, /csvuploadResult', async () => {
      const res = await request(app)
        .get('/csvuploadResult')
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
        .expect(400)

      expect(res.text).toMatch(/不正なページからアクセスされたか、セッションタイムアウトが発生しました。/i)
    })

    test('管理者、契約ステータス：10, /portal', async () => {
      await db.Contract.update({ contractStatus: '10', deleteFlag: 'false' }, { where: { tenantId: testTenantId } })
      const res = await request(app)
        .get('/portal')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(200)

      expect(res.text).toMatch(/サポート/i)
      expect(res.text).toMatch(/請求書一括作成/i)
      expect(res.text).toMatch(/設定/i)
    })

    test('管理者、契約ステータス：11, /portal', async () => {
      // 契約ステータス変更(受け取り完了)
      await db.Contract.update({ contractStatus: '11' }, { where: { tenantId: testTenantId } })
      const res = await request(app)
        .get('/portal')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(200)

      expect(res.text).toMatch(/サポート/i)
      expect(res.text).toMatch(/請求書一括作成/i)
      expect(res.text).toMatch(/設定/i)
    })

    test('一般ユーザ、契約ステータス：10, /portal', async () => {
      await db.Contract.update({ contractStatus: '10' }, { where: { tenantId: testTenantId } })
      const res = await request(app)
        .get('/portal')
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
        .expect(200)

      expect(res.text).toMatch(/サポート/i)
      expect(res.text).toMatch(/請求書一括作成/i)
      expect(res.text).toMatch(/設定/i)
    })

    test('一般ユーザ、契約ステータス：11, /portal', async () => {
      await db.Contract.update({ contractStatus: '11' }, { where: { tenantId: testTenantId } })
      const res = await request(app)
        .get('/portal')
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
        .expect(200)

      expect(res.text).toMatch(/サポート/i)
      expect(res.text).toMatch(/請求書一括作成/i)
      expect(res.text).toMatch(/設定/i)
    })

    test('管理者、契約ステータス：40, /portal', async () => {
      await db.Contract.update({ contractStatus: '40' }, { where: { tenantId: testTenantId } })
      const res = await request(app)
        .get('/portal')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(200)

      expect(res.text).toMatch(/サポート/i)
      expect(res.text).toMatch(/請求書一括作成/i)
      expect(res.text).toMatch(/設定/i)
    })

    test('管理者、契約ステータス：41, /portal', async () => {
      // 契約ステータス変更(受け取り完了)
      await db.Contract.update({ contractStatus: '41' }, { where: { tenantId: testTenantId } })
      const res = await request(app)
        .get('/portal')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(200)

      expect(res.text).toMatch(/サポート/i)
      expect(res.text).toMatch(/請求書一括作成/i)
      expect(res.text).toMatch(/設定/i)
    })

    test('一般ユーザ、契約ステータス：40, /portal', async () => {
      await db.Contract.update({ contractStatus: '40' }, { where: { tenantId: testTenantId } })
      const res = await request(app)
        .get('/portal')
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
        .expect(200)

      expect(res.text).toMatch(/サポート/i)
      expect(res.text).toMatch(/請求書一括作成/i)
      expect(res.text).toMatch(/設定/i)
    })

    test('一般ユーザ、契約ステータス：41, /portal', async () => {
      await db.Contract.update({ contractStatus: '41' }, { where: { tenantId: testTenantId } })
      const res = await request(app)
        .get('/portal')
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
        .expect(200)

      expect(res.text).toMatch(/サポート/i)
      expect(res.text).toMatch(/請求書一括作成/i)
      expect(res.text).toMatch(/設定/i)
    })

    test('管理者、契約ステータス：00, /portal', async () => {
      // 契約ステータス変更(利用登録済み)
      await db.Contract.update({ contractStatus: '00' }, { where: { tenantId: testTenantId } })
      const res = await request(app)
        .get('/portal')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(200)

      expect(res.text).toMatch(/サポート/i)
      expect(res.text).toMatch(/請求書一括作成/i)
      expect(res.text).toMatch(/設定/i)
    })

    test('一般ユーザ、契約ステータス：00, /portal', async () => {
      // 契約ステータス変更(利用登録済み)
      const res = await request(app)
        .get('/portal')
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
        .expect(200)

      expect(res.text).toMatch(/サポート/i)
      expect(res.text).toMatch(/請求書一括作成/i)
      expect(res.text).toMatch(/設定/i)
    })

    test('管理者、契約ステータス：00、/csvuploadResultの詳細ポップアップのタブ選択', async () => {
      const now = new Date()
      const testData = {
        invoicesId: '00715217-a241-4f84-a6cf-f8d786e43cf5',
        tenantId: '221559d0-53aa-44a2-ab29-0c4a6cb02bde',
        csvFileName: 'インテグレーションテスト.csv',
        successCount: '-',
        failCount: '-',
        skipCount: '-',
        invoiceCount: '0',
        createdAt: `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}T00:00:00.000Z`,
        updatedAt: `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}T00:00:00.000Z`
      }

      const resultInvoice = await db.Invoice.findOne({
        where: {
          tenantId: testTenantId
        }
      })

      // 請求書テーブルにデータがない場合テストデータを追加する
      if (!resultInvoice) {
        await db.Invoice.create({
          testData,
          tenantId: testTenantId
        })
      }
      let clickResult
      const page = await browser.newPage()
      await page.setCookie(acCookies[0])
      await page.goto('https://localhost:3000/csvuploadResult')
      if (page.url() === 'https://localhost:3000/csvuploadResult') {
        const selector = await page.$(
          'body > div.max-width > div.columns.is-centered > div > div.box.csvuploadResultBox > table > tbody > tr:nth-child(1) > td:nth-child(4) > button'
        )
        await selector.click({ clickCount: 1 })
        clickResult = await page.evaluate(() => {
          if (document.querySelector('#csvuploadDetails-modal').attributes[0].value.match(/is-active/) !== null) {
            return document.querySelector('#csvuploadDetails-modal').attributes[0].value.match(/is-active/)[0]
          }
          return null
        })
      }
      // 詳細画面ポップアップ画面のタグのクラスが「is-active」になることを確認
      expect(clickResult).toBe('is-active')

      await page.waitForTimeout(3000)

      const tabSelector = await page.$('#btnTabSuccess')

      await tabSelector.click({ clickCount: 1 })

      const tabClickResult = await page.evaluate(() => {
        const checkedResult = []
        const failedResult = []
        const skipResult = []
        const failedRowTag = document.querySelectorAll('.tr-fail')
        const skipRowTag = document.querySelectorAll('.tr-skip')

        if (failedRowTag.length !== 0) {
          Array.prototype.forEach.call(failedRowTag, (ele) => {
            failedResult.push(ele.classList.value)
          })
        }
        checkedResult.push(failedResult)

        if (skipRowTag.length !== 0) {
          Array.prototype.forEach.call(skipRowTag, (ele) => skipResult.push(ele.classList.value))
        }
        checkedResult.push(skipResult)

        return checkedResult
      })

      tabClickResult.forEach((failedAndSkip) => {
        failedAndSkip.forEach((listOfClass) => {
          expect(listOfClass).toMatch(/is-invisible/i)
        })
      })
    })

    test('一般ユーザ、契約ステータス：00、/csvuploadResultの詳細ポップアップのタブ選択', async () => {
      const now = new Date()
      const testData = {
        invoicesId: '00715217-a241-4f84-a6cf-f8d786e43cf5',
        tenantId: '221559d0-53aa-44a2-ab29-0c4a6cb02bde',
        csvFileName: 'インテグレーションテスト.csv',
        successCount: '-',
        failCount: '-',
        skipCount: '-',
        invoiceCount: '0',
        createdAt: `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}T00:00:00.000Z`,
        updatedAt: `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}T00:00:00.000Z`
      }

      const resultInvoice = await db.Invoice.findOne({
        where: {
          tenantId: testTenantId
        }
      })

      // 請求書テーブルにデータがない場合テストデータを追加する
      if (!resultInvoice) {
        await db.Invoice.create({
          testData,
          tenantId: testTenantId
        })
      }
      let clickResult
      const page = await browser.newPage()
      await page.setCookie(userCookies[0])
      await page.goto('https://localhost:3000/csvuploadResult')
      if (page.url() === 'https://localhost:3000/csvuploadResult') {
        const selector = await page.$(
          'body > div.max-width > div.columns.is-centered > div > div.box.csvuploadResultBox > table > tbody > tr:nth-child(1) > td:nth-child(4) > button'
        )
        await selector.click({ clickCount: 1 })
        clickResult = await page.evaluate(() => {
          if (document.querySelector('#csvuploadDetails-modal').attributes[0].value.match(/is-active/) !== null) {
            return document.querySelector('#csvuploadDetails-modal').attributes[0].value.match(/is-active/)[0]
          }
          return null
        })
      }
      // 詳細画面ポップアップ画面のタグのクラスが「is-active」になることを確認
      expect(clickResult).toBe('is-active')

      await page.waitForTimeout(3000)

      const tabSelector = await page.$('#btnTabSuccess')

      await tabSelector.click({ clickCount: 1 })

      const tabClickResult = await page.evaluate(() => {
        const checkedResult = []
        const failedResult = []
        const skipResult = []
        const failedRowTag = document.querySelectorAll('.tr-fail')
        const skipRowTag = document.querySelectorAll('.tr-skip')

        if (failedRowTag.length !== 0) {
          Array.prototype.forEach.call(failedRowTag, (ele) => {
            failedResult.push(ele.classList.value)
          })
        }
        checkedResult.push(failedResult)

        if (skipRowTag.length !== 0) {
          Array.prototype.forEach.call(skipRowTag, (ele) => skipResult.push(ele.classList.value))
        }
        checkedResult.push(skipResult)

        return checkedResult
      })

      tabClickResult.forEach((failedAndSkip) => {
        failedAndSkip.forEach((listOfClass) => {
          expect(listOfClass).toMatch(/is-invisible/i)
        })
      })
    })

    test('管理者、契約ステータス：00、請求書一括作成のポップアップ及びcsvフォーマットダウンロード', async () => {
      let clickResult
      const path = require('path')
      const downloadPath = path.resolve('./kanri_download')
      const page = await browser.newPage()
      await page.setCookie(acCookies[0])
      await page.goto('https://localhost:3000/portal')
      page.waitForNavigation()
      if (page.url() === 'https://localhost:3000/portal') {
        // ページのローディングが終わるまで待つ
        const selector = await page.$(
          'body > div.container.is-max-widescreen > div.columns.is-desktop.is-family-noto-sans > div:nth-child(2) > div > a'
        )
        await selector.click({ clickCount: 1 })
        await page.waitForTimeout(1000)
        clickResult = await page.evaluate(() => {
          if (document.querySelector('#csvupload-modal').attributes[0].value.match(/is-active/) !== null) {
            return document.querySelector('#csvupload-modal').attributes[0].value.match(/is-active/)[0]
          }
          return null
        })
      }
      // 詳細画面ポップアップ画面のタグのクラスが「is-active」になることを確認
      expect(clickResult).toBe('is-active')

      await page.waitForTimeout(3000)

      // ダウンロードフォルダ設定
      await page._client.send('Page.setDownloadBehavior', {
        behavior: 'allow',
        downloadPath: downloadPath
      })

      const csvFormatDownloadSelector = await page.$(
        '#csvupload-modal > div.modal-card.is-family-noto-sans > section > nav > a:nth-child(2)'
      )

      const fileName = await page.evaluate(() => {
        const href = decodeURI(
          document.querySelector(
            '#csvupload-modal > div.modal-card.is-family-noto-sans > section > nav > a:nth-child(2)'
          ).href
        ).toString()
        const startIdx = href.lastIndexOf('/')
        const lastIdx = href.length
        return `${href.substr(startIdx, lastIdx)}`
      })

      await csvFormatDownloadSelector.click({ clickCount: 1 })

      // ダウンロード終わってからテスト（待機時間：2秒）
      setTimeout(() => {
        const fs = require('fs')
        const downloadFilePath = path.resolve(`${downloadPath}\\${fileName}`)
        const downloadFile = fs.readFileSync(downloadFilePath, {
          encoding: 'utf-8',
          flag: 'r'
        })

        const originFilePath = path.resolve('../Application/public/html/請求書一括作成フォーマット.csv')
        const originFile = fs.readFileSync(originFilePath, {
          encoding: 'utf-8',
          flag: 'r'
        })

        expect(originFile).toBe(downloadFile)
      }, 2000)
    })

    test('管理者、契約ステータス：00、請求書一括作成のポップアップ及びマニュアルダウンロード', async () => {
      let clickResult
      const path = require('path')
      const downloadPath = path.resolve('./kanri_download')
      const page = await browser.newPage()
      await page.setCookie(acCookies[0])
      await page.goto('https://localhost:3000/portal')
      page.waitForNavigation()
      if (page.url() === 'https://localhost:3000/portal') {
        // ページのローディングが終わるまで待つ
        const selector = await page.$(
          'body > div.container.is-max-widescreen > div.columns.is-desktop.is-family-noto-sans > div:nth-child(2) > div > a'
        )
        await selector.click({ clickCount: 1 })
        await page.waitForTimeout(1000)
        clickResult = await page.evaluate(() => {
          if (document.querySelector('#csvupload-modal').attributes[0].value.match(/is-active/) !== null) {
            return document.querySelector('#csvupload-modal').attributes[0].value.match(/is-active/)[0]
          }
          return null
        })
      }
      // 詳細画面ポップアップ画面のタグのクラスが「is-active」になることを確認
      expect(clickResult).toBe('is-active')

      await page.waitForTimeout(3000)

      // ダウンロードフォルダ設定
      await page._client.send('Page.setDownloadBehavior', {
        behavior: 'allow',
        downloadPath: downloadPath
      })

      const csvFormatDownloadSelector = await page.$(
        '#csvupload-modal > div.modal-card.is-family-noto-sans > section > nav > a:nth-child(3)'
      )

      const fileName = await page.evaluate(() => {
        const href = decodeURI(
          document.querySelector(
            '#csvupload-modal > div.modal-card.is-family-noto-sans > section > nav > a:nth-child(3)'
          ).href
        ).toString()
        const startIdx = href.lastIndexOf('/')
        const lastIdx = href.length
        return `${href.substr(startIdx, lastIdx)}`
      })

      await csvFormatDownloadSelector.click({ clickCount: 1 })

      // ダウンロード終わってからテスト（待機時間：2秒）
      setTimeout(() => {
        const fs = require('fs')
        const downloadFilePath = path.resolve(`${downloadPath}\\${fileName}`)
        const downloadFile = fs.readFileSync(downloadFilePath, {
          encoding: 'utf-8',
          flag: 'r'
        })

        const originFilePath = path.resolve('../Application/public/html/請求書一括作成マニュアル.pdf')
        const originFile = fs.readFileSync(originFilePath, {
          encoding: 'utf-8',
          flag: 'r'
        })

        expect(originFile).toBe(downloadFile)
      }, 2000)
    })

    test('一般ユーザ、契約ステータス：00、請求書一括作成のポップアップ及びcsvフォーマットダウンロード', async () => {
      let clickResult
      const path = require('path')
      const downloadPath = path.resolve('./ippan_download')
      const page = await browser.newPage()
      await page.setCookie(userCookies[0])
      await page.goto('https://localhost:3000/portal')
      page.waitForNavigation()
      if (page.url() === 'https://localhost:3000/portal') {
        // ページのローディングが終わるまで待つ
        const selector = await page.$(
          'body > div.container.is-max-widescreen > div.columns.is-desktop.is-family-noto-sans > div:nth-child(2) > div > a'
        )
        await selector.click({ clickCount: 1 })
        await page.waitForTimeout(1000)
        clickResult = await page.evaluate(() => {
          if (document.querySelector('#csvupload-modal').attributes[0].value.match(/is-active/) !== null) {
            return document.querySelector('#csvupload-modal').attributes[0].value.match(/is-active/)[0]
          }
          return null
        })
      }
      // 詳細画面ポップアップ画面のタグのクラスが「is-active」になることを確認
      expect(clickResult).toBe('is-active')

      await page.waitForTimeout(3000)

      // ダウンロードフォルダ設定
      await page._client.send('Page.setDownloadBehavior', {
        behavior: 'allow',
        downloadPath: downloadPath
      })

      const csvFormatDownloadSelector = await page.$(
        '#csvupload-modal > div.modal-card.is-family-noto-sans > section > nav > a:nth-child(2)'
      )

      const fileName = await page.evaluate(() => {
        const href = decodeURI(
          document.querySelector(
            '#csvupload-modal > div.modal-card.is-family-noto-sans > section > nav > a:nth-child(2)'
          ).href
        ).toString()
        const startIdx = href.lastIndexOf('/')
        const lastIdx = href.length
        return `${href.substr(startIdx, lastIdx)}`
      })

      await csvFormatDownloadSelector.click({ clickCount: 1 })

      // ダウンロード終わってからテスト（待機時間：2秒）
      setTimeout(() => {
        const fs = require('fs')
        const downloadFilePath = path.resolve(`${downloadPath}\\${fileName}`)
        const downloadFile = fs.readFileSync(downloadFilePath, {
          encoding: 'utf-8',
          flag: 'r'
        })

        const originFilePath = path.resolve('../Application/public/html/請求書一括作成フォーマット.csv')
        const originFile = fs.readFileSync(originFilePath, {
          encoding: 'utf-8',
          flag: 'r'
        })

        expect(originFile).toBe(downloadFile)
      }, 2000)
    })

    test('一般ユーザ、契約ステータス：00、請求書一括作成のポップアップ及びマニュアルダウンロード', async () => {
      let clickResult
      const path = require('path')
      const downloadPath = path.resolve('./ippan_download')
      const page = await browser.newPage()
      await page.setCookie(userCookies[0])
      await page.goto('https://localhost:3000/portal')
      page.waitForNavigation()
      if (page.url() === 'https://localhost:3000/portal') {
        // ページのローディングが終わるまで待つ
        const selector = await page.$(
          'body > div.container.is-max-widescreen > div.columns.is-desktop.is-family-noto-sans > div:nth-child(2) > div > a'
        )
        await selector.click({ clickCount: 1 })
        await page.waitForTimeout(1000)
        clickResult = await page.evaluate(() => {
          if (document.querySelector('#csvupload-modal').attributes[0].value.match(/is-active/) !== null) {
            return document.querySelector('#csvupload-modal').attributes[0].value.match(/is-active/)[0]
          }
          return null
        })
      }
      // 詳細画面ポップアップ画面のタグのクラスが「is-active」になることを確認
      expect(clickResult).toBe('is-active')

      await page.waitForTimeout(3000)

      // ダウンロードフォルダ設定
      await page._client.send('Page.setDownloadBehavior', {
        behavior: 'allow',
        downloadPath: downloadPath
      })

      const csvFormatDownloadSelector = await page.$(
        '#csvupload-modal > div.modal-card.is-family-noto-sans > section > nav > a:nth-child(3)'
      )

      const fileName = await page.evaluate(() => {
        const href = decodeURI(
          document.querySelector(
            '#csvupload-modal > div.modal-card.is-family-noto-sans > section > nav > a:nth-child(3)'
          ).href
        ).toString()
        const startIdx = href.lastIndexOf('/')
        const lastIdx = href.length
        return `${href.substr(startIdx, lastIdx)}`
      })

      await csvFormatDownloadSelector.click({ clickCount: 1 })

      // ダウンロード終わってからテスト（待機時間：2秒）
      setTimeout(() => {
        const fs = require('fs')
        const downloadFilePath = path.resolve(`${downloadPath}\\${fileName}`)
        const downloadFile = fs.readFileSync(downloadFilePath, {
          encoding: 'utf-8',
          flag: 'r'
        })

        const originFilePath = path.resolve('../Application/public/html/請求書一括作成マニュアル.pdf')
        const originFile = fs.readFileSync(originFilePath, {
          encoding: 'utf-8',
          flag: 'r'
        })

        expect(originFile).toBe(downloadFile)
      }, 2000)
    })

    test('管理者、契約ステータス：30, /portal', async () => {
      await db.Contract.update({ contractStatus: '30' }, { where: { tenantId: testTenantId } })
      const res = await request(app)
        .get('/portal')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(200)

      expect(res.text).toMatch(/現在解約手続き中です。/i) // 画面内容
    })

    test('管理者、契約ステータス：31, /portal', async () => {
      await db.Contract.update({ contractStatus: '31' }, { where: { tenantId: testTenantId } })
      const res = await request(app)
        .get('/portal')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(200)

      expect(res.text).toMatch(/現在解約手続き中です。/i) // 画面内容
    })

    test('一般ユーザ、契約ステータス：30, /portal', async () => {
      // 契約ステータス変更(利用登録済み)
      await db.Contract.update({ contractStatus: '30' }, { where: { tenantId: testTenantId } })
      const res = await request(app)
        .get('/portal')
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
        .expect(200)

      expect(res.text).toMatch(/現在解約手続き中です。/i) // 画面内容
    })

    test('一般ユーザ、契約ステータス：31, /portal', async () => {
      // 契約ステータス変更(利用登録済み)
      await db.Contract.update({ contractStatus: '31' }, { where: { tenantId: testTenantId } })
      const res = await request(app)
        .get('/portal')
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
        .expect(200)

      expect(res.text).toMatch(/現在解約手続き中です。/i) // 画面内容
    })

    test('管理者、契約ステータス：99, /portal', async () => {
      // 契約ステータス変更(利用登録済み)
      await db.Contract.update({ contractStatus: '99', deleteFlag: 'true' }, { where: { tenantId: testTenantId } })
      const res = await request(app)
        .get('/portal')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(400)

      expect(res.text).toMatch(/不正なページからアクセスされたか、セッションタイムアウトが発生しました。/i)
    })

    test('一般ユーザ、契約ステータス：99, /portal', async () => {
      // 契約ステータス変更(利用登録済み)
      await db.Contract.update({ contractStatus: '99' }, { where: { tenantId: testTenantId } })
      const res = await request(app)
        .get('/portal')
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
        .expect(400)

      expect(res.text).toMatch(/不正なページからアクセスされたか、セッションタイムアウトが発生しました。/i)
    })
  })

  describe('6.DBにアカウント管理者・一般ユーザ共に登録済/一般ユーザとしてリクエスト', () => {
    // DB状態:
    //   テナント：
    //    試験前：登録済
    //    試験後(期待値)：登録済
    //
    //   アカウント管理者：
    //    試験前：登録済
    //    試験後(期待値)：登録済
    //
    //   一般ユーザ：
    //    試験前：登録済
    //    試験後(期待値)：登録済

    // /authにリダイレクトする
    test('/indexにアクセス：303ステータスと/authにリダイレクト', async () => {
      // 契約ステータスを「契約中」に設定
      await db.Contract.update({ contractStatus: '00', deleteFlag: 'false' }, { where: { tenantId: testTenantId } })
      const res = await request(app)
        .get('/')
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
        .expect(303)

      expect(res.header.location).toBe('/auth') // リダイレクト先は/auth
    })

    // (登録画面に遷移せず)正常にportal画面が表示される
    test('/portalにアクセス：200ステータスとportal画面表示', async () => {
      const res = await request(app)
        .get('/portal')
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
        .expect(200)

      expect(res.text).toMatch(/ポータル - BConnectionデジタルトレード/i) // タイトルが含まれていること
    })

    let userCsrf, tenantCsrf
    // userContextが'NotUserRegistered'ではない(登録済の)ため、アクセスできない
    test('/user/registerにアクセス：userContext不一致による400ステータスとエラーメッセージ', async () => {
      const res = await request(app)
        .get('/user/register')
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
        .expect(400)

      // CSRFのワンタイムトークン取得
      const dom = new JSDOM(res.text)
      userCsrf = dom.window.document.getElementsByName('_csrf')[0]?.value

      expect(res.text).toMatch(/不正なページからアクセスされたか、セッションタイムアウトが発生しました。/i) // タイトル
    })

    // 正しいCSRFトークンを取得していないため、アクセスできない
    test('/user/registerにPOST：csurfによる400ステータスとエラーメッセージ', async () => {
      const res = await request(app)
        .post('/user/register')
        .type('form')
        .send({ _csrf: userCsrf, termsCheck: 'on' })
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
        .expect(400)

      expect(res.text).toMatch(/不正なページからアクセスされたか、セッションタイムアウトが発生しました。/i) // タイトル
    })

    // userContextが'NotTenantRegistered'ではない(登録済の)ため、アクセスできない
    test('/tenant/registerにアクセス：userContext不一致による400ステータスとエラーメッセージ', async () => {
      const res = await request(app)
        .get('/tenant/register')
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
        .expect(400)

      // CSRFのワンタイムトークン取得
      const dom = new JSDOM(res.text)
      tenantCsrf = dom.window.document.getElementsByName('_csrf')[0]?.value

      expect(res.text).toMatch(/不正なページからアクセスされたか、セッションタイムアウトが発生しました。/i) // タイトル
    })

    // 正しいCSRFトークンを取得していないため、アクセスできない
    test('/tenant/registerにPOST：csurfによる400ステータスとエラーメッセージ', async () => {
      const res = await request(app)
        .post('/tenant/register')
        .type('form')
        .send({ _csrf: tenantCsrf, termsCheck: 'on' })
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
        .expect(400)

      expect(res.text).toMatch(/不正なページからアクセスされたか、セッションタイムアウトが発生しました。/i) // タイトル
    })

    // テナントステータスが「新規申込」、取り込み結果ページ利用できる
    test('/csvuploadResultにGET：利用できる', async () => {
      const res = await request(app)
        .get('/csvuploadResult')
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
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
      expect(res.text).toMatch(/← csv一括アップロード/i) // CSV一括アップロードに戻るリンク
    })
  })

  describe('7.DBに一般ユーザのみ登録・アカウント管理者登録なし/一般ユーザとしてリクエスト', () => {
    // DB状態:
    //   テナント：
    //    試験前：登録済
    //    試験後(期待値)：登録済
    //
    //   アカウント管理者：
    //    試験前：削除
    //    試験後(期待値)：未登録
    //
    //   一般ユーザ：
    //    試験前：登録済
    //    試験後(期待値)：登録済

    test('DB削除', async () => {
      // アカウント管理者を削除
      await request(app)
        .get('/user/delete')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
    })

    // /authにリダイレクトする
    test('/indexにアクセス：303ステータスと/authにリダイレクト', async () => {
      const res = await request(app)
        .get('/')
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
        .expect(303)

      expect(res.header.location).toBe('/auth') // リダイレクト先は/auth
    })

    // (登録画面に遷移せず)正常にportal画面が表示される
    test('/portalにアクセス：200ステータスとportal画面表示', async () => {
      const res = await request(app)
        .get('/portal')
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
        .expect(200)

      expect(res.text).toMatch(/ポータル - BConnectionデジタルトレード/i) // タイトルが含まれていること
    })

    let userCsrf, tenantCsrf
    // userContextが'NotUserRegistered'ではない(登録済の)ため、アクセスできない
    test('/user/registerにアクセス：userContext不一致による400ステータスとエラーメッセージ', async () => {
      const res = await request(app)
        .get('/user/register')
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
        .expect(400)

      // CSRFのワンタイムトークン取得
      const dom = new JSDOM(res.text)
      userCsrf = dom.window.document.getElementsByName('_csrf')[0]?.value

      expect(res.text).toMatch(/不正なページからアクセスされたか、セッションタイムアウトが発生しました。/i) // タイトル
    })

    // 正しいCSRFトークンを取得していないため、アクセスできない
    test('/user/registerにPOST：csurfによる400ステータスとエラーメッセージ', async () => {
      const res = await request(app)
        .post('/user/register')
        .type('form')
        .send({ _csrf: userCsrf, termsCheck: 'on' })
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
        .expect(400)

      expect(res.text).toMatch(/不正なページからアクセスされたか、セッションタイムアウトが発生しました。/i) // タイトル
    })

    // userContextが'NotTenantRegistered'ではない(登録済の)ため、アクセスできない
    test('/tenant/registerにアクセス：userContext不一致による400ステータスとエラーメッセージ', async () => {
      const res = await request(app)
        .get('/tenant/register')
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
        .expect(400)

      // CSRFのワンタイムトークン取得
      const dom = new JSDOM(res.text)
      tenantCsrf = dom.window.document.getElementsByName('_csrf')[0]?.value

      expect(res.text).toMatch(/不正なページからアクセスされたか、セッションタイムアウトが発生しました。/i) // タイトル
    })

    // 正しいCSRFトークンを取得していないため、アクセスできない
    test('/tenant/registerにPOST：csurfによる400ステータスとエラーメッセージ', async () => {
      const res = await request(app)
        .post('/tenant/register')
        .type('form')
        .send({ _csrf: tenantCsrf, termsCheck: 'on' })
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
        .expect(400)

      expect(res.text).toMatch(/不正なページからアクセスされたか、セッションタイムアウトが発生しました。/i) // タイトル
    })
  })

  describe('8.DBに一般ユーザのみ登録・アカウント管理者登録なし/アカウント管理者としてリクエスト', () => {
    // DB状態:
    //   テナント：
    //    試験前：登録済
    //    試験後(期待値)：登録済
    //
    //   アカウント管理者：
    //    試験前：未登録
    //    試験後(期待値)：登録
    //
    //   一般ユーザ：
    //    試験前：登録済
    //    試験後(期待値)：登録済

    // /authにリダイレクトする
    test('/indexにアクセス：303ステータスと/authにリダイレクト', async () => {
      const res = await request(app)
        .get('/')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(303)

      expect(res.header.location).toBe('/auth') // リダイレクト先は/auth
    })

    // テナント登録済/ユーザ未登録のため、ユーザの利用登録画面にリダイレクトする
    test('/portalにアクセス：200ステータスと/portalにリダイレクト', async () => {
      const res = await request(app)
        .get('/portal')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(200)

      expect(res.text).toMatch(/ポータル - BConnectionデジタルトレード/i) // タイトルが含まれていること // リダイレクト先は/tenant/register
    })

    let tenantCsrf

    // userContextが'NotTenantRegistered'ではない(登録済の)ため、アクセスできない
    test('/tenant/registerにアクセス：userContext不一致による400ステータスとエラーメッセージ', async () => {
      const res = await request(app)
        .get('/tenant/register')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(400)

      // CSRFのワンタイムトークン取得
      const dom = new JSDOM(res.text)
      tenantCsrf = dom.window.document.getElementsByName('_csrf')[0]?.value

      expect(res.text).toMatch(/不正なページからアクセスされたか、セッションタイムアウトが発生しました。/i) // タイトル
    })

    // 正しいCSRFトークンを取得していないため、アクセスできない
    test('/tenant/registerにPOST：csurfによる400ステータスとエラーメッセージ', async () => {
      const res = await request(app)
        .post('/tenant/register')
        .type('form')
        .send({ _csrf: tenantCsrf, termsCheck: 'on' })
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(400)

      expect(res.text).toMatch(/不正なページからアクセスされたか、セッションタイムアウトが発生しました。/i) // タイトル
    })
  })

  describe('後処理', () => {
    test('ContractとOrderデータ削除', async () => {
      await db.Contract.destroy({ where: { tenantId: testTenantId } })
      await db.Order.destroy({ where: { tenantId: testTenantId } })
    })

    test('全てのユーザを削除', async () => {
      // 一般ユーザを削除
      await request(app)
        .get('/user/delete')
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)

      // アカウント管理者を削除
      await request(app)
        .get('/user/delete')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
    })
  })
})
