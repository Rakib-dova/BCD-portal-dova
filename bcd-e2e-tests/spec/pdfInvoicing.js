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

describe('PDF請求書作成', function () {

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
    if (browser == undefined || browser == null) {
      const browserInfo = await common.initTest();
      browser = browserInfo.browserType;
      contextOption = browserInfo.contextOption;
    }
  };

  /**
   * STEP8_PDF請求書_No.37,39,41
   */
   it("PDF請求書", async function () {
    // テストの初期化を実施
    await initBrowser();
    const context = await browser.newContext(contextOption);
    if (page != null) {
      page.close();
    }
    page = await context.newPage();
    global.reporter.setBrowserInfo(browser, page);

    // ページオブジェクト
    const { topPage, pdfInvoicingPage, registPdfInvoicePage }
      = common.getPageObject(browser, page);

    // デジタルトレードアプリのトップページを表示する
    await common.gotoTop(page, config.company1.mng);

    // PDF出力内容登録ページへ遷移する
    await topPage.openPdfInvoicing();
    await pdfInvoicingPage.waitForLoading();
    await pdfInvoicingPage.clickRegist();
    await registPdfInvoicePage.waitForLoading();

    // 差出人の登録番号が入力できる状態になっていること
    expect(await registPdfInvoicePage.isSenderNoDisabled()).to.equal(false, '【PDF請求書作成】差出人の登録番号が入力できる状態になっていること');

    // 3件まで割引行が追加できること
    for(i = 0; i < 3; i++) {
      await registPdfInvoicePage.clickAddInvoiceDiscount();
      await registPdfInvoicePage.clickAddDiscount();
    }
    expect(await registPdfInvoicePage.isAddInvoiceDiscountShown()).to.equal(false, '【PDF請求書作成】全体に対して3件まで割引行が追加できること');
    expect(await registPdfInvoicePage.isAddDiscountShown()).to.equal(false, '【PDF請求書作成】明細に対して3件まで割引行が追加できること');

    // ドラフト状態で保存されること
    let invoiceNo = 'atest22step8';
    await registPdfInvoicePage.inputInvoiceNo(invoiceNo);
    await registPdfInvoicePage.inputReciever('WRテスト企業_2_山田_田中', '101-0061', '東京都', '千代田区', 'MS');
    await registPdfInvoicePage.inputBillingDate('2030/04/20');
    await registPdfInvoicePage.inputPaymentDate('2030/05/31');
    await registPdfInvoicePage.inputDeliveryDate('2030/06/07');
    await registPdfInvoicePage.inputLine(1, '項目1', '1000', 'JPY', '10', 'nonTaxable');
    await registPdfInvoicePage.inputDiscount(1, '項目割引1', 20, 'percent');
    await registPdfInvoicePage.inputDiscount(2, '項目割引2', 30, 'percent');
    await registPdfInvoicePage.inputDiscount(3, '項目割引3', 40, 'percent');
    await registPdfInvoicePage.inputInvoiceDiscount(1, '割引1', 200, 'jpy');
    await registPdfInvoicePage.inputInvoiceDiscount(2, '割引2', 300, 'jpy');
    await registPdfInvoicePage.inputInvoiceDiscount(3, '割引3', 500, 'jpy');
    await registPdfInvoicePage.save();
    await registPdfInvoicePage.back();
    await pdfInvoicingPage.waitForLoading();
    expect(await pdfInvoicingPage.isInvoiceExist(invoiceNo)).to.equal(true, '【PDF請求書作成ドラフト一覧】ドラフト状態で保存されること');

    // PDF出力ボタン押下後の処理中メッセージが表示されること
    await pdfInvoicingPage.edit(invoiceNo);
    await registPdfInvoicePage.waitForLoading();
    await registPdfInvoicePage.clickOutputModal();
    expect(await registPdfInvoicePage.getOutputModalMsg()).to.equal('PDFを出力完了すると一覧から請求書が削除されます。', '【PDF請求書作成】処理中メッセージが表示されること');

    // PDFがダウンロードされること
    let pdfPath = await registPdfInvoicePage.output();
    expect(pdfPath.length > 0).to.equal(true, '【PDF請求書作成ドラフト一覧】PDFがダウンロードされること');
    await pdfInvoicingPage.waitForLoading();
    expect(await pdfInvoicingPage.isInvoiceExist(invoiceNo)).to.equal(false, '【PDF請求書作成ドラフト一覧】出力されたPDFが一覧に表示されていないこと');
    await page.waitForTimeout(1000);
  });
});
