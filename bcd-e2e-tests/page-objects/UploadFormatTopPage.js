const { ActionUtils } = require('../utils/action-utils');
class UploadFormatTopPage {

  constructor(browser, page) {
    this.browser = browser;
    this.page = page;
    this.actionUtils = new ActionUtils(browser, page);
  }

  // ページが表示されるまで待機する
  async waitForLoading() {
    let frame = await this.actionUtils.waitForLoading('//*[contains(@class,"title")][text()="アップロードフォーマット一覧"]')
    this.frame = frame;
    return frame;
  }

  // タイトルを取得する
  async getTitle() {
    return await this.actionUtils.getText(this.frame, '.title');
  }

  // アップロード種別を取得する
  async getUploadformat() {
    return await this.actionUtils.getValue(this.frame, '#uploadformat');
  }

  // 「新規登録する」ボタンが表示されているか
  async isRegistBtnExist() {
    return await this.actionUtils.isExist(this.frame, '"新規登録する"');
  }

  // 「新規登録する」ボタンをクリックする
  async clickRegistBtn() {
    await this.actionUtils.click(this.frame, '"新規登録する"');
  }

  // 「請求書一括作成」ボタンが表示されているか
  async isCreateInvoiceBtnExist() {
    return await this.actionUtils.isExist(this.frame, '"請求書一括作成→"');
  }

  // 一覧テーブルのヘッダを取得する
  async getHeaders() {
    return await this.actionUtils.getTexts(this.frame, '.columns thead th');
  }

  // フォーマット名を取得する
  async getFormatName(row) {
    return await this.actionUtils.getText(this.frame, `//*[text()="設定名称"]/../../../tbody//td[${row}]`)
  }

  // 最終更新日時を取得する
  async getModDate(row) {
    return new Date(await this.actionUtils.getText(this.frame, `//tr[${row}]//td[3]`));
  }

  // フォーマットデータが存在するか
  async isFormatDataExist(itemName) {
    return await this.actionUtils.isExist(this.frame, `//tr/td[text()="${itemName}"]`);
  }

  // 「確認・変更する」ボタンと「削除」ボタンが存在するか
  async isComfirmAndDeleteBtnExist(row) {
    return (await this.actionUtils.isExist(this.frame, `//tr[${row}]//a[text()="確認・変更する"]`)) &&
      (await this.actionUtils.isExist(this.frame, `//tr[${row}]//a[text()="削除"]`));
  }

  // 「確認・変更する」ボタンをクリックする
  async clickComfirmBtn(itemName) {
    await this.actionUtils.click(this.frame, `//*[text()="${itemName}"]/..//*[text()="確認・変更する"]`);
  }

  // 「削除」ボタンをクリックする
  async clickDeleteBtn(itemName) {
    await this.actionUtils.click(this.frame, `//*[text()="${itemName}"]/..//*[text()="削除"]`);
  }

  // 「Homeへ戻る」ボタンが表示されているか
  async isBackHomeBtnExist() {
    return await this.actionUtils.isExist(this.frame, '"←Homeへ戻る"');
  }

  // Homeへ戻る
  async moveTop() {
    await this.actionUtils.click(this.frame, '//*[contains(text(),"Homeへ戻る")]');
  }

  // ポップアップのメッセージを取得する
  async getPopupMsg() {
    await this.actionUtils.waitForLoading('.notification');
    const msg = await this.actionUtils.getText(this.frame, '.notification');
    await this.actionUtils.click(this.frame, '.notification .delete');
    return msg;
  }

  // 削除ダイアログのメッセージを取得する
  async getDeleteDialogMsg() {
    await this.actionUtils.waitForLoading('//*[@id="modalUuid"]/..');
    return await this.actionUtils.getText(this.frame, '//*[@id="modalUuid"]/..');
  }

  // 削除ダイアログの「キャンセル」ボタンをクリックする
  async clickDialogCancelBtn() {
    await this.actionUtils.click(this.frame, '"キャンセル"');
  }

  // 削除ダイアログの「キャンセル」ボタンが表示されている
  async isDialogCancelBtnDisplayed() {
    return await this.actionUtils.isDisplayed(this.frame, '"キャンセル"');
  }

  // 削除ダイアログの「削除」ボタンをクリックする
  async clickDialogDeleteBtn() {
    await this.actionUtils.click(this.frame, '#modalDelBtn');
  }

  // 削除ダイアログの「削除」ボタンが存在するか
  async isDialogDeleteBtnDisplayed() {
    return await this.actionUtils.isDisplayed(this.frame, '//div[contains(@class, "is-active")]//a[@id="modalDelBtn"]');
  }
}
exports.UploadFormatTopPage = UploadFormatTopPage;
