const { ActionUtils } = require('../utils/action-utils');
const comment = require('../utils/chai-with-reporting').comment;

// 契約情報変更
class ContractChangePage {
  title = '契約情報変更';

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

  // タイトルを取得する
  async getTitle() {
    return await this.actionUtils.getText(this.frame, 'section .title')
  }

  // 「戻る」をクリックする
  async back() {
    await this.addComment('「戻る」をクリックする');
    await this.actionUtils.click(this.frame, '#return-btn');
  }
}
exports.ContractChangePage = ContractChangePage;
