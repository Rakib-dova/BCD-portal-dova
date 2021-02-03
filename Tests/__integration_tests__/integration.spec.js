'use strict'

const app = require('../../Application/app')
const request = require('supertest')

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
  await page.evaluate((body) => body.querySelector('button#proceed').click(), await page.$('body'))

  // Oauth2認証後、ヘッドレスブラウザ内ではアプリにリダイレクトしている
  await page.waitForTimeout(10000) // 10秒待つことにする

  expect(await page.title()).toMatch(/BConnectionデジタルトレード/i)
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
      // --------------------アカウント管理者のCookieを取得---------------
      acCookies = await getCookies('hirokit.watanabe@ntt.com', 'watta05250525') // update me
      // ---------------------一般ユーザのCookieを取得--------------------
      userCookies = await getCookies('ts.ntt.test+mem@gmail.com', 'ts00330033') // update me

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

  describe('DBにアカウント管理者・一般ユーザ登録なし/アカウント管理者としてリクエスト', () => {
    test('/indexにアクセス：/portalにリダイレクト', async () => {
      const res = await request(app)
        .get('/')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(303)

      expect(res.header.location).toBe('/auth') // リダイレクト先は/tenant/register
    })

    test('/portalにアクセス：/tenant/registerにリダイレクト', async () => {
      const res = await request(app)
        .get('/portal')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(303)

      expect(res.header.location).toBe('/tenant/register') // リダイレクト先は/tenant/register
    })

    // アカウント管理者のためuser/registerはアクセスできない
    test('/user/registerにアクセス：400 エラー', async () => {
      const res = await request(app)
        .get('/user/register')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(400)

      expect(res.text).toMatch(/不正なページからアクセスされたか、セッションタイムアウトが発生しました。/i) // タイトル
    })

    // アカウント管理者のためuser/registerにポストできない
    test('/user/registerにPOST：400 エラー', async () => {
      const res = await request(app)
        .post('/user/register')
        .type('form')
        .send({ termsCheck: 'on' })
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(400)

      expect(res.text).toMatch(/不正なページからアクセスされたか、セッションタイムアウトが発生しました。/i) // タイトル
    })

    test('/tenant/registerにアクセス：200 OK', async () => {
      const res = await request(app)
        .get('/tenant/register')
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(200)

      expect(res.text).toMatch(/利用登録 - BConnectionデジタルトレード/i) // タイトル
    })

    test('/tenant/registerにPOST：/portalにリダイレクト', async () => {
      const res = await request(app)
        .post('/tenant/register')
        .type('form')
        .send({ termsCheck: 'on' })
        .set('Cookie', acCookies[0].name + '=' + acCookies[0].value)
        .expect(303) // 303リダイレクトに直す？

      expect(res.header.location).toBe('/portal') // リダイレクト先は/portal

      // expect(portalRes.text).not.toMatch(/ポータル - BConnectionデジタルトレード/i) // タイトルが含まれていること
    })
  })
  describe('DBにアカウント管理者のみ登録・一般ユーザ登録なし/一般ユーザとしてリクエスト', () => {
    // ひとつ前のテストにより既にアカウント管理者がDBに登録されている
    test('/indexにアクセス：/portalにリダイレクト', async () => {
      const res = await request(app)
        .get('/')
        .set('Cookie', userCookies[0].name + '=' + userCookies[0].value)
        .expect(303)

      expect(res.header.location).toBe('/auth') // リダイレクト先は/tenant/register
    })
  })
})
