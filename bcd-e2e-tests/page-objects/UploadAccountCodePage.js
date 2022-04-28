const { ActionUtils } = require('../utils/action-utils');

// 勘定科目一括作成
class UploadAccountCodePage {

  // コンストラクタ
  constructor(browser, page) {
    this.browser = browser;
    this.page = page;
    this.actionUtils = new ActionUtils(browser, page);
  }

  // ページが表示されるまで待機する
  async waitForLoading() {
    let frame = await this.actionUtils.waitForLoading('//*[@class="hero-body-noImage"]/*[contains(text(),"勘定科目一括作成")]')
    this.frame = frame;
    return frame;
  }

  // アップロード用CSVファイルをダウンロードする
  async downloadCsv() {    
    return await this.actionUtils.downloadFile(this.frame, '//a[contains(text(),"アップロード用CSVファイルダウンロード")]');
  }

  // 勘定科目CSVファイルをアップロードする
  async uploadCsv(csvPath) {
    await this.actionUtils.uploadFile(this.frame, '//input[@name="bulkAccountCode"]', csvPath);
    await this.actionUtils.click(this.frame, '//a[contains(text(), "アップロード開始")]');
  }
}
exports.UploadAccountCodePage = UploadAccountCodePage;
