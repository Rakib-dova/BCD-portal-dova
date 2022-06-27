const { ActionUtils } = require('../utils/action-utils');
const comment = require('../utils/chai-with-reporting').comment;

// 仕訳情報ダウンロード
class JournalDownloadPage {
  title = '仕訳情報ダウンロード';

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
    let frame = await this.actionUtils.waitForLoading('//*[@class="hero-body-noImage"]/*[contains(text(),"仕訳情報ダウンロード")]')
    this.frame = frame;
    return frame;
  }

  // 条件絞り込みへ条件を入力する
  async inputConditions(invoiceNo, minIssuedate, maxIssuedate, sendTo, wasApproved) {
    if (invoiceNo) {
      await this.addComment('「請求書番号」にて、"' + invoiceNo + '"と入力する');
      await this.actionUtils.fill(this.frame, '#invoiceNumber', invoiceNo);
    }
    await this.addComment('「発行日」にて、"' + minIssuedate + '～' + maxIssuedate + '"と入力する');
    await this.actionUtils.fill(this.frame, '#minIssuedate', minIssuedate);
    await this.actionUtils.fill(this.frame, '#maxIssuedate', maxIssuedate);
    if (sendTo) {
      await this.addComment('「送信企業」にて、"' + sendTo + '"と入力する');
      await this.actionUtils.fill(this.frame, '#sendTo', sendTo);
      await this.addComment('「送信企業」にて、「検索」をクリックする');
      await this.actionUtils.click(this.frame, '#sendToSearchBtn');
      await this.actionUtils.waitForLoading('//div[@id="searchResultBox"]//input');
      await this.addComment('「送信企業」にて、「全選択」をクリックする');
      await this.actionUtils.click(this.frame, '#allSelectSentToBtn');
    }
    if(!wasApproved) {
      await this.addComment('「ダウンロード対象」にて、「仕訳済みの請求書」をクリックする');
      await this.actionUtils.click(this.frame, '#noneFinalapproval');
    }
  }

  // 「CSVダウンロード」をクリックする
  async download() {
    await this.addComment('「CSVダウンロード」をクリックする');
    return await this.actionUtils.downloadFile(this.frame, '#submit');
  }
}
exports.JournalDownloadPage = JournalDownloadPage;
