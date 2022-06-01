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
    if(await this.actionUtils.isExist(this.page, '//*[contains(@data-tooltip,"デジタルトレード")]')) {
      await this.actionUtils.click(this.page, '//*[contains(@data-tooltip,"デジタルトレード")]');
      await this.page.mouse.move(0, 100); // tooltipを消す
    } else {
      await this.actionUtils.click(this.page, '//*[contains(@data-tooltip,"すべてのアプリ")]');
      await this.actionUtils.waitForLoading('//span[contains(text(), "デジタルトレード (prodstg)")]');
      await this.actionUtils.click(this.page, '//span[contains(text(), "デジタルトレード (prodstg)")]');
    }
  }

}
exports.TradeShiftTopPage = TradeShiftTopPage;
