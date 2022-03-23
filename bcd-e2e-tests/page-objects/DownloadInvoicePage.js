const { ActionUtils } = require('../utils/action-utils');
class DownloadInvoicePage {

  constructor(browser, page) {
    this.browser = browser;
    this.page = page;
    this.actionUtils = new ActionUtils(browser, page);
  }

  // ページが表示されるまで待機する
  async waitForLoading() {
    let frame = await this.actionUtils.waitForLoading('"CSV DOWNLOAD"')
    this.frame = frame;
    return frame;
  }

  // タイトルを取得する
  async getTitle() {
    return await this.actionUtils.getText(this.frame, 'section .title');
  }

  // 請求書番号を入力する
  async inputInvoiceNumber(invoiceNumber) {
    await this.actionUtils.fill(this.frame, '#invoiceNumber', invoiceNumber)
  }

  // ステータスを設定する
  async setInvoiceStatuses(invoiceStatuses) {
    await this.actionUtils.check(this.frame, 'input[value="送信済み/受信済み"]', invoiceStatuses[0]);
    await this.actionUtils.check(this.frame, 'input[value="受理済み"]', invoiceStatuses[1]);
    await this.actionUtils.check(this.frame, 'input[value="送金済み"]', invoiceStatuses[2]);
    await this.actionUtils.check(this.frame, 'input[value="入金確認済み"]', invoiceStatuses[3]);
  }

  // ステータスを取得する
  async getInvoiceStatuses() {
    const statuses = [];
    statuses.push(await this.actionUtils.isChecked(this.frame, 'input[value="送信済み/受信済み"]'));
    statuses.push(await this.actionUtils.isChecked(this.frame, 'input[value="受理済み"]'));
    statuses.push(await this.actionUtils.isChecked(this.frame, 'input[value="送金済み"]'));
    statuses.push(await this.actionUtils.isChecked(this.frame, 'input[value="入金確認済み"]'));
    return statuses;
  }

  // 販売/購入を設定する
  async setBuyAndSell(text) {
    await this.actionUtils.selectByXpath(this.frame, '//*[@id="buyAndSell"]', text);
  }

  // 販売/購入の設定値を取得する
  async getBuyAndSell() {
    return await this.actionUtils.getValue(this.frame, '#buyAndSell');
  }

  // 発行日を設定する ※スラッシュ区切り 例：2021/08/01
  async setIssuedate(from, to) {
    // 検索範囲の開始日
    const fromList = from.split('/');
    await this.actionUtils.type(this.frame, '#minIssuedate', `00${fromList[0]}${fromList[1]}${fromList[2]}`); // 例：0020210801 を入力(日本仕様)
    if ((await this.getIssuedate()).from != `${fromList[0]}-${fromList[1]}-${fromList[2]}`) { // 2021-08-01 が取得できるか
      await this.actionUtils.type(this.frame, '#minIssuedate', `${fromList[1]}${fromList[2]}${fromList[0]}`); // できなければ、08012021 を入力(海外仕様)
    }
    // 検索範囲の終了日
    const toList = to.split('/');
    await this.actionUtils.type(this.frame, '#maxIssuedate', `00${toList[0]}${toList[1]}${toList[2]}`);
    if ((await this.getIssuedate()).to != `${toList[0]}-${toList[1]}-${toList[2]}`) {
      await this.actionUtils.type(this.frame, '#maxIssuedate', `${toList[1]}${toList[2]}${toList[0]}`);
    }
  }

  // 発行日の設定値を取得する
  async getIssuedate() {
    const from = await this.actionUtils.getValue(this.frame, '#minIssuedate');
    const to = await this.actionUtils.getValue(this.frame, '#maxIssuedate');
    return { from, to };
  }

  // 送信企業を検索する
  async searchSendCompany(text) {
    //　検索キーワードを入力する
    await this.actionUtils.fill(this.frame, '#sendTo', text);
    //　検索ボタンをクリックする
    let count = 0;
    await this.actionUtils.click(this.frame, '#sendToSearchBtn');
    await this.page.waitForTimeout(5000);
    while (count < 3 && !(await this.actionUtils.isDisplayed(this.frame, '#invisibleSentToBtn'))) {
      // 検索エリアが表示されなければ、再度検索ボタンをクリックする
      await this.actionUtils.click(this.frame, '#sendToSearchBtn');
      await this.page.waitForTimeout(5000);
      count++;
    }
  }

  // 送信企業の検索キーワードを取得する
  async getSendCompanySearchKeyword() {
    return await this.actionUtils.getValue(this.frame, '#sendTo');
  }

  // 送信企業の選択ボタンが存在するか
  async isSendCompanySelectBtnExist() {
    await this.actionUtils.waitForLoading('#invisibleSentToBtn')
    return (await this.actionUtils.isExist(this.frame, '#allSelectSentToBtn'))
      && (await this.actionUtils.isExist(this.frame, '#allClearSentToBtn'))
      && (await this.actionUtils.isExist(this.frame, '#invisibleSentToBtn'))
  }

  // 送信企業の全選択ボタンをクリックする
  async clickSendCompanyAllSelectBtn() {
    await this.actionUtils.click(this.frame, '#allSelectSentToBtn');
  }

  // 送信企業の全解除ボタンをクリックする
  async clickSendCompanyAllClearBtn() {
    await this.actionUtils.click(this.frame, '#allClearSentToBtn');
  }

  // 送信企業を選択する
  async selectSendCompanies(companies) {
    for (const company of companies) {
      await this.actionUtils.click(this.frame, `//*[@id="searchResultBox"]//label[text()="${company}"]/input`);
    }
  }

  // 送信企業の検索結果を取得する
  async getSendCompanyNames() {
    return await this.actionUtils.getTexts(this.frame, '#searchResultBox label');
  }

  // 選択された送信企業を取得する
  async getSelectedSendCompanies() {
    const companyNames = await this.actionUtils.getTexts(this.frame, '#searchResultBox label');
    const isCheckedCompanies = await this.actionUtils.getEachElementsIsChecked(this.frame, '#searchResultBox input');
    const selectedCompanies = [];
    for (let i = 0; i < companyNames.length; i++) {
      if (isCheckedCompanies[i]) {
        selectedCompanies.push(companyNames[i]);
      }
    }
    return selectedCompanies;
  }

  // 受信企業を検索する
  async searchReceiveCompany(text) {
    //　検索キーワードを入力する
    await this.actionUtils.fill(this.frame, '#sendBy', text);
    //　検索ボタンをクリックする
    let count = 0;
    await this.actionUtils.click(this.frame, '#sendBySearchBtn');
    await this.page.waitForTimeout(5000);
    while (count < 3 && !(await this.actionUtils.isDisplayed(this.frame, '#invisibleSentByBtn'))) {
      // 検索エリアが表示されなければ、再度検索ボタンをクリックする
      await this.actionUtils.click(this.frame, '#sendBySearchBtn');
      await this.page.waitForTimeout(5000);
      count++;
    }
  }

  // 受信企業の検索キーワードを取得する
  async getReceiveCompanySearchKeyword() {
    return await this.actionUtils.getValue(this.frame, '#sendBy');
  }

  // 受信企業の選択ボタンが存在するか
  async isReceiveCompanySelectBtnExist() {
    return (await this.actionUtils.isExist(this.frame, '#allSelectSentByBtn'))
      && (await this.actionUtils.isExist(this.frame, '#allClearSentByBtn'))
      && (await this.actionUtils.isExist(this.frame, '#invisibleSentByBtn'))
  }

  // 受信企業の全選択ボタンをクリックする
  async clickReceiveCompanyAllSelectBtn() {
    await this.actionUtils.click(this.frame, '#allSelectSentByBtn');
  }

  // 受信企業の全解除ボタンをクリックする
  async clickReceiveCompanyAllClearBtn() {
    await this.actionUtils.click(this.frame, '#allClearSentByBtn');
  }

  // 受信企業を選択する
  async selectReceiveCompanies(companies) {
    for (const company of companies) {
      await this.actionUtils.click(this.frame, `//*[@id="searchResultSentByBox"]//*[text()="${company}"]`);
    }
  }

  // 受信企業の検索結果を取得する
  async getReceiveCompanyNames() {
    return await this.actionUtils.getTexts(this.frame, '#searchResultSentByBox label');
  }

  async getSelectedReceiveCompanies() {
    const companyNames = await this.actionUtils.getTexts(this.frame, '#searchResultSentByBox label');
    const isCheckedCompanies = await this.actionUtils.getEachElementsIsChecked(this.frame, '#searchResultSentByBox input');
    const selectedCompanies = [];
    for (let i = 0; i < companyNames.length; i++) {
      if (isCheckedCompanies[i]) {
        selectedCompanies.push(companyNames[i]);
      }
    }
    return selectedCompanies;
  }

  // CSVダウンロードボタンが存在するか
  async isCsvDownloadBtnExist() {
    return await this.actionUtils.isExist(this.frame, '"CSVダウンロード"');
  }

  // CSVダウンロードボタンをクリックする
  async clickCsvDownloadBtn() {
    return await this.actionUtils.downloadFile(this.frame, '"CSVダウンロード"');
  }

  // Homeへ戻る
  async moveHome() {
    await this.actionUtils.click(this.frame, '"Home"');
  }
}
exports.DownloadInvoicePage = DownloadInvoicePage;
