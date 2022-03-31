const { ActionUtils } = require('../utils/action-utils');
class UploadInvoiceMenuPage {

  constructor(browser, page) {
    this.browser = browser;
    this.page = page;
    this.actionUtils = new ActionUtils(browser, page);
  }

  // ページが表示されるまで待機する
  async waitForLoading() {
    let frame = await this.actionUtils.waitForLoading('//*[@id="csvupload-modal"]//*[contains(text(),"アップロード用請求書フォーマットcsvダウンロード")]')
    this.frame = frame;
    return frame;
  }

  // メニュー項目を取得する
  async getMenuTexts() {
    return await this.actionUtils.getTexts(this.frame, '#csvupload-modal a p');
  }

  // 請求書一括作成ページに遷移する
  async clickUploadInvoice() {
    await this.actionUtils.click(this.frame, '//*[@id="csvupload-modal"]//section//*[contains(text(),"請求書一括作成")]')
  }

  // 請求書アップロードフォーマット一覧ページに遷移する
  async clickUploadFormat() {
    await this.actionUtils.click(this.frame, '//*[@id="csvupload-modal"]//*[contains(text(),"請求書アップロードフォーマット一覧")]');
  }

  // アップロード用請求書フォーマットcsvをダウンロードする
  async downloadFormatTemplate() {
    return await this.actionUtils.downloadFile(this.frame, '//*[@id="csvupload-modal"]//*[contains(text(),"アップロード用請求書フォーマットcsvダウンロード")]/..')
  }

  // 操作マニュアルをダウンロードする
  async downloadManual() {
    return await this.actionUtils.downloadFile(this.frame, '//*[@id="csvupload-modal"]//*[contains(text(),"操作マニュアルダウンロード")]/..')
  }
}
exports.UploadInvoiceMenuPage = UploadInvoiceMenuPage;
