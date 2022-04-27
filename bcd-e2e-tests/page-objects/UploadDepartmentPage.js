const { ActionUtils } = require('../utils/action-utils');

// 部門データ一括作成
class UploadDepartmentPage {

  // コンストラクタ
  constructor(browser, page) {
    this.browser = browser;
    this.page = page;
    this.actionUtils = new ActionUtils(browser, page);
  }

  // ページが表示されるまで待機する
  async waitForLoading() {
    let frame = await this.actionUtils.waitForLoading('//*[@class="hero-body-noImage"]/*[contains(text(),"部門データ一括作成")]')
    this.frame = frame;
    return frame;
  }

  // 部門データCSVファイルをアップロードする
  async uploadCsv(csvPath) {
    await this.actionUtils.uploadFile(this.frame, '//input[@name="bulkDepartmentCode"]', csvPath);
    await this.actionUtils.click(this.frame, '//a[contains(text(), "アップロード開始")]');
  }
}
exports.UploadDepartmentPage = UploadDepartmentPage;
