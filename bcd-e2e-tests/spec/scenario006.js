const { chromium, firefox } = require('playwright');
const webdriverUtils = require('../utils/webdriver-utils');

const chai = require('chai');
const chaiWithReporting = require('../utils/chai-with-reporting').chaiWithReporting;
const comment = require('../utils/chai-with-reporting').comment;

chai.use(chaiWithReporting);
const expect = chai.expect;

const config = require('../autotest-script-config');

const fs = require('fs');
const path = require('path');

const common = require('./common');
const { ActionUtils } = require('../utils/action-utils');

let browser;

webdriverUtils.setReporter();

describe('リグレッションテスト', function () {

  beforeAll(async function () {
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

  it("6. 請求書一括作成 - カスタムフォーマット（NO.68,79-86）", async function () {
    if (process.env.BROWSER == 'EDGE') {
      browser = await webdriverUtils.openEdge(chromium);
    } else if (process.env.BROWSER == 'FIREFOX') {
      browser = await webdriverUtils.openFirefox(firefox);
    } else {
      browser = await webdriverUtils.openChrome(chromium);
    }
    const page = await browser.newPage();

    const actionUtils = new ActionUtils(browser, page);
    global.reporter.setBrowserInfo(browser, page);

    // ページオブジェクト
    const { loginPage, topPage, tradeShiftTopPage, supportMenuPage, uploadInvoiceMenuPage, uploadInvoicePage, uploadFormatTopPage, uploadFormatCreatePage, uploadFormatSettingPage, uploadFormatConfirmPage, uploadFormatModPage, settingMenuPage, contractChangePage, uploadListPage, uploadListDetailPage }
      = common.getPageObject(browser, page);

    // 指定したURLに遷移する
    await page.goto(config.baseUrl);

    // ログインを行う
    await loginPage.doLogin(config.company1.id, config.company1.password);
    await tradeShiftTopPage.waitForLoading();

    // デジタルトレードアプリをクリックする
    await tradeShiftTopPage.clickBcdApp();
    await topPage.waitForLoading();

    const testPattern = [true, false];
    for (const hasHeader of testPattern) {
      let itemName;
      if (hasHeader) {
        comment('---------- ヘッダーありの請求書作成 ----------')
        // ヘッダーありの請求書フォーマットを作成する
        // ※NG ヘッダーの上に別の行があると読み込みに失敗する。一時的にヘッダーが1行目のデータを利用
        // formatPath = path.resolve('testdata', 'upload', 'format_header.csv')
        // itemName = await common.uploadFormat(formatPath, true, 2, 3, 2)
        formatPath = path.resolve('testdata', 'upload', 'format_header_tmp.csv')
        itemName = await common.uploadFormat(formatPath, true, 1, 2, 2)
      } else {
        comment('---------- ヘッダーなしの請求書作成 ----------')
        // ヘッダーなしの請求書フォーマットを作成する
        formatPath = path.resolve('testdata', 'upload', 'format_no_header.csv')
        itemName = await common.uploadFormat(formatPath, false, null, 1, 1)
      }

      // 請求書一括作成メニューを表示する
      await topPage.openUploadInvoiceMenu();
      await uploadInvoiceMenuPage.waitForLoading();

      // 請求書一括作成ページに遷移する
      await uploadInvoiceMenuPage.clickUploadInvoice();
      await uploadInvoicePage.waitForLoading();

      // 請求書ファイルの請求書番号を一意な値に書き換える
      let baseFilePath, tmpFilePath, itemNames;
      if (hasHeader) {
        baseFilePath = path.resolve('testdata', 'upload', 'invoice_header.csv')
        tmpFilePath = path.resolve('testdata', 'upload', 'tmp_invoice_header.csv')
        itemNames = common.updateInvoiceItemNameForCustom(baseFilePath, tmpFilePath, 2, 3);
      } else {
        // 請求書ファイルの請求書番号を一意な値に書き換える
        baseFilePath = path.resolve('testdata', 'upload', 'invoice_no_header.csv')
        tmpFilePath = path.resolve('testdata', 'upload', 'tmp_invoice_no_header.csv')
        itemNames = common.updateInvoiceItemNameForCustom(baseFilePath, tmpFilePath, 1, 2);
      }

      // 登録したフォーマットデータが選択肢として表示されていること
      expect(await uploadInvoicePage.getFormatTypes()).to.include(itemName, '登録したフォーマットデータが選択肢として表示されていること');

      // 登録したフォーマットデータを選択する
      await uploadInvoicePage.setFormatType(itemName);

      // 請求書ファイルをアップロードする
      await uploadInvoicePage.uploadInvoiceFile(tmpFilePath)

      // アップロードを開始する
      const { uploadingMsg, uploadFinMsg } = await uploadInvoicePage.clickUploadBtn();
      expect(uploadingMsg).to.equal('アップロード中', 'アップロード中のポップアップが表示されること');
      expect(uploadFinMsg).to.equal('請求書取込が完了しました。\n（反映には時間がかかる場合がございます。）\n取込結果は一覧画面でご確認下さい。');

      // 取り込み結果一覧に遷移する
      await uploadInvoicePage.moveUploadListPage();
      await uploadListPage.waitForLoading();
      expect(await uploadListPage.getTitle()).to.equal('取込結果一覧', '取込結果一覧ページに遷移すること');

      // 取り込み結果を確認する
      let uploadResults = await uploadListPage.getResults(1);
      let uploadDate = new Date(uploadResults.shift()); // アップロード日時だけ配列から取り出す
      // アップロード日時を確認する
      let currentDate = new Date(); // 現在日時
      let before1minDate = new Date(); // 現在日時から5分前
      before1minDate.setMinutes(before1minDate.getMinutes() - 1);

      expect((uploadDate >= before1minDate) && (uploadDate <= currentDate)).to.equal(true, '取込日時が正しく表示されていること');
      // アップロード日時以外を確認する
      if (hasHeader) {
        expectedVal = '["tmp_invoice_header.csv","OK","1","1","1","0","0"]'
      } else {
        expectedVal = '["tmp_invoice_no_header.csv","OK","1","1","1","0","0"]'
      }
      expect(JSON.stringify(uploadResults)).to.equal(expectedVal, '取込結果が正しく表示されていること');

      // トップページに遷移する
      await uploadListPage.moveTop();
      await topPage.waitForLoading();
      await page.waitForTimeout(3000);
    }

    await page.waitForTimeout(1000);
  });
});
