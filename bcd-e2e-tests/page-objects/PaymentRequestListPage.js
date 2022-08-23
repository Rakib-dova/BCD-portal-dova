const { ActionUtils } = require('../utils/action-utils');
const comment = require('../utils/chai-with-reporting').comment;

// 支払依頼一覧
class PaymentRequestListPage {
  title = '支払依頼一覧';

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
    let frame = await this.actionUtils.waitForLoading('//*[@class="hero-body-noImage"]/*[contains(text(),"支払依頼一覧")]')
    this.frame = frame;
    return frame;
  }

  // ホームへ遷移する
  async clickHome() {
    await this.addComment('「Home」をクリックする');
    await this.actionUtils.click(this.frame, '//*[contains(text(), "Home")]');
  }

  // 検索条件フォームの表示状態を確認する
  async isFormShown() {
    return await this.actionUtils.isDisplayed(this.frame, '#form');
  }

  // 「検索機能を利用」ボタンの表示状態を確認する
  async isLightPlanShown() {
    return await this.actionUtils.isDisplayed(this.frame, '//a[@data-target="information-lightplan"]');
  }

  // 「検索機能を利用」ボタンをクリックする
  async clickLightPlan() {
    await this.addComment('「検索機能を利用」ボタンをクリックする');
    await this.actionUtils.click(this.frame, '//a[@data-target="information-lightplan"]');
  }

  // 指定の請求書が見つかるまでページングを行う
  async paging(invoiceNo) {
    var pages = await this.actionUtils.getElements(this.frame, '//ul[@class="pagination-list"]/li');
    var i = 0;
    for (i = 0; i < pages.length; i++) {
      if (await this.actionUtils.isExist(this.frame, '//table//td[contains(text(), "' + invoiceNo + '")]')) {
        return;
      }
      await pages[i + 1].click();
      await this.frame.waitForTimeout(30000);
    }
  }

  // 仕訳情報設定ページへ遷移する
  async clickDetail(invoiceNo) {
    await this.addComment('請求書番号"' + invoiceNo + '"にて、「仕訳情報設定」をクリックする');
    await this.paging(invoiceNo);
    await this.actionUtils.click(this.frame, '//table//td[contains(text(), "' + invoiceNo + '")]/..//a[contains(text(), "仕訳情報設定")]');
  }

  // 承認ステータスを取得する
  async getApproveStatus(invoiceNo) {
    await this.paging(invoiceNo);
    return await this.actionUtils.getText(this.frame, '//table//td[contains(text(), "' + invoiceNo + '")]/../td[3]/a');
  }

  // 金額を取得する
  async getCost(invoiceNo) {
    await this.paging(invoiceNo);
    return await this.actionUtils.getText(this.frame, '//table//td[contains(text(), "' + invoiceNo + '")]/../td[5]');
  }

  // 差出人を取得する
  async getSender(invoiceNo) {
    await this.paging(invoiceNo);
    return await this.actionUtils.getText(this.frame, '//table//td[contains(text(), "' + invoiceNo + '")]/../td[6]');
  }

  // 承認待ちタブを表示する
  async clickConstruct() {
    await this.addComment('「承認待ち」タブをクリックする');
    await this.actionUtils.click(this.frame, '#constructTab');
    await this.actionUtils.waitForLoading('#constructTab');
  }

  // 承認待ちリストに、任意の請求書が表示されているか確認する
  async hasConstructRow(invoiceNo) {
    return await this.actionUtils.isExist(this.frame, '//div[@id="constructTab"]//td[contains(text(), "' + invoiceNo + '")]');
  }

  // 承認待ちリスト内のステータスを取得する
  async getConstructStatus(invoiceNo) {
    return await this.actionUtils.getText(this.frame, '//div[@id="constructTab"]//td[contains(text(), "' + invoiceNo + '")]/..//a[contains(@class, "approveStatus")]');
  }

  // 承認待ちリスト内、任意の請求書の支払依頼ページへ遷移する
  async clickConstructDetail(invoiceNo) {
    await this.addComment('請求書番号"' + invoiceNo + '"にて、「依頼内容確認」をクリックする');
    await this.actionUtils.click(this.frame, '//div[@id="constructTab"]//td[contains(text(), "' + invoiceNo + '")]/..//a[contains(text(), "依頼内容確認")]');
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
    await this.addComment('メッセージを閉じる');
    await this.actionUtils.click(this.frame, '//*[@class="notification is-info animate__animated animate__faster"]/button');
    await this.frame.waitForTimeout(500);
  }
}
exports.PaymentRequestListPage = PaymentRequestListPage;
