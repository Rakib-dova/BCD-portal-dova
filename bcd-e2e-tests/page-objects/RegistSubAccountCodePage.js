const { ActionUtils } = require('../utils/action-utils');

// 補助科目登録 & 補助科目確認・変更
class RegistSubAccountCodePage {

  // コンストラクタ
  constructor(browser, page) {
    this.browser = browser;
    this.page = page;
    this.actionUtils = new ActionUtils(browser, page);
  }

  // ページが表示されるまで待機する
  async waitForLoading() {
    let frame = await this.actionUtils.waitForLoading('//*[@class="hero-body-noImage"]/*[contains(text(),"補助科目登録") or contains(text(),"補助科目確認・変更")]')
    this.frame = frame;
    return frame;
  }

  // 勘定科目コードテキストの表示状態を取得する
  async isAccountDisplayed() {
    return await this.actionUtils.isDisplayed(this.frame, '#setAccountCodeInputIdResultColumn');
  }

  // 設定ボタンの活性状態を取得する
  async isSelectAccountEnabled() {
    return await this.actionUtils.getAttr(this.frame, '#btnOpenAccountCodeModal', 'disabled') == null;
  }

  // 勘定科目コードを取得する
  async getAccountCode() {
    return await this.actionUtils.getValue(this.frame, '#setAccountCodeInputIdResult');
  }

  // 補助科目コードを取得する
  async getSubAccountCode() {
    return await this.actionUtils.getValue(this.frame, '#setSubAccountCodeInputId');
  }

  // 補助科目名を取得する
  async getSubAccountName() {
    return await this.actionUtils.getValue(this.frame, '#setSubAccountCodeNameInputId');
  }

  // ポップアップメッセージを取得する
  async getPopupMessage() {
    return await this.actionUtils.getText(this.frame, '//div[@class="modal modal-fx-fadeInscale is-active"]//section[@class="modal-card-body"]/p');
  }

  // 勘定科目を選択する
  async selectAccount(accountCode) {
    await this.actionUtils.click(this.frame, '#btnOpenAccountCodeModal');
    await this.actionUtils.fill(this.frame, '#setAccountCodeInputId', accountCode);
    await this.actionUtils.click(this.frame, '#btnSearchAccountCode');
    await this.actionUtils.click(this.frame, '#displayFieldBody tr');
  }

  // 勘定科目をクリアする
  async clickClearAccount() {
    await this.actionUtils.click(this.frame, '#btnAccountCodeClear');
  }

  // 補助科目を登録する
  async regist(subAccountCode, subAccountName) {
    await this.actionUtils.fill(this.frame, '#setSubAccountCodeInputId', subAccountCode);
    await this.actionUtils.fill(this.frame, '#setSubAccountCodeNameInputId', subAccountName);
    await this.actionUtils.click(this.frame, "#btnCheck");
  }

  // 確認ポップアップで「登録」をクリックする
  async clickPopupOK() {
    await this.actionUtils.click(this.frame, '#submit');
  }
}
exports.RegistSubAccountCodePage = RegistSubAccountCodePage;
