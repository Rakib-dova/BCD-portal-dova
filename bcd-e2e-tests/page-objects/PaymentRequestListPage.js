const { ActionUtils } = require('../utils/action-utils');
const comment = require('../utils/chai-with-reporting').comment;

// 支払依頼一覧
class PaymentRequestListPage {
  title = '支払依頼一覧';

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
    let frame = await this.actionUtils.waitForLoading('//*[@class="hero-body-noImage"]/*[contains(text(),"支払依頼一覧")]')
    this.frame = frame;
    return frame;
  }

  // ホームへ遷移する
  async clickHome() {
    await this.addComment('「Home」をクリックする');
    await this.actionUtils.click(this.frame, '//*[contains(text(), "Home")]');
  }

  // 検索条件フォームの表示状態を確認する
  async isFormShown() {
    return await this.actionUtils.isDisplayed(this.frame, '#form');
  }

  // 検索条件フォーム：請求書番号を入力する
  async inputSearchInvoiceNo(invoiceNo) {
    await this.addComment(`「請求書番号」にて、"${invoiceNo}"と入力する`);
    await this.actionUtils.fill(this.frame, '#invoiceNumber', invoiceNo);
  }

  // 検索条件フォーム：請求書番号を取得する
  async getSearchInvoiceNo() {
    return await this.actionUtils.getValue(this.frame, '#invoiceNumber');
  }

  // 日付を入力する
  async inputDate(itemName, selector, date) {
    await this.addComment(`「${itemName}」にて、"${date}"と入力する`);
    let elm = await this.actionUtils.getElement(this.frame, selector);
    let dates = date.split('-');
    await elm.type(dates[0]);
    await elm.press('Tab');
    await elm.type(dates[1] + dates[2]);
  }

  // 検索条件フォーム：発行日を入力する
  async inputSearchIssueDate(min, max) {
    if (min) {
      await this.inputDate('発行日（開始日）', '#minIssuedate', min);
    }
    if (max) {
      await this.inputDate('発行日（終了日）', '#maxIssuedate', max);
    }
  }

  // 検索条件フォーム：発行日を取得する
  async getSearchIssueDate() {
    return {
      min: await this.actionUtils.getValue(this.frame, '#minIssuedate'),
      max: await this.actionUtils.getValue(this.frame, '#maxIssuedate')
    }
  }

  // 検索条件フォーム：送信企業を入力する
  async inputSearchSendTo(sender) {
    await this.addComment(`「送信企業」にて、"${sender}"と入力する`);
    await this.actionUtils.fill(this.frame, '#sendTo', sender);
    await this.addComment('「送信企業」にて、「検索」をクリックする');
    await this.actionUtils.click(this.frame, '#sendToSearchBtn');
    await this.actionUtils.waitForLoading('//div[@id="displaySendToSearchResultField"]/div');
  }

  // 送信企業を選択する
  async selectSearchSendTo(sender) {
    await this.addComment(`「送信企業」の検索結果から、"${sender}"を選択する`);
    await this.actionUtils.click(this.frame, `//div[@id="displaySendToSearchResultField"]//label[contains(text(), "${sender}")]`);
  }

  // 検索条件フォーム：送信企業を取得する
  async getSearchSendTo() {
    return await this.actionUtils.getValue(this.frame, '#sendTo');
  }

  // 検索条件フォーム：承認ステータスを選択する
  async checkSearchStatus(status) {
    const statusValues = {
      '未処理' : '80',
      '支払依頼中' : '10',
      '一次承認済み' : '11',
      '二次承認済み' : '12',
      '三次承認済み' : '13',
      '四次承認済み' : '14',
      '五次承認済み' : '15',
      '六次承認済み' : '16',
      '七次承認済み' : '17',
      '八次承認済み' : '18',
      '九次承認済み' : '19',
      '十次承認済み' : '20',
      '最終承認済み' : '00',
      '差し戻し' : '90',
    }
    await this.addComment(`「承認ステータス」にて、"${status}"にチェックを入れる`);
    let i = 0;
    for (i = 0; i < status.length; i++) {
      await this.actionUtils.check(this.frame, `//input[contains(@name, "status") and @value="${statusValues[status[i]]}"]`, true);
    }
  }

  // 検索条件フォーム：チェックされている承認ステータスを取得する
  async getSearchStatusCheckedCount() {
    let status = await this.actionUtils.getEachElementsIsChecked(this.frame, '//input[contains(@name, "status")]');
    let i = 0;
    let result = 0;
    for (i = 0; i < status.length; i++) {
      if (status[i]) {
        result++;
      }
    }
    return result;
  }

  // 検索条件フォーム：担当者アドレスを入力する
  async inputSearchMail(mail) {
    await this.addComment('「担当者アドレス」にて、"' + mail + '"と入力する');
    await this.actionUtils.fill(this.frame, '#managerAddress', mail);
  }

  // 検索条件フォーム：担当者アドレスを取得する
  async getSearchMail() {
    return await this.actionUtils.getValue(this.frame, '#managerAddress');
  }

  // 検索条件フォーム：担当者不明の請求書にチェックを入れる
  async checkUnknownManager(check) {
    await this.addComment('「担当者不明の請求書」' + (check ? 'にチェックを入れる' : 'のチェックを外す'));
    await this.actionUtils.check(this.frame, '', check);
  }

  // 検索条件を入力する
  async inputCondition(invoiceNo, minIssueDate, maxIssueDate, sendTo, status, mail, unKnownManager) {
    await this.inputSearchInvoiceNo(invoiceNo);
    await this.inputSearchIssueDate(minIssueDate, maxIssueDate);
    await this.inputSearchSendTo(sendTo);
    await this.checkSearchStatus(status);
    await this.inputSearchMail(mail);
    await this.checkUnknownManager(unKnownManager);
  }

  // 検索条件フォーム：「検索」をクリックする
  async clickSearch() {
    await this.addComment('「検索」をクリックする');
    await this.actionUtils.click(this.frame, '#BtnInboxSearch');
    await this.page.waitForTimeout(10000);
  }

  // 検索条件フォーム：「クリア」をクリックする
  async clickSearchClear() {
    await this.addComment('「クリア」をクリックする');
    await this.actionUtils.click(this.frame, '#btnInboxSearchClear');
  }

  // 検索条件フォーム：条件未入力の状態で「検索」をクリックする
  async clickSearchWithoutConditions() {
    let msg;
    const newPromise = new Promise(resolve => {
      this.page.once('dialog', async dialog => {
        msg = dialog.message();
        await dialog.accept('OK');
        resolve();
      });
    });
    await this.actionUtils.click(this.frame, '#BtnInboxSearch');
    await newPromise;
    return msg;
  }

  // 「検索機能を利用」ボタンの表示状態を確認する
  async isLightPlanShown() {
    return await this.actionUtils.isDisplayed(this.frame, '//a[@data-target="information-lightplan"]');
  }

  // 「検索機能を利用」ボタンをクリックする
  async clickLightPlan() {
    await this.addComment('「検索機能を利用」ボタンをクリックする');
    await this.actionUtils.click(this.frame, '//a[@data-target="information-lightplan"]');
  }

  // 検索結果件数を取得する
  async getResultCount() {
    let resultCount = await this.actionUtils.getText(this.frame, '//div[@id="informationTab"]/table/thead/tr/th');
    return resultCount.split('/')[1];
  }

  // 指定の請求書が見つかるまでページングを行う
  async paging(invoiceNo) {
    var pages = await this.actionUtils.getElements(this.frame, '//ul[@class="pagination-list"]/li');
    var i = 0;
    for (i = 0; i < pages.length; i++) {
      if (await this.actionUtils.isExist(this.frame, '//table//td[contains(text(), "' + invoiceNo + '")]')) {
        return;
      }
      await pages[i + 1].click();
      await this.frame.waitForTimeout(30000);
    }
  }

  // 支払依頼リストに、指定した番号の請求書が表示されているか確認する
  async hasRow(invoiceNo) {
    return await this.actionUtils.isExist(this.frame, '//div[@id="informationTab"]//td[contains(text(), "' + invoiceNo + '")]');
  }

  // 支払依頼リスト内、全ての行の送信企業を取得する
  async getAllSenders() {
    let trPath = '//div[@id="informationTab"]/table/tbody/tr';
    let rowCount = (await this.actionUtils.getElements(this.frame, '//div[@id="informationTab"]/table/tbody/tr')).length;
    let i = 0;
    let result = [];
    for (i = 0; i < rowCount; i++) {
      let sender = await this.actionUtils.getText(this.frame, `${trPath}/td[6]`);
      if (!result.includes(sender)) {
        result.push(sender);
      }
    }
    return result;
  }

  // 承認ステータスを取得する
  async getApproveStatus(invoiceNo) {
    await this.paging(invoiceNo);
    return await this.actionUtils.getText(this.frame, '//table//td[contains(text(), "' + invoiceNo + '")]/../td[3]/a');
  }

  async getAllStatus() {

  }

  // 金額を取得する
  async getCost(invoiceNo) {
    await this.paging(invoiceNo);
    return await this.actionUtils.getText(this.frame, '//table//td[contains(text(), "' + invoiceNo + '")]/../td[5]');
  }

  // 差出人を取得する
  async getSender(invoiceNo) {
    await this.paging(invoiceNo);
    return await this.actionUtils.getText(this.frame, '//table//td[contains(text(), "' + invoiceNo + '")]/../td[6]');
  }

  // 仕訳情報設定ページへ遷移する
  async clickDetail(invoiceNo) {
    await this.addComment('請求書番号"' + invoiceNo + '"にて、「仕訳情報設定」をクリックする');
    await this.paging(invoiceNo);
    await this.actionUtils.click(this.frame, '//table//td[contains(text(), "' + invoiceNo + '")]/..//a[contains(text(), "仕訳情報設定")]');
  }

  // 仕訳情報設定ページへ遷移する
  async clickFirstDetail() {
    await this.addComment('先頭行の「仕訳情報設定」をクリックする');
    await this.actionUtils.click(this.frame, '//table//a[contains(text(), "仕訳情報設定")]');
  }

  // 承認待ちタブを表示する
  async clickConstruct() {
    await this.addComment('「承認待ち」タブをクリックする');
    await this.actionUtils.click(this.frame, '#constructTab');
    await this.actionUtils.waitForLoading('#constructTab');
  }

  // 承認待ちリストに、任意の請求書が表示されているか確認する
  async hasConstructRow(invoiceNo) {
    return await this.actionUtils.isExist(this.frame, '//div[@id="constructTab"]//td[contains(text(), "' + invoiceNo + '")]');
  }

  // 承認待ちリスト内のステータスを取得する
  async getConstructStatus(invoiceNo) {
    return await this.actionUtils.getText(this.frame, '//div[@id="constructTab"]//td[contains(text(), "' + invoiceNo + '")]/..//a[contains(@class, "approveStatus")]');
  }

  // 承認待ちリスト内、任意の請求書の支払依頼ページへ遷移する
  async clickConstructDetail(invoiceNo) {
    await this.addComment('請求書番号"' + invoiceNo + '"にて、「依頼内容確認」をクリックする');
    await this.actionUtils.click(this.frame, '//div[@id="constructTab"]//td[contains(text(), "' + invoiceNo + '")]/..//a[contains(text(), "依頼内容確認")]');
  }

  // ポップアップが表示されるまで待機する
  async waitPopup() {
    await this.actionUtils.waitForLoading('//*[@class="notification is-info animate__animated animate__faster"]');
    await this.frame.waitForTimeout(500);
  }

  // ポップアップメッセージを取得する
  async getPopupMessage() {
    return await this.actionUtils.getText(this.frame, '//*[@class="notification is-info animate__animated animate__faster"]');
  }

  // ポップアップを閉じる
  async closePopup() {
    await this.addComment('メッセージを閉じる');
    await this.actionUtils.click(this.frame, '//*[@class="notification is-info animate__animated animate__faster"]/button');
    await this.frame.waitForTimeout(500);
  }
}
exports.PaymentRequestListPage = PaymentRequestListPage;
