const { ActionUtils } = require('../utils/action-utils');
class TradeShiftTopPage {

  constructor(browser, page) {
    this.browser = browser;
    this.page = page;
    this.actionUtils = new ActionUtils(browser, page);
  }

  // ページが表示されるまで待機する
  async waitForLoading() {
    await this.actionUtils.waitForLoading('"文書"')
  }

  // デジタルトレードアプリをクリックする
  async clickBcdApp(appName) {
    if(await this.actionUtils.isExist(this.page, '//*[contains(@data-tooltip,"' + appName + '")]')) {
      await this.actionUtils.click(this.page, '//*[contains(@data-tooltip,"' + appName + '")]');
      await this.page.mouse.move(0, 100); // tooltipを消す
    } else {
      await this.actionUtils.click(this.page, '//*[contains(@data-tooltip,"すべてのアプリ")]');
      await this.actionUtils.waitForLoading('//span[contains(text(), "' + appName + '")]');
      await this.actionUtils.click(this.page, '//span[contains(text(), "' + appName + '")]');
    }
  }

  // ログアウトする
  async logout() {
    await this.actionUtils.click(this.page, '//div[contains(@class, "userimage-icon")]');
    await this.page.waitForTimeout(500);
    await this.actionUtils.click(this.page, '//span[contains(text(), "ログアウト")]');
  }
}
exports.TradeShiftTopPage = TradeShiftTopPage;
