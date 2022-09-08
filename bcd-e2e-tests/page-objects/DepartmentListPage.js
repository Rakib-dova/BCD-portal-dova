const { ActionUtils } = require('../utils/action-utils');
const comment = require('../utils/chai-with-reporting').comment;

// 部門データ一覧
class DepartmentListPage {
  title = '部門データ一覧';

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
    let frame = await this.actionUtils.waitForLoading('//*//*[@class="hero-body-noImage"]/*[contains(text(),"部門データ一覧")]')
    this.frame = frame;
    return frame;
  }

  // ホームへ遷移する
  async clickHome() {
    await this.addComment('「Home」をクリックする');
    await this.actionUtils.click(this.frame, '//*[contains(text(), "Home")]');
  }

  // 部門データ登録ページへ遷移する
  async clickRegist() {
    await this.addComment('「新規登録する」をクリックする');
    await this.actionUtils.click(this.frame, '//a[contains(text(),"新規登録する")]');
  }

  // 部門データ確認・変更ページへ遷移する
  async clickEdit(departmentCode) {
    await this.addComment(`部門コード"${departmentCode}"の「確認・変更する」をクリックする`);
    await this.actionUtils.click(this.frame, `//td[contains(text(), "${departmentCode}")]/..//a[contains(text(),"確認・変更する")]`);
  }

  // 部門データを削除する
  async delete(departmentCode) {
    await this.addComment(`部門コード"${departmentCode}"の「削除」をクリックする`);
    await this.actionUtils.click(this.frame, `//td[contains(text(), "${departmentCode}")]/..//a[contains(text(),"削除")]`);
    await this.addComment('削除確認ポップアップの「削除」をクリックする');
    await this.actionUtils.click(this.frame, '#modalCodeDelBtn');
    await this.waitPopup();
  }

  // 部門データをすべて削除する
  async deleteAll() {
    let rows;
    await this.addComment('部門データをすべて削除する');
    while((rows = await this.actionUtils.getElements(this.frame, '//tr//a[contains(text(),"削除")]')).length > 0) {
      await rows[0].click();
      await this.actionUtils.click(this.frame, '#modalCodeDelBtn');
      await this.waitPopup();
      await this.closePopup();
    }
  }

  // 部門データ一括作成ページへ遷移する
  async clickUpload() {
    await this.addComment('「部門データ一括作成」をクリックする');
    await this.actionUtils.click(this.frame, '//a[contains(text(), "部門データ一括作成")]');
  }

  // 勘定科目を検索する
  async hasRow(departmentCode, departmentName) {
    return await this.actionUtils.isExist(this.frame, `//td[contains(text(), "${departmentCode}")]/../td[contains(text(), "${departmentName}")]`);
  }

  // メッセージが表示されるまで待機する
  async waitPopup() {
    await this.actionUtils.waitForLoading('//*[@class="notification is-info animate__animated animate__faster"]');
    await this.frame.waitForTimeout(500);
  }

  // ポップアップメッセージを取得する
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
exports.DepartmentListPage = DepartmentListPage;
