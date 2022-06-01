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

describe('仕訳情報設定_部門データ一覧', function () {

  // テストデータ
  const departments = [
    {code:'TDept1', name:'テスト用部門コード名１ダミーダミーダミーダミーダミーダミーダミーダミーダミーダミ'}, // 新規登録用
    {code:'TDept2', name:'テスト用部門コード名２ダミーダミーダミーダミーダミーダミーダミーダミーダミーダミ'} // 変更用
  ];

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

  // 部門データ一覧ページまで遷移する
  async function gotoDepartmentList(baseUrl, account, loginPage, tradeShiftTopPage, topPage, journalMenuPage, departmentListPage) {
    // 指定したURLに遷移する
    await comment('Tradeshiftログインページへ移動する');
    await page.goto(baseUrl);

    // ログインを行う
    await comment('ユーザ"' + account.id + '"でログインする');
    await loginPage.doLogin(account.id, account.password);
    await tradeShiftTopPage.waitForLoading();

    // デジタルトレードアプリをクリックする
    await comment('デジタルトレードアプリのアイコンをクリックする');
    await tradeShiftTopPage.clickBcdApp();
    await topPage.waitForLoading();

    // 仕訳情報管理メニューを開く
    await comment('「仕訳情報管理」をクリックする');
    await topPage.openJournalMenu();
    await journalMenuPage.waitForLoading();

    // 部門データ一覧ページへ遷移する
    await comment('「部門データ設定」をクリックする');
    await journalMenuPage.clickDepartment();
    await departmentListPage.waitForLoading();
  };

  it("STEP5_No.79. 新規作成・確認", async function () {
    // テストの初期化を実施
    await initBrowser();

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
      const { loginPage, topPage, tradeShiftTopPage, journalMenuPage, departmentListPage, registDepartmentPage }
        = common.getPageObject(browser, page);
  
      // 部門データ一覧ページへ遷移する
      await gotoDepartmentList(config.baseUrl, account, loginPage, tradeShiftTopPage, topPage, journalMenuPage, departmentListPage)

      // 新規登録ページへ遷移する
      await comment('「新規登録する」をクリックする');
      await departmentListPage.clickRegist();
      await registDepartmentPage.waitForLoading();

      // 部門データを登録する
      await registDepartmentPage.regist(departments[0].code, departments[0].name);
      await registDepartmentPage.clickPopupOK();
      await departmentListPage.waitForLoading();

      // 部門データ確認・変更ページへ遷移する
      await departmentListPage.clickEdit(departments[0].code);
      await registDepartmentPage.waitForLoading();
  
      // 詳細が表示されること
      expect(await registDepartmentPage.getCode()).to.equal(departments[0].code, '部門コードが表示されること');
      expect(await registDepartmentPage.getName()).to.equal(departments[0].name, '部門名が表示されること');
      await page.waitForTimeout(1000);
    }
  });
  
  it("STEP5_No.80. 変更", async function () {
    // テストの初期化を実施
    await initBrowser();

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
      const { loginPage, topPage, tradeShiftTopPage, journalMenuPage, departmentListPage, registDepartmentPage }
        = common.getPageObject(browser, page);
  
      // 部門データ一覧ページへ遷移する
      await gotoDepartmentList(config.baseUrl, account, loginPage, tradeShiftTopPage, topPage, journalMenuPage, departmentListPage)

      // 部門データ確認・変更ページへ遷移する
      await comment('部門コード"' + departments[0].code + '"の「確認・変更する」をクリックする');
      await departmentListPage.clickEdit(departments[0].code);
      await registDepartmentPage.waitForLoading();

      // 部門データを変更する
      await comment('コード"' + departments[1].code + '"、部門名"' + departments[1].name + '"で登録する');
      await registDepartmentPage.regist(departments[1].code, departments[1].name);
      await page.waitForTimeout(1000);
      await registDepartmentPage.clickPopupOK();
      await departmentListPage.waitForLoading();
  
      // 変更が反映されること
      expect(await departmentListPage.hasRow(departments[1].code, departments[1].name)).to.equal(true, '変更が反映されること');
      await page.waitForTimeout(1000);
    }
  });

  // 部門データ一括作成のテスト共通
  async function uploadDepartment(csvPath) {
    // テストの初期化を実施
    await initBrowser();

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
      const { loginPage, topPage, tradeShiftTopPage, journalMenuPage, departmentListPage, uploadDepartmentPage }
        = common.getPageObject(browser, page);
  
      // 部門データ一覧ページへ遷移する
      await gotoDepartmentList(config.baseUrl, account, loginPage, tradeShiftTopPage, topPage, journalMenuPage, departmentListPage)

      // 部門データ一括作成ページへ遷移する
      await comment('「部門データ一括作成」をクリックする');
      await departmentListPage.clickUpload();
      await uploadDepartmentPage.waitForLoading();

      // CSVファイルをアップロードする
      await comment('CSVファイル"' + csvPath + '"をアップロードする');
      await uploadDepartmentPage.uploadCsv(csvPath);
      await departmentListPage.waitForLoading();

      // 正しくすべてのデータが一覧に反映されること
      expect(await departmentListPage.getPopupMessage()).to.equal('部門データ取込が完了しました。', '「部門データ取込が完了しました」のメッセージが表示されること');
      let csvData = await getCsvData(csvPath);
      i = 2;
      for (row of csvData) {
        expect(await departmentListPage.hasRow(row['部門コード'], row['部門名'])).to.equal(true, i + '行目のデータが一覧に反映されること');
        i++;
      }
      await page.waitForTimeout(1000);
    }
  };
  
  it("STEP5_No.88. 部門データ一括作成", async function () {
    await uploadDepartment('testdata/upload/TESTCSV41.csv');
  });

  it("STEP5_No.94. 部門データ一括作成", async function () {
    await uploadDepartment('testdata/upload/TESTCSV47.csv');
  });

  it("STEP5_No.95. 部門データ一括作成", async function () {
    await uploadDepartment('testdata/upload/TESTCSV48.csv');
  });
  
  it("後片付け（部門データ全削除）", async function() {
    // テストの初期化を実施
    await initBrowser();

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
      const { loginPage, topPage, tradeShiftTopPage, journalMenuPage, departmentListPage }
        = common.getPageObject(browser, page);
  
      // 部門データ一覧ページへ遷移する
      await gotoDepartmentList(config.baseUrl, account, loginPage, tradeShiftTopPage, topPage, journalMenuPage, departmentListPage)

      // 部門データをすべて削除する
      await comment('部門データをすべて削除する');
      await departmentListPage.deleteAll();
      await page.waitForTimeout(1000);
    }
  });
});

// アップロード用CSVファイルのデータを取得する
async function getCsvData(csvPath) {
  let tmpData = fs.readFileSync(csvPath, 'utf-8');
  tmpData = tmpData.replace(/\r?\n/g, '\r\n'); // 改行コードを\r\nに統一する
  tmpData = tmpData.replace(/\ufeff/g, ''); // BOMを削除する
  return parse(tmpData, { columns: true });
};
