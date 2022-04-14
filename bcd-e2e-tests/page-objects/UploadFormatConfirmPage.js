const { ActionUtils } = require('../utils/action-utils');
class UploadFormatConfirmPage {

  constructor(browser, page) {
    this.browser = browser;
    this.page = page;
    this.actionUtils = new ActionUtils(browser, page);
  }

  // ページが表示されるまで待機する
  async waitForLoading() {
    let frame = await this.actionUtils.waitForLoading('"請求書アップロードフォーマット設定 確認"')
    this.frame = frame;
    return frame;
  }

  // タイトルを取得する
  async getTitle() {
    return await this.actionUtils.getText(this.frame, '#csvFormatConfirm-modal-card p');
  }

  // 設定名称を取得する
  async getItemName() {
    return await this.actionUtils.getValue(this.frame, '#uploadFormatItemName');
  }

  // アップロード種別を取得する
  async getUploadedType() {
    return await this.actionUtils.getValue(this.frame, '#uploadType');
  }

  // 明細-税 識別子を取得する
  async getTaxValues() {
    return await this.actionUtils.getValues(this.frame, '//*[text()="明細-税 識別子"]/../..//input');
  }

  // 明細-税 識別子を取得する(更新画面)
  async getTaxValuesMod() {
    return await this.actionUtils.getValues(this.frame, '//*[@id="csvFormatConfirm-modal-card"]//*[text()="明細-税 識別子"]/../..//input');
  }

  // 明細-単位 識別子を取得する
  async getUnitValues() {
    return await this.actionUtils.getValues(this.frame, '//*[text()="明細-単位 識別子"]/../..//input');
  }

  // 明細-単位 識別子を取得する(更新画面)
  async getUnitValuesMod() {
    return await this.actionUtils.getValues(this.frame, '//*[@id="csvFormatConfirm-modal-card"]//*[text()="明細-単位 識別子"]/../..//input');
  }

  // ユーザフォーマット項目名を取得する
  async getHeaders() {
    return await this.actionUtils.getTexts(this.frame, '//*[text()="請求書データ用フォーマット  →  取込データ"]/..//tbody//th[3]');
  }

  // データ内容を取得する
  async getDatas() {
    return await this.actionUtils.getTexts(this.frame, '//*[text()="請求書データ用フォーマット  →  取込データ"]/..//tbody//th[4]');
  }

  // 登録する
  async regist() {
    await this.actionUtils.click(this.frame, '"登録"');
  }

  // キャンセルする
  async cancel() {
    await this.actionUtils.click(this.frame, '"キャンセル"');
  }
}
exports.UploadFormatConfirmPage = UploadFormatConfirmPage;
