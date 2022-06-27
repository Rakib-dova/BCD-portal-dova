const webdriverUtils = require('../utils/webdriver-utils');
const chai = require('chai');
const chaiWithReporting = require('../utils/chai-with-reporting').chaiWithReporting;
const comment = require('../utils/chai-with-reporting').comment;
const config = require('../autotest-script-config');
const common = require('./common');

const expect = chai.expect;
chai.use(chaiWithReporting);

let browser;

webdriverUtils.setReporter();

describe('リグレッションテスト', function () {

  beforeAll(async function () {
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 3600000;
  });

  beforeEach(async function () {
  });

  afterEach(async function () {
  });

  afterAll(async function () {
    global.reporter.setCloseDriver(async () => {
      await browser.close();
    });
  });

  it("7. 提携サービス導線・OGPファビコン", async function () {
    // テストの初期化を実施
    const { browserType, accounts, contextOption } = await common.initTest();
    // ブラウザ変数をグローバルに設定
    browser = browserType;
    // 各アカウントごとにテストを実施
    for (const account of accounts) {
      const context = await browser.newContext(contextOption);
      const page = await context.newPage();

      global.reporter.setBrowserInfo(browser, page);
      if (account.type == 'manager') {
        await comment('---------- 管理者アカウント ----------')
      } else if (account.type == 'user') {
        await comment('---------- 一般ユーザー ----------')
      } else {
        await comment('---------- その他アカウント ----------')
      }

      // ページオブジェクト
      const { loginPage, topPage, tradeShiftTopPage, settlementPage, rakkoToolsPage }
        = common.getPageObject(browser, page);

      // 指定したURLに遷移する
      await page.goto(config.baseUrl);

      // ログインを行う
      await loginPage.doLogin(account.id, account.password);
      await tradeShiftTopPage.waitForLoading();

      // デジタルトレードアプリをクリックする
      let appName = process.env.APP ? process.env.APP : config.appName;
      appName = appName.replace(/\"/g, '');
      await tradeShiftTopPage.clickBcdApp(appName);
      await topPage.waitForLoading();

      // 「銀行振込消印」ダイアログを開く
      await topPage.openSettlementDialog();
      await settlementPage.waitForLoading();

      // 銀行振込消込サービスの紹介文とリンクを確認する
      expect(await settlementPage.getText()).to.equal('銀行振込消込【本サービスはNTTスマートトレード株式会社が提供する提携サービスとなります】 銀行振込消込サービスではお取引先様向けの専用振込口座番号をご用意いたします。 BConnectionデジタルトレードで発行する請求書にこの口座番号を記載いただくと本口座に入金のあった振込は振込名義人がどのように記載されるかに関わらずご請求先様からの振込と認識できるようになります。 メリット ・名義人の確認が不要に。煩わしいカナ名の確認が不要になります ・入金の通知を電文・メールで受け取ることができます ・ほぼリアルタイムで入金確認（最大タイムラグ15分）ができます お問合せ・お申込みは下記リンクから。※リンク先は外部サイトとなります。https://www.nttsmarttrade.co.jp/bconnection_lp/', '銀行振込消込サービスの紹介文とリンクが正しいこと');

      // お問合せリンクをクリックして、リンク先URLを取得する
      expect(await settlementPage.getContactLinkUrl()).to.equal('https://www.nttsmarttrade.co.jp/bconnection_lp/', '銀行振込消込の紹介ページに遷移すること');

      // 「x」ボタンをクリックし、ダイアログを閉じる
      await settlementPage.closeDialog();
      await topPage.waitForLoading();
      expect(await topPage.getInformationTab()).to.equal('お知らせ', 'ダイアログが閉じられること');

      // OGP確認サイトのURLに遷移する
      await page.goto('https://rakko.tools/tools/9/');
      // チェック対象のURLを設定する
      await rakkoToolsPage.setUrl('https://www.prodstg.tsdev.biz/introduction');
      // twitterのシミュレーション画面のテキストを確認する
      expect(JSON.stringify(await rakkoToolsPage.getTexts())).to.equal('{"twitterPc":"BConnectionデジタルトレードBConnectionデジタルトレードは請求書電子化支援サービスです。インボイス制度に対応しており、電子帳簿保存法に準拠しているため、法制度の変更に対応した上で業務の効率化も実現できます。","twitterSp":"BConnectionデジタルトレード","twitterLPc":"BConnectionデジタルトレードBConnectionデジタルトレードは請求書電子化支援サービスです。インボイス制度に対応しており、電子帳簿保存法に準拠しているため、法制度の変更に対応した上で業務の効率化も実現できます。","twitterLSp":"BConnectionデジタルトレードBConnectionデジタルトレードは請求書電子化支援サービスです。インボイス制度に対応しており、電子帳簿保存法に準拠しているため、法制度の変更に対応した上で業務の効率化も実現できます。"}', 'twitterのシミュレーション画面のテキストが正しく表示されていること');

      await page.waitForTimeout(1000);
    }
  });
});
