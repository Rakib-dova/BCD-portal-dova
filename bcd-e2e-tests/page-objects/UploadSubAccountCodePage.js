const { ActionUtils } = require('../utils/action-utils');

// 補助科目一括作成
class UploadSubAccountCodePage {

  // コンストラクタ
  constructor(browser, page) {
    this.browser = browser;
    this.page = page;
    this.actionUtils = new ActionUtils(browser, page);
  }

  // ページが表示されるまで待機する
  async waitForLoading() {
    let frame = await this.actionUtils.waitForLoading('//*[@class="hero-body-noImage"]/*[contains(text(),"補助科目一括作成")]')
    this.frame = frame;
    return frame;
  }

  // メニュー項目を取得する
  async getMenuTexts() {
    return await this.actionUtils.getTexts(this.frame, '#registAccountCode-modal a p');
  }

  // アップロード用CSVファイルをダウンロードする
  async downloadCsv() {    
    return await this.actionUtils.downloadFile(this.frame, '//a[contains(text(),"アップロード用CSVファイルダウンロード")]');
  }

  // 補助科目CSVファイルをアップロードする
  async uploadCsv(csvPath) {
    await this.actionUtils.uploadFile(this.frame, '//input[@name="bulkSubAccountCode"]', csvPath);
    await this.actionUtils.click(this.frame, '//a[contains(text(), "アップロード開始")]');
  }
}
exports.UploadSubAccountCodePage = UploadSubAccountCodePage;
