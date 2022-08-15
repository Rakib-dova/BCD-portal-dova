const { ActionUtils } = require('../utils/action-utils');
class UploadFormatSettingPage {

  constructor(browser, page) {
    this.browser = browser;
    this.page = page;
    this.actionUtils = new ActionUtils(browser, page);
  }

  // ページが表示されるまで待機する
  async waitForLoading() {
    let frame = await this.actionUtils.waitForLoading('//*[text()="請求書アップロードフォーマット設定"]')
    this.frame = frame;
    return frame;
  }

  // タイトルを取得する
  async getTitle() {
    return await this.actionUtils.isExist(this.frame, '//*[text()="請求書アップロードフォーマット設定"]');
  }

  // 基本情報変更ページに遷移する(編集画面のみ表示)
  async goBasicPage() {
    await this.actionUtils.click(this.frame, '#editCsvBasicFormatBtn')
  }

  // 項目名を取得
  async getHeaders() {
    return await this.actionUtils.getTexts(this.frame, '//tbody/tr/th[@name="dataContent"][2]');
  }

  // データ内容を取得
  async getDatas() {
    return await this.actionUtils.getTexts(this.frame, '//tbody/tr/th[@name="dataContent"][3]');
  }

  // データ番号の選択肢を取得
  async getOptions() {
    return await this.actionUtils.getTexts(this.frame, '#issueDate option');
  }

  // 各データ番号を設定する
  async setNumbers(numbers) {
    await this.actionUtils.selectByXpath(this.frame, '//*[@id="issueDate"]', numbers.issueDate)
    await this.actionUtils.selectByXpath(this.frame, '//*[@id="invoiceNumber"]', numbers.invoiceNumber)
    await this.actionUtils.selectByXpath(this.frame, '//*[@id="tenantId"]', numbers.tenantId)
    await this.actionUtils.selectByXpath(this.frame, '//*[@id="paymentDate"]', numbers.paymentDate)
    await this.actionUtils.selectByXpath(this.frame, '//*[@id="deliveryDate"]', numbers.deliveryDate)
    await this.actionUtils.selectByXpath(this.frame, '//*[@id="documentDescription"]', numbers.documentDescription)
    await this.actionUtils.selectByXpath(this.frame, '//*[@id="mailaddress"]', numbers.mailAddress)
    await this.actionUtils.selectByXpath(this.frame, '//*[@id="bankName"]', numbers.bankName)
    await this.actionUtils.selectByXpath(this.frame, '//*[@id="financialName"]', numbers.financialName)
    await this.actionUtils.selectByXpath(this.frame, '//*[@id="accountType"]', numbers.accountType)
    await this.actionUtils.selectByXpath(this.frame, '//*[@id="accountId"]', numbers.accountId)
    await this.actionUtils.selectByXpath(this.frame, '//*[@id="accountName"]', numbers.accountName)
    await this.actionUtils.selectByXpath(this.frame, '//*[@id="note"]', numbers.note)
    await this.actionUtils.selectByXpath(this.frame, '//*[@id="sellersItemNum"]', numbers.sellersItemNum)
    await this.actionUtils.selectByXpath(this.frame, '//*[@id="itemName"]', numbers.itemName)
    await this.actionUtils.selectByXpath(this.frame, '//*[@id="quantityValue"]', numbers.quantityValue)
    await this.actionUtils.selectByXpath(this.frame, '//*[@id="quantityUnitCode"]', numbers.quantityUnitCode)
    await this.actionUtils.selectByXpath(this.frame, '//*[@id="priceValue"]', numbers.priceValue)
    await this.actionUtils.selectByXpath(this.frame, '//*[@id="taxRate"]', numbers.taxRate)
    await this.actionUtils.selectByXpath(this.frame, '//*[@id="description"]', numbers.description)
  }

  // 各データ番号を取得する(表示文字列ではなくValueであることに注意)
  async getNumbers() {
    return await this.actionUtils.getValues(this.frame, '//*[text()="請求書データ用フォーマット"]/..//select');
  }

  // 確認ページに遷移する
  async goConfirmPage() {
    await this.actionUtils.click(this.frame, '"確認"')
  }

  // 戻るボタンをクリック
  async goBack() {
    await this.actionUtils.click(this.frame, '//*[text()="戻る"]');
  }

}
exports.UploadFormatSettingPage = UploadFormatSettingPage;
