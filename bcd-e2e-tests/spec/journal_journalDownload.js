const webdriverUtils = require('../utils/webdriver-utils');
const chai = require('chai');
const chaiWithReporting = require('../utils/chai-with-reporting').chaiWithReporting;
const comment = require('../utils/chai-with-reporting').comment;
const config = require('../autotest-script-config');
const fs = require('fs');
const { parse } = require('csv-parse/sync');
const common = require('./common');

const expect = chai.expect;
chai.use(chaiWithReporting);

let browser, accounts, contextOption, page;

webdriverUtils.setReporter();

describe('仕訳情報設定_仕訳情報ダウンロード', function () {
  beforeAll(async function () {
    // テストの初期化を実施
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 3600000;
    const browserInfo = await common.initTest();
    browser = browserInfo.browserType;
    accounts = browserInfo.accounts;
    contextOption = browserInfo.contextOption;
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

  it("129. データ有", async function () {
    // 各アカウントごとにテストを実施
    for (const account of accounts) {
      const context = await browser.newContext(contextOption);
      if (page != null) {
        page.close();
      }
      page = await context.newPage();

      global.reporter.setBrowserInfo(browser, page);
      if (account.type == 'manager') {
        await comment('---------- 管理者アカウント ----------')
      } else if (account.type == 'user') {
        await comment('---------- 一般ユーザー ----------')
        await comment('一般ユーザーは対象外です。')
        continue;
      } else {
        await comment('---------- その他アカウント ----------')
        await comment('その他アカウントは対象外です。')
        continue;
      }

      // ページオブジェクト
      const { loginPage, topPage, tradeShiftTopPage, journalMenuPage, paymentRequestListPage, journalDetailPage, journalDownloadPage }
        = common.getPageObject(browser, page);

      // 指定したURLに遷移する
      await comment('Tradeshiftログインページへ移動する');
      await page.goto(config.baseUrl);

      // ログインを行う
      await comment('ユーザ"' + account.id + '"でログインする');
      await loginPage.doLogin(account.id, account.password);
      await tradeShiftTopPage.waitForLoading();

      // デジタルトレードアプリをクリックする
      await comment('デジタルトレードアプリのアイコンをクリックする');
      await tradeShiftTopPage.clickBcdApp();
      await topPage.waitForLoading();

      // 支払依頼一覧から、仕訳情報の詳細を取得する
      let invoiceNo = 'A0000125';
      await comment('「仕訳情報管理」をクリックする');
      await topPage.openJournalMenu();
      await journalMenuPage.waitForLoading();
      await comment('「支払依頼一覧」をクリックする');
      await journalMenuPage.clickPaymentRequest();
      await paymentRequestListPage.waitForLoading();
      await comment('「仕訳情報設定」をクリックする');
      await paymentRequestListPage.clickDetail(invoiceNo);
      await journalDetailPage.waitForLoading();
      let sender = await journalDetailPage.getSender();
      let expected = await journalDetailPage.getAllBreakdown();

      // デジタルトレードアプリのホームへ遷移する
      await comment('「Home」をクリックする');
      await journalDetailPage.clickHome();
      await topPage.waitForLoading();

      // 仕訳情報管理メニューを開く
      await comment('「仕訳情報管理」をクリックする');
      await topPage.openJournalMenu();
      await journalMenuPage.waitForLoading();

      // 仕訳情報ダウンロードページへ遷移する
      await comment('「仕訳情報ダウンロード」をクリックする');
      await journalMenuPage.clickJournalDownload();
      await journalDownloadPage.waitForLoading();

      // 条件を入力する
      await journalDownloadPage.inputConditions(invoiceNo, '2021-04-01', '2023-03-31', sender);
      let csvPath = await journalDownloadPage.download();

      // CSVデータがダウンロードされ、GQ列～ID列に設定した仕訳情報が入力されていること
      expect(await fs.existsSync(csvPath)).to.equal(true, 'CSVデータがダウンロードされること');
      let actual = await getCsvData(csvPath);
      for (i = 0; i < expected.length; i++) {
        expect(actual[0]['仕訳情報' + (i + 1) + '-勘定科目コード']).to.equal(expected[i].accountCode, '仕訳情報' + (i + 1) + '-勘定科目コードが出力されていること');
        expect(actual[0]['仕訳情報' + (i + 1) + '-補助科目コード']).to.equal(expected[i].subAccountCode, '仕訳情報' + (i + 1) + '-補助科目コードが出力されていること');
        expect(actual[0]['仕訳情報' + (i + 1) + '-部門コード']).to.equal(expected[i].departmentCode, '仕訳情報' + (i + 1) + '-部門コードが出力されていること');
        expect(actual[0]['仕訳情報' + (i + 1) + '-計上金額']).to.equal(expected[i].cost.replaceAll(/,/g, ''), '仕訳情報' + (i + 1) + '-計上金額が出力されていること');
      }
      await page.waitForTimeout(1000);
    }
  });
});

// CSVファイルをの中身を取得する
async function getCsvData(csvPath) {
  let tmpData = fs.readFileSync(csvPath, 'utf-8');
  tmpData = tmpData.replace(/\r?\n/g, '\r\n'); // 改行コードを\r\nに統一する
  tmpData = tmpData.replace(/\ufeff/g, ''); // BOMを削除する
  return parse(tmpData, { columns: true });
};
