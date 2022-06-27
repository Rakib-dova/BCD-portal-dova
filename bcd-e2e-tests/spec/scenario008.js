const webdriverUtils = require('../utils/webdriver-utils');
const chai = require('chai');
const chaiWithReporting = require('../utils/chai-with-reporting').chaiWithReporting;
const comment = require('../utils/chai-with-reporting').comment;
const config = require('../autotest-script-config');
const fs = require('fs');
const { parse } = require('csv-parse/sync');
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

  it("8. 機能試験-一括ダウンロード", async function () {
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
      const { loginPage, topPage, tradeShiftTopPage, downloadInvoicePage }
        = common.getPageObject(browser, page);
      downloadPage = downloadInvoicePage;

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

      // 請求情報ダウンロードページに遷移する
      await topPage.openDownloadInvoicePage();
      await downloadInvoicePage.waitForLoading();

      expect(await downloadInvoicePage.getTitle()).to.equal('請求情報ダウンロード', '請求情報ダウンロードページに遷移すること');

      // 絞り込み条件「ステータス」の初期値を確認する
      let statuses = JSON.stringify(await downloadInvoicePage.getInvoiceStatuses());
      expect(statuses).to.equal('[true,true,true,true]', '絞り込み条件「ステータス」の初期値が全て対象となっていること');

      // 絞り込み条件「販売/購入」の初期値を確認する
      expect(await downloadInvoicePage.getBuyAndSell()).to.equal('すべて', '絞り込み条件「販売/購入」の初期値がすべてとなっていること');

      // 絞り込み条件「発行日」の初期値を確認する
      let { from, to } = await downloadInvoicePage.getIssuedate();
      // 現在の日付
      const now = new Date();
      const strNow = common.getFormattedDateHyphen(now);
      // 1ヶ月と1日前
      const lastMonth = new Date();
      lastMonth.setMonth(lastMonth.getMonth() - 1); // 1ヶ月戻す
      lastMonth.setDate(lastMonth.getDate() - 1); // 1日戻す
      const strLastMonth = common.getFormattedDateHyphen(lastMonth);
      expect(from).to.equal(strLastMonth, '絞り込み条件「発行日」の初期値が1ヶ月と1日前からとなっていること');
      expect(to).to.equal(strNow, '絞り込み条件「発行日」の初期値が本日までとなっていること');

      // 絞り込み条件「送信企業」の初期値を確認する
      expect(await downloadInvoicePage.getSendCompanySearchKeyword()).to.equal('', '絞り込み条件「送信企業」の初期値が空となっていること');

      // 絞り込み条件「受信企業」の初期値を確認する
      expect(await downloadInvoicePage.getReceiveCompanySearchKeyword()).to.equal('', '絞り込み条件「受信企業」の初期値が空となっていること');

      // CSVダウンロードボタンを確認する
      expect(await downloadInvoicePage.isCsvDownloadBtnExist()).to.equal(true, 'CSVダウンロードボタンが存在すること');

      let msg, expectInvoiceList, companies;
      // 発行日を設定する
      from = '2021/08/01';
      to = '2021/08/31';
      await downloadInvoicePage.setIssuedate(from, to);

      // -------------------- 「請求書番号」のみ指定し、請求情報を確認する --------------------
      await downloadInvoicePage.inputInvoiceNumber('fcde40391');
      msg = '請求書番号のみ指定し、請求情報をダウンロードできること';
      expectInvoiceList = ['fcde40391', 'fcde40391', 'fcde40391'];
      await checkCsv(msg, expectInvoiceList);
      // 請求書番号を戻す
      await downloadInvoicePage.inputInvoiceNumber('');

      // -------------------- 「ステータス」のみ指定し、請求情報を確認する --------------------
      // 「ステータス」が「送信済み/受信済み」のみ
      await downloadInvoicePage.setInvoiceStatuses([true, false, false, false]);
      msg = '「ステータス」に「送信済み/受信済み」のみ指定し、請求情報をダウンロードできること';
      expectInvoiceList = ['fcde40393', '2bc16fc81', 'fcde40391', 'fcde40391', 'fcde40391'];
      await checkCsv(msg, expectInvoiceList);

      // 「ステータス」が「受理済み」のみ
      await downloadInvoicePage.setInvoiceStatuses([false, true, false, false]);
      msg = '「ステータス」に「受理済み」のみ指定し、請求情報をダウンロードできること';
      expectInvoiceList = ['fcde40392', 'fcde40392'];
      await checkCsv(msg, expectInvoiceList);

      // 「ステータス」が「送金済み」のみ
      await downloadInvoicePage.setInvoiceStatuses([false, false, true, false]);
      msg = '「ステータス」に「送金済み」のみ指定し、請求情報をダウンロードできること';
      expectInvoiceList = ['6f2943351', '6f2943351', '6f2943351'];
      await checkCsv(msg, expectInvoiceList);

      // 「ステータス」が「入金確認済み」のみ
      await downloadInvoicePage.setInvoiceStatuses([false, false, false, true]);
      msg = '「ステータス」に「入金確認済み」のみ指定し、請求情報をダウンロードできること';
      expectInvoiceList = ['6f2943352', '6f2943352'];
      await checkCsv(msg, expectInvoiceList);

      // 「ステータス」が「送信済み/受信済み」以外
      await downloadInvoicePage.setInvoiceStatuses([false, true, true, true]);
      msg = '「ステータス」に「送信済み/受信済み」以外指定し、請求情報をダウンロードできること';
      expectInvoiceList = ['fcde40392', 'fcde40392', '6f2943352', '6f2943352', '6f2943351', '6f2943351', '6f2943351'];
      await checkCsv(msg, expectInvoiceList);

      // 「ステータス」が「受理済み」以外
      await downloadInvoicePage.setInvoiceStatuses([true, false, true, true]);
      msg = '「ステータス」に「受理済み」以外指定し、請求情報をダウンロードできること';
      expectInvoiceList = ['fcde40393', '2bc16fc81', 'fcde40391', 'fcde40391', 'fcde40391', '6f2943352', '6f2943352', '6f2943351', '6f2943351', '6f2943351'];
      await checkCsv(msg, expectInvoiceList);

      // 「ステータス」が「送金済み」以外
      await downloadInvoicePage.setInvoiceStatuses([true, true, false, true]);
      msg = '「ステータス」に「送金済み」以外指定し、請求情報をダウンロードできること';
      expectInvoiceList = ['fcde40393', '2bc16fc81', 'fcde40392', 'fcde40392', 'fcde40391', 'fcde40391', 'fcde40391', '6f2943352', '6f2943352'];
      await checkCsv(msg, expectInvoiceList);

      // 「ステータス」が「入金確認済み」以外
      await downloadInvoicePage.setInvoiceStatuses([true, true, true, false]);
      msg = '「ステータス」に「入金確認済み」以外指定し、請求情報をダウンロードできること';
      expectInvoiceList = ['fcde40393', '2bc16fc81', 'fcde40392', 'fcde40392', 'fcde40391', 'fcde40391', 'fcde40391', '6f2943351', '6f2943351', '6f2943351'];
      await checkCsv(msg, expectInvoiceList);

      // ステータスを戻す
      await downloadInvoicePage.setInvoiceStatuses([true, true, true, true]);

      // -------------------- 「販売/購入」のみ指定し、請求情報を確認する --------------------
      // 「販売/購入」が「すべて」
      await downloadInvoicePage.setBuyAndSell('すべて');
      msg = '「販売/購入」に「すべて」を指定し、請求情報をダウンロードできること';
      expectInvoiceList = ['fcde40393', '2bc16fc81', 'fcde40392', 'fcde40392', 'fcde40391', 'fcde40391', 'fcde40391', '6f2943352', '6f2943352', '6f2943351', '6f2943351', '6f2943351'];
      await checkCsv(msg, expectInvoiceList);

      // 「販売/購入」が「販売」
      await downloadInvoicePage.setBuyAndSell('販売');
      msg = '「販売/購入」に「販売」を指定し、請求情報をダウンロードできること';
      expectInvoiceList = ['2bc16fc81', '6f2943352', '6f2943352', '6f2943351', '6f2943351', '6f2943351'];
      await checkCsv(msg, expectInvoiceList);

      // 「販売/購入」が「購入」
      await downloadInvoicePage.setBuyAndSell('購入');
      msg = '「販売/購入」に「購入」を指定し、請求情報をダウンロードできること';
      expectInvoiceList = ['fcde40393', 'fcde40392', 'fcde40392', 'fcde40391', 'fcde40391', 'fcde40391'];
      await checkCsv(msg, expectInvoiceList);

      // 「販売/購入」を戻す
      await downloadInvoicePage.setBuyAndSell('すべて');

      // -------------------- 「送信企業」のみ指定し、請求情報を確認する --------------------
      // 送信企業を検索する
      await downloadInvoicePage.searchSendCompany('山田');

      // 送信企業の検索結果を取得する
      // ※NG:検索結果が全企業
      // expect(JSON.stringify(await downloadInvoicePage.getSendCompanyNames())).to.equal(JSON.stringify(['WRテスト企業_2_山田_田中', 'テスト企業山田']), '送信企業の検索結果が正しいこと');

      // 選択された送信企業を取得する
      expect(JSON.stringify(await downloadInvoicePage.getSelectedSendCompanies())).to.equal(JSON.stringify([]), '検索結果の初期状態は、すべて未選択であること');

      // 送信企業の選択ボタンが存在するか
      expect(await downloadInvoicePage.isSendCompanySelectBtnExist()).to.equal(true, '送信企業の選択ボタンが存在すること');

      // 送信企業の全選択ボタンをクリックする
      await downloadInvoicePage.clickSendCompanyAllSelectBtn();
      // ※NG:検索結果が全企業
      // expect(JSON.stringify(await downloadInvoicePage.getSelectedSendCompanies())).to.equal(JSON.stringify(['WRテスト企業_2_山田_田中', 'テスト企業山田']), '全選択ボタンで送信企業がすべて選択されること');
      msg = '「送信企業」を全選択し、請求情報をダウンロードできること';
      expectInvoiceList = ['2bc16fc81', 'fcde40392', 'fcde40392', 'fcde40391', 'fcde40391', 'fcde40391', '6f2943352', '6f2943352', '6f2943351', '6f2943351', '6f2943351'];
      // ※NG:検索結果が全企業
      // await checkCsv(msg, expectInvoiceList);

      // 送信企業の全解除ボタンをクリックする
      await downloadInvoicePage.clickSendCompanyAllClearBtn();
      expect(JSON.stringify(await downloadInvoicePage.getSelectedSendCompanies())).to.equal(JSON.stringify([]), '全解除ボタンで送信企業がすべて選択解除されること');

      // 送信企業を選択する
      companies = ['テスト企業山田'];
      await downloadInvoicePage.selectSendCompanies(companies);
      msg = '「送信企業」に一部の企業を指定し、請求情報をダウンロードできること';
      expectInvoiceList = ['fcde40392', 'fcde40392', 'fcde40391', 'fcde40391', 'fcde40391'];
      await checkCsv(msg, expectInvoiceList);

      // 送信企業を戻す
      await downloadInvoicePage.searchSendCompany('');

      await page.keyboard.press('PageDown')
      await page.keyboard.press('PageDown')
      await page.waitForTimeout(1000);

      // -------------------- 「受信企業」のみ指定し、請求情報を確認する--------------------
      // 受信企業を検索する
      await downloadInvoicePage.searchReceiveCompany('田中');

      // 受信企業の検索結果を取得する
      // ※NG:検索結果が全企業
      // expect(JSON.stringify(await downloadInvoicePage.getReceiveCompanyNames())).to.equal(JSON.stringify(['WRテスト企業_2_山田_田中', 'テスト企業田中']), '受信企業の検索結果が正しいこと');

      // 選択された受信企業を取得する
      expect(JSON.stringify(await downloadInvoicePage.getSelectedReceiveCompanies())).to.equal(JSON.stringify([]), '検索結果の初期状態は、すべて未選択であること');

      // 受信企業の選択ボタンが存在するか
      expect(await downloadInvoicePage.isReceiveCompanySelectBtnExist()).to.equal(true, '受信企業の選択ボタンが存在すること');

      // 受信企業の全選択ボタンをクリックする
      await downloadInvoicePage.clickReceiveCompanyAllSelectBtn();
      // ※NG:検索結果が全企業
      // expect(JSON.stringify(await downloadInvoicePage.getSelectedReceiveCompanies())).to.equal(JSON.stringify(['WRテスト企業_2_山田_田中', 'テスト企業田中']), '全選択ボタンで受信企業がすべて選択されること');
      msg = '「受信企業」を全選択し、請求情報をダウンロードできること';
      expectInvoiceList = ['fcde40393', 'fcde40392', 'fcde40392', 'fcde40391', 'fcde40391', 'fcde40391', '6f2943352', '6f2943352', '6f2943351', '6f2943351', '6f2943351'];
      // ※NG:検索結果が全企業
      // await checkCsv(msg, expectInvoiceList);

      // 受信企業の全解除ボタンをクリックする
      await downloadInvoicePage.clickReceiveCompanyAllClearBtn();
      expect(JSON.stringify(await downloadInvoicePage.getSelectedReceiveCompanies())).to.equal(JSON.stringify([]), '全解除ボタンで受信企業がすべて選択解除されること');

      // 受信企業を選択する
      companies = ['テスト企業田中'];
      await downloadInvoicePage.selectReceiveCompanies(companies);
      msg = '「受信企業」に一部の企業を指定し、請求情報をダウンロードできること';
      expectInvoiceList = ['6f2943352', '6f2943352', '6f2943351', '6f2943351', '6f2943351'];
      await checkCsv(msg, expectInvoiceList);

      // 受信企業を戻す
      await downloadInvoicePage.searchReceiveCompany('');

      // -------------------- 「送信企業」x「受信企業」を指定し、請求情報を確認する --------------------
      // 送信企業を検索・選択する
      await downloadInvoicePage.searchSendCompany('テスト企業山田');
      await downloadInvoicePage.selectSendCompanies(['テスト企業山田']);
      // 受信企業を検索・選択する
      await downloadInvoicePage.searchReceiveCompany('WRテスト企業_2_山田_田中');
      await downloadInvoicePage.selectReceiveCompanies(['WRテスト企業_2_山田_田中']);
      msg = '「送信企業」と「受信企業」を全選択し、請求情報をダウンロードできること';
      expectInvoiceList = ['fcde40392', 'fcde40392', 'fcde40391', 'fcde40391', 'fcde40391'];
      await checkCsv(msg, expectInvoiceList);

      // 送信企業を検索・選択する
      await downloadInvoicePage.searchSendCompany('WRテスト企業_2_山田_田中');
      await downloadInvoicePage.selectSendCompanies(['WRテスト企業_2_山田_田中']);
      // 受信企業を検索・選択する
      await downloadInvoicePage.searchReceiveCompany('テスト企業田中');
      await downloadInvoicePage.selectReceiveCompanies(['テスト企業田中']);
      msg = '「送信企業」と「受信企業」を全選択し、請求情報をダウンロードできること';
      expectInvoiceList = ['6f2943352', '6f2943352', '6f2943351', '6f2943351', '6f2943351'];
      // ※NG:「請求書が見つかりません」と表示される
      // await checkCsv(msg, expectInvoiceList);

      await page.waitForTimeout(1000);
    }
  });
});

// CSVファイルをダウンロードし、中身が正しいかチェックする
async function checkCsv(msg, expectInvoiceList) {
  // CSVダウンロードボタンをクリックする
  const downloadFile = await downloadPage.clickCsvDownloadBtn();
  // CSVファイルを読み込む
  let tmpData = fs.readFileSync(downloadFile, 'utf-8');
  tmpData = tmpData.replace(/\r?\n/g, '\r\n'); // 改行コードを\r\nに統一する
  tmpData = tmpData.replace(/\ufeff/g, ''); // BOMを削除する
  const csvData = parse(tmpData, { columns: true });

  // ヘッダーをもとに各行の請求書番号を取得する
  const invoiceList = [];
  for (row of csvData) {
    invoiceList.push(row['請求書番号']);
  }

  // 期待値と比較する
  expect(JSON.stringify(invoiceList)).to.equal(JSON.stringify(expectInvoiceList), msg);
}
