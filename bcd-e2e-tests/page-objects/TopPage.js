const { ActionUtils } = require('../utils/action-utils');
const comment = require('../utils/chai-with-reporting').comment;

// デジタルトレードアプリ トップページ
class TopPage {
  title = 'トップ';

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
    let frame = await this.actionUtils.waitForLoading('//*[contains(@class,"box")]//*[text()="請求書一括作成"]')
    this.frame = frame;
    return frame;
  }

  // 「ご利用中プラン」を取得する
  async getPlanStatus() {
    return await this.actionUtils.getText(this.frame, '//div[contains(@class, "planStatus")]//a');
  }

  // 「ご利用中プラン」をクリックする
  async clickPlanStatus() {
    await this.addComment('「ご利用中プラン」をクリックする');
    await this.actionUtils.click(this.frame, '//div[contains(@class, "planStatus")]//a');
  }

  // 「お知らせ」タブを取得する
  async getInformationTab() {
    return await this.actionUtils.getText(this.frame, '//div[@id="informationTab"]/../div');
  }

  // 「お知らせ」の「もっと見る」をクリックして、リンク先URLを取得する
  async getInformationLinkUrl() {
    return await this.actionUtils.openNewTabAndGetUrl(this.frame, '//div[@id="informationTab"]/../../div/a[contains(text(),"もっと見る")]');
  }

  // 「工事・故障情報」の「もっと見る」をクリックして、リンク先URLを取得する
  async getConstructLinkUrl() {
    return await this.actionUtils.openNewTabAndGetUrl(this.frame, '//div[@id="constructTab"]/../div/a[contains(text(),"もっと見る")]');
  }

  // メニューをクリックする（共通操作）
  async clickMenu(category, label) {
    await this.addComment(`機能一覧にて、「${category}」-「${label}」をクリックする`);
    await this.actionUtils.click(this.frame, `//p[contains(text(), "${category}")]/../../../a[contains(text(),"${label}")]`);
  }

  // メニューをクリックする（共通操作・ポップアップ付）
  async clickMenuWithPopup(category, label, popupLabel) {
    await this.clickMenu(category, label);
    await this.actionUtils.waitForLoading('//div[@class="modal is-active"]');
    await this.addComment(`ポップアップメニューにて、「${popupLabel}」をクリックする`);
    await this.actionUtils.click(this.frame, `//div[@class="modal is-active"]//p[contains(text(), "${popupLabel}")]`);
  }

  // メニュー「請求書一括作成」-「請求書一括作成」をクリックする
  async clickUploadInvoice() {
    await this.clickMenu('請求書一括作成', '請求書一括作成');
  }

  // メニュー「請求書一括作成」-「独自フォーマット登録」をクリックする
  async clickUploadFormat() {
    await this.clickMenu('請求書一括作成', '独自フォーマット登録');
  }

  // メニュー「請求書一括作成」-「操作マニュアル」をクリックする
  async clickInvoiceGuide() {
    await this.clickMenu('請求書一括作成', '操作マニュアル');
  }

  // メニュー「請求情報ダウンロード」-「仕訳情報ダウンロード」をクリックする
  async clickDownloadInvoice() {
    await this.clickMenu('請求情報ダウンロード', '仕訳情報ダウンロード');
  }

  // メニュー「仕訳情報管理」-「各種コード設定」-「勘定科目設定」をクリックする
  async clickAccountCode() {
    await this.clickMenuWithPopup('仕訳情報管理', '各種コード設定', '勘定科目設定');
  }

  // メニュー「仕訳情報管理」-「各種コード設定」-「補助科目設定」をクリックする
  async clickSubAccountCode() {
    await this.clickMenuWithPopup('仕訳情報管理', '各種コード設定', '補助科目設定');
  }

  // メニュー「仕訳情報管理」-「各種コード設定」-「部門データ設定」をクリックする
  async clickDepartmentCode() {
    await this.clickMenuWithPopup('仕訳情報管理', '各種コード設定', '部門データ設定');
  }

  // メニュー「仕訳情報管理」-「支払依頼」をクリックする
  async clickPaymentRequest() {
    await this.clickMenu('仕訳情報管理', '支払依頼');
  }

  // メニュー「仕訳情報管理」-「仕訳情報ダウンロード」をクリックする
  async clickDownloadJournal() {
    await this.clickMenu('仕訳情報管理', '仕訳情報ダウンロード');
  }

  // メニュー「仕訳情報管理」-「承認ルート登録」をクリックする
  async clickApproveRoute() {
    await this.clickMenu('仕訳情報管理', '承認ルート登録');
  }

  // メニュー「PDF請求書作成」-「新規作成」をクリックする
  async clickRegisterPdf() {
    await this.clickMenu('PDF請求書作成', '新規作成');
  }

  // メニュー「PDF請求書作成」-「ドラフト一括作成」をクリックする
  async clickUploadPdf() {
    await this.clickMenu('PDF請求書作成', 'ドラフト一括作成');
  }

  // メニュー「サポート」-「ご利用ガイド」をクリックする
  async clickUserGuide() {
    await this.clickMenu('サポート', 'ご利用ガイド');
  }

  // メニュー「サポート」-「よくある質問」をクリックする
  async clickFaq() {
    let category = 'サポート';
    let label = 'よくある質問';
    await this.addComment(`機能一覧にて、「${category}」-「${label}」をクリックする`);
    await this.actionUtils.click(this.frame, `//p[contains(text(), "${category}")]/../../../a/span[contains(text(),"${label}")]`);
  }

  // メニュー「サポート」-「各種お問い合わせ」をクリックする
  async clickInquiry() {
    await this.clickMenu('サポート', '各種お問い合わせ');
  }

  // メニュー「設定」-「ご契約内容」をクリックする
  async clickContractDetail() {
    await this.clickMenu('設定', 'ご契約内容');
  }

  // メニュー「設定」-「ユーザー一括登録」をクリックする
  async clickUploadUsers() {
    await this.clickMenu('設定', 'ユーザー一括登録');
  }

  // メニュー「追加オプション申込」-「オプション詳細・申込」をクリックする
  async clickLightPlan() {
    await this.clickMenu('追加オプション申込', 'オプション詳細・申込');
  }

  // 「設定」が表示されているか確認する
  async isSettingShown() {
    return await this.actionUtils.isDisplayed(this.frame, '//*[contains(@class,"box")]//p[contains(text(), "設定")]');
  }

  // 「追加オプション申込」が表示されているか確認する
  async isLightPlanShown() {
    return await this.actionUtils.isDisplayed(this.frame, '//*[contains(@class,"box")]//p[contains(text(), "追加オプション申込")]');
  }

  // 「銀行振込消印」ダイアログを開く
  async openSettlementDialog() {
    await this.actionUtils.click(this.frame, '//*[contains(@class,"box")]//*[text()="銀行振込消込"]')
  }

  // メッセージが表示されるまで待機する
  async waitPopup() {
    await this.actionUtils.waitForLoading('//*[@class="notification is-info animate__animated animate__faster"]');
    await this.frame.waitForTimeout(500);
  }

  // メッセージを閉じる
  async closePopup() {
    await this.addComment('メッセージを閉じる');
    await this.actionUtils.click(this.frame, '//*[@class="notification is-info animate__animated animate__faster"]/button');
    await this.frame.waitForTimeout(500);
  }
}
exports.TopPage = TopPage;
