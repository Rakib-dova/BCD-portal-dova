const { ActionUtils } = require('../utils/action-utils');
const { comment } = require('../utils/chai-with-reporting');

// 勘定科目一覧
class AccountCodeListPage {

  // コンストラクタ
  constructor(browser, page) {
    this.browser = browser;
    this.page = page;
    this.actionUtils = new ActionUtils(browser, page);
  }

  // ページが表示されるまで待機する
  async waitForLoading() {
    let frame = await this.actionUtils.waitForLoading('//*[@class="hero-body-noImage"]/*[contains(text(),"勘定科目一覧")]')
    this.frame = frame;
    return frame;
  }

  // ホームへ遷移する
  async clickHome() {
    await this.actionUtils.click(this.frame, '//*[contains(text(), "Home")]');
  }

  // 勘定科目登録ページへ遷移する
  async clickRegist() {
    await this.actionUtils.click(this.frame, '//a[contains(text(),"新規登録する")]');
  }

  // 勘定科目確認・変更ページへ遷移する
  async clickEdit(accountCode) {
    await this.actionUtils.click(this.frame, '//td[contains(text(), "' + accountCode + '")]/..//a[contains(text(),"確認・変更する")]');
  }

  // 勘定科目を削除する
  async delete(accountCode) {
    await this.actionUtils.click(this.frame, '//td[contains(text(), "' + accountCode + '")]/..//a[contains(text(),"削除")]');
    await this.actionUtils.click(this.frame, '#modalCodeDelBtn');
    await this.waitPopup();
  }

  // 勘定科目をすべて削除する
  async deleteAll() {
    let rows;
    while((rows = await this.actionUtils.getElements(this.frame, '//tr//a[contains(text(),"削除")]')).length > 0) {
      await rows[0].click();
      await this.actionUtils.click(this.frame, '#modalCodeDelBtn');
      await this.waitPopup();
      await this.closePopup();
    }
  }

  // 勘定科目一括作成ページへ遷移する
  async clickUpload() {
    await this.actionUtils.click(this.frame, '//a[contains(text(), "勘定科目一括作成")]');
  }

  // 勘定科目を検索する
  async hasRow(accountCode, accountName) {
    return await this.actionUtils.isExist(this.frame, '//td[contains(text(), "' + accountCode + '")]/../td[contains(text(), "' + accountName + '")]');
  }

  // ポップアップが表示されるまで待機する
  async waitPopup() {
    await this.actionUtils.waitForLoading('//*[@class="notification is-info animate__animated animate__faster"]');
    await this.frame.waitForTimeout(500);
  }

  // ポップアップメッセージを取得する
  async getPopupMessage() {
    return await this.actionUtils.getText(this.frame, '//*[@class="notification is-info animate__animated animate__faster"]');
  }

  // ポップアップを閉じる
  async closePopup() {
    await this.actionUtils.click(this.frame, '//*[@class="notification is-info animate__animated animate__faster"]/button');
    await this.frame.waitForTimeout(500);
  }
}
exports.AccountCodeListPage = AccountCodeListPage;
