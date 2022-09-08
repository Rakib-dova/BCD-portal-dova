const { ActionUtils } = require('../utils/action-utils');
const comment = require('../utils/chai-with-reporting').comment;

// ユーザー一括登録
class BulkUploadUsersPage {
  title = 'ユーザー一括登録';

  constructor(browser, page) {
    this.browser = browser;
    this.page = page;
    this.actionUtils = new ActionUtils(browser, page);
  }

  // コメントする
  async addComment(message) {
    await comment(`【${this.title}】${message}`);
  }

  // ページが表示されるまで待機する
  async waitForLoading() {
    let frame = await this.actionUtils.waitForLoading(`//*[@class="hero-body-noImage"]/*[contains(text(),"${this.title}")]`);
    this.frame = frame;
    return frame;
  }

  // タイトルを取得する
  async getTitle() {
    return await this.actionUtils.getText(this.frame, 'section .title');
  }

  // サブタイトル（メッセージ）を取得する
  async getSubTitle() {
    return await this.actionUtils.getText(this.frame ? this.frame : this.page, '.subtitle');
  }

  // アップロード用CSVファイルをダウンロードする
  async downloadCsv() {  
    await this.addComment('「アップロード用CSVファイルダウンロード」をクリックする');  
    return await this.actionUtils.downloadFile(this.frame, '//a[contains(text(),"アップロード用CSVファイルダウンロード")]');
  }
}
exports.BulkUploadUsersPage = BulkUploadUsersPage;
