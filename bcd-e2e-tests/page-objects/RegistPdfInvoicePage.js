const { ActionUtils } = require('../utils/action-utils');
const comment = require('../utils/chai-with-reporting').comment;

// PDF請求書作成・編集
class RegistPdfInvoicePage {
  title = 'PDF請求書作成・編集';

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
    let frame = await this.actionUtils.waitForLoading('//*[@class="hero-body-noImage"]/*[contains(text(),"PDF請求書")]')
    this.frame = frame;
    return frame;
  }

  // 請求書番号を入力する
  async inputInvoiceNo(invoiceNo) {
    await this.addComment('「請求書番号」にて、"' + invoiceNo + '"と入力する');
    await this.actionUtils.fill(this.frame, '#invoice-invoiceNo', invoiceNo);
  }

  // 宛先を入力する
  async inputReciever(name, post, pref, address, building) {
    await this.addComment('「宛先企業名」にて、"' + name + '"と入力する');
    await this.actionUtils.fill(this.frame, '#invoice-recCompany', name);
    await this.addComment('「宛先」内、「郵便番号」にて、"' + post + '"と入力する');
    await this.actionUtils.fill(this.frame, '#invoice-recPost', post);
    await this.addComment('「宛先」内、「都道府県」にて、"' + pref + '"と入力する');
    await this.actionUtils.fill(this.frame, '#invoice-recAddr1', pref);
    await this.addComment('「宛先」内、「住所」にて、"' + address + '"と入力する');
    await this.actionUtils.fill(this.frame, '#invoice-recAddr2', address);
    await this.addComment('「宛先」内、「ビル名/フロア等」にて、"' + building + '"と入力する');
    await this.actionUtils.fill(this.frame, '#invoice-recAddr3', building);
  }

  // 登録番号の活性状態を確認する
  async isSenderNoDisabled() {
    return await this.actionUtils.isDisabled(this.frame, '#invoice-sendRegistrationNo');
  }

  // 日付を入力する
  async inputDate(itemName, selector, date) {
    await this.addComment('「' + itemName + '」にて、"' + date + '"と入力する');
    let elm = await this.actionUtils.getElement(this.frame, selector);
    let dates = date.split('/');
    await elm.type(dates[0], {delay:500});
    await elm.press('Tab', {delay:500});
    await elm.type(dates[1], {delay:500});
    await elm.type(dates[2], {delay:500});
  }

  // 請求日を入力する
  async inputBillingDate(date) {
    await this.inputDate('請求日', '#invoice-billingDate', date);
  }

  // 支払期限を入力する
  async inputPaymentDate(date) {
    await this.inputDate('支払期限', '#invoice-paymentDate', date);
  }

  // 納品日を入力する
  async inputDeliveryDate(date) {
    await this.inputDate('納品日', '#invoice-deliveryDate', date);
  }

  // 項目IDその他を入力する
  async inputLine(lineId, description, quantity, unit, unitPrice, taxType) {
    await this.addComment('「項目ID」にて、"' + lineId + '"と入力する');
    await this.actionUtils.fill(this.frame, '//input[@data-prop="lineId"]', lineId);
    await this.addComment('「内容」にて、"' + description + '"と入力する');
    await this.actionUtils.click(this.frame, '//input[@data-prop="lineDescription"]');
    await this.actionUtils.fill(this.frame, '//input[@data-prop="lineDescription"]', description);
    await this.addComment('「数量」にて、"' + quantity + '"と入力する');
    await this.actionUtils.click(this.frame, '//input[@data-prop="quantity"]');
    await this.actionUtils.fill(this.frame, '//input[@data-prop="quantity"]', quantity);
    await this.addComment('「単位」にて、"' + unit + '"と入力する');
    await this.actionUtils.click(this.frame, '//input[@data-prop="unit"]');
    await this.actionUtils.fill(this.frame, '//input[@data-prop="unit"]', unit);
    await this.addComment('「単価」にて、"' + unitPrice + '"と入力する');
    await this.actionUtils.click(this.frame, '//input[@data-prop="unitPrice"]');
    await this.actionUtils.fill(this.frame, '//input[@data-prop="unitPrice"]', unitPrice);
    await this.addComment('「税」にて、"' + taxType + '"を選択する');
    let elm = await this.actionUtils.getElement(this.frame, '//select[@data-prop="taxType"]');
    await elm.selectOption(taxType);
  }

  // 割引行を追加する
  async clickAddInvoiceDiscount() {
    await this.addComment('「割引行を追加」をクリックする');
    await this.actionUtils.click(this.frame, '#invoice-discount-btn');
  }

  // 「割引行を追加」が表示されているか否か
  async isAddInvoiceDiscountShown() {
    return await this.actionUtils.isDisabled(this.frame, '#invoice-discount-btn');
  }

  // 「割引」の各項目を入力する
  async inputInvoiceDiscount(rowNo, description, amount, unit) {
    await this.addComment(rowNo + '番目の「割引」にて、内容"' + description + '", 数量"' + amount + '"、単位"' + unit + '"と入力する');
    await this.actionUtils.click(this.frame, '#invoice-discountDescription' + rowNo);
    await this.actionUtils.fill(this.frame, '#invoice-discountDescription' + rowNo, description);
    await this.actionUtils.click(this.frame, '#invoice-discountAmount' + rowNo);
    await this.actionUtils.fill(this.frame, '#invoice-discountAmount' + rowNo, amount);
    await this.actionUtils.click(this.frame, '#invoice-discountUnit' + rowNo);
    let elm = await this.actionUtils.getElement(this.frame, '//select[@id="invoice-discountUnit' + rowNo + '"]');
    await elm.selectOption(unit);
  }

  // 「項目割引」をクリックする
  async clickAddDiscount() {
    await this.addComment('「項目割引」をクリックする');
    await this.actionUtils.click(this.frame, '#discount-btn');
  }

  // 「割引行を追加」が表示されているか否か
  async isAddDiscountShown() {
    return await this.actionUtils.isDisabled(this.frame, '#discount-btn');
  }

  // 「項目割引」の各項目を入力する
  async inputDiscount(rowNo, description, amount, unit) {
    await this.addComment(rowNo + '番目の「項目割引」にて、内容"' + description + '", 数量"' + amount + '"、単位"' + unit + '"と入力する');
    await this.actionUtils.click(this.frame, '//input[@data-prop="discountDescription' + rowNo + '"]');
    await this.actionUtils.fill(this.frame, '//input[@data-prop="discountDescription' + rowNo + '"]', description);
    await this.actionUtils.click(this.frame, '//input[@data-prop="discountAmount' + rowNo + '"]');
    await this.actionUtils.fill(this.frame, '//input[@data-prop="discountAmount' + rowNo + '"]', amount);
    await this.actionUtils.click(this.frame, '//select[@data-prop="discountUnit' + rowNo + '"]', unit);
    let elm = await this.actionUtils.getElement(this.frame, '//select[@data-prop="discountUnit' + rowNo + '"]');
    await elm.selectOption(unit);
  }

  // 戻る
  async back() {
    await this.addComment('「戻る」をクリックする');
    await this.actionUtils.click(this.frame, '#backButton');
  }

  // 一時保存する
  async save() {
    await this.addComment('「一時保存」をクリックする');
    await this.actionUtils.click(this.frame, '#save-btn');
    await this.page.waitForTimeout(3000);
  }

  // 処理中メッセージを表示する
  async clickOutputModal() {
    await this.addComment('「出力」をクリックする');
    await this.actionUtils.click(this.frame, '#output-modal-btn');
    await this.actionUtils.waitForLoading('#output-modal');
    await this.page.waitForTimeout(1000);
  }

  // 処理中メッセージを取得する
  async getOutputModalMsg() {
    return await this.actionUtils.getText(this.frame, '//div[@id="output-modal"]//section[@class="modal-card-body"]/p');
  }

  // 出力する
  async output() {
    await this.addComment('処理中メッセージにて、「確定」をクリックする');
    return await this.actionUtils.downloadFile(this.frame, '#output-btn');
  }
}
exports.RegistPdfInvoicePage = RegistPdfInvoicePage;
