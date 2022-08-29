const { ActionUtils } = require('../utils/action-utils');
const comment = require('../utils/chai-with-reporting').comment;

// 契約情報解約
class ContractCancelPage {
  title = '契約情報解約';

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
    let frame = await this.actionUtils.waitForLoading('//*[@id="form"]//h2[text()="契約情報解約"]')
    this.frame = frame;
    return frame;
  }

  // タイトルを取得する
  async getTitle() {
    return await this.actionUtils.getText(this.frame, '.title');
  }

  // 解約する
  async clickCancelModal() {
    await this.addComment('「解約手続へ」をクリックする');
    await this.actionUtils.click(this.frame, '//a[text()="解約手続へ"]');
    await this.actionUtils.waitForLoading('#cancell-modal');
  }

  // 確認ダイアログのタイトルを取得する
  async getCancelModalTitle() {
    return await this.actionUtils.getText(this.frame, '//div[@id="cancell-modal"]//p[@class="modal-card-title"]');
  }

  // 確認ダイアログの「キャンセル」をクリックする
  async closeCancelModal() {
    await this.addComment('解約確認モーダルの「キャンセル」をクリックする');
    await this.actionUtils.click(this.frame, '//div[@id="cancell-modal"]//a[contains(text(), "キャンセル")]');
  }
}
exports.ContractCancelPage = ContractCancelPage;
