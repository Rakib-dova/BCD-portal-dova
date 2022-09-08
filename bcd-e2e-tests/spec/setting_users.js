const webdriverUtils = require('../utils/webdriver-utils');
const chai = require('chai');
const chaiWithReporting = require('../utils/chai-with-reporting').chaiWithReporting;
const config = require('../autotest-script-config');
const fs = require('fs');
const { parse } = require('csv-parse/sync');
const common = require('./common');

const expect = chai.expect;
chai.use(chaiWithReporting);

let browser, contextOption, page;

webdriverUtils.setReporter();

describe('設定_ユーザー一括登録', function () {

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
    if (browser == undefined || browser == null) {
      const browserInfo = await common.initTest();
      browser = browserInfo.browserType;
      contextOption = browserInfo.contextOption;
    }
  };

  /**
   * STEP8_機能改修確認_No.129-132
   */
   it("管理者以外", async function () {
    // テストの初期化を実施
    await initBrowser();
    const context = await browser.newContext(contextOption);
    if (page != null) {
      page.close();
    }
    page = await context.newPage();
    global.reporter.setBrowserInfo(browser, page);

    // ページオブジェクト
    const { topPage, bulkUploadUsersPage } = common.getPageObject(browser, page);

    // ユーザー一括登録ページを表示する
    await common.gotoTop(page, config.company1.user);

    // 設定アイコンが表示されていないこと
    expect(await topPage.isSettingMenuShown()).to.equal(false, '【トップ】設定アイコンが表示されていないこと');

    // ユーザー一括登録の機能が利用できないこと
    await page.goto('https://bcd-portal.tsdev.biz/uploadUsers');
    await bulkUploadUsersPage.waitForLoading();
    expect(await bulkUploadUsersPage.getSubTitle()).to.equal('本機能はご利用いただけません。', '【ユーザー一括登録】ユーザー一括登録の機能が利用できないこと');
  });

  /**
   * STEP8_機能改修確認_No.129-132
   */
  it("管理者", async function () {
    // テストの初期化を実施
    await initBrowser();
    const context = await browser.newContext(contextOption);
    if (page != null) {
      page.close();
    }
    page = await context.newPage();
    global.reporter.setBrowserInfo(browser, page);

    // ページオブジェクト
    const { topPage, settingMenuPage, bulkUploadUsersPage } = common.getPageObject(browser, page);

    // ユーザー一括登録ページを表示する
    await common.gotoTop(page, config.company1.mng);
    await topPage.openSettingMenu();
    await settingMenuPage.waitForLoading();
    await settingMenuPage.clickBulkUploadUsers();
    await bulkUploadUsersPage.waitForLoading();

    // 「ユーザー一括登録」画面に遷移すること
    expect(await bulkUploadUsersPage.getTitle()).to.equal('ユーザー一括登録', '【ユーザー一括登録】「ユーザー一括登録」画面に遷移すること');

    // CSVファイルがダウンロードできること
    let csvPath = await bulkUploadUsersPage.downloadCsv();
    expect(csvPath.length > 0).to.equal(true, '【ユーザー一括登録】CSVファイルがダウンロードできること');
    let csvData = await getCsvData(csvPath, false);
    expect(csvData.length).to.equal(1, '【ユーザー一括登録】アップロード用CSVファイルの内容が1行のみであること');
    expect(csvData[0][0]).to.equal('メールアドレス', '【ユーザー一括登録】先頭行の1列目が"メールアドレス"であること');
    expect(csvData[0][1]).to.equal('ロール', '【ユーザー一括登録】先頭行の2列目が"ロール"であること');
  });
});

// アップロード用CSVファイルのデータを取得する
async function getCsvData(csvPath, columns) {
  let tmpData = fs.readFileSync(csvPath, 'utf-8');
  tmpData = tmpData.replace(/\r?\n/g, '\r\n'); // 改行コードを\r\nに統一する
  tmpData = tmpData.replace(/\ufeff/g, ''); // BOMを削除する
  return parse(tmpData, { columns: columns });
};
