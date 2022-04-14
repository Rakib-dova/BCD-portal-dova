const { ActionUtils } = require('../utils/action-utils');
class SupportMenuPage {

  constructor(browser, page) {
    this.browser = browser;
    this.page = page;
    this.actionUtils = new ActionUtils(browser, page);
  }

  // ページが表示されるまで待機する
  async waitForLoading() {
    let frame = await this.actionUtils.waitForLoading('"設定方法、ご利用方法のお問い合わせ"')
    this.frame = frame;
    return frame;
  }

  // 「よくある質問（日本語）を参照する」をクリックして、リンク先URLを取得する
  async getFaqLinkUrl() {
    let url = await this.actionUtils.openNewTabAndGetUrl(this.frame, '"よくある質問（日本語）を参照する"');
    await this.frame.waitForTimeout(1000);
    return url;
  }

  //「設定方法、ご利用方法のお問い合わせ」をクリックする
  async clickContact() {
    await this.actionUtils.click(this.frame, '"設定方法、ご利用方法のお問い合わせ"')
  }

  // メニューを閉じる
  async closeMenu() {
    await this.actionUtils.click(this.frame, '#support-modal .delete')
    await this.frame.waitForTimeout(1000);
  }

  // -----------------------「設定方法、ご利用方法のお問い合わせ」--------------------------------------------
  // N番を取得する
  async getNumberN() {
    return await this.actionUtils.getValue(this.frame, '#numberN');
  }

  // フォーム右側に「copy」ボタンが表示されているか
  async isCopyExist() {
    return (await this.actionUtils.getText(this.frame, '#copy-btn')).trim() == 'Copy';
  }

  //「お問い合わせページを開く」ボタンが表示されているか
  async isContactLinkExist() {
    return (await this.actionUtils.getText(this.frame, '//*[@id="numberN"]/../../../a')) == 'お問い合わせページを開く'
  }

  // 「お問い合わせページを開く」をクリックして、リンク先URLを取得する
  async getContactLinkUrl() {
    return await this.actionUtils.openNewTabAndGetUrl(this.frame, '"お問い合わせページを開く"');
  }

  // 「設定方法、ご利用方法のお問い合わせ」を閉じる
  async closeContact() {
    await this.actionUtils.click(this.frame, '#support-confirmation-modal .delete')
    await this.frame.waitForTimeout(1000);
  }

}
exports.SupportMenuPage = SupportMenuPage;
