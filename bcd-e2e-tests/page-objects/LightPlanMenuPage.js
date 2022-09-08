const { ActionUtils } = require('../utils/action-utils');
const comment = require('../utils/chai-with-reporting').comment;

// オプションサービス申込
class LightPlanMenuPage {
  title='オプションサービス申込';

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
    let frame = await this.actionUtils.waitForLoading('//*[text()="オプションサービス申込"]');
    this.frame = frame;
    return frame;
  }

  // タイトルを取得する
  async getTitle() {
    return await this.actionUtils.getText(this.frame, '//div[@id="information-lightplan"]//p[contains(@class, "modal-card-title")]');
  }

  // 閉じる
  async close() {
    await this.actionUtils.click(this.frame, '//div[@id="information-lightplan"]//button[@class="delete"]');
    await this.frame.waitForTimeout(500);
  }

  // 「導入支援サービス」をクリックする
  async clickIntroSupport() {
    this.addComment('「導入支援サービス」をクリックする');
    await this.actionUtils.click(this.frame, '//a[contains(text(), "導入支援サービス")]');
  }

  // スタンダードプランの「オプションサービス詳細」をクリックする
  async getDetailUrl() {
    await this.addComment('「オプションサービス詳細」をクリックする');
    return await this.actionUtils.openNewTabAndGetUrl(this.frame, '//a[contains(text(), "オプションサービス詳細")]');
  }

  // スタンダードプランの「お申し込みフォーム」ボタンの活性状態を取得する
  async getApplyEnabled() {
    return await this.actionUtils.isExist(this.frame, '//a[@href="/paidServiceRegister/030"]');
  }

  // スタンダードプランの「お申し込みフォーム」をクリックする
  async clickApply() {
    await this.addComment('「お申込みフォーム」をクリックする');
    await this.actionUtils.click(this.frame, '//a[@href="/paidServiceRegister/030"]');
  }

  // 導入支援サービスの「お申し込みフォーム」ボタンの活性状態を取得する
  async getApplyIntroSupportEnabled() {
    return await this.actionUtils.isExist(this.frame, '//a[@href="/paidServiceRegister/020"]');
  }

  // 導入支援サービスの「お申し込みフォーム」をクリックする
  async clickApplyIntroSupport() {
    await this.addComment('「お申込みフォーム」をクリックする');
    await this.actionUtils.click(this.frame, '//a[@href="/paidServiceRegister/020"]');
  }
}
exports.LightPlanMenuPage = LightPlanMenuPage;
