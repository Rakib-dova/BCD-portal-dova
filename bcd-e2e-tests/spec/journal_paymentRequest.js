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

describe('仕訳情報設定_支払依頼（一次承認まで）', function () {

  // 支払依頼に使用する請求書の番号
  const invoiceNo = 'fcde40392';

  // 依頼者
  const requester = config.company1.user12;

  // 支払依頼に使用する承認ルート
  const approveRoute = {
    name: '承認依頼テスト',
    authorizers: [
      config.company1.user02,
      config.company1.user03,
      config.company1.user04,
      config.company1.user05,
      config.company1.user06,
      config.company1.user07,
      config.company1.user08,
      config.company1.user09,
      config.company1.user10,
      config.company1.user11,
      config.company1.mng
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

  it("準備（承認ルート）", async function () {
    // テストの初期化を実施
    await initBrowser();
    const context = await browser.newContext(contextOption);
    if (page != null) {
      page.close();
    }
    page = await context.newPage();
    global.reporter.setBrowserInfo(browser, page);

    // ページオブジェクト
    const { loginPage, topPage, tradeShiftTopPage, journalMenuPage, accountCodeListPage,registAccountCodePage,
      subAccountCodeListPage, registSubAccountCodePage, departmentListPage, registDepartmentPage,
      approveRouteListPage,registApproveRoutePage }
      = common.getPageObject(browser, page);

    // デジタルトレードアプリのトップページへ遷移する
    await gotoTop(config.baseUrl, config.company1.mng, loginPage, tradeShiftTopPage, topPage);

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
    await page.waitForTimeout(1000);
  });

  it("STEP6_No.220. 支払依頼ページ_未処理（申請者）", async function () {
    // テストの初期化を実施
    await initBrowser();
    const context = await browser.newContext(contextOption);
    if (page != null) {
      page.close();
    }
    page = await context.newPage();
    global.reporter.setBrowserInfo(browser, page);

    // ページオブジェクト
    const { loginPage, topPage, tradeShiftTopPage, journalMenuPage, paymentRequestListPage }
      = common.getPageObject(browser, page);

    // デジタルトレードアプリのトップページへ遷移する
    await gotoTop(config.baseUrl, requester, loginPage, tradeShiftTopPage, topPage);

    // 仕訳情報管理メニューを開く
    await comment('「仕訳情報管理」をクリックする');
    await topPage.openJournalMenu();
    await journalMenuPage.waitForLoading();

    // 支払依頼一覧ページへ遷移する
    await comment('「支払依頼一覧」をクリックする');
    await journalMenuPage.clickPaymentRequest();
    await paymentRequestListPage.waitForLoading();

    // ステータスが「未処理」となっていること
    expect(await paymentRequestListPage.getApproveStatus('fcde40393')).to.equal('未処理', 'ステータスが「未処理」となっていること');
    await page.waitForTimeout(1000);
  });

  it("STEP6_No.45,46,48. 支払依頼ページ表示", async function () {
    // テストの初期化を実施
    await initBrowser();
    const context = await browser.newContext(contextOption);
    if (page != null) {
      page.close();
    }
    page = await context.newPage();
    global.reporter.setBrowserInfo(browser, page);

    // ページオブジェクト
    const { loginPage, topPage, tradeShiftTopPage, journalMenuPage, paymentRequestListPage,
      journalDetailPage, paymentRequestPage }
      = common.getPageObject(browser, page);

    // デジタルトレードアプリのトップページへ遷移する
    await gotoTop(config.baseUrl, requester, loginPage, tradeShiftTopPage, topPage);

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

    // 支払い依頼ページへ遷移する
    await comment('「支払依頼へ」をクリックする');
    await journalDetailPage.clickPaymentRequest();
    await paymentRequestPage.waitForLoading();

    // 請求書番号、宛先、差出人が確認できること
    expect(await paymentRequestPage.getNo()).to.equal(invoiceNo, '請求書番号が"' + invoiceNo + '"であること');
    expect(await paymentRequestPage.getReceiver()).to.equal(receiver, '宛先が"' + receiver + '"であること');
    expect(await paymentRequestPage.getSender()).to.equal(sender, '差出人が"' + sender + '"であること');

    // 合計欄を確認できること
    expect(await paymentRequestPage.getCost()).to.equal(cost, '合計価格が"' + cost + '"であること');
    await page.waitForTimeout(1000);
  });

  it("STEP6_No.49,52. 支払依頼ページ_メッセージ入力", async function () {
    // テストの初期化を実施
    await initBrowser();
    const context = await browser.newContext(contextOption);
    if (page != null) {
      page.close();
    }
    page = await context.newPage();
    global.reporter.setBrowserInfo(browser, page);

    // ページオブジェクト
    const { loginPage, topPage, tradeShiftTopPage, journalMenuPage, paymentRequestListPage,
      journalDetailPage, paymentRequestPage }
      = common.getPageObject(browser, page);

    // デジタルトレードアプリのトップページへ遷移する
    await gotoTop(config.baseUrl, requester, loginPage, tradeShiftTopPage, topPage);

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

    // 支払い依頼ページへ遷移する
    await comment('「支払依頼へ」をクリックする');
    await journalDetailPage.clickPaymentRequest();
    await paymentRequestPage.waitForLoading();

    // メッセージを入力する
    let message = 'メッセージテスト123456789abcdefghijklmnopqrstuvwxyz';
    await comment('メッセージへ"' + message + '"と入力する');
    await paymentRequestPage.setMessage(message);

    // 入力したデータが正しく反映されること
    expect(await paymentRequestPage.getMessage()).to.equal(message, '入力したデータが正しく反映されること');
    await page.waitForTimeout(1000);
  });

  it("STEP6_No.53,54,56,57,58. 支払依頼ページ_承認ルート選択", async function () {
    // テストの初期化を実施
    await initBrowser();
    const context = await browser.newContext(contextOption);
    if (page != null) {
      page.close();
    }
    page = await context.newPage();
    global.reporter.setBrowserInfo(browser, page);

    // ページオブジェクト
    const { loginPage, topPage, tradeShiftTopPage, journalMenuPage, paymentRequestListPage,
      journalDetailPage, paymentRequestPage }
      = common.getPageObject(browser, page);

    // デジタルトレードアプリのトップページへ遷移する
    await gotoTop(config.baseUrl, requester, loginPage, tradeShiftTopPage, topPage);

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

    // 検索モーダルにて検索した承認ルートが表示されること
    expect(await paymentRequestPage.hasRouteRow(approveRoute.name)).to.equal(true, '検索モーダルにて検索した承認ルートが表示されること');

    // 当該承認ルートの詳細画面に遷移されること
    await comment('承認ルート"' + approveRoute.name + '"の「承認ルート確認」をクリックする');
    await paymentRequestPage.confirmRoute(approveRoute.name);
    expect(await paymentRequestPage.getRouteNameOnConfirm()).to.equal(approveRoute.name, '該当承認ルートの詳細画面に遷移されること');

    // 承認リストが表示されていること
    let users = await paymentRequestPage.getAuthorizersOnConfirm();
    for (i = 0; i < approveRoute.authorizers.length; i++) {
      let nameMessage = (i < approveRoute.authorizers.length - 1 ? (i + 1) + '次' : '最終')
        + '承認者が"' + approveRoute.authorizers[i].family + ' ' + approveRoute.authorizers[i].first + '"であること';
      expect(users[i]).to.equal(approveRoute.authorizers[i].first + ' ' + approveRoute.authorizers[i].family, nameMessage);
    }

    // 承認ルート確認ポップアップを閉じる
    await paymentRequestPage.closeConfirm();

    // 承認ルートを設定できること
    await comment('承認ルート"' + approveRoute.name + '"を選択する');
    await paymentRequestPage.selectRoute(approveRoute.name);
    expect(await paymentRequestPage.getRouteName()).to.equal(approveRoute.name, '承認ルートを設定できること');
    await page.waitForTimeout(1000);
  });

  it("STEP6_No.65,78. 支払依頼ページ_依頼", async function () {
    // テストの初期化を実施
    await initBrowser();
    const context = await browser.newContext(contextOption);
    if (page != null) {
      page.close();
    }
    page = await context.newPage();
    global.reporter.setBrowserInfo(browser, page);

    // ページオブジェクト
    const { loginPage, topPage, tradeShiftTopPage, journalMenuPage, paymentRequestListPage,
      journalDetailPage, paymentRequestPage }
      = common.getPageObject(browser, page);

    // デジタルトレードアプリのトップページへ遷移する
    await gotoTop(config.baseUrl, requester, loginPage, tradeShiftTopPage, topPage);

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

    // 仕訳情報にて、勘定科目・補助科目・部門データを選択する
    let i = 0;
    let accountCodeCount = await journalDetailPage.getAccountCodeCount();
    await comment('仕訳情報入力数：' + accountCodeCount);
    for (i = 0; i < accountCodeCount; i++) {
      await comment('借方の勘定科目"' + accountCodes[0].name + '"・補助科目"' + accountCodes[0].subName + '"を選択する');
      await journalDetailPage.selectAccountCode(i + 1, accountCodes[0].code, accountCodes[0].subCode);
      await comment('借方の部門データ"' + departments[0].name + '"を選択する');
      await journalDetailPage.selectDepartment(i + 1, departments[0].code);
      await comment('貸方の勘定科目"' + accountCodes[1].name + '"・補助科目"' + accountCodes[1].subName + '"を選択する');
      await journalDetailPage.selectCreditAccountCode(i + 1, accountCodes[1].code, accountCodes[1].subCode);
      await comment('貸方の部門データ"' + departments[1].name + '"を選択する');
      await journalDetailPage.selectCreditDepartment(i + 1, departments[1].code);
    }

    // 保存する
    await comment('「保存」をクリックする');
    await journalDetailPage.save();
    await page.waitForTimeout(5000);

    // 支払い依頼ページへ遷移する
    await comment('「支払依頼へ」をクリックする');
    await journalDetailPage.clickPaymentRequest();
    await paymentRequestPage.waitForLoading();

    // メッセージを入力する
    let message = 'メッセージ65';
    await comment('メッセージへ"' + message + '"と入力する');
    await paymentRequestPage.setMessage(message);

    // 承認ルート選択ダイアログを表示する
    await comment('「承認ルート選択」をクリックする');
    await paymentRequestPage.clickRouteSearch();

    // 承認ルートを検索する
    await comment('承認ルート"' + approveRoute.name + '"を検索する');
    await paymentRequestPage.searchRoute(approveRoute.name);
    await paymentRequestPage.selectRoute(approveRoute.name);

    // 支払依頼を行う
    await comment('支払依頼を行う');
    await paymentRequestPage.submit();
    await paymentRequestListPage.waitForLoading();

    // 依頼がされること
    expect(await paymentRequestListPage.getApproveStatus(invoiceNo)).to.equal('支払依頼中', '依頼がされること');

    // 承認待ちタブを開く
    await comment('「承認待ち」タブを開く');
    await paymentRequestListPage.clickConstruct();

    // 支払依頼の請求書があること
    expect(await paymentRequestListPage.hasConstructRow(invoiceNo)).to.equal(true, '支払依頼の請求書があること');
    await page.waitForTimeout(1000);
  });

  it("STEP6_No.79,80,81,140,144,222. 支払依頼ページ_依頼中（申請者）", async function () {
    // テストの初期化を実施
    await initBrowser();
    const context = await browser.newContext(contextOption);
    if (page != null) {
      page.close();
    }
    page = await context.newPage();
    global.reporter.setBrowserInfo(browser, page);

    // ページオブジェクト
    const { loginPage, topPage, tradeShiftTopPage, journalMenuPage, paymentRequestListPage, paymentRequestPage }
      = common.getPageObject(browser, page);

    // デジタルトレードアプリのトップページへ遷移する
    await gotoTop(config.baseUrl, requester, loginPage, tradeShiftTopPage, topPage);

    // 仕訳情報管理メニューを開く
    await comment('「仕訳情報管理」をクリックする');
    await topPage.openJournalMenu();
    await journalMenuPage.waitForLoading();

    // 支払依頼一覧ページへ遷移する
    await comment('「支払依頼一覧」をクリックする');
    await journalMenuPage.clickPaymentRequest();
    await paymentRequestListPage.waitForLoading();

    // ステータスが「支払依頼中」となっていること
    expect(await paymentRequestListPage.getApproveStatus(invoiceNo)).to.equal('支払依頼中', 'ステータスが「支払依頼中」となっていること');

    // 承認待ちタブを開く
    await comment('「承認待ち」タブを開く');
    await paymentRequestListPage.clickConstruct();

    // 承認状況に「支払依頼中」と表示されていること
    expect(await paymentRequestListPage.getConstructStatus(invoiceNo)).to.equal('支払依頼中', '承認状況に「支払依頼中」と表示されていること');

    // 支払依頼ページへ遷移する
    await comment(invoiceNo + 'の「依頼内容確認」をクリックする');
    await paymentRequestListPage.clickConstructDetail(invoiceNo);
    await paymentRequestPage.waitForLoading();

    // 詳細画面に遷移すること
    expect(await paymentRequestPage.getNo()).to.equal(invoiceNo, '詳細画面に遷移すること');

    // 仕訳情報が表示されること
    let lineAccountCode = await paymentRequestPage.getLineAccountCode(1);
    expect (lineAccountCode.accountCode).to.equal(accountCodes[0].code, '勘定科目が表示されること');
    expect (lineAccountCode.subAccountCode).to.equal(accountCodes[0].subCode, '補助科目が表示されること');
    expect (lineAccountCode.departmentCode).to.equal(departments[0].code, '部門データが表示されること');

    // 依頼者名目が自分のユーザー名となっていること
    let actual = await paymentRequestPage.getRequestingRow(1);
    expect(actual.asignee).to.equal(requester.first + ' ' + requester.family, '依頼者名目が自分のユーザー名となっていること');

    // 承認状況に「依頼済み」と表示されていること
    expect(actual.status).to.contains('依頼済み', '承認状況に「依頼済み」と表示されていること');
    await page.waitForTimeout(1000);
  });

  it("STEP6_No.94,95,96. 支払依頼ページ_承認（1次申請）", async function () {
    // テストの初期化を実施
    await initBrowser();

    const context = await browser.newContext(contextOption);
    if (page != null) {
      page.close();
    }
    page = await context.newPage();
    global.reporter.setBrowserInfo(browser, page);

    // ページオブジェクト
    const { loginPage, topPage, tradeShiftTopPage, journalMenuPage, paymentRequestListPage,
      paymentRequestPage, journalDetailPage }
      = common.getPageObject(browser, page);
  
    // デジタルトレードアプリのトップページへ遷移する
    await gotoTop(config.baseUrl, approveRoute.authorizers[0], loginPage, tradeShiftTopPage, topPage);

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

    // 仕訳情報にて、勘定科目・補助科目・部門データを選択する
    await comment('借方の勘定科目"' + accountCodes[1].name + '"・補助科目"' + accountCodes[1].subName + '"を選択する');
    await paymentRequestPage.selectAccountCode(1, accountCodes[1].code, accountCodes[1].subCode);
    await comment('借方の部門データ"' + departments[1].name + '"を選択する');
    await paymentRequestPage.selectDepartment(1, departments[1].code);
    await comment('貸方の勘定科目"' + accountCodes[0].name + '"・補助科目"' + accountCodes[0].subName + '"を選択する');
    await paymentRequestPage.selectCreditAccountCode(1, accountCodes[0].code, accountCodes[0].subCode);
    await comment('貸方の部門データ"' + departments[0].name + '"を選択する');
    await paymentRequestPage.selectCreditDepartment(1, departments[0].code);
    let lineAccountCode = await paymentRequestPage.getLineAccountCode(1);
    expect (lineAccountCode.accountCode).to.equal(accountCodes[1].code, '勘定科目を編集できること');
    expect (lineAccountCode.subAccountCode).to.equal(accountCodes[1].subCode, '補助科目を編集できること');
    expect (lineAccountCode.departmentCode).to.equal(departments[1].code, '部門データを編集できること');

    // メッセージを編集する
    let message = '1次承認者からのメッセージ';
    await paymentRequestPage.setMessage(message);
    expect (await paymentRequestPage.getMessage()).to.equal(message, 'メッセージを編集できること');

    // 承認する
    await paymentRequestPage.approve();
    await paymentRequestListPage.waitForLoading();

    // 「承認を完了しました。」のメッセージが表示されていること
    expect(await paymentRequestListPage.getPopupMessage()).to.contains('承認を完了しました。', '「承認を完了しました。」のメッセージが表示されていること');

    // 請求書一覧画面にて承認ステータスに変更されていること
    expect(await paymentRequestListPage.getApproveStatus(invoiceNo)).to.equal('一次承認済み', '請求書一覧画面にて承認ステータスに変更されていること');
    
    // 仕訳情報設定ページへ遷移する
    await comment('「仕訳情報設定」をクリックする');
    await paymentRequestListPage.clickDetail(invoiceNo);
    await journalDetailPage.waitForLoading();

    // 編集ができないこと
    expect(await journalDetailPage.isSearchVisible()).to.equal(false, '編集ができないこと');
    await page.waitForTimeout(1000);
  });

  it("STEP6_No.146,147,224,349,350. 支払依頼ページ_1次承認済み（申請者）", async function () {
    // テストの初期化を実施
    await initBrowser();
    const context = await browser.newContext(contextOption);
    if (page != null) {
      page.close();
    }
    page = await context.newPage();
    global.reporter.setBrowserInfo(browser, page);

    // ページオブジェクト
    const { loginPage, topPage, tradeShiftTopPage, journalMenuPage, paymentRequestListPage, paymentRequestPage }
      = common.getPageObject(browser, page);

    // デジタルトレードアプリのトップページへ遷移する
    await gotoTop(config.baseUrl, requester, loginPage, tradeShiftTopPage, topPage);

    // 仕訳情報管理メニューを開く
    await comment('「仕訳情報管理」をクリックする');
    await topPage.openJournalMenu();
    await journalMenuPage.waitForLoading();

    // 支払依頼一覧ページへ遷移する
    await comment('「支払依頼一覧」をクリックする');
    await journalMenuPage.clickPaymentRequest();
    await paymentRequestListPage.waitForLoading();

    // ステータスが「一次承認済み」となっていること
    expect(await paymentRequestListPage.getApproveStatus(invoiceNo)).to.equal('一次承認済み', 'ステータスが「一次承認済み」となっていること');
    
    // 承認待ちタブを開く
    await comment('「承認待ち」タブを開く');
    await paymentRequestListPage.clickConstruct();

    // 支払依頼ページへ遷移する
    await comment(invoiceNo + 'の「依頼内容確認」をクリックする');
    await paymentRequestListPage.clickConstructDetail(invoiceNo);
    await paymentRequestPage.waitForLoading();

    // 担当者名が自分のユーザー名となっていること
    let actual = await paymentRequestPage.getRequestingRow(1);
    expect(actual.asignee).to.equal(requester.first + ' ' + requester.family, '担当者名が自分のユーザー名となっていること');

    // 承認状況に「依頼済み」と表示されていること
    expect(actual.status).to.contains('依頼済み', '承認状況に「依頼済み」と表示されていること');

    // 一次承認にて担当者名に誤りがないこと
    actual = await paymentRequestPage.getRequestingRow(2);
    expect(actual.asignee).to.equal(approveRoute.authorizers[0].first + ' ' + approveRoute.authorizers[0].family, '一次承認にて担当者名に誤りがないこと');

    // 承認された日時が表示されること
    expect(actual.status).to.contains('承認済み', '承認された日時が表示されること');
    await page.waitForTimeout(1000);
  });

  it("STEP6_No.98,99,125. 支払依頼ページ_差し戻し", async function () {
    // テストの初期化を実施
    await initBrowser();
    const context = await browser.newContext(contextOption);
    if (page != null) {
      page.close();
    }
    page = await context.newPage();
    global.reporter.setBrowserInfo(browser, page);

    // ページオブジェクト
    const { loginPage, topPage, tradeShiftTopPage, journalMenuPage, paymentRequestListPage, paymentRequestPage }
      = common.getPageObject(browser, page);

    // デジタルトレードアプリのトップページへ遷移する
    await gotoTop(config.baseUrl, approveRoute.authorizers[1], loginPage, tradeShiftTopPage, topPage);

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
    await paymentRequestListPage.waitForLoading();

    // 「支払依頼を差し戻しました。」と表示されること
    expect(await paymentRequestListPage.getPopupMessage()).to.contains('支払依頼を差し戻しました。', '「支払依頼を差し戻しました。」と表示されること');

    // 差し戻しができること
    expect(await paymentRequestListPage.getApproveStatus(invoiceNo)).to.equal('差し戻し', '差し戻しができること');

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
    const context = await browser.newContext(contextOption);
    if (page != null) {
      page.close();
    }
    page = await context.newPage();
    global.reporter.setBrowserInfo(browser, page);

    // ページオブジェクト
    const { loginPage, topPage, tradeShiftTopPage, journalMenuPage, subAccountCodeListPage,
      accountCodeListPage, departmentListPage, approveRouteListPage }
        = common.getPageObject(browser, page);
  
    // デジタルトレードアプリのトップページへ遷移する
    await gotoTop(config.baseUrl, config.company1.mng, loginPage, tradeShiftTopPage, topPage);

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