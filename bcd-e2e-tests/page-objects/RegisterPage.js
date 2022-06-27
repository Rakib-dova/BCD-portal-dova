const { ActionUtils } = require('../utils/action-utils');
const comment = require('../utils/chai-with-reporting').comment;

// 利用登録
class RegisterPage {
  title = '利用登録';

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
    let frame = await this.actionUtils.waitForLoading('//*[@class="hero-body-noImage"]/*[contains(text(),"利用登録")]');
    this.frame = frame;
    return frame;
  }

  // ホームへ遷移する
  async clickHome() {
    await addComment('Homeをクリックする');
    await this.actionUtils.click(this.frame, '//*[contains(text(), "Home")]');
  }

  // 契約者名を入力する
  async inputName(name, kana) {
    await this.addComment('契約者名（企業名）にて、"' + name + '"と入力する');
    await this.actionUtils.fill(this.frame, '#contractorName', name);
    await this.addComment('契約者カナ名（企業名）にて、"' + name + '"と入力する');
    await this.actionUtils.fill(this.frame, '#contractorKanaName', kana);
  }

  // 契約者住所を入力する
  async inputAddress(postNo, address, houseNo, other) {
    await this.addComment('郵便番号にて、"' + postNo + '"と入力する');
    await this.actionUtils.fill(this.frame, '#postalNumber', postNo);
    await this.addComment('郵便番号の「検索」をクリックする');
    await this.actionUtils.click(this.frame, '#postalSearchBtn');
    await this.actionUtils.waitForLoading('//a[@class="resultAddress"]');
    await this.addComment('住所の検索結果にて、"' + address + '"をクリックする');
    await this.actionUtils.click(this.frame, '//a[contains(text(), "' + address + '")]');
    await this.page.waitForTimeout(500);
    await this.addComment('番地にて、"' + houseNo + '"と入力する');
    await this.actionUtils.fill(this.frame, '#banch1', houseNo);
    await this.addComment('建物等にて、"' + other + '"と入力する');
    await this.actionUtils.fill(this.frame, '#tatemono1', other);
  }

  // 契約者連絡先を入力する
  async inputContact(name, tel, mail) {
    await this.addComment('連絡先担当者名にて、"' + name + '"と入力する');
    await this.actionUtils.fill(this.frame, '#contactPersonName', name);
    await this.addComment('連絡先電話番号にて、"' + tel + '"と入力する');
    await this.actionUtils.fill(this.frame, '#contactPhoneNumber', tel);
    await this.addComment('連絡先メールアドレスにて、"' + mail + '"と入力する');
    await this.actionUtils.fill(this.frame, '#contactMail', mail);
  }

  // パスワードを入力する
  async inputPassword(pwd) {
    await this.addComment('パスワードを入力する');
    await this.actionUtils.fill(this.frame, '#password', pwd);
    await this.addComment('パスワード確認を入力する');
    await this.actionUtils.fill(this.frame, '#passwordConfirm', pwd);
  }

  // 販売店情報を入力する
  async inputCampaign(code, name) {
    if (code) {
      await this.addComment('販売店コードにて、"' + code + '"と入力する');
      await this.actionUtils.fill(this.frame, '#campaignCode', code);
    }
    if (name) {
      await this.addComment('販売担当者名にて、"' + name + '"と入力する');
      await this.actionUtils.fill(this.frame, '#salesPersonName', name);
    }
  }

  // 販売店コードを取得する
  async getCampaignCode() {
    return await this.actionUtils.getValue(this.frame, '#campaignCode');
  }

  // 販売担当者名を取得する
  async getCampaignName() {
    return await this.actionUtils.getValue(this.frame, '#salesPersonName');
  }

  // 「利用規約に同意します」にチェックを入れる
  async checkAgree() {
    await this.addComment('利用規約を一番下までスクロールする');
    await this.actionUtils.click(this.frame, '#terms-of-service');
    await this.actionUtils.scrollToEnd(this.frame, '#terms-of-service');
    await this.page.waitForTimeout(500);
    await this.addComment('「利用規約に同意します」にチェックを入れる');
    await this.actionUtils.check(this.frame, '#check', true);
  }

  // 「次へ」をクリックする
  async clickNext() {
    await this.addComment('「次へ」をクリックする');
    await this.actionUtils.click(this.frame, '#next-btn');
    await this.actionUtils.waitForLoading('#confirmregister-modal');
  }

  // ポップアップの内容を取得する（契約者名）
  async getReuser() {
    return {
      name: await this.actionUtils.getText(this.frame, '#recontractorName'),
      kana: await this.actionUtils.getText(this.frame, '#recontractorKanaName')
    };
  }

  // ポップアップの内容を取得する（契約者住所）
  async getReaddress() {
    return {
      post: await this.actionUtils.getText(this.frame, '#repostalNumber'),
      address: await this.actionUtils.getText(this.frame, '#recontractAddress')
    };
  }

  // ポップアップの内容を取得する（契約者連絡先）
  async getRecontact() {
    return {
      name: await this.actionUtils.getText(this.frame, '#recontactPersonName'),
      tel: await this.actionUtils.getText(this.frame, '#recontactPhoneNumber'),
      mail: await this.actionUtils.getText(this.frame, '#recontactMail')
    };
  }

  // ポップアップの内容を取得する（キャンペーン情報）
  async getRecampaign() {
    return {
      code: await this.actionUtils.getText(this.frame, '#recampaignCode'),
      name: await this.actionUtils.getText(this.frame, '#modal-salesPersonName')
    };
  }

  // ポップアップにて、「登録」をクリックする
  async submit() {
    await this.addComment('「以下の内容で利用登録します」にて、「登録」をクリックする');
    await this.actionUtils.click(this.frame, '#submit');
  }
}
exports.RegisterPage = RegisterPage;
