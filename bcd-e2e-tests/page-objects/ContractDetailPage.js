const { ActionUtils } = require('../utils/action-utils');
const comment = require('../utils/chai-with-reporting').comment;

// ご契約内容
class ContractDetailPage {
  title = 'ご契約内容';

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
    let frame = await this.actionUtils.waitForLoading(`//*[@id="form"]//h2[text()="${this.title}"]`);
    this.frame = frame;
    return frame;
  }

  // ホームへ遷移する
  async clickHome() {
    await this.addComment('「Home」をクリックする');
    await this.actionUtils.click(this.frame, '//*[contains(text(), "Home")]');
  }

  // タイトルを取得する
  async getTitle() {
    return await this.actionUtils.getText(this.frame, 'section .title')
  }

  // 契約中のプランを取得する
  async getPlan() {
    return await this.actionUtils.getText(this.frame, '//form//button[contains(@class, "is-danger")]/../../td/div/span');
  }

  // ステータスを取得する
  async getStatus(planName) {
    return await this.actionUtils.getText(this.frame, `//span[contains(text(), "${planName}")]/../../../td/span[contains(@class, "btn-status")]`);
  }

  // 契約番号を取得する
  async getContractNo(planName) {
    return await this.actionUtils.getText(this.frame, `//span[contains(text(), "${planName}")]/../../../td[3]`);
  }

  // 契約変更を行う
  async clickChange(planName) {
    await this.addComment(`${planName}の「契約変更」をクリックする`);
    await this.actionUtils.click(this.frame, `//span[contains(text(), "${planName}")]/../../../td/button[contains(text(), "契約変更")]`);
  }

  // 解約申請を行う
  async clickCancel(planName) {
    await this.addComment(`${planName}の「解約申請」をクリックする`);
    await this.actionUtils.click(this.frame, `//span[contains(text(), "${planName}")]/../../../td/button[contains(text(), "解約申請")]`);
  }

  // 解約申請ボタンが非活性状態か
  async isCancelDisabled(planName) {
    return await this.actionUtils.isDisabled(this.frame, `//span[contains(text(), "${planName}")]/../../../td/button[contains(text(), "解約申請")]`);
  }
}
exports.ContractDetailPage = ContractDetailPage;
