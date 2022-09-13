const webdriverUtils = require('../utils/webdriver-utils');
const chai = require('chai');
const chaiWithReporting = require('../utils/chai-with-reporting').chaiWithReporting;
const comment = require('../utils/chai-with-reporting').comment;
const config = require('../autotest-script-config');
const common = require('./common');
const journalData = require('../autotest-journal-data');

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
    name: journalData.approveRoute.name,
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

  // 勘定科目・補助科目・部門データ・承認ルートを登録する
  it("準備", async function () {
    await initBrowser();
    common.getPageObject(browser, page);
    await common.registJournalData(page, approveRoute.authorizers[0], journalData, approveRoute);
  });

  /**
   * STEP6_No.126,127,143
   * STEP8_機能改修確認_No.50,62
   */
  it("支払依頼ページ_依頼", async function () {
    // テストの初期化を実施
    await initBrowser();

    // ページオブジェクト
    const { topPage, journalMenuPage, paymentRequestListPage, journalDetailPage, paymentRequestPage }
      = common.getPageObject(browser, page);

    // デジタルトレードアプリのトップページへ遷移する
    await common.gotoTop(page, requester);

    // 仕訳情報管理メニューを開く
    await comment('「仕訳情報管理」をクリックする');
    await topPage.openJournalMenu();
    await journalMenuPage.waitForLoading();

    // 支払依頼一覧ページへ遷移する
    await comment('「支払依頼一覧」をクリックする');
    await journalMenuPage.clickPaymentRequest();
    await paymentRequestListPage.waitForLoading();

    // ステータスが「差し戻し」となっていること
    let status = '差し戻し';
    await paymentRequestListPage.checkSearchStatus([status]);
    await paymentRequestListPage.clickSearch();
    expect(await paymentRequestListPage.getApproveStatus(invoiceNo)).to.equal(status, 'ステータスが「差し戻し」となっていること');

    // 仕訳情報設定ページへ遷移する
    await comment('「仕訳情報設定」をクリックする');
    await paymentRequestListPage.clickDetail(invoiceNo);
    await journalDetailPage.waitForLoading();

    // 支払い依頼ページへ遷移する
    await comment('「支払依頼へ」をクリックする');
    await journalDetailPage.clickPaymentRequest();
    await journalDetailPage.acceptPaymentRequest(true);
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
    authorizerNo = 0;

    // 再度申請ができること
    status = '支払依頼中';
    await paymentRequestListPage.checkSearchStatus([status]);
    await paymentRequestListPage.clickSearch();
    expect(await paymentRequestListPage.getApproveStatus(invoiceNo)).to.equal(status, 'ステータスが「承認依頼中」となっていること');

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
    const { topPage, journalMenuPage, paymentRequestListPage, paymentRequestPage } = common.getPageObject(browser, page);
  
    // デジタルトレードアプリのトップページへ遷移する
    await common.gotoTop(page, approveRoute.authorizers[no]);

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
    authorizerNo = no + 1;

    // 請求書一覧画面にて承認ステータスが変更されていること
    await paymentRequestListPage.waitForLoading();
    await paymentRequestListPage.checkSearchStatus([status]);
    await paymentRequestListPage.clickSearch();
    expect(await paymentRequestListPage.getApproveStatus(invoiceNo)).to.equal(status, '請求書一覧画面にて承認ステータスが変更されていること');
    await page.waitForTimeout(1000);
  }

  /**
   * STEP6_No.94,95,96
   * STEP8_機能改修確認_No.51
   */
  it("支払依頼ページ_承認（1次承認）", async function () {
    await approve(0, '一次承認済み');
  });

  /**
   * STEP6_No.226
   * STEP8_機能改修確認_No.52
   */
  it("支払依頼ページ_承認（2次承認）", async function () {
    await approve(1, '二次承認済み');
  });

  /**
   * STEP6_No.228
   * STEP8_機能改修確認_No.53
   */
  it("支払依頼ページ_承認（3次承認）", async function () {
    await approve(2, '三次承認済み');
  });

  /**
   * STEP6_No.230
   * STEP8_機能改修確認_No.54
   */
  it("支払依頼ページ_承認（4次承認）", async function () {
    await approve(3, '四次承認済み');
  });

  /**
   * STEP6_No.232
   * STEP8_機能改修確認_No.55
   */
  it("支払依頼ページ_承認（5次承認）", async function () {
    await approve(4, '五次承認済み');
  });

  /**
   * STEP6_No.234
   * STEP8_機能改修確認_No.56
   */
  it("支払依頼ページ_承認（6次承認）", async function () {
    await approve(5, '六次承認済み');
  });

  /**
   * STEP6_No.236
   * STEP8_機能改修確認_No.57
   */
  it("支払依頼ページ_承認（7次承認）", async function () {
    await approve(6, '七次承認済み');
  });

  /**
   * STEP6_No.238
   * STEP8_機能改修確認_No.58
   */
  it("支払依頼ページ_承認（8次承認）", async function () {
    await approve(7, '八次承認済み');
  });

  /**
   * STEP6_No.240
   * STEP8_機能改修確認_No.59
   */
  it("支払依頼ページ_承認（9次承認）", async function () {
    await approve(8, '九次承認済み');
  });

  /**
   * STEP6_No.242
   * STEP8_機能改修確認_No.60
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
    const { topPage, journalMenuPage, paymentRequestListPage, paymentRequestPage } = common.getPageObject(browser, page);

    // デジタルトレードアプリのトップページへ遷移する
    await common.gotoTop(page, requester);

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
    const { topPage, journalMenuPage, paymentRequestListPage, paymentRequestPage } = common.getPageObject(browser, page);

    // デジタルトレードアプリのトップページへ遷移する
    await common.gotoTop(page, approveRoute.authorizers[authorizerNo]);

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
    authorizerNo = -1;

    // ポップアップを閉じる
    await comment('ポップアップメッセージを閉じる');
    await paymentRequestListPage.closePopup();
    await paymentRequestListPage.waitForLoading();

    // 差し戻しができること
    expect(await paymentRequestListPage.getApproveStatus(invoiceNo)).to.equal('差し戻し', '差し戻しができること');

    // 承認待ちタブを開く
    await comment('「承認待ち」タブを開く');
    await paymentRequestListPage.clickConstruct();

    // 請求書一覧の承認タブに表示されないこと
    expect(await paymentRequestListPage.hasConstructRow(invoiceNo)).to.equal(false, '請求書一覧の承認タブに表示されないこと');
    await page.waitForTimeout(1000);
  });

  // 勘定科目・補助科目・部門データ・承認ルートを削除する
  // （再登録に費やす時間を削減するため、コメントアウト）
  /*
  it("後片付け", async function() {
    await initBrowser();
    common.getPageObject(browser, page);
    await common.deleteJournalData(page, approveRoute.authorizers[0], approveRoute.name);
  });
  */
});
