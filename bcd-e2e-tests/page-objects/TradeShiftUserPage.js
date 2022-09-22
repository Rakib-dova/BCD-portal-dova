const { ActionUtils } = require('../utils/action-utils');
const comment = require('../utils/chai-with-reporting').comment;

// トレードシフト ユーザー設定ページ
class TradeShiftUserPage {
  title = 'トレードシフトユーザー設定';

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
    let frame = await this.actionUtils.waitForLoading('#edit', '#legacy-frame');
    this.frame = frame;
    return frame;
  }

  // ユーザーの姓・名を変更する
  async editName(first, family) {
    await this.actionUtils.fill(this.frame, '#firstName', first);
    await this.actionUtils.fill(this.frame, '#lastName', family);
    await this.actionUtils.click(this.frame, '#edit');
    await this.actionUtils.waitForLoading('//span[contains(text(), "アカウント情報が更新されました。")]');
    await this.page.waitForTimeout(3000);
  }
}
exports.TradeShiftUserPage = TradeShiftUserPage;
