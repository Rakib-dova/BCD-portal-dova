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

  // テストデータ
  const accountSets = [
    {code:'TAccount01', name:'テスト用勘定科目名１ダミーダミーダミーダミーダミーダミーダミーダミーダミーダミー'}, // 新規登録用
    {code:'TAccount02', name:'テスト用勘定科目名２ダミーダミーダミーダミーダミーダミーダミーダミーダミーダミー'} // 変更用
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

  // 勘定科目一覧ページまで遷移する
  async function gotoAccountCodeList(baseUrl, account, loginPage, tradeShiftTopPage, topPage, journalMenuPage, accountCodeListPage) {
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

    // 勘定科目一覧ページへ遷移する
    await comment('「勘定科目設定」をクリックする');
    await journalMenuPage.clickAccount();
    await accountCodeListPage.waitForLoading();
  };

  /**
   * STEP5 No.4,9,13
   */
  it("新規登録・変更・削除", async function () {
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
      const { loginPage, topPage, tradeShiftTopPage, journalMenuPage, accountCodeListPage, registAccountCodePage }
        = common.getPageObject(browser, page);

      // 勘定科目一覧ページへ遷移する
      await gotoAccountCodeList(config.baseUrl, account, loginPage, tradeShiftTopPage, topPage, journalMenuPage, accountCodeListPage);

      // 勘定科目登録ページへ遷移する
      await comment('「新規登録」をクリックする');
      await accountCodeListPage.clickRegist();
      await registAccountCodePage.waitForLoading();

      // 勘定科目を登録する
      await comment('コード"' + accountSets[0].code + '"、科目名"' + accountSets[0].name + '"で登録する');
      await registAccountCodePage.regist(accountSets[0].code, accountSets[0].name);
      await registAccountCodePage.clickPopupOK();
      await accountCodeListPage.waitForLoading();
      await accountCodeListPage.waitPopup();

      // 登録後、勘定科目一覧画面に戻って「勘定科目を登録しました」のポップアップメッセージ表示される
      expect(await accountCodeListPage.getPopupMessage()).to.equal('勘定科目を登録しました。', '登録後、勘定科目一覧画面に戻って「勘定科目を登録しました」のポップアップメッセージ表示される');
      expect(await accountCodeListPage.hasRow(accountSets[0].code, accountSets[0].name)).to.equal(true, '登録した勘定科目コード、勘定科目名、最新更新日が正しいこと');

      // ポップアップメッセージを閉じる
      await comment('ポップアップメッセージを閉じる');
      await accountCodeListPage.closePopup();

      // 勘定科目確認・変更ページへ遷移する
      await comment('勘定科目コード"' + accountSets[0].code + '"の「確認・変更する」をクリックする');
      await accountCodeListPage.clickEdit(accountSets[0].code);
      await registAccountCodePage.waitForLoading();
      
      // 勘定科目を変更する
      accountCode = 'TAccount02';
      accountName = 'テスト用勘定科目名２ダミーダミーダミーダミーダミーダミーダミーダミーダミーダミー';
      await comment('コード"' + accountSets[1].code + '"、科目名"' + accountSets[1].name + '"で登録する');
      await registAccountCodePage.regist(accountSets[1].code, accountSets[1].name);
      await registAccountCodePage.clickPopupOK();
      await accountCodeListPage.waitForLoading();
      await accountCodeListPage.waitPopup();
      
      // ポップアップメッセージを閉じる
      await comment('ポップアップメッセージを閉じる');
      await accountCodeListPage.closePopup();

      // 変更が反映されること
      expect(await accountCodeListPage.hasRow(accountSets[1].code, accountSets[1].name)).to.equal(true, '変更が反映されること');

      // 勘定科目を削除する
      await comment('勘定科目コード"' + accountSets[1].code + '"を削除する');
      await accountCodeListPage.delete(accountSets[1].code);

      // 「勘定科目を削除しました」のメッセージが表示され、一覧から削除されていること
      expect(await accountCodeListPage.getPopupMessage()).to.equal('勘定科目を削除しました。', '「勘定科目を削除しました」のメッセージが表示される');
      expect(await accountCodeListPage.hasRow(accountSets[1].code, accountSets[1].name)).to.equal(false, '一覧から削除されていること');
      await page.waitForTimeout(1000);
    }
  });
  
  /**
   * STEP5 No.15
   */
  it("勘定科目一括作成フォーマットファイルダウンロード", async function () {
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
      const { loginPage, topPage, tradeShiftTopPage, journalMenuPage, accountCodeListPage, uploadAccountCodePage }
        = common.getPageObject(browser, page);

      // 勘定科目一覧ページへ遷移する
      await gotoAccountCodeList(config.baseUrl, account, loginPage, tradeShiftTopPage, topPage, journalMenuPage, accountCodeListPage);

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
  
  /**
   * STEP5 No.16
   */
  it("勘定科目一括作成", async function () {
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
      const { loginPage, topPage, tradeShiftTopPage, journalMenuPage, accountCodeListPage, uploadAccountCodePage }
        = common.getPageObject(browser, page);

      // 勘定科目一覧ページへ遷移する
      await gotoAccountCodeList(config.baseUrl, account, loginPage, tradeShiftTopPage, topPage, journalMenuPage, accountCodeListPage);

      // 勘定科目一括作成ページへ遷移する
      await comment('「勘定科目一括作成」をクリックする');
      await accountCodeListPage.clickUpload();
      await uploadAccountCodePage.waitForLoading();

      // CSVファイルをアップロードする
      const csvPath = 'testdata/upload/勘定科目一括アップロード試験１.csv';
      await comment('CSVファイル"' + csvPath + '"をアップロードする');
      await uploadAccountCodePage.uploadCsv(csvPath);
      await accountCodeListPage.waitForLoading();
      await accountCodeListPage.waitPopup();

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
      const { loginPage, topPage, tradeShiftTopPage, journalMenuPage, accountCodeListPage }
        = common.getPageObject(browser, page);

      // 勘定科目一覧ページへ遷移する
      await gotoAccountCodeList(config.baseUrl, account, loginPage, tradeShiftTopPage, topPage, journalMenuPage, accountCodeListPage);

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
