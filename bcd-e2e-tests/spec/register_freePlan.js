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

describe('利用登録', function () {

  // 登録情報
  const user = {
    name: {
      name:'テスト企業',
      kana:'テストキギョウ'
    },
    address: {
      post:'1010061',
      address:'東京都千代田区神田三崎町３丁目',
      houseNo:'４番地９号',
      other:'水道橋エムエスビル'
    },
    contact: {
      name: config.company2.user.family + config.company2.user.first,
      tel:'000-0000-0000',
      mail: config.company1.user02.id
    },
    campaign: {
      code:'12345678901',
      name:'あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよわをabcdefghijklmnopqrstuvwxyzひふへﾎまみむめもやゆよわをあいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよわをabcdefghijklmnopqrstuvwxyzひふへほまみむめもやゆよわをあいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよわをabcdefghijklmnopqrstuvwxyzひふへほまみむめもやゆよわをああああああああああんんんんんんあ'
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

  // 利用登録テスト共通操作
  async function register(account, withCode, withName) {
    // テストの初期化を実施
    await initBrowser();
    const context = await browser.newContext(contextOption);
    if (page != null) {
      page.close();
    }
    page = await context.newPage();
    global.reporter.setBrowserInfo(browser, page);

    // ページオブジェクト
    const { loginPage, tradeShiftTopPage, registerPage }
      = common.getPageObject(browser, page);

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
    await registerPage.waitForLoading();

    // 契約者情報を入力する
    await registerPage.inputName(user.name.name, user.name.kana);
    await registerPage.inputAddress(user.address.post, user.address.address, user.address.houseNo, user.address.other);
    await registerPage.inputContact(user.contact.name, user.contact.tel, user.contact.mail);
    await registerPage.inputPassword(account.password);
    await registerPage.inputCampaign(withCode ? user.campaign.code : null, withName ? user.campaign.name : null);
    if (withCode) {
      expect(await registerPage.getCampaignCode()).to.equal(user.campaign.code.substring(0, 10), '販売店コードに10桁まで入力できること');
    }
    if (withName) {
      expect(await registerPage.getCampaignName()).to.equal(user.campaign.name.substring(0, 256), '販売担当者名に256桁まで入力できること');
    }
    await registerPage.checkAgree();
    await registerPage.clickNext();

    // エラー無く「以下の内容で利用登録します。」のポップアップが表示されること
    let actual = await registerPage.getReuser();
    expect(actual.name).to.equal(user.name.name, '【利用登録】入力した契約者名（企業名）がポップアップに表示されること');
    expect(actual.kana).to.equal(user.name.kana, '【利用登録】入力した契約者カナ名（企業名）がポップアップに表示されること');
    actual = await registerPage.getReaddress();
    expect(actual.post).to.equal(user.address.post, '【利用登録】入力した郵便番号がポップアップに表示されること');
    expect(actual.address).to.equal(user.address.address + user.address.houseNo + user.address.other, '【利用登録】入力した住所がポップアップに表示されること');
    actual = await registerPage.getRecontact();
    expect(actual.name).to.equal(user.contact.name, '【利用登録】入力した連絡先担当者名がポップアップに表示されること');
    expect(actual.tel).to.equal(user.contact.tel, '【利用登録】入力した連絡先電話番号がポップアップに表示されること');
    expect(actual.mail).to.equal(user.contact.mail, '【利用登録】入力した連絡先メールアドレスがポップアップに表示されること');
    actual = await registerPage.getRecampaign();
    expect(actual.code).to.equal(withCode ? user.campaign.code.substring(0, 10) : '', '【利用登録】入力した販売店コードがポップアップに表示されること');
    expect(actual.name).to.equal(withName ? user.campaign.name.substring(0, 256) : '', '【利用登録】入力した販売担当者名がポップアップに表示されること');
    await page.waitForTimeout(1000);
  };

  /**
   * STEP7_No.1,3,15,25-30,37-40
   */
  it("利用登録（販売店コードあり、販売担当者あり）", async function () {
    await register(config.company2.user, true, true);
  });
  
  /**
   * STEP7_No.1,3,15,25-30,47-50
   */
  it("利用登録（販売店コードなし、販売担当者なし）", async function () {
    await register(config.company2.user, false, false);
  });

  /**
   * STEP8_ライトプラン_No.37-41
   */
   it("契約内容確認", async function () {
    // テストの初期化を実施
    await initBrowser();
    const context = await browser.newContext(contextOption);
    if (page != null) {
      page.close();
    }
    page = await context.newPage();
    global.reporter.setBrowserInfo(browser, page);

    // ページオブジェクト
    const { topPage, settingMenuPage, contractDetailPage, contractChangePage, contractCancelPage }
      = common.getPageObject(browser, page);

    // デジタルトレードアプリのトップページを表示する
    await common.gotoTop(page, config.company2.user06);

    // ご契約内容画面に遷移すること
    await topPage.openSettingMenu();
    await settingMenuPage.waitForLoading();
    await settingMenuPage.clickContractChange();
    await contractDetailPage.waitForLoading();
    expect(await contractDetailPage.getTitle()).to.equal('ご契約内容', '【ご契約内容】ご契約内容画面に遷移すること');
    let planName = 'BConnectionデジタルトレードアプリ フリー';
    expect(await contractDetailPage.getStatus(planName)).to.equal('契約中', '【ご契約内容】継続利用サービスにフリープランが「契約中」で表示されていること');
    expect(await contractDetailPage.getContractNo(planName)).to.not.equal('ー', '【ご契約内容】フリープランの契約番号が表示されていること');

    // 契約変更画面へ遷移すること
    await contractDetailPage.clickChange(planName);
    await contractChangePage.waitForLoading();
    expect(await contractChangePage.getTitle()).to.equal('契約情報変更', '【契約情報変更】契約変更画面へ遷移すること');

    // フリープランの契約情報解約画面へ遷移すること
    await contractChangePage.back();
    await contractDetailPage.waitForLoading();
    await contractDetailPage.clickCancel('フリー');
    await contractCancelPage.waitForLoading();
    expect(await contractCancelPage.getTitle()).to.equal('契約情報解約', '【契約情報解約】契約情報解約画面へ遷移すること');
    await page.waitForTimeout(1000);
  });
});
