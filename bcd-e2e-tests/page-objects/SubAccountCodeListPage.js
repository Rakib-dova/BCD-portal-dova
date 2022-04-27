const { ActionUtils } = require('../utils/action-utils');
const { comment } = require('../utils/chai-with-reporting');

// 補助科目一覧
class SubAccountCodeListPage {

  // コンストラクタ
  constructor(browser, page) {
    this.browser = browser;
    this.page = page;
    this.actionUtils = new ActionUtils(browser, page);
  }

  // ページが表示されるまで待機する
  async waitForLoading() {
    let frame = await this.actionUtils.waitForLoading('//*[@class="hero-body-noImage"]/*[contains(text(),"補助科目一覧")]')
    this.frame = frame;
    return frame;
  }
  
  // ホームへ遷移する
  async clickHome() {
    await this.actionUtils.click(this.frame, '//*[contains(text(), "Home")]');
  }

  // 補助科目登録ページへ遷移する
  async clickRegist() {
    await this.actionUtils.click(this.frame, '//a[contains(text(),"新規登録する")]');
  }

  // 補助科目確認・変更ページへ遷移する
  async clickEdit(subAccountCode, accountName) {
    await this.actionUtils.click(this.frame, '//td[contains(text(), "' + subAccountCode + '")]/../td[contains(text(), "' + accountName + '")]/..//a[contains(text(),"確認・変更する")]');
  }

  // 補助科目を削除する
  async delete(subAccountCode, accountName) {
    await this.actionUtils.click(this.frame, '//td[contains(text(), "' + subAccountCode + '")]/../td[contains(text(), "' + accountName + '")]/..//a[contains(text(),"削除")]');
    await this.actionUtils.click(this.frame, '#modalCodeDelBtn');
  }

  // 補助科目をすべて削除する
  async deleteAll() {
    let rows;
    while((rows = await this.actionUtils.getElements(this.frame, '//tr//a[contains(text(),"削除")]')).length > 0) {
      await rows[0].click();
      await this.actionUtils.click(this.frame, '#modalCodeDelBtn');
      await this.frame.waitForTimeout(5000);
    }
  }

  // 補助科目一括作成ページへ遷移する
  async clickUpload() {
    await this.actionUtils.click(this.frame, '//a[contains(text(), "補助科目一括作成")]');
  }

  // 補助科目を検索する
  async hasRow(subAccountCode, subAccountName) {
    return await this.actionUtils.isExist(this.frame, '//td[contains(text(), "' + subAccountCode + '")]/../td[contains(text(), "' + subAccountName + '")]');
  }

  // 補助科目を検索する
  async hasRowWithAccount(subAccountCode, subAccountName, accountName) {
    return await this.actionUtils.isExist(this.frame, '//td[contains(text(), "' + subAccountCode + '")]/../td[contains(text(), "' + subAccountName + '")]/../td[contains(text(), "' + accountName + '")]');
  }

  // ポップアップメッセージを取得する
  async getPopupMessage() {
    return await this.actionUtils.getText(this.frame, '//*[@class="notification is-info animate__animated animate__faster"]');
  }
}
exports.SubAccountCodeListPage = SubAccountCodeListPage;
