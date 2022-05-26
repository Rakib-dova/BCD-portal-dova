const { chromium, firefox } = require('playwright');
const webdriverUtils = require('../utils/webdriver-utils');
const config = require('../autotest-script-config');
const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const { stringify } = require('csv-stringify/sync');

const { LoginPage } = require('../page-objects/LoginPage.js');
const { TradeShiftTopPage } = require('../page-objects/TradeShiftTopPage.js');
const { TopPage } = require('../page-objects/TopPage.js');
const { SupportMenuPage } = require('../page-objects/SupportMenuPage');
const { UploadInvoiceMenuPage } = require('../page-objects/UploadInvoiceMenuPage');
const { UploadInvoicePage } = require('../page-objects/UploadInvoicePage');
const { UploadFormatTopPage } = require('../page-objects/UploadFormatTopPage');
const { UploadFormatCreatePage } = require('../page-objects/UploadFormatCreatePage');
const { UploadFormatSettingPage } = require('../page-objects/UploadFormatSettingPage');
const { UploadFormatConfirmPage } = require('../page-objects/UploadFormatConfirmPage');
const { UploadFormatModPage } = require('../page-objects/UploadFormatModPage');
const { SettingMenuPage } = require('../page-objects/SettingMenuPage');
const { ContractChangePage } = require('../page-objects/ContractChangePage');
const { UploadListPage } = require('../page-objects/UploadListPage');
const { UploadListDetailPage } = require('../page-objects/UploadListDetailPage');
const { SettlementPage } = require('../page-objects/SettlementPage');
const { RakkoToolsPage } = require('../page-objects/RakkoToolsPage');
const { DownloadInvoicePage } = require('../page-objects/DownloadInvoicePage');
const { JournalMenuPage } = require('../page-objects/JournalMenuPage');
const { AccountCodeListPage } = require('../page-objects/AccountCodeListPage');
const { RegistAccountCodePage } = require('../page-objects/RegistAccountCodePage');
const { ApproveRouteListPage } = require('../page-objects/ApproveRouteListPage');
const { RegistApproveRoutePage } = require('../page-objects/RegistApproveRoutePage');
const { DepartmentListPage } = require('../page-objects/DepartmentListPage');
const { RegistDepartmentPage } = require('../page-objects/RegistDepartmentPage');
const { PaymentRequestListPage } = require('../page-objects/PaymentRequestListPage');
const { PaymentRequestPage } = require('../page-objects/PaymentRequestPage');
const { JournalDetailPage } = require('../page-objects/JournalDetailPage');
const { SubAccountCodeListPage } = require('../page-objects/SubAccountCodeListPage');
const { RegistSubAccountCodePage } = require('../page-objects/RegistSubAccountCodePage');
const { UploadAccountCodePage } = require('../page-objects/UploadAccountCodePage');
const { UploadSubAccountCodePage } = require('../page-objects/UploadSubAccountCodePage');
const { UploadDepartmentPage } = require('../page-objects/UploadDepartmentPage');
const { JournalDownloadPage } = require('../page-objects/JournalDownloadPage');

// テストの準備を行う
exports.initTest = async () => {
  // テスト対象のブラウザを決める
  let browserType;
  if (process.env.BROWSER == 'EDGE') {
    browserType = await webdriverUtils.openEdge(chromium);
  } else if (process.env.BROWSER == 'FIREFOX') {
    browserType = await webdriverUtils.openFirefox(firefox);
  } else {
    browserType = await webdriverUtils.openChrome(chromium);
  }

  // テスト対象のアカウントを決める
  const accounts = [];
  const ACCOUNT = process.env.ACCOUNT;
  if (ACCOUNT != 'user') { // manager or all or 未設定
    accounts.push({
      id: config.company1.mng.id,
      password: config.company1.mng.password,
      type: 'manager'
    });
  }
  if (ACCOUNT == 'user' || ACCOUNT == 'all') {
    accounts.push({
      id: config.company1.user.id,
      password: config.company1.user.password,
      type: 'user'
    });
  }

  // テストの条件
  const contextOption = {
    locale: 'ja-JP',
    timezoneId: 'Asia/Tokyo'
  }
  return { browserType, accounts, contextOption };
}

// ページオブジェクトのインスタンスを取得する
exports.getPageObject = (browser, page) => {
  const pages = {};
  pages.loginPage = new LoginPage(browser, page);
  pages.topPage = new TopPage(browser, page);
  pages.tradeShiftTopPage = new TradeShiftTopPage(browser, page);
  pages.supportMenuPage = new SupportMenuPage(browser, page);
  pages.uploadInvoiceMenuPage = new UploadInvoiceMenuPage(browser, page);
  pages.uploadInvoicePage = new UploadInvoicePage(browser, page);
  pages.uploadFormatTopPage = new UploadFormatTopPage(browser, page);
  pages.uploadFormatCreatePage = new UploadFormatCreatePage(browser, page);
  pages.uploadFormatSettingPage = new UploadFormatSettingPage(browser, page);
  pages.uploadFormatConfirmPage = new UploadFormatConfirmPage(browser, page);
  pages.uploadFormatModPage = new UploadFormatModPage(browser, page);
  pages.settingMenuPage = new SettingMenuPage(browser, page);
  pages.contractChangePage = new ContractChangePage(browser, page);
  pages.uploadListPage = new UploadListPage(browser, page);
  pages.uploadListDetailPage = new UploadListDetailPage(browser, page);
  pages.settlementPage = new SettlementPage(browser, page);
  pages.rakkoToolsPage = new RakkoToolsPage(browser, page);
  pages.downloadInvoicePage = new DownloadInvoicePage(browser, page);
  pages.journalMenuPage = new JournalMenuPage(browser, page);
  pages.accountCodeListPage = new AccountCodeListPage(browser, page);
  pages.registAccountCodePage = new RegistAccountCodePage(browser, page);
  pages.approveRouteListPage = new ApproveRouteListPage(browser, page);
  pages.registApproveRoutePage = new RegistApproveRoutePage(browser, page);
  pages.departmentListPage = new DepartmentListPage(browser, page);
  pages.paymentRequestListPage = new PaymentRequestListPage(browser, page);
  pages.paymentRequestPage = new PaymentRequestPage(browser, page);
  pages.journalDetailPage = new JournalDetailPage(browser, page);
  pages.subAccountCodeListPage = new SubAccountCodeListPage(browser, page);
  pages.registSubAccountCodePage = new RegistSubAccountCodePage(browser, page);
  pages.registDepartmentPage = new RegistDepartmentPage(browser, page);
  pages.uploadAccountCodePage = new UploadAccountCodePage(browser, page);
  pages.uploadSubAccountCodePage = new UploadSubAccountCodePage(browser, page);
  pages.uploadDepartmentPage = new UploadDepartmentPage(browser, page);
  pages.journalDownloadPage = new JournalDownloadPage(browser, page);
  this.pages = pages;
  return pages;
}

// Date型の日付をYYYYMMDDHHMMSS形式の文字列に変換する
exports.getFormattedDate = date => {
  return date.getFullYear()
    + ('0' + (date.getMonth() + 1)).slice(-2)
    + ('0' + date.getDate()).slice(-2)
    + ('0' + date.getHours()).slice(-2)
    + ('0' + date.getMinutes()).slice(-2)
    + ('0' + date.getSeconds()).slice(-2);
}


// Date型の日付をYYYY-MM-DD形式の文字列に変換する
exports.getFormattedDateHyphen = date => {
  return date.getFullYear()
    + '-' + ('0' + (date.getMonth() + 1)).slice(-2)
    + '-' + ('0' + date.getDate()).slice(-2);
}

// 請求書ファイルの請求書番号を一意な値に書き換える(デフォルトフォーマット)
exports.updateInvoiceItemNameForDefault = (baseFilePath, tmpFilePath) => {
  // 現在の日付を取得する
  const now = new Date();
  const datTime = this.getFormattedDate(now);
  const itemNames = [];

  // アップロード用ファイルをコピーする
  fs.cpSync(baseFilePath, tmpFilePath, { recursive: true, force: true });

  // コピーしたファイルを読み込む
  let tmpData = fs.readFileSync(tmpFilePath)
  const csvData = parse(tmpData, { columns: true });

  // ヘッダーをもとに請求書番号を変換する
  for (row of csvData) {
    let itemName = row['請求書番号'];
    if (itemName == '重複') {
      itemNames.push(itemName);
      continue;
    }
    itemName = `${datTime}-${itemName}`;
    row['請求書番号'] = itemName;
    itemNames.push(itemName);
  }

  // 変換したデータをファイルに書き込む
  const modData = stringify(csvData, { header: true });
  fs.writeFileSync(tmpFilePath, modData);

  return itemNames;
}

// 請求書ファイルの請求書番号を一意な値に書き換える(カスタムフォーマット)
exports.updateInvoiceItemNameForCustom = (baseFilePath, tmpFilePath, startRow, columnNo) => {
  // 現在の日付を取得する
  const now = new Date();
  const datTime = this.getFormattedDate(now);
  const itemNames = [];

  // アップロード用ファイルをコピーする
  fs.cpSync(baseFilePath, tmpFilePath, { recursive: true, force: true });

  // コピーしたファイルを読み込む
  let tmpData = fs.readFileSync(tmpFilePath)
  const csvData = parse(tmpData);

  // 0始まりに変換する
  startRow--;
  columnNo--;
  // セル指定で請求書番号を変換する
  for (let row = startRow; row < csvData.length; row++) {
    let itemName = csvData[row][columnNo];
    if (itemName == '重複') {
      itemNames.push(itemName);
      continue;
    }
    itemName = `${datTime}-${itemName}`;
    csvData[row][columnNo] = itemName;
    itemNames.push(itemName);
  }

  // 変換したデータをファイルに書き込む
  const modData = stringify(csvData);
  fs.writeFileSync(tmpFilePath, modData);

  return itemNames;
}

// 請求書フォーマットファイルをアップロードする(BCDアプリトップページから開始)
exports.uploadFormat = async (formatPath, hasHeader, headerRow, dataRow, startColumn) => {

  // 請求書一括作成メニューを表示する
  await this.pages.topPage.openUploadInvoiceMenu();
  await this.pages.uploadInvoiceMenuPage.waitForLoading();

  // 請求書アップロードフォーマット一覧ページに遷移する
  await this.pages.uploadInvoiceMenuPage.clickUploadFormat();
  await this.pages.uploadFormatTopPage.waitForLoading();

  // 新規登録ページに遷移する
  await this.pages.uploadFormatTopPage.clickRegistBtn();
  await this.pages.uploadFormatCreatePage.waitForLoading();

  // フォーマットファイルをアップロードする
  const fileName = path.basename(formatPath);
  await this.pages.uploadFormatCreatePage.uploadFormatFile(formatPath);
  await this.pages.uploadFormatCreatePage.waitForLoading(`"${fileName}"`);

  // 現在の日付を取得する
  const now = new Date();
  let itemName = this.getFormattedDate(now);

  // 各項目に値を設定する
  await this.pages.uploadFormatCreatePage.setItemName(itemName);
  await this.pages.uploadFormatCreatePage.setItemNameLine(hasHeader)
  if (hasHeader) {
    await this.pages.uploadFormatCreatePage.setFormatNumber(headerRow);
  }
  await this.pages.uploadFormatCreatePage.setDefaultNumber(dataRow);
  const taxs = {
    keyConsumptionTax: '消費税2',
    keyReducedTax: '軽減税率2',
    keyFreeTax: '不課税2',
    keyDutyFree: '免税2',
    keyExemptTax: '非課税2'
  }
  await this.pages.uploadFormatCreatePage.setTaxs(taxs);
  const units = {
    keyManMonth: '人月2',
    keyBottle: 'ボトル2',
    keyCost: 'コスト2',
    keyContainer: 'コンテナ2',
    keyCentilitre: 'センチリットル2',
    keySquareCentimeter: '平方センチメートル2',
    keyCubicCentimeter: '立方センチメートル2',
    keyCentimeter: 'センチメートル2',
    keyCase: 'ケース2',
    keyCarton: 'カートン2',
    keyDay: '日2',
    keyDeciliter: 'デシリットル2',
    keyDecimeter: 'デシメートル2',
    keyGrossKilogram: 'グロス・キログラム2',
    keyPieces: '個2',
    keyFeet: 'フィート2',
    keyGallon: 'ガロン2',
    keyGram: 'グラム2',
    keyGrossTonnage: '総トン2',
    keyHour: '時間2',
    keyKilogram: 'キログラム2',
    keyKilometers: 'キロメートル2',
    keyKilowattHour: 'キロワット時2',
    keyPound: 'ポンド2',
    keyLiter: 'リットル2',
    keyMilligram: 'ミリグラム2',
    keyMilliliter: 'ミリリットル2',
    keyMillimeter: 'ミリメートル2',
    keyMonth: '月2',
    keySquareMeter: '平方メートル2',
    keyCubicMeter: '立方メートル2',
    keyMeter: 'メーター2',
    keyNetTonnage: '純トン2',
    keyPackage: '包2',
    keyRoll: '巻2',
    keyFormula: '式2',
    keyTonnage: 'トン2',
    keyOthers: 'その他2',
  }
  await this.pages.uploadFormatCreatePage.setUnits(units);

  // 次へをクリックする
  await this.pages.uploadFormatCreatePage.goNext();
  await this.pages.uploadFormatSettingPage.waitForLoading('//*[text()="請求書アップロードフォーマット設定"]')

  const numbers = {
    issueDate: startColumn,
    invoiceNumber: startColumn + 1,
    tenantId: startColumn + 2,
    paymentDate: startColumn + 3,
    deliveryDate: startColumn + 4,
    documentDescription: startColumn + 5,
    bankName: startColumn + 6,
    financialName: startColumn + 7,
    accountType: startColumn + 8,
    accountId: startColumn + 9,
    accountName: startColumn + 10,
    note: startColumn + 11,
    sellersItemNum: startColumn + 12,
    itemName: startColumn + 13,
    quantityValue: startColumn + 14,
    quantityUnitCode: startColumn + 15,
    priceValue: startColumn + 16,
    taxRate: startColumn + 17,
    description: startColumn + 18
  }
  await this.pages.uploadFormatSettingPage.setNumbers(numbers);

  // 確認ページに遷移する
  await this.pages.uploadFormatSettingPage.goConfirmPage();
  await this.pages.uploadFormatConfirmPage.waitForLoading();

  // 登録する
  await this.pages.uploadFormatConfirmPage.regist();
  await this.pages.uploadFormatTopPage.waitForLoading();

  // Homeへ戻る
  await this.pages.uploadFormatTopPage.moveTop();
  await this.pages.topPage.waitForLoading();

  return itemName;
}