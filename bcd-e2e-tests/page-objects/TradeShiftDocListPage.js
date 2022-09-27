const { ActionUtils } = require('../utils/action-utils');
const comment = require('../utils/chai-with-reporting').comment;

// トレードシフト 文書管理ページ
class TradeShiftDocListPage {
  title = 'トレードシフト文書管理';

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
    let frame = await this.actionUtils.waitForLoading('//div[contains(@class, "documents-table")]');
    this.frame = frame;
    return frame;
  }

  // 文書番号がリストにあるか否か
  async hasDocId(docId) {
    return await this.actionUtils.isExist(this.frame, `//td[contains(@class, "documentId")]//a[contains(text(), "${docId}")]`);
  }

  // 文書番号リンクをクリックする
  async clickDocId(docId) {
    await this.addComment(`文書番号"${docId}"をクリックする`);
    await this.actionUtils.click(this.frame, `//td[contains(@class, "documentId")]//a[contains(text(), "${docId}")]`);
  }
}
exports.TradeShiftDocListPage = TradeShiftDocListPage;
