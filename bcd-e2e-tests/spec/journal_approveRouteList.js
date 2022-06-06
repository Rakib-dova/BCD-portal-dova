const webdriverUtils = require('../utils/webdriver-utils');
const chai = require('chai');
const chaiWithReporting = require('../utils/chai-with-reporting').chaiWithReporting;
const comment = require('../utils/chai-with-reporting').comment;
const config = require('../autotest-script-config');
const common = require('./common');

const expect = chai.expect;
chai.use(chaiWithReporting);

let browser, accounts, contextOption, page;

webdriverUtils.setReporter();

describe('仕訳情報設定_承認ルート一覧', function () {
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
      accounts = browserInfo.accounts;
      contextOption = browserInfo.contextOption;
    }
  };

  // 承認ルート一覧ページまで遷移する
  async function gotoApproveRouteList(baseUrl, account, loginPage, tradeShiftTopPage, topPage, journalMenuPage, approveRouteListPage) {
    // 指定したURLに遷移する
    await comment('Tradeshiftログインページへ移動する');
    await page.goto(baseUrl);

    // ログインを行う
    await comment('ユーザ"' + account.id + '"でログインする');
    await loginPage.doLogin(account.id, account.password);
    await tradeShiftTopPage.waitForLoading();

    // デジタルトレードアプリをクリックする
    await comment('デジタルトレードアプリのアイコンをクリックする');
    await tradeShiftTopPage.clickBcdApp();
    await topPage.waitForLoading();

    // 仕訳情報管理メニューを開く
    await comment('「仕訳情報管理」をクリックする');
    await topPage.openJournalMenu();
    await journalMenuPage.waitForLoading();

    // 承認ルート一覧ページへ遷移する
    await comment('「承認ルート一覧」をクリックする');
    await journalMenuPage.clickApproveRoute();
    await approveRouteListPage.waitForLoading();
  };

  /**
   * STEP6_No.3
   */
  it("承認ルート登録_承認ルート名入力", async function () {
    // テストの初期化を実施
    await initBrowser();

    // 各アカウントごとにテストを実施
    for (const account of accounts) {
      const context = await browser.newContext(contextOption);
      if (page != null) {
        page.close();
      }
      page = await context.newPage();

      global.reporter.setBrowserInfo(browser, page);
      if (account.type == 'manager') {
        await comment('---------- 管理者アカウント ----------')
      } else if (account.type == 'user') {
        await comment('---------- 一般ユーザー ----------')
        await comment('一般ユーザーは対象外です。')
        continue;
      } else {
        await comment('---------- その他アカウント ----------')
        await comment('その他アカウントは対象外です。')
        continue;
      }

      // ページオブジェクト
      const { loginPage, topPage, tradeShiftTopPage, journalMenuPage, approveRouteListPage, registApproveRoutePage }
        = common.getPageObject(browser, page);

      // 承認ルート一覧ページへ遷移する
      await gotoApproveRouteList(config.baseUrl, account, loginPage, tradeShiftTopPage, topPage, journalMenuPage, approveRouteListPage);

      // 承認ルート登録ページへ遷移する
      await comment('「新規登録する」をクリックする');
      await approveRouteListPage.clickRegist();
      await registApproveRoutePage.waitForLoading();

      // 承認ルート名を入力する
      let routeName = '承認ルートﾃｽﾄ123456789abcdefghijklmnopqrstuvw';
      await comment('「承認ルート名」へ"' + routeName + '"と入力する');
      await registApproveRoutePage.inputName(routeName);

      // 最終承認者を入力する
      await comment('最終承認者の「検索」をクリックする');
      await registApproveRoutePage.clickBtnSearch(1);
      await comment('検索条件を入力せずに「検索」をクリックする');
      await registApproveRoutePage.searchAuthorizer(null, null, null);
      await comment('検索結果の先頭行をクリックする');
      await registApproveRoutePage.selectAuthorizer();

      // 承認ルートを登録する
      await comment('「確認」をクリックする');
      await registApproveRoutePage.clickConfirm();

      // 確認画面にて入力した値が表示されていること
      expect(await registApproveRoutePage.getRouteNameOnConfirm()).to.equal(routeName, '確認画面にて入力した値が表示されていること');
    }
  });

  /**
   * STEP6_No.9,11,15,16
   */
  it("承認ルート登録_承認者選択", async function () {
    // テストの初期化を実施
    await initBrowser();

    // 各アカウントごとにテストを実施
    for (const account of accounts) {
      const context = await browser.newContext(contextOption);
      if (page != null) {
        page.close();
      }
      page = await context.newPage();

      global.reporter.setBrowserInfo(browser, page);
      if (account.type == 'manager') {
        await comment('---------- 管理者アカウント ----------')
      } else if (account.type == 'user') {
        await comment('---------- 一般ユーザー ----------')
        await comment('一般ユーザーは対象外です。')
        continue;
      } else {
        await comment('---------- その他アカウント ----------')
        await comment('その他アカウントは対象外です。')
        continue;
      }

      // ページオブジェクト
      const { loginPage, topPage, tradeShiftTopPage, journalMenuPage, approveRouteListPage, registApproveRoutePage }
        = common.getPageObject(browser, page);

      // 承認ルート一覧ページへ遷移する
      await gotoApproveRouteList(config.baseUrl, account, loginPage, tradeShiftTopPage,
        topPage, journalMenuPage, approveRouteListPage);

      // 承認ルート登録ページへ遷移する
      await comment('「新規登録する」をクリックする');
      await approveRouteListPage.clickRegist();
      await registApproveRoutePage.waitForLoading();

      // 最終承認者を検索する
      let authorizer = config.company1.mng;
      await comment('最終承認者の「検索」をクリックする');
      await registApproveRoutePage.clickBtnSearch(1);
      await comment(
        '承認者名（姓）へ"' + authorizer.family
        + '"と、承認者名（名）へ"' + authorizer.first
        + '"と、メールアドレスへ"' + authorizer.id + '"と入力し、「検索」をクリックする');
      await registApproveRoutePage.searchAuthorizer(authorizer.family, authorizer.first, authorizer.id);

      // 対象のアカウントが表示されること
      let users = await registApproveRoutePage.getUsersOnResult();
      isCorrect = users.length > 0;
      for (i = 0; i < users.length; i++) {
        if (!users[i].mail.includes(authorizer.id)
          || !users[i].name.includes(authorizer.first)
          || !users[i].name.includes(authorizer.family)) {
          isCorrect = false;
          break;
        }
      }
      expect(isCorrect).to.equal(true, '対象のアカウントが検索結果に表示されること');

      await comment('検索結果の先頭行をクリックする');
      await registApproveRoutePage.selectAuthorizer();

      // 担当者行の担当者とメールアドレスが画面に反映されていること
      users = await registApproveRoutePage.getUsers();
      expect(users[0].name).to.equal(authorizer.first + ' ' + authorizer.family, '承認者名が反映されること');
      expect(users[0].mail).to.equal(authorizer.id, 'メールアドレスが反映されること');

      // 承認者を追加する
      await comment('「承認者追加」を11回クリックする');
      for(i = 0 ; i < 11; i++) {
        await registApproveRoutePage.addAuthorizer();
      }

      // 10件まで承認者設定行が追加されること
      users = await registApproveRoutePage.getUsers();
      expect(users.length).to.equal(11, '10件まで承認者設定行が追加されること');
      await page.waitForTimeout(1000);
    }
  });
  
  async function setAuthorizers(authorizers) {
    // テストの初期化を実施
    await initBrowser();

    // 各アカウントごとにテストを実施
    for (const account of accounts) {
      const context = await browser.newContext(contextOption);
      if (page != null) {
        page.close();
      }
      page = await context.newPage();

      global.reporter.setBrowserInfo(browser, page);
      if (account.type == 'manager') {
        await comment('---------- 管理者アカウント ----------')
      } else if (account.type == 'user') {
        await comment('---------- 一般ユーザー ----------')
        await comment('一般ユーザーは対象外です。')
        continue;
      } else {
        await comment('---------- その他アカウント ----------')
        await comment('その他アカウントは対象外です。')
        continue;
      }

      // ページオブジェクト
      const { loginPage, topPage, tradeShiftTopPage, journalMenuPage, approveRouteListPage, registApproveRoutePage }
        = common.getPageObject(browser, page);

      // 承認ルート一覧ページへ遷移する
      await gotoApproveRouteList(config.baseUrl, account, loginPage, tradeShiftTopPage, topPage, journalMenuPage, approveRouteListPage);

      // 承認ルート登録ページへ遷移する
      await comment('「新規登録する」をクリックする');
      await approveRouteListPage.clickRegist();
      await registApproveRoutePage.waitForLoading();

      // 承認ルート名を入力する
      let routeName = '承認ルートテスト';
      await registApproveRoutePage.inputName(routeName);

      // 承認者を選択する
      for (i = 0; i < authorizers.length; i++) {
        if (i < authorizers.length - 1) {
          await comment(authorizers[i].family + ' ' + authorizers[i].first + 'を' + (i + 1) + '次承認者に設定する');
          await registApproveRoutePage.addAuthorizer();
        } else {
          await comment(authorizers[i].family + ' ' + authorizers[i].first + 'を最終承認者に設定する');
        }
        await registApproveRoutePage.clickBtnSearch(i + 1);
        await registApproveRoutePage.searchAuthorizer(authorizers[i].family, authorizers[i].first, null);
        await registApproveRoutePage.selectAuthorizer();
      }

      // 承認ルートを登録する
      await comment('「確認」をクリックする');
      await registApproveRoutePage.clickConfirm();

      // 確認ポップアップにて、承認ルートが表示されること
      let users = await registApproveRoutePage.getUsersOnConfirm();
      for (i = 0; i < authorizers.length; i++) {
        let nameMessage = (i < authorizers.length - 1 ? (i + 1) + '次' : '最終') + '承認者が"' + authorizers[i].family + ' ' + authorizers[i].first + '"であること';
        expect(users[i].name).to.equal(authorizers[i].first + ' ' + authorizers[i].family, nameMessage);
      }
      await page.waitForTimeout(1000);
    }
  };
  
  /**
   * STEP6_No.17
   */
  it("承認ルート登録_承認者選択（1次承認、最終承認）", async function () {
    let users = [
      config.company1.user02,
      config.company1.mng
    ];
    await setAuthorizers(users);
  });
  
  /**
   * STEP6_No.26
   */
  it("承認ルート登録_承認者選択（1～10次承認、最終承認）", async function () {
    let users = [
      config.company1.user02,
      config.company1.user03,
      config.company1.user04,
      config.company1.user05,
      config.company1.user06,
      config.company1.user07,
      config.company1.user08,
      config.company1.user09,
      config.company1.user10,
      config.company1.user11,
      config.company1.mng
    ];
    await setAuthorizers(users);
  });
  
  /**
   * STEP6_No.32
   */
  it("承認ルート登録_戻る", async function () {
    // テストの初期化を実施
    await initBrowser();

    // 各アカウントごとにテストを実施
    for (const account of accounts) {
      const context = await browser.newContext(contextOption);
      if (page != null) {
        page.close();
      }
      page = await context.newPage();

      global.reporter.setBrowserInfo(browser, page);
      if (account.type == 'manager') {
        await comment('---------- 管理者アカウント ----------')
      } else if (account.type == 'user') {
        await comment('---------- 一般ユーザー ----------')
        await comment('一般ユーザーは対象外です。')
        continue;
      } else {
        await comment('---------- その他アカウント ----------')
        await comment('その他アカウントは対象外です。')
        continue;
      }

      // ページオブジェクト
      const { loginPage, topPage, tradeShiftTopPage, journalMenuPage, approveRouteListPage, registApproveRoutePage }
        = common.getPageObject(browser, page);

      // 承認ルート一覧ページへ遷移する
      await gotoApproveRouteList(config.baseUrl, account, loginPage, tradeShiftTopPage, topPage, journalMenuPage, approveRouteListPage);

      // 承認ルート登録ページへ遷移する
      await comment('「新規登録する」をクリックする');
      await approveRouteListPage.clickRegist();
      await registApproveRoutePage.waitForLoading();

      // 「戻る」をクリックする
      await comment('「戻る」をクリックする');
      await registApproveRoutePage.clickBack();
      await approveRouteListPage.waitForLoading();

      // 承認ルート一覧画面に遷移すること
      expect(await approveRouteListPage.getPageTitle()).to.equal('承認ルート一覧', '承認ルート一覧画面に遷移すること');
      await page.waitForTimeout(1000);
    }
  });
  
  /**
   * STEP6_No.346
   */
  it("承認ルート一覧_Homeへ戻る", async function () {
    // テストの初期化を実施
    await initBrowser();

    // 各アカウントごとにテストを実施
    for (const account of accounts) {
      const context = await browser.newContext(contextOption);
      if (page != null) {
        page.close();
      }
      page = await context.newPage();

      global.reporter.setBrowserInfo(browser, page);
      if (account.type == 'manager') {
        await comment('---------- 管理者アカウント ----------')
      } else if (account.type == 'user') {
        await comment('---------- 一般ユーザー ----------')
        await comment('一般ユーザーは対象外です。')
        continue;
      } else {
        await comment('---------- その他アカウント ----------')
        await comment('その他アカウントは対象外です。')
        continue;
      }

      // ページオブジェクト
      const { loginPage, topPage, tradeShiftTopPage, journalMenuPage, approveRouteListPage }
        = common.getPageObject(browser, page);

      // 承認ルート一覧ページへ遷移する
      await gotoApproveRouteList(config.baseUrl, account, loginPage, tradeShiftTopPage, topPage, journalMenuPage, approveRouteListPage);

      // 「Homeへ戻る」をクリックする
      await approveRouteListPage.clickHome();
      await topPage.waitForLoading();

      // Home画面に遷移すること
      expect(await topPage.getInformationTab()).to.equal('お知らせ', 'Home画面に遷移すること');
      await page.waitForTimeout(1000);
    }
  });

  /**
   * STEP6_No.260,261,262,275-278,285,287
   */
  it("承認ルート登録・削除", async function () {
    // テストの初期化を実施
    await initBrowser();

    // 各アカウントごとにテストを実施
    for (const account of accounts) {
      const context = await browser.newContext(contextOption);
      if (page != null) {
        page.close();
      }
      page = await context.newPage();

      global.reporter.setBrowserInfo(browser, page);
      if (account.type == 'manager') {
        await comment('---------- 管理者アカウント ----------')
      } else if (account.type == 'user') {
        await comment('---------- 一般ユーザー ----------')
        await comment('一般ユーザーは対象外です。')
        continue;
      } else {
        await comment('---------- その他アカウント ----------')
        await comment('その他アカウントは対象外です。')
        continue;
      }

      // ページオブジェクト
      const { loginPage, topPage, tradeShiftTopPage, journalMenuPage, approveRouteListPage, registApproveRoutePage }
        = common.getPageObject(browser, page);

      // 承認ルート一覧ページへ遷移する
      await gotoApproveRouteList(config.baseUrl, account, loginPage, tradeShiftTopPage, topPage, journalMenuPage, approveRouteListPage);

      // 「現在、承認ルートはありません。新規登録するボタンから登録を行ってください。」と表示されていること
      expect(await approveRouteListPage.getNodataMessage()).to.equal('現在、承認ルートはありません。', '「現在、承認ルートはありません。新規登録するボタンから登録を行ってください。」と表示されていること');

      // 承認ルート登録ページへ遷移する
      await comment('「新規登録する」をクリックする');
      await approveRouteListPage.clickRegist();
      await registApproveRoutePage.waitForLoading();

      // 承認ルート名を入力する
      let routeName = '承認ルートテスト';
      await registApproveRoutePage.inputName(routeName);

      // 承認者を選択する
      let users = [
        config.company1.user02,
        config.company1.user
      ];
      for (i = 0; i < users.length; i++) {
        if (i < users.length - 1) {
          await comment(users[i].family + ' ' + users[i].first + 'を' + (i + 1) + '次承認者に設定する');
          await registApproveRoutePage.addAuthorizer();
        } else {
          await comment(users[i].family + ' ' + users[i].first + 'を最終承認者に設定する');
        }
        await registApproveRoutePage.clickBtnSearch(i + 1);
        await registApproveRoutePage.searchAuthorizer(users[i].family, users[i].first, null);
        await registApproveRoutePage.selectAuthorizer();
      }

      // 承認ルートを登録する
      await comment('「確認」をクリックする');
      await registApproveRoutePage.clickConfirm();
      await comment('「登録」をクリックする');
      await registApproveRoutePage.submit();
      await approveRouteListPage.waitPopup();

      // 「承認ルートを登録しました。」と表示されていること
      expect(await approveRouteListPage.getPopupMessage()).to.equal('承認ルートを登録しました。', '「承認ルートを登録しました。」と表示されていること');

      // ポップアップを閉じる
      await comment('ポップアップメッセージを閉じる');
      await approveRouteListPage.closePopup();
      await approveRouteListPage.waitForLoading();

      // 「No.、承認ルート名、登録されている承認者数、確認・変更ボタン、削除ボタン」が表示されていること
      let row = await approveRouteListPage.getRow(routeName);
      expect(row.no).to.equal('1', '承認ルート"' + routeName + '"のNo.が1であること');
      expect(row.authCount).to.equal(users.length.toString(), '承認ルート"' + routeName + '"の承認者数が' + users.length + 'であること');

      // 承認ルートの「確認・変更する」をクリックする
      let rowData = await approveRouteListPage.getRow(routeName);
      await approveRouteListPage.clickEdit(routeName);
      await registApproveRoutePage.waitForLoading();

      // 確認・変更画面に遷移すること
      expect(await registApproveRoutePage.getPageTitle()).to.equal('承認ルート確認・変更', '確認・変更画面に遷移すること');
      expect(await registApproveRoutePage.getName()).to.equal(routeName, '承認ルート名が"' + routeName + '"であること');
      let actualUsers = await registApproveRoutePage.getUsers();
      expect(actualUsers.length.toString()).to.equal(rowData.authCount, '承認者数が"' + rowData.authCount + '"であること');

      // 承認ルート一覧ページへ戻る
      await comment('「戻る」をクリックする');
      await registApproveRoutePage.clickBack();
      await approveRouteListPage.waitForLoading();

      // 承認ルートの「削除」をクリックする
      await approveRouteListPage.deleteRoute(routeName);

      // 「削除しますか？」のポップアップが表示されること
      expect(await approveRouteListPage.getDelMessage()).to.equal('削除しますか？', '「削除しますか？」のポップアップが表示されること');

      // 削除確認ポップアップの「削除」をクリックする
      await approveRouteListPage.deleteOnConfirm();

      // 承認ルートが削除されること
      expect(await approveRouteListPage.hasRow(routeName)).to.equal(false, '承認ルートが削除されること');
      await page.waitForTimeout(1000);
    }
  });
});
