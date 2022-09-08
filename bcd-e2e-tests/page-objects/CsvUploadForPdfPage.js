const { ActionUtils } = require('../utils/action-utils');
const comment = require('../utils/chai-with-reporting').comment;

// PDF請求書ドラフト一括作成
class CsvUploadForPdfPage {
  title = 'PDF請求書ドラフト一括作成';

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
    return await this.actionUtils.getText(this.frame, '.title');
  }

  // アップロード用CSVファイルをダウンロードする
  async downloadCsv() {  
    await this.addComment('「アップロード用CSVファイルダウンロード」をクリックする');  
    return await this.actionUtils.downloadFile(this.frame, '//a[contains(text(),"アップロード用CSVファイルダウンロード")]');
  }

  // 作成マニュアルファイルをダウンロードする
  async downloadManual() {  
    await this.addComment('「作成マニュアルダウンロード」をクリックする');  
    return await this.actionUtils.downloadFile(this.frame, '//a[contains(text(), "作成マニュアルダウンロード")]');
  }

  // ファイルを選択する
  async selectFile(csvPath) {
    await this.addComment(`ファイル"${csvPath}"を選択する`);
    await this.actionUtils.uploadFile(this.frame, '//input[@name="fileUpload"]', csvPath);
  }

  // 選択したファイル名を取得する
  async getFileName() {
    return await this.actionUtils.getText(this.frame, '#filename');
  }

  // 勘定科目CSVファイルをアップロードする
  async upload() {
    await this.addComment('「アップロード開始」をクリックする');
    await this.actionUtils.click(this.frame, '//div[contains(text(), "アップロード開始")]');
  }

  // トップに戻る
  async back() {
    await this.actionUtils.click(this.frame, '//a[contains(text(), "PDF請求書一覧")]');
  }
}
exports.CsvUploadForPdfPage = CsvUploadForPdfPage;
