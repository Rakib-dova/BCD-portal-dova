const { ActionUtils } = require('../utils/action-utils');
const comment = require('../utils/chai-with-reporting').comment;

// 仕訳情報設定
class JournalDetailPage {
  title = '仕訳情報設定';

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
    let frame = await this.actionUtils.waitForLoading('//h4[contains(text(),"仕訳情報設定")]')
    this.frame = frame;
    return frame;
  }

  // ホームへ遷移する
  async clickHome() {
    await this.addComment('「Home」をクリックする');
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
  async clickAddBreakdown(lineNo) {
    await this.addComment('「仕訳情報」にて、「＋」をクリックする');
    await this.actionUtils.click(this.frame, '//a[@class="btn-plus-accountCode" and @data-target="#lineNo' + lineNo + '"]');
    await this.frame.waitForTimeout(1000);
  }

  // 仕訳情報の「-」をクリックする
  async clickDelBreakdown(lineNo, acNo) {
    await this.addComment('「仕訳情報」にて、「-」をクリックする');
    await this.actionUtils.click(this.frame, '//div[@id="lineNo' + lineNo + '_lineAccountCode' + acNo + '"]//a[@class="red-color btn-minus-accountCode"]');
    await this.frame.waitForTimeout(1000);
  }

  // 仕訳情報入力フォームの行数を取得する
  async getBreakdownCount() {
    return (await this.actionUtils.getElements(this.frame, '//div[@id="lineNo1"]/div[contains(@class, "lineAccountcode")]')).length;
  }

  // 仕訳情報入力フォームにて、指定の勘定科目、補助科目、部門コードが入力されているものを検索する
  async hasBreakdown(lineNo, acNo, isCredit, accountCode, subAccountCode, departmentCode) {
    let xpathBase = '//div[@id="lineNo' + lineNo + '"]/div[contains(@class, "lineAccountcode")][' + acNo + ']/div[' + (isCredit ? '3' : '1') + ']/table/tbody';
    let actual = {
      accountCode: await this.actionUtils.getValue(this.frame, xpathBase + '/tr[1]//input[@type="text"]'),
      subAccountCode: await this.actionUtils.getValue(this.frame, xpathBase + '/tr[2]//input[@type="text"]'),
      departmentCode: await this.actionUtils.getValue(this.frame, xpathBase + '/tr[3]//input[@type="text"]')
    };
    return (actual.accountCode == accountCode && actual.subAccountCode == subAccountCode && actual.departmentCode == departmentCode);
  }

  // 仕訳情報入力フォーム内、全情報取得
  async getAllBreakdown(lineNo) {
    let result = [];
    let i = 0;
    for (i = 0; i < 10; i++) {
      let xpathBase = '//div[@id="lineNo' + lineNo + '"]/div[contains(@class, "lineAccountcode")][' + (i + 1) + ']';
      if (!await this.actionUtils.isExist(this.frame, xpathBase)) {
        break;
      }
      result.push({
        accountCode: await this.actionUtils.getValue(this.frame, xpathBase + '/div[1]/table/tbody/tr[1]//input[@type="text"]'),
        subAccountCode: await this.actionUtils.getValue(this.frame, xpathBase + '/div[1]/table/tbody/tr[2]//input[@type="text"]'),
        departmentCode: await this.actionUtils.getValue(this.frame, xpathBase + '/div[1]/table/tbody/tr[3]//input[@type="text"]'),        
        creditAccountCode: await this.actionUtils.getValue(this.frame, xpathBase + '/div[3]/table/tbody/tr[1]//input[@type="text"]'),
        creditSubAccountCode: await this.actionUtils.getValue(this.frame, xpathBase + '/div[3]/table/tbody/tr[2]//input[@type="text"]'),
        creditDepartmentCode: await this.actionUtils.getValue(this.frame, xpathBase + '/div[3]/table/tbody/tr[3]//input[@type="text"]'),
        cost: await this.actionUtils.getValue(this.frame, '#lineNo' + lineNo + '_lineAccountCode' + (i + 1) + '_input_amount')
      });
    }
    return result;
  }

  // 仕訳情報内の検索ボタンの有無を確認する
  async isSearchVisible() {
    return await this.actionUtils.isExist(this.frame, '//a[@data-target="accountCode-modal"]');
  }

  // 仕訳情報入力フォームにて、勘定科目の検索ポップアップを表示する
  async clickAccountCodeSearch(lineNo, acNo, isCredit) {
    let modalId = isCredit ? 'creditAccountCode-modal' : 'accountCode-modal';
    await this.addComment('「仕訳情報」の勘定科目にて、「検索」をクリックする');
    await this.actionUtils.click(this.frame, '//div[@id="lineNo' + lineNo + '_lineAccountCode' + acNo + '"]//a[@data-target="' + modalId + '"]');
    await this.actionUtils.waitForLoading('#' + modalId);
  }

  // 勘定科目、補助科目を検索する
  async searchAccount(isCredit, code, name, subCode, subName) {
    let elmId = isCredit ? 'Credit' : '';
    await this.addComment('「勘定科目コード」にて、"' + code + '"と入力する');
    await this.actionUtils.fill(this.frame, '#searchModal' + elmId + 'AccountCode', code);
    await this.addComment('「勘定科目名」にて、"' + name + '"と入力する');
    await this.actionUtils.fill(this.frame, '#searchModal' + elmId + 'AccountCodeName', name);
    await this.addComment('「補助科目コード」にて、"' + subCode + '"と入力する');
    await this.actionUtils.fill(this.frame, '#searchModal' + elmId + 'SubAccountCode', subCode);
    await this.addComment('「補助科目名」にて、"' + subName + '"と入力する');
    await this.actionUtils.fill(this.frame, '#searchModal' + elmId + 'SubAccountCodeName', subName);
    await this.addComment('「検索」をクリックする');
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
    await this.addComment('検索結果をクリックする');
    let xpath = '//tbody[@id="display' + elmId + 'FieldResultBody"]';
    xpath += subCode ? '/tr[@data-account-code="' + code + '" and @data-sub-account-code="' + subCode + '"]' : '/tr[@data-account-code="' + code + '"]';
    await this.actionUtils.click(this.frame, xpath);
    await this.frame.waitForTimeout(1000);
  }

  // 仕訳情報内、借方の勘定科目数を取得する
  async getAccountCodeCount(lineNo) {
    let xpath = (lineNo < 1 ? '//div[contains(@id, "lineNo")]' : '//div[@id="lineNo' + lineNo + '"]') + '/div[contains(@class, "lineAccountcode")]';
    let elements = await this.actionUtils.getElements(this.frame, xpath);
    return elements.length;
  }

  // 仕訳情報にて、勘定科目・補助科目を選択する
  async selectAccountCode(lineNo, acNo, isCredit, code, subCode) {
    if (!(await this.actionUtils.isExist(this.frame, '//div[@id="lineNo' + lineNo + '_lineAccountCode' + acNo + '"]'))) {
      await this.clickAddBreakdown(lineNo);
    }
    await this.clickAccountCodeSearch(lineNo, acNo, isCredit);
    await this.searchAccount(isCredit, code, '', subCode, '');
    await this.clickAccountRow(isCredit, code, subCode);
  }

  // 先頭の仕訳情報入力フォームにて、部門データの検索ポップアップを表示する
  async clickDepartmentSearch(lineNo, acNo, isCredit) {
    await this.addComment('「仕訳情報」の部門データにて、「検索」をクリックする');
    let modalId = isCredit ? 'creditDepartmentCode-modal' : 'departmentCode-modal';
    await this.actionUtils.click(this.frame, '//div[@id="lineNo' + lineNo + '_lineAccountCode' + acNo + '"]//a[@data-target="' + modalId + '"]');
    await this.actionUtils.waitForLoading('#' + modalId);
  }

  // 部門データを検索する
  async searchDepartment(isCredit, code, name) {
    let elmId = isCredit ? 'Credit' : '';
    await this.addComment('「部門コード」にて、"' + code + '"と入力する');
    await this.actionUtils.fill(this.frame, '#searchModal' + elmId + 'DepartmentCode', code);
    await this.addComment('「部門名」にて、"' + name + '"と入力する');
    await this.actionUtils.fill(this.frame, '#searchModal' + elmId + 'DepartmentCodeName', name);
    await this.addComment('「検索」をクリックする');
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
    await this.addComment('検索結果をクリックする');
    await this.actionUtils.click(this.frame,
      '//tbody[@id="display' + elmId + 'FieldDepartmentResultBody"]//td[contains(text(), "' + code + '")]');
    await this.frame.waitForTimeout(1000);
  }

  // 仕訳情報にて、部門データを選択する
  async selectDepartment(lineNo, acNo, isCredit, code) {
    if (!(await this.actionUtils.isExist(this.frame, '//div[@id="lineNo' + lineNo + '_lineAccountCode' + acNo + '"]'))) {
      await this.clickAddBreakdown(lineNo);
    }
    await this.clickDepartmentSearch(lineNo, acNo, isCredit);
    await this.searchDepartment(isCredit, code, '');
    await this.clickDepartmentRow(isCredit, code);
  }

  // 仕訳情報入力フォームの計上価格を入力する
  async inputBreakdownCost(lineNo, acNo, cost) {
    await this.addComment('「仕訳情報」の「計上価格」にて、"' + cost + '"と入力する');
    await this.actionUtils.click(this.frame, '//a[@data-input="lineNo' + lineNo + '_lineAccountCode' + acNo + '_input_amount"]');
    await this.actionUtils.fill(this.frame, '#inputInstallmentAmount', cost);
    await this.actionUtils.click(this.frame, '#btn-insert');
  }

  // 仕訳情報入力フォームの計上価格を取得する
  async getBreakdownCost(no) {
    return await this.actionUtils.getValue(this.frame, '#lineNo1_lineAccountCode' + no + '_input_amount');
  }

  // 仕訳情報一括設定ポップアップを表示する
  async clickBulkInsert() {
    await this.addComment('「仕訳情報一括入力」にて、「一括入力」をクリックする');
    await this.actionUtils.click(this.frame, '#btn-bulkInsert');
    await this.actionUtils.waitForLoading('#btn-bulk-insert');
  }

  // 仕訳情報一括設定ポップアップにて、仕訳情報を追加する
  async clickAddBreakdownOnBulk() {
    await this.addComment('「仕訳情報一括設定」にて、「＋」をクリックする');
    await this.actionUtils.click(this.frame,'#btn-plus-accountCode-bulkInsert-modal');
  }

  // 仕訳情報一括設定ポップアップから、勘定科目の検索ポップアップを表示する
  async clickAccountCodeSearchOnBulk(acNo, isCredit) {
    await this.addComment('「仕訳情報一括設定」の「勘定科目コード」にて、「検索」をクリックする');
    let dataInfo = 'bulkInsertNo1_line' + (isCredit ? 'Credit' : '') + 'AccountCode' + acNo;
    let modalId = isCredit ? 'creditAccountCode-modal' : 'accountCode-modal';
    await this.actionUtils.click(this.frame, '//div[@id="bulkInsert-journal-modal"]//a[@data-info="' + dataInfo +'" and @data-target="' + modalId + '"]');
    await this.actionUtils.waitForLoading('#' + modalId);
  }
  
  // 仕訳情報一括設定ポップアップから、部門データの検索ポップアップを表示する
  async clickDepartmentSearchOnBulk(acNo, isCredit) {
    await this.addComment('「仕訳情報一括設定」の「部門コード」にて、「検索」をクリックする');
    let dataInfo = 'bulkInsertNo1_line' + (isCredit ? 'Credit' : '') + 'AccountCode' + acNo;
    let modalId = isCredit ? 'creditDepartmentCode-modal' : 'departmentCode-modal';
    await this.actionUtils.click(this.frame, '//div[@id="bulkInsert-journal-modal"]//a[@data-info="' + dataInfo +'" and @data-target="' + modalId + '"]');
    await this.actionUtils.waitForLoading('#' + modalId);
  }

  // 仕訳情報一括設定ポップアップにて、項目IDのチェックを入れる
  async checkBulkON(lineNo) {
    await this.addComment('「仕訳情報一括設定」にて、' + lineNo + '番目の項目IDにチェックを入れる');
    await this.actionUtils.check(this.frame, '//div[contains(@class, "column-invoiceLine-journalModal")][' + lineNo + ']//input[@class="isCheckedForInvoiceLine"]', true);
  }

  // 仕訳情報一括設定ポップアップの「反映」をクリックする
  async clickBulkOK() {
    await this.addComment('「仕訳情報一括設定」にて、「反映」をクリックする');
    await this.actionUtils.click(this.frame, '#btn-bulk-insert');
    await this.frame.waitForTimeout(1000);
  }

  // 入力内容を保存する
  async save() {
    await this.addComment('「保存」をクリックする');
    await this.actionUtils.click(this.frame, '//a[contains(text(), "保存")]');
    await this.actionUtils.waitForLoading('//*[@class="notification is-info animate__animated animate__faster"]');
    await this.actionUtils.click(this.frame, '//*[@class="notification is-info animate__animated animate__faster"]/button');
  }

  // 支払い依頼ページへ遷移する
  async clickPaymentRequest() {
    await this.addComment('「支払依頼へ」をクリックする');
    let xpath = '//a[contains(text(), "支払依頼へ")]';
    await this.actionUtils.waitForLoading(xpath);
    await this.actionUtils.click(this.frame, xpath);
    await this.frame.waitForTimeout(500);

    // 仕訳情報設定確認ポップアップが表示された場合、「OK」をクリックする
    if (await this.actionUtils.isExist(this.frame, '//div[@id="check-journalize-modal" and @class="modal is-active"]')) {
      await this.addComment('仕訳情報設定確認ポップアップにて、「OK」をクリックする');
      await this.actionUtils.click(this.frame, '//div[@id="check-journalize-modal"]//a[text()="OK"]');
    }
  }
}
exports.JournalDetailPage = JournalDetailPage;
