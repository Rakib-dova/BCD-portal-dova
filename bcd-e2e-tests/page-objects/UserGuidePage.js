const { ActionUtils } = require('../utils/action-utils');
const comment = require('../utils/chai-with-reporting').comment;

// ご利用ガイド
class UserGuidePage {
  title = 'ご利用ガイド';

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
    let frame = await this.actionUtils.waitForLoading(`//*[@id="form"]//h2[text()="${this.title}"]`);
    this.frame = frame;
    return frame;
  }

  // ホームへ遷移する
  async clickHome() {
    await this.addComment('「Home」をクリックする');
    await this.actionUtils.click(this.frame, '//*[contains(text(), "Home")]');
  }

  // タイトルを取得する
  async getTitle() {
    return await this.actionUtils.getText(this.frame, 'section .title');
  }

  // 「各種機能について」-「請求書一括作成」-「一括作成方法」をクリックし、PDFマニュアルをダウンロードする
  async downloadInvoiceGuide() {
    await this.addComment('「各種機能について」にて、「請求書一括作成」-「一括作成方法」をクリックする');
    return await this.actionUtils.downloadFile(this.frame, '//li[@id="invoice"]//a[contains(text(),"一括作成方法")]');
  }

  // 「よくある質問へ」をクリックし、遷移先URLを取得する
  async getFaqUrl() {
    await this.addComment('「よくある質問へ」をクリックする');
    return await this.actionUtils.openNewTabAndGetUrl(this.frame, '//span[contains(text(), "よくある質問へ")]/..');
  }

  // お客様番号が発行されているか
  async hasContractNo() {
    return await this.actionUtils.isExist(this.frame, '#numberN');
  }

  // 「お問い合わせフォームへ」をクリックし、遷移先URLを取得する
  async getInquiryUrl() {
    await this.addComment('「お問い合わせフォームへ」をクリックする');
    return await this.actionUtils.openNewTabAndGetUrl(this.frame, '//span[contains(text(), "お問い合わせフォームへ")]/..');
  }
}
exports.UserGuidePage = UserGuidePage;
