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

describe('仕訳情報設定_補助科目一覧', function () {

  // テストデータ
  const subAccountSets = [
    {
      code:'CSVAcc01',
      name:'テストCSV勘定科目名01',
      subCode:'TAccoSUB01',
      subName:'テスト用補助科目名１ダミーダミーダミーダミーダミーダミーダミーダミーダミーダミー'
    }, // 新規登録用
    {
      code:'CSVAcc07',
      name:'テストCSV勘定科目名07',
      subCode:'TAccoSUB02',
      subName:'テスト用補助科目名２ダミーダミーダミーダミーダミーダミーダミーダミーダミーダミー'
    } // 変更用
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

  // トップページまで遷移する
  async function gotoTop(baseUrl, account, loginPage, tradeShiftTopPage, topPage) {
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
  };

  it("STEP5_No.3. 補助科目設定（勘定科目なし）", async function () {
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
      const { loginPage, topPage, tradeShiftTopPage, journalMenuPage, subAccountCodeListPage, registSubAccountCodePage }
        = common.getPageObject(browser, page);

      // デジタルトレードアプリのトップページへ遷移する
      await gotoTop(config.baseUrl, account, loginPage, tradeShiftTopPage, topPage);
  
      // 仕訳情報管理メニューを開く
      await comment('「仕訳情報管理」をクリックする');
      await topPage.openJournalMenu();
      await journalMenuPage.waitForLoading();
  
      // 補助科目一覧ページへ遷移する
      await comment('「補助科目設定」をクリックする');
      await journalMenuPage.clickSubAccount();
      await subAccountCodeListPage.waitForLoading();

      // 新規登録ページへ遷移する
      await comment('「新規登録する」をクリックする');
      await subAccountCodeListPage.clickRegist();
      await registSubAccountCodePage.waitForLoading();
  
      // 「事前に勘定科目を登録する必要があります。」のメッセージが表示されること
      expect(await registSubAccountCodePage.getPopupMessage()).to.equal('事前に勘定科目を登録する必要があります。', '「事前に勘定科目を登録する必要があります。」のメッセージが表示されること');
      await page.waitForTimeout(1000);
    }
  });

  async function uploadAccount(csvPath) {
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
  
      // デジタルトレードアプリのトップページへ遷移する
      await gotoTop(config.baseUrl, account, loginPage, tradeShiftTopPage, topPage);
  
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
      await comment('CSVファイル"' + csvPath + '"をアップロードする');
      await uploadAccountCodePage.uploadCsv(csvPath);
  
      // 正しくすべてのデータが一覧に反映されること
      await accountCodeListPage.waitForLoading();
      expect(await accountCodeListPage.getPopupMessage()).to.equal('勘定科目取込が完了しました。', '「勘定科目取込が完了しました」のメッセージが表示されること');
      let csvData = await getCsvData(csvPath);
      i = 2;
      for (row of csvData) {
        expect(await accountCodeListPage.hasRow(row['勘定科目コード'], row['勘定科目名'])).to.equal(true, i + '行目のデータが一覧に反映されること');
        i++;
      }
      await page.waitForTimeout(1000);
    }
  };

  it("STEP5_No.17. 勘定科目一括作成", async function () {
    await uploadAccount('testdata/upload/TESTCSV01.csv');
  });

  it("STEP5_No.23. 勘定科目一括作成", async function () {
    await uploadAccount('testdata/upload/TESTCSV07.csv');
  });

  it("STEP5_No.24. 勘定科目一括作成", async function () {
    await uploadAccount('testdata/upload/TESTCSV08.csv');
  });

  it("STEP5_No.39. 新規登録", async function () {
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
      const { loginPage, topPage, tradeShiftTopPage, journalMenuPage, subAccountCodeListPage, registSubAccountCodePage }
        = common.getPageObject(browser, page);
  
      // デジタルトレードアプリのトップページへ遷移する
      await gotoTop(config.baseUrl, account, loginPage, tradeShiftTopPage, topPage);
  
      // 仕訳情報管理メニューを開く
      await comment('「仕訳情報管理」をクリックする');
      await topPage.openJournalMenu();
      await journalMenuPage.waitForLoading();
  
      // 補助科目一覧ページへ遷移する
      await comment('「補助科目設定」をクリックする');
      await journalMenuPage.clickSubAccount();
      await subAccountCodeListPage.waitForLoading();

      // 新規登録ページへ遷移する
      await comment('「新規登録する」をクリックする');
      await subAccountCodeListPage.clickRegist();
      await registSubAccountCodePage.waitForLoading();

      // 補助科目を登録する
      await comment('勘定科目コード"' + subAccountSets[0].code + '"を選択する');
      await registSubAccountCodePage.selectAccount(subAccountSets[0].code);
      await comment('コード"' + subAccountSets[0].subCode + '"、科目名"' + subAccountSets[0].subName + '"で登録する');
      await registSubAccountCodePage.regist(subAccountSets[0].subCode, subAccountSets[0].subName);
      await registSubAccountCodePage.clickPopupOK();
      await subAccountCodeListPage.waitForLoading();
  
      // 登録した勘定科目名、補助科目コード、補助科目名、最新更新日が正しいこと
      expect(await subAccountCodeListPage.getPopupMessage()).to.equal('補助科目を登録しました。', '登録後、補助科目一覧画面に戻って「補助科目を登録しました」のポップアップメッセージ表示される');
      expect(await subAccountCodeListPage.hasRowWithAccount(subAccountSets[0].subCode, subAccountSets[0].subName, subAccountSets[0].name)).to.equal(true, '登録した勘定科目名、補助科目コード、補助科目名、最新更新日が正しいこと');
      await page.waitForTimeout(1000);
    }
  });
  
  it("STEP5_No.40. 新規登録_勘定科目選択クリア", async function () {
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
      const { loginPage, topPage, tradeShiftTopPage, journalMenuPage, subAccountCodeListPage, registSubAccountCodePage }
        = common.getPageObject(browser, page);
  
      // デジタルトレードアプリのトップページへ遷移する
      await gotoTop(config.baseUrl, account, loginPage, tradeShiftTopPage, topPage);
  
      // 仕訳情報管理メニューを開く
      await comment('「仕訳情報管理」をクリックする');
      await topPage.openJournalMenu();
      await journalMenuPage.waitForLoading();
  
      // 補助科目一覧ページへ遷移する
      await comment('「補助科目設定」をクリックする');
      await journalMenuPage.clickSubAccount();
      await subAccountCodeListPage.waitForLoading();

      // 新規登録ページへ遷移する
      await comment('「新規登録する」をクリックする');
      await subAccountCodeListPage.clickRegist();
      await registSubAccountCodePage.waitForLoading();

      // 補助科目を登録する
      await comment('勘定科目"' + subAccountSets[0].code + '"を選択する');
      await registSubAccountCodePage.selectAccount(subAccountSets[0].code);
      await registSubAccountCodePage.clickClearAccount();

      // クリアボタン押下で勘定科目コードのテキストボックスを非表示、設定ボタン活性化すること。
      expect(await registSubAccountCodePage.isAccountDisplayed()).to.equal(false, '勘定科目コードのテキストボックスを非表示になること');
      expect(await registSubAccountCodePage.isSelectAccountEnabled()).to.equal(true, '設定ボタンが活性化すること');
      await page.waitForTimeout(1000);
    }
  });

  it("STEP5_No.44. 確認", async function () {
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
      const { loginPage, topPage, tradeShiftTopPage, journalMenuPage, subAccountCodeListPage, registSubAccountCodePage }
        = common.getPageObject(browser, page);
  
      // デジタルトレードアプリのトップページへ遷移する
      await gotoTop(config.baseUrl, account, loginPage, tradeShiftTopPage, topPage);
  
      // 仕訳情報管理メニューを開く
      await comment('「仕訳情報管理」をクリックする');
      await topPage.openJournalMenu();
      await journalMenuPage.waitForLoading();
  
      // 補助科目一覧ページへ遷移する
      await comment('「補助科目設定」をクリックする');
      await journalMenuPage.clickSubAccount();
      await subAccountCodeListPage.waitForLoading();

      // 補助科目確認・変更ページへ遷移する
      await comment('勘定科目コード"' + subAccountSets[0].code + '"、補助科目コード"' + subAccountSets[0].subCode + '"の「確認・変更する」をクリックする');
      await subAccountCodeListPage.clickEdit(subAccountSets[0].subCode, subAccountSets[0].name);
      await registSubAccountCodePage.waitForLoading();

      // 詳細が表示されること
      expect(await registSubAccountCodePage.getAccountCode()).to.equal(subAccountSets[0].code, '勘定科目コードが表示されること');
      expect(await registSubAccountCodePage.getSubAccountCode()).to.equal(subAccountSets[0].subCode, '補助科目コードが表示されること');
      expect(await registSubAccountCodePage.getSubAccountName()).to.equal(subAccountSets[0].subName, '補助科目名が表示されること');
      await page.waitForTimeout(1000);
    }
  });
  
  it("STEP5_No.47. 変更", async function () {
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
      const { loginPage, topPage, tradeShiftTopPage, journalMenuPage, subAccountCodeListPage, registSubAccountCodePage }
        = common.getPageObject(browser, page);
  
      // デジタルトレードアプリのトップページへ遷移する
      await gotoTop(config.baseUrl, account, loginPage, tradeShiftTopPage, topPage);
  
      // 仕訳情報管理メニューを開く
      await comment('「仕訳情報管理」をクリックする');
      await topPage.openJournalMenu();
      await journalMenuPage.waitForLoading();
  
      // 補助科目一覧ページへ遷移する
      await comment('「補助科目設定」をクリックする');
      await journalMenuPage.clickSubAccount();
      await subAccountCodeListPage.waitForLoading();

      // 補助科目確認・変更ページへ遷移する
      await comment('勘定科目コード"' + subAccountSets[0].code + '"、補助科目コード"' + subAccountSets[0].subCode + '"の「確認・変更する」をクリックする');
      await subAccountCodeListPage.clickEdit(subAccountSets[0].subCode, subAccountSets[0].name);
      await registSubAccountCodePage.waitForLoading();

      // 勘定科目を変更する
      await comment('勘定科目を"' + subAccountSets[1].code + '"へ変更する');
      await registSubAccountCodePage.clickClearAccount();
      await registSubAccountCodePage.selectAccount(subAccountSets[1].code);

      // 補助科目を変更する
      await comment('補助科目コード"' + subAccountSets[1].subCode + '"、補助科目コード"' + subAccountSets[1].subName + '"へ変更する');
      await registSubAccountCodePage.regist(subAccountSets[1].subCode, subAccountSets[1].subName);
      await registSubAccountCodePage.clickPopupOK();
      await subAccountCodeListPage.waitForLoading();

      // 変更が反映されること
      expect(await subAccountCodeListPage.hasRowWithAccount(subAccountSets[1].subCode, subAccountSets[1].subName, subAccountSets[1].name)).to.equal(true, '変更が反映されること');
      await page.waitForTimeout(1000);
    }
  });
  
  it("STEP5_No.52. 削除", async function () {
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
      const { loginPage, topPage, tradeShiftTopPage, journalMenuPage, subAccountCodeListPage }
        = common.getPageObject(browser, page);

      // デジタルトレードアプリのトップページへ遷移する
      await gotoTop(config.baseUrl, account, loginPage, tradeShiftTopPage, topPage);

      // 仕訳情報管理メニューを開く
      await comment('「仕訳情報管理」をクリックする');
      await topPage.openJournalMenu();
      await journalMenuPage.waitForLoading();
  
      // 補助科目一覧ページへ遷移する
      await comment('「補助科目設定」をクリックする');
      await journalMenuPage.clickSubAccount();
      await subAccountCodeListPage.waitForLoading();

      // 補助科目を削除する
      await comment('勘定科目コード"' + subAccountSets[1].code + '"、補助科目コード"' + subAccountSets[1].subCode + '"を削除する');
      await subAccountCodeListPage.delete(subAccountSets[1].subCode, subAccountSets[1].name);
      await page.waitForTimeout(3000);

      // 「補助科目を削除しました」のメッセージが表示され、一覧から削除されていること
      expect(await subAccountCodeListPage.getPopupMessage()).to.equal('補助科目を削除しました。', '「補助科目を削除しました」のメッセージが表示される');
      expect(await subAccountCodeListPage.hasRowWithAccount(subAccountSets[1].subCode, subAccountSets[1].subName, subAccountSets[1].name)).to.equal(false, '一覧から削除されていること');
      await page.waitForTimeout(1000);
    }
  });
  
  it("STEP5_No.53. 補助科目一括作成フォーマットファイルダウンロード", async function () {
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
      const { loginPage, topPage, tradeShiftTopPage, journalMenuPage, subAccountCodeListPage, uploadSubAccountCodePage }
        = common.getPageObject(browser, page);

      // デジタルトレードアプリのトップページへ遷移する
      await gotoTop(config.baseUrl, account, loginPage, tradeShiftTopPage, topPage);

      // 仕訳情報管理メニューを開く
      await comment('「仕訳情報管理」をクリックする');
      await topPage.openJournalMenu();
      await journalMenuPage.waitForLoading();
  
      // 補助科目一覧ページへ遷移する
      await comment('「補助科目設定」をクリックする');
      await journalMenuPage.clickSubAccount();
      await subAccountCodeListPage.waitForLoading();

      // 補助科目一括作成ページへ遷移する
      await comment('「補助科目一括作成」をクリックする');
      await subAccountCodeListPage.clickUpload();
      await uploadSubAccountCodePage.waitForLoading();

      // アップロード用CSVファイルをダウンロードする
      await comment('「アップロード用CSVファイルダウンロード」をクリックする');
      let csvPath = await uploadSubAccountCodePage.downloadCsv();

      // 補助科目一括作成フォーマット.csvがダウンロードできること
      expect(await fs.existsSync(csvPath)).to.equal(true, '補助科目一括作成フォーマット.csvがダウンロードできること');
      await page.waitForTimeout(1000);
    }
  });
  
  async function uploadSubAccount(csvPath) {
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
      const { loginPage, topPage, tradeShiftTopPage, journalMenuPage, subAccountCodeListPage, uploadSubAccountCodePage }
        = common.getPageObject(browser, page);

      // デジタルトレードアプリのトップページへ遷移する
      await gotoTop(config.baseUrl, account, loginPage, tradeShiftTopPage, topPage);

      // 仕訳情報管理メニューを開く
      await comment('「仕訳情報管理」をクリックする');
      await topPage.openJournalMenu();
      await journalMenuPage.waitForLoading();
  
      // 補助科目一覧ページへ遷移する
      await comment('「補助科目設定」をクリックする');
      await journalMenuPage.clickSubAccount();
      await subAccountCodeListPage.waitForLoading();

      // 補助科目一括作成ページへ遷移する
      await comment('「補助科目一括作成」をクリックする');
      await subAccountCodeListPage.clickUpload();
      await uploadSubAccountCodePage.waitForLoading();

      // CSVファイルをアップロードする
      await comment('CSVファイル"' + csvPath + '"をアップロードする');
      await uploadSubAccountCodePage.uploadCsv(csvPath);
      await subAccountCodeListPage.waitForLoading();

      // 正しくすべてのデータが一覧に反映されること
      expect(await subAccountCodeListPage.getPopupMessage()).to.equal('補助科目取込が完了しました。', '「補助科目取込が完了しました」のメッセージが表示されること');
      let csvData = await getCsvData(csvPath);
      i = 2;
      for (row of csvData) {
        expect(await subAccountCodeListPage.hasRow(row['補助科目コード'], row['補助科目名'])).to.equal(true, i + '行目のデータが一覧に反映されること');
        i++;
      }
      await page.waitForTimeout(1000);
    }
  };

  it("STEP5_No.54. 補助科目一括作成", async function () {
    await uploadSubAccount('testdata/upload/補助科目一括アップロード試験１.csv');
  });

  it("STEP5_No.56. 補助科目一括作成", async function () {
    await uploadSubAccount('testdata/upload/TESTCSV21.csv');
  });

  it("STEP5_No.62. 補助科目一括作成", async function () {
    await uploadSubAccount('testdata/upload/TESTCSV27.csv');
  });

  it("STEP5_No.63. 補助科目一括作成", async function () {
    await uploadSubAccount('testdata/upload/TESTCSV28.csv');
  });

  it("後片付け（勘定科目、補助科目全削除）", async function() {
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
      const { loginPage, topPage, tradeShiftTopPage, journalMenuPage, subAccountCodeListPage, accountCodeListPage }
        = common.getPageObject(browser, page);

      // デジタルトレードアプリのトップページへ遷移する
      await gotoTop(config.baseUrl, account, loginPage, tradeShiftTopPage, topPage);

      // 仕訳情報管理メニューを開く
      await comment('「仕訳情報管理」をクリックする');
      await topPage.openJournalMenu();
      await journalMenuPage.waitForLoading();
  
      // 補助科目一覧ページへ遷移する
      await comment('「補助科目設定」をクリックする');
      await journalMenuPage.clickSubAccount();
      await subAccountCodeListPage.waitForLoading();

      // 補助科目をすべて削除する
      await comment('補助科目をすべて削除する');
      await subAccountCodeListPage.deleteAll();
      await page.waitForTimeout(1000);

      // 同様に、勘定科目をすべて削除する
      await comment('「Home」をクリックする');
      await subAccountCodeListPage.clickHome();
      await topPage.waitForLoading();
      await comment('「仕訳情報管理」をクリックする');
      await topPage.openJournalMenu();
      await journalMenuPage.waitForLoading();
      await comment('「勘定科目設定」をクリックする');
      await journalMenuPage.clickAccount();
      await accountCodeListPage.waitForLoading();
      await comment('勘定科目をすべて削除する');
      await accountCodeListPage.deleteAll();
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
