'use strict'
const app = require('../../Application/app')
const request = require('supertest')
const getTenantId = {}

jest.setTimeout(60000) // jestのタイムアウトを60秒とする

const getCookies = require('./getCookies')

describe('仕訳情報ダウンロードのインテグレーションテスト', () => {
  let acStatus
  let userStatus
  let acStatus10
  let userStatus10
  let acStatus11
  let userStatus11
  let acStatus00
  let userStatus00
  let acStatus40
  let userStatus40
  let acStatus41
  let userStatus41
  let acStatus30
  let userStatus30
  let acStatus31
  let userStatus31
  let acStatus99
  let userStatus99

  describe('1.契約ステータス：未登録', () => {
    test('/authにアクセス：oauth2認証をし、セッション用Cookieを取得', async () => {
      // アカウント管理者と一般ユーザのID/SECRETは、テストコマンドの引数から取得
      acStatus = await getCookies(app, request, getTenantId, 'inte.test.user+@gmail.com', '1q2w3e4r5t')
      userStatus = await getCookies(app, request, getTenantId, 'inte.test.user+user@gmail.com', '1q2w3e4r5t')
    })

    // 利用登録をしていないため、仕訳情報ダウンロードページ利用できない
    test('管理者、契約ステータス：未登録、利用不可', async () => {
      const cookieAdmin = `${acStatus[0].name}=${acStatus[0].value}`
      const res = await request(app).get('/journalDownload').set('Cookie', cookieAdmin).expect(500)

      expect(res.text).toMatch(/上部メニューのHOMEボタンを押下し、トップページへお戻りください。/i) // タイトル
    })

    test('一般ユーザ、契約ステータス：未登録、利用不可', async () => {
      const cookieUser = `${userStatus[0].name}=${userStatus[0].value}`
      const res = await request(app).get('/journalDownload').set('Cookie', cookieUser).expect(500)

      expect(res.text).toMatch(/上部メニューのHOMEボタンを押下し、トップページへお戻りください。/i) // タイトル
    })
  })

  describe('3.契約ステータス：登録申込', () => {
    test('/authにアクセス：oauth2認証をし、セッション用Cookieを取得', async () => {
      // アカウント管理者と一般ユーザのID/SECRETは、テストコマンドの引数から取得
      acStatus10 = await getCookies(app, request, getTenantId, 'inte.test.user+10@gmail.com', '1q2w3e4r5t')
      userStatus10 = await getCookies(app, request, getTenantId, 'inte.test.user+10user@gmail.com', '1q2w3e4r5t')
    })

    test('管理者、契約ステータス：登録申込、利用可能', async () => {
      const cookie10Admin = `${acStatus10[0].name}=${acStatus10[0].value}`
      const res = await request(app).get('/journalDownload').set('Cookie', cookie10Admin).expect(200)

      expect(res.text).toMatch(/- BConnectionデジタルトレード/i) // タイトルが含まれていること
      expect(res.text).toMatch(/請求書番号/i) // 請求書番号ラベルがあること
      expect(res.text).toMatch(/発行日/i) // 発行日ラベルがあること
      expect(res.text).toMatch(/送信企業/i) // 送信企業ラベルがあること
      expect(res.text).toMatch(/ダウンロード対象/i) // ダウンロード対象ラベルがあること
      expect(res.text).toMatch(/最終承認済みの請求書/i) // 最終承認済みの請求書チェックボックスがあること
      expect(res.text).toMatch(/仕訳済みの請求書/i) // 仕訳済みの請求書チェックボックスがあること
      expect(res.text).toMatch(/出力フォーマット/i) // 出力フォーマットラベルがあること
      expect(res.text).toMatch(/デフォルト/i) // デフォルトのドロップボックスがあること
      expect(res.text).toMatch(/弥生会計（05以降）/i) // 弥生会計（05以降）ドロップボックスがあること
    })

    test('一般ユーザ、契約ステータス：登録申込、利用可能', async () => {
      const cookie10User = `${userStatus10[0].name}=${userStatus10[0].value}`
      const res = await request(app).get('/journalDownload').set('Cookie', cookie10User).expect(200)

      expect(res.text).toMatch(/- BConnectionデジタルトレード/i) // タイトルが含まれていること
      expect(res.text).toMatch(/請求書番号/i) // 請求書番号ラベルがあること
      expect(res.text).toMatch(/発行日/i) // 発行日ラベルがあること
      expect(res.text).toMatch(/送信企業/i) // 送信企業ラベルがあること
      expect(res.text).toMatch(/ダウンロード対象/i) // ダウンロード対象ラベルがあること
      expect(res.text).toMatch(/最終承認済みの請求書/i) // 最終承認済みの請求書チェックボックスがあること
      expect(res.text).toMatch(/仕訳済みの請求書/i) // 仕訳済みの請求書チェックボックスがあること
      expect(res.text).toMatch(/出力フォーマット/i) // 出力フォーマットラベルがあること
      expect(res.text).toMatch(/デフォルト/i) // デフォルトのドロップボックスがあること
      expect(res.text).toMatch(/弥生会計（05以降）/i) // 弥生会計（05以降）ドロップボックスがあること
    })
  })

  describe('4.契約ステータス：登録受付', () => {
    test('/authにアクセス：oauth2認証をし、セッション用Cookieを取得', async () => {
      // アカウント管理者と一般ユーザのID/SECRETは、テストコマンドの引数から取得
      acStatus11 = await getCookies(app, request, getTenantId, 'inte.test.user+11@gmail.com', '1q2w3e4r5t')
      userStatus11 = await getCookies(app, request, getTenantId, 'inte.test.user+11user@gmail.com', '1q2w3e4r5t')
    })

    test('管理者、契約ステータス：登録受付、利用可能', async () => {
      const cookie11Admin = `${acStatus11[0].name}=${acStatus11[0].value}`
      const res = await request(app).get('/journalDownload').set('Cookie', cookie11Admin).expect(200)

      expect(res.text).toMatch(/- BConnectionデジタルトレード/i) // タイトルが含まれていること
      expect(res.text).toMatch(/請求書番号/i) // 請求書番号ラベルがあること
      expect(res.text).toMatch(/発行日/i) // 発行日ラベルがあること
      expect(res.text).toMatch(/送信企業/i) // 送信企業ラベルがあること
      expect(res.text).toMatch(/ダウンロード対象/i) // ダウンロード対象ラベルがあること
      expect(res.text).toMatch(/最終承認済みの請求書/i) // 最終承認済みの請求書チェックボックスがあること
      expect(res.text).toMatch(/仕訳済みの請求書/i) // 仕訳済みの請求書チェックボックスがあること
      expect(res.text).toMatch(/出力フォーマット/i) // 出力フォーマットラベルがあること
      expect(res.text).toMatch(/デフォルト/i) // デフォルトのドロップボックスがあること
      expect(res.text).toMatch(/弥生会計（05以降）/i) // 弥生会計（05以降）ドロップボックスがあること
    })

    test('一般ユーザ、契約ステータス：登録受付、利用可能', async () => {
      const cookie11User = `${userStatus11[0].name}=${userStatus11[0].value}`
      const res = await request(app).get('/journalDownload').set('Cookie', cookie11User).expect(200)

      expect(res.text).toMatch(/- BConnectionデジタルトレード/i) // タイトルが含まれていること
      expect(res.text).toMatch(/請求書番号/i) // 請求書番号ラベルがあること
      expect(res.text).toMatch(/発行日/i) // 発行日ラベルがあること
      expect(res.text).toMatch(/送信企業/i) // 送信企業ラベルがあること
      expect(res.text).toMatch(/ダウンロード対象/i) // ダウンロード対象ラベルがあること
      expect(res.text).toMatch(/最終承認済みの請求書/i) // 最終承認済みの請求書チェックボックスがあること
      expect(res.text).toMatch(/仕訳済みの請求書/i) // 仕訳済みの請求書チェックボックスがあること
      expect(res.text).toMatch(/出力フォーマット/i) // 出力フォーマットラベルがあること
      expect(res.text).toMatch(/デフォルト/i) // デフォルトのドロップボックスがあること
      expect(res.text).toMatch(/弥生会計（05以降）/i) // 弥生会計（05以降）ドロップボックスがあること
    })
  })

  describe('5.契約ステータス：契約中', () => {
    test('/authにアクセス：oauth2認証をし、セッション用Cookieを取得', async () => {
      // アカウント管理者と一般ユーザのID/SECRETは、テストコマンドの引数から取得
      acStatus00 = await getCookies(app, request, getTenantId, 'inte.test.user+00@gmail.com', '1q2w3e4r5t')
      userStatus00 = await getCookies(app, request, getTenantId, 'inte.test.user+00user@gmail.com', '1q2w3e4r5t')
    })

    test('管理者、契約ステータス：契約中、利用可能', async () => {
      const cookie00Admin = `${acStatus00[0].name}=${acStatus00[0].value}`
      const res = await request(app).get('/journalDownload').set('Cookie', cookie00Admin).expect(200)

      expect(res.text).toMatch(/- BConnectionデジタルトレード/i) // タイトルが含まれていること
      expect(res.text).toMatch(/請求書番号/i) // 請求書番号ラベルがあること
      expect(res.text).toMatch(/発行日/i) // 発行日ラベルがあること
      expect(res.text).toMatch(/送信企業/i) // 送信企業ラベルがあること
      expect(res.text).toMatch(/ダウンロード対象/i) // ダウンロード対象ラベルがあること
      expect(res.text).toMatch(/最終承認済みの請求書/i) // 最終承認済みの請求書チェックボックスがあること
      expect(res.text).toMatch(/仕訳済みの請求書/i) // 仕訳済みの請求書チェックボックスがあること
      expect(res.text).toMatch(/出力フォーマット/i) // 出力フォーマットラベルがあること
      expect(res.text).toMatch(/デフォルト/i) // デフォルトのドロップボックスがあること
      expect(res.text).toMatch(/弥生会計（05以降）/i) // 弥生会計（05以降）ドロップボックスがあること
    })

    test('一般ユーザ、契約ステータス：契約中、利用可能', async () => {
      const cookie00User = `${userStatus00[0].name}=${userStatus00[0].value}`
      const res = await request(app).get('/journalDownload').set('Cookie', cookie00User).expect(200)

      expect(res.text).toMatch(/- BConnectionデジタルトレード/i) // タイトルが含まれていること
      expect(res.text).toMatch(/請求書番号/i) // 請求書番号ラベルがあること
      expect(res.text).toMatch(/発行日/i) // 発行日ラベルがあること
      expect(res.text).toMatch(/送信企業/i) // 送信企業ラベルがあること
      expect(res.text).toMatch(/ダウンロード対象/i) // ダウンロード対象ラベルがあること
      expect(res.text).toMatch(/最終承認済みの請求書/i) // 最終承認済みの請求書チェックボックスがあること
      expect(res.text).toMatch(/仕訳済みの請求書/i) // 仕訳済みの請求書チェックボックスがあること
      expect(res.text).toMatch(/出力フォーマット/i) // 出力フォーマットラベルがあること
      expect(res.text).toMatch(/デフォルト/i) // デフォルトのドロップボックスがあること
      expect(res.text).toMatch(/弥生会計（05以降）/i) // 弥生会計（05以降）ドロップボックスがあること
    })
  })

  describe('6.契約ステータス：変更申込', () => {
    test('/authにアクセス：oauth2認証をし、セッション用Cookieを取得', async () => {
      // アカウント管理者と一般ユーザのID/SECRETは、テストコマンドの引数から取得
      acStatus40 = await getCookies(app, request, getTenantId, 'inte.test.user+40@gmail.com', '1q2w3e4r5t')
      userStatus40 = await getCookies(app, request, getTenantId, 'inte.test.user+40user@gmail.com', '1q2w3e4r5t')
    })

    test('管理者、契約ステータス：変更申込、利用可能', async () => {
      const cookie40Admin = `${acStatus40[0].name}=${acStatus40[0].value}`
      const res = await request(app).get('/journalDownload').set('Cookie', cookie40Admin).expect(200)

      expect(res.text).toMatch(/- BConnectionデジタルトレード/i) // タイトルが含まれていること
      expect(res.text).toMatch(/請求書番号/i) // 請求書番号ラベルがあること
      expect(res.text).toMatch(/発行日/i) // 発行日ラベルがあること
      expect(res.text).toMatch(/送信企業/i) // 送信企業ラベルがあること
      expect(res.text).toMatch(/ダウンロード対象/i) // ダウンロード対象ラベルがあること
      expect(res.text).toMatch(/最終承認済みの請求書/i) // 最終承認済みの請求書チェックボックスがあること
      expect(res.text).toMatch(/仕訳済みの請求書/i) // 仕訳済みの請求書チェックボックスがあること
      expect(res.text).toMatch(/出力フォーマット/i) // 出力フォーマットラベルがあること
      expect(res.text).toMatch(/デフォルト/i) // デフォルトのドロップボックスがあること
      expect(res.text).toMatch(/弥生会計（05以降）/i) // 弥生会計（05以降）ドロップボックスがあること
    })

    test('一般ユーザ、契約ステータス：変更申込、利用可能', async () => {
      const cookie40User = `${userStatus40[0].name}=${userStatus40[0].value}`
      const res = await request(app).get('/journalDownload').set('Cookie', cookie40User).expect(200)

      expect(res.text).toMatch(/- BConnectionデジタルトレード/i) // タイトルが含まれていること
      expect(res.text).toMatch(/請求書番号/i) // 請求書番号ラベルがあること
      expect(res.text).toMatch(/発行日/i) // 発行日ラベルがあること
      expect(res.text).toMatch(/送信企業/i) // 送信企業ラベルがあること
      expect(res.text).toMatch(/ダウンロード対象/i) // ダウンロード対象ラベルがあること
      expect(res.text).toMatch(/最終承認済みの請求書/i) // 最終承認済みの請求書チェックボックスがあること
      expect(res.text).toMatch(/仕訳済みの請求書/i) // 仕訳済みの請求書チェックボックスがあること
      expect(res.text).toMatch(/出力フォーマット/i) // 出力フォーマットラベルがあること
      expect(res.text).toMatch(/デフォルト/i) // デフォルトのドロップボックスがあること
      expect(res.text).toMatch(/弥生会計（05以降）/i) // 弥生会計（05以降）ドロップボックスがあること
    })
  })

  describe('7.契約ステータス：変更受付', () => {
    test('/authにアクセス：oauth2認証をし、セッション用Cookieを取得', async () => {
      // アカウント管理者と一般ユーザのID/SECRETは、テストコマンドの引数から取得
      acStatus41 = await getCookies(app, request, getTenantId, 'inte.test.user+41@gmail.com', '1q2w3e4r5t')
      userStatus41 = await getCookies(app, request, getTenantId, 'inte.test.user+41user@gmail.com', '1q2w3e4r5t')
    })

    test('管理者、契約ステータス：変更受付、利用可能', async () => {
      const cookie41Admin = `${acStatus41[0].name}=${acStatus41[0].value}`
      const res = await request(app).get('/journalDownload').set('Cookie', cookie41Admin).expect(200)

      expect(res.text).toMatch(/- BConnectionデジタルトレード/i) // タイトルが含まれていること
      expect(res.text).toMatch(/請求書番号/i) // 請求書番号ラベルがあること
      expect(res.text).toMatch(/発行日/i) // 発行日ラベルがあること
      expect(res.text).toMatch(/送信企業/i) // 送信企業ラベルがあること
      expect(res.text).toMatch(/ダウンロード対象/i) // ダウンロード対象ラベルがあること
      expect(res.text).toMatch(/最終承認済みの請求書/i) // 最終承認済みの請求書チェックボックスがあること
      expect(res.text).toMatch(/仕訳済みの請求書/i) // 仕訳済みの請求書チェックボックスがあること
      expect(res.text).toMatch(/出力フォーマット/i) // 出力フォーマットラベルがあること
      expect(res.text).toMatch(/デフォルト/i) // デフォルトのドロップボックスがあること
      expect(res.text).toMatch(/弥生会計（05以降）/i) // 弥生会計（05以降）ドロップボックスがあること
    })

    test('一般ユーザ、契約ステータス：変更受付、利用可能', async () => {
      const cookie41User = `${userStatus41[0].name}=${userStatus41[0].value}`
      const res = await request(app).get('/journalDownload').set('Cookie', cookie41User).expect(200)

      expect(res.text).toMatch(/- BConnectionデジタルトレード/i) // タイトルが含まれていること
      expect(res.text).toMatch(/請求書番号/i) // 請求書番号ラベルがあること
      expect(res.text).toMatch(/発行日/i) // 発行日ラベルがあること
      expect(res.text).toMatch(/送信企業/i) // 送信企業ラベルがあること
      expect(res.text).toMatch(/ダウンロード対象/i) // ダウンロード対象ラベルがあること
      expect(res.text).toMatch(/最終承認済みの請求書/i) // 最終承認済みの請求書チェックボックスがあること
      expect(res.text).toMatch(/仕訳済みの請求書/i) // 仕訳済みの請求書チェックボックスがあること
      expect(res.text).toMatch(/出力フォーマット/i) // 出力フォーマットラベルがあること
      expect(res.text).toMatch(/デフォルト/i) // デフォルトのドロップボックスがあること
      expect(res.text).toMatch(/弥生会計（05以降）/i) // 弥生会計（05以降）ドロップボックスがあること
    })
  })

  describe('8.契約ステータス：解約申込', () => {
    test('/authにアクセス：oauth2認証をし、セッション用Cookieを取得', async () => {
      // アカウント管理者と一般ユーザのID/SECRETは、テストコマンドの引数から取得
      acStatus30 = await getCookies(app, request, getTenantId, 'inte.test.user+30@gmail.com', '1q2w3e4r5t')
      userStatus30 = await getCookies(app, request, getTenantId, 'inte.test.user+30user@gmail.com', '1q2w3e4r5t')
    })

    test('管理者、契約ステータス：解約申込、利用不可', async () => {
      const cookie30Admin = `${acStatus30[0].name}=${acStatus30[0].value}`
      const res = await request(app).get('/journalDownload').set('Cookie', cookie30Admin).expect(200)

      expect(res.text).toMatch(/現在解約手続き中です。/i) // 画面内容確認
    })

    test('一般ユーザ、契約ステータス：解約申込、利用不可', async () => {
      const cookie30User = `${userStatus30[0].name}=${userStatus30[0].value}`
      const res = await request(app).get('/journalDownload').set('Cookie', cookie30User).expect(200)

      expect(res.text).toMatch(/現在解約手続き中です。/i) // 画面内容確認
    })
  })

  describe('9.契約ステータス：解約受付', () => {
    test('/authにアクセス：oauth2認証をし、セッション用Cookieを取得', async () => {
      // アカウント管理者と一般ユーザのID/SECRETは、テストコマンドの引数から取得
      acStatus31 = await getCookies(app, request, getTenantId, 'inte.test.user+31@gmail.com', '1q2w3e4r5t')
      userStatus31 = await getCookies(app, request, getTenantId, 'inte.test.user+31user@gmail.com', '1q2w3e4r5t')
    })

    test('管理者、契約ステータス：解約受付、利用不可', async () => {
      const cookie31Admin = `${acStatus31[0].name}=${acStatus31[0].value}`
      const res = await request(app).get('/journalDownload').set('Cookie', cookie31Admin).expect(200)

      expect(res.text).toMatch(/現在解約手続き中です。/i) // 画面内容確認
    })

    test('一般ユーザ、契約ステータス：解約受付、利用不可', async () => {
      const cookie31User = `${userStatus31[0].name}=${userStatus31[0].value}`
      const res = await request(app).get('/journalDownload').set('Cookie', cookie31User).expect(200)

      expect(res.text).toMatch(/現在解約手続き中です。/i) // 画面内容確認
    })
  })

  describe('10.契約ステータス：解約', () => {
    test('/authにアクセス：oauth2認証をし、セッション用Cookieを取得', async () => {
      // アカウント管理者と一般ユーザのID/SECRETは、テストコマンドの引数から取得
      acStatus99 = await getCookies(app, request, getTenantId, 'inte.test.user+99@gmail.com', '1q2w3e4r5t')
      userStatus99 = await getCookies(app, request, getTenantId, 'inte.test.user+99user@gmail.com', '1q2w3e4r5t')
    })

    test('管理者、契約ステータス：解約、利用不可', async () => {
      const cookie99Admin = `${acStatus99[0].name}=${acStatus99[0].value}`
      const res = await request(app).get('/journalDownload').set('Cookie', cookie99Admin).expect(500)

      expect(res.text).toMatch(/上部メニューのHOMEボタンを押下し、トップページへお戻りください。/i) // 画面内容確認
    })

    test('一般ユーザ、契約ステータス：解約、利用不可', async () => {
      const cookie99User = `${userStatus99[0].name}=${userStatus99[0].value}`
      const res = await request(app).get('/journalDownload').set('Cookie', cookie99User).expect(500)

      expect(res.text).toMatch(/上部メニューのHOMEボタンを押下し、トップページへお戻りください。/i) // 画面内容確認
    })
  })
})
