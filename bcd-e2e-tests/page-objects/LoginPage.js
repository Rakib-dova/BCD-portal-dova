const { ActionUtils } = require('../utils/action-utils');
class LoginPage {

  constructor(browser, page) {
    this.browser = browser;
    this.page = page;
    this.actionUtils = new ActionUtils(browser, page);
  }

  // ログインを行う
  async doLogin(id, password) {
    await this.page.waitForSelector('#proceed')
    await this.actionUtils.click(this.page, '#cookie-consent-accept-all');
    await this.actionUtils.type(this.page, '#j_username', id);
    await this.actionUtils.type(this.page, '#j_password', password);
    await this.actionUtils.click(this.page, '#proceed');
  }

}
exports.LoginPage = LoginPage;
