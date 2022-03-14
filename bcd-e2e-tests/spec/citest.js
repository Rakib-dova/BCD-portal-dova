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
const { parse } = require('csv-parse/sync');
// const { stringify } = require('csv-stringify/sync');

const common = require('./common');
const { ActionUtils } = require('../utils/action-utils');

let browser;

webdriverUtils.setReporter();

describe('CI TEST', function () {

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

  it("CI TEST", async function () {
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
    const { loginPage, topPage, tradeShiftTopPage, supportMenuPage, uploadInvoiceMenuPage, uploadInvoicePage, uploadFormatTopPage, uploadFormatCreatePage, uploadFormatSettingPage, uploadFormatConfirmPage }
      = common.getPageObject(browser, page);

    // 指定したURLに遷移する
    await page.goto(config.baseUrl);
    expect('AAA').to.equal('意図的にエラー', 'アップロードフォーマット一覧ページに遷移すること');
/*
    // ログインを行う
    await loginPage.doLogin('hikita-toshiyuki+ci@webrage.jp', 'Hr(5ER,s#Wx%');
    await tradeShiftTopPage.waitForLoading();

    // デジタルトレードアプリをクリックする
    await tradeShiftTopPage.clickBcdApp();
    await topPage.waitForLoading();

    // 請求書一括作成メニューを表示する
    await topPage.openUploadInvoiceMenu();
    await uploadInvoiceMenuPage.waitForLoading();

    // 請求書アップロードフォーマット一覧ページに遷移する
    await uploadInvoiceMenuPage.clickUploadFormat();
    await uploadFormatTopPage.waitForLoading();
    expect(await uploadFormatTopPage.getTitle()).to.equal('アップロードフォーマット一覧', 'アップロードフォーマット一覧ページに遷移すること');
    expect(await uploadFormatTopPage.getTitle()).to.equal('意図的にエラー', 'アップロードフォーマット一覧ページに遷移すること');
*/
  });
});
