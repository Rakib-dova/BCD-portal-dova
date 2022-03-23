const { ActionUtils } = require('../utils/action-utils');
class UploadInvoicePage {

  constructor(browser, page) {
    this.browser = browser;
    this.page = page;
    this.actionUtils = new ActionUtils(browser, page);
  }

  // ページが表示されるまで待機する
  async waitForLoading() {
    let frame = await this.actionUtils.waitForLoading('"CSV UPLOAD"')
    this.frame = frame;
    return frame;
  }

  // タイトルを取得する
  async getTitle() {
    return await this.actionUtils.getText(this.frame, '.title');
  }

  // 請求書ファイルをアップロードする
  async uploadInvoiceFile(invoicePath) {
    await this.actionUtils.uploadFile(this.frame, '#file-upload', invoicePath)
  }

  // フォーマット種別の現在の設定値を取得
  async getActiveFormatType() {
    return await this.actionUtils.getText(this.frame, '#start-upload-select [selected]');
  }

  // フォーマット種別の選択肢を取得
  async getFormatTypes() {
    return await this.actionUtils.getTexts(this.frame, '#start-upload-select option');
  }

  // フォーマット種別を設定する
  async setFormatType(formatType) {
    await this.actionUtils.selectByXpath(this.frame, '//*[@id="start-upload-select"]', formatType)
  }

  // 「アップロード開始」ボタンをクリックする
  async clickUploadBtn() {
    let uploadingMsg, uploadFinMsg;
    await this.actionUtils.click(this.frame, '"アップロード開始"')
    uploadingMsg = await this.actionUtils.getText(this.frame, '#modal-card-result');
    const newPromise = new Promise(resolve => {
      this.page.once('dialog', async dialog => {
        uploadFinMsg = dialog.message();
        await dialog.accept('OK');
        resolve();
      });
    });
    await newPromise;
    return { uploadingMsg, uploadFinMsg }
  }

  // 「設定はこちら」リンクをクリックする
  async clickFormatSettingLink() {
    await this.actionUtils.click(this.frame, '"設定はこちら"')
  }

  // 「取込結果一覧」ボタンをクリックする
  async moveUploadListPage() {
    await this.actionUtils.click(this.frame, '//*[contains(text(),"取込結果一覧")]')
  }

  // トップに戻る
  async moveTop() {
    await this.actionUtils.click(this.frame, '.navbar a')
  }
}
exports.UploadInvoicePage = UploadInvoicePage;
