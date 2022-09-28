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

describe('仕訳情報設定_支払依頼一覧（仕訳情報保存）', function () {

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

  // 支払依頼一覧まで遷移する
  async function gotoPaymentRequestList(account, topPage, journalMenuPage, paymentRequestListPage) {
    await common.gotoTop(page, account);

    // 仕訳情報管理メニューを開く
    await comment('「仕訳情報管理」をクリックする');
    await topPage.openJournalMenu();
    await journalMenuPage.waitForLoading();

    // 支払依頼一覧ページへ遷移する
    await journalMenuPage.clickPaymentRequest();
    await paymentRequestListPage.waitForLoading();
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
    await common.registJournalData(page, config.company2.user04, journalData, null);
  });

  // 勘定科目・補助科目部門データを選択する
  async function selectAccount(journalDetailPage, lineCount, acCount, withNoCredit, withCredit) {
    let i, j = 0;
    for (i = 0; i < lineCount; i++) {
      for (j = 0; j < acCount; j++) {
        if (withNoCredit) {
          await journalDetailPage.selectAccountCode(i + 1, j + 1, false, journalData.accountCodes[j].code, journalData.accountCodes[j].subCode);
          await journalDetailPage.selectDepartment(i + 1, j + 1, false, journalData.departments[0].code);
        }
        if (withCredit) {
          let creditIdx = j < journalData.accountCodes.length - 1 ? j + 1 : 0;
          await journalDetailPage.selectAccountCode(i + 1, j + 1, true, journalData.accountCodes[creditIdx].code, journalData.accountCodes[creditIdx].subCode);
          await journalDetailPage.selectDepartment(i + 1, j + 1, true, journalData.departments[1].code);
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
          expect(await journalDetailPage.hasBreakdown(i + 1, j + 1, false, journalData.accountCodes[j].code, journalData.accountCodes[j].subCode, journalData.departments[0].code)).to.equal(true, '明細' + (i + 1) + '番目、内訳番号' + (j + 1) + '番目：借方の情報が保持されていること');
        }
        if (withCredit) {
          let creditIdx = j < journalData.accountCodes.length - 1 ? j + 1 : 0;
          expect(await journalDetailPage.hasBreakdown(i + 1, j + 1, true, journalData.accountCodes[creditIdx].code, journalData.accountCodes[creditIdx].subCode, journalData.departments[1].code)).to.equal(true, '明細' + (i + 1) + '番目、内訳番号' + (j + 1) + '番目：貸方の情報が保持されていること');
        }
      }
    }
  };

  // 支払依頼ページ内、仕訳情報設定のテスト
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
    const { loginPage, topPage, tradeShiftTopPage, journalMenuPage, paymentRequestListPage, journalDetailPage }
      = common.getPageObject(browser, page);

    // 支払依頼一覧ページへ遷移する
    await gotoPaymentRequestList(config.company2.user04, topPage, journalMenuPage, paymentRequestListPage);

    // 仕訳情報設定ページへ遷移する
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
    await gotoPaymentRequestList(config.company2.user05, topPage, journalMenuPage, paymentRequestListPage);

    // 仕訳情報設定ページへ遷移する
    await paymentRequestListPage.clickDetail(invoiceNo);
    await journalDetailPage.waitForLoading();

    // 直前に保存された内容が保持されていること
    await validateDetails(journalDetailPage, lineCount, acCount, withNoCredit, withCredit);
    await page.waitForTimeout(1000);
  };

  /**
   * STEP7_No.25,26
   */
  it("明細数1、仕訳数10（借方あり、貸方なし）", async function() {
    await setDetails('atest011010', 1, 10, true, false);
  });

  /**
   * STEP7_No.29,30
   */
  it("明細数1、仕訳数10（借方なし、貸方あり）", async function() {
    await setDetails('atest011001', 1, 10, false, true);
  });

  /**
   * STEP7_No.33,34
   */
  it("明細数2、仕訳数10（借方あり、貸方あり）", async function() {
    await setDetails('atest021011', 2, 10, true, true);
  });

  // 支払依頼ページ内、仕訳情報設定のテスト（一括登録）
  async function setBulk(invoiceNo, lineCount, acCount, withNoCredit, withCredit) {
    // テストの初期化を実施
    await initBrowser();
    const context = await browser.newContext(contextOption);
    if (page != null) {
      page.close();
    }
    page = await context.newPage();
    global.reporter.setBrowserInfo(browser, page);

    // ページオブジェクト
    const { topPage, journalMenuPage, paymentRequestListPage, journalDetailPage } = common.getPageObject(browser, page);

    // 支払依頼一覧ページへ遷移する
    await gotoPaymentRequestList(config.company2.user04, topPage, journalMenuPage, paymentRequestListPage);

    // 仕訳情報設定ページへ遷移する
    await comment('「仕訳情報設定」をクリックする');
    await paymentRequestListPage.clickDetail(invoiceNo);
    await journalDetailPage.waitForLoading();

    // 全ての明細にて、仕訳情報を削除する
    for (i = 0; i < lineCount; i++) {
      let accountCount = await journalDetailPage.getAccountCodeCount(i + 1);
      await comment(accountCount);
      while (accountCount > 1) {
        await journalDetailPage.clickDelBreakdown(i + 1, accountCount);
        await page.waitForTimeout(500);
        accountCount--;
      }
    }

    // 一括入力を行う
    await journalDetailPage.clickBulkInsert();
    for (i = 0; i < acCount; i++) {
      if (i > 0) {
        await journalDetailPage.clickAddBreakdownOnBulk();
      }
      if (withNoCredit) {
        await journalDetailPage.clickAccountCodeSearchOnBulk(i + 1, false);
        await journalDetailPage.searchAccount(false, journalData.accountCodes[i].code, journalData.accountCodes[i].name, journalData.accountCodes[i].subCode, journalData.accountCodes[i].subName);
        await journalDetailPage.clickAccountRow(false, journalData.accountCodes[i].code, journalData.accountCodes[i].subCode);
        await journalDetailPage.clickDepartmentSearchOnBulk(i + 1, false);
        await journalDetailPage.searchDepartment(false, journalData.departments[0].code, journalData.departments[0].name);
        await journalDetailPage.clickDepartmentRow(false, journalData.departments[0].code);
      }
      if (withCredit) {
        await journalDetailPage.clickAccountCodeSearchOnBulk(i + 1, true);
        let acIndex = i < journalData.accountCodes.length - 1 ? i + 1 : 0;
        await journalDetailPage.searchAccount(true, journalData.accountCodes[acIndex].code, journalData.accountCodes[acIndex].name, journalData.accountCodes[acIndex].subCode, journalData.accountCodes[acIndex].subName);
        await journalDetailPage.clickAccountRow(true, journalData.accountCodes[acIndex].code, journalData.accountCodes[acIndex].subCode);
        await journalDetailPage.clickDepartmentSearchOnBulk(i + 1, true);
        await journalDetailPage.searchDepartment(true, journalData.departments[1].code, journalData.departments[1].name);
        await journalDetailPage.clickDepartmentRow(true, journalData.departments[1].code);
      }
    }
    for (i = 0; i < lineCount; i++) {
      await journalDetailPage.checkBulkON(i + 1);
    }
    await journalDetailPage.clickBulkOK();

    // チェックした明細に一括入力で設定した仕訳情報が反映されていること
    for (i = 0; i < lineCount; i++) {
      for (j = 0; j < acCount; j++) {
        if (withNoCredit) {
          expect(await journalDetailPage.hasBreakdown(i + 1, j + 2, false, journalData.accountCodes[j].code, journalData.accountCodes[j].subCode, journalData.departments[0].code)).to.equal(true, '明細' + (i + 1) + '番目、内訳番号' + (j + 1) + '番目：借方の情報が保持されていること');
        }
        if (withCredit) {
          let acIndex = j < journalData.accountCodes.length - 1 ? j + 1 : 0;
          expect(await journalDetailPage.hasBreakdown(i + 1, j + 2, true, journalData.accountCodes[acIndex].code, journalData.accountCodes[acIndex].subCode, journalData.departments[1].code)).to.equal(true, '明細' + (i + 1) + '番目、内訳番号' + (j + 1) + '番目：貸方の情報が保持されていること');
        }
      }
    }
    await page.waitForTimeout(1000);
  };

  /**
   * STEP7_No.71
   */
  it("明細数2、仕訳数2（借方あり、貸方あり、一括入力）", async function() {
    await setBulk('atest021011', 2, 2, true, true);
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
    await common.deleteJournalData(page, config.company2.user04, null);
  });
  */
});
