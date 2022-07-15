const webdriverUtils = require('../utils/webdriver-utils');
const chai = require('chai');
const chaiWithReporting = require('../utils/chai-with-reporting').chaiWithReporting;
const comment = require('../utils/chai-with-reporting').comment;
const config = require('../autotest-script-config');
const common = require('./common');

const expect = chai.expect;
chai.use(chaiWithReporting);

let browser, contextOption, page;

webdriverUtils.setReporter();

describe('仕訳情報設定_支払依頼（十次承認まで）', function () {

  // 支払依頼に使用する請求書の番号
  const invoiceNo = 'fcde40392';

  // 依頼者
  const requester = config.company1.user02;

  // 承認待ちインデックス（未申請=-1）
  let authorizerNo = -1;

  // 支払依頼に使用する承認ルート
  const approveRoute = {
    name: '承認依頼テスト',
    authorizers: [
      config.company1.user03,
      config.company1.user04,
      config.company1.user05,
      config.company1.user06,
      config.company1.user07,
      config.company1.user08,
      config.company1.user09,
      config.company1.user10,
      config.company1.user11,
      config.company1.user12,
      config.company1.user13
    ]
  }

  // 支払依頼時、支払内訳に使用する勘定科目・補助科目
  const accountCodes = [
    { code:'TAccount01', name:'テスト用勘定科目名１', subCode:'TAccoSUB01', subName:'テスト用補助科目名１' },
    { code:'TAccount02', name:'テスト用勘定科目名２', subCode:'TAccoSUB02', subName:'テスト用補助科目名２' }
  ];

  // 支払依頼時、支払内訳に使用する部門データ
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

  // テストを初期化する
  async function initBrowser() {
    if (browser == null) {
      const browserInfo = await common.initTest();
      browser = browserInfo.browserType;
      contextOption = browserInfo.contextOption;
    }
    const context = await browser.newContext(contextOption);
    if (page != null) {
      page.close();
    }
    page = await context.newPage();
    global.reporter.setBrowserInfo(browser, page);
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

  it("準備（承認ルート）", async function () {
    // テストの初期化を実施
    await initBrowser();

    // ページオブジェクト
    const { loginPage, topPage, tradeShiftTopPage, journalMenuPage, accountCodeListPage,registAccountCodePage,
      subAccountCodeListPage, registSubAccountCodePage, departmentListPage, registDepartmentPage,
      approveRouteListPage,registApproveRoutePage }
      = common.getPageObject(browser, page);

    // デジタルトレードアプリのトップページへ遷移する
    await gotoTop(approveRoute.authorizers[0], loginPage, tradeShiftTopPage, topPage);

    // 勘定科目を登録する
    await comment('「仕訳情報管理」をクリックする');
    await topPage.openJournalMenu();
    await journalMenuPage.waitForLoading();
    await comment('「勘定科目設定」をクリックする');
    await journalMenuPage.clickAccount();
    await accountCodeListPage.waitForLoading();
    for (i = 0; i < accountCodes.length; i++) {
      if (await accountCodeListPage.hasRow(accountCodes[i].code, accountCodes[i].name)) {
        continue;
      }
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
      if (!accountCodes[i].subCode || !accountCodes[i].subName
        || await subAccountCodeListPage.hasRow(accountCodes[i].subCode, accountCodes[i].subName)) {
        continue;
      }
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
      if (await departmentListPage.hasRow(departments[i].code, departments[i].name)) {
        continue;
      }
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

    // 承認ルートを登録する
    await comment('「Home」をクリックする');
    await departmentListPage.clickHome();
    await topPage.waitForLoading();
    await comment('「仕訳情報管理」をクリックする');
    await topPage.openJournalMenu();
    await journalMenuPage.waitForLoading();
    await comment('「承認ルート一覧」をクリックする');
    await journalMenuPage.clickApproveRoute();
    await approveRouteListPage.waitForLoading();
    if (!await approveRouteListPage.hasRow(approveRoute.name)) {
      await comment('「新規登録する」をクリックする');
      await approveRouteListPage.clickRegist();
      await registApproveRoutePage.waitForLoading();
      await comment('承認ルート名へ"' + approveRoute.name + '"と入力する');
      await registApproveRoutePage.inputName(approveRoute.name);
      for (i = 0; i < approveRoute.authorizers.length; i++) {
        if (i < approveRoute.authorizers.length - 1) {
          await comment(approveRoute.authorizers[i].family + ' ' + approveRoute.authorizers[i].first + 'を' + (i + 1) + '次承認者に設定する');
          await registApproveRoutePage.addAuthorizer();
        } else {
          await comment(approveRoute.authorizers[i].family + ' ' + approveRoute.authorizers[i].first + 'を最終承認者に設定する');
        }
        await registApproveRoutePage.clickBtnSearch(i + 1);
        await registApproveRoutePage.searchAuthorizer(approveRoute.authorizers[i].family, approveRoute.authorizers[i].first, null);
        await registApproveRoutePage.selectAuthorizer();
      }
      await comment('「確認」をクリックする');
      await registApproveRoutePage.clickConfirm();
      await comment('「登録」をクリックする');
      await registApproveRoutePage.submit();
      await approveRouteListPage.waitForLoading();
    }
    await page.waitForTimeout(1000);
  });

  /**
   * STEP6_No.126,127,143
   */
  it("支払依頼ページ_依頼", async function () {
    // テストの初期化を実施
    await initBrowser();

    // ページオブジェクト
    const { loginPage, topPage, tradeShiftTopPage, journalMenuPage, paymentRequestListPage,
      journalDetailPage, paymentRequestPage }
      = common.getPageObject(browser, page);

    // デジタルトレードアプリのトップページへ遷移する
    await gotoTop(requester, loginPage, tradeShiftTopPage, topPage);

    // 仕訳情報管理メニューを開く
    await comment('「仕訳情報管理」をクリックする');
    await topPage.openJournalMenu();
    await journalMenuPage.waitForLoading();

    // 支払依頼一覧ページへ遷移する
    await comment('「支払依頼一覧」をクリックする');
    await journalMenuPage.clickPaymentRequest();
    await paymentRequestListPage.waitForLoading();

    // ステータスが「差し戻し」となっていること
    expect(await paymentRequestListPage.getApproveStatus(invoiceNo)).to.equal('差し戻し', 'ステータスが「差し戻し」となっていること');

    // 仕訳情報設定ページへ遷移する
    await comment('「仕訳情報設定」をクリックする');
    await paymentRequestListPage.clickDetail(invoiceNo);
    await journalDetailPage.waitForLoading();

    // 支払い依頼ページへ遷移する
    await comment('「支払依頼へ」をクリックする');
    await journalDetailPage.clickPaymentRequest();
    await paymentRequestPage.waitForLoading();

    // 承認ルート選択ダイアログを表示する
    await comment('「承認ルート選択」をクリックする');
    await paymentRequestPage.clickRouteSearch();

    // 承認ルートを検索する
    await comment('承認ルート"' + approveRoute.name + '"を検索する');
    await paymentRequestPage.searchRoute(approveRoute.name);
    await paymentRequestPage.selectRoute(approveRoute.name);

    // 承認ルートを再度選択できること
    expect(await paymentRequestPage.getRouteName()).to.equal(approveRoute.name, '承認ルートを再度選択できること');

    // 支払依頼を行う
    await comment('支払依頼を行う');
    await paymentRequestPage.submit();
    await paymentRequestListPage.waitForLoading();

    // 再度申請ができること
    expect(await paymentRequestListPage.getApproveStatus(invoiceNo)).to.equal('支払依頼中', 'ステータスが「承認依頼中」となっていること');
    authorizerNo = 0;

    // 承認待ちタブを開く
    await comment('「承認待ち」タブを開く');
    await paymentRequestListPage.clickConstruct();

    // 再度依頼ができること
    expect(await paymentRequestListPage.hasConstructRow(invoiceNo)).to.equal(true, '再度依頼ができること');
    await page.waitForTimeout(1000);
  });

  // 承認
  async function approve(no, status) {
    // テストの初期化を実施
    await initBrowser();

    // ページオブジェクト
    const { loginPage, topPage, tradeShiftTopPage, journalMenuPage, paymentRequestListPage, paymentRequestPage }
      = common.getPageObject(browser, page);
  
    // デジタルトレードアプリのトップページへ遷移する
    await gotoTop(approveRoute.authorizers[no], loginPage, tradeShiftTopPage, topPage);

    // 仕訳情報管理メニューを開く
    await comment('「仕訳情報管理」をクリックする');
    await topPage.openJournalMenu();
    await journalMenuPage.waitForLoading();
  
    // 支払依頼一覧ページへ遷移する
    await comment('「支払依頼一覧」をクリックする');
    await journalMenuPage.clickPaymentRequest();
    await paymentRequestListPage.waitForLoading();

    // 承認待ちタブを開く
    await comment('「承認待ち」タブを開く');
    await paymentRequestListPage.clickConstruct();

    // 支払依頼ページへ遷移する
    await comment(invoiceNo + 'の「依頼内容確認」をクリックする');
    await paymentRequestListPage.clickConstructDetail(invoiceNo);
    await paymentRequestPage.waitForLoading();

    // 承認する
    await comment('承認する');
    await paymentRequestPage.checkApproval();
    await paymentRequestPage.approve();
    await paymentRequestListPage.waitPopup();

    // 「承認を完了しました。」のメッセージが表示されていること
    expect(await paymentRequestListPage.getPopupMessage()).to.contains('承認を完了しました。', '「承認を完了しました。」のメッセージが表示されていること');

    // 請求書一覧画面にて承認ステータスに変更されていること
    await paymentRequestListPage.waitForLoading();
    expect(await paymentRequestListPage.getApproveStatus(invoiceNo)).to.equal(status, '請求書一覧画面にて承認ステータスに変更されていること');
    authorizerNo = no + 1;
    await page.waitForTimeout(1000);
  }

  /**
   * STEP6_No.94,95,96
   */
  it("支払依頼ページ_承認（1次承認）", async function () {
    await approve(0, '一次承認済み');
  });

  /**
   * STEP6_No.226
   */
  it("支払依頼ページ_承認（2次承認）", async function () {
    await approve(1, '二次承認済み');
  });

  /**
   * STEP6_No.228
   */
  it("支払依頼ページ_承認（3次承認）", async function () {
    await approve(2, '三次承認済み');
  });

  /**
   * STEP6_No.230
   */
  it("支払依頼ページ_承認（4次承認）", async function () {
    await approve(3, '四次承認済み');
  });

  /**
   * STEP6_No.232
   */
  it("支払依頼ページ_承認（5次承認）", async function () {
    await approve(4, '五次承認済み');
  });

  /**
   * STEP6_No.234
   */
  it("支払依頼ページ_承認（6次承認）", async function () {
    await approve(5, '六次承認済み');
  });

  /**
   * STEP6_No.236
   */
  it("支払依頼ページ_承認（7次承認）", async function () {
    await approve(6, '七次承認済み');
  });

  /**
   * STEP6_No.238
   */
  it("支払依頼ページ_承認（8次承認）", async function () {
    await approve(7, '八次承認済み');
  });

  /**
   * STEP6_No.240
   */
  it("支払依頼ページ_承認（9次承認）", async function () {
    await approve(8, '九次承認済み');
  });

  /**
   * STEP6_No.242
   */
  it("支払依頼ページ_承認（10次承認）", async function () {
    await approve(9, '十次承認済み');
  });

  /**
   * STEP6_No.351,352
   */
  it("支払依頼ページ_10次承認済み（申請者）", async function () {
    // テストの初期化を実施
    await initBrowser();

    // ページオブジェクト
    const { loginPage, topPage, tradeShiftTopPage, journalMenuPage, paymentRequestListPage, paymentRequestPage }
      = common.getPageObject(browser, page);

    // デジタルトレードアプリのトップページへ遷移する
    await gotoTop(requester, loginPage, tradeShiftTopPage, topPage);

    // 仕訳情報管理メニューを開く
    await comment('「仕訳情報管理」をクリックする');
    await topPage.openJournalMenu();
    await journalMenuPage.waitForLoading();

    // 支払依頼一覧ページへ遷移する
    await comment('「支払依頼一覧」をクリックする');
    await journalMenuPage.clickPaymentRequest();
    await paymentRequestListPage.waitForLoading();

    // ステータスが「十次承認済み」となっていること
    expect(await paymentRequestListPage.getApproveStatus(invoiceNo)).to.equal('十次承認済み', 'ステータスが「十次承認済み」となっていること');
    
    // 承認待ちタブを開く
    await comment('「承認待ち」タブを開く');
    await paymentRequestListPage.clickConstruct();

    // 支払依頼ページへ遷移する
    await comment(invoiceNo + 'の「依頼内容確認」をクリックする');
    await paymentRequestListPage.clickConstructDetail(invoiceNo);
    await paymentRequestPage.waitForLoading();

    let i = 1;
    for (i = 1; i < approveRoute.authorizers.length; i++) {
      // 一次承認にて担当者名に誤りがないこと
      let actual = await paymentRequestPage.getRequestingRow(i + 2);
      let message = i < approveRoute.authorizers.length - 1 ? (i + 1) + '次' : '最終';
      expect(actual.asignee).to.equal(approveRoute.authorizers[i].first + ' ' + approveRoute.authorizers[i].family, message + '承認にて担当者名に誤りがないこと');
  
      // 承認された日時が表示されること（最終承認以外）
      if (i < approveRoute.authorizers.length - 1) {
        expect(actual.status).to.contains('承認済み', '承認された日時が表示されること');
      } else {
        expect(actual.status).to.equal('処理中', '最終承認の承認状況が「処理中」となっていること');
      }
    }
    await page.waitForTimeout(1000);
  });

  /**
   * STEP6_No.98,99,125
   */
  it("支払依頼ページ_差し戻し", async function () {
    // テストの初期化を実施
    await initBrowser();

    // ページオブジェクト
    const { loginPage, topPage, tradeShiftTopPage, journalMenuPage, paymentRequestListPage, paymentRequestPage }
      = common.getPageObject(browser, page);

    // デジタルトレードアプリのトップページへ遷移する
    await gotoTop(approveRoute.authorizers[authorizerNo], loginPage, tradeShiftTopPage, topPage);

    // 仕訳情報管理メニューを開く
    await comment('「仕訳情報管理」をクリックする');
    await topPage.openJournalMenu();
    await journalMenuPage.waitForLoading();

    // 支払依頼一覧ページへ遷移する
    await comment('「支払依頼一覧」をクリックする');
    await journalMenuPage.clickPaymentRequest();
    await paymentRequestListPage.waitForLoading();

    // 承認待ちタブを開く
    await comment('「承認待ち」タブを開く');
    await paymentRequestListPage.clickConstruct();

    // 支払依頼ページへ遷移する
    await comment('「依頼内容確認」をクリックする');
    await paymentRequestListPage.clickConstructDetail(invoiceNo);
    await paymentRequestPage.waitForLoading();

    // 差し戻す
    await comment('差し戻す');
    await paymentRequestPage.reject();
    await paymentRequestListPage.waitPopup();

    // 「支払依頼を差し戻しました。」と表示されること
    expect(await paymentRequestListPage.getPopupMessage()).to.contains('支払依頼を差し戻しました。', '「支払依頼を差し戻しました。」と表示されること');

    // ポップアップを閉じる
    await comment('ポップアップメッセージを閉じる');
    await paymentRequestListPage.closePopup();
    await paymentRequestListPage.waitForLoading();

    // 差し戻しができること
    expect(await paymentRequestListPage.getApproveStatus(invoiceNo)).to.equal('差し戻し', '差し戻しができること');
    authorizerNo = -1;

    // 承認待ちタブを開く
    await comment('「承認待ち」タブを開く');
    await paymentRequestListPage.clickConstruct();

    // 請求書一覧の承認タブに表示されないこと
    expect(await paymentRequestListPage.hasConstructRow(invoiceNo)).to.equal(false, '請求書一覧の承認タブに表示されないこと');
    await page.waitForTimeout(1000);
  });

  it("後片付け（承認ルート削除）", async function() {
    // テストの初期化を実施
    await initBrowser();

    // ページオブジェクト
    const { loginPage, topPage, tradeShiftTopPage, journalMenuPage, subAccountCodeListPage,
      accountCodeListPage, departmentListPage, approveRouteListPage }
        = common.getPageObject(browser, page);
  
    // デジタルトレードアプリのトップページへ遷移する
    await gotoTop(approveRoute.authorizers[0], loginPage, tradeShiftTopPage, topPage);

    // 承認ルートを削除する
    await comment('「仕訳情報管理」をクリックする');
    await topPage.openJournalMenu();
    await journalMenuPage.waitForLoading();
    await comment('「承認ルート一覧」をクリックする');
    await journalMenuPage.clickApproveRoute();
    await approveRouteListPage.waitForLoading();
    await comment('承認ルート「' + approveRoute.name + '」を削除する');
    await approveRouteListPage.deleteRoute(approveRoute.name);
    await approveRouteListPage.deleteOnConfirm();
    await page.waitForTimeout(1000);
    
    // 補助科目をすべて削除する
    await comment('「Home」をクリックする');
    await approveRouteListPage.clickHome();
    await topPage.waitForLoading();
    await comment('「仕訳情報管理」をクリックする');
    await topPage.openJournalMenu();
    await journalMenuPage.waitForLoading();
    await comment('「補助科目設定」をクリックする');
    await journalMenuPage.clickSubAccount();
    await subAccountCodeListPage.waitForLoading();
    await comment('補助科目をすべて削除する');
    await subAccountCodeListPage.deleteAll();
    await page.waitForTimeout(1000);

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
  });
});
