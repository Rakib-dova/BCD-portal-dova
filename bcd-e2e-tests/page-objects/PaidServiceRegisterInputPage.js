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
  async inputName(values) {
    await this.addComment('契約者名の各項目への入力');
    await this.addComment('契約者名（企業名）にて、"' + values.name + '"と入力する');
    await this.actionUtils.fill(this.frame, '#contractorName', values.name);
    await this.addComment('契約者カナ名（企業名）にて、"' + values.kana + '"と入力する');
    await this.actionUtils.fill(this.frame, '#contractorKanaName', values.kana);
  }

  // 契約者住所を入力する
  async inputAddress(values, inputAll) {
    await this.addComment('契約者住所の各項目への入力');
    if (await this.actionUtils.getValue(this.frame, '#postalNumber')) {
      await this.addComment('郵便番号の「クリア」をクリックする');
      await this.actionUtils.click(this.frame, '#postalClearBtn');
    }
    await this.addComment('郵便番号にて、"' + values.post + '"と入力する');
    await this.actionUtils.fill(this.frame, '#postalNumber', values.post);
    await this.addComment('郵便番号の「検索」をクリックする');
    await this.actionUtils.click(this.frame, '#postalSearchBtn');
    await this.actionUtils.waitForLoading('//a[@class="resultAddress"]');
    await this.addComment('住所の検索結果にて、"' + values.address + '"をクリックする');
    await this.actionUtils.click(this.frame, '//a[contains(text(), "' + values.address + '")]');
    await this.page.waitForTimeout(500);
    await this.addComment('番地にて、"' + values.houseNo + '"と入力する');
    await this.actionUtils.fill(this.frame, '#banch1', values.houseNo);
    await this.addComment('建物等にて、"' + (inputAll ? values.other : '') + '"と入力する');
    await this.actionUtils.fill(this.frame, '#tatemono1', (inputAll ? values.other : ''));
  }

  // 契約者連絡先を入力する
  async inputContact(values) {
    await this.addComment('契約者連絡先の各項目への入力');
    await this.addComment('連絡先担当者名にて、"' + values.name + '"と入力する');
    await this.actionUtils.fill(this.frame, '#contactPersonName', values.name);
    await this.addComment('連絡先電話番号にて、"' + values.tel + '"と入力する');
    await this.actionUtils.fill(this.frame, '#contactPhoneNumber', values.tel);
    await this.addComment('連絡先メールアドレスにて、"' + values.mail + '"と入力する');
    await this.actionUtils.fill(this.frame, '#contactMail', values.mail);
  }

  // 請求情報を入力する
  async inputBillingAddress(values, inputAll) {
    await this.addComment('請求情報の各項目への入力');
    if (await this.actionUtils.getValue(this.frame, '#billMailingPostalNumber')) {
      await this.addComment('郵便番号の「クリア」をクリックする');
      await this.actionUtils.click(this.frame, '#billMailingClearBtn');
    }
    await this.addComment('請求書送付先郵便番号にて、"' + values.post + '"と入力する');
    await this.actionUtils.fill(this.frame, '#billMailingPostalNumber', values.post);
    await this.addComment('郵便番号の「検索」をクリックする');
    await this.actionUtils.click(this.frame, '#billMailingSearchBtn');
    await this.actionUtils.waitForLoading('//a[@class="resultAddress"]');
    await this.addComment('住所の検索結果にて、"' + values.address + '"をクリックする');
    await this.actionUtils.click(this.frame, '//a[contains(text(), "' + values.address + '")]');
    await this.page.waitForTimeout(500);
    await this.addComment('請求書送付先番地にて、"' + values.houseNo + '"と入力する');
    await this.actionUtils.fill(this.frame, '#billMailingAddressBanchi1', values.houseNo);
    await this.addComment('請求書送付先建物等にて、"' + (inputAll ? values.other : '') + '"と入力する');
    await this.actionUtils.fill(this.frame, '#billMailingAddressBuilding1', (inputAll ? values.other : ''));
    await this.addComment('請求書送付先宛名にて、"' + values.name + '"と入力する');
    await this.actionUtils.fill(this.frame, '#billMailingName', values.name);
    await this.addComment('請求書送付先宛カナ名にて、"' + values.kana + '"と入力する');
    await this.actionUtils.fill(this.frame, '#billMailingKanaName', values.kana);
  }

  // 請求連絡先を入力する
  async inputBillingContact(values) {
    await this.addComment('請求連絡先の各項目への入力');
    await this.addComment('担当者名にて、"' + values.name + '"と入力する');
    await this.actionUtils.fill(this.frame, '#billMailingPersonName', values.name);
    await this.addComment('担当者電話番号にて、"' + values.tel + '"と入力する');
    await this.actionUtils.fill(this.frame, '#billMailingPhoneNumber', values.tel);
    await this.addComment('担当者メールアドレスにて、"' + values.mail + '"と入力する');
    await this.actionUtils.fill(this.frame, '#billMailingMailAddress', values.mail);
  }

  // パスワードを入力する
  async inputPassword(pwd) {
    await this.addComment('パスワードの各項目への入力');
    await this.addComment('パスワードを入力する');
    await this.actionUtils.fill(this.frame, '#password', pwd);
    await this.addComment('パスワード確認を入力する');
    await this.actionUtils.fill(this.frame, '#passwordConfirm', pwd);
  }

  // スタンダードプラン利用開始日が表示されているか
  async isOpeningDateShown() {
    return await this.actionUtils.isDisplayed(this.frame, '#openingDate');
  }

  // スタンダードプラン利用開始日を入力する
  async inputOpeningDate(openingDate) {
    this.addComment('スタンダードプラン利用開始日にて、"' + openingDate + '"と入力する');
    let dates = openingDate.split('/');
    let elm = await this.actionUtils.getElement(this.frame, '#openingDate');
    let i = 0;
    for (i = 0; i < dates.length; i++) {
      await elm.type(dates[i], { delay: 500 });
    }
  }

  // お客様担当情報を入力する
  async inputDealer(values) {
    await this.addComment('お客様担当情報の各項目への入力');
    await this.addComment('販売チャネルコードにて、"' + values.chCode + '"と入力する');
    await this.actionUtils.fill(this.frame, '#salesChannelCode', values.chCode);
    await this.addComment('販売チャネル名にて、"' + values.chName + '"と入力する');
    await this.actionUtils.fill(this.frame, '#salesChannelName', values.chName);
    await this.addComment('共通顧客IDにて、"' + values.customerId + '"と入力する');
    await this.actionUtils.fill(this.frame, '#commonCustomerId', values.customerId);
    await this.addComment('部課名にて、"' + values.deptName + '"と入力する');
    await this.actionUtils.fill(this.frame, '#salesChannelDeptName', values.deptName);
    await this.addComment('社員コードにて、"' + values.emplyeeCode + '"と入力する');
    await this.actionUtils.fill(this.frame, '#salesChannelEmplyeeCode', values.emplyeeCode);
    await this.addComment('担当者名にて、"' + values.person + '"と入力する');
    await this.actionUtils.fill(this.frame, '#salesChannelPersonName', values.person);
    await this.addComment('組織区分にて、"' + values.deptType + '"を選択する');
    await this.actionUtils.selectByXpath(this.frame, '//select[@id="salesChannelDeptType"]', values.deptType);
    await this.addComment('電話番号にて、"' + values.tel + '"を選択する');
    await this.actionUtils.fill(this.frame, '#salesChannelPhoneNumber', values.tel);
    await this.addComment('メールアドレスにて、"' + values.mail + '"を選択する');
    await this.actionUtils.fill(this.frame, '#salesChannelMailAddress', values.mail);
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
      name: await this.actionUtils.getText(this.frame, '#rebillMailingName'),
      kana: await this.actionUtils.getText(this.frame, '#rebillMailingKanaName')
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
