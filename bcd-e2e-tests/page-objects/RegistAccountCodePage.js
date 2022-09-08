const { ActionUtils } = require('../utils/action-utils');
const comment = require('../utils/chai-with-reporting').comment;

// 勘定科目登録 & 勘定科目確認・変更
class RegistAccountCodePage {
  title = '勘定科目登録';

  // コンストラクタ
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
    let frame = await this.actionUtils.waitForLoading('//*[@class="hero-body-noImage"]/*[contains(text(),"勘定科目登録") or contains(text(),"勘定科目確認・変更")]')
    this.frame = frame;
    return frame;
  }

  // 勘定科目を登録する
  async regist(accountCode, accountName) {
    await this.addComment(`「勘定科目コード」にて、"${accountCode}"と入力する`);
    await this.actionUtils.fill(this.frame, '#setAccountCodeInputId', accountCode);
    await this.addComment(`「勘定科目名」にて、"${accountName}"と入力する`);
    await this.actionUtils.fill(this.frame, '#setAccountCodeNameInputId', accountName);
    await this.addComment('「登録」をクリックする');
    await this.actionUtils.click(this.frame, "#btnCheck");
  }

  // 確認ポップアップで「登録」をクリックする
  async clickPopupOK() {
    await this.addComment('ポップアップの「登録」をクリックする');
    await this.actionUtils.click(this.frame, '#submit');
  }
}
exports.RegistAccountCodePage = RegistAccountCodePage;
