const { ActionUtils } = require('../utils/action-utils');
class LoginPage {

  constructor(browser, page) {
    this.browser = browser;
    this.page = page;
    this.actionUtils = new ActionUtils(browser, page);
  }

  // ページが表示されるまで待機する
  async waitForLoading() {
    await this.actionUtils.waitForLoading('//h1[contains(text(), "ログイン")]');
  }

  // ログインを行う
  async doLogin(id, password) {
    await this.page.waitForSelector('#proceed')
    if (await this.actionUtils.isExist(this.page, '#cookie-consent-accept-all')) {
      await this.actionUtils.click(this.page, '#cookie-consent-accept-all');
    }
    await this.actionUtils.fill(this.page, '#j_username', id);
    await this.actionUtils.fill(this.page, '#j_password', password);
    await this.actionUtils.click(this.page, '#proceed');
  }
}
exports.LoginPage = LoginPage;
