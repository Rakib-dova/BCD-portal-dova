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

  /**
   * STEP5 No.3
   */
  it("補助科目設定（勘定科目なし）", async function () {
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
      await gotoTop(account, loginPage, tradeShiftTopPage, topPage);
  
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

  /**
   * STEP5 No.17,23,24
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
  
      // デジタルトレードアプリのトップページへ遷移する
      await gotoTop(account, loginPage, tradeShiftTopPage, topPage);
  
      // 仕訳情報管理メニューを開く
      await comment('「仕訳情報管理」をクリックする');
      await topPage.openJournalMenu();
      await journalMenuPage.waitForLoading();
  
      // 勘定科目一覧ページへ遷移する
      await comment('「勘定科目設定」をクリックする');
      await journalMenuPage.clickAccount();
      await accountCodeListPage.waitForLoading();
  
      let files = [
        'testdata/upload/TESTCSV01.csv',
        'testdata/upload/TESTCSV07.csv',
        'testdata/upload/TESTCSV08.csv'
      ];

      // ファイルを1つずつアップロードする
      for (i = 0; i < files.length; i++) {
        // 勘定科目一括作成ページへ遷移する
        await comment('「勘定科目一括作成」をクリックする');
        await accountCodeListPage.clickUpload();
        await uploadAccountCodePage.waitForLoading();

        // CSVファイルをアップロードする
        await comment('CSVファイル"' + files[i] + '"をアップロードする');
        await uploadAccountCodePage.uploadCsv(files[i]);
        await accountCodeListPage.waitPopup();
        expect(await accountCodeListPage.getPopupMessage()).to.equal('勘定科目取込が完了しました。', '「勘定科目取込が完了しました」のメッセージが表示されること');

        // ポップアップを閉じる
        await comment('ポップアップメッセージを閉じる');
        await accountCodeListPage.closePopup();
        await accountCodeListPage.waitForLoading();

        // 正しくすべてのデータが一覧に反映されること
        let csvData = await getCsvData(files[i]);
        let j = 2;
        for (row of csvData) {
          expect(await accountCodeListPage.hasRow(row['勘定科目コード'], row['勘定科目名'])).to.equal(true, j + '行目のデータが一覧に反映されること');
          j++;
        }
      }
      await page.waitForTimeout(1000);
    }
  });

  /**
   * STEP5 No.39,40,44,47,52
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
      const { loginPage, topPage, tradeShiftTopPage, journalMenuPage, subAccountCodeListPage, registSubAccountCodePage }
        = common.getPageObject(browser, page);
  
      // デジタルトレードアプリのトップページへ遷移する
      await gotoTop(account, loginPage, tradeShiftTopPage, topPage);
  
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

      // 補助科目を登録する
      await comment('勘定科目コード"' + subAccountSets[0].code + '"を選択する');
      await registSubAccountCodePage.selectAccount(subAccountSets[0].code);
      await comment('コード"' + subAccountSets[0].subCode + '"、科目名"' + subAccountSets[0].subName + '"で登録する');
      await registSubAccountCodePage.regist(subAccountSets[0].subCode, subAccountSets[0].subName);
      await registSubAccountCodePage.clickPopupOK();
      await subAccountCodeListPage.waitPopup();
      expect(await subAccountCodeListPage.getPopupMessage()).to.equal('補助科目を登録しました。', '登録後、補助科目一覧画面に戻って「補助科目を登録しました」のポップアップメッセージ表示される');

      // ポップアップを閉じる
      await comment('ポップアップメッセージを閉じる');
      await subAccountCodeListPage.closePopup();
      await subAccountCodeListPage.waitForLoading();
  
      // 登録した勘定科目名、補助科目コード、補助科目名、最新更新日が正しいこと
      expect(await subAccountCodeListPage.hasRowWithAccount(subAccountSets[0].subCode, subAccountSets[0].subName, subAccountSets[0].name)).to.equal(true, '登録した勘定科目名、補助科目コード、補助科目名、最新更新日が正しいこと');

      // 補助科目確認・変更ページへ遷移する
      await comment('勘定科目コード"' + subAccountSets[0].code + '"、補助科目コード"' + subAccountSets[0].subCode + '"の「確認・変更する」をクリックする');
      await subAccountCodeListPage.clickEdit(subAccountSets[0].subCode, subAccountSets[0].name);
      await registSubAccountCodePage.waitForLoading();

      // 詳細が表示されること
      expect(await registSubAccountCodePage.getAccountCode()).to.equal(subAccountSets[0].code, '勘定科目コードが表示されること');
      expect(await registSubAccountCodePage.getSubAccountCode()).to.equal(subAccountSets[0].subCode, '補助科目コードが表示されること');
      expect(await registSubAccountCodePage.getSubAccountName()).to.equal(subAccountSets[0].subName, '補助科目名が表示されること');

      // 勘定科目を変更する
      await comment('勘定科目を"' + subAccountSets[1].code + '"へ変更する');
      await registSubAccountCodePage.clickClearAccount();
      await registSubAccountCodePage.selectAccount(subAccountSets[1].code);

      // 補助科目を変更する
      await comment('補助科目コード"' + subAccountSets[1].subCode + '"、補助科目コード"' + subAccountSets[1].subName + '"へ変更する');
      await registSubAccountCodePage.regist(subAccountSets[1].subCode, subAccountSets[1].subName);
      await registSubAccountCodePage.clickPopupOK();
      await subAccountCodeListPage.waitPopup();

      // ポップアップを閉じる
      await comment('ポップアップメッセージを閉じる');
      await subAccountCodeListPage.closePopup();
      await subAccountCodeListPage.waitForLoading();
  
      // 変更が反映されること
      expect(await subAccountCodeListPage.hasRowWithAccount(subAccountSets[1].subCode, subAccountSets[1].subName, subAccountSets[1].name)).to.equal(true, '変更が反映されること');

      // 補助科目を削除する
      await comment('勘定科目コード"' + subAccountSets[1].code + '"、補助科目コード"' + subAccountSets[1].subCode + '"を削除する');
      await subAccountCodeListPage.delete(subAccountSets[1].subCode, subAccountSets[1].name);
      expect(await subAccountCodeListPage.getPopupMessage()).to.equal('補助科目を削除しました。', '「補助科目を削除しました」のメッセージが表示される');

      // 「補助科目を削除しました」のメッセージが表示され、一覧から削除されていること
      expect(await subAccountCodeListPage.hasRowWithAccount(subAccountSets[1].subCode, subAccountSets[1].subName, subAccountSets[1].name)).to.equal(false, '一覧から削除されていること');
      await page.waitForTimeout(1000);
    }
  });

  /**
   * STEP5 No.53,54,56,62,63
   */
  it("補助科目一括作成", async function () {
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
      await gotoTop(account, loginPage, tradeShiftTopPage, topPage);

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
      let fmtPath = await uploadSubAccountCodePage.downloadCsv();

      // 補助科目一括作成フォーマット.csvがダウンロードできること
      expect(await fs.existsSync(fmtPath)).to.equal(true, '補助科目一括作成フォーマット.csvがダウンロードできること');

      let files = [
        'testdata/upload/補助科目一括アップロード試験１.csv',
        'testdata/upload/TESTCSV21.csv',
        'testdata/upload/TESTCSV27.csv',
        'testdata/upload/TESTCSV28.csv'
      ];
      
      // ファイルを1つずつアップロードする
      for (i = 0; i < files.length; i++) {
        // 補助科目一括作成ページへ遷移する
        if(i > 0) {
          await comment('「補助科目一括作成」をクリックする');
          await subAccountCodeListPage.clickUpload();
          await uploadSubAccountCodePage.waitForLoading();
        }

        // CSVファイルをアップロードする
        await comment('CSVファイル"' + files[i] + '"をアップロードする');
        await uploadSubAccountCodePage.uploadCsv(files[i]);
        await subAccountCodeListPage.waitPopup();
        expect(await subAccountCodeListPage.getPopupMessage()).to.equal('補助科目取込が完了しました。', '「補助科目取込が完了しました」のメッセージが表示されること');

        // ポップアップを閉じる
        await comment('ポップアップメッセージを閉じる');
        await subAccountCodeListPage.closePopup();
        await subAccountCodeListPage.waitForLoading();

        // 正しくすべてのデータが一覧に反映されること
        let csvData = await getCsvData(files[i]);
        let j = 2;
        for (row of csvData) {
          expect(await subAccountCodeListPage.hasRow(row['補助科目コード'], row['補助科目名'])).to.equal(true, j + '行目のデータが一覧に反映されること');
          j++;
        }
      }
      await page.waitForTimeout(1000);
    }
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
      await gotoTop(account, loginPage, tradeShiftTopPage, topPage);

      // 補助科目をすべて削除する
      await comment('「仕訳情報管理」をクリックする');
      await topPage.openJournalMenu();
      await journalMenuPage.waitForLoading();
      await comment('「補助科目設定」をクリックする');
      await journalMenuPage.clickSubAccount();
      await subAccountCodeListPage.waitForLoading();
      await comment('補助科目をすべて削除する');
      await subAccountCodeListPage.deleteAll();

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
