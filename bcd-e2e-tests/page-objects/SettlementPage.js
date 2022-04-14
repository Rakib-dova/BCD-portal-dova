const { ActionUtils } = require('../utils/action-utils');
class SettlementPage {

  constructor(browser, page) {
    this.browser = browser;
    this.page = page;
    this.actionUtils = new ActionUtils(browser, page);
  }

  // ページが表示されるまで待機する
  async waitForLoading() {
    let frame = await this.actionUtils.waitForLoading('//*[@id="olta-modal-card"]//*[text()="銀行振込消込"]')
    this.frame = frame;
    return frame;
  }

  // 銀行振込消込サービスの紹介文とリンクを取得する
  async getText() {
    return await this.actionUtils.getText(this.frame, '#settlement-modal');
  }

  // お問合せリンクをクリックして、リンク先URLを取得する
  async getContactLinkUrl() {
    return await this.actionUtils.openNewTabAndGetUrl(this.frame, '#settlement-modal a');
  }

  // 「x」ボタンをクリックし、ダイアログを閉じる
  async closeDialog() {
    await this.actionUtils.click(this.frame, '#settlement-modal .delete')
  }
}
exports.SettlementPage = SettlementPage;
