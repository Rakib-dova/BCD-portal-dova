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
  async clickBcdApp() {
    await this.actionUtils.click(this.page, '//*[contains(@data-tooltip,"デジタルトレード")]');
  }

}
exports.TradeShiftTopPage = TradeShiftTopPage;
