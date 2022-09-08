const { ActionUtils } = require('../utils/action-utils');
const comment = require('../utils/chai-with-reporting').comment;

// 承認ルート一覧
class ApproveRouteListPage {
  title = '承認ルート一覧';

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

  // ページタイトルを取得する
  async getPageTitle() {
    return await this.actionUtils.getText(this.frame, '//div[@class="title is-family-noto-sans"]');
  }

  // ページが表示されるまで待機する
  async waitForLoading() {
    let frame = await this.actionUtils.waitForLoading('//*[@class="hero-body-noImage"]/*[contains(text(),"承認ルート一覧")]')
    this.frame = frame;
    return frame;
  }

  // 承認ルート登録ページへ遷移する
  async clickRegist() {
    await this.addComment('「新規登録する」をクリックする');
    await this.actionUtils.click(this.frame, '//a[contains(text(),"新規登録する")]');
  }

  // ホームへ遷移する
  async clickHome() {
    await this.addComment('「Home」をクリックする');
    await this.actionUtils.click(this.frame, '//a[contains(text(), "Homeへ戻る")]');
  }

  // 承認ルートがない場合のメッセージを取得する
  async getNodataMessage() {
    return await this.actionUtils.getText(this.frame, '//div[@class="box"]/p');
  }

  // 承認ルートの有無を確認する
  async hasRow(routeName) {
    return await this.actionUtils.isExist(this.frame, `//td[contains(text(), "${routeName}")]`);
  }

  // 承認ルートの行内容を取得する
  async getRow(routeName) {
    return {
      no: await this.actionUtils.getText(this.frame, `//td[contains(text(), "${routeName}")]/../th`),
      authCount: await this.actionUtils.getText(this.frame, `//td[contains(text(), "${routeName}")]/../td[2]`)
    };
  }

  // 承認ルートの「確認・変更する」をクリックする
  async clickEdit(routeName) {
    await this.addComment(`承認ルート名"${routeName}"の「確認・変更する」をクリックする`);
    await this.actionUtils.click(this.frame, `//td[contains(text(), "${routeName}")]/..//a[contains(text(), "確認・変更する")]`);
  }

  // 承認ルートの「削除」をクリックする
  async deleteRoute(routeName) {
    await this.addComment(`承認ルート名"${routeName}"の「削除」をクリックする`);
    await this.actionUtils.click(this.frame, `//td[contains(text(), "${routeName}")]/..//a[contains(text(), "削除")]`);
    await this.actionUtils.waitForLoading('#modalDelBtn');
  }

  // 削除確認ポップアップのメッセージを取得する
  async getDelMessage() {
    return await this.actionUtils.getText(this.frame, '//div[@id="confirationDelete-modal"]//section[@class="modal-card-body"]/p');
  }

  // 削除確認ポップアップの「削除」をクリックする
  async deleteOnConfirm() {
    await this.addComment('削除確認ポップアップの「削除」をクリックする');
    await this.actionUtils.click(this.frame, '#modalDelBtn');
    await this.waitPopup();
  }

  // メッセージが表示されるまで待機する
  async waitPopup() {
    await this.actionUtils.waitForLoading('//*[@class="notification is-info animate__animated animate__faster"]');
    await this.frame.waitForTimeout(500);
  }

  // メッセージを取得する
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
exports.ApproveRouteListPage = ApproveRouteListPage;
