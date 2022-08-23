const { ActionUtils } = require('../utils/action-utils');
const comment = require('../utils/chai-with-reporting').comment;

// 有料サービス利用登録-お申し込み内容入力
class PaidServiceRegisterInputPage {
  title = 'お申し込み内容入力';

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
    let frame = await this.actionUtils.waitForLoading('//h2[contains(text(), "' + this.title + '")]')
    this.frame = frame;
    return frame;
  }

  // タイトルを取得する
  async getSubTitle() {
    return await this.actionUtils.getText(this.frame, '//form//h2');
  }

  // 契約者名を入力する
  async inputName(name, kana) {
    await this.addComment('契約者名の各項目への入力');
    await this.addComment('契約者名（企業名）にて、"' + name + '"と入力する');
    await this.actionUtils.fill(this.frame, '#contractorName', name);
    await this.addComment('契約者カナ名（企業名）にて、"' + name + '"と入力する');
    await this.actionUtils.fill(this.frame, '#contractorKanaName', kana);
  }

  // 契約者住所を入力する
  async inputAddress(postNo, address, houseNo, other) {
    await this.addComment('契約者住所の各項目への入力');
    if (await this.actionUtils.getValue(this.frame, '#postalNumber')) {
      await this.addComment('郵便番号の「クリア」をクリックする');
      await this.actionUtils.click(this.frame, '#postalClearBtn');
    }
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
    await this.addComment('契約者連絡先の各項目への入力');
    await this.addComment('連絡先担当者名にて、"' + name + '"と入力する');
    await this.actionUtils.fill(this.frame, '#contactPersonName', name);
    await this.addComment('連絡先電話番号にて、"' + tel + '"と入力する');
    await this.actionUtils.fill(this.frame, '#contactPhoneNumber', tel);
    await this.addComment('連絡先メールアドレスにて、"' + mail + '"と入力する');
    await this.actionUtils.fill(this.frame, '#contactMail', mail);
  }

  // 請求情報を入力する
  async inputBillingAddress(postNo, address, houseNo, other, name, kana) {
    await this.addComment('請求情報の各項目への入力');
    if (await this.actionUtils.getValue(this.frame, '#billMailingPostalNumber')) {
      await this.addComment('郵便番号の「クリア」をクリックする');
      await this.actionUtils.click(this.frame, '#billMailingClearBtn');
    }
    await this.addComment('請求書送付先郵便番号にて、"' + postNo + '"と入力する');
    await this.actionUtils.fill(this.frame, '#billMailingPostalNumber', postNo);
    await this.addComment('郵便番号の「検索」をクリックする');
    await this.actionUtils.click(this.frame, '#billMailingSearchBtn');
    await this.actionUtils.waitForLoading('//a[@class="resultAddress"]');
    await this.addComment('住所の検索結果にて、"' + address + '"をクリックする');
    await this.actionUtils.click(this.frame, '//a[contains(text(), "' + address + '")]');
    await this.page.waitForTimeout(500);
    await this.addComment('請求書送付先番地にて、"' + houseNo + '"と入力する');
    await this.actionUtils.fill(this.frame, '#billMailingAddressBanchi1', houseNo);
    await this.addComment('請求書送付先建物等にて、"' + other + '"と入力する');
    await this.actionUtils.fill(this.frame, '#billMailingAddressBuilding1', other);
    await this.addComment('請求書送付先宛名にて、"' + other + '"と入力する');
    await this.actionUtils.fill(this.frame, '#billMailingKanaName', name);
    await this.addComment('請求書送付先宛カナ名にて、"' + other + '"と入力する');
    await this.actionUtils.fill(this.frame, '#billMailingName', kana);
  }

  // 請求連絡先を入力する
  async inputBillingContact(name, tel, mail) {
    await this.addComment('請求連絡先の各項目への入力');
    await this.addComment('担当者名にて、"' + name + '"と入力する');
    await this.actionUtils.fill(this.frame, '#billMailingPersonName', name);
    await this.addComment('担当者電話番号にて、"' + tel + '"と入力する');
    await this.actionUtils.fill(this.frame, '#billMailingPhoneNumber', tel);
    await this.addComment('担当者メールアドレスにて、"' + mail + '"と入力する');
    await this.actionUtils.fill(this.frame, '#billMailingMailAddress', mail);
  }

  // パスワードを入力する
  async inputPassword(pwd) {
    await this.addComment('パスワードの各項目への入力');
    await this.addComment('パスワードを入力する');
    await this.actionUtils.fill(this.frame, '#password', pwd);
    await this.addComment('パスワード確認を入力する');
    await this.actionUtils.fill(this.frame, '#passwordConfirm', pwd);
  }

  // お客様担当情報を入力する
  async inputDealer(chCode, chName, customerId, deptName, emplyeeCode, personName, deptType, tel, mail) {
    await this.addComment('お客様担当情報の各項目への入力');
    await this.addComment('販売チャネルコードにて、"' + chCode + '"と入力する');
    await this.actionUtils.fill(this.frame, '#salesChannelCode', chCode);
    await this.addComment('販売チャネル名にて、"' + chName + '"と入力する');
    await this.actionUtils.fill(this.frame, '#salesChannelName', chName);
    await this.addComment('共通顧客IDにて、"' + customerId + '"と入力する');
    await this.actionUtils.fill(this.frame, '#commonCustomerId', customerId);
    await this.addComment('部課名にて、"' + deptName + '"と入力する');
    await this.actionUtils.fill(this.frame, '#salesChannelDeptName', deptName);
    await this.addComment('社員コードにて、"' + emplyeeCode + '"と入力する');
    await this.actionUtils.fill(this.frame, '#salesChannelEmplyeeCode', emplyeeCode);
    await this.addComment('担当者名にて、"' + personName + '"と入力する');
    await this.actionUtils.fill(this.frame, '#salesChannelPersonName', personName);
    await this.addComment('組織区分にて、"' + deptType + '"を選択する');
    await this.actionUtils.selectByXpath(this.frame, '//select[@id="salesChannelDeptType"]', deptType);
    await this.addComment('電話番号にて、"' + tel + '"を選択する');
    await this.actionUtils.fill(this.frame, '#salesChannelPhoneNumber', tel);
    await this.addComment('メールアドレスにて、"' + mail + '"を選択する');
    await this.actionUtils.fill(this.frame, '#salesChannelMailAddress', mail);
  }

  // 「内容確認」をクリックする
  async clickNext() {
    await this.addComment('「内容確認」をクリックする');
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
      address: await this.actionUtils.getText(this.frame, '#recontractAddressVal')
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

  // ポップアップの内容を取得する（請求情報）
  async getRebillingAddress() {
    return {
      post: await this.actionUtils.getText(this.frame, '#rebillMailingPostalNumber'),
      address: await this.actionUtils.getText(this.frame, '#rebillMailingAddress'),
      name: await this.actionUtils.getText(this.frame, '#rebillMailingKanaName'),
      kana: await this.actionUtils.getText(this.frame, '#rebillMailingName')
    };
  }

  // ポップアップの内容を取得する（請求連絡先）
  async getRebillingContact() {
    return {
      name: await this.actionUtils.getText(this.frame, '#rebillMailingPersonName'),
      tel: await this.actionUtils.getText(this.frame, '#rebillMailingPhoneNumber'),
      mail: await this.actionUtils.getText(this.frame, '#rebillMailingMailAddress')
    };
  }

  // ポップアップの内容を取得する（お客様担当情報）
  async getRedealer() {
    return {
      chCode: await this.actionUtils.getText(this.frame, '#resalesChannelCode'),
      chName: await this.actionUtils.getText(this.frame, '#resalesChannelName'),
      customerId: await this.actionUtils.getText(this.frame, '#recommonCustomerId'),
      deptName: await this.actionUtils.getText(this.frame, '#resalesChannelDeptName'),
      emplyeeCode: await this.actionUtils.getText(this.frame, '#resalesChannelEmplyeeCode'),
      person: await this.actionUtils.getText(this.frame, '#resalesChannelPersonName'),
      deptType: await this.actionUtils.getText(this.frame, '#resalesChannelDeptType'),
      tel: await this.actionUtils.getText(this.frame, '#resalesChannelPhoneNumber'),
      mail: await this.actionUtils.getText(this.frame, '#resalesChannelMailAddress')
    };
  }

  // 「以下の内容で利用登録します。」を閉じる
  async closeConfirmPopup() {
    this.addComment('「以下の内容で利用登録します。」を閉じる');
    await this.actionUtils.click(this.frame, '//div[@id="confirmregister-modal"]//button[@class="delete"]');
    await this.frame.waitForTimeout(500);
  }
}
exports.PaidServiceRegisterInputPage = PaidServiceRegisterInputPage;
