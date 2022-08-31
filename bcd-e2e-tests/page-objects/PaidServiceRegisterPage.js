const { ActionUtils } = require('../utils/action-utils');
const comment = require('../utils/chai-with-reporting').comment;

// 有料サービス利用登録
class PaidServiceRegisterPage {
  title = '有料サービス利用登録';

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
    let frame = await this.actionUtils.waitForLoading('//*[@class="hero-body-noImage"]/*[contains(text(),"有料サービス利用登録")]')
    this.frame = frame;
    return frame;
  }

  // タイトルを取得する
  async getTitle() {
    return await this.actionUtils.getText(this.frame, '//div[@class="title is-family-noto-sans"]');
  }

  // 「スタンダードプラン」のチェック状態を取得する
  async isStandardChecked() {
    return await this.actionUtils.isChecked(this.frame, '//input[contains(@name, "services") and @value="030"]');
  }

  // 「導入支援サービス」のチェック状態を取得する
  async isIntroSupportChecked() {
    return await this.actionUtils.isChecked(this.frame, '//input[contains(@name, "services") and @value="020"]');
  }

  // 「重要事項説明・利用規約に同意します」にチェックを入れる
  async checkAgree() {
    await this.addComment('「重要事項説明・利用規約に同意します」にチェックを入れる');
    await this.actionUtils.check(this.frame, '#check', true);
  }

  // 「お申し込み内容入力へ」が活性状態であるか
  async isNextDisabled() {
    return await this.actionUtils.isDisabled(this.frame, '#next-btn');
  }

  // 「お申し込み内容入力へ」をクリックする
  async clickNext() {
    await this.addComment('「お申し込み内容入力へ」をクリックする');
    await this.actionUtils.click(this.frame, '#next-btn');
  }
}
exports.PaidServiceRegisterPage = PaidServiceRegisterPage;
