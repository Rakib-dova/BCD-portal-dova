const { ActionUtils } = require('../utils/action-utils');
class ContractChangePage {

  constructor(browser, page) {
    this.browser = browser;
    this.page = page;
    this.actionUtils = new ActionUtils(browser, page);
  }

  // ページが表示されるまで待機する
  async waitForLoading() {
    let frame = await this.actionUtils.waitForLoading('//*[@id="form"]//h2[text()="契約情報変更"]')
    this.frame = frame;
    return frame;
  }

  // タイトルを取得する
  async getTitle() {
    return await this.actionUtils.getText(this.frame, 'section .title')
  }

}
exports.ContractChangePage = ContractChangePage;