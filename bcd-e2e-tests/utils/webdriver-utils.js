const wr_reporter_jasmine_adaptor_1 = require("./wr-reporter-jasmine-adaptor");
const wr_test_reporter_1 = require("./wr-test-reporter");
const autotest_report_config = require("../autotest-report-config")

let isReporterCreated = false;
let localFlag = process.env.local_flag == 'true' ? true : false;

// Chromeブラウザを起動する
function openChrome(chromium) {
  const options = {
    //headless: false,
//    channel: 'chrome',
//    args: ['--window-size=1536,864']
  }
  return chromium.launch(options);
}
exports.openChrome = openChrome;

// Edgeブラウザを起動する
function openEdge(chromium) {
  const options = {
    //headless: false,
//    channel: 'msedge',
//    args: ['--window-size=1536,864'],
  }
  return chromium.launch(options);
}
exports.openEdge = openEdge;

// Firefoxブラウザを起動する 
function openFirefox(firefox) {
//  const options = {
    //headless: false,
//  }
  return firefox.launch(options);
}
exports.openFirefox = openFirefox;

// Jasmineにレポートツールを登録する
function setReporter() {
  // 初回実行時のみ生成
  if (!isReporterCreated) {
    const reporter = new wr_test_reporter_1.WrTestReporter(autotest_report_config);
    jasmine.getEnv().addReporter(new wr_reporter_jasmine_adaptor_1.WrReporterJasmineAdaptor(reporter));
    isReporterCreated = true;
  }
}
exports.setReporter = setReporter;