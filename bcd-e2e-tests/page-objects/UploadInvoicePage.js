const { ActionUtils } = require('../utils/action-utils');
class UploadInvoicePage {

  constructor(browser, page) {
    this.browser = browser;
    this.page = page;
    this.actionUtils = new ActionUtils(browser, page);
  }

  // ページが表示されるまで待機する
  async waitForLoading() {
    let frame = await this.actionUtils.waitForLoading('"CSV UPLOAD"')
    this.frame = frame;
    return frame;
  }

  // タイトルを取得する
  async getTitle() {
    return await this.actionUtils.getText(this.frame, '.title');
  }

  // トップに戻る
  async moveTop() {
    await this.actionUtils.click(this.frame, '.navbar a')
  }

}
exports.UploadInvoicePage = UploadInvoicePage;
