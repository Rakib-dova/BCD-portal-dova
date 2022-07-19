const webdriverUtils = require('../utils/webdriver-utils');
const chai = require('chai');
const chaiWithReporting = require('../utils/chai-with-reporting').chaiWithReporting;
const comment = require('../utils/chai-with-reporting').comment;
const config = require('../autotest-script-config');
const fs = require('fs');
const common = require('./common');
const { parse } = require('csv-parse/sync');

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

  it("1. お知らせ・サポート・請求書アップロードフォーマット一覧・契約情報変更（NO.12-30,87）", async function () {
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
      const { loginPage, topPage, tradeShiftTopPage, supportMenuPage, uploadInvoiceMenuPage, uploadInvoicePage, uploadFormatTopPage, settingMenuPage, contractChangePage }
        = common.getPageObject(browser, page);

      // 指定したURLに遷移する
      await page.goto(config.baseUrl);

      // ログインを行う
      await loginPage.doLogin(account.id, account.password);
      await tradeShiftTopPage.waitForLoading();

      // デジタルトレードアプリをクリックする
      let appName = process.env.APP ? process.env.APP : config.appName;
      appName = appName.replace(/\"/g, '');
      await tradeShiftTopPage.clickBcdApp(appName);
      await topPage.waitForLoading();

      // 「お知らせ」の「もっと見る」をクリックして、リンク先URLをチェックする
      let url = await topPage.getInformationLinkUrl();
      expect(url).to.equal('https://support.ntt.com/bconnection/information/search', 'お知らせ一覧に遷移すること');
      await topPage.waitForLoading();

      // 「工事・故障情報」タブをクリックする
      await topPage.changeConstructTab();
      expect(await topPage.isConstructTabActive()).to.equal(true, '表示内容が正しく切り替わること');

      // 「工事・故障情報」の「もっと見る」をクリックして、リンク先URLをチェックする
      url = await topPage.getConstructLinkUrl();
      expect(url).to.equal('https://support.ntt.com/bconnection/maintenance/search', '工事・故障情報に遷移すること');
      await topPage.waitForLoading();

      // サポートメニューを表示する
      await topPage.openSupportMenu();
      await supportMenuPage.waitForLoading();

      // 「設定方法、ご利用方法のお問い合わせ」をクリックする(管理者のみ)
      let notRegistered = true;
      if (account.type == 'manager') {
        await supportMenuPage.clickContact();

        // 「設定方法、ご利用方法のお問い合わせ」画面の表示内容を確認する
        notRegistered = await supportMenuPage.isModalShown();
        if (!notRegistered) {
          expect(await supportMenuPage.getNumberN()).to.equal('N999999999', 'N番が表示されていること');
          expect(await supportMenuPage.isCopyExist()).to.equal(true, 'フォーム右側に「copy」ボタンが表示されていること');
          expect(await supportMenuPage.isContactLinkExist()).to.equal(true, 'フォーム下部に「お問い合わせページを開く」ボタンが表示されていること');
  
          // 「お問い合わせページを開く」をクリックして、リンク先URLをチェックする
          url = await supportMenuPage.getContactLinkUrl();
          expect(url).to.equal('https://support.ntt.com/bconnection/inquiry/input/pid2200000saa', 'お問い合わせ画面が表示されること');
        }

        // 「設定方法、ご利用方法のお問い合わせ」を閉じる
        await supportMenuPage.closeContact();
      }

      // 「よくある質問（日本語）を参照する」をクリックして、リンク先URLをチェックする
      url = await supportMenuPage.getFaqLinkUrl();
      expect(url).to.equal('https://support.ntt.com/bconnection/faq/search', 'よくあるご質問画面が表示されること');

      // サポートメニューを閉じる
      await supportMenuPage.closeMenu();
      await topPage.waitForLoading();

      // 請求書一括作成メニューを表示する
      await topPage.openUploadInvoiceMenu();
      await uploadInvoiceMenuPage.waitForLoading();

      let textList = await uploadInvoiceMenuPage.getMenuTexts();
      expect(textList).to.include('請求書一括作成', '「請求書一括作成」が表示されていること')
      expect(textList).to.include('請求書アップロードフォーマット一覧', '「請求書アップロードフォーマット一覧」が表示されていること')
      expect(textList).to.include('アップロード用請求書フォーマットcsvダウンロード', '「アップロード用請求書フォーマットcsvダウンロード」が表示されていること')
      expect(textList).to.include('操作マニュアルダウンロード', '「操作マニュアルダウンロード」が表示されていること')

      // アップロード用請求書フォーマットcsvのダウンロード
      let csvPath = await uploadInvoiceMenuPage.downloadFormatTemplate();
      // 操作マニュアルのダウンロード
      let pdfPath = await uploadInvoiceMenuPage.downloadManual();

      // ファイルがダウンロードできたかチェックする
      expect(await fs.existsSync(csvPath)).to.equal(true, 'フォーマットファイルがダウンロードできること');
      expect(await fs.existsSync(pdfPath)).to.equal(true, '操作マニュアルがダウンロードできること');

      // CSVファイルの中身をチェックする
      let testDataRow = fs.readFileSync(csvPath)
      let csvData = JSON.stringify(parse(testDataRow));
      let expectedVal = '[["\ufeff発行日","請求書番号","テナントID","支払期日","納品日","備考","銀行名","支店名","科目","口座番号","口座名義","その他特記事項","明細-項目ID","明細-内容","明細-数量","明細-単位","明細-単価","明細-税（消費税／軽減税率／不課税／免税／非課税）","明細-備考"]]'
      expect(csvData).to.equal(expectedVal, 'フォーマットファイルの中身が正しいこと');

      // 請求書一括作成ページに遷移する
      await uploadInvoiceMenuPage.clickUploadInvoice();
      await uploadInvoicePage.waitForLoading();
      expect(await uploadInvoicePage.getTitle()).to.equal('請求書一括作成', '請求書一括作成ページに遷移すること');

      // トップに戻る
      await uploadInvoicePage.moveTop();
      await topPage.waitForLoading();

      // 請求書一括作成メニューを表示する
      await topPage.openUploadInvoiceMenu();
      await uploadInvoiceMenuPage.waitForLoading();

      // 請求書アップロードフォーマット一覧ページに遷移する
      await uploadInvoiceMenuPage.clickUploadFormat();
      await uploadFormatTopPage.waitForLoading();
      expect(await uploadFormatTopPage.getTitle()).to.equal('アップロードフォーマット一覧', 'アップロードフォーマット一覧ページに遷移すること');

      expect(await uploadFormatTopPage.getUploadformat()).to.equal('請求書データ', 'アップロード種別が「請求書データ」であること');
      expect(await uploadFormatTopPage.isRegistBtnExist()).to.equal(true, '「新規登録する」ボタンが表示されること');
      expect(await uploadFormatTopPage.isCreateInvoiceBtnExist()).to.equal(true, '「請求書一括作成」ボタンが表示されること');
      expect(await uploadFormatTopPage.isBackHomeBtnExist()).to.equal(true, '「Homeへ戻る」ボタンが表示されること');

      // 登録済みのアップロードフォーマットが最新更新日降順で表示されていること。
      const row1Date = await uploadFormatTopPage.getModDate(1);
      const row2Date = await uploadFormatTopPage.getModDate(2);
      expect(row1Date >= row2Date).to.equal(true, 'フォーマットが最新更新日降順で表示されていること')

      // 一覧テーブルのヘッダを取得する
      textList = await uploadFormatTopPage.getHeaders();
      expect(textList).to.include('No', 'ヘッダ「No」が表示されていること')
      expect(textList).to.include('設定名称', 'ヘッダ「設定名称」が表示されていること')
      expect(textList).to.include('アップロード種別', 'ヘッダ「アップロード種別」が表示されていること')
      expect(textList).to.include('最新更新日', 'ヘッダ「最新更新日」が表示されていること')

      // データ行ごとに「確認・変更する」ボタンと「削除」ボタンがあること。
      expect(await uploadFormatTopPage.isComfirmAndDeleteBtnExist(1)).to.equal(true, '1行目に「確認・変更する」ボタンと「削除」ボタンが表示されること');
      expect(await uploadFormatTopPage.isComfirmAndDeleteBtnExist(2)).to.equal(true, '2行目に「確認・変更する」ボタンと「削除」ボタンが表示されること');

      // Homeへ戻るボタンを押下する
      await uploadFormatTopPage.moveTop();
      await topPage.waitForLoading();
      expect(await topPage.isConstructTabExist()).to.equal(true, 'Home画面に遷移すること');

      // 設定メニューを表示する(管理者のみ)
      if (account.type == 'manager' && !notRegistered) {
        await topPage.openSettingMenu();
        await settingMenuPage.waitForLoading();

        // 契約情報変更画面に遷移する
        await settingMenuPage.clickContractChange();
        await contractChangePage.waitForLoading();
        expect(await contractChangePage.getTitle()).to.equal('契約情報変更', '契約情報変更画面に遷移すること');
      }

      await page.waitForTimeout(1000);
    }
  });
});
