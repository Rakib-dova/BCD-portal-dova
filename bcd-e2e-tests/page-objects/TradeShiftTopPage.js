const { ActionUtils } = require('../utils/action-utils');
const comment = require('../utils/chai-with-reporting').comment;

// トレードシフト トップページ
class TradeShiftTopPage {
  title = 'トレードシフトトップ';

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
    await this.actionUtils.waitForLoading('"文書"');
  }

  // アプリをクリックする
  async clickBcdApp(appName) {
    this.addComment(`「${appName}」アイコンをクリックする`);
    if(await this.actionUtils.isExist(this.page, `//*[contains(@data-tooltip,"${appName}")]`)) {
      await this.actionUtils.click(this.page, `//*[contains(@data-tooltip,"${appName}")]`);
      await this.page.mouse.move(0, 100); // tooltipを消す
    } else {
      await this.actionUtils.click(this.page, '//*[contains(@data-tooltip,"すべてのアプリ")]');
      await this.actionUtils.waitForLoading(`//span[contains(text(), "${appName}")]`);
      await this.actionUtils.click(this.page, `//span[contains(text(), "${appName}")]`);
    }
  }

  // ユーザーの姓・名を変更する
  async editUser() {
    this.addComment('ユーザー設定を行う');
    await this.actionUtils.click(this.page, '//div[contains(@class, "userimage-icon")]');
    await this.page.waitForTimeout(500);
    await this.actionUtils.click(this.page, '//span[contains(text(), "ユーザー設定")]');
  }

  // ログアウトする
  async logout() {
    this.addComment('ログアウトする');
    await this.actionUtils.click(this.page, '//div[contains(@class, "userimage-icon")]');
    await this.page.waitForTimeout(500);
    await this.actionUtils.click(this.page, '//span[contains(text(), "ログアウト")]');
  }
}
exports.TradeShiftTopPage = TradeShiftTopPage;
