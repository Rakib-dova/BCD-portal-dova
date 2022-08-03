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

  // 情報変更が可能か否かを確認する
  async ableToChange() {
    return await this.actionUtils.isDisplayed(this.frame, '#cancelltion-button');
  }

  // 解約する
  async cancel() {
    await this.addComment('「次へ」をクリックする');
    await this.actionUtils.click(this.frame, '#cancelltion-button');
    await this.actionUtils.waitForLoading('#submit');
    await this.addComment('「解約」をクリックする');
    await this.actionUtils.click('#submit');
    await this.actionUtils.waitForLoading('p .subtitle');
  }
}
exports.ContractCancelPage = ContractCancelPage;
