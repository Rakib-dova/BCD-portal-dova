const { ActionUtils } = require('../utils/action-utils');
class TopPage {

  constructor(browser, page) {
    this.browser = browser;
    this.page = page;
    this.actionUtils = new ActionUtils(browser, page);
  }

  // ページが表示されるまで待機する
  async waitForLoading() {
    let frame = await this.actionUtils.waitForLoading('//*[contains(@class,"box")]//*[text()="請求書一括作成"]')
    this.frame = frame;
    return frame;
  }

  // 「お知らせ」タブを取得する
  async getInformationTab() {
    return await this.actionUtils.getText(this.frame, '#informationTab');
  }

  // 「お知らせ」の「もっと見る」をクリックして、リンク先URLを取得する
  async getInformationLinkUrl() {
    return await this.actionUtils.openNewTabAndGetUrl(this.frame, '//*[@id="informationTab"]//*[contains(text(),"もっと見る")]');
  }

  // 「工事・故障情報」タブをクリックする
  async changeConstructTab() {
    await this.actionUtils.click(this.frame, '#constructTab');
  }

  // 「工事・故障情報」タブが存在するか
  async isConstructTabExist() {
    return await this.actionUtils.isExist(this.frame, '"工事・故障情報"');
  }

  // 「工事・故障情報」タブが有効か
  async isConstructTabActive() {
    return (await this.actionUtils.getAttr(this.frame, '//*[@id="constructTab"]/..', 'class')) == 'is-active';
  }

  // 「工事・故障情報」の「もっと見る」をクリックして、リンク先URLを取得する
  async getConstructLinkUrl() {
    return await this.actionUtils.openNewTabAndGetUrl(this.frame, '//*[@id="constructTab"]//*[contains(text(),"もっと見る")]');
  }

  // 「請求書一括作成」メニューを開く
  async openUploadInvoiceMenu() {
    await this.actionUtils.click(this.frame, '//*[contains(@class,"box")]//*[contains(text(),"請求書一括作成")]');
  }

  // 「請求情報ダウンロード」ページを開く
  async openDownloadInvoicePage() {
    await this.actionUtils.click(this.frame, '//*[contains(@class,"box")]//*[contains(text(),"請求情報ダウンロード")]');
  }

  // 「サポート」メニューを開く
  async openSupportMenu() {
    await this.actionUtils.click(this.frame, '//*[contains(@class,"box")]//*[text()="サポート"]/../../..')
  }

  // 「設定」メニューを開く
  async openSettingMenu() {
    await this.actionUtils.click(this.frame, '//*[contains(@class,"box")]//*[text()="設定"]')
  }

  // 「銀行振込消印」ダイアログを開く
  async openSettlementDialog() {
    await this.actionUtils.click(this.frame, '//*[contains(@class,"box")]//*[text()="銀行振込消込"]')
  }
}
exports.TopPage = TopPage;
