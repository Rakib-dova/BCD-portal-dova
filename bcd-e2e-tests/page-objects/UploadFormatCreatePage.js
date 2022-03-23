const { ActionUtils } = require('../utils/action-utils');
class UploadFormatCreatePage {

  constructor(browser, page) {
    this.browser = browser;
    this.page = page;
    this.actionUtils = new ActionUtils(browser, page);
  }

  // ページが表示されるまで待機する
  async waitForLoading() {
    let frame = await this.actionUtils.waitForLoading('"基本情報設定"')
    this.frame = frame;
    return frame;
  }

  // タイトルを取得する
  async getTitle() {
    return await this.actionUtils.getText(this.frame, 'section .title');
  }

  // 「設定名称」のラベルに（必須）の赤文字がついているか
  async isItemNameRequired() {
    return await this.actionUtils.getText(this.frame, '#uploadFormatItemNameeRequired') == '（必須）';
  }

  // 「設定名称」を設定する
  async setItemName(value) {
    await this.actionUtils.fill(this.frame, '#uploadFormatItemName', value)
  }

  // 「設定名称」を取得する
  async getItemName() {
    return this.actionUtils.getValue(this.frame, '#uploadFormatItemName')
  }

  // アップロード種別を取得する
  async getUploadedType() {
    return await this.actionUtils.getValue(this.frame, '#uploadType')
  }

  // 「データファイル」のラベルに（必須）の赤文字がついているか
  async isUploadedFileRequired() {
    return await this.actionUtils.getText(this.frame, '//*[text()="データファイル"]/../p') == '（必須）';
  }

  // 「データファイル」にフォーマットファイルをアップロードする
  async uploadFormatFile(formatPath) {
    await this.actionUtils.uploadFile(this.frame, '#dataFile', formatPath)
  }

  // 「データファイル」のアップロードしたフォーマットファイル名を取得する
  async getUploadedFileName() {
    return await this.actionUtils.getValue(this.frame, '#dataFileName');
  }

  // 「項目名の行有無」のラベルに（必須）の赤文字がついているか
  async isItemNameRequired() {
    return await this.actionUtils.getText(this.frame, '//*[text()="項目名の行有無"]/../p') == '（必須）';
  }

  // 「項目名の行有無」を設定する
  async setItemNameLine(isOn) {
    if (isOn) {
      await this.actionUtils.click(this.frame, '#checkItemNameLineOn')
    } else {
      await this.actionUtils.click(this.frame, '#checkItemNameLineOff')
    }
  }

  // 「項目名の行有無」を取得する
  async isItemNameLineOn() {
    return await this.actionUtils.getAttr(this.frame, '#checkItemNameLineOn', 'checked') == ''
  }

  // 「項目名の行番号」のラベルに（必須）の赤文字がついているか
  async isFormatNumberRequired() {
    return await this.actionUtils.getText(this.frame, '#uploadFormatNumberRequired') == '（必須）';
  }

  // 「項目名の行番号」のラベルの（必須）が表示されているか
  async isFormatNumberDisplayed() {
    return await this.actionUtils.isDisplayed(this.frame, '#uploadFormatNumberRequired');
  }

  // 「項目名の行番号」のツールチップを取得する
  async getFormatNumberToolTip() {
    return await this.actionUtils.getText(this.frame, '//*[text()="項目名の行番号"]/..//span');
  }

  // 項目名の行番号を設定する
  async setFormatNumber(value) {
    await this.actionUtils.fill(this.frame, '#uploadFormatNumber', value)
  }

  // 項目名の行番号を取得する
  async getFormatNumber() {
    return await this.actionUtils.getValue(this.frame, '#uploadFormatNumber')
  }

  // 「データ開始行番号」のラベルに（必須）の赤文字がついているか
  async isDefaultNumberRequired() {
    return await this.actionUtils.getText(this.frame, '#defaultNumberRequired') == '（必須）';
  }

  // 「データ開始行番号」のツールチップを取得する
  async getDefaultNumberToolTip() {
    return await this.actionUtils.getText(this.frame, '//*[text()="データ開始行番号"]/..//span');
  }

  // 「データ開始行番号」を設定する
  async setDefaultNumber(value) {
    await this.actionUtils.fill(this.frame, '#defaultNumber', value)
  }

  // 「データ開始行番号」を取得する
  async getDefaultNumber() {
    return await this.actionUtils.getValue(this.frame, '#defaultNumber')
  }

  // 「明細-税 識別子」のツールチップを取得する
  async getTaxToolTip() {
    return await this.actionUtils.getText(this.frame, '//*[text()="明細-税 識別子"]/..//span');
  }

  // 「明細-税 識別子」を設定する
  async setTaxs(taxs) {
    await this.actionUtils.fill(this.frame, '#keyConsumptionTax', taxs.keyConsumptionTax)
    await this.actionUtils.fill(this.frame, '#keyReducedTax', taxs.keyReducedTax)
    await this.actionUtils.fill(this.frame, '#keyFreeTax', taxs.keyFreeTax)
    await this.actionUtils.fill(this.frame, '#keyDutyFree', taxs.keyDutyFree)
    await this.actionUtils.fill(this.frame, '#keyExemptTax', taxs.keyExemptTax)
  }

  // 「明細-税 識別子」を取得する
  async getTaxs() {
    return await this.actionUtils.getValues(this.frame, '//*[text()="明細-税 識別子"]/../..//input');
  }

  // 「明細-単位 識別子」のツールチップを取得する
  async getUnitToolTip() {
    return await this.actionUtils.getText(this.frame, '//*[text()="明細-単位 識別子"]/..//span');
  }

  // 「明細-単位 識別子」を設定する
  async setUnits(units) {
    await this.actionUtils.fill(this.frame, '#keyManMonth', units.keyManMonth)
    await this.actionUtils.fill(this.frame, '#keyBottle', units.keyBottle)
    await this.actionUtils.fill(this.frame, '#keyCost', units.keyCost)
    await this.actionUtils.fill(this.frame, '#keyContainer', units.keyContainer)
    await this.actionUtils.fill(this.frame, '#keyCentilitre', units.keyCentilitre)
    await this.actionUtils.fill(this.frame, '#keySquareCentimeter', units.keySquareCentimeter)
    await this.actionUtils.fill(this.frame, '#keyCubicCentimeter', units.keyCubicCentimeter)
    await this.actionUtils.fill(this.frame, '#keyCentimeter', units.keyCentimeter)
    await this.actionUtils.fill(this.frame, '#keyCase', units.keyCase)
    await this.actionUtils.fill(this.frame, '#keyCarton', units.keyCarton)
    await this.actionUtils.fill(this.frame, '#keyDay', units.keyDay)
    await this.actionUtils.fill(this.frame, '#keyDeciliter', units.keyDeciliter)
    await this.actionUtils.fill(this.frame, '#keyDecimeter', units.keyDecimeter)
    await this.actionUtils.fill(this.frame, '#keyGrossKilogram', units.keyGrossKilogram)
    await this.actionUtils.fill(this.frame, '#keyPieces', units.keyPieces)
    await this.actionUtils.fill(this.frame, '#keyFeet', units.keyFeet)
    await this.actionUtils.fill(this.frame, '#keyGallon', units.keyGallon)
    await this.actionUtils.fill(this.frame, '#keyGram', units.keyGram)
    await this.actionUtils.fill(this.frame, '#keyGrossTonnage', units.keyGrossTonnage)
    await this.actionUtils.fill(this.frame, '#keyHour', units.keyHour)
    await this.actionUtils.fill(this.frame, '#keyKilogram', units.keyKilogram)
    await this.actionUtils.fill(this.frame, '#keyKilometers', units.keyKilometers)
    await this.actionUtils.fill(this.frame, '#keyKilowattHour', units.keyKilowattHour)
    await this.actionUtils.fill(this.frame, '#keyPound', units.keyPound)
    await this.actionUtils.fill(this.frame, '#keyLiter', units.keyLiter)
    await this.actionUtils.fill(this.frame, '#keyMilligram', units.keyMilligram)
    await this.actionUtils.fill(this.frame, '#keyMilliliter', units.keyMilliliter)
    await this.actionUtils.fill(this.frame, '#keyMillimeter', units.keyMillimeter)
    await this.actionUtils.fill(this.frame, '#keyMonth', units.keyMonth)
    await this.actionUtils.fill(this.frame, '#keySquareMeter', units.keySquareMeter)
    await this.actionUtils.fill(this.frame, '#keyCubicMeter', units.keyCubicMeter)
    await this.actionUtils.fill(this.frame, '#keyMeter', units.keyMeter)
    await this.actionUtils.fill(this.frame, '#keyNetTonnage', units.keyNetTonnage)
    await this.actionUtils.fill(this.frame, '#keyPackage', units.keyPackage)
    await this.actionUtils.fill(this.frame, '#keyRoll', units.keyRoll)
    await this.actionUtils.fill(this.frame, '#keyFormula', units.keyFormula)
    await this.actionUtils.fill(this.frame, '#keyTonnage', units.keyTonnage)
    await this.actionUtils.fill(this.frame, '#keyOthers', units.keyOthers)
  }

  // 「明細-単位 識別子」を取得する
  async getUnits() {
    return await this.actionUtils.getValues(this.frame, '//*[text()="明細-単位 識別子"]/../..//input');
  }

  // 次へをクリックする
  async goNext() {
    await this.actionUtils.click(this.frame, '"次へ"')
  }
}
exports.UploadFormatCreatePage = UploadFormatCreatePage;
