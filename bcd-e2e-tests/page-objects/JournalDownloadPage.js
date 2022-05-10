const { ActionUtils } = require('../utils/action-utils');

// 仕訳情報ダウンロード
class JournalDownloadPage {

  // コンストラクタ
  constructor(browser, page) {
    this.browser = browser;
    this.page = page;
    this.actionUtils = new ActionUtils(browser, page);
  }

  // ページが表示されるまで待機する
  async waitForLoading() {
    let frame = await this.actionUtils.waitForLoading('//*[@class="hero-body-noImage"]/*[contains(text(),"仕訳情報ダウンロード")]')
    this.frame = frame;
    return frame;
  }

  // 条件絞り込みへ条件を入力する
  async inputConditions(invoiceNo, minIssuedate, maxIssuedate, sendTo) {
    if (invoiceNo) {
      await this.actionUtils.fill(this.frame, '#invoiceNumber', invoiceNo);
    }
    await this.actionUtils.fill(this.frame, '#minIssuedate', minIssuedate);
    await this.actionUtils.fill(this.frame, '#maxIssuedate', maxIssuedate);
    if (sendTo) {
      await this.actionUtils.fill(this.frame, '#sendTo', sendTo);
      await this.actionUtils.click(this.frame, '#sendToSearchBtn');
      await this.actionUtils.waitForLoading('//div[@id="searchResultBox"]//input');
      await this.actionUtils.click(this.frame, '#allSelectSentToBtn');
    }
  }

  // 「CSVダウンロード」をクリックする
  async download() {
    return await this.actionUtils.downloadFile(this.frame, '#submit');
  }
}
exports.JournalDownloadPage = JournalDownloadPage;
