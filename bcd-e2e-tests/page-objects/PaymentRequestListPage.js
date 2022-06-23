const { ActionUtils } = require('../utils/action-utils');

// 支払依頼一覧
class PaymentRequestListPage {

  // コンストラクタ
  constructor(browser, page) {
    this.browser = browser;
    this.page = page;
    this.actionUtils = new ActionUtils(browser, page);
  }

  // ページが表示されるまで待機する
  async waitForLoading() {
    let frame = await this.actionUtils.waitForLoading('//*[@class="hero-body-noImage"]/*[contains(text(),"支払依頼一覧")]')
    this.frame = frame;
    return frame;
  }

  // 仕訳情報設定ページへ遷移する
  async clickDetail(invoiceNo) {
    await this.actionUtils.click(this.frame, '//table//td[contains(text(), "' + invoiceNo + '")]/..//a[contains(text(), "仕訳情報設定")]');
  }

  // 金額を取得する
  async getCost(invoiceNo) {
    return await this.actionUtils.getText(this.frame, '//table//td[contains(text(), "' + invoiceNo + '")]/../td[5]');
  }

  // 差出人を取得する
  async getSender(invoiceNo) {
    return await this.actionUtils.getText(this.frame, '//table//td[contains(text(), "' + invoiceNo + '")]/../td[6]');
  }

  // 宛先を取得する
  async getReceiver(invoiceNo) {
    return await this.actionUtils.getText(this.frame, '//table//td[contains(text(), "' + invoiceNo + '")]/../td[7]');
  }
}
exports.PaymentRequestListPage = PaymentRequestListPage;
