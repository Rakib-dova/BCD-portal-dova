const { ActionUtils } = require('../utils/action-utils');
class UploadFormatModPage {

  constructor(browser, page) {
    this.browser = browser;
    this.page = page;
    this.actionUtils = new ActionUtils(browser, page);
  }

  // ページが表示されるまで待機する
  async waitForLoading() {
    let frame = await this.actionUtils.waitForLoading('"基本情報設定 確認"')
    this.frame = frame;
    return frame;
  }

  // タイトルを取得する
  async getTitle() {
    return await this.actionUtils.getText(this.frame, '#csvBasicFormat-modal-card header p');
  }

  // 「設定名称」のラベルに（必須）の赤文字がついているか
  async isItemNameRequired() {
    return await this.actionUtils.getText(this.frame, '#uploadFormatItemNameeRequired') == '（必須）';
  }

  // 「設定名称」を設定する
  async setItemName(value) {
    await this.actionUtils.fill(this.frame, '#basicUploadFormatItemName', value)
  }

  // 「設定名称」を取得する
  async getItemName() {
    return this.actionUtils.getValue(this.frame, '#basicUploadFormatItemName')
  }

  // アップロード種別を取得する
  async getUploadedType() {
    return await this.actionUtils.getValue(this.frame, '#uploadType')
  }

  // フォーマットファイル名を取得する
  async getUploadedFileName() {
    return await this.actionUtils.getValue(this.frame, '#dataFile');
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
    await this.actionUtils.fill(this.frame, '//*[@id="csvBasicFormat-modal"]//*[text()="消費税"]/..//input', taxs.keyConsumptionTax)
    await this.actionUtils.fill(this.frame, '//*[@id="csvBasicFormat-modal"]//*[text()="軽減税率"]/..//input', taxs.keyReducedTax)
    await this.actionUtils.fill(this.frame, '//*[@id="csvBasicFormat-modal"]//*[text()="不課税"]/..//input', taxs.keyFreeTax)
    await this.actionUtils.fill(this.frame, '//*[@id="csvBasicFormat-modal"]//*[text()="免税"]/..//input', taxs.keyDutyFree)
    await this.actionUtils.fill(this.frame, '//*[@id="csvBasicFormat-modal"]//*[text()="非課税"]/..//input', taxs.keyExemptTax)
  }

  // 「明細-税 識別子」を取得する
  async getTaxs() {
    return await this.actionUtils.getValues(this.frame, '//*[@id="csvBasicFormat-modal"]//*[text()="明細-税 識別子"]/../..//input');
  }

  // 「明細-単位 識別子」のツールチップを取得する
  async getUnitToolTip() {
    return await this.actionUtils.getText(this.frame, '//*[text()="明細-単位 識別子"]/..//span');
  }

  // 「明細-単位 識別子」を設定する
  async setUnits(units) {
    await this.actionUtils.fill(this.frame, '//*[@id="csvBasicFormat-modal"]//*[text()="人月"]/..//input', units.keyManMonth)
    await this.actionUtils.fill(this.frame, '//*[@id="csvBasicFormat-modal"]//*[text()="ボトル"]/..//input', units.keyBottle)
    await this.actionUtils.fill(this.frame, '//*[@id="csvBasicFormat-modal"]//*[text()="コスト"]/..//input', units.keyCost)
    await this.actionUtils.fill(this.frame, '//*[@id="csvBasicFormat-modal"]//*[text()="コンテナ"]/..//input', units.keyContainer)
    await this.actionUtils.fill(this.frame, '//*[@id="csvBasicFormat-modal"]//*[text()="センチリットル"]/..//input', units.keyCentilitre)
    await this.actionUtils.fill(this.frame, '//*[@id="csvBasicFormat-modal"]//*[text()="平方センチメートル"]/..//input', units.keySquareCentimeter)
    await this.actionUtils.fill(this.frame, '//*[@id="csvBasicFormat-modal"]//*[text()="立方センチメートル"]/..//input', units.keyCubicCentimeter)
    await this.actionUtils.fill(this.frame, '//*[@id="csvBasicFormat-modal"]//*[text()="センチメートル"]/..//input', units.keyCentimeter)
    await this.actionUtils.fill(this.frame, '//*[@id="csvBasicFormat-modal"]//*[text()="ケース"]/..//input', units.keyCase)
    await this.actionUtils.fill(this.frame, '//*[@id="csvBasicFormat-modal"]//*[text()="カートン"]/..//input', units.keyCarton)
    await this.actionUtils.fill(this.frame, '//*[@id="csvBasicFormat-modal"]//*[text()="日"]/..//input', units.keyDay)
    await this.actionUtils.fill(this.frame, '//*[@id="csvBasicFormat-modal"]//*[text()="デシリットル"]/..//input', units.keyDeciliter)
    await this.actionUtils.fill(this.frame, '//*[@id="csvBasicFormat-modal"]//*[text()="デシメートル"]/..//input', units.keyDecimeter)
    await this.actionUtils.fill(this.frame, '//*[@id="csvBasicFormat-modal"]//*[text()="グロス・キログラム"]/..//input', units.keyGrossKilogram)
    await this.actionUtils.fill(this.frame, '//*[@id="csvBasicFormat-modal"]//*[text()="個"]/..//input', units.keyPieces)
    await this.actionUtils.fill(this.frame, '//*[@id="csvBasicFormat-modal"]//*[text()="フィート"]/..//input', units.keyFeet)
    await this.actionUtils.fill(this.frame, '//*[@id="csvBasicFormat-modal"]//*[text()="ガロン"]/..//input', units.keyGallon)
    await this.actionUtils.fill(this.frame, '//*[@id="csvBasicFormat-modal"]//*[text()="グラム"]/..//input', units.keyGram)
    await this.actionUtils.fill(this.frame, '//*[@id="csvBasicFormat-modal"]//*[text()="総トン"]/..//input', units.keyGrossTonnage)
    await this.actionUtils.fill(this.frame, '//*[@id="csvBasicFormat-modal"]//*[text()="時間"]/..//input', units.keyHour)
    await this.actionUtils.fill(this.frame, '//*[@id="csvBasicFormat-modal"]//*[text()="キログラム"]/..//input', units.keyKilogram)
    await this.actionUtils.fill(this.frame, '//*[@id="csvBasicFormat-modal"]//*[text()="キロメートル"]/..//input', units.keyKilometers)
    await this.actionUtils.fill(this.frame, '//*[@id="csvBasicFormat-modal"]//*[text()="キロワット時"]/..//input', units.keyKilowattHour)
    await this.actionUtils.fill(this.frame, '//*[@id="csvBasicFormat-modal"]//*[text()="ポンド"]/..//input', units.keyPound)
    await this.actionUtils.fill(this.frame, '//*[@id="csvBasicFormat-modal"]//*[text()="リットル"]/..//input', units.keyLiter)
    await this.actionUtils.fill(this.frame, '//*[@id="csvBasicFormat-modal"]//*[text()="ミリグラム"]/..//input', units.keyMilligram)
    await this.actionUtils.fill(this.frame, '//*[@id="csvBasicFormat-modal"]//*[text()="ミリリットル"]/..//input', units.keyMilliliter)
    await this.actionUtils.fill(this.frame, '//*[@id="csvBasicFormat-modal"]//*[text()="ミリメートル"]/..//input', units.keyMillimeter)
    await this.actionUtils.fill(this.frame, '//*[@id="csvBasicFormat-modal"]//*[text()="月"]/..//input', units.keyMonth)
    await this.actionUtils.fill(this.frame, '//*[@id="csvBasicFormat-modal"]//*[text()="平方メートル"]/..//input', units.keySquareMeter)
    await this.actionUtils.fill(this.frame, '//*[@id="csvBasicFormat-modal"]//*[text()="立方メートル"]/..//input', units.keyCubicMeter)
    await this.actionUtils.fill(this.frame, '//*[@id="csvBasicFormat-modal"]//*[text()="メーター"]/..//input', units.keyMeter)
    await this.actionUtils.fill(this.frame, '//*[@id="csvBasicFormat-modal"]//*[text()="純トン"]/..//input', units.keyNetTonnage)
    await this.actionUtils.fill(this.frame, '//*[@id="csvBasicFormat-modal"]//*[text()="包"]/..//input', units.keyPackage)
    await this.actionUtils.fill(this.frame, '//*[@id="csvBasicFormat-modal"]//*[text()="巻"]/..//input', units.keyRoll)
    await this.actionUtils.fill(this.frame, '//*[@id="csvBasicFormat-modal"]//*[text()="式"]/..//input', units.keyFormula)
    await this.actionUtils.fill(this.frame, '//*[@id="csvBasicFormat-modal"]//*[text()="トン"]/..//input', units.keyTonnage)
    await this.actionUtils.fill(this.frame, '//*[@id="csvBasicFormat-modal"]//*[text()="その他"]/..//input', units.keyOthers)
  }

  // 「明細-単位 識別子」を取得する
  async getUnits() {
    return await this.actionUtils.getValues(this.frame, '//*[@id="csvBasicFormat-modal"]//*[text()="明細-単位 識別子"]/../..//input');
  }

  // キャンセルをクリックする
  async cancel() {
    await this.actionUtils.click(this.frame, '#csvBasicEditCancelBtn')
  }

  // 変更をクリックする
  async change() {
    await this.actionUtils.click(this.frame, '#csvBasicEditBtn')
  }
}
exports.UploadFormatModPage = UploadFormatModPage;
