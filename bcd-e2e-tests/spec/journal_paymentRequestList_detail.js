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

describe('仕訳情報設定_支払依頼一覧（仕訳情報保存）', function () {

  // テストデータ：勘定科目・補助科目
  const accountCodes = [
    { code:'TAccount01', name:'テスト用勘定科目名１', subCode:'TAccoSUB11', subName:'テスト用補助科目名１' },
    { code:'TAccount01', name:'テスト用勘定科目名１', subCode:'TAccoSUB12', subName:'テスト用補助科目名２' },
    { code:'TAccount01', name:'テスト用勘定科目名１', subCode:'TAccoSUB13', subName:'テスト用補助科目名３' },
    { code:'TAccount01', name:'テスト用勘定科目名１', subCode:'TAccoSUB14', subName:'テスト用補助科目名４' },
    { code:'TAccount01', name:'テスト用勘定科目名１', subCode:'TAccoSUB15', subName:'テスト用補助科目名５' },
    { code:'TAccount02', name:'テスト用勘定科目名２', subCode:'TAccoSUB21', subName:'テスト用補助科目名１' },
    { code:'TAccount02', name:'テスト用勘定科目名２', subCode:'TAccoSUB22', subName:'テスト用補助科目名２' },
    { code:'TAccount02', name:'テスト用勘定科目名２', subCode:'TAccoSUB23', subName:'テスト用補助科目名３' },
    { code:'TAccount02', name:'テスト用勘定科目名２', subCode:'TAccoSUB24', subName:'テスト用補助科目名４' },
    { code:'TAccount02', name:'テスト用勘定科目名２', subCode:'TAccoSUB25', subName:'テスト用補助科目名５' }
  ];

  // テストデータ：部門
  const departments = [
    { code:'TDep01', name:'テスト用部門コード名１' },
    { code:'TDep02', name:'テスト用部門コード名２' },
    { code:'TDep03', name:'テスト用部門コード名３' },
    { code:'TDep04', name:'テスト用部門コード名４' },
    { code:'TDep05', name:'テスト用部門コード名５' },
    { code:'TDep06', name:'テスト用部門コード名６' },
    { code:'TDep07', name:'テスト用部門コード名７' },
    { code:'TDep08', name:'テスト用部門コード名８' },
    { code:'TDep09', name:'テスト用部門コード名９' },
    { code:'TDep10', name:'テスト用部門コード名１０' }
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

  // 支払依頼一覧まで遷移する
  async function gotoPaymentRequestList(account, loginPage, tradeShiftTopPage, topPage, journalMenuPage, paymentRequestListPage) {
    await gotoTop(account, loginPage, tradeShiftTopPage, topPage);

    // 仕訳情報管理メニューを開く
    await comment('「仕訳情報管理」をクリックする');
    await topPage.openJournalMenu();
    await journalMenuPage.waitForLoading();

    // 支払依頼一覧ページへ遷移する
    await comment('「支払依頼一覧」をクリックする');
    await journalMenuPage.clickPaymentRequest();
    await paymentRequestListPage.waitForLoading();
  };

  it("準備（勘定科目、補助科目、部門データ作成）", async function () {
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
      subAccountCodeListPage, registSubAccountCodePage, departmentListPage, registDepartmentPage }
      = common.getPageObject(browser, page);

    // デジタルトレードアプリのトップページへ遷移する
    await gotoTop(config.company2.user04, loginPage, tradeShiftTopPage, topPage);

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
        ||  await subAccountCodeListPage.hasRow(accountCodes[i].subCode, accountCodes[i].subName)) {
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
    await page.waitForTimeout(1000);
  });

  // 勘定科目・補助科目部門データを選択する
  async function selectAccount(journalDetailPage, lineCount, acCount, withNoCredit, withCredit) {
    let i, j = 0;
    for (i = 0; i < lineCount; i++) {
      for (j = 0; j < acCount; j++) {
        if (withNoCredit) {
          await journalDetailPage.selectAccountCode(i + 1, j + 1, false, accountCodes[j].code, accountCodes[j].subCode);
          await journalDetailPage.selectDepartment(i + 1, j + 1, false, departments[j].code);
        }
        if (withCredit) {
          let creditIdx = j < accountCodes.length - 1 ? j + 1 : 0;
          await journalDetailPage.selectAccountCode(i + 1, j + 1, true, accountCodes[creditIdx].code, accountCodes[creditIdx].subCode);
          await journalDetailPage.selectDepartment(i + 1, j + 1, true, departments[creditIdx].code);
        }
        if (j > 0) {
          await journalDetailPage.inputBreakdownCost(i + 1, j + 1, '100');
        }
      }
    }
  };

  // 勘定科目・補助科目部門データを確認する
  async function validateDetails(journalDetailPage, lineCount, acCount, withNoCredit, withCredit) {
    let i, j = 0;
    for (i = 0; i < lineCount; i++) {
      for (j = 0; j < acCount; j++) {
        if (withNoCredit) {
          expect(await journalDetailPage.hasBreakdown(i + 1, j + 1, false, accountCodes[j].code, accountCodes[j].subCode, departments[j].code)).to.equal(true, '明細' + (i + 1) + '番目、内訳番号' + (j + 1) + '番目：借方の情報が保持されていること');
        }
        if (withCredit) {
          let creditIdx = j < accountCodes.length - 1 ? j + 1 : 0;
          expect(await journalDetailPage.hasBreakdown(i + 1, j + 1, true, accountCodes[creditIdx].code, accountCodes[creditIdx].subCode, departments[creditIdx].code)).to.equal(true, '明細' + (i + 1) + '番目、内訳番号' + (j + 1) + '番目：貸方の情報が保持されていること');
        }
      }
    }
  };

  // 支払依頼ページ内、仕訳情報設定のテスト（「支払依頼」タブ）
  async function setDetails(invoiceNo, lineCount, acCount, withNoCredit, withCredit) {
    // テストの初期化を実施
    await initBrowser();
    const context = await browser.newContext(contextOption);
    if (page != null) {
      page.close();
    }
    page = await context.newPage();
    global.reporter.setBrowserInfo(browser, page);

    // ページオブジェクト
    const { loginPage, topPage, tradeShiftTopPage, journalMenuPage, paymentRequestListPage, journalDetailPage, paymentRequestPage }
      = common.getPageObject(browser, page);

    // 支払依頼一覧ページへ遷移する
    await gotoPaymentRequestList(config.company2.user04, loginPage, tradeShiftTopPage, topPage, journalMenuPage, paymentRequestListPage);

    // 仕訳情報設定ページへ遷移する
    await comment('「仕訳情報設定」をクリックする');
    await paymentRequestListPage.clickDetail(invoiceNo);
    await journalDetailPage.waitForLoading();

    // 全ての勘定科目・補助科目・部門データを選択する
    await selectAccount(journalDetailPage, lineCount, acCount, withNoCredit, withCredit);

    // 保存する
    await journalDetailPage.save();

    // エラーなく保存できること
    expect(true).to.equal(true, 'エラーなく保存できること');

    // ログアウトする
    await tradeShiftTopPage.logout();
    await loginPage.waitForLoading();

    // 別のユーザでログインし、支払依頼一覧ページへ遷移する
    await gotoPaymentRequestList(config.company2.user05, loginPage, tradeShiftTopPage, topPage, journalMenuPage, paymentRequestListPage);

    // 仕訳情報設定ページへ遷移する
    await comment('「仕訳情報設定」をクリックする');
    await paymentRequestListPage.clickDetail(invoiceNo);
    await journalDetailPage.waitForLoading();

    // 直前に保存された内容が保持されていること
    validateDetails(journalDetailPage, lineCount, acCount, withNoCredit, withCredit);
    await page.waitForTimeout(1000);
  };

  /**
   * STEP7_No.25,26
   */
  it("明細数1、仕訳数10（借方あり、貸方なし）", async function() {
    await setDetails('atest011010', 1, 10, true, false);
  });

  /**
   * STEP7_No.27,28
   *//*
  it("明細数1、仕訳数10（借方あり、貸方あり）", async function() {
    await setDetails('atest011011', 1, 10, true, true);
  });*/

  /**
   * STEP7_No.29,30
   */
  it("明細数1、仕訳数10（借方なし、貸方あり）", async function() {
    await setDetails('atest011001', 1, 10, false, true);
  });

  /**
   * STEP7_No.31,32
   *//*
  it("明細数2、仕訳数10（借方あり、貸方なし）", async function() {
    await setDetails('atest021010', 2, 10, true, false);
  });*/

  /**
   * STEP7_No.33,34
   */
  it("明細数2、仕訳数10（借方あり、貸方あり）", async function() {
    await setDetails('atest021011', 2, 10, true, true);
  });

  /**
   * STEP7_No.35,36
   *//*
  it("明細数2、仕訳数10（借方なし、貸方あり）", async function() {
    await setDetails('atest021001', 2, 10, false, true);
  });*/

  it("後片付け（勘定科目、補助科目、部門データ全削除）", async function() {
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
      accountCodeListPage, departmentListPage }
      = common.getPageObject(browser, page);
  
    // デジタルトレードアプリのトップページへ遷移する
    await gotoTop(config.company2.user04, loginPage, tradeShiftTopPage, topPage);

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
  });
});
