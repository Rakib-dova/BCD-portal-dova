const { ActionUtils } = require('../utils/action-utils');
const comment = require('../utils/chai-with-reporting').comment;

// 勘定科目一括作成
class UploadAccountCodePage {
  title = '勘定科目一括作成';

  // コンストラクタ
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
    let frame = await this.actionUtils.waitForLoading('//*[@class="hero-body-noImage"]/*[contains(text(),"勘定科目一括作成")]')
    this.frame = frame;
    return frame;
  }

  // アップロード用CSVファイルをダウンロードする
  async downloadCsv() {  
    await this.addComment('「アップロード用CSVファイルダウンロード」をクリックする');  
    return await this.actionUtils.downloadFile(this.frame, '//a[contains(text(),"アップロード用CSVファイルダウンロード")]');
  }

  // 勘定科目CSVファイルをアップロードする
  async uploadCsv(csvPath) {
    await this.addComment('ファイル"' + csvPath + '"を選択する');
    await this.actionUtils.uploadFile(this.frame, '//input[@name="bulkAccountCode"]', csvPath);
    await this.addComment('「アップロード開始」をクリックする');
    await this.actionUtils.click(this.frame, '//a[contains(text(), "アップロード開始")]');
  }
}
exports.UploadAccountCodePage = UploadAccountCodePage;
