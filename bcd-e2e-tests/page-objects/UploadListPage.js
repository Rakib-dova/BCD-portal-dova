const { ActionUtils } = require('../utils/action-utils');
class UploadListPage {

  constructor(browser, page) {
    this.browser = browser;
    this.page = page;
    this.actionUtils = new ActionUtils(browser, page);
  }

  // ページが表示されるまで待機する
  async waitForLoading() {
    let frame = await this.actionUtils.waitForLoading('"UPLOAD LIST"')
    this.frame = frame;
    return frame;
  }

  // タイトルを取得する
  async getTitle() {
    return await this.actionUtils.getText(this.frame, 'section .title');
  }

  // 取り込み結果を取得する
  async getResults(row) {
    return await this.actionUtils.getTexts(this.frame, `//*[contains(@class,"box")]//tbody/tr[${row}]/td`);
  }

  // 詳細ページに遷移する
  async moveDetailPage(row) {
    await this.actionUtils.click(this.frame, `//*[contains(@class,"box")]//tbody/tr[${row}]//button`);
  }

  // トップに戻る
  async moveTop() {
    await this.actionUtils.click(this.frame, '.navbar a')
  }
}
exports.UploadListPage = UploadListPage;
