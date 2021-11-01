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

  const lang = await page.evaluate(() => {
    return navigator.language
  })

  // ブラウザのロケールライジング
  if (lang === 'ja') {
    expect(await page.title()).toBe('ログイン | Tradeshift')
  } else {
    expect(await page.title()).toBe('Login | Tradeshift')
  }

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

    let userCsrf
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

    // 利用登録をしていないため、変更ページ利用できない
    test('/changeにGET：制御による500ステータスとエラーメッセージ', async () => {
      const res = await request(app)
        .get('/change')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(500)

      expect(res.text).toMatch(/お探しのページは見つかりませんでした。/i) // タイトル
    })

    // 利用登録をしていないため、変更機能利用できない
    test('/changeにPOST：制御による500ステータスとエラーメッセージ', async () => {
      const res = await request(app)
        .post('/change')
        .send({ ...changeData })
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(500)

      expect(res.text).toMatch(/お探しのページは見つかりませんでした。/i) // タイトル
    })

    // 利用登録をしていないため、解約ページ利用できない
    test('/cancellationにGET：制御による500ステータスとエラーメッセージ', async () => {
      const res = await request(app)
        .get('/cancellation')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(500)

      expect(res.text).toMatch(/お探しのページは見つかりませんでした。/i) // タイトル
    })

    // 利用登録をしていないため、解約機能利用できない
    test('/cancellationにPOST：制御による500ステータスとエラーメッセージ', async () => {
      const res = await request(app)
        .post('/cancellation')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(500)

      expect(res.text).toMatch(/お探しのページは見つかりませんでした。/i) // タイトル
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

    // 利用登録後、ユーザコンテキスト変更
    test('ユーザコンテキスト変更', async () => {
      const res = await request(app)
        .get('/portal')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(200)

      expect(res.text).toMatch(/ポータル - BConnectionデジタルトレード/i) // タイトルが含まれていること
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

    let userCsrf
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

    let userCsrf
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

      expect(hrefResult).toBe('https://support.ntt.com/bconnection/information/search')
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

      expect(hrefResult).toBe('https://support.ntt.com/bconnection/information/search')
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
        headless: true,
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

        const consturctRssUrl = 'https://support.ntt.com/bconnection/information/search'
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

    let userCsrf
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
    test('管理者、契約ステータス：00, 契約者名不正な値', async () => {
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
    test('管理者、契約ステータス：00, 契約者カナ名未入力', async () => {
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
    test('管理者、契約ステータス：00, 契約者カナ名不正な値', async () => {
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
    test('管理者、契約ステータス：00, 郵便番号未入力', async () => {
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
    test('管理者、契約ステータス：00, 郵便番号不正な値', async () => {
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
    test('管理者、契約ステータス：00, 住所未入力', async () => {
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
    test('管理者、契約ステータス：00, 番地未入力', async () => {
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
    test('管理者、契約ステータス：00, 番地不正な値', async () => {
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
    test('管理者、契約ステータス：00, 連絡先担当者名未入力', async () => {
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
    test('管理者、契約ステータス：00, 連絡先担当者名不正な値', async () => {
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
    test('管理者、契約ステータス：00, 連絡先電話番号未入力', async () => {
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

    // 連絡先電話番号不正な値
    test('管理者、契約ステータス：00, 連絡先電話番号不正な値', async () => {
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
        await page.type('#contactMail', 'test@test.co.jp')

        await page.waitForTimeout(500)

        await page.click('#next-btn')
        const checkErrorMessage = await page.evaluate(() => {
          return document.querySelector('#contactPhoneNumberWorngInput').getAttribute('class')
        })
        expect(checkErrorMessage).toBe('input-label-required')
      }
      await browser.close()
    })

    // 連絡先メールアドレス未入力
    test('管理者、契約ステータス：00, 連絡先メールアドレス未入力', async () => {
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
    test('管理者、契約ステータス：00, 連絡先メールアドレス不正な値', async () => {
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
        .expect(500)

      expect(res.text).toMatch(/お探しのページは見つかりませんでした。/i)
    })

    test('一般ユーザ、契約ステータス：99, /change', async () => {
      // 契約ステータス変更(利用登録済み)
      await db.Contract.update({ contractStatus: '99' }, { where: { tenantId: testTenantId } })
      const res = await request(app)
        .get('/change')
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
        .expect(500)

      expect(res.text).toMatch(/お探しのページは見つかりませんでした。/i)
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
        .expect(500)

      expect(res.text).toMatch(/お探しのページは見つかりませんでした。/i)
    })

    test('一般ユーザ、契約ステータス：99, /cancellation', async () => {
      // 契約ステータス変更(利用登録済み)
      await db.Contract.update({ contractStatus: '99' }, { where: { tenantId: testTenantId } })
      const res = await request(app)
        .get('/cancellation')
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
        .expect(500)

      expect(res.text).toMatch(/お探しのページは見つかりませんでした。/i)
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
        const downloadFilePath = path.resolve(`${downloadPath}${path.sep}${fileName}`)
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
        const downloadFilePath = path.resolve(`${downloadPath}${path.sep}${fileName}`)
        const downloadFile = fs.readFileSync(downloadFilePath, {
          encoding: 'utf-8',
          flag: 'r'
        })

        const originFilePath = path.resolve(
          '../Application/public/html/【Bconnectionデジタルトレードアプリ】操作マニュアル_請求書一括作成.pdf'
        )
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
        const downloadFilePath = path.resolve(`${downloadPath}${path.sep}${fileName}`)
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
        const downloadFilePath = path.resolve(`${downloadPath}${path.sep}${fileName}`)
        const downloadFile = fs.readFileSync(downloadFilePath, {
          encoding: 'utf-8',
          flag: 'r'
        })

        const originFilePath = path.resolve(
          '../Application/public/html/【Bconnectionデジタルトレードアプリ】操作マニュアル_請求書一括作成.pdf'
        )
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
        .expect(500)

      expect(res.text).toMatch(/お探しのページは見つかりませんでした。/i)
    })

    test('一般ユーザ、契約ステータス：99, /portal', async () => {
      // 契約ステータス変更(利用登録済み)
      await db.Contract.update({ contractStatus: '99' }, { where: { tenantId: testTenantId } })
      const res = await request(app)
        .get('/portal')
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
        .expect(500)

      expect(res.text).toMatch(/お探しのページは見つかりませんでした。/i)
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

    let userCsrf
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

    let userCsrf
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

      expect(res.text).toMatch(/ポータル - BConnectionデジタルトレード/i) // タイトルが含まれていること
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
