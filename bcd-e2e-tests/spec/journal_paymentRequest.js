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

describe('仕訳情報設定_支払依頼（一次承認まで）', function () {

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

  async function gotoList(account, topPage, paymentRequestListPage) {
    // デジタルトレードアプリのトップページへ遷移する
    await common.gotoTop(page, account);

    // 支払依頼一覧ページへ遷移する
    await topPage.clickPaymentRequest();
    await paymentRequestListPage.waitForLoading();
  };

  // 勘定科目・補助科目・部門データ・承認ルートを登録する
  it("準備", async function () {
    await initBrowser();
    common.getPageObject(browser, page);
    await common.registJournalData(page, approveRoute.authorizers[0], journalData, approveRoute);
  });

  /**
   * STEP6_No.220,45,46,48
   * STEP7_No.93
   */
  it("支払依頼ページ表示", async function () {
    // テストの初期化を実施
    await initBrowser();

    // ページオブジェクト
    const { topPage, paymentRequestListPage, journalDetailPage, paymentRequestPage }
      = common.getPageObject(browser, page);

    // 支払依頼一覧ページへ遷移する
    await gotoList(requester, topPage, paymentRequestListPage);

    // ステータスが「未処理」となっていること
    expect(await paymentRequestListPage.getApproveStatus('fcde40391')).to.equal('未処理', 'ステータスが「未処理」となっていること');

    // 仕訳情報設定ページへ遷移する
    let cost = await paymentRequestListPage.getCost(invoiceNo);
    let sender = await paymentRequestListPage.getSender(invoiceNo);
    let status = await paymentRequestListPage.getApproveStatus(invoiceNo);
    await paymentRequestListPage.clickDetail(invoiceNo);
    await journalDetailPage.waitForLoading();

    // 支払い依頼ページへ遷移する
    await journalDetailPage.clickPaymentRequest();
    await journalDetailPage.acceptPaymentRequest(true);
    await paymentRequestPage.waitForLoading();

    // 請求書番号、宛先、差出人が確認できること
    expect(await paymentRequestPage.getNo()).to.equal(invoiceNo, '請求書番号が"' + invoiceNo + '"であること');
    expect(await paymentRequestPage.getSender()).to.equal(sender, '差出人が"' + sender + '"であること');

    // 合計欄を確認できること
    expect(await paymentRequestPage.getCost()).to.equal(cost, '合計価格が"' + cost + '"であること');

    // 最初に設定した貸方、借方の仕訳情報が残っていること
    if (status == '差し戻し') {
      expect(await paymentRequestPage.hasBreakdown(1, 1, false, journalData.accountCodes[0].code, journalData.accountCodes[0].subCode, journalData.departments[1].code)).to.equal(true, '仕訳情報（借方）が表示されること');
      expect(await paymentRequestPage.hasBreakdown(1, 1, true, journalData.accountCodes[1].code, journalData.accountCodes[1].subCode, journalData.departments[0].code)).to.equal(true, '仕訳情報（貸方）が表示されること');
    }
    await page.waitForTimeout(1000);
  });

  /**
   * STEP6_No.49,52
   */
  it("支払依頼ページ_メッセージ入力", async function () {
    // テストの初期化を実施
    await initBrowser();

    // ページオブジェクト
    const { topPage, paymentRequestListPage, journalDetailPage, paymentRequestPage } = common.getPageObject(browser, page);

    // 仕訳情報設定ページへ遷移する
    await gotoList(requester, topPage, paymentRequestListPage);
    await paymentRequestListPage.clickDetail(invoiceNo);
    await journalDetailPage.waitForLoading();

    // 支払い依頼ページへ遷移する
    await journalDetailPage.clickPaymentRequest();
    await journalDetailPage.acceptPaymentRequest(true);
    await paymentRequestPage.waitForLoading();

    // メッセージを入力する
    let message = 'メッセージテスト123456789abcdefghijklmnopqrstuvwxyz';
    await paymentRequestPage.setMessage(message);

    // 入力したデータが正しく反映されること
    expect(await paymentRequestPage.getMessage()).to.equal(message, '入力したデータが正しく反映されること');
    await page.waitForTimeout(1000);
  });

  /**
   * STEP6_No.53,54,56,57,58
   */
  it("支払依頼ページ_承認ルート選択", async function () {
    // テストの初期化を実施
    await initBrowser();

    // ページオブジェクト
    const { topPage, paymentRequestListPage, journalDetailPage, paymentRequestPage } = common.getPageObject(browser, page);

    // 仕訳情報設定ページへ遷移する
    await gotoList(requester, topPage, paymentRequestListPage);
    await paymentRequestListPage.clickDetail(invoiceNo);
    await journalDetailPage.waitForLoading();

    // 支払い依頼ページへ遷移する
    await journalDetailPage.clickPaymentRequest();
    await journalDetailPage.acceptPaymentRequest(true);
    await paymentRequestPage.waitForLoading();

    // 承認ルート選択ダイアログを表示する
    await paymentRequestPage.clickRouteSearch();

    // 承認ルートを検索する
    await paymentRequestPage.searchRoute(approveRoute.name);

    // 検索モーダルにて検索した承認ルートが表示されること
    expect(await paymentRequestPage.hasRouteRow(approveRoute.name)).to.equal(true, '検索モーダルにて検索した承認ルートが表示されること');

    // 当該承認ルートの詳細画面に遷移されること
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
    await paymentRequestPage.selectRoute(approveRoute.name);
    expect(await paymentRequestPage.getRouteName()).to.equal(approveRoute.name, '承認ルートを設定できること');
    await page.waitForTimeout(1000);
  });

  /**
   * STEP6_No.65,78-81,140,144,222
   * STEP7_No.27,37,38,39
   * STEP8_機能改修確認_No.119-123
   */
  it("支払依頼ページ_依頼", async function () {
    // テストの初期化を実施
    await initBrowser();

    // ページオブジェクト
    const { topPage, paymentRequestListPage, journalDetailPage, paymentRequestPage } = common.getPageObject(browser, page);

    // 仕訳情報設定ページへ遷移する
    await gotoList(requester, topPage, paymentRequestListPage);
    await paymentRequestListPage.clickDetail(invoiceNo);
    await journalDetailPage.waitForLoading();

    // 仕訳情報にて、勘定科目・補助科目・部門データを選択する
    let i = 0;
    let acCount = await journalDetailPage.getAccountCodeCount(1);
    for (i = 0; i < acCount; i++) {
      await journalDetailPage.selectAccountCode(1, i + 1, false, journalData.accountCodes[i].code, journalData.accountCodes[i].subCode);
      await journalDetailPage.selectDepartment(1, i + 1, false, journalData.departments[0].code);
      let acIdx = i < journalData.accountCodes.length - 1 ? i + 1 : 0;
      await journalDetailPage.selectAccountCode(1, i + 1, true, journalData.accountCodes[acIdx].code, journalData.accountCodes[acIdx].subCode);
      await journalDetailPage.selectDepartment(1, i + 1, true, journalData.departments[1].code);
    }

    // 保存する
    await journalDetailPage.save();
    await page.waitForTimeout(5000);

    // 「支払依頼へ」ボタンが活性になっていること
    expect(await journalDetailPage.isPaymentRequestDisabled()).to.equal(false, '「支払依頼へ」ボタンが活性になっていること');

    // ポップアップが表示されること
    await journalDetailPage.clickPaymentRequest();
    expect(await journalDetailPage.getPaymentRequestMsg()).to.equal('保存していない仕訳情報はクリアされます。', 'ポップアップが表示されること');

    // ポップアップが閉じ、仕訳情報設定画面のままであること
    await journalDetailPage.acceptPaymentRequest(false);
    expect(await journalDetailPage.getTitle()).to.equal(journalDetailPage.title, 'ポップアップが閉じ、仕訳情報設定画面のままであること');

    // 「支払依頼へ」ボタンが活性のままであること
    await journalDetailPage.back();
    await paymentRequestListPage.waitForLoading();
    await paymentRequestListPage.clickDetail(invoiceNo);
    await journalDetailPage.waitForLoading();
    expect(await journalDetailPage.isPaymentRequestDisabled()).to.equal(false, '「支払依頼へ」ボタンが活性のままであること');

    // 支払依頼画面に遷移すること
    await journalDetailPage.clickPaymentRequest();
    await journalDetailPage.acceptPaymentRequest(true);
    await paymentRequestPage.waitForLoading();
    expect(await paymentRequestPage.getTitle()).to.equal(paymentRequestPage.title, '支払依頼画面に遷移すること');

    // メッセージを入力する
    let message = '承認依頼メッセージ';
    await paymentRequestPage.setMessage(message);

    // 承認ルート選択ダイアログを表示する
    await paymentRequestPage.clickRouteSearch();

    // 承認ルートを検索する
    await paymentRequestPage.searchRoute(approveRoute.name);
    await paymentRequestPage.selectRoute(approveRoute.name);

    // 支払依頼を行う
    await comment('支払依頼を行う');
    await paymentRequestPage.submit();
    await paymentRequestListPage.waitPopup();

    // ポップアップを閉じる
    await paymentRequestListPage.closePopup();
    await paymentRequestListPage.waitForLoading();

    // 依頼がされること
    expect(await paymentRequestListPage.getApproveStatus(invoiceNo)).to.equal('支払依頼中', '依頼がされること');
    authorizerNo++;

    // 承認待ちタブに支払依頼の請求書があること
    await paymentRequestListPage.clickConstruct();
    expect(await paymentRequestListPage.hasConstructRow(invoiceNo)).to.equal(true, '支払依頼の請求書があること');
    
    // 詳細画面に遷移すること
    await paymentRequestListPage.clickConstructDetail(invoiceNo);
    await paymentRequestPage.waitForLoading();
    expect(await paymentRequestPage.getNo()).to.equal(invoiceNo, '詳細画面に遷移すること');

    // 仕訳情報が表示されること
    expect(await paymentRequestPage.hasBreakdown(1, 1, false, journalData.accountCodes[0].code, journalData.accountCodes[0].subCode, journalData.departments[0].code)).to.equal(true, '仕訳情報（借方）が表示されること');
    expect(await paymentRequestPage.hasBreakdown(1, 1, true, journalData.accountCodes[1].code, journalData.accountCodes[1].subCode, journalData.departments[1].code)).to.equal(true, '仕訳情報（貸方）が表示されること');

    // 依頼者名目が自分のユーザー名となっていること
    let actual = await paymentRequestPage.getRequestingRow(1);
    expect(actual.asignee).to.equal(requester.family + ' ' + requester.first, '依頼者名目が自分のユーザー名となっていること');

    // 承認状況に「依頼済み」と表示されていること
    expect(actual.status).to.contains('依頼済み', '承認状況に「依頼済み」と表示されていること');
    await page.waitForTimeout(1000);
  });

  // 勘定科目・補助科目を検索・選択する
  async function selectAccount(paymentRequestPage, lineNo, acNo, isCredit, accountCode) {
    // 仕訳情報入力フォームにて、勘定科目の「検索」をクリックする
    await paymentRequestPage.clickAccountCodeSearch(lineNo, acNo, isCredit);

    // 勘定科目、補助科目を検索する
    await paymentRequestPage.searchAccount(isCredit, accountCode.code, accountCode.name, accountCode.subCode, accountCode.subName);

    // 検索結果に入力した勘定科目・補助科目が表示されること
    expect(await paymentRequestPage.hasAccountRow(isCredit, accountCode.code, accountCode.subCode)).to.equal(true, '【支払依頼】検索結果に入力した勘定科目・補助科目が表示されること');

    // 先頭の検索結果をクリックする
    await paymentRequestPage.clickAccountRow(isCredit, accountCode.code, accountCode.subCode);
  };

  // 部門データを検索・選択する
  async function selectDepartment(paymentRequestPage, lineNo, acNo, isCredit, department) {
    // 先頭の仕訳情報入力フォームにて、部門データの「検索」をクリックする
    await paymentRequestPage.clickDepartmentSearch(lineNo, acNo, isCredit);

    // 部門データを検索する
    await paymentRequestPage.searchDepartment(isCredit, department.code, department.name);

    // 検索結果に入力した部門データが表示されること
    expect(await paymentRequestPage.hasDepartmentRow(isCredit, department.code)).to.equal(true, '【支払依頼】検索結果に入力した部門データが表示されること');

    // 先頭の検索結果をクリックする
    await paymentRequestPage.clickDepartmentRow(isCredit, department.code);
  };

  /**
   * STEP6_No.94,95,96
   * STEP7_No.40,73-90,95,98
   */
  it("支払依頼ページ_承認（1次承認）", async function () {
    // テストの初期化を実施
    await initBrowser();

    // ページオブジェクト
    const { topPage, paymentRequestListPage, paymentRequestPage, journalDetailPage } = common.getPageObject(browser, page);

    // 支払依頼一覧ページへ遷移する
    await gotoList(approveRoute.authorizers[0], topPage, paymentRequestListPage);

    // 承認待ちタブを開く
    await paymentRequestListPage.clickConstruct();

    // 支払依頼ページへ遷移する
    await paymentRequestListPage.clickConstructDetail(invoiceNo);
    await paymentRequestPage.waitForLoading();

    // 仕訳情報を追加・選択する
    let acCount = await paymentRequestPage.getBreakdownCount(1);
    for(i = 0; i < 10; i++) {
      if (i >= acCount) {
        await paymentRequestPage.clickAddBreakdown(1);
      }
      await selectAccount(paymentRequestPage, 1, i + 1, false, journalData.accountCodes[i]);
      await selectDepartment(paymentRequestPage, 1, i + 1, false, journalData.departments[1]);
      expect(await paymentRequestPage.hasBreakdown(1, i + 1, false, journalData.accountCodes[i].code, journalData.accountCodes[i].subCode, journalData.departments[1].code)).to.equal(true, '1番目の明細、' + (i + 1) + '番目の仕訳情報にて、選択した勘定科目・補助科目・部門データ（借方）が反映されていること');
      let acIdx = i < journalData.accountCodes.length - 1 ? i + 1 : 0;
      await selectAccount(paymentRequestPage, 1, i + 1, true, journalData.accountCodes[acIdx]);
      await selectDepartment(paymentRequestPage, 1, i + 1, true, journalData.departments[0]);
      expect(await paymentRequestPage.hasBreakdown(1, i + 1, true, journalData.accountCodes[acIdx].code, journalData.accountCodes[acIdx].subCode, journalData.departments[0].code)).to.equal(true, '1番目の明細、' + (i + 1) + '番目の仕訳情報にて、選択した勘定科目・補助科目・部門データ（貸方）が反映されていること');
      if (i > 0) {
        await paymentRequestPage.inputBreakdownCost(1, i + 1, 100);
      }
    }

    // 承認確認ポップアップを表示する
    await paymentRequestPage.checkApproval();

    // 「支払依頼確認」ポップアップが表示され、追加した分を含む仕訳情報が表示されていること
    expect(await paymentRequestPage.getBreakdownCountOnApproval(1)).to.equal(10, '承認確認ポップアップ内、1番目の明細の仕訳情報数が10であること');
    for(i = 0; i < 10; i++) {
      expect(await paymentRequestPage.hasBreakdownOnApproval(1, i + 1, false, journalData.accountCodes[i].code, journalData.accountCodes[i].subCode, journalData.departments[1].code)).to.equal(true, '承認確認ポップアップ内、1番目の明細、' + (i + 1) + '番目の仕訳情報にて、選択した勘定科目・補助科目・部門データ（借方）が反映されていること');
      let acIdx = i < journalData.accountCodes.length - 1 ? i + 1 : 0;
      expect(await paymentRequestPage.hasBreakdownOnApproval(1, i + 1, true, journalData.accountCodes[acIdx].code, journalData.accountCodes[acIdx].subCode, journalData.departments[0].code)).to.equal(true, '承認確認ポップアップ内、1番目の明細、' + (i + 1) + '番目の仕訳情報にて、選択した勘定科目・補助科目・部門データ（貸方）が反映されていること');
    }

    // 承認をキャンセルする
    await paymentRequestPage.cancelApproval();

    // 仕訳情報を削減する
    for(i = 0; i < 9; i++) {
      await paymentRequestPage.clickDelBreakdown(1, 10 - i);
    }

    // メッセージを編集する
    let message = '1次承認者からのメッセージ';
    await paymentRequestPage.setMessage(message);
    expect (await paymentRequestPage.getMessage()).to.equal(message, 'メッセージを編集できること');

    // 承認確認ポップアップを表示する
    await paymentRequestPage.checkApproval();
    
    //「支払依頼確認」ポップアップが表示され、削減された状態で仕訳情報が表示されていること
    expect(await paymentRequestPage.getBreakdownCountOnApproval(1)).to.equal(1, '承認確認ポップアップ内、1番目の明細の仕訳情報数が1であること');

    // 承認する
    await paymentRequestPage.approve();
    await paymentRequestListPage.waitPopup();

    // 「承認を完了しました。」のメッセージが表示されていること
    expect(await paymentRequestListPage.getPopupMessage()).to.contains('承認を完了しました。', '「承認を完了しました。」のメッセージが表示されていること');
    authorizerNo = 1;

    // ポップアップを閉じる
    await paymentRequestListPage.closePopup();
    await paymentRequestListPage.waitForLoading();

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

  /**
   * STEP6_No.146,147,224,349,350
   */
  it("支払依頼ページ_1次承認済み（申請者）", async function () {
    // テストの初期化を実施
    await initBrowser();

    // ページオブジェクト
    const { topPage, paymentRequestListPage, paymentRequestPage } = common.getPageObject(browser, page);

    // 支払依頼一覧ページへ遷移する
    await gotoList(requester, topPage, paymentRequestListPage);

    // ステータスが「一次承認済み」となっていること
    expect(await paymentRequestListPage.getApproveStatus(invoiceNo)).to.equal('一次承認済み', 'ステータスが「一次承認済み」となっていること');
    
    // 承認待ちタブを開く
    await paymentRequestListPage.clickConstruct();

    // 支払依頼ページへ遷移する
    await paymentRequestListPage.clickConstructDetail(invoiceNo);
    await paymentRequestPage.waitForLoading();

    // 担当者名が自分のユーザー名となっていること
    let actual = await paymentRequestPage.getRequestingRow(1);
    expect(actual.asignee).to.equal(requester.family + ' ' + requester.first, '担当者名が自分のユーザー名となっていること');

    // 承認状況に「依頼済み」と表示されていること
    expect(actual.status).to.contains('依頼済み', '承認状況に「依頼済み」と表示されていること');

    // 一次承認にて担当者名に誤りがないこと
    actual = await paymentRequestPage.getRequestingRow(2);
    expect(actual.asignee).to.equal(approveRoute.authorizers[0].family + ' ' + approveRoute.authorizers[0].first, '一次承認にて担当者名に誤りがないこと');

    // 承認された日時が表示されること
    expect(actual.status).to.contains('承認済み', '承認された日時が表示されること');
    await page.waitForTimeout(1000);
  });

  /**
   * STEP6_No.98,99,125
   * STEP7_No.91,92
   */
  it("支払依頼ページ_差し戻し", async function () {
    // テストの初期化を実施
    await initBrowser();

    // ページオブジェクト
    const { topPage, paymentRequestListPage, paymentRequestPage } = common.getPageObject(browser, page);

    // 支払依頼一覧ページへ遷移する
    await gotoList(approveRoute.authorizers[authorizerNo], topPage, paymentRequestListPage);

    // 承認待ちタブを開く
    await paymentRequestListPage.clickConstruct();

    // 支払依頼ページへ遷移する
    await paymentRequestListPage.clickConstructDetail(invoiceNo);
    await paymentRequestPage.waitForLoading();

    // 差し戻す
    await paymentRequestPage.reject();
    await paymentRequestListPage.waitPopup();

    // 「支払依頼を差し戻しました。」と表示されること
    expect(await paymentRequestListPage.getPopupMessage()).to.contains('支払依頼を差し戻しました。', '「支払依頼を差し戻しました。」と表示されること');
    authorizer = -1;

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
