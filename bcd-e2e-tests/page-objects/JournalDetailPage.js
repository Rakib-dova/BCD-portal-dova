const { ActionUtils } = require('../utils/action-utils');

// 支払依頼一覧
class JournalDetailPage {

  // コンストラクタ
  constructor(browser, page) {
    this.browser = browser;
    this.page = page;
    this.actionUtils = new ActionUtils(browser, page);
  }

  // ページが表示されるまで待機する
  async waitForLoading() {
    let frame = await this.actionUtils.waitForLoading('//h4[contains(text(),"仕訳情報設定")]')
    this.frame = frame;
    return frame;
  }

  // ホームへ遷移する
  async clickHome() {
    await this.actionUtils.click(this.frame, '//*[contains(text(), "Home")]');
  }

  // 請求書番号を取得する
  async getInvoiceNo() {
    return await this.actionUtils.getText(this.frame, '//div[contains(text(), "請求書番号")]/../div[2]');
  }

  // 差出人を取得する
  async getSender() {
    return await this.actionUtils.getText(this.frame, '//p[contains(text(), "差出人")]/../div/div/p');
  }

  // 宛先を取得する
  async getReceiver() {
    return await this.actionUtils.getText(this.frame, '//p[contains(text(), "宛先")]/../div/div/p');
  }

  // 価格を取得する
  async getCost() {
    return await this.actionUtils.getText(this.frame, '//div[contains(text(), "合計")]/../div[2]');
  }

  // 仕訳情報の「+」をクリックする
  async clickAddBreakdown() {
    await this.actionUtils.click(this.frame, '//a[@class="btn-plus-accountCode" and @data-target="#lineNo1"]');
    await this.frame.waitForTimeout(1000);
  }

  // 仕訳情報の「-」をクリックする
  async clickDelBreakdown(no) {
    await this.actionUtils.click(this.frame, '//div[@id="lineNo1"]/div[' + no + ']//a[@class="red-color btn-minus-accountCode"]');
    await this.frame.waitForTimeout(1000);
  }

  // 仕訳情報入力フォームの行数を取得する
  async getBreakdownCount() {
    return (await this.actionUtils.getElements(this.frame, '//div[@id="lineNo1"]/div')).length;
  }

  // 仕訳情報入力フォームにて、指定の勘定科目、補助科目、部門コードが入力されているものを検索する
  async hasBreakdown(no, accountCode, subAccountCode, departmentCode) {
    return await this.actionUtils.getValue(this.frame, '#lineNo1_lineAccountCode' + no + '_accountCode') == accountCode
        && await this.actionUtils.getValue(this.frame, '#lineNo1_lineAccountCode' + no + '_subAccountCode') == subAccountCode
        && await this.actionUtils.getValue(this.frame, '#lineNo1_lineAccountCode' + no + '_departmentCode') == departmentCode;
  }

  // 仕訳情報入力フォーム内、全情報取得（10項目分）
  async getAllBreakdown() {
    let result = [];
    let i = 0;
    for (i = 0; i < 10; i++) {
      result.push({ accountCode: "", subAccountCode: "", departmentCode: "", cost: ""});
    }
    for (i = 0; i < 10; i++) {
      if (!await this.actionUtils.isExist(this.frame, '#lineNo1_lineAccountCode' + (i + 1))) {
        break;
      }
      result[i].accountCode = await this.actionUtils.getValue(this.frame, '#lineNo1_lineAccountCode' + (i + 1) + '_accountCode');
      result[i].subAccountCode = await this.actionUtils.getValue(this.frame, '#lineNo1_lineAccountCode' + (i + 1) + '_subAccountCode');
      result[i].departmentCode = await this.actionUtils.getValue(this.frame, '#lineNo1_lineAccountCode' + (i + 1) + '_departmentCode');
      result[i].cost = await this.actionUtils.getValue(this.frame, '#lineNo1_lineAccountCode' + (i + 1) + '_input_amount');
    }
    return result;
  }

  // 先頭の仕訳情報入力フォームにて、勘定科目の検索ポップアップを表示する
  async clickAccountCodeSearch() {
    await this.actionUtils.click(this.frame, '//div[@id="lineNo1"]//a[@data-target="accountCode-modal"]');
    await this.actionUtils.waitForLoading('#btnSearchAccountCode');
  }

  // 勘定科目、補助科目を検索する
  async searchAccount(accountCode, accountName, subAccountCode, subAccountName) {
    await this.actionUtils.fill(this.frame, '#searchModalAccountCode', accountCode);
    await this.actionUtils.fill(this.frame, '#searchModalAccountCodeName', accountName);
    await this.actionUtils.fill(this.frame, '#searchModalSubAccountCode', subAccountCode);
    await this.actionUtils.fill(this.frame, '#searchModalSubAccountCodeName', subAccountName);
    await this.actionUtils.click(this.frame, '#btnSearchAccountCode');
    await this.actionUtils.waitForLoading('//tbody[@id="displayFieldResultBody"]/tr');
  }

  // 勘定科目、補助科目の検索結果の有無を取得する
  async hasAccountRow(accountCode, subAccountCode) {
    return await this.actionUtils.isExist(this.frame, '//div[@id="displayInvisible"]//td[contains(text(), "' + accountCode + '")]/../td[contains(text(), "' + subAccountCode + '")]');
  }

  // 勘定科目、補助科目の検索結果をクリックする
  async clickAccountRow(accountCode, subAccountCode) {
    await this.actionUtils.click(this.frame, '//div[@id="displayInvisible"]//td[contains(text(), "' + accountCode + '")]/../td[contains(text(), "' + subAccountCode + '")]');
    await this.frame.waitForTimeout(1000);
  }

  // 先頭の仕訳情報入力フォームにて、部門データの検索ポップアップを表示する
  async clickDepartmentSearch() {
    await this.actionUtils.click(this.frame, '//div[@id="lineNo1"]//a[@data-target="departmentCode-modal"]');
    await this.actionUtils.waitForLoading('#btnSearchDepartmentCode');
  }

  // 部門データを検索する
  async searchDepartment(departmentCode, departmentName) {
    await this.actionUtils.fill(this.frame, '#searchModalDepartmentCode', departmentCode);
    await this.actionUtils.fill(this.frame, '#searchModalDepartmentCodeName', departmentName);
    await this.actionUtils.click(this.frame, '#btnSearchDepartmentCode');
    await this.actionUtils.waitForLoading('//tbody[@id="displayFieldDepartmentResultBody"]/tr');
  }

  // 部門データの検索結果の有無を取得する
  async hasDepartmentRow(departmentCode) {
    return await this.actionUtils.isExist(this.frame, '//div[@id="departmentResultDisplayInvisible"]//td[contains(text(), "' + departmentCode + '")]');
  }

  // 勘定科目、補助科目の検索結果をクリックする
  async clickDepartmentRow(departmentCode) {
    await this.actionUtils.click(this.frame, '//div[@id="departmentResultDisplayInvisible"]//td[contains(text(), "' + departmentCode + '")]');
    await this.frame.waitForTimeout(1000);
  }

  // 仕訳情報入力フォームの計上価格を入力する
  async inputBreakdownCost(no, cost) {
    await this.actionUtils.click(this.frame, '#btn_lineNo1_lineAccountCode' + no + '_installmentAmount');
    await this.actionUtils.fill(this.frame, '#inputInstallmentAmount', cost);
    await this.actionUtils.click(this.frame, '#btn-insert');
  }
  
  // 仕訳情報入力フォームの計上価格を取得する
  async getBreakdownCost(no) {
    return await this.actionUtils.getValue(this.frame, '#lineNo1_lineAccountCode' + no + '_input_amount');
  }

  // 仕訳情報一括設定ポップアップを表示する
  async clickBulkInsert() {
    await this.actionUtils.click(this.frame, '#btn-bulkInsert');
    await this.actionUtils.waitForLoading('#btn-bulk-insert');
  }

  // 仕訳情報一括設定ポップアップから、勘定科目の検索ポップアップを表示する
  async clickAccountCodeSearchOnBulk() {
    await this.actionUtils.click(this.frame, '//div[@id="bulkInsert-journal-modal"]//a[@data-target="accountCode-modal"]');
    await this.actionUtils.waitForLoading('#btnSearchAccountCode');
  }
  
  // 仕訳情報一括設定ポップアップから、部門データの検索ポップアップを表示する
  async clickDepartmentSearchOnBulk() {
    await this.actionUtils.click(this.frame, '//div[@id="bulkInsert-journal-modal"]//a[@data-target="departmentCode-modal"]');
    await this.actionUtils.waitForLoading('#btnSearchDepartmentCode');
  }

  // 仕訳情報一括設定ポップアップにて、項目IDのチェックを入れる
  async checkBulkON() {
    await this.actionUtils.check(this.frame, '//div[@id="field-invoiceLine"]//input[@class="isCheckedForInvoiceLine"]', true);
  }

  // 仕訳情報一括設定ポップアップの「反映」をクリックする
  async clickBulkOK() {
    await this.actionUtils.click(this.frame, '#btn-bulk-insert');
    await this.frame.waitForTimeout(1000);
  }
}
exports.JournalDetailPage = JournalDetailPage;
