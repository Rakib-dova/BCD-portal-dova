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

  // ドラフト一括作成ページへ遷移する
  async clickUpload() {
    await this.addComment('「ドラフト一括登録」をクリックする');
    await this.actionUtils.click(this.frame, '//a[contains(text(),"ドラフト一括登録")]');
  }

  // 請求書を検索する
  async isInvoiceExist(invoiceNo) {
    return await this.actionUtils.isExist(this.frame, '//tbody[@id="item-list"]//td[contains(text(), "' + invoiceNo + '")]');
  }

  // 請求書の金額を取得する
  async getTotal(invoiceNo) {
    return await this.actionUtils.getText(this.frame, '//td[contains(text(), "' + invoiceNo + '")]/../td[contains(@class, "total")]');
  }

  // 請求書の「編集・出力」をクリックする
  async edit(invoiceNo) {
    await this.actionUtils.click(this.frame, '//td[contains(text(), "' + invoiceNo + '")]/../td/a[text()="編集・出力"]');
  }

  // メッセージが表示されるまで待機する
  async waitPopup() {
    await this.actionUtils.waitForLoading('//*[@class="notification is-info animate__animated animate__faster"]');
    await this.frame.waitForTimeout(500);
  }

  // メッセージを取得する
  async getPopupMessage() {
    return await this.actionUtils.getText(this.frame, '//*[@class="notification is-info animate__animated animate__faster"]');
  }

  // メッセージを閉じる
  async closePopup() {
    await this.addComment('メッセージを閉じる');
    await this.actionUtils.click(this.frame, '//*[@class="notification is-info animate__animated animate__faster"]/button');
    await this.frame.waitForTimeout(500);
  }
}
exports.PdfInvoicingPage = PdfInvoicingPage;
