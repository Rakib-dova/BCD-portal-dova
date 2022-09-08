const { ActionUtils } = require('../utils/action-utils');
const comment = require('../utils/chai-with-reporting').comment;

// ログインページ
class LoginPage {
  title='ログイン';

  constructor(browser, page) {
    this.browser = browser;
    this.page = page;
    this.actionUtils = new ActionUtils(browser, page);
  }

  // コメントする
  async addComment(message) {
    await comment(`【${this.title}】${message}`);
  }

  // ページが表示されるまで待機する
  async waitForLoading() {
    await this.actionUtils.waitForLoading(`//h1[contains(text(), "${this.title}")]`);
  }

  // ログインを行う
  async doLogin(id, password) {
    await this.page.waitForSelector('#proceed')
    if (await this.actionUtils.isExist(this.page, '#cookie-consent-accept-all')) {
      await this.actionUtils.click(this.page, '#cookie-consent-accept-all');
    }
    await this.addComment(`ID"${id}"でログインする`);
    await this.actionUtils.fill(this.page, '#j_username', id);
    await this.actionUtils.fill(this.page, '#j_password', password);
    await this.actionUtils.click(this.page, '#proceed');
  }
}
exports.LoginPage = LoginPage;
