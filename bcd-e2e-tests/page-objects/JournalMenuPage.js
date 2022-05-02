const { ActionUtils } = require('../utils/action-utils');

// 仕訳情報管理メニュー
class JournalMenuPage {

  // コンストラクタ
  constructor(browser, page) {
    this.browser = browser;
    this.page = page;
    this.actionUtils = new ActionUtils(browser, page);
  }

  // ページが表示されるまで待機する
  async waitForLoading() {
    let frame = await this.actionUtils.waitForLoading('//*[@id="registAccountCode-modal"]//*[contains(text(),"承認ルート一覧")]')
    this.frame = frame;
    return frame;
  }

  // メニュー項目を取得する
  async getMenuTexts() {
    return await this.actionUtils.getTexts(this.frame, '#registAccountCode-modal a p');
  }

  // メニュー項目をクリックする
  async clickMenu(menuLabel) {
    await this.actionUtils.click(this.frame, '//*[@id="registAccountCode-modal"]//section//*[contains(text(),"' + menuLabel + '")]');
  }

  // 勘定科目設定ページに遷移する
  async clickAccount() {
    await this.clickMenu('勘定科目設定');
  }

  // 補助科目設定ページに遷移する
  async clickSubAccount() {
    await this.clickMenu('補助科目設定');
  }

  // 部門データ設定ページに遷移する
  async clickDepartment() {
    await this.clickMenu('部門データ設定');
  }

  // 支払依頼一覧ページに遷移する
  async clickPaymentRequest() {
    await this.clickMenu('支払依頼一覧');
  }

  // 仕訳情報ダウンロードページに遷移する
  async clickJournalDownload() {
    await this.clickMenu('仕訳情報ダウンロード');
  }

  // 承認ルート一覧ページに遷移する
  async clickApproveRoute() {
    await this.clickMenu('承認ルート一覧');
  }
}
exports.JournalMenuPage = JournalMenuPage;