const { ActionUtils } = require('../utils/action-utils');
const comment = require('../utils/chai-with-reporting').comment;

// トレードシフト 請求書ページ
class TradeShiftDocDetailPage {
  title = 'トレードシフト請求書';

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
    let frame = await this.actionUtils.waitForLoading('//label[contains(text(), "請求書番号")]', '[name="legacy-frame"]');
    this.frame = frame;
    return frame;
  }

  // 請求書を破棄する
  async delete() {
    await this.addComment('「破棄」をクリックする');
    await this.actionUtils.click(this.frame, '//div[contains(@class, "footer")]//*[contains(@class, "trash")]');
    await this.actionUtils.waitForLoading('#simplemodal-container');
    await this.addComment('「はい」をクリックする');
    await this.actionUtils.click(this.frame, '//div[@id="simplemodal-container"]//span[contains(text(), "はい")]');
  }
}
exports.TradeShiftDocDetailPage = TradeShiftDocDetailPage;
