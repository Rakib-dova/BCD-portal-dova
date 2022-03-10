const fs = require('fs');
const mkdirp = require('mkdirp');
const path = require('path');

const { ActionUtils } = require('../utils/action-utils');
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

// ページオブジェクトのインスタンスを取得する
exports.getPageObject = (browser, page) => {
  const loginPage = new LoginPage(browser, page);
  const topPage = new TopPage(browser, page);
  const tradeShiftTopPage = new TradeShiftTopPage(browser, page);
  const supportMenuPage = new SupportMenuPage(browser, page);
  const uploadInvoiceMenuPage = new UploadInvoiceMenuPage(browser, page);
  const uploadInvoicePage = new UploadInvoicePage(browser, page);
  const uploadFormatTopPage = new UploadFormatTopPage(browser, page);
  const uploadFormatCreatePage = new UploadFormatCreatePage(browser, page);
  const uploadFormatSettingPage = new UploadFormatSettingPage(browser, page);
  const uploadFormatConfirmPage = new UploadFormatConfirmPage(browser, page);
  return { loginPage, topPage, tradeShiftTopPage, supportMenuPage, uploadInvoiceMenuPage, uploadInvoicePage, uploadFormatTopPage, uploadFormatCreatePage, uploadFormatSettingPage, uploadFormatConfirmPage }
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

