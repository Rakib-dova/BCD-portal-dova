'use strict'
const app = require('../../Application/app')
const request = require('supertest')
const { JSDOM } = require('jsdom')
const testTenantId = '221559d0-53aa-44a2-ab29-0c4a6cb02bde'

jest.setTimeout(40000) // jestのタイムアウトを40秒とする

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

  describe('前準備', () => {
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

  describe('DBにアカウント管理者・一般ユーザ共に登録なし/一般ユーザとしてリクエスト', () => {
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

      expect(res.header.location).toBe('/auth') // リダイレクト先は/auth
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
    test('/user/registerにPOST：csurfによる403ステータスとエラーメッセージ', async () => {
      const res = await request(app)
        .post('/user/register')
        .type('form')
        .send({ _csrf: userCsrf, termsCheck: 'on' })
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
        .expect(403)

      expect(res.text).toMatch(/不正なページからアクセスされたか、セッションタイムアウトが発生しました。/i) // タイトル
    })

    // 管理者権限がないため、アクセスできない
    test('/tenant/registerにアクセス：管理者権限不足による403ステータスとエラーメッセージ', async () => {
      const res = await request(app)
        .get('/tenant/register')
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
        .expect(403)

      // CSRFのワンタイムトークン取得
      const dom = new JSDOM(res.text)
      tenantCsrf = dom.window.document.getElementsByName('_csrf')[0]?.value

      expect(res.text).toMatch(/デジタルトレードのご利用にはアカウント管理者による利用登録が必要です。/i) // タイトル
    })

    // 正しいCSRFトークンを取得していないため、アクセスできない
    test('/tenant/registerにPOST：csurfによる403ステータスとエラーメッセージ', async () => {
      const res = await request(app)
        .post('/tenant/register')
        .type('form')
        .send({ _csrf: tenantCsrf, termsCheck: 'on' })
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
        .expect(403)

      expect(res.text).toMatch(/不正なページからアクセスされたか、セッションタイムアウトが発生しました。/i) // タイトル
    })
  })

  describe('DBにアカウント管理者・一般ユーザ共に登録なし/アカウント管理者としてリクエスト', () => {
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
    test('/user/registerにPOST：csurfによる403ステータスとエラーメッセージ', async () => {
      const res = await request(app)
        .post('/user/register')
        .type('form')
        .send({ _csrf: userCsrf, termsCheck: 'on' })
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(403)

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

    // 正常にテナントが登録され、ポータルにリダイレクトされる
    test('/tenant/registerにPOST：303ステータスと/portalにリダイレクト(アカウント管理者とテナント登録成功)', async () => {
      const res = await request(app)
        .post('/tenant/register')
        .type('form')
        .send({ _csrf: tenantCsrf, termsCheck: 'on' })
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(303) // 303リダイレクトに直す？

      expect(res.header.location).toBe('/portal') // リダイレクト先は/portal
    })
  })

  describe('DBにアカウント管理者のみ登録・一般ユーザ登録なし/アカウント管理者としてリクエスト', () => {
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
    test('/user/registerにPOST：csurfによる403ステータスとエラーメッセージ', async () => {
      const res = await request(app)
        .post('/user/register')
        .type('form')
        .send({ _csrf: userCsrf, termsCheck: 'on' })
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(403)

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
    test('/tenant/registerにPOST：csurfによる403ステータスとエラーメッセージ', async () => {
      const res = await request(app)
        .post('/tenant/register')
        .type('form')
        .send({ _csrf: tenantCsrf, termsCheck: 'on' })
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(403)

      expect(res.text).toMatch(/不正なページからアクセスされたか、セッションタイムアウトが発生しました。/i) // タイトル
    })
  })

  describe('DBにアカウント管理者のみ登録・一般ユーザ登録なし/一般ユーザとしてリクエスト', () => {
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

    // DB操作用
    const db = require('../../Application/models')

    // /authにリダイレクトする
    test('/indexにアクセス：303ステータスと/authにリダイレクト', async () => {
      const res = await request(app)
        .get('/')
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
        .expect(303)

      expect(res.header.location).toBe('/auth') // リダイレクト先は/auth
    })

    // テナント登録済/ユーザ未登録のため、ユーザの利用登録画面にリダイレクトする
    test('/portalにアクセス：303ステータスと/user/registerにリダイレクト', async () => {
      const res = await request(app)
        .get('/portal')
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
        .expect(303)

      // CSRFのワンタイムトークン取得
      const dom = new JSDOM(res.text)
      userCsrf = dom.window.document.getElementsByName('_csrf')[0]?.value

      expect(res.header.location).toBe('/auth') // リダイレクト先は/auth
    })

    let userCsrf, tenantCsrf
    // ユーザの利用登録画面が正常に表示される
    test('/user/registerにアクセス：200ステータスとユーザの利用登録画面表示', async () => {
      const res = await request(app)
        .get('/user/register')
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
        .expect(200)

      // CSRFのワンタイムトークン取得
      const dom = new JSDOM(res.text)
      userCsrf = dom.window.document.getElementsByName('_csrf')[0]?.value

      expect(res.text).toMatch(/利用登録 - BConnectionデジタルトレード/i) // タイトル
    })

    // 正常に一般ユーザが登録され、/portalにリダイレクトする
    test('/user/registerにPOST：303ステータスと/portalにリダイレクト(一般ユーザ登録成功)', async () => {
      const res = await request(app)
        .post('/user/register')
        .type('form')
        .send({ _csrf: userCsrf, termsCheck: 'on' })
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
        .expect(303)

      expect(res.header.location).toBe('/portal') // リダイレクト先は/portal
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
    test('/tenant/registerにPOST：csurfによる403ステータスとエラーメッセージ', async () => {
      const res = await request(app)
        .post('/tenant/register')
        .type('form')
        .send({ _csrf: tenantCsrf, termsCheck: 'on' })
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
        .expect(403)

      expect(res.text).toMatch(/不正なページからアクセスされたか、セッションタイムアウトが発生しました。/i) // タイトル
    })

    // 正常にportal画面から契約者変更へ遷移する
    test('管理者、契約ステータス：10, /change', async () => {
      const res = await request(app)
        .get('/change')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(200)

      expect(res.text).toMatch(/現在利用登録手続き中です。/i) // 画面内容
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

    test('管理者、契約ステータス：00, /change', async () => {
      // 契約ステータス変更(利用登録済み)
      await db.Contract.update({ contractStatus: '00' }, { where: { tenantId: testTenantId } })
      const res = await request(app)
        .get('/change')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(200)

      expect(res.text).toMatch(/契約情報変更/i) // 画面内容
    })

    test('管理者、契約ステータス：00, 利用者情報変更, /change', async () => {
      const res = await request(app)
        .post('/change')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .send({
          chkContractName: 'on',
          contractName: '変更名',
          contractKanaName: 'ヘンコウメイ'
        })
        .expect(302)
      expect(res.header.location).toBe('/portal')
    })

    test('ContractとOrderデータ削除', async () => {
      await db.Contract.destroy({ where: { tenantId: testTenantId } })
      await db.Order.destroy({ where: { tenantId: testTenantId } })
    })
  })

  describe('DBにアカウント管理者・一般ユーザ共に登録済/アカウント管理者としてリクエスト', () => {
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

    // DB操作用
    const db = require('../../Application/models')

    // ContractとOrder作成
    test('orderTable初期化', async () => {
      await db.Contract.create({
        contractId: '38de83da-cb64-459b-1234-3b2790b08a9e',
        tenantId: testTenantId,
        contractStatus: '10'
      })
      await db.Order.create({
        contractId: '38de83da-cb64-459b-1234-3b2790b08a9e',
        tenantId: testTenantId,
        orderType: '10',
        orderData: ` {"contractBasicInfo":{"sysManageId":"${testTenantId}","orderId":"","orderType":"010","contractChangeName":"","contractChangeAddress":"","contractChangeContact":"","appDate":"","OpeningDate":"","contractNumber":"","salesChannelCode":""},"contractAccountInfo":{"contractAccountId":"","customerType":"","commonCustomerId":""},"contractList":[{"contractType":""}],"prdtList":[{"prdtCode":"BF1021000000100","appType":"010"}]}`
      })
    })
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
    test('/user/registerにPOST：csurfによる403ステータスとエラーメッセージ', async () => {
      const res = await request(app)
        .post('/user/register')
        .type('form')
        .send({ _csrf: userCsrf, termsCheck: 'on' })
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(403)

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
    test('/tenant/registerにPOST：csurfによる403ステータスとエラーメッセージ', async () => {
      const res = await request(app)
        .post('/tenant/register')
        .type('form')
        .send({ _csrf: tenantCsrf, termsCheck: 'on' })
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(403)

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

    test('管理者、契約ステータス：11, /change', async () => {
      // 契約ステータス変更(受け取り完了)
      await db.Contract.update({ contractStatus: '11' }, { where: { tenantId: testTenantId } })
      const res = await request(app)
        .get('/change')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(200)

      expect(res.text).toMatch(/現在利用登録手続き中です。/i) // 画面内容
    })

    // 正常にportal画面から契約者変更へ遷移する
    test('管理者、契約ステータス：20, /change', async () => {
      await db.Contract.update({ contractStatus: '20' }, { where: { tenantId: testTenantId } })
      const res = await request(app)
        .get('/change')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(200)

      expect(res.text).toMatch(/現在契約情報変更手続き中です。/i) // 画面内容
    })

    test('管理者、契約ステータス：21, /change', async () => {
      // 契約ステータス変更(受け取り完了)
      await db.Contract.update({ contractStatus: '21' }, { where: { tenantId: testTenantId } })
      const res = await request(app)
        .get('/change')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(200)

      expect(res.text).toMatch(/現在契約情報変更手続き中です。/i) // 画面内容
    })

    test('管理者、契約ステータス：20, /portal', async () => {
      await db.Contract.update({ contractStatus: '20' }, { where: { tenantId: testTenantId } })
      const res = await request(app)
        .get('/portal')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(200)

      expect(res.text).toMatch(/現在契約情報変更手続き中です。/i) // 画面内容
    })

    test('管理者、契約ステータス：21, /portal', async () => {
      // 契約ステータス変更(受け取り完了)
      await db.Contract.update({ contractStatus: '21' }, { where: { tenantId: testTenantId } })
      const res = await request(app)
        .get('/portal')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(200)

      expect(res.text).toMatch(/現在契約情報変更手続き中です。/i) // 画面内容
    })

    test('一般ユーザ、契約ステータス：20, /change', async () => {
      await db.Contract.update({ contractStatus: '20' }, { where: { tenantId: testTenantId } })
      const res = await request(app)
        .get('/change')
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
        .expect(200)

      expect(res.text).toMatch(/現在契約情報変更手続き中です。/i) // 画面内容
    })

    test('一般ユーザ、契約ステータス：21, /change', async () => {
      await db.Contract.update({ contractStatus: '21' }, { where: { tenantId: testTenantId } })
      const res = await request(app)
        .get('/change')
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
        .expect(200)

      expect(res.text).toMatch(/現在契約情報変更手続き中です。/i) // 画面内容
    })

    test('一般ユーザ、契約ステータス：20、/portal', async () => {
      await db.Contract.update({ contractStatus: '20' }, { where: { tenantId: testTenantId } })
      const res = await request(app)
        .get('/portal')
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
        .expect(200)

      expect(res.text).toMatch(/現在契約情報変更手続き中です。/i) // 画面内容
    })

    test('一般ユーザ、契約ステータス：21、/portal', async () => {
      await db.Contract.update({ contractStatus: '21' }, { where: { tenantId: testTenantId } })
      const res = await request(app)
        .get('/portal')
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
        .expect(200)

      expect(res.text).toMatch(/現在契約情報変更手続き中です。/i) // 画面内容
    })

    test('管理者、契約ステータス：00, /change', async () => {
      // 契約ステータス変更(利用登録済み)
      await db.Contract.update({ contractStatus: '00' }, { where: { tenantId: testTenantId } })
      const res = await request(app)
        .get('/change')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(200)

      expect(res.text).toMatch(/契約情報変更/i) // 画面内容
    })

    test('一般ユーザ、契約ステータス：00、, /change', async () => {
      // 契約ステータス変更(利用登録済み)
      await db.Contract.update({ contractStatus: '00' }, { where: { tenantId: testTenantId } })
      const res = await request(app)
        .get('/change')
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
        .expect(200)

      expect(res.text).toMatch(/本機能はご利用いただけません。/i) // 画面内容
    })

    test('管理者、契約ステータス：00、 契約名変更、/change', async () => {
      const res = await request(app)
        .post('/change')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .send({
          chkContractName: 'on',
          contractName: '変更名',
          contractKanaName: 'ヘンコウメイ'
        })
        .expect(302)

      expect(res.header.location).toBe('/portal')
    })

    test('管理者、契約ステータス：30、/change', async () => {
      await db.Contract.update({ contractStatus: '30' }, { where: { tenantId: testTenantId } })
      const res = await request(app)
        .get('/change')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(200)

      expect(res.text).toMatch(/現在解約手続き中です。/i) // 画面内容
    })

    test('管理者、契約ステータス：31、/change', async () => {
      await db.Contract.update({ contractStatus: '31' }, { where: { tenantId: testTenantId } })
      const res = await request(app)
        .get('/change')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(200)

      expect(res.text).toMatch(/>現在解約手続き中です。/i) // 画面内容
    })

    test('一般ユーザ、契約ステータス：30、, /change', async () => {
      // 契約ステータス変更(利用登録済み)
      await db.Contract.update({ contractStatus: '30' }, { where: { tenantId: testTenantId } })
      const res = await request(app)
        .get('/change')
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
        .expect(200)

      expect(res.text).toMatch(/現在解約手続き中です。/i) // 画面内容
    })

    test('一般ユーザ、契約ステータス：31、, /change', async () => {
      // 契約ステータス変更(利用登録済み)
      await db.Contract.update({ contractStatus: '31' }, { where: { tenantId: testTenantId } })
      const res = await request(app)
        .get('/change')
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
        .expect(200)

      expect(res.text).toMatch(/現在解約手続き中です。/i) // 画面内容
    })

    test('管理者、契約ステータス：99、/change', async () => {
      // 契約ステータス変更(利用登録済み)
      await db.Contract.update({ contractStatus: '99', deleteFlag: 'true' }, { where: { tenantId: testTenantId } })
      const res = await request(app)
        .get('/change')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(400)

      expect(res.text).toMatch(/不正なページからアクセスされたか、セッションタイムアウトが発生しました。/i)
    })

    test('一般ユーザ、契約ステータス：99、, /change', async () => {
      // 契約ステータス変更(利用登録済み)
      await db.Contract.update({ contractStatus: '99' }, { where: { tenantId: testTenantId } })
      const res = await request(app)
        .get('/change')
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
        .expect(400)

      expect(res.text).toMatch(/不正なページからアクセスされたか、セッションタイムアウトが発生しました。/i)
    })
  })

  describe('DBにアカウント管理者・一般ユーザ共に登録済/一般ユーザとしてリクエスト', () => {
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
    test('/user/registerにPOST：csurfによる403ステータスとエラーメッセージ', async () => {
      const res = await request(app)
        .post('/user/register')
        .type('form')
        .send({ _csrf: userCsrf, termsCheck: 'on' })
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
        .expect(403)

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
    test('/tenant/registerにPOST：csurfによる403ステータスとエラーメッセージ', async () => {
      const res = await request(app)
        .post('/tenant/register')
        .type('form')
        .send({ _csrf: tenantCsrf, termsCheck: 'on' })
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
        .expect(403)

      expect(res.text).toMatch(/不正なページからアクセスされたか、セッションタイムアウトが発生しました。/i) // タイトル
    })
  })

  describe('DBに一般ユーザのみ登録・アカウント管理者登録なし/一般ユーザとしてリクエスト', () => {
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
    test('/user/registerにPOST：csurfによる403ステータスとエラーメッセージ', async () => {
      const res = await request(app)
        .post('/user/register')
        .type('form')
        .send({ _csrf: userCsrf, termsCheck: 'on' })
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
        .expect(403)

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
    test('/tenant/registerにPOST：csurfによる403ステータスとエラーメッセージ', async () => {
      const res = await request(app)
        .post('/tenant/register')
        .type('form')
        .send({ _csrf: tenantCsrf, termsCheck: 'on' })
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
        .expect(403)

      expect(res.text).toMatch(/不正なページからアクセスされたか、セッションタイムアウトが発生しました。/i) // タイトル
    })
  })

  describe('DBに一般ユーザのみ登録・アカウント管理者登録なし/アカウント管理者としてリクエスト', () => {
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
    test('/portalにアクセス：303ステータスと/user/registerにリダイレクト', async () => {
      const res = await request(app)
        .get('/portal')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(303)

      expect(res.header.location).toBe('/tenant/register') // リダイレクト先は/tenant/register
    })

    let userCsrf, tenantCsrf
    // ユーザの利用登録画面が正常に表示される
    test('/user/registerにアクセス：200ステータスとユーザの利用登録画面表示', async () => {
      const res = await request(app)
        .get('/user/register')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(200)

      // CSRFのワンタイムトークン取得
      const dom = new JSDOM(res.text)
      userCsrf = dom.window.document.getElementsByName('_csrf')[0]?.value

      expect(res.text).toMatch(/利用登録 - BConnectionデジタルトレード/i) // タイトル
    })

    // 正常にアカウント管理者が登録され、/portalにリダイレクトする
    test('/user/registerにPOST：303ステータスと/portalにリダイレクト(アカウント管理者登録成功)', async () => {
      const res = await request(app)
        .post('/user/register')
        .type('form')
        .send({ _csrf: userCsrf, termsCheck: 'on' })
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(303)

      expect(res.header.location).toBe('/portal') // リダイレクト先は/portal
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
    test('/tenant/registerにPOST：csurfによる403ステータスとエラーメッセージ', async () => {
      const res = await request(app)
        .post('/tenant/register')
        .type('form')
        .send({ _csrf: tenantCsrf, termsCheck: 'on' })
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(403)

      expect(res.text).toMatch(/不正なページからアクセスされたか、セッションタイムアウトが発生しました。/i) // タイトル
    })
  })
  describe('後処理', () => {
    test('全てのユーザを削除', async () => {
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
})
