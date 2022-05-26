const { ActionUtils } = require('../utils/action-utils');

// 支払依頼
class PaymentRequestPage {

  // コンストラクタ
  constructor(browser, page) {
    this.browser = browser;
    this.page = page;
    this.actionUtils = new ActionUtils(browser, page);
  }

  // ページが表示されるまで待機する
  async waitForLoading() {
    let frame = await this.actionUtils.waitForLoading('//*[@class="hero-body-noImage"]/*[contains(text(),"支払依頼")]')
    this.frame = frame;
    return frame;
  }

  // 請求書番号を取得する
  async getNo() {
    return await this.actionUtils.getText(this.frame, '//div[contains(text(), "請求書番号")]/../div[2]');
  }

  // 宛先を取得する
  async getReceiver() {
    return await this.actionUtils.getText(this.frame, '//p[contains(text(), "宛先")]/../div/div/p');
  }

  // 差出人を取得する
  async getSender() {
    return await this.actionUtils.getText(this.frame, '//p[contains(text(), "差出人")]/../div/div/p');
  }

  // 金額を取得する
  async getCost() {
    return await this.actionUtils.getText(this.frame, '//div[contains(text(), "合計")]/../div[2]');
  }

  // メッセージを入力する
  async setMessage(message) {
    await this.actionUtils.fill(this.frame, '#inputMsg', message);
  }

  // メッセージを取得する
  async getMessage() {
    return await this.actionUtils.getValue(this.frame, '#inputMsg');
  }

  // 仕訳情報にて、借方の勘定科目・補助科目を選択する
  async selectAccountCode(no, code, subCode) {
    await this.actionUtils.click(this.frame, '//div[@id="lineNo' + no + '"]//a[contains(@data-target, "accountCode-modal")]');
    await this.actionUtils.waitForLoading('#accountCode-modal');
    await this.actionUtils.fill(this.frame, '#searchModalAccountCode', code);
    await this.actionUtils.fill(this.frame, '#searchModalSubAccountCode', subCode);
    await this.actionUtils.click(this.frame, '#btnSearchAccountCode');
    await this.actionUtils.waitForLoading('#displayFieldResultBody');
    await this.actionUtils.click(this.frame, '//tbody[@id="displayFieldResultBody"]/tr');
    await this.frame.waitForTimeout(1000);
  }

  // 仕訳情報にて、借方の部門データを選択する
  async selectDepartment(no, code) {
    await this.actionUtils.click(this.frame, '//div[@id="lineNo' + no + '"]//a[contains(@data-target, "departmentCode-modal")]');
    await this.actionUtils.waitForLoading('#departmentCode-modal');
    await this.actionUtils.fill(this.frame, '#searchModalDepartmentCode', code);
    await this.actionUtils.click(this.frame, '#btnSearchDepartmentCode');
    await this.actionUtils.waitForLoading('#displayFieldDepartmentResultBody');
    await this.actionUtils.click(this.frame, '//tbody[@id="displayFieldDepartmentResultBody"]/tr');
    await this.frame.waitForTimeout(1000);
  }

  // 仕訳情報にて、貸方の勘定科目・補助科目を選択する
  async selectCreditAccountCode(no, code, subCode) {
    await this.actionUtils.click(this.frame, '//div[@id="lineNo' + no + '"]//a[contains(@data-target, "creditAccountCode-modal")]');
    await this.actionUtils.waitForLoading('#creditAccountCode-modal');
    await this.actionUtils.fill(this.frame, '#searchModalCreditAccountCode', code);
    await this.actionUtils.fill(this.frame, '#searchModalCreditSubAccountCode', subCode);
    await this.actionUtils.click(this.frame, '#btnSearchCreditAccountCode');
    await this.actionUtils.waitForLoading('#displayCreditFieldResultBody');
    await this.actionUtils.click(this.frame, '//tbody[@id="displayCreditFieldResultBody"]/tr');
    await this.frame.waitForTimeout(1000);
  }

  // 仕訳情報にて、貸方の部門データを選択する
  async selectCreditDepartment(no, code) {
    await this.actionUtils.click(this.frame, '//div[@id="lineNo' + no + '"]//a[contains(@data-target, "creditDepartmentCode-modal")]');
    await this.actionUtils.waitForLoading('#creditDepartmentCode-modal');
    await this.actionUtils.fill(this.frame, '#searchModalCreditDepartmentCode', code);
    await this.actionUtils.click(this.frame, '#btnSearchCreditDepartmentCode');
    await this.actionUtils.waitForLoading('#displayCreditFieldDepartmentResultBody');
    await this.actionUtils.click(this.frame, '//tbody[@id="displayCreditFieldDepartmentResultBody"]/tr');
    await this.frame.waitForTimeout(1000);
  }

  // 仕訳情報にて、借方の勘定科目・補助科目・部門データを取得する
  async getLineAccountCode(no) {
    return {
      accountCode: await this.actionUtils.getValue(this.frame, '//div[@id="lineNo' + no + '"]//label[contains(text(), "勘定科目コード")]/../../../../td//input'),
      subAccountCode: await this.actionUtils.getValue(this.frame, '//div[@id="lineNo' + no + '"]//label[contains(text(), "補助科目コード")]/../../../../td//input'),
      departmentCode: await this.actionUtils.getValue(this.frame, '//div[@id="lineNo' + no + '"]//label[contains(text(), "部門コード")]/../../../../td//input')
    }
  }

  // 承認ルートの検索ポップアップを表示する
  async clickRouteSearch() {
    await this.actionUtils.click(this.frame, '#btn-approveRouteInsert');
    await this.actionUtils.waitForLoading('#btnSearchApproveRoute');
  }

  // 承認ルートを検索する
  async searchRoute(routeName) {
    await this.actionUtils.fill(this.frame, '#searchModalApproveRoute', routeName);
    await this.actionUtils.click(this.frame, '#btnSearchApproveRoute');
    await this.actionUtils.waitForLoading('#displayFieldApproveRouteResultBody');
  }

  // 承認ルートの有無を確認する
  async hasRouteRow(routeName) {
    return await this.actionUtils.isExist(this.frame, '//tbody[@id="displayFieldApproveRouteResultBody"]//td[contains(text(), "' + routeName + '")]');
  }

  // 承認ルートを確認する
  async confirmRoute(routeName) {
    await this.actionUtils.click(this.frame, '//tbody[@id="displayFieldApproveRouteResultBody"]//td[contains(text(), "' + routeName + '")]/..//a[contains(text(), "承認ルート確認")]');
    await this.actionUtils.waitForLoading('#detail-approveRoute-modal');
  }

  // 承認ルート確認ポップアップにて、承認ルート名を取得する
  async getRouteNameOnConfirm() {
    return await this.actionUtils.getText(this.frame, '//div[@id="approveRouteName"]/p');
  }

  // 承認ルート確認ポップアップにて、第1～10承認者、最終承認者を全て取得する
  async getAuthorizersOnConfirm() {
    let rows = await this.actionUtils.getTexts(this.frame, '//section[@id="displayDetailApproveRouteTable"]/div/div[2]');
    let result = [];
    let i = 1;
    for (i = 1; i < rows.length; i++) {
      result.push(rows[i]);
    }
    return result;
  }

  // 承認ルート確認ポップアップを閉じる
  async closeConfirm() {
    await this.actionUtils.click(this.frame, '//div[@id="detail-approveRoute-modal"]//a[@class="button cancel-button"]');
    await this.frame.waitForTimeout(1000);
  }

  // 承認ルートを選択する
  async selectRoute(routeName) {
    await this.actionUtils.click(this.frame, '//tbody[@id="displayFieldApproveRouteResultBody"]//td[contains(text(), "' + routeName + '")]/..//a[contains(text(), "選択")]');
    await this.actionUtils.waitForLoading('#approveRouteName');
  }

  // 承認ルート名を取得する
  async getRouteName() {
    return await this.actionUtils.getText(this.frame, '//div[@id="approveRouteName"]/p');
  }

  // 支払依頼を出す
  async submit() {
    await this.actionUtils.click(this.frame, '#btn-confirm');
    await this.actionUtils.waitForLoading('#btn-approval');
    await this.actionUtils.click(this.frame, '#btn-approval');
  }

  // 支払依頼中の承認ルートテーブルにて、担当者と承認状況を取得する
  async getRequestingRow(no) {
    return {
      asignee: await this.actionUtils.getText(this.frame, '//section[@id="displayDetailApproveRouteTable"]/div[not(contains(@class, "header"))][' + no + ']/div[2]'),
      status: await this.actionUtils.getText(this.frame, '//section[@id="displayDetailApproveRouteTable"]/div[not(contains(@class, "header"))][' + no + ']/div[3]')
    };
  }

  // 差し戻す
  async reject() {
    await this.actionUtils.click(this.frame, '#rejectApproval');
    await this.actionUtils.waitForLoading('#btn-reject');
    await this.actionUtils.click(this.frame, '#btn-reject');
  }

  // 承認する
  async approve() {
    await this.actionUtils.click(this.frame, '#checkApproval');
    await this.actionUtils.waitForLoading('#btn-approve');
    await this.actionUtils.click(this.frame, '#btn-approve');
  }
}
exports.PaymentRequestPage = PaymentRequestPage;
