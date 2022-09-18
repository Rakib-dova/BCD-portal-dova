const webdriverUtils = require('../utils/webdriver-utils');
const chai = require('chai');
const chaiWithReporting = require('../utils/chai-with-reporting').chaiWithReporting;
const comment = require('../utils/chai-with-reporting').comment;
const fs = require('fs');
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
      const { topPage, userGuidePage, uploadInvoicePage, uploadFormatTopPage, contractDetailPage }
        = common.getPageObject(browser, page);

      // デジタルトレードアプリのトップページを表示する
      await common.gotoTop(page, account);

      // 「お知らせ」の「もっと見る」をクリックして、リンク先URLをチェックする
      let expected = 'https://support.ntt.com/bconnection/information/search';
      expect(await topPage.getInformationLinkUrl()).to.equal(expected, 'お知らせ一覧に遷移すること');
      await topPage.waitForLoading();

      // 「工事・故障情報」の「もっと見る」をクリックして、リンク先URLをチェックする
      expected = 'https://support.ntt.com/bconnection/maintenance/search';
      expect(await topPage.getConstructLinkUrl()).to.equal(expected, '工事・故障情報に遷移すること');
      await topPage.waitForLoading();

      // ご利用ガイドを表示する
      await topPage.clickUserGuide();
      await userGuidePage.waitForLoading();

      // 「お問い合わせページを開く」をクリックして、リンク先URLをチェックする
      if (account.type == 'manager' && await userGuidePage.hasContractNo()) {
        expected = 'https://support.ntt.com/bconnection/inquiry/input/pid2200000saa';
        expect(await userGuidePage.getInquiryUrl()).to.equal(expected, 'お問い合わせ画面が表示されること');
      }

      // 「よくある質問へ」をクリックして、リンク先URLをチェックする
      expected = 'https://support.ntt.com/bconnection/faq/search';
      expect(await userGuidePage.getFaqUrl()).to.equal(expected, 'よくあるご質問画面が表示されること');

      // Homeへ戻る
      await userGuidePage.clickHome();
      await topPage.waitForLoading();

      // 操作マニュアルのダウンロード
      await topPage.clickInvoiceGuide();
      await userGuidePage.waitForLoading();
      await page.waitForTimeout(1000);
      let pdfPath = await userGuidePage.downloadInvoiceGuide();
      // expected = 'https://bcd-portal.tsdev.biz/html/%E3%80%90Bconnection%E3%83%87%E3%82%B8%E3%82%BF%E3%83%AB%E3%83%88%E3%83%AC%E3%83%BC%E3%83%89%E3%82%A2%E3%83%97%E3%83%AA%E3%80%91%E6%93%8D%E4%BD%9C%E3%83%9E%E3%83%8B%E3%83%A5%E3%82%A2%E3%83%AB_%E8%AB%8B%E6%B1%82%E6%9B%B8%E4%B8%80%E6%8B%AC%E4%BD%9C%E6%88%90.pdf';
      expect(await fs.existsSync(pdfPath)).to.equal(true, '請求書一括作成のPDFマニュアルがダウンロードできること');

      // 請求書一括作成ページに遷移する
      await userGuidePage.clickHome();
      await topPage.waitForLoading();
      await topPage.clickUploadInvoice();
      await uploadInvoicePage.waitForLoading();
      expect(await uploadInvoicePage.getTitle()).to.equal('請求書一括作成', '請求書一括作成ページに遷移すること');

      // トップに戻る
      await uploadInvoicePage.moveTop();
      await topPage.waitForLoading();

      // 請求書アップロードフォーマット一覧ページに遷移する
      await topPage.clickUploadFormat();
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
      expect(await topPage.getInformationTab()).to.equal('お知らせ', 'Home画面に遷移すること');

      // 契約内容を表示する(管理者のみ)
      if (account.type == 'manager') {
        await topPage.clickContractDetail();
        await contractDetailPage.waitForLoading();
        expect(await contractDetailPage.getTitle()).to.equal('ご契約内容', 'ご契約内容画面に遷移すること');
      }
      await page.waitForTimeout(1000);
    }
  });
});
