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
      houseNo:'４－９',
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

  // 待機フラグ
  let waited = false;

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
    const { loginPage, topPage, tradeShiftTopPage, registerPage, settingMenuPage, contractChangePage }
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
    await comment('デジタルトレードアプリのアイコンをクリックする');
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
/*
    // 利用登録する
    await registerPage.submit();
    await topPage.waitPopup();
    await topPage.waitForLoading();
    await topPage.closePopup();

    // 契約情報を確認する
    await topPage.openSettingMenu();
    await settingMenuPage.waitForLoading();
    await settingMenuPage.clickContractChange();
    await contractChangePage.waitForLoading();

    // 利用登録手続き中の旨メッセージが表示されていること
    expect(await contractChangePage.getSubTitle()).to.equal('現在利用登録手続き中です。', '利用登録手続き中の旨メッセージが表示されていること');
*/
    waited = false;
    await page.waitForTimeout(1000);
  };

  // 解約共通操作
  async function cancel(account) {
    // テストの初期化を実施
    await initBrowser();
    const context = await browser.newContext(contextOption);
    if (page != null) {
      page.close();
      
      // 20分待機する
      if(!waited) {
        await page.waitForTimeout(1200000);
        waited = true;
      }
    }
    page = await context.newPage();
    global.reporter.setBrowserInfo(browser, page);

    // ページオブジェクト
    const { loginPage, topPage, tradeShiftTopPage, settingMenuPage, contractCancelPage }
      = common.getPageObject(browser, page);

    // 指定したURLに遷移する
    await comment('Tradeshiftログインページへ移動する');
    await page.goto(config.baseUrl);

    // ログインを行う
    await comment('ユーザ"' + account.id + '"でログインする');
    await loginPage.doLogin(account.id, account.password);
    await tradeShiftTopPage.waitForLoading();

    // デジタルトレードアプリをクリックする
    await comment('デジタルトレードアプリのアイコンをクリックする');
    await tradeShiftTopPage.clickBcdApp(config.appName);
    await topPage.waitForLoading();

    // 設定変更が可能な状態になっていること
    await topPage.openSettingMenu();
    await settingMenuPage.waitForLoading();
    await settingMenuPage.clickCancel();
    await contractCancelPage.waitForLoading();
    expect(await contractCancelPage.ableToChange()).to.equal(true, '【契約情報解約】設定変更が可能な状態になっていること');

    // 解約する
    await contractCancelPage.cancel();
    await page.waitForTimeout(1000);
  }

  /**
   * STEP7 No.1,3,15,25-30,37-40
   *//*
  it("利用登録（販売店コードあり、販売担当者あり）", async function () {
    await register(config.company2.user, true, true);
  });*/
  
  /**
   * STEP7 No.1,3,15,25-30,47-50
   */
  it("利用登録（販売店コードなし、販売担当者なし）", async function () {
    await register(config.company2.user02, false, false);
  });

  /**
   * STEP7 No.31,41
   *//*
  it("解約（販売店コードあり、販売担当者あり）", async function () {
    await cancel(config.company2.user);
  });*/

  /**
   * STEP7 No.31,51
   *//*
  it("解約（販売店コードなし、販売担当者なし）", async function () {
    await cancel(config.company2.user02);
  });*/
});
