const webdriverUtils = require('../utils/webdriver-utils');
const chai = require('chai');
const chaiWithReporting = require('../utils/chai-with-reporting').chaiWithReporting;
const comment = require('../utils/chai-with-reporting').comment;
const config = require('../autotest-script-config');
const path = require('path');
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

  it("3. 請求書フォーマットアップロード - 行番号なし - 設定画面の確認のみ（NO.44-45）", async function () {
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
      const { loginPage, topPage, tradeShiftTopPage, uploadInvoiceMenuPage, uploadFormatTopPage, uploadFormatCreatePage, uploadFormatSettingPage }
        = common.getPageObject(browser, page);

      // 指定したURLに遷移する
      await page.goto(config.baseUrl);

      // ログインを行う
      await loginPage.doLogin(account.id, account.password);
      await tradeShiftTopPage.waitForLoading();

      // デジタルトレードアプリをクリックする
      await tradeShiftTopPage.clickBcdApp();
      await topPage.waitForLoading();

      // 請求書一括作成メニューを表示する
      await topPage.openUploadInvoiceMenu();
      await uploadInvoiceMenuPage.waitForLoading();

      // 請求書アップロードフォーマット一覧ページに遷移する
      await uploadInvoiceMenuPage.clickUploadFormat();
      await uploadFormatTopPage.waitForLoading();

      // 新規登録ページに遷移する
      await uploadFormatTopPage.clickRegistBtn();
      await uploadFormatCreatePage.waitForLoading();

      // ヘッダーなしのフォーマットファイルをアップロードする
      formatPath = path.resolve('testdata', 'upload', 'format_no_header.csv')
      await uploadFormatCreatePage.uploadFormatFile(formatPath);
      await uploadFormatCreatePage.waitForLoading('"format_no_header.csv"');

      // 各項目に値を設定する
      await uploadFormatCreatePage.setItemName('aaa');
      await uploadFormatCreatePage.setItemNameLine(false);
      await uploadFormatCreatePage.setDefaultNumber('1');

      // 次へをクリックする
      await uploadFormatCreatePage.goNext();
      await uploadFormatSettingPage.waitForLoading('//*[text()="請求書アップロードフォーマット設定"]')

      // 項目名を取得
      headers = await uploadFormatSettingPage.getHeaders();
      headerTexts = JSON.stringify(headers);
      expectedVal = '["","","","","","","","","","","","","","","","","","",""]';
      expect(headerTexts).to.equal(expectedVal, 'CSVのヘッダーが空であること');

      // データ内容を取得
      datas = await uploadFormatSettingPage.getDatas();
      dataTexts = JSON.stringify(datas);
      expectedVal = '["2022/10/8","A0000125","fcde4039-8d4d-4e3e-8b5c-43fca9d6e113","2022/11/8","2022/9/8","備考あああ","銀行名あああ","支店名あああ","当座","1423123","口座名義あああ","その他特記事項あああ","1","明細１","2","個","10000","消費税","備考あああ"]'
      expect(dataTexts).to.equal(expectedVal, '取り込んだCSVのデータが正しいこと');

      await page.waitForTimeout(1000);
    }
  });
});
