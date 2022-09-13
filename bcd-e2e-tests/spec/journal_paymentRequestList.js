const webdriverUtils = require('../utils/webdriver-utils');
const chai = require('chai');
const chaiWithReporting = require('../utils/chai-with-reporting').chaiWithReporting;
const comment = require('../utils/chai-with-reporting').comment;
const config = require('../autotest-script-config');
const common = require('./common');
const journalData = require('../autotest-journal-data');

const expect = chai.expect;
chai.use(chaiWithReporting);

let browser, accounts, contextOption, page;

webdriverUtils.setReporter();

describe('仕訳情報設定_支払依頼一覧', function () {

  // テストデータ：請求書番号
  const invoiceNo = 'fcde40391';

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

  // 勘定科目・補助科目・部門データ・承認ルートを登録する
  it("準備", async function () {
    await initBrowser();
    const context = await browser.newContext(contextOption);
    if (page != null) {
      page.close();
    }
    page = await context.newPage();
    global.reporter.setBrowserInfo(browser, page);
    common.getPageObject(browser, page);
    await common.registJournalData(page, config.company1.mng, journalData, null);
  });

  /**
   * STEP8_No.21,22,25
   */
  it("スタンダードプラン未加入時の検索機能利用制限", async function () {
    // テストの初期化を実施
    await initBrowser();
    const context = await browser.newContext(contextOption);
    if (page != null) {
      page.close();
    }
    page = await context.newPage();
    global.reporter.setBrowserInfo(browser, page);

    // ページオブジェクト
    const { topPage, journalMenuPage, paymentRequestListPage, lightPlanMenuPage, paidServiceRegisterPage }
      = common.getPageObject(browser, page);

    // 支払依頼一覧ページへ遷移する
    await common.gotoTop(page, config.company2.user06);
    await topPage.openJournalMenu();
    await journalMenuPage.waitForLoading();
    await journalMenuPage.clickPaymentRequest();
    await paymentRequestListPage.waitForLoading();

    // 「支払依頼検索」機能が利用できないこと
    expect(await paymentRequestListPage.isFormShown()).to.equal(false, '「支払依頼検索」機能が利用できないこと');
    expect(await paymentRequestListPage.isLightPlanShown()).to.equal(true, '「検索機能を利用」ボタンが表示されていること');

    // 「オプションサービス申込」モーダルが表示されること
    await paymentRequestListPage.clickLightPlan();
    await lightPlanMenuPage.waitForLoading();
    expect(await lightPlanMenuPage.getTitle()).to.equal(lightPlanMenuPage.title, '「オプションサービス申込」モーダルが表示されること');
    expect(await lightPlanMenuPage.getApplyEnabled()).to.equal(true, '「お申し込みフォーム」ボタンが活性状態であること');

    // 申し込み画面（利用規約）に遷移すること
    await lightPlanMenuPage.clickApply();
    await paidServiceRegisterPage.waitForLoading();
    expect(await paidServiceRegisterPage.getTitle()).to.equal(paidServiceRegisterPage.title, '申し込み画面（利用規約）に遷移すること');
    expect(await paidServiceRegisterPage.isStandardChecked()).to.equal(true, '「ご利用希望サービス」の「スタンダードプラン」にチェックが入っていること');
    await page.waitForTimeout(1000);
  });

  /**
   * STEP5_No.109
   * STEP8_機能改修確認_No.118
   */
   it("支払依頼情報確認（仕訳情報未設定）", async function () {
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
      } else {
        await comment('---------- その他アカウント ----------')
        await comment('その他アカウントは対象外です。')
        continue;
      }

      // ページオブジェクト
      const { topPage, journalMenuPage, paymentRequestListPage, journalDetailPage }
        = common.getPageObject(browser, page);

      // 支払依頼一覧ページへ遷移する
      await common.gotoTop(page, account);
      await topPage.openJournalMenu();
      await journalMenuPage.waitForLoading();
      await journalMenuPage.clickPaymentRequest();
      await paymentRequestListPage.waitForLoading();

      // 差出人・宛先・価格を取得する
      let cost = await paymentRequestListPage.getCost(invoiceNo);
      let sender = await paymentRequestListPage.getSender(invoiceNo);

      // 仕訳情報設定ページへ遷移する
      await paymentRequestListPage.clickDetail(invoiceNo);
      await journalDetailPage.waitForLoading();

      // 文書管理の請求書と比較して表示内容に誤りがないこと
      expect(await journalDetailPage.getInvoiceNo()).to.equal(invoiceNo, '請求書番号が一覧ページのものと合致すること');
      expect(await journalDetailPage.getSender()).to.equal(sender, '差出人が一覧ページのものと合致すること');
      expect(await journalDetailPage.getCost()).to.equal(cost, '価格が一覧ページのものと合致すること');

      // 「支払依頼へ」ボタンが非活性となっていること
      expect(await journalDetailPage.isPaymentRequestDisabled()).to.equal(false, '「支払依頼へ」ボタンが非活性となっていること');
      await page.waitForTimeout(1000);
    }
  });

  // 担当者アドレス欄を確認する
  async function confirmMail(nameEmpty, loginPage, tradeShiftTopPage, tradeShiftUserPage, topPage, journalMenuPage, paymentRequestListPage, journalDetailPage) {
    let sender = config.company2.user03;
    let receiver = config.company2.user06;
    let invoiceNo = 'atest220830';

    // ユーザの姓・名を変更する
    await comment('Tradeshiftログインページへ移動する');
    await page.goto(config.baseUrl);
    await loginPage.doLogin(sender.id, sender.password);
    await tradeShiftTopPage.waitForLoading();
    await tradeShiftTopPage.editUser();
    await tradeShiftUserPage.waitForLoading();
    if (nameEmpty) {
      await tradeShiftUserPage.editName('', '');
    } else {
      await tradeShiftUserPage.editName(sender.first, sender.family);
    }
    await tradeShiftTopPage.logout();
    await loginPage.waitForLoading();

    // 仕訳情報設定ページへ遷移する
    await common.gotoTop(page, receiver);
    await topPage.openJournalMenu();
    await journalMenuPage.waitForLoading();
    await journalMenuPage.clickPaymentRequest();
    await paymentRequestListPage.waitForLoading();
    await paymentRequestListPage.clickDetail(invoiceNo);
    await journalDetailPage.waitForLoading();
  
    // 「担当者アドレス」欄にメールアドレスのみが表示されていること
    expect(await journalDetailPage.getSenderMail()).to.equal(sender.id, '「担当者アドレス」欄にメールアドレスのみが表示されていること');

    // ログアウトする
    await tradeShiftTopPage.logout();
    await loginPage.waitForLoading();
  }

  /**
   * STEP8_機能改修確認_No.23,26
   */
  /*
  it("担当者アドレス", async function () {
    // テストの初期化を実施
    await initBrowser();
    const context = await browser.newContext(contextOption);
    if (page != null) {
      page.close();
    }
    page = await context.newPage();
    global.reporter.setBrowserInfo(browser, page);
    
    // ページオブジェクト
    const { loginPage, tradeShiftTopPage, tradeShiftUserPage, topPage, journalMenuPage, paymentRequestListPage, journalDetailPage }
        = common.getPageObject(browser, page);

    // 姓・名を空白にして確認する
    await confirmMail(true, loginPage, tradeShiftTopPage, tradeShiftUserPage, topPage, journalMenuPage, paymentRequestListPage, journalDetailPage);

    // 姓・名を登録して確認する
    await confirmMail(false, loginPage, tradeShiftTopPage, tradeShiftUserPage, topPage, journalMenuPage, paymentRequestListPage, journalDetailPage);
    await page.waitForTimeout(1000);
  });
  */

  /**
   * STEP8_ライトプラン_No.180
   * STEP8_機能改修確認_No.30,32,35-39,42,43,45,46
   */
   it("検索条件フォーム", async function () {
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
      } else {
        await comment('---------- その他アカウント ----------')
        await comment('その他アカウントは対象外です。')
        continue;
      }

      // ページオブジェクト
      const { topPage, journalMenuPage, paymentRequestListPage }
        = common.getPageObject(browser, page);

      // 支払依頼一覧ページへ遷移する
      await common.gotoTop(page, account);
      await topPage.openJournalMenu();
      await journalMenuPage.waitForLoading();
      await journalMenuPage.clickPaymentRequest();
      await paymentRequestListPage.waitForLoading();

      // 検索条件フォームが表示されること
      expect(await paymentRequestListPage.isFormShown()).to.equal(true, '検索条件フォームが表示されること');

      // 検索条件フォーム未入力のまま検索する
      let actualMsg = await paymentRequestListPage.clickSearchWithoutConditions();
      expect(actualMsg).to.equal('検索条件を入力してください。', '検索条件フォーム未入力のメッセージが表示されること');

      // 請求書番号へ100字まで入力できること
      let invoiceNo = 'テスト1234567890abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnop';
      await paymentRequestListPage.inputSearchInvoiceNo(invoiceNo);
      expect(await paymentRequestListPage.getSearchInvoiceNo()).to.equal(invoiceNo.substring(0, 100), '請求書番号へ100字まで入力できること');

      // 承認ステータスが複数選択可能であること
      expect(await paymentRequestListPage.getSearchStatusCheckedCount()).to.equal(0, '承認ステータスが全解除の状態になっていること');
      let status = ['未処理', '支払依頼中', '一次承認済み', '二次承認済み', '三次承認済み', '四次承認済み', '五次承認済み', '六次承認済み', '七次承認済み', '八次承認済み', '九次承認済み', '十次承認済み', '最終承認済み', '差し戻し'];
      await paymentRequestListPage.checkSearchStatus(status);
      expect(await paymentRequestListPage.getSearchStatusCheckedCount()).to.equal(14, '承認ステータスが複数選択可能であること');

      // 発行日（開始日・終了日）へ「yyyy/mm/dd」形式で入力できること
      let minIssueDate = '2021-07-01';
      let maxIssueDate = '2022-08-31';
      await paymentRequestListPage.inputSearchIssueDate(minIssueDate, maxIssueDate);
      let actualIssueDates = await paymentRequestListPage.getSearchIssueDate();
      expect(actualIssueDates.min).to.equal(minIssueDate, '発行日（開始日）へ「yyyy/mm/dd」形式で入力できること');
      expect(actualIssueDates.max).to.equal(maxIssueDate, '発行日（終了日）へ「yyyy/mm/dd」形式で入力できること');

      // 送信企業へ100字まで入力できること
      let sender = 'テスト1234567890abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnop';
      await paymentRequestListPage.inputSearchSendTo(sender);
      expect(await paymentRequestListPage.getSearchSendTo()).to.equal(sender.substring(0, 100), '送信企業へ100字まで入力できること');

      // 担当者アドレスへ128字まで入力できること
      let mail = '1234567890abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqrstuvwxyz12345678@example.coma';
      await paymentRequestListPage.inputSearchMail(mail);
      expect(await paymentRequestListPage.getSearchMail()).to.equal(mail.substring(0, 128), '担当者アドレスへ128字まで入力できること');
      
      // 請求書番号に一致する請求書データが検索結果に表示されること（完全一致）
      invoiceNo = 'A0000125';
      await paymentRequestListPage.clickSearchClear();
      await paymentRequestListPage.inputSearchInvoiceNo(invoiceNo);
      await paymentRequestListPage.clickSearch();
      expect(await paymentRequestListPage.hasRow(invoiceNo)).to.equal(true, '請求書番号に一致する請求書データが検索結果に表示されること（完全一致）');
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
      } else {
        await comment('---------- その他アカウント ----------')
        await comment('その他アカウントは対象外です。')
        continue;
      }

      // ページオブジェクト
      const { topPage, journalMenuPage, paymentRequestListPage, journalDetailPage }
        = common.getPageObject(browser, page);

      // 仕訳情報設定ページへ遷移する
      await common.gotoTop(page, account);
      await topPage.openJournalMenu();
      await journalMenuPage.waitForLoading();
      await journalMenuPage.clickPaymentRequest();
      await paymentRequestListPage.waitForLoading();
      await paymentRequestListPage.clickDetail(invoiceNo);
      await journalDetailPage.waitForLoading();

      // 仕訳情報の「+」を9回クリックし、計上価格を入力する
      let costs = ['10', '20', '30', '40', '50', '60', '70', '80', '90'];
      for (i = 0; i < costs.length; i++) {
        await comment('「仕訳情報」の「+」をクリックし、計上価格へ"' + costs[i] + '"を入力する');
        await journalDetailPage.clickAddBreakdown(1);
        await journalDetailPage.inputBreakdownCost(1, i + 2, costs[i]);
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
        await journalDetailPage.clickDelBreakdown(1, i + 1);
        expect(await journalDetailPage.getBreakdownCount()).to.equal(i, (i + 1) + '番目の仕訳情報入力フォームが消えること');
        let firstCostAfter = parseCostInt(await journalDetailPage.getBreakdownCost(1));
        expect(firstCostAfter).to.equal(firstCostBefore + parseInt(costs[i - 1]), '消された行の計上金額が、1行目の計上金額に合算されること');
        firstCostBefore = firstCostAfter;
      }
      await page.waitForTimeout(1000);
    }
  });

  // 勘定科目・補助科目を検索・選択する
  async function selectAccount(journalDetailPage, fromBulk, isCredit, accountCode) {
    // 仕訳情報入力フォームにて、勘定科目の「検索」をクリックする
    let msg = isCredit ? '貸方' : '借方';
    await comment('勘定科目コード、補助科目コード（' + msg + '）の「検索」をクリックする');
    if (fromBulk) {
      await journalDetailPage.clickAccountCodeSearchOnBulk(1, isCredit);
    } else {
      await journalDetailPage.clickAccountCodeSearch(1, 1, isCredit);
    }

    // 勘定科目、補助科目を検索する
    await comment('勘定科目コード"' + accountCode.code + '"、勘定科目名"' + accountCode.name
      + '"、補助科目コード"' + accountCode.subCode + '"、補助科目名"' + accountCode.subName + '"を条件に検索する');
    await journalDetailPage.searchAccount(isCredit, accountCode.code, accountCode.name, accountCode.subCode, accountCode.subName);

    // 検索結果に入力した勘定科目・補助科目が表示されること
    expect(await journalDetailPage.hasAccountRow(isCredit, accountCode.code, accountCode.subCode)).to.equal(true, '検索結果に入力した勘定科目・補助科目が表示されること');

    // 先頭の検索結果をクリックする
    await journalDetailPage.clickAccountRow(isCredit, accountCode.code, accountCode.subCode);
  };

  // 部門データを検索・選択する
  async function selectDepartment(journalDetailPage, fromBulk, isCredit, department) {
    // 先頭の仕訳情報入力フォームにて、部門データの「検索」をクリックする
    let msg = isCredit ? '貸方' : '借方';
    await comment('部門コード（' + msg + '）の「検索」をクリックする');
    if (fromBulk) {
      await journalDetailPage.clickDepartmentSearchOnBulk(1, isCredit);
    } else {
      await journalDetailPage.clickDepartmentSearch(1, 1, isCredit);
    }

    // 部門データを検索する
    await comment('部門コード"' + department.code + '"、部門名"' + department.name + '"を条件に検索する');
    await journalDetailPage.searchDepartment(isCredit, department.code, department.name);

    // 検索結果に入力した部門データが表示されること
    expect(await journalDetailPage.hasDepartmentRow(isCredit, department.code)).to.equal(true, '検索結果に入力した部門データが表示されること');

    // 先頭の検索結果をクリックする
    await journalDetailPage.clickDepartmentRow(isCredit, department.code);
  };

  /**
   * STEP5_No.119,121
   * STEP7_No.3-24
   */
  it("受領請求書への仕訳情報設定_勘定科目・部門データ検索", async function () {
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
      } else {
        await comment('---------- その他アカウント ----------')
        await comment('その他アカウントは対象外です。')
        continue;
      }

      // ページオブジェクト
      const { topPage, journalMenuPage, paymentRequestListPage, journalDetailPage }
        = common.getPageObject(browser, page);

      // 仕訳情報設定ページへ遷移する
      await common.gotoTop(page, account);
      await topPage.openJournalMenu();
      await journalMenuPage.waitForLoading();
      await journalMenuPage.clickPaymentRequest();
      await paymentRequestListPage.waitForLoading();
      await paymentRequestListPage.clickDetail(invoiceNo);
      await journalDetailPage.waitForLoading();

      // 借方の勘定科目・補助科目・部門データを検索・選択する
      await selectAccount(journalDetailPage, false, false, journalData.accountCodes[0]);
      await selectDepartment(journalDetailPage, false, false, journalData.departments[0]);

      // 選択した勘定科目・補助科目・部門データが反映されること
      expect(await journalDetailPage.hasBreakdown(1, 1, false, journalData.accountCodes[0].code, journalData.accountCodes[0].subCode, journalData.departments[0].code)).to.equal(true, '選択した勘定科目・補助科目・部門データ（借方）が反映されていること');

      // 貸方の勘定科目・補助科目・部門データを検索・選択する
      await selectAccount(journalDetailPage, false, true, journalData.accountCodes[1]);
      await selectDepartment(journalDetailPage, false, true, journalData.departments[1]);

      // 選択した勘定科目・補助科目・部門データが反映されること
      expect(await journalDetailPage.hasBreakdown(1, 1, true, journalData.accountCodes[1].code, journalData.accountCodes[1].subCode, journalData.departments[1].code)).to.equal(true, '選択した勘定科目・補助科目・部門データ（貸方）が反映されていること');
      await page.waitForTimeout(1000);
    }
  });

  /**
   * STEP5_No.124
   * STEP7_No.47-69
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
      } else {
        await comment('---------- その他アカウント ----------')
        await comment('その他アカウントは対象外です。')
        continue;
      }

      // ページオブジェクト
      const { topPage, journalMenuPage, paymentRequestListPage, journalDetailPage }
        = common.getPageObject(browser, page);

      // 仕訳情報設定ページへ遷移する
      await common.gotoTop(page, account);
      await topPage.openJournalMenu();
      await journalMenuPage.waitForLoading();
      await journalMenuPage.clickPaymentRequest();
      await paymentRequestListPage.waitForLoading();
      await paymentRequestListPage.clickDetail(invoiceNo);
      await journalDetailPage.waitForLoading();

      // 勘定科目・補助科目・部門データを選択する
      await journalDetailPage.selectAccountCode(1, 1, false, journalData.accountCodes[0].code, journalData.accountCodes[0].subCode);
      await journalDetailPage.selectDepartment(1, 1, false, journalData.departments[0].code);
      await journalDetailPage.selectAccountCode(1, 1, true, journalData.accountCodes[0].code, journalData.accountCodes[0].subCode);
      await journalDetailPage.selectDepartment(1, 1, true, journalData.departments[0].code);

      // 「一括入力」をクリックする
      await journalDetailPage.clickBulkInsert();

      // 一括入力にて、勘定科目・補助科目・部門データを選択する
      await selectAccount(journalDetailPage, true, false, journalData.accountCodes[1]);
      await selectDepartment(journalDetailPage, true, false, journalData.departments[1]);
      await selectAccount(journalDetailPage, true, true, journalData.accountCodes[1]);
      await selectDepartment(journalDetailPage, true, true, journalData.departments[1]);

      // 項目IDにチェックを入れる
      await journalDetailPage.checkBulkON(1);

      // 「反映」をクリックする
      await journalDetailPage.clickBulkOK();

      // 一括入力したデータが反映されていること。一括入力前に入力したデータが上書きされていないこと
      expect(await journalDetailPage.hasBreakdown(1, 2, false, journalData.accountCodes[1].code, journalData.accountCodes[1].subCode, journalData.departments[1].code)).to.equal(true, '一括入力した借方のデータが反映されること');
      expect(await journalDetailPage.hasBreakdown(1, 2, true, journalData.accountCodes[1].code, journalData.accountCodes[1].subCode, journalData.departments[1].code)).to.equal(true, '一括入力した貸方のデータが反映されること');
      expect(await journalDetailPage.hasBreakdown(1, 1, false, journalData.accountCodes[0].code, journalData.accountCodes[0].subCode, journalData.departments[0].code)).to.equal(true, '一括入力前に入力した借方のデータが上書きされないこと');
      expect(await journalDetailPage.hasBreakdown(1, 1, true, journalData.accountCodes[0].code, journalData.accountCodes[0].subCode, journalData.departments[0].code)).to.equal(true, '一括入力前に入力した貸方のデータが上書きされないこと');
      await page.waitForTimeout(1000);
    }
  });

  // 勘定科目・補助科目・部門データ・承認ルートを削除する
  // （再登録に費やす時間を削減するため、コメントアウト）
  /*
  it("後片付け", async function() {
    await initBrowser();
    const context = await browser.newContext(contextOption);
    if (page != null) {
      page.close();
    }
    page = await context.newPage();
    global.reporter.setBrowserInfo(browser, page);
    common.getPageObject(browser, page);
    await common.deleteJournalData(page, config.company1.mng, null);
  });
  */
});
