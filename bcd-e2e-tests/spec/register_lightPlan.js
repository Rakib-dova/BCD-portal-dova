const webdriverUtils = require('../utils/webdriver-utils');
const chai = require('chai');
const chaiWithReporting = require('../utils/chai-with-reporting').chaiWithReporting;
const config = require('../autotest-script-config');
const common = require('./common');

const expect = chai.expect;
chai.use(chaiWithReporting);

let browser, contextOption, page;

webdriverUtils.setReporter();

describe('追加オプション申込', function () {

  // 登録情報
  const user = {
    name: {
      name:'テスト企業テスト企業テスト企業テスト企業テスト企業テスト企業テスト企業テスト企業テスト企業テスト企業テスト企業テスト企業テスト企業テスト企業テスト企業テスト企業',
      kana:'テストキギョウウウウテストキギョウウウウテストキギョウウウウテストキギョウウウウテストキギョウウウウテストキギョウウウウテストキギョウウウウテストキギョウウウウ'
    },
    address: {
      post:'1010061',
      address:'東京都千代田区神田三崎町３丁目',
      houseNo:'４４４４４４４４４４４４４４４４４４番地',
      other:'水道橋水道橋水道橋水道橋水道橋水'
    },
    contact: {
      name: 'テテスト連絡先担当者',
      tel:'000-0000-0000',
      mail:'abcdefghij+klmnopqrst-uvwxyz_abcdefghij+klmnopqrst-uvwxyz_abcdefghij+k@example.com'
    },
    billing: {
      post:'1010061',
      address:'東京都千代田区神田三崎町３丁目',
      houseNo:'４４４４４４４４４４４４４４４４４４番地',
      other:'水道橋水道橋水道橋水道橋水道橋水',
      name: 'テスト請求書送付先宛',
      kana:'テストセイキュウショソウフサキアテ',
      tel:'000-0000-0000',
      mail:'abcdefghij+klmnopqrst-uvwxyz_abcdefghij+klmnopqrst-uvwxyz_abcdefghij+k@example.com'
    },
    openingDate: '2024/08/26',
    dealer: {
      chCode:'a1b2c3d4',
      chName:'テテストテストテストテスト販売店',
      customerId:'a1b2c3d4e5f',
      deptName:'テストテストテストテストテスト課',
      emplyeeCode:'abcd9876',
      person:'テテストテスト担当者',
      deptType:'その他',
      tel:'000-0000-0000',
      mail:'abcdefghij+klmnopqrst-uvwxyz_abcdefghij+klmnopqrst-uvwxyz_abcdefghij+k@example.com'
    }
  };

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
   * STEP8_ライトプラン_No.45-47
   */
   it("管理者以外", async function () {
    // テストの初期化を実施
    await initBrowser();
    const context = await browser.newContext(contextOption);
    if (page != null) {
      page.close();
    }
    page = await context.newPage();
    global.reporter.setBrowserInfo(browser, page);

    // ページオブジェクト
    const { topPage, paymentRequestListPage, journalDownloadPage, lightPlanMenuPage } = common.getPageObject(browser, page);

    // デジタルトレードアプリのトップページを表示する
    await common.gotoTop(page, config.company2.user07);
    
    // オプションサービス申込アイコンが表示されないこと
    expect(await topPage.isLightPlanShown()).to.equal(false, '【トップ】「追加オプション申込」が表示されないこと');

    // 【支払依頼一覧】申込フォームボタン（スタンダード、導入支援）の両方が非活性となっていること
    await topPage.clickPaymentRequest();
    await paymentRequestListPage.waitForLoading();
    await paymentRequestListPage.clickLightPlan();
    await lightPlanMenuPage.waitForLoading();
    expect(await lightPlanMenuPage.getApplyEnabled()).to.equal(false, '【支払依頼一覧】スタンダードプランの「お申込みフォーム」が非活性となっていること');
    await lightPlanMenuPage.clickIntroSupport();
    expect(await lightPlanMenuPage.getApplyIntroSupportEnabled()).to.equal(false, '【支払依頼一覧】導入支援サービスの「お申込みフォーム」が非活性となっていること');

    // 【仕訳情報ダウンロード】申込フォームボタン（スタンダード、導入支援）の両方が非活性となっていること
    await lightPlanMenuPage.close();
    await paymentRequestListPage.clickHome();
    await topPage.waitForLoading();
    await topPage.clickDownloadJournal();
    await journalDownloadPage.waitForLoading();
    await journalDownloadPage.clickLightPlan();
    await lightPlanMenuPage.waitForLoading();
    expect(await lightPlanMenuPage.getApplyEnabled()).to.equal(false, '【仕訳情報ダウンロード】スタンダードプランの「お申込みフォーム」が非活性となっていること');
    await lightPlanMenuPage.clickIntroSupport();
    expect(await lightPlanMenuPage.getApplyIntroSupportEnabled()).to.equal(false, '【仕訳情報ダウンロード】導入支援サービスの「お申込みフォーム」が非活性となっていること');
    await page.waitForTimeout(1000);
  });

  /**
   * STEP8_ライトプラン_No.1,3,5,7,9-11,16,18-20,49,50,73,171
   */
  it("スタンダードプラン（未契約）", async function () {
    // テストの初期化を実施
    await initBrowser();
    const context = await browser.newContext(contextOption);
    if (page != null) {
      page.close();
    }
    page = await context.newPage();
    global.reporter.setBrowserInfo(browser, page);

    // ページオブジェクト
    const { topPage, lightPlanMenuPage, paidServiceRegisterPage, paidServiceRegisterInputPage }
      = common.getPageObject(browser, page);

    // デジタルトレードアプリのトップページを表示する
    await common.gotoTop(page, config.company2.user06);

    // オプションサービス申込アイコンが表示されること
    expect(await topPage.isLightPlanShown()).to.equal(true, '【トップ】「追加オプション申込」が表示されること');

    // オプションサービス申込モーダルを開く
    await topPage.clickLightPlan();
    await lightPlanMenuPage.waitForLoading();

    // オプションサービス申込モーダルが表示されること
    expect(await lightPlanMenuPage.getTitle()).to.equal('オプションサービス申込', '【オプションサービス申込】「オプションサービス申込」モーダルが表示されること');
    expect(await lightPlanMenuPage.getApplyEnabled()).to.equal(true, '【オプションサービス申込】スタンダードプランの「お申し込みフォーム」ボタンが活性状態であること');

    // 「サービス紹介LP」へ遷移すること
    await lightPlanMenuPage.clickStandardPlan();
    expect(await lightPlanMenuPage.getDetailUrl()).to.equal('https://www.ntt.com/business/services/application/crm-dm/bconnection.html', '【トップ】「サービス紹介LP」へ遷移すること');

    // 申し込み画面（利用規約）に遷移すること
    await lightPlanMenuPage.clickApply();
    await paidServiceRegisterPage.waitForLoading();
    expect(await paidServiceRegisterPage.getTitle()).to.equal('有料サービス利用登録', '【有料サービス利用登録】申し込み画面（利用規約）に遷移すること');
    expect(await paidServiceRegisterPage.isStandardChecked()).to.equal(true, '【有料サービス利用登録】「ご利用希望サービス」の「スタンダードプラン」にチェックが入っていること');
    expect(await paidServiceRegisterPage.isNextDisabled()).to.equal(true, '【有料サービス利用登録】初期状態では「申込内容入力へ」ボタンが非活性になっていること');

    // 申し込み画面（フォーム入力）に遷移すること
    await paidServiceRegisterPage.checkAgree();
    expect(await paidServiceRegisterPage.isNextDisabled()).to.equal(false, '【有料サービス利用登録】「申込内容入力へ」ボタンが活性になること');
    await paidServiceRegisterPage.clickNext();
    await paidServiceRegisterInputPage.waitForLoading();
    expect(await paidServiceRegisterInputPage.getSubTitle()).to.equal(paidServiceRegisterInputPage.title, '【有料サービス利用登録】申し込み画面（フォーム入力）に遷移すること');
    expect(await paidServiceRegisterInputPage.isOpeningDateShown()).to.equal(true, '【有料サービス利用登録】「スタンダードプラン利用開始日」欄が表示されていること');

    // 登録確認画面に遷移すること（必須項目のみ入力）
    await paidServiceRegisterInputPage.inputName(user.name);
    await paidServiceRegisterInputPage.inputAddress(user.address, false);
    await paidServiceRegisterInputPage.inputContact(user.contact);
    await paidServiceRegisterInputPage.inputBillingAddress(user.billing, false);
    await paidServiceRegisterInputPage.inputBillingContact(user.billing);
    await paidServiceRegisterInputPage.inputPassword(config.company2.user03.password);
    await paidServiceRegisterInputPage.clickNext();
    let actual = await paidServiceRegisterInputPage.getReuser();
    expect(actual.name).to.equal(user.name.name, '【有料サービス利用登録】入力した契約者名（企業名）がポップアップに表示されること');
    expect(actual.kana).to.equal(user.name.kana, '【有料サービス利用登録】入力した契約者カナ名（企業名）がポップアップに表示されること');
    actual = await paidServiceRegisterInputPage.getReaddress();
    expect(actual.post).to.equal(user.address.post, '【有料サービス利用登録】入力した郵便番号がポップアップに表示されること');
    expect(actual.address).to.equal(user.address.address + user.address.houseNo, '【有料サービス利用登録】入力した住所がポップアップに表示されること');
    actual = await paidServiceRegisterInputPage.getRecontact();
    expect(actual.name).to.equal(user.contact.name, '【有料サービス利用登録】入力した連絡先担当者名がポップアップに表示されること');
    expect(actual.tel).to.equal(user.contact.tel, '【有料サービス利用登録】入力した連絡先電話番号がポップアップに表示されること');
    expect(actual.mail).to.equal(user.contact.mail, '【有料サービス利用登録】入力した連絡先メールアドレスがポップアップに表示されること');
    actual = await paidServiceRegisterInputPage.getRebillingAddress();
    expect(actual.post).to.equal(user.billing.post, '【有料サービス利用登録】入力した請求書送付先郵便番号がポップアップに表示されること');
    expect(actual.address).to.equal(user.billing.address + user.billing.houseNo, '【有料サービス利用登録】入力した請求書送付先住所がポップアップに表示されること');
    expect(actual.name).to.equal(user.billing.name, '【有料サービス利用登録】入力した請求書送付先宛名がポップアップに表示されること');
    expect(actual.kana).to.equal(user.billing.kana, '【有料サービス利用登録】入力した請求書送付先宛カナ名がポップアップに表示されること');
    actual = await paidServiceRegisterInputPage.getRebillingContact();
    expect(actual.name).to.equal(user.billing.name, '【有料サービス利用登録】入力した担当者氏名がポップアップに表示されること');
    expect(actual.tel).to.equal(user.billing.tel, '【有料サービス利用登録】入力した担当者電話番号がポップアップに表示されること');
    expect(actual.mail).to.equal(user.billing.mail, '【有料サービス利用登録】入力した担当者メールアドレスがポップアップに表示されること');

    // 登録確認画面に遷移すること（全項目入力）
    await paidServiceRegisterInputPage.closeConfirmPopup();
    await paidServiceRegisterInputPage.inputAddress(user.address, true);
    await paidServiceRegisterInputPage.inputBillingAddress(user.billing, true);
    await paidServiceRegisterInputPage.inputDealer(user.dealer);
    await paidServiceRegisterInputPage.clickNext();
    actual = await paidServiceRegisterInputPage.getReaddress();
    expect(actual.post).to.equal(user.address.post, '【有料サービス利用登録】入力した郵便番号がポップアップに表示されること');
    expect(actual.address).to.equal(user.address.address + user.address.houseNo + user.address.other, '【有料サービス利用登録】入力した住所がポップアップに表示されること');
    actual = await paidServiceRegisterInputPage.getRebillingAddress();
    expect(actual.post).to.equal(user.billing.post, '【有料サービス利用登録】入力した請求書送付先郵便番号がポップアップに表示されること');
    expect(actual.address).to.equal(user.billing.address + user.billing.houseNo + user.billing.other, '【有料サービス利用登録】入力した請求書送付先住所がポップアップに表示されること');
    expect(actual.name).to.equal(user.billing.name, '【有料サービス利用登録】入力した請求書送付先宛名がポップアップに表示されること');
    expect(actual.kana).to.equal(user.billing.kana, '【有料サービス利用登録】入力した請求書送付先宛カナ名がポップアップに表示されること');
    actual = await paidServiceRegisterInputPage.getRedealer();
    expect(actual.chCode).to.equal(user.dealer.chCode, '【有料サービス利用登録】入力した販売チャネルコードがポップアップに表示されること');
    expect(actual.chName).to.equal(user.dealer.chName, '【有料サービス利用登録】入力した販売チャネル名がポップアップに表示されること');
    expect(actual.customerId).to.equal(user.dealer.customerId, '【有料サービス利用登録】入力した共通顧客IDがポップアップに表示されること');
    expect(actual.deptName).to.equal(user.dealer.deptName, '【有料サービス利用登録】入力した部課名がポップアップに表示されること');
    expect(actual.emplyeeCode).to.equal(user.dealer.emplyeeCode, '【有料サービス利用登録】入力した社員コードがポップアップに表示されること');
    expect(actual.person).to.equal(user.dealer.person, '【有料サービス利用登録】入力した担当者名がポップアップに表示されること');
    expect(actual.deptType).to.equal(user.dealer.deptType, '【有料サービス利用登録】入力した組織区分がポップアップに表示されること');
    expect(actual.tel).to.equal(user.dealer.tel, '【有料サービス利用登録】入力した電話番号がポップアップに表示されること');
    expect(actual.mail).to.equal(user.dealer.mail, '【有料サービス利用登録】入力したメールアドレスがポップアップに表示されること');
    await page.waitForTimeout(1000);
  });

  /**
   * STEP8_ライトプラン_No.186-190
   */
   it("スタンダードプラン（契約中）", async function () {
    // テストの初期化を実施
    await initBrowser();
    const context = await browser.newContext(contextOption);
    if (page != null) {
      page.close();
    }
    page = await context.newPage();
    global.reporter.setBrowserInfo(browser, page);

    // ページオブジェクト
    const { topPage, lightPlanMenuPage, contractDetailPage, contractCancelPage } = common.getPageObject(browser, page);

    // デジタルトレードアプリのトップページを表示する
    await common.gotoTop(page, config.company1.mng);
    expect(await topPage.getPlanStatus()).to.equal('スタンダードプラン', '【トップ】契約中のプランが"スタンダードプラン"であること');
    expect(await topPage.isLightPlanShown()).to.equal(true, '【トップ】「オプションサービス申込」のアイコンが表示されていること');

    // オプションサービス申込モーダルが表示されること 
    await topPage.clickLightPlan();
    await lightPlanMenuPage.waitForLoading();
    expect(await lightPlanMenuPage.getTitle()).to.equal('オプションサービス申込', '【オプションサービス申込】オプションサービス申込モーダルが表示されること');
    expect(await lightPlanMenuPage.getApplyEnabled()).to.equal(false, '【オプションサービス申込】スタンダードプランの「お申込みフォーム」が非活性になっていること');

    // 継続利用サービスにスタンダードプランが「契約中」で表示されていること
    await lightPlanMenuPage.close();
    await topPage.clickContractDetail();
    await contractDetailPage.waitForLoading();
    expect(await contractDetailPage.getStatus('スタンダード')).to.equal('契約中', '【ご契約内容】スタンダードプランが「契約中」で表示されていること');
    expect(await contractDetailPage.getContractNo('スタンダード')).to.not.equal('ー', '【ご契約内容】スタンダードプランの契約番号が表示されていること');
    expect(await contractDetailPage.isCancelDisabled('フリー')).to.equal(true, '【ご契約内容】フリープランの「解約申請」ボタンが非活性となっていること');
    expect(await contractDetailPage.isCancelDisabled('スタンダード')).to.equal(false, '【ご契約内容】スタンダードプランの「解約申請」ボタンが活性となっていること');

    // スタンダードプランの契約情報解約画面へ遷移すること
    await contractDetailPage.clickCancel('スタンダード');
    await contractCancelPage.waitForLoading();
    expect(await contractCancelPage.getTitle()).to.equal('契約情報解約', '【契約情報解約】スタンダードプランの契約情報解約画面へ遷移すること');

    // スタンダードプランの解約確認ポップアップが表示されること
    await contractCancelPage.clickCancelModal();
    expect(await contractCancelPage.getCancelModalTitle()).to.equal('以下の内容を解約します', '【契約情報解約】スタンダードプランの解約確認ポップアップが表示されること');
    await contractCancelPage.closeCancelModal();
    await page.waitForTimeout(1000);
  });

  /**
   * STEP8_導入支援サービス_No.1,3-9,18,19
   */
  it("導入支援サービス（未契約）", async function () {
    // テストの初期化を実施
    await initBrowser();
    const context = await browser.newContext(contextOption);
    if (page != null) {
      page.close();
    }
    page = await context.newPage();
    global.reporter.setBrowserInfo(browser, page);

    // ページオブジェクト
    const { topPage, lightPlanMenuPage, paidServiceRegisterPage, paidServiceRegisterInputPage }
      = common.getPageObject(browser, page);

    // デジタルトレードアプリのトップページを表示する
    await common.gotoTop(page, config.company2.user03);

    // オプションサービス申込モーダルを開く
    await topPage.clickLightPlan();
    await lightPlanMenuPage.waitForLoading();

    // 「導入支援サービス」欄の下部にある「お申し込みフォーム」ボタンが活性になっていること
    await lightPlanMenuPage.clickIntroSupport();
    expect(await lightPlanMenuPage.getApplyIntroSupportEnabled()).to.equal(true, '【オプションサービス申込】導入支援サービスの「お申し込みフォーム」ボタンが活性状態であること');

    // 申し込み画面（利用規約）に遷移すること
    await lightPlanMenuPage.clickApplyIntroSupport();
    await paidServiceRegisterPage.waitForLoading();
    expect(await paidServiceRegisterPage.getTitle()).to.equal('有料サービス利用登録', '【有料サービス利用登録】申し込み画面（利用規約）に遷移すること');
    expect(await paidServiceRegisterPage.isIntroSupportChecked()).to.equal(true, '【有料サービス利用登録】「ご利用希望サービス」の「導入支援サービス」にチェックが入っていること');

    // 申し込み画面（フォーム入力）に遷移すること
    await paidServiceRegisterPage.checkAgree();
    await paidServiceRegisterPage.clickNext();
    await paidServiceRegisterInputPage.waitForLoading();
    expect(await paidServiceRegisterInputPage.getSubTitle()).to.equal('お申し込み内容入力', '【有料サービス利用登録】申し込み画面（フォーム入力）に遷移すること');
    expect(await paidServiceRegisterInputPage.isOpeningDateShown()).to.equal(false, '【有料サービス利用登録】「スタンダードプラン利用開始日」欄が表示されていないこと');

    // 登録確認画面に遷移すること（必須項目のみ入力）
    await paidServiceRegisterInputPage.inputName(user.name);
    await paidServiceRegisterInputPage.inputAddress(user.address, false);
    await paidServiceRegisterInputPage.inputContact(user.contact);
    await paidServiceRegisterInputPage.inputBillingAddress(user.billing, false);
    await paidServiceRegisterInputPage.inputBillingContact(user.billing);
    await paidServiceRegisterInputPage.inputPassword(config.company2.user03.password);
    await paidServiceRegisterInputPage.clickNext();
    let actual = await paidServiceRegisterInputPage.getReuser();
    expect(actual.name).to.equal(user.name.name, '【有料サービス利用登録】入力した契約者名（企業名）がポップアップに表示されること');
    expect(actual.kana).to.equal(user.name.kana, '【有料サービス利用登録】入力した契約者カナ名（企業名）がポップアップに表示されること');
    actual = await paidServiceRegisterInputPage.getReaddress();
    expect(actual.post).to.equal(user.address.post, '【有料サービス利用登録】入力した郵便番号がポップアップに表示されること');
    expect(actual.address).to.equal(user.address.address + user.address.houseNo, '【有料サービス利用登録】入力した住所がポップアップに表示されること');
    actual = await paidServiceRegisterInputPage.getRecontact();
    expect(actual.name).to.equal(user.contact.name, '【有料サービス利用登録】入力した連絡先担当者名がポップアップに表示されること');
    expect(actual.tel).to.equal(user.contact.tel, '【有料サービス利用登録】入力した連絡先電話番号がポップアップに表示されること');
    expect(actual.mail).to.equal(user.contact.mail, '【有料サービス利用登録】入力した連絡先メールアドレスがポップアップに表示されること');
    actual = await paidServiceRegisterInputPage.getRebillingAddress();
    expect(actual.post).to.equal(user.billing.post, '【有料サービス利用登録】入力した請求書送付先郵便番号がポップアップに表示されること');
    expect(actual.address).to.equal(user.billing.address + user.billing.houseNo, '【有料サービス利用登録】入力した請求書送付先住所がポップアップに表示されること');
    expect(actual.name).to.equal(user.billing.name, '【有料サービス利用登録】入力した請求書送付先宛名がポップアップに表示されること');
    expect(actual.kana).to.equal(user.billing.kana, '【有料サービス利用登録】入力した請求書送付先宛カナ名がポップアップに表示されること');
    actual = await paidServiceRegisterInputPage.getRebillingContact();
    expect(actual.name).to.equal(user.billing.name, '【有料サービス利用登録】入力した担当者氏名がポップアップに表示されること');
    expect(actual.tel).to.equal(user.billing.tel, '【有料サービス利用登録】入力した担当者電話番号がポップアップに表示されること');
    expect(actual.mail).to.equal(user.billing.mail, '【有料サービス利用登録】入力した担当者メールアドレスがポップアップに表示されること');

    // 登録確認画面に遷移すること（全項目入力）
    await paidServiceRegisterInputPage.closeConfirmPopup();
    await paidServiceRegisterInputPage.inputAddress(user.address, true);
    await paidServiceRegisterInputPage.inputBillingAddress(user.billing, true);
    await paidServiceRegisterInputPage.inputDealer(user.dealer);
    await paidServiceRegisterInputPage.clickNext();
    actual = await paidServiceRegisterInputPage.getReaddress();
    expect(actual.post).to.equal(user.address.post, '【有料サービス利用登録】入力した郵便番号がポップアップに表示されること');
    expect(actual.address).to.equal(user.address.address + user.address.houseNo + user.address.other, '【有料サービス利用登録】入力した住所がポップアップに表示されること');
    actual = await paidServiceRegisterInputPage.getRebillingAddress();
    expect(actual.post).to.equal(user.billing.post, '【有料サービス利用登録】入力した請求書送付先郵便番号がポップアップに表示されること');
    expect(actual.address).to.equal(user.billing.address + user.billing.houseNo + user.billing.other, '【有料サービス利用登録】入力した請求書送付先住所がポップアップに表示されること');
    expect(actual.name).to.equal(user.billing.name, '【有料サービス利用登録】入力した請求書送付先宛名がポップアップに表示されること');
    expect(actual.kana).to.equal(user.billing.kana, '【有料サービス利用登録】入力した請求書送付先宛カナ名がポップアップに表示されること');
    actual = await paidServiceRegisterInputPage.getRedealer();
    expect(actual.chCode).to.equal(user.dealer.chCode, '【有料サービス利用登録】入力した販売チャネルコードがポップアップに表示されること');
    expect(actual.chName).to.equal(user.dealer.chName, '【有料サービス利用登録】入力した販売チャネル名がポップアップに表示されること');
    expect(actual.customerId).to.equal(user.dealer.customerId, '【有料サービス利用登録】入力した共通顧客IDがポップアップに表示されること');
    expect(actual.deptName).to.equal(user.dealer.deptName, '【有料サービス利用登録】入力した部課名がポップアップに表示されること');
    expect(actual.emplyeeCode).to.equal(user.dealer.emplyeeCode, '【有料サービス利用登録】入力した社員コードがポップアップに表示されること');
    expect(actual.person).to.equal(user.dealer.person, '【有料サービス利用登録】入力した担当者名がポップアップに表示されること');
    expect(actual.deptType).to.equal(user.dealer.deptType, '【有料サービス利用登録】入力した組織区分がポップアップに表示されること');
    expect(actual.tel).to.equal(user.dealer.tel, '【有料サービス利用登録】入力した電話番号がポップアップに表示されること');
    expect(actual.mail).to.equal(user.dealer.mail, '【有料サービス利用登録】入力したメールアドレスがポップアップに表示されること');
    await page.waitForTimeout(1000);
  });

  /**
   * STEP8_導入支援サービス_No.1,3-9,18,19
   */
   it("導入支援サービス（申込処理中）", async function () {
    // テストの初期化を実施
    await initBrowser();
    const context = await browser.newContext(contextOption);
    if (page != null) {
      page.close();
    }
    page = await context.newPage();
    global.reporter.setBrowserInfo(browser, page);

    // ページオブジェクト
    const { topPage, lightPlanMenuPage, contractDetailPage } = common.getPageObject(browser, page);

    // デジタルトレードアプリのトップページを表示する
    await common.gotoTop(page, config.company1.mng);

    // オプションサービス申込アイコンが表示されること
    expect(await topPage.isLightPlanShown()).to.equal(true, '【トップ】「追加オプション申込」が表示されること');

    // 初回利用サービスに導入支援サービスが「申込処理中」で表示されていること
    await topPage.clickContractDetail();
    await contractDetailPage.waitForLoading();
    expect(await contractDetailPage.getStatus('導入支援サービス')).to.equal('申込処理中', '【ご契約内容】導入支援サービスが「申込処理中」で表示されていること');

    // 契約プランを確認する
    let plan = (await contractDetailPage.getPlan()).includes('スタンダード') ? 'スタンダードプラン' : 'フリープラン';
    await contractDetailPage.clickHome();
    await topPage.waitForLoading();
    expect(await topPage.getPlanStatus()).to.equal(plan, '【トップ】契約プランが"' + plan + '"であること');

    // 契約プランからオプションサービス申込ダイアログを開く
    await topPage.clickPlanStatus();
    await lightPlanMenuPage.waitForLoading();
    expect(await lightPlanMenuPage.getTitle()).to.equal('オプションサービス申込', '【オプションサービス申込】「オプションサービス申込」モーダルが表示されること');
    await lightPlanMenuPage.clickIntroSupport();
    expect(await lightPlanMenuPage.getApplyIntroSupportEnabled()).to.equal(false, '【オプションサービス申込】導入支援サービスの「お申し込みフォーム」ボタンが非活性状態であること');

    // 追加オプション申込アイコンからオプションサービス申込ダイアログを開く
    await lightPlanMenuPage.close();
    await topPage.clickLightPlan();
    await lightPlanMenuPage.waitForLoading();

    // 「導入支援サービス」欄の下部にある「お申し込みフォーム」ボタンが非活性になっていること
    expect(await lightPlanMenuPage.getTitle()).to.equal('オプションサービス申込', '【オプションサービス申込】「オプションサービス申込」モーダルが表示されること');
    await lightPlanMenuPage.clickIntroSupport();
    expect(await lightPlanMenuPage.getApplyIntroSupportEnabled()).to.equal(false, '【オプションサービス申込】導入支援サービスの「お申し込みフォーム」ボタンが非活性状態であること');
    await page.waitForTimeout(1000);
  });
});
