const webdriverUtils = require('../utils/webdriver-utils');
const chai = require('chai');
const chaiWithReporting = require('../utils/chai-with-reporting').chaiWithReporting;
const comment = require('../utils/chai-with-reporting').comment;
const path = require('path');
const common = require('./common');

const expect = chai.expect;
chai.use(chaiWithReporting);

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
    // テストの初期化を実施
    const { browserType, accounts, contextOption } = await common.initTest();
    // ブラウザ変数をグローバルに設定
    browser = browserType;
    // 各アカウントごとにテストを実施
    for (const account of accounts) {
      const context = await browser.newContext(contextOption);
      const page = await context.newPage();

      global.reporter.setBrowserInfo(browser, page);
      if (account.type == 'manager') {
        await comment('---------- 管理者アカウント ----------')
      } else if (account.type == 'user') {
        await comment('---------- 一般ユーザー ----------')
      } else {
        await comment('---------- その他アカウント ----------')
      }

      // ページオブジェクト
      const { topPage, tradeShiftTopPage, tradeShiftDocListPage, tradeShiftDocDetailPage, uploadInvoicePage, uploadListPage }
          = common.getPageObject(browser, page);

      // デジタルトレードアプリのトップページを表示する
      await common.gotoTop(page, account);

      const testPattern = [true];
      // const testPattern = [true, false];
      for (const hasHeader of testPattern) {
        let itemName;
        if (hasHeader) {
          await comment('---------- ヘッダーありの請求書作成 ----------')
          // ヘッダーありの請求書フォーマットを作成する
          // ※NG ヘッダーの上に別の行があると読み込みに失敗する。一時的にヘッダーが1行目のデータを利用
          // formatPath = path.resolve('testdata', 'upload', 'format_header.csv')
          // itemName = await common.uploadFormat(formatPath, true, 2, 3, 2)
          formatPath = path.resolve('testdata', 'upload', 'format_header_tmp.csv')
          itemName = await common.uploadFormat(formatPath, true, 1, 2, 1)
        } else {
          await comment('---------- ヘッダーなしの請求書作成 ----------')
          // ヘッダーなしの請求書フォーマットを作成する
          formatPath = path.resolve('testdata', 'upload', 'format_no_header.csv')
          itemName = await common.uploadFormat(formatPath, false, null, 1, 1)
        }

        // 請求書一括作成ページに遷移する
        await topPage.clickUploadInvoice();
        await uploadInvoicePage.waitForLoading();

        // 請求書ファイルの請求書番号を一意な値に書き換える
        let baseFilePath, tmpFilePath, itemNames;
        if (hasHeader) {
          baseFilePath = path.resolve('testdata', 'upload', 'invoice_header.csv')
          tmpFilePath = path.resolve('testdata', 'upload', 'tmp_invoice_header.csv')
          itemNames = common.updateInvoiceItemNameForCustom(baseFilePath, tmpFilePath, 2, 2);
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
        let before1dayDate = new Date(); // 現在日時から-1日
        before1dayDate.setDate(before1dayDate.getDate() - 1);
        let after1dayDate = new Date(); // 現在日時から+1日
        after1dayDate.setDate(after1dayDate.getDate() + 1);
        expect((uploadDate >= before1dayDate) && (uploadDate <= after1dayDate)).to.equal(true, '取込日時が正しく表示されていること');

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

      /*
      // 文書を削除する
      await tradeShiftTopPage.clickDocMng();
      await tradeShiftDocListPage.waitForLoading();
      while(await tradeShiftDocListPage.hasDocId('2022')) {
        await tradeShiftDocListPage.clickDocId('2022');
        await tradeShiftDocDetailPage.waitForLoading();
        await tradeShiftDocDetailPage.delete();
        await tradeShiftDocListPage.waitForLoading();
      }
      */
      await page.waitForTimeout(1000);
    }
  });
});
