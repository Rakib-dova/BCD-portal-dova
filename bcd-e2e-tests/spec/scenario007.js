const { chromium, firefox } = require('playwright');
const webdriverUtils = require('../utils/webdriver-utils');

const chai = require('chai');
const chaiWithReporting = require('../utils/chai-with-reporting').chaiWithReporting;
const comment = require('../utils/chai-with-reporting').comment;

chai.use(chaiWithReporting);
const expect = chai.expect;

const config = require('../autotest-script-config');

const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
// const { stringify } = require('csv-stringify/sync');

const common = require('./common');
const { ActionUtils } = require('../utils/action-utils');
const { SettingMenuPage } = require('../page-objects/SettingMenuPage');

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
    if (process.env.BROWSER == 'EDGE') {
      browser = await webdriverUtils.openEdge(chromium);
    } else if (process.env.BROWSER == 'FIREFOX') {
      browser = await webdriverUtils.openFirefox(firefox);
    } else {
      browser = await webdriverUtils.openChrome(chromium);
    }
    const page = await browser.newPage();

    const actionUtils = new ActionUtils(browser, page);
    global.reporter.setBrowserInfo(browser, page);

    // ページオブジェクト
    const { loginPage, topPage, tradeShiftTopPage, supportMenuPage, uploadInvoiceMenuPage, uploadInvoicePage, uploadFormatTopPage, uploadFormatCreatePage, uploadFormatSettingPage, uploadFormatConfirmPage, uploadFormatModPage, settingMenuPage, contractChangePage, uploadListPage, uploadListDetailPage, settlementPage, rakkoToolsPage }
      = common.getPageObject(browser, page);

    // 指定したURLに遷移する
    await page.goto(config.baseUrl);

    // ログインを行う
    await loginPage.doLogin(config.company1.id, config.company1.password);
    await tradeShiftTopPage.waitForLoading();

    // デジタルトレードアプリをクリックする
    await tradeShiftTopPage.clickBcdApp();
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
  });
});
