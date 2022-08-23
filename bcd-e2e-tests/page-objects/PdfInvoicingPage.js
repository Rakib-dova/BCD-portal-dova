const { ActionUtils } = require('../utils/action-utils');
const comment = require('../utils/chai-with-reporting').comment;

// PDF請求書作成ドラフト一覧
class PdfInvoicingPage {
  title = 'PDF請求書作成ドラフト一覧';

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
    let frame = await this.actionUtils.waitForLoading('//*[@class="hero-body-noImage"]/*[contains(text(),"PDF請求書作成ドラフト一覧")]')
    this.frame = frame;
    return frame;
  }

  // ホームへ遷移する
  async clickHome() {
    await this.addComment('Homeをクリックする');
    await this.actionUtils.click(this.frame, '//*[contains(text(), "Home")]');
  }

  // PDF請求書作成ページへ遷移する
  async clickRegist() {
    await this.addComment('「新規登録する」をクリックする');
    await this.actionUtils.click(this.frame, '//a[contains(text(),"新規作成")]');
  }

  // 請求書を検索する
  async isInvoiceExist(invoiceNo) {
    return await this.actionUtils.isExist(this.frame, '//tbody[@id="item-list"]//td[contains(text(), "' + invoiceNo + '")]');
  }

  // 請求書の「編集・出力」をクリックする
  async edit(invoiceNo) {
    await this.actionUtils.click(this.frame, '//td[contains(text(), "' + invoiceNo + '")]/../td/a[text()="編集・出力"]');
  }
}
exports.PdfInvoicingPage = PdfInvoicingPage;
