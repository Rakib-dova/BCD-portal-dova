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

describe('仕訳情報設定_勘定科目一覧', function () {
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

  it("4. 新規登録", async function () {
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
      const { loginPage, topPage, tradeShiftTopPage, journalMenuPage, accountCodeListPage, registAccountCodePage }
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

      // 仕訳情報管理メニューを開く
      await comment('「仕訳情報管理」をクリックする');
      await topPage.openJournalMenu();
      await journalMenuPage.waitForLoading();

      // 勘定科目一覧ページへ遷移する
      await comment('「勘定科目設定」をクリックする');
      await journalMenuPage.clickAccount();
      await accountCodeListPage.waitForLoading();

      // 勘定科目登録ページへ遷移する
      await comment('「新規登録」をクリックする');
      await accountCodeListPage.clickRegist();
      await registAccountCodePage.waitForLoading();

      // 勘定科目を登録する
      let accountCode = 'TAccount01';
      let accountName = 'テスト用勘定科目名１ダミーダミーダミーダミーダミーダミーダミーダミーダミーダミー';
      await comment('コード"' + accountCode + '"、科目名"' + accountName + '"で登録する');
      await registAccountCodePage.regist(accountCode, accountName);
      await registAccountCodePage.clickPopupOK();
      await accountCodeListPage.waitForLoading();

      // 登録後、勘定科目一覧画面に戻って「勘定科目を登録しました」のポップアップメッセージ表示される
      expect(await accountCodeListPage.getPopupMessage()).to.equal('勘定科目を登録しました。', '登録後、勘定科目一覧画面に戻って「勘定科目を登録しました」のポップアップメッセージ表示される');
      expect(await accountCodeListPage.hasRow(accountCode, accountName)).to.equal(true, '登録した勘定科目コード、勘定科目名、最新更新日が正しいこと');
      await page.waitForTimeout(1000);
    }
  });
  
  it("9. 確認・変更", async function () {
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
      const { loginPage, topPage, tradeShiftTopPage, journalMenuPage, accountCodeListPage, registAccountCodePage }
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

      // 仕訳情報管理メニューを開く
      await comment('「仕訳情報管理」をクリックする');
      await topPage.openJournalMenu();
      await journalMenuPage.waitForLoading();

      // 勘定科目一覧ページへ遷移する
      await comment('「勘定科目設定」をクリックする');
      await journalMenuPage.clickAccount();
      await accountCodeListPage.waitForLoading();

      // 勘定科目確認・変更ページへ遷移する
      let accountCode = 'TAccount01';
      let accountName = 'テスト用勘定科目名１ダミーダミーダミーダミーダミーダミーダミーダミーダミーダミー';
      await comment('勘定科目コード"' + accountCode + '"の「確認・変更する」をクリックする');
      await accountCodeListPage.clickEdit(accountCode);
      await registAccountCodePage.waitForLoading();
      
      // 勘定科目を変更する
      accountCode = 'TAccount02';
      accountName = 'テスト用勘定科目名２ダミーダミーダミーダミーダミーダミーダミーダミーダミーダミー';
      await comment('コード"' + accountCode + '"、科目名"' + accountName + '"で登録する');
      await registAccountCodePage.regist(accountCode, accountName);
      await registAccountCodePage.clickPopupOK();
      await accountCodeListPage.waitForLoading();

      // 変更が反映されること
      expect(await accountCodeListPage.hasRow(accountCode, accountName)).to.equal(true, '変更が反映されること');
      await page.waitForTimeout(1000);
    }
  });
  
  it("13. 削除", async function () {
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
      const { loginPage, topPage, tradeShiftTopPage, journalMenuPage, accountCodeListPage }
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

      // 仕訳情報管理メニューを開く
      await comment('「仕訳情報管理」をクリックする');
      await topPage.openJournalMenu();
      await journalMenuPage.waitForLoading();

      // 勘定科目一覧ページへ遷移する
      await comment('「勘定科目設定」をクリックする');
      await journalMenuPage.clickAccount();
      await accountCodeListPage.waitForLoading();

      // 勘定科目を削除する
      let accountCode = 'TAccount02';
      let accountName = 'テスト用勘定科目名２ダミーダミーダミーダミーダミーダミーダミーダミーダミーダミー';
      await comment('勘定科目コード"' + accountCode + '"を削除する');
      await accountCodeListPage.delete(accountCode);
      await page.waitForTimeout(3000);

      // 「勘定科目を削除しました」のメッセージが表示され、一覧から削除されていること
      expect(await accountCodeListPage.getPopupMessage()).to.equal('勘定科目を削除しました。', '「勘定科目を削除しました」のメッセージが表示される');
      expect(await accountCodeListPage.hasRow(accountCode, accountName)).to.equal(false, '一覧から削除されていること');
      await page.waitForTimeout(1000);
    }
  });
  
  it("15. 勘定科目一括作成フォーマットファイルダウンロード", async function () {
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
      const { loginPage, topPage, tradeShiftTopPage, journalMenuPage, accountCodeListPage, uploadAccountCodePage }
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

      // 仕訳情報管理メニューを開く
      await comment('「仕訳情報管理」をクリックする');
      await topPage.openJournalMenu();
      await journalMenuPage.waitForLoading();

      // 勘定科目一覧ページへ遷移する
      await comment('「勘定科目設定」をクリックする');
      await journalMenuPage.clickAccount();
      await accountCodeListPage.waitForLoading();

      // 勘定科目一括作成ページへ遷移する
      await comment('「勘定科目一括作成」をクリックする');
      await accountCodeListPage.clickUpload();
      await uploadAccountCodePage.waitForLoading();

      // アップロード用CSVファイルをダウンロードする
      await comment('「アップロード用CSVファイルダウンロード」をクリックする');
      let csvPath = await uploadAccountCodePage.downloadCsv();

      // 勘定科目一括作成フォーマット.csvがダウンロードできること
      expect(await fs.existsSync(csvPath)).to.equal(true, '勘定科目一括作成フォーマット.csvがダウンロードできること');
      await page.waitForTimeout(1000);
    }
  });
  
  it("16. 勘定科目一括作成", async function () {
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
      const { loginPage, topPage, tradeShiftTopPage, journalMenuPage, accountCodeListPage, uploadAccountCodePage }
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

      // 仕訳情報管理メニューを開く
      await comment('「仕訳情報管理」をクリックする');
      await topPage.openJournalMenu();
      await journalMenuPage.waitForLoading();

      // 勘定科目一覧ページへ遷移する
      await comment('「勘定科目設定」をクリックする');
      await journalMenuPage.clickAccount();
      await accountCodeListPage.waitForLoading();

      // 勘定科目一括作成ページへ遷移する
      await comment('「勘定科目一括作成」をクリックする');
      await accountCodeListPage.clickUpload();
      await uploadAccountCodePage.waitForLoading();

      // CSVファイルをアップロードする
      const csvPath = 'testdata/upload/勘定科目一括アップロード試験１.csv';
      await comment('CSVファイル"' + csvPath + '"をアップロードする');
      await uploadAccountCodePage.uploadCsv(csvPath);
      await accountCodeListPage.waitForLoading();

      // 正しくすべてのデータが一覧に反映されること
      expect(await accountCodeListPage.getPopupMessage()).to.equal('勘定科目取込が完了しました。', '「勘定科目取込が完了しました」のメッセージが表示されること');
      let csvData = await getCsvData(csvPath);
      let i = 2;
      for (row of csvData) {
        expect(await accountCodeListPage.hasRow(row['勘定科目コード'], row['勘定科目名'])).to.equal(true, i + '行目のデータが一覧に反映されること');
        i++;
      }
      await page.waitForTimeout(1000);
    }
  });
  
  it("後片付け（勘定科目全削除）", async function () {
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
      const { loginPage, topPage, tradeShiftTopPage, journalMenuPage, accountCodeListPage }
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

      // 仕訳情報管理メニューを開く
      await comment('「仕訳情報管理」をクリックする');
      await topPage.openJournalMenu();
      await journalMenuPage.waitForLoading();

      // 勘定科目一覧ページへ遷移する
      await comment('「勘定科目設定」をクリックする');
      await journalMenuPage.clickAccount();
      await accountCodeListPage.waitForLoading();

      // 勘定科目をすべて削除する
      await accountCodeListPage.deleteAll();
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
