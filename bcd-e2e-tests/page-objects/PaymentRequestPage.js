const { ActionUtils } = require('../utils/action-utils');
const comment = require('../utils/chai-with-reporting').comment;

// 支払依頼
class PaymentRequestPage {
  title = '支払依頼';

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

  
  // 仕訳情報入力フォームにて、勘定科目の検索ポップアップを表示する
  async clickAccountCodeSearch(no, isCredit) {
    let modalId = isCredit ? 'creditAccountCode-modal' : 'accountCode-modal';
    await this.actionUtils.click(this.frame, '//div[@id="lineNo' + no + '"]//a[@data-target="' + modalId + '"]');
    await this.actionUtils.waitForLoading('#' + modalId);
  }

  // 勘定科目、補助科目を検索する
  async searchAccount(isCredit, code, name, subCode, subName) {
    let elmId = isCredit ? 'Credit' : '';
    await this.actionUtils.fill(this.frame, '#searchModal' + elmId + 'AccountCode', code);
    await this.actionUtils.fill(this.frame, '#searchModal' + elmId + 'AccountCodeName', name);
    await this.actionUtils.fill(this.frame, '#searchModal' + elmId + 'SubAccountCode', subCode);
    await this.actionUtils.fill(this.frame, '#searchModal' + elmId + 'SubAccountCodeName', subName);
    await this.actionUtils.click(this.frame, '#btnSearch' + elmId + 'AccountCode');
    await this.actionUtils.waitForLoading('//tbody[@id="display' + elmId + 'FieldResultBody"]/tr');
  }

  // 勘定科目、補助科目の検索結果の有無を取得する
  async hasAccountRow(isCredit, code, subCode) {
    let elmId = isCredit ? 'Credit' : '';
    return await this.actionUtils.isExist(this.frame,
      '//tbody[@id="display' + elmId + 'FieldResultBody"]//td[contains(text(), "'
      + code + '")]/../td[contains(text(), "' + subCode + '")]');
  }

  // 勘定科目、補助科目の検索結果をクリックする
  async clickAccountRow(isCredit, code, subCode) {
    let elmId = isCredit ? 'Credit' : '';
    await this.actionUtils.click(this.frame,
      '//tbody[@id="display' + elmId + 'FieldResultBody"]//td[contains(text(), "'
      + code + '")]/../td[contains(text(), "' + subCode + '")]');
    await this.frame.waitForTimeout(1000);
  }

  // 仕訳情報にて、勘定科目・補助科目を選択する
  async selectAccountCode(no, isCredit, code, subCode) {
    await this.clickAccountCodeSearch(no, isCredit);
    await this.searchAccount(isCredit, code, '', subCode, '');
    await this.clickAccountRow(isCredit, code, subCode);
  }

  // 先頭の仕訳情報入力フォームにて、部門データの検索ポップアップを表示する
  async clickDepartmentSearch(no, isCredit) {
    let modalId = isCredit ? 'creditDepartmentCode-modal' : 'departmentCode-modal';
    await this.actionUtils.click(this.frame, '//div[@id="lineNo' + no + '"]//a[@data-target="' + modalId + '"]');
    await this.actionUtils.waitForLoading('#' + modalId);
  }

  // 部門データを検索する
  async searchDepartment(isCredit, code, name) {
    let elmId = isCredit ? 'Credit' : '';
    await this.actionUtils.fill(this.frame, '#searchModal' + elmId + 'DepartmentCode', code);
    await this.actionUtils.fill(this.frame, '#searchModal' + elmId + 'DepartmentCodeName', name);
    await this.actionUtils.click(this.frame, '#btnSearch' + elmId + 'DepartmentCode');
    await this.actionUtils.waitForLoading('//tbody[@id="display' + elmId + 'FieldDepartmentResultBody"]/tr');
  }

  // 部門データの検索結果の有無を取得する
  async hasDepartmentRow(isCredit, code) {
    let elmId = isCredit ? 'Credit' : '';
    return await this.actionUtils.isExist(this.frame,
      '//tbody[@id="display' + elmId + 'FieldDepartmentResultBody"]//td[contains(text(), "' + code + '")]');
  }

  // 部門データの検索結果をクリックする
  async clickDepartmentRow(isCredit, code) {
    let elmId = isCredit ? 'Credit' : '';
    await this.actionUtils.click(this.frame,
      '//tbody[@id="display' + elmId + 'FieldDepartmentResultBody"]//td[contains(text(), "' + code + '")]');
    await this.frame.waitForTimeout(1000);
  }

  // 仕訳情報にて、部門データを選択する
  async selectDepartment(no, isCredit, code) {
    await this.clickDepartmentSearch(no, isCredit);
    await this.searchDepartment(isCredit, code, '');
    await this.clickDepartmentRow(isCredit, code);
  }

  // 仕訳情報入力フォームにて、指定の勘定科目、補助科目、部門コードが入力されているものを検索する
  async hasBreakdown(lineNo, acNo, isCredit, accountCode, subAccountCode, departmentCode) {
    let xpathBase = '#lineNo' + lineNo + '_line' + (isCredit ? 'Credit' : '') + 'AccountCode' + acNo + '_';
    let xpathAccountCode = isCredit ? 'creditAccountCode' : 'accountCode';
    let xpathSubAccountCode = isCredit ? 'creditSubAccountCode' : 'subAccountCode';
    let xpathDepartmentCode = isCredit ? 'creditDepartmentCode' : 'departmentCode';
    return await this.actionUtils.getValue(this.frame, xpathBase + xpathAccountCode) == accountCode
        && await this.actionUtils.getValue(this.frame, xpathBase + xpathSubAccountCode) == subAccountCode
        && await this.actionUtils.getValue(this.frame, xpathBase + xpathDepartmentCode) == departmentCode;
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
    await this.actionUtils.waitForLoading('//tbody[@id="displayFieldApproveRouteResultBody"]/tr');
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
