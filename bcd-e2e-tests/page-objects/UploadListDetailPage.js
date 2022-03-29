const { ActionUtils } = require('../utils/action-utils');
class UploadListDetailPage {

  constructor(browser, page) {
    this.browser = browser;
    this.page = page;
    this.actionUtils = new ActionUtils(browser, page);
  }

  // ページが表示されるまで待機する
  async waitForLoading() {
    let frame = await this.actionUtils.waitForLoading('"取込結果詳細"')
    this.frame = frame;
    return frame;
  }

  // タイトルを取得する
  async getTitle() {
    return await this.actionUtils.getText(this.frame, '.modal-card-title');
  }

  // 全体の取り込み件数を取得する
  async getSummaryResults() {
    return await this.actionUtils.getTexts(this.frame, '//*[@id="detailsModalBody"]//table[1]//td');
  }

  // 選択されているタブを取得する
  async getActiveTab() {
    return await this.actionUtils.getText(this.frame, '#tabs .tab-selected');
  }

  // タブを選択する
  async clickTab(tabName) {
    await this.actionUtils.click(this.frame, `//*[@id="tabs"]//button[text()="${tabName}"]`);
  }

  // 詳細結果を取得する
  async getAllResults() {
    return await this.actionUtils.getTexts(this.frame, '//*[@id="resultDetail"]/tr[not(contains(@class,"is-invisible"))]/td');
  }

  // ダイアログを閉じる
  async closeDialog() {
    await this.actionUtils.click(this.frame, '"閉じる"');
  }

}
exports.UploadListDetailPage = UploadListDetailPage;
