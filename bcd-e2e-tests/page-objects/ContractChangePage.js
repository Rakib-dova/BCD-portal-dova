const { ActionUtils } = require('../utils/action-utils');

// 契約情報変更
class ContractChangePage {

  constructor(browser, page) {
    this.browser = browser;
    this.page = page;
    this.actionUtils = new ActionUtils(browser, page);
  }

  // ページが表示されるまで待機する
  async waitForLoading() {
    let frame = await this.actionUtils.waitForLoading('//*[@id="form"]//h2[text()="ご契約内容"]')
    this.frame = frame;
    return frame;
  }

  // タイトルを取得する
  async getTitle() {
    return await this.actionUtils.getText(this.frame, 'section .title')
  }

  // ステータスを取得する
  async getStatus() {
    return await this.actionUtils.getText(this.frame, '//span[contains(@class, "btn-status")]');
  }

  // 解約申請を行う
  async cancel() {
    await this.actionUtils.click(this.frame, '//button[contains(text(), "解約申請")]');
  }

  // 解約申請ボタンが非活性状態か
  async isCancelDisabled() {
    return await this.actionUtils.isDisabled(this.frame, '//button[contains(text(), "解約申請")]');
  }
}
exports.ContractChangePage = ContractChangePage;
