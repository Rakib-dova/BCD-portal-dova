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
    // テストのタイムアウト時間を設定する（1時間）
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

  // テストを初期化する
  async function initBrowser() {
    if (browser == null) {
      const browserInfo = await common.initTest();
      browser = browserInfo.browserType;
      accounts = browserInfo.accounts;
      contextOption = browserInfo.contextOption;
    }
  };

  // トップページまで遷移する
  async function gotoTop(account, loginPage, tradeShiftTopPage, topPage) {
    // 指定したURLに遷移する
    await comment('Tradeshiftログインページへ移動する');
    await page.goto(config.baseUrl);

    // ログインを行う
    await comment('ユーザ"' + account.id + '"でログインする');
    await loginPage.doLogin(account.id, account.password);
    await tradeShiftTopPage.waitForLoading();

    // デジタルトレードアプリをクリックする
    let appName = process.env.APP ? process.env.APP : config.appName;
    appName = appName.replace(/\"/g, '');
    await comment('アイコン「' + appName + '」をクリックする');
    await tradeShiftTopPage.clickBcdApp(appName);
    await topPage.waitForLoading();
  };

  // 任意の請求書番号を含む、仕訳情報をダウンロードする
  async function download(account, invoiceNo, startDate, endDate, checkFinalApproval, hasData) {
    // テストの初期化を実施
    await initBrowser();
    const context = await browser.newContext(contextOption);
    if (page != null) {
      page.close();
    }
    page = await context.newPage();
    global.reporter.setBrowserInfo(browser, page);

    // ページオブジェクト
    const { loginPage, topPage, tradeShiftTopPage, journalMenuPage, paymentRequestListPage, journalDetailPage, journalDownloadPage }
      = common.getPageObject(browser, page);

    // デジタルトレードアプリのトップページへ遷移する
    await gotoTop(account, loginPage, tradeShiftTopPage, topPage);

    // 支払依頼一覧から、仕訳情報の詳細を取得する
    await comment('「仕訳情報管理」をクリックする');
    await topPage.openJournalMenu();
    await journalMenuPage.waitForLoading();
    await journalMenuPage.clickPaymentRequest();
    await paymentRequestListPage.waitForLoading();
    await paymentRequestListPage.clickDetail(invoiceNo);
    await journalDetailPage.waitForLoading();
    let sender = await journalDetailPage.getSender();
    let expected = await journalDetailPage.getAllBreakdown();

    // デジタルトレードアプリのホームへ遷移する
    await journalDetailPage.clickHome();
    await topPage.waitForLoading();

    // 仕訳情報管理メニューを開く
    await comment('「仕訳情報管理」をクリックする');
    await topPage.openJournalMenu();
    await journalMenuPage.waitForLoading();

    // 仕訳情報ダウンロードページへ遷移する
    await journalMenuPage.clickJournalDownload();
    await journalDownloadPage.waitForLoading();

    // ダウンロード対象の選択肢が追加されていること
    expect(await journalDownloadPage.isFinalApprovalChecked()).to.equal(true, '【仕訳情報ダウンロード】ダウンロード対象の選択肢が追加されていること');

    // 条件を入力する
    await journalDownloadPage.inputConditions(invoiceNo, startDate, endDate, sender, checkFinalApproval);

    // ダウンロードする
    if (!hasData) {
      expect(await journalDownloadPage.downloadNG()).to.equal('条件に合致する請求書が見つかりませんでした。', '【仕訳情報ダウンロード】「条件に合致する請求書が見つかりませんでした。」ポップアップが表示されること');
      await page.waitForTimeout(1000);
      return;
    }
    let csvPath = await journalDownloadPage.download();

    // CSVデータがダウンロードされ、GQ列～ID列に設定した仕訳情報が入力されていること
    expect(await fs.existsSync(csvPath)).to.equal(true, '【仕訳情報ダウンロード】CSVデータがダウンロードされること');
    let actual = await getCsvData(csvPath);
    for (i = 0; i < expected.length; i++) {
      expect(actual[0]['仕訳情報' + (i + 1) + '-借方勘定科目コード']).to.equal(expected[i].accountCode, '仕訳情報' + (i + 1) + '-勘定科目コードが出力されていること');
      expect(actual[0]['仕訳情報' + (i + 1) + '-借方補助科目コード']).to.equal(expected[i].subAccountCode, '仕訳情報' + (i + 1) + '-補助科目コードが出力されていること');
      expect(actual[0]['仕訳情報' + (i + 1) + '-借方部門コード']).to.equal(expected[i].departmentCode, '仕訳情報' + (i + 1) + '-部門コードが出力されていること');
      expect(actual[0]['仕訳情報' + (i + 1) + '-計上金額']).to.equal(expected[i].cost.replaceAll(/,/g, ''), '仕訳情報' + (i + 1) + '-計上金額が出力されていること');
    }
    await page.waitForTimeout(1000);
  }

  /**
   * STEP5_No.129
   * STEP7_No.113
   */
  it("データ有", async function () {
    await download(config.company1.mng, 'fcde40392', '2021-04-01', '2023-03-31', false, true);
  });

  /**
   * STEP7_No.113,116
   */
   it("データ無", async function () {
    await download(config.company1.mng, 'fcde40392', '2021-04-01', '2023-03-31', true, false);
  });
});

// CSVファイルをの中身を取得する
async function getCsvData(csvPath) {
  let tmpData = fs.readFileSync(csvPath, 'utf-8');
  tmpData = tmpData.replace(/\r?\n/g, '\r\n'); // 改行コードを\r\nに統一する
  tmpData = tmpData.replace(/\ufeff/g, ''); // BOMを削除する
  return parse(tmpData, { columns: true });
};
