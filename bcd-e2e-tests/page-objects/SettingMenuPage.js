const { ActionUtils } = require('../utils/action-utils');
const comment = require('../utils/chai-with-reporting').comment;

// 設定メニュー
class SettingMenuPage {
  title = '設定';

  constructor(browser, page) {
    this.browser = browser;
    this.page = page;
    this.actionUtils = new ActionUtils(browser, page);
  }

  // コメントする
  async addComment(message) {
    await comment('【' + this.title + '】' + message);
  }

  // ページが表示されるまで待機する
  async waitForLoading() {
    let frame = await this.actionUtils.waitForLoading('//*[text()="ご契約内容"]');
    this.frame = frame;
    return frame;
  }

  // ご契約内容ページに遷移する
  async clickContractChange() {
    await this.addComment('「ご契約内容」をクリックする');
    await this.actionUtils.click(this.frame, '//*[text()="ご契約内容"]');
  }

  // ご契約内容ページに遷移する
  async clickBulkUploadUsers() {
    await this.addComment('「ユーザー一括登録」をクリックする');
    await this.actionUtils.click(this.frame, '//*[text()="ユーザー一括登録"]');
  }
}
exports.SettingMenuPage = SettingMenuPage;
