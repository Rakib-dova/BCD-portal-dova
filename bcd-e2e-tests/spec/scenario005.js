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

  it("5. 請求書一括作成 - デフォルトフォーマット（NO.67-78）", async function () {
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

    // 請求書一括作成メニューを表示する
    await topPage.openUploadInvoiceMenu();
    await uploadInvoiceMenuPage.waitForLoading();

    // 請求書一括作成ページに遷移する
    await uploadInvoiceMenuPage.clickUploadInvoice();
    await uploadInvoicePage.waitForLoading();
    expect(await uploadInvoicePage.getTitle()).to.equal('請求書一括作成', '請求書一括作成ページに遷移すること');

    // フォーマット種別を確認する
    expect(await uploadInvoicePage.getActiveFormatType()).to.equal('デフォルト', 'フォーマット種別の初期設定がデフォルトとなっていること');

    // 請求書ファイルの請求書番号を一意な値に書き換える
    let baseFilePath = path.resolve('testdata', 'upload', 'invoice_default.csv')
    let tmpFilePath = path.resolve('testdata', 'upload', 'tmp_invoice_default.csv')
    let itemNames = common.updateInvoiceItemNameForDefault(baseFilePath, tmpFilePath);
    // let itemNames = common.updateInvoiceItemNameForCustom(baseFilePath, tmpFilePath, 2, 2);

    // 請求書ファイルをアップロードする
    await uploadInvoicePage.uploadInvoiceFile(tmpFilePath)

    // アップロードを開始する
    const { uploadingMsg, uploadFinMsg } = await uploadInvoicePage.clickUploadBtn();
    expect(uploadingMsg).to.equal('アップロード中', 'アップロード中のポップアップが表示されること');
    expect(uploadFinMsg).to.equal('請求書取込が完了しました。\n（反映には時間がかかる場合がございます。）\n取込に失敗した請求書が存在します。\n取込結果は一覧画面でご確認下さい。');

    // 取り込み結果一覧に遷移する
    await uploadInvoicePage.moveUploadListPage();
    await uploadListPage.waitForLoading();
    expect(await uploadListPage.getTitle()).to.equal('取込結果一覧', '取込結果一覧ページに遷移すること');

    // 取り込み結果を確認する
    let uploadResults = await uploadListPage.getResults(1);
    let uploadDate = new Date(uploadResults.shift()); // アップロード日時だけ配列から取り出す
    // アップロード日時を確認する
    let currentDate = new Date(); // 現在日時
    let before1dayDate = new Date(); // 現在日時から1日前
    before1dayDate.setDate(before1dayDate.getDate - 1);
    expect((uploadDate >= before1dayDate) && (uploadDate <= currentDate)).to.equal(true, '取込日時が正しく表示されていること');
    // アップロード日時以外を確認する
    expectedVal = '["tmp_invoice_default.csv","NG","7","3","5","1","1"]'
    expect(JSON.stringify(uploadResults)).to.equal(expectedVal, '取込結果が正しく表示されていること');

    // 取り込み結果詳細ページに遷移する
    await uploadListPage.moveDetailPage(1);
    await uploadListDetailPage.waitForLoading();
    expect(await uploadListDetailPage.getTitle()).to.equal('取込結果詳細', '取り込み結果詳細ページに遷移すること');

    // デフォルトタブの確認
    expect(await uploadListDetailPage.getActiveTab()).to.equal('全体', '全体タブが選択されていること');

    // 取り込み結果サマリを確認する
    let summaryResult = JSON.stringify(await uploadListDetailPage.getSummaryResults());
    expectedVal = '["7件","3件","5件","1件","1件"]'
    expect(summaryResult).to.equal(expectedVal, '取込結果サマリが正しく表示されていること');

    // 全体タブの取り込み結果詳細を確認する
    let allResult = JSON.stringify(await uploadListDetailPage.getAllResults());
    expectedVal = `["1","${itemNames[0]}","成功","正常に取込ました。","2","${itemNames[1]}","成功","正常に取込ました。","3","${itemNames[2]}","成功","正常に取込ました。","4","${itemNames[3]}","スキップ","取込済みのため、処理をスキップしました。","5","${itemNames[4]}","成功","正常に取込ました。","6","${itemNames[5]}","失敗","明細-税（消費税／軽減税率／不課税／免税／非課税）が未入力です。","7","${itemNames[6]}","成功","正常に取込ました。"]`
    expect(allResult).to.equal(expectedVal, '全体タブに取込結果詳細が正しく表示されていること');

    // 成功タブの取り込み結果詳細を確認する
    await uploadListDetailPage.clickTab('成功');
    allResult = JSON.stringify(await uploadListDetailPage.getAllResults());
    expectedVal = `["1","${itemNames[0]}","成功","正常に取込ました。","2","${itemNames[1]}","成功","正常に取込ました。","3","${itemNames[2]}","成功","正常に取込ました。","5","${itemNames[4]}","成功","正常に取込ました。","7","${itemNames[6]}","成功","正常に取込ました。"]`
    expect(allResult).to.equal(expectedVal, '成功タブに取込結果詳細が正しく表示されていること');

    // スキップタブの取り込み結果詳細を確認する
    await uploadListDetailPage.clickTab('スキップ');
    allResult = JSON.stringify(await uploadListDetailPage.getAllResults());
    expectedVal = `["4","${itemNames[3]}","スキップ","取込済みのため、処理をスキップしました。"]`
    expect(allResult).to.equal(expectedVal, 'スキップタブに取込結果詳細が正しく表示されていること');

    // 失敗タブの取り込み結果詳細を確認する
    await uploadListDetailPage.clickTab('失敗');
    allResult = JSON.stringify(await uploadListDetailPage.getAllResults());
    expectedVal = `["6","${itemNames[5]}","失敗","明細-税（消費税／軽減税率／不課税／免税／非課税）が未入力です。"]`
    expect(allResult).to.equal(expectedVal, '失敗タブに取込結果詳細が正しく表示されていること');

    // 取り込み結果詳細ページを閉じる
    await uploadListDetailPage.closeDialog();
    await uploadListPage.waitForLoading();
    expect(await uploadListPage.getTitle()).to.equal('取込結果一覧', '取込結果一覧ページに遷移すること');

    await page.waitForTimeout(1000);
  });
});
