const webdriverUtils = require('../utils/webdriver-utils');
const chai = require('chai');
const chaiWithReporting = require('../utils/chai-with-reporting').chaiWithReporting;
const comment = require('../utils/chai-with-reporting').comment;
const config = require('../autotest-script-config');
const common = require('./common');

const expect = chai.expect;
chai.use(chaiWithReporting);

let browser, accounts, contextOption, page;

webdriverUtils.setReporter();

describe('仕訳情報設定_支払依頼一覧', function () {

  // テストデータ：請求書番号
  const invoiceNo = 'fcde40393';

  // テストデータ：勘定科目・補助科目
  const accountCodes = [
    { code:'TAccount01', name:'テスト用勘定科目名１', subCode:'TAccoSUB01', subName:'テスト用補助科目名１' },
    { code:'TAccount02', name:'テスト用勘定科目名２', subCode:'TAccoSUB02', subName:'テスト用補助科目名２' }
  ];

  // テストデータ：部門
  const departments = [
    { code:'TDept1', name:'テスト用部門コード名１' },
    { code:'TDept2', name:'テスト用部門コード名２' }
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

  // 各種価格を整数化する
  function parseCostInt(cost) {
    return parseInt(cost.replaceAll(/,/g, ''));
  };

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

  it("準備（勘定科目、補助科目、部門データ作成）", async function () {
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
      const { loginPage, topPage, tradeShiftTopPage, journalMenuPage, accountCodeListPage,registAccountCodePage,
        subAccountCodeListPage, registSubAccountCodePage, departmentListPage, registDepartmentPage }
        = common.getPageObject(browser, page);

      // デジタルトレードアプリのトップページへ遷移する
      await gotoTop(config.baseUrl, account, loginPage, tradeShiftTopPage, topPage);

      // 勘定科目を登録する
      await comment('「仕訳情報管理」をクリックする');
      await topPage.openJournalMenu();
      await journalMenuPage.waitForLoading();
      await comment('「勘定科目設定」をクリックする');
      await journalMenuPage.clickAccount();
      await accountCodeListPage.waitForLoading();
      for (i = 0; i < accountCodes.length; i++) {
        await comment('「新規登録」をクリックする');
        await accountCodeListPage.clickRegist();
        await registAccountCodePage.waitForLoading();
        await comment('コード"' + accountCodes[i].code + '"、科目名"' + accountCodes[i].name + '"を登録する');
        await registAccountCodePage.regist(accountCodes[i].code, accountCodes[i].name);
        await registAccountCodePage.clickPopupOK();
        await accountCodeListPage.waitPopup();
        await comment('ポップアップメッセージを閉じる');
        await accountCodeListPage.closePopup();
        await accountCodeListPage.waitForLoading();
      }

      // 補助科目を登録する
      await comment('「Home」をクリックする');
      await accountCodeListPage.clickHome();
      await topPage.waitForLoading();
      await comment('「仕訳情報管理」をクリックする');
      await topPage.openJournalMenu();
      await journalMenuPage.waitForLoading();
      await comment('「補助科目設定」をクリックする');
      await journalMenuPage.clickSubAccount();
      await subAccountCodeListPage.waitForLoading();
      for (i = 0; i < accountCodes.length; i++) {
        await comment('「新規登録する」をクリックする');
        await subAccountCodeListPage.clickRegist();
        await registSubAccountCodePage.waitForLoading();
        await comment('勘定科目"' + accountCodes[i].code + '"を選択する');
        await registSubAccountCodePage.selectAccount(accountCodes[i].code);
        await comment('補助科目コード"' + accountCodes[i].subCode + '"、補助科目名"' + accountCodes[i].subName + '"を登録する');
        await registSubAccountCodePage.regist(accountCodes[i].subCode, accountCodes[i].subName);
        await registSubAccountCodePage.clickPopupOK();
        await subAccountCodeListPage.waitPopup();
        await comment('ポップアップメッセージを閉じる');
        await subAccountCodeListPage.closePopup();
        await subAccountCodeListPage.waitForLoading();
      }

      // 部門データを登録する
      await comment('「Home」をクリックする');
      await subAccountCodeListPage.clickHome();
      await topPage.waitForLoading();
      await comment('「仕訳情報管理」をクリックする');
      await topPage.openJournalMenu();
      await journalMenuPage.waitForLoading();
      await comment('「部門データ設定」をクリックする');
      await journalMenuPage.clickDepartment();
      await departmentListPage.waitForLoading();
      for(i = 0; i < departments.length; i++) {
        await comment('「新規登録する」をクリックする');
        await departmentListPage.clickRegist();
        await registDepartmentPage.waitForLoading();
        await comment('部門コード"' + departments[i].code + '"、部門名"' + departments[i].name + '"を登録する');
        await registDepartmentPage.regist(departments[i].code, departments[i].name);
        await registDepartmentPage.clickPopupOK();
        await departmentListPage.waitPopup();
        await comment('ポップアップメッセージを閉じる');
        await departmentListPage.closePopup();
        await departmentListPage.waitForLoading();
      }
      await page.waitForTimeout(1000);
    }
  });

  /**
   * STEP5_No.109
   */
  it("受領請求書への仕訳情報設定", async function () {
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
      const { loginPage, topPage, tradeShiftTopPage, journalMenuPage, paymentRequestListPage, journalDetailPage }
        = common.getPageObject(browser, page);

      // デジタルトレードアプリのトップページへ遷移する
      await gotoTop(config.baseUrl, account, loginPage, tradeShiftTopPage, topPage);

      // 仕訳情報管理メニューを開く
      await comment('「仕訳情報管理」をクリックする');
      await topPage.openJournalMenu();
      await journalMenuPage.waitForLoading();

      // 支払依頼一覧ページへ遷移する
      await comment('「支払依頼一覧」をクリックする');
      await journalMenuPage.clickPaymentRequest();
      await paymentRequestListPage.waitForLoading();

      // 仕訳情報設定ページへ遷移する
      await comment('「仕訳情報設定」をクリックする');
      let cost = await paymentRequestListPage.getCost(invoiceNo);
      let sender = await paymentRequestListPage.getSender(invoiceNo);
      let receiver = await paymentRequestListPage.getReceiver(invoiceNo);
      await paymentRequestListPage.clickDetail(invoiceNo);
      await journalDetailPage.waitForLoading();

      // 文書管理の請求書と比較して表示内容に誤りがないこと
      expect(await journalDetailPage.getInvoiceNo()).to.equal(invoiceNo, '請求書番号が一覧ページのものと合致すること');
      expect(await journalDetailPage.getSender()).to.equal(sender, '差出人が一覧ページのものと合致すること');
      expect(await journalDetailPage.getReceiver()).to.equal(receiver, '宛先が一覧ページのものと合致すること');
      expect(await journalDetailPage.getCost()).to.equal(cost, '価格が一覧ページのものと合致すること');
      await page.waitForTimeout(1000);
    }
  });

  /**
   * STEP5_No.110,117
   */
  it("受領請求書への仕訳情報設定_仕訳情報追加・削除", async function () {
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
      const { loginPage, topPage, tradeShiftTopPage, journalMenuPage, paymentRequestListPage, journalDetailPage }
        = common.getPageObject(browser, page);

      // デジタルトレードアプリのトップページへ遷移する
      await gotoTop(config.baseUrl, account, loginPage, tradeShiftTopPage, topPage);

      // 仕訳情報管理メニューを開く
      await comment('「仕訳情報管理」をクリックする');
      await topPage.openJournalMenu();
      await journalMenuPage.waitForLoading();

      // 支払依頼一覧ページへ遷移する
      await comment('「支払依頼一覧」をクリックする');
      await journalMenuPage.clickPaymentRequest();
      await paymentRequestListPage.waitForLoading();

      // 仕訳情報設定ページへ遷移する
      await comment('「仕訳情報設定」をクリックする');
      await paymentRequestListPage.clickDetail(invoiceNo);
      await journalDetailPage.waitForLoading();

      // 仕訳情報の「+」を9回クリックし、計上価格を入力する
      let costs = ['10000', '20000', '30000', '40000', '50000', '60000', '70000', '80000', '90000'];
      for (i = 0; i < costs.length; i++) {
        await comment('「仕訳情報」の「+」をクリックし、計上価格へ"' + costs[i] + '"を入力する');
        await journalDetailPage.clickAddBreakdown();
        await journalDetailPage.inputBreakdownCost(i + 2, costs[i]);
      }

      // 「+」をクリックする（上限）
      await comment('「仕訳情報」の「+」をクリックする');

      // 各項目につき、10個仕訳情報入力フォームが表示されること(11個以上は表示されないこと)
      expect(await journalDetailPage.getBreakdownCount()).to.equal(10, '各項目につき、10個仕訳情報入力フォームが表示されること');

      // 仕訳情報内、先頭行の計上価格を取得する
      let firstCostBefore = parseCostInt(await journalDetailPage.getBreakdownCost(1));

      // 仕訳情報の「-」を9回クリックする
      await comment('「仕訳情報」の「-」を9回クリックする');
      for (i = costs.length; i > 0; i--) {
        await journalDetailPage.clickDelBreakdown(i + 1);
        expect(await journalDetailPage.getBreakdownCount()).to.equal(i, (i + 1) + '番目の仕訳情報入力フォームが消えること');
        let firstCostAfter = parseCostInt(await journalDetailPage.getBreakdownCost(1));
        expect(firstCostAfter).to.equal(firstCostBefore + parseInt(costs[i - 1]), '消された行の計上金額が、1行目の計上金額に合算されること');
        firstCostBefore = firstCostAfter;
      }
      await page.waitForTimeout(1000);
    }
  });

  /**
   * STEP5_No.119
   */
  it("受領請求書への仕訳情報設定_勘定科目検索", async function () {
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
      const { loginPage, topPage, tradeShiftTopPage, journalMenuPage, paymentRequestListPage, journalDetailPage }
        = common.getPageObject(browser, page);

      // デジタルトレードアプリのトップページへ遷移する
      await gotoTop(config.baseUrl, account, loginPage, tradeShiftTopPage, topPage);

      // 仕訳情報管理メニューを開く
      await comment('「仕訳情報管理」をクリックする');
      await topPage.openJournalMenu();
      await journalMenuPage.waitForLoading();

      // 支払依頼一覧ページへ遷移する
      await comment('「支払依頼一覧」をクリックする');
      await journalMenuPage.clickPaymentRequest();
      await paymentRequestListPage.waitForLoading();

      // 仕訳情報設定ページへ遷移する
      await comment('「仕訳情報設定」をクリックする');
      await paymentRequestListPage.clickDetail(invoiceNo);
      await journalDetailPage.waitForLoading();

      // 先頭の仕訳情報入力フォームにて、勘定科目の「検索」をクリックする
      await comment('先頭の仕訳情報入力フォームにて、勘定科目コード、補助科目コードの「検索」をクリックする');
      await journalDetailPage.clickAccountCodeSearch();

      // 勘定科目、補助科目を検索する
      await comment('勘定科目コード"' + accountCodes[0].code + '"、勘定科目名"' + accountCodes[0].name
        + '、補助科目コード"' + accountCodes[0].subCode + '"、補助科目名"' + accountCodes[0].subName + '"を条件に検索する');
      await journalDetailPage.searchAccount(accountCodes[0].code, accountCodes[0].name, accountCodes[0].subCode, accountCodes[0].subName);

      // 検索結果に正しくデータが表示されること
      expect(await journalDetailPage.hasAccountRow(accountCodes[0].code, accountCodes[0].subCode)).to.equal(true, '検索結果に正しくデータが表示されること');
      await page.waitForTimeout(1000);
    }
  });
  
  /**
   * STEP5_No.121
   */
  it("受領請求書への仕訳情報設定_部門データ検索", async function () {
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
      const { loginPage, topPage, tradeShiftTopPage, journalMenuPage, paymentRequestListPage, journalDetailPage }
        = common.getPageObject(browser, page);

      // デジタルトレードアプリのトップページへ遷移する
      await gotoTop(config.baseUrl, account, loginPage, tradeShiftTopPage, topPage);

      // 仕訳情報管理メニューを開く
      await comment('「仕訳情報管理」をクリックする');
      await topPage.openJournalMenu();
      await journalMenuPage.waitForLoading();

      // 支払依頼一覧ページへ遷移する
      await comment('「支払依頼一覧」をクリックする');
      await journalMenuPage.clickPaymentRequest();
      await paymentRequestListPage.waitForLoading();

      // 仕訳情報設定ページへ遷移する
      await comment('「仕訳情報設定」をクリックする');
      await paymentRequestListPage.clickDetail(invoiceNo);
      await journalDetailPage.waitForLoading();

      // 先頭の仕訳情報入力フォームにて、部門データの「検索」をクリックする
      await comment('先頭の仕訳情報入力フォームにて、部門コードの「検索」をクリックする');
      await journalDetailPage.clickDepartmentSearch();

      // 部門データを検索する
      await comment('部門コード"' + departments[0].code + '"、部門名"' + departments[0].name + '"を条件に検索する');
      await journalDetailPage.searchDepartment(departments[0].code, departments[0].name);

      // 検索結果に正しくデータが表示されること
      expect(await journalDetailPage.hasDepartmentRow(departments[0].code)).to.equal(true, '検索結果に正しくデータが表示されること');
      await page.waitForTimeout(1000);
    }
  });

  /**
   * STEP5_No.124
   */
  it("受領請求書への仕訳情報設定_仕訳情報一括入力", async function () {
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
      const { loginPage, topPage, tradeShiftTopPage, journalMenuPage, paymentRequestListPage, journalDetailPage }
        = common.getPageObject(browser, page);

      // デジタルトレードアプリのトップページへ遷移する
      await gotoTop(config.baseUrl, account, loginPage, tradeShiftTopPage, topPage);

      // 仕訳情報管理メニューを開く
      await comment('「仕訳情報管理」をクリックする');
      await topPage.openJournalMenu();
      await journalMenuPage.waitForLoading();

      // 支払依頼一覧ページへ遷移する
      await comment('「支払依頼一覧」をクリックする');
      await journalMenuPage.clickPaymentRequest();
      await paymentRequestListPage.waitForLoading();

      // 仕訳情報設定ページへ遷移する
      await comment('「仕訳情報設定」をクリックする');
      await paymentRequestListPage.clickDetail(invoiceNo);
      await journalDetailPage.waitForLoading();

      // 先頭の仕訳情報入力フォームにて、勘定科目の「検索」をクリックする
      await comment('先頭の仕訳情報入力フォームにて、勘定科目の「検索」をクリックする');
      await journalDetailPage.clickAccountCodeSearch();

      // 勘定科目、補助科目を検索し、選択する
      await comment('勘定科目コード"' + accountCodes[0].code + '"、勘定科目名"' + accountCodes[0].name
        + '、補助科目コード"' + accountCodes[0].subCode + '"、補助科目名"' + accountCodes[0].subName + '"を条件に検索する');
      await journalDetailPage.searchAccount(accountCodes[0].code, accountCodes[0].name, accountCodes[0].subCode, accountCodes[0].subName);
      await comment('検索結果の先頭行をクリックする');
      await journalDetailPage.clickAccountRow(accountCodes[0].code, accountCodes[0].subCode);

      // 先頭の仕訳情報入力フォームにて、部門データの「検索」をクリックする
      await comment('先頭の仕訳情報入力フォームにて、部門データの「検索」をクリックする');
      await journalDetailPage.clickDepartmentSearch();

      // 部門データを検索し、選択する
      await comment('部門コード"' + departments[0].code + '"、部門名"' + departments[0].name + '"を条件に検索する');
      await journalDetailPage.searchDepartment(departments[0].code, departments[0].name);
      await comment('検索結果の先頭行をクリックする');
      await journalDetailPage.clickDepartmentRow(departments[0].code);

      // 「一括入力」をクリックする
      await comment('「一括入力」をクリックする');
      await journalDetailPage.clickBulkInsert();

      // 勘定科目、補助科目を検索する
      await comment('勘定科目コード、補助科目コードの「検索」をクリックする');
      await journalDetailPage.clickAccountCodeSearchOnBulk();
      await comment('勘定科目コード"' + accountCodes[1].code + '"、勘定科目名"' + accountCodes[1].name
        + '、補助科目コード"' + accountCodes[1].subCode + '"、補助科目名"' + accountCodes[1].subName + '"を条件に検索する');
      await journalDetailPage.searchAccount(accountCodes[1].code, accountCodes[1].name, accountCodes[1].subCode, accountCodes[1].subName);
      await comment('検索結果の先頭行をクリックする');
      await journalDetailPage.clickAccountRow(accountCodes[1].code, accountCodes[1].subCode);

      // 部門コードを検索する
      await comment('部門コードの「検索」をクリックする');
      await journalDetailPage.clickDepartmentSearchOnBulk();
      await comment('部門コード"' + departments[1].code + '"、部門名"' + departments[1].name + '"を条件に検索する');
      await journalDetailPage.searchDepartment(departments[1].code, departments[1].name);
      await comment('検索結果の先頭行をクリックする');
      await journalDetailPage.clickDepartmentRow(departments[1].code);

      // 項目IDにチェックを入れる
      await comment('項目IDにチェックを入れる');
      await journalDetailPage.checkBulkON();

      // 「反映」をクリックする
      await comment('「反映」をクリックする');
      await journalDetailPage.clickBulkOK();

      // 一括入力したデータが反映されていること。一括入力前に入力したデータが上書きされていないこと
      expect(await journalDetailPage.hasBreakdown(2, accountCodes[1].code, accountCodes[1].subCode, departments[1].code)).to.equal(true, '一括入力したデータが反映されていること');
      expect(await journalDetailPage.hasBreakdown(1, accountCodes[0].code, accountCodes[0].subCode, departments[0].code)).to.equal(true, '一括入力前に入力したデータが上書きされていないこと');
      await page.waitForTimeout(1000);
    }
  });

  it("後片付け（勘定科目、補助科目、部門データ全削除）", async function() {
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
      const { loginPage, topPage, tradeShiftTopPage, journalMenuPage, subAccountCodeListPage,
        accountCodeListPage, departmentListPage }
        = common.getPageObject(browser, page);
  
      // デジタルトレードアプリのトップページへ遷移する
      await gotoTop(config.baseUrl, account, loginPage, tradeShiftTopPage, topPage);

      // 補助科目をすべて削除する
      await comment('「仕訳情報管理」をクリックする');
      await topPage.openJournalMenu();
      await journalMenuPage.waitForLoading();
      await comment('「補助科目設定」をクリックする');
      await journalMenuPage.clickSubAccount();
      await subAccountCodeListPage.waitForLoading();
      await comment('補助科目をすべて削除する');
      await subAccountCodeListPage.deleteAll();

      // 勘定科目をすべて削除する
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

      // 部門データをすべて削除する
      await comment('「Home」をクリックする');
      await accountCodeListPage.clickHome();
      await topPage.waitForLoading();
      await comment('「仕訳情報管理」をクリックする');
      await topPage.openJournalMenu();
      await journalMenuPage.waitForLoading();
      await comment('「部門データ設定」をクリックする');
      await journalMenuPage.clickDepartment();
      await departmentListPage.waitForLoading();
      await comment('部門データをすべて削除する');
      await departmentListPage.deleteAll();
      await page.waitForTimeout(1000);
    }
  });
});
