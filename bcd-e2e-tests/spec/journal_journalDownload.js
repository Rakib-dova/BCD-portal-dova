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

let browser, contextOption, page;

webdriverUtils.setReporter();

describe('仕訳情報設定_仕訳情報ダウンロード', function () {
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
    const context = await browser.newContext(contextOption);
    if (page != null) {
      page.close();
    }
    page = await context.newPage();
    global.reporter.setBrowserInfo(browser, page);
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

  // 支払依頼一覧から、仕訳情報の詳細を取得する
  async function getDetail(topPage, journalMenuPage, paymentRequestListPage, journalDetailPage, invoiceNo) {
    await comment('「仕訳情報管理」をクリックする');
    await topPage.openJournalMenu();
    await journalMenuPage.waitForLoading();
    await journalMenuPage.clickPaymentRequest();
    await paymentRequestListPage.waitForLoading();
    await paymentRequestListPage.clickDetail(invoiceNo);
    await journalDetailPage.waitForLoading();
    return await journalDetailPage.getAllBreakdown();
  }

  // 仕訳情報をダウンロードする
  async function download(topPage, journalMenuPage, journalDownloadPage,
      invoiceNo, startDate, endDate, sender, checkFinalApproval, dataFormat, hasData) {

    // 仕訳情報管理メニューを開く
    await comment('「仕訳情報管理」をクリックする');
    await topPage.openJournalMenu();
    await journalMenuPage.waitForLoading();

    // 仕訳情報ダウンロードページへ遷移する
    await journalMenuPage.clickJournalDownload();
    await journalDownloadPage.waitForLoading();

    // ダウンロード対象の選択肢が追加されていること
    expect(await journalDownloadPage.isFinalApprovalChecked()).to.equal(true, '【仕訳情報ダウンロード】ダウンロード対象の選択肢が追加されていること');

    // 条件を入力する
    await journalDownloadPage.inputConditions(invoiceNo, startDate, endDate, sender, checkFinalApproval, dataFormat);

    // ダウンロードする
    if (!hasData) {
      expect(await journalDownloadPage.downloadNG()).to.equal('条件に合致する請求書が見つかりませんでした。', '【仕訳情報ダウンロード】「条件に合致する請求書が見つかりませんでした。」ポップアップが表示されること');
      await page.waitForTimeout(1000);
      return null;
    }
    let csvPath = await journalDownloadPage.download();
    expect(await fs.existsSync(csvPath)).to.equal(true, '【仕訳情報ダウンロード】CSVデータがダウンロードされること');
    return csvPath;
  }

  /**
   * STEP5_No.129
   * STEP7_No.113
   */
  it("仕訳済_データ有", async function () {
    // テストの初期化を実施
    await initBrowser();

    // ページオブジェクト
    const { loginPage, topPage, tradeShiftTopPage, journalMenuPage, paymentRequestListPage, journalDetailPage, journalDownloadPage }
      = common.getPageObject(browser, page);

    // デジタルトレードアプリのトップページへ遷移する
    await gotoTop(config.company1.mng, loginPage, tradeShiftTopPage, topPage);

    // 支払依頼一覧から、仕訳情報の詳細を取得する
    let invoiceNo = 'fcde40392';
    let expected = await getDetail(topPage, journalMenuPage, paymentRequestListPage, journalDetailPage, invoiceNo);

    // デジタルトレードアプリのホームへ遷移する
    await journalDetailPage.clickHome();
    await topPage.waitForLoading();

    // ダウンロードする
    let csvPath = await download(topPage, journalMenuPage, journalDownloadPage, invoiceNo, '2021-04-01', '2023-03-31', null, false, null, true);

    // CSVデータがダウンロードされ、GQ列～ID列に設定した仕訳情報が入力されていること
    let actual = await getCsvData(csvPath);
    for (i = 0; i < expected.length; i++) {
      expect(actual[0]['仕訳情報' + (i + 1) + '-借方勘定科目コード']).to.equal(expected[i].accountCode, '仕訳情報' + (i + 1) + '-勘定科目コードが出力されていること');
      expect(actual[0]['仕訳情報' + (i + 1) + '-借方補助科目コード']).to.equal(expected[i].subAccountCode, '仕訳情報' + (i + 1) + '-補助科目コードが出力されていること');
      expect(actual[0]['仕訳情報' + (i + 1) + '-借方部門コード']).to.equal(expected[i].departmentCode, '仕訳情報' + (i + 1) + '-部門コードが出力されていること');
      expect(actual[0]['仕訳情報' + (i + 1) + '-計上金額']).to.equal(expected[i].cost.replaceAll(/,/g, ''), '仕訳情報' + (i + 1) + '-計上金額が出力されていること');
    }
    await page.waitForTimeout(1000);
  });

  /**
   * STEP7_No.195-197
   */
   it("最終承認済_データ有", async function () {
    // テストの初期化を実施
    await initBrowser();

    // ページオブジェクト
    const { loginPage, topPage, tradeShiftTopPage, journalMenuPage, journalDownloadPage }
      = common.getPageObject(browser, page);

    // デジタルトレードアプリのトップページへ遷移する
    await gotoTop(config.company2.user04, loginPage, tradeShiftTopPage, topPage);

    // ダウンロードする
    let invoiceNo = 'atestApproved';
    let csvPath = await download(topPage, journalMenuPage, journalDownloadPage, invoiceNo, '2021-04-01', '2023-03-31', null, true, null, true);

    // 仕訳情報ダウンロード画面で絞り込みをしたデータと同一の内容になっていること
    let actual = await getCsvData(csvPath);
    const headers = ['請求書番号','発行日','宛先-テナントID','宛先-会社名','宛先-国/地域','宛先-私書箱','宛先-郵便番号','宛先-都道府県','宛先-市区町村・番地','宛先-ビル、マンション名','宛先-登録番号','宛先-GLN','宛先-法人番号','差出人-テナントID','差出人-会社名','差出人-国/地域','差出人-私書箱','差出人-郵便番号','差出人-都道府県','差出人-市区町村・番地','差出人-ビル、マンション名','差出人-登録番号','差出人-GLN','差出人-法人番号','支払期日','納品日','納品開始日','納品終了日','備考','注文書番号','注文書発行日','参考情報','契約書番号','部門','取引先担当者（アドレス）','輸送情報','Tradeshiftクリアランス','通関識別情報','ID','課税日','販売者の手数料番号','DUNSナンバー','暫定時間','予約番号','為替レート','為替レート-通貨','為替レート-日付','為替レート換算後の税金総額','為替レート-Convertd Document Total(incl taxes)','支払方法','支払い条件-割引率','支払い条件-割増率','支払い条件-決済開始日','支払い条件-決済終了日','支払い条件-ペナルティ開始日','支払い条件-ペナルティ終了日','支払い条件-説明','銀行口座-銀行名','銀行口座-支店名','銀行口座-口座番号','銀行口座-科目','銀行口座-口座名義','銀行口座-番地','銀行口座-ビル名 / フロア等','銀行口座-家屋番号','銀行口座-市区町村','銀行口座-都道府県','銀行口座-郵便番号','銀行口座-所在地','銀行口座-国','DirectDebit-銀行名','DirectDebit-支店名','DirectDebit-口座番号','DirectDebit-科目','DirectDebit-口座名義','DirectDebit-番地','DirectDebit-ビル名 / フロア等','DirectDebit-家屋番号','DirectDebit-市区町村','DirectDebit-都道府県','DirectDebit-郵便番号','DirectDebit-所在地','DirectDebit-国','IBAN払い-銀行識別コード / SWIFTコード','IBAN払い-IBAN','IBAN払い-説明','国際電信送金-ABAナンバー','国際電信送金-SWIFTコード','国際電信送金-IBAN','国際電信送金-口座名義','国際電信送金-番地','国際電信送金-ビル名 / フロア等','国際電信送金-家屋番号','国際電信送金-市区町村','国際電信送金-都道府県','国際電信送金-郵便番号','国際電信送金 - 所在地','国際電信送金-国','国際電信送金-説明','支払方法-予備','その他特記事項','明細-項目ID','明細-内容','明細-数量','明細-単位','明細-単価','明細-税（消費税／軽減税率／不課税／免税／非課税）','明細-小計 (税抜)','明細-割引1-内容','明細-割引1-値','明細-割引1-単位','明細-割引1-単価','明細-割引2-内容','明細-割引2-値','明細-割引2-単位','明細-割引2-単価','明細-割引3-内容','明細-割引3-値','明細-割引3-単位','明細-割引3-単価','明細-割引4以降','明細-追加料金1-内容','明細-追加料金1-値','明細-追加料金1-単位','明細-追加料金1-単価','明細-追加料金2-内容','明細-追加料金2-値','明細-追加料金2-単位','明細-追加料金2-単価','明細-追加料金3-内容','明細-追加料金3-値','明細-追加料金3-単位','明細-追加料金3-単価','明細-追加料金4以降','明細-輸送情報','明細-備考','明細-シリアルナンバー','明細-商品分類コード: ECCN','明細-発注者品番','明細-注文明細番号','明細-EAN/GTIN','明細-ロケーションID','明細-貨物注文番号','明細-納品日','明細-HSN/SAC区分','明細-HSN/SACの値','明細-非課税/免税の理由','明細-注文書番号','明細-詳細','明細-メーカー名','明細-原産国','明細-納期','明細-配送先-私書箱','明細-配送先-市区町村番地','明細-配送先-マンション名','明細-配送先-都道府県','明細-配送先-郵便番号','明細-配送先-国','割引1-項目ID','割引1-内容','割引1-数量','割引1-単位','割引1-税（消費税／軽減税率／不課税／免税／非課税）','割引1-小計（税抜）','割引2-項目ID','割引2-内容','割引2-数量','割引2-単位','割引2-税（消費税／軽減税率／不課税／免税／非課税）','割引2-小計（税抜）','割引3-項目ID','割引3-内容','割引3-数量','割引3-単位','割引3-税（消費税／軽減税率／不課税／免税／非課税）','割引3-小計（税抜）','割引4以降','追加料金1-項目ID','追加料金1-内容','追加料金1-数量','追加料金1-単位','追加料金1-税（消費税／軽減税率／不課税／免税／非課税）','追加料金1-小計（税抜）','追加料金2-項目ID','追加料金2-内容','追加料金2-数量','追加料金2-単位','追加料金2-税（消費税／軽減税率／不課税／免税／非課税）','追加料金2-小計（税抜）','追加料金3-項目ID','追加料金3-内容','追加料金3-数量','追加料金3-単位','追加料金3-税（消費税／軽減税率／不課税／免税／非課税）','追加料金3-小計（税抜）','追加料金4以降','固定税-項目ID','固定税-税'];
    for (i = 0; i < headers.length; i++) {
      if (actual[0][headers[i]] == undefined) {
        expect(false).to.equal(true, 'ヘッダ"' + headers[i] + '"が出力フォルダ内に含まれること');
        return;
      }
    }
    expect(true).to.equal(true, 'デジタルトレードフォーマットのファイルが出力されること');
    expect(actual[0]['請求書番号']).to.equal(invoiceNo, '請求書番号"' + invoiceNo + '"が出力ファイルに含まれること');
    await page.waitForTimeout(1000);
  });

  // データ無
  async function testWithoutData(account, invoiceNo, startDate, endDate, checkFinalApproval) {
    // テストの初期化を実施
    await initBrowser();

    // ページオブジェクト
    const { loginPage, topPage, tradeShiftTopPage, journalMenuPage, journalDownloadPage }
      = common.getPageObject(browser, page);

    // デジタルトレードアプリのトップページへ遷移する
    await gotoTop(account, loginPage, tradeShiftTopPage, topPage);

    // ダウンロードする
    await download(topPage, journalMenuPage, journalDownloadPage, invoiceNo, startDate, endDate, null, checkFinalApproval, null, false);
    await page.waitForTimeout(1000);
  }

  /**
   * STEP7_No.113,116
   */
   it("仕訳済_データ無", async function () {
    await testWithoutData(config.company1.mng, 'fcde40392', '2021-04-01', '2023-03-31', true);
  });

  /**
   * STEP7_No.191
   */
   it("最終承認済_データ無", async function () {
    await testWithoutData(config.company2.user04, 'atestApproved', '2021-04-01', '2023-03-31', false);
  });

  async function testWithCredits(invoiceNo, startDate, endDate, lineCount, acCount, withNoCredit, withCredit) {
    // テストの初期化を実施
    await initBrowser();

    // ページオブジェクト
    const { loginPage, topPage, tradeShiftTopPage, journalMenuPage, journalDownloadPage }
      = common.getPageObject(browser, page);

    // デジタルトレードアプリのトップページへ遷移する
    await gotoTop(config.company2.user04, loginPage, tradeShiftTopPage, topPage);

    // ダウンロードする
    let csvPath = await download(topPage, journalMenuPage, journalDownloadPage, invoiceNo, startDate, endDate, null, false, null, true);
    
    // 仕訳情報ダウンロード画面で絞り込みをしたデータと同一の内容になっていること
    let actual = await getCsvData(csvPath);
    for (i = 0; i < lineCount; i++) {
      expect(actual[i]['請求書番号']).to.equal(invoiceNo, '請求書番号"' + invoiceNo + '"が出力ファイルに含まれること');
      for (j = 0; j < acCount; j++) {
        if (withNoCredit) {
          expect(actual[i]['仕訳情報' + (j + 1) + '-借方部門コード'].length).to.lessThan(7, '仕訳情報' + (j + 1) + '-借方部門コードが6桁までしか出力されていないこと');
        }
        if (withCredit) {
          expect(actual[i]['仕訳情報' + (j + 1) + '-貸方部門コード'].length).to.lessThan(7, '仕訳情報' + (j + 1) + '-貸方部門コードが6桁までしか出力されていないこと');
        }
      }
    }
    await page.waitForTimeout(1000);
  }

  /**
   * STEP7_No.120,121,122
   */
  it("明細1、仕訳数10（借方あり、貸方なし）", async function () {
    await testWithCredits('atest011010', '2022-07-04', '2022-07-04', 1, 10, true, false);
  });

  /**
   * STEP7_No.124,125,126
   *//*
  it("明細1、仕訳数10（借方あり、貸方あり）", async function () {
    await testWithCredits('atest011011', '2022-07-04', '2022-07-04', 1, 10, true, true);
  });*/

  /**
   * STEP7_No.128,129,130
   */
  it("明細1、仕訳数10（借方なし、貸方あり）", async function () {
    await testWithCredits('atest011010', '2022-07-04', '2022-07-04', 1, 10, false, true);
  });

  /**
   * STEP7_No.132,133,134
   *//*
  it("明細2、仕訳数10（借方あり、貸方なし）", async function () {
    await testWithCredits('atest021010', '2022-07-06', '2022-07-06', 2, 10, true, false);
  });*/

  /**
   * STEP7_No.136,137,138
   */
  it("明細2、仕訳数10（借方あり、貸方あり）", async function () {
    await testWithCredits('atest021011', '2022-07-06', '2022-07-06', 2, 10, true, true);
  });

  /**
   * STEP7_No.140,141,142
   *//*
  it("明細2、仕訳数10（借方なし、貸方あり）", async function () {
    await testWithCredits('atest021010', '2022-07-06', '2022-07-06', 2, 10, false, true);
  });*/
  
  /**
   * STEP7_No.144,145,146
   */
   it("明細1、仕訳数1（借方あり、貸方あり）", async function () {
    await testWithCredits('atest010111', '2022-07-13', '2022-07-13', 1, 1, true, true);
  });
});

// CSVファイルをの中身を取得する
async function getCsvData(csvPath) {
  let tmpData = fs.readFileSync(csvPath, 'utf-8');
  tmpData = tmpData.replace(/\r?\n/g, '\r\n'); // 改行コードを\r\nに統一する
  tmpData = tmpData.replace(/\ufeff/g, ''); // BOMを削除する
  return parse(tmpData, { columns: true });
};
