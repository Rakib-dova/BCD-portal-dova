const webdriverUtils = require('../utils/webdriver-utils');
const chai = require('chai');
const chaiWithReporting = require('../utils/chai-with-reporting').chaiWithReporting;
const comment = require('../utils/chai-with-reporting').comment;
const fs = require('fs');
const { parse } = require('csv-parse/sync');
const common = require('./common');

const expect = chai.expect;
chai.use(chaiWithReporting);

let browser, accounts, contextOption, page;

webdriverUtils.setReporter();

describe('PDF請求書', function () {

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
      accounts = browserInfo.accounts;
      contextOption = browserInfo.contextOption;
    }
  };

  /**
   * STEP7_PDF請求書_No.2,4,17,18,76-83
   * STEP8_PDF請求書_No.37,39,41-45,49
   */
  it("PDF出力内容登録", async function () {
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
      const { topPage, pdfInvoicingPage, registPdfInvoicePage } = common.getPageObject(browser, page);

      // デジタルトレードアプリのトップページを表示する
      await common.gotoTop(page, account);

      // PDF出力内容登録ページへ遷移する
      await topPage.openPdfInvoicing();
      await pdfInvoicingPage.waitForLoading();
      await pdfInvoicingPage.clickRegist();
      await registPdfInvoicePage.waitForLoading();
      expect(await registPdfInvoicePage.getTitle()).to.equal('PDF請求書作成', '【PDF請求書作成】PDF出力内容登録画面(宛先情報入力画面) に遷移すること');
      expect(await registPdfInvoicePage.getSender()).to.equal('WRテスト企業_2_山田_田中', '【PDF請求書作成】差出人情報が自動で入力されていること');

      // 差出人の登録番号が入力できる状態になっていること
      expect(await registPdfInvoicePage.isSenderNoDisabled()).to.equal(false, '【PDF請求書作成】差出人の登録番号が入力できる状態になっていること');

      // 明細欄が1件追加・削除されること
      await registPdfInvoicePage.addLine();
      expect(await registPdfInvoicePage.getLineCount()).to.equal(2, '【PDF請求書作成】明細欄が1件追加されること');
      await registPdfInvoicePage.deleteLine(2);
      expect(await registPdfInvoicePage.getLineCount()).to.equal(1, '【PDF請求書作成】明細欄が1件削除されること');

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
      await registPdfInvoicePage.inputBillingDate('2030/4/20');
      await registPdfInvoicePage.inputPaymentDate('2030/5/31');
      await registPdfInvoicePage.inputDeliveryDate('2030/6/07');
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

      // 選択したPDF請求書のPDF出力内容登録画面に遷移すること
      await pdfInvoicingPage.edit(invoiceNo);
      await registPdfInvoicePage.waitForLoading();
      expect(await registPdfInvoicePage.getInvoiceNo()).to.equal(invoiceNo, '【PDF請求書作成】選択したPDF請求書のPDF出力内容登録画面に遷移すること');
      
      // PDF出力ボタン押下後の処理中メッセージが表示されること
      await registPdfInvoicePage.clickOutputModal();
      expect(await registPdfInvoicePage.getOutputModalMsg()).to.equal('PDFを出力完了すると一覧から請求書が削除されます。', '【PDF請求書作成】処理中メッセージが表示されること');

      // PDFがダウンロードされること
      let pdfPath = await registPdfInvoicePage.output();
      expect(pdfPath.length > 0).to.equal(true, '【PDF請求書作成ドラフト一覧】PDFがダウンロードされること');
      await pdfInvoicingPage.waitForLoading();
      expect(await pdfInvoicingPage.isInvoiceExist(invoiceNo)).to.equal(false, '【PDF請求書作成ドラフト一覧】出力されたPDFが一覧に表示されていないこと');
      await page.waitForTimeout(1000);
    }
  });

  /**
   * STEP8_PDF請求書_No.64-85
   */
   it("ドラフト一括作成", async function () {
    // テストの初期化を実施
    await initBrowser();

    // 各アカウントごとにテストを実施
    for (const account of accounts) {
      const context = await browser.newContext(contextOption);
      if (page != null) {
        page.close();
      }
      page = await context.newPage();
      page.on('dialog', async (dialog) => {
        await dialog.accept();
      });
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
      const { topPage, pdfInvoicingPage, registPdfInvoicePage, csvUploadForPdfPage } = common.getPageObject(browser, page);

      // デジタルトレードアプリのトップページを表示する
      await common.gotoTop(page, account);

      // ドラフト一括画面へ遷移すること
      await topPage.openPdfInvoicing();
      await pdfInvoicingPage.waitForLoading();
      await pdfInvoicingPage.clickUpload();
      await csvUploadForPdfPage.waitForLoading();
      expect(await csvUploadForPdfPage.getTitle()).to.equal('PDF請求書ドラフト一括作成', '【PDF請求書ドラフト一括作成】ドラフト一括画面へ遷移すること');

      // CSVのフォーマット、マニュアルがDLされること
      expect((await csvUploadForPdfPage.downloadManual()).length > 0).to.equal(true, '【PDF請求書ドラフト一括作成】マニュアルがDLされること');
      let formatPath = await csvUploadForPdfPage.downloadCsv();
      expect(formatPath.length > 0).to.equal(true, '【PDF請求書ドラフト一括作成】CSVのフォーマットがDLされること');
      expect((await getCsvData(formatPath, false))[0].includes('登録番号')).to.equal(true, '【PDF請求書ドラフト一括作成】「差出人の登録番号」のカラム(列)があること');

      // ファイル選択後、ファイル名が表示されること
      const csvPath = 'testdata/upload/PDF請求書ドラフト一括作成.csv';
      await csvUploadForPdfPage.selectFile(csvPath);
      const paths = csvPath.split('/');
      expect(await csvUploadForPdfPage.getFileName()).to.equal(paths[paths.length - 1], '【PDF請求書ドラフト一括作成】ファイル選択後、ファイル名が表示されること');

      // 一覧画面にて追加された請求書データが正しく追加、表示されていること
      await csvUploadForPdfPage.upload();
      await pdfInvoicingPage.waitForLoading();
      const csvData = await getCsvData(csvPath, true);
      for (i = 0; i < csvData.length; i++) {
        let invoiceNo = csvData[i]['請求書番号'];
        expect(await pdfInvoicingPage.isInvoiceExist(invoiceNo)).to.equal(true, '【PDF請求書作成ドラフト一覧】請求書番号"' + invoiceNo + '"が一覧に表示されること');

        // 選択したPDF請求書のPDF出力内容登録画面(宛先情報入力画面)  に遷移すること
        await pdfInvoicingPage.edit(invoiceNo);
        await registPdfInvoicePage.waitForLoading();
        expect(await registPdfInvoicePage.getInvoiceNo()).to.equal(invoiceNo, '【PDF請求書作成】請求書番号"' + invoiceNo + '"のPDF出力内容登録画面が表示されること');

        // 編集を行う
        await registPdfInvoicePage.inputUnitPrice('1000');
        await registPdfInvoicePage.save();
        let totalAmount = await registPdfInvoicePage.getTotal();
        await registPdfInvoicePage.back();
        await pdfInvoicingPage.waitForLoading();
        expect(await pdfInvoicingPage.getTotal(invoiceNo)).to.equal(totalAmount, '【PDF請求書作成ドラフト一覧】請求書番号"' + invoiceNo + '"の金額が変更されること');
        await pdfInvoicingPage.edit(invoiceNo);
        await registPdfInvoicePage.waitForLoading();
        expect(await registPdfInvoicePage.getTotal()).to.equal(totalAmount, '【PDF請求書作成】編集保存した内容が反映されていること');

        // PDFがダウンロードされること
        await registPdfInvoicePage.clickOutputModal();
        let pdfPath = await registPdfInvoicePage.output();
        expect(pdfPath.length > 0).to.equal(true, '【PDF請求書作成ドラフト一覧】PDFがダウンロードされること');
        await pdfInvoicingPage.waitForLoading();
      }
      await page.waitForTimeout(1000);
    }
  });
});

// アップロード用CSVファイルのデータを取得する
async function getCsvData(csvPath, columns) {
  let tmpData = fs.readFileSync(csvPath, 'utf-8');
  tmpData = tmpData.replace(/\r?\n/g, '\r\n'); // 改行コードを\r\nに統一する
  tmpData = tmpData.replace(/\ufeff/g, ''); // BOMを削除する
  return parse(tmpData, { columns: columns });
};
