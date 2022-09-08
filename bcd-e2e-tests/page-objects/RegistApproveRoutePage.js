const { ActionUtils } = require('../utils/action-utils');
const comment = require('../utils/chai-with-reporting').comment;

// 承認ルート登録 & 承認ルート確認・変更
class RegistApproveRoutePage {
  title = '承認ルート登録';

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
    let frame = await this.actionUtils.waitForLoading('//*[@class="hero-body-noImage"]/*[contains(text(),"承認ルート登録") or contains(text(),"承認ルート確認・変更")]')
    this.frame = frame;
    return frame;
  }

  // ページタイトルを取得する
  async getPageTitle() {
    return await this.actionUtils.getText(this.frame, '//div[@class="title is-family-noto-sans"]');
  }

  // 承認ルート名を入力する
  async inputName(name) {
    await this.addComment(`「承認ルート名」にて、"${name}"と入力する`);
    await this.actionUtils.fill(this.frame, '#setApproveRouteNameInputId', name);
  }

  // 承認ルート名を取得する
  async getName() {
    return await this.actionUtils.getValue(this.frame, '#setApproveRouteNameInputId');
  }

  // 「承認者追加」をクリックする
  async addAuthorizer() {
    await this.addComment('「承認者追加」をクリックする');
    await this.actionUtils.click(this.frame, '#btnAddApproveRoute');
  }

  // 承認者の「-」をクリックする
  async delAuthorizer(no) {
    await this.addComment(`${no}次承認者の「-」をクリックする`);
    await this.actionUtils.click(this.frame, `//div[@id="bulkInsertNo1"]/div[${no}]//i[@class="fas fa-minus-circle"]`);
  }

  // 承認者情報を取得する（承認者登録、検索ポップアップ、確認ポップアップ共通）
  async getUsersCommon(isInput, namePath, mailPath) {
    let names = isInput ? await this.actionUtils.getValues(this.frame, namePath) : await this.actionUtils.getTexts(this.frame, namePath);
    let mails = isInput ? await this.actionUtils.getValues(this.frame, mailPath) : await this.actionUtils.getTexts(this.frame, mailPath);
    let result = [];
    let i = 0;
    for (i = 0; i < names.length; i++) {
      result.push({
        name: names[i],
        mail: mails[i]
      });
    }
    return result;
  }

  // 承認者情報を取得する
  async getUsers() {
    return await this.getUsersCommon(
      true,
      '//div[@id="bulkInsertNo1"]//input[@name="userName"]',
      '//div[@id="bulkInsertNo1"]//input[@name="mailAddress"]'
    );
  }

  // 承認者の「検索」をクリックする
  async clickBtnSearch(no) {
    await this.addComment(`${no}番目の承認者の「検索」をクリックする`);
    await this.actionUtils.click(this.frame, `//div[@id="bulkInsertNo1"]/div[${no}]//a[contains(text(), "検索")]`);
    await this.actionUtils.waitForLoading('#btn-search-approver');
  }

  // 承認者検索を行う
  async searchAuthorizer(family, first, mail) {
    if (first || family) {
      let authorizer = family + ((family && first) ? ' ' : '') + first;
      await this.addComment(`「承認者名」にて、"${authorizer}"と入力する`);
      await this.actionUtils.fill(this.frame, '#searchModalApproveUserName', authorizer);
    }
    if (mail) {
      await this.addComment(`「メールアドレス」にて、"${mail}"と入力する`);
      await this.actionUtils.fill(this.frame, '#searchModalApproveUserMailAddress', mail);
    }
    await this.addComment('「検索」をクリックする');
    await this.actionUtils.click(this.frame, '#btn-search-approver');
    await this.actionUtils.waitForLoading('#approver-list');
  }

  // 承認者検索結果から、先頭行を選択する
  async selectAuthorizer() {
    await this.addComment('検索結果の先頭行をクリックする');
    await this.actionUtils.click(this.frame, '//div[@id="approver-list"]/div');
    await this.frame.waitForTimeout(3000);
  }

  // 承認者検索結果テーブルから、全てのメールアドレス欄を取得する
  async getUsersOnResult() {
    return await this.getUsersCommon(
      false,
      '//div[@id="approver-list"]//p[@id="name"]',
      '//div[@id="approver-list"]//p[@id="email"]'
    );
  }

  // 承認ルート一覧へ戻る
  async clickBack() {
    await this.addComment('「戻る」をクリックする');
    await this.actionUtils.click(this.frame, '//a[contains(text(), "戻る")]');
  }

  // 承認ルートを登録する
  async clickConfirm() {
    await this.addComment('「確認」をクリックする');
    await this.actionUtils.click(this.frame, '#btn-confirm');
    await this.actionUtils.waitForLoading('#submit');
  }

  // 確認ポップアップにて、承認ルート名を取得する
  async getRouteNameOnConfirm() {
    return await this.actionUtils.getValue(this.frame, '#approveRouteName_checkModal');
  }

  // 確認ポップアップにて、承認者を取得する
  async getUsersOnConfirm() {
    return await this.getUsersCommon(
      false,
      '//div[@id="approver-list-check"]//p[@id="name-check"]',
      '//div[@id="approver-list-check"]//p[@id="email-check"]'
    );
  }

  // 確認ポップアップにて、「登録」をクリックする
  async submit() {
    await this.addComment('「登録」をクリックする');
    await this.actionUtils.click(this.frame, '#submit');
  }
}
exports.RegistApproveRoutePage = RegistApproveRoutePage;
