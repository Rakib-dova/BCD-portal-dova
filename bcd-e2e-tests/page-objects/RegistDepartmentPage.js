const { ActionUtils } = require('../utils/action-utils');

// 部門データ登録 & 部門データ確認・変更
class RegistDepartmentPage {

  // コンストラクタ
  constructor(browser, page) {
    this.browser = browser;
    this.page = page;
    this.actionUtils = new ActionUtils(browser, page);
  }

  // ページが表示されるまで待機する
  async waitForLoading() {
    let frame = await this.actionUtils.waitForLoading('//*[@class="hero-body-noImage"]/*[contains(text(),"部門データ登録") or contains(text(),"部門データ確認・変更")]')
    this.frame = frame;
    return frame;
  }

  // 部門コードを取得する
  async getCode() {
    return await this.actionUtils.getValue(this.frame, '#setDepartmentCodeInputId');
  }
  
  // 部門名を取得する
  async getName() {
    return await this.actionUtils.getValue(this.frame, '#setDepartmentCodeNameInputId');
  }

  // 部門データを登録する
  async regist(accountCode, accountName) {
    await this.actionUtils.fill(this.frame, '#setDepartmentCodeInputId', accountCode);
    await this.actionUtils.fill(this.frame, '#setDepartmentCodeNameInputId', accountName);
    await this.actionUtils.click(this.frame, "#btnCheck");
  }

  // 確認ポップアップで「登録」をクリックする
  async clickPopupOK() {
    await this.actionUtils.click(this.frame, '#check-modal #submit');
  }
}
exports.RegistDepartmentPage = RegistDepartmentPage;
