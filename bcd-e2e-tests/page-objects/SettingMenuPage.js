const { ActionUtils } = require('../utils/action-utils');
class SettingMenuPage {

  constructor(browser, page) {
    this.browser = browser;
    this.page = page;
    this.actionUtils = new ActionUtils(browser, page);
  }

  // ページが表示されるまで待機する
  async waitForLoading() {
    let frame = await this.actionUtils.waitForLoading('//*[text()="契約情報変更"]');
    this.frame = frame;
    return frame;
  }

  // 契約情報変更ページに遷移する
  async clickContractChange() {
    await this.actionUtils.click(this.frame, '//*[text()="契約情報変更"]');
  }

  // 解約する
  async clickCancel() {
    await this.actionUtils.click(this.frame, '//*[text()="解約"]');
  }
}
exports.SettingMenuPage = SettingMenuPage;
