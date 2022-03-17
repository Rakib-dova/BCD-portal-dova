const { chromium, firefox } = require('playwright');
const webdriverUtils = require('../utils/webdriver-utils');

const chai = require('chai');
const chaiWithReporting = require('../utils/chai-with-reporting').chaiWithReporting;

chai.use(chaiWithReporting);
const expect = chai.expect;

const config = require('../autotest-script-config');

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
    global.reporter.setBrowserInfo(browser, page);

    // 指定したURLに遷移する
    await page.goto(config.baseUrl);
    expect('意図的に成功').to.equal('意図的に成功', '成功ケース');
    expect('AAA').to.equal('意図的に失敗', '失敗ケース');
  });
});
