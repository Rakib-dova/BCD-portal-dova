const { ActionUtils } = require('../utils/action-utils');
const comment = require('../utils/chai-with-reporting').comment;

// 仕訳情報ダウンロード
class JournalDownloadPage {
  title = '仕訳情報ダウンロード';

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
    let frame = await this.actionUtils.waitForLoading('//*[@class="hero-body-noImage"]/*[contains(text(),"仕訳情報ダウンロード")]')
    this.frame = frame;
    return frame;
  }

  // 「最終承認済みの請求書」のチェック状態を取得する
  async isFinalApprovalChecked() {
    return await this.actionUtils.isChecked(this.frame, '#finalapproval');
  }

  // 条件絞り込みへ条件を入力する
  async inputConditions(invoiceNo, minIssuedate, maxIssuedate, sendTo, approved, dataFormat) {
    if (invoiceNo) {
      await this.addComment('「請求書番号」にて、"' + invoiceNo + '"と入力する');
      await this.actionUtils.fill(this.frame, '#invoiceNumber', invoiceNo);
    }
    await this.addComment('「発行日」にて、"' + minIssuedate + '～' + maxIssuedate + '"と入力する');
    await this.actionUtils.fill(this.frame, '#minIssuedate', minIssuedate);
    await this.actionUtils.fill(this.frame, '#maxIssuedate', maxIssuedate);
    if (sendTo) {
      await this.addComment('「送信企業」にて、"' + sendTo + '"を選択する');
      await this.actionUtils.fill(this.frame, '#sendTo', sendTo);
      await this.actionUtils.click(this.frame, '#sendToSearchBtn');
      await this.actionUtils.waitForLoading('//div[@id="searchResultBox"]//input');
      await this.actionUtils.click(this.frame, '#allSelectSentToBtn');
    }
    if (!approved) {
      await this.addComment('「ダウンロード対象」にて、「仕訳済みの請求書」をクリックする');
      await this.actionUtils.click(this.frame, '//label[contains(text(), "仕訳済みの請求書")]');
    }
    if (dataFormat) {
      await this.addComment('「出力フォーマット」にて、"' + dataFormat + '"を選択する');
      if (await this.actionUtils.isExist(this.frame, '//select[@name="serviceDataFormat"]')) {
        await this.actionUtils.selectByXpath(this.frame, '//select[@name="serviceDataFormat"]', dataFormat);
      } else {
        await this.actionUtils.click(this.frame, '//input[@name="serviceDataFormat"]/..');
        await this.actionUtils.click(this.frame, '//input[@name="serviceDataFormat"]/../ul/li//span[contains(text(), "' + dataFormat + '")]');
      }
    }
  }

  // 「出力フォーマット」プルダウンを展開する（スタンダードプラン限定）
  async openFormat() {
    await this.addComment('「出力フォーマット」プルダウンを展開する');
    await this.actionUtils.click(this.frame, '//input[@name="serviceDataFormat"]/..');
  }

  // 「出力フォーマット」プルダウンの選択可否を確認する
  async getSelectableFormats() {
    let formats = await this.actionUtils.getTexts(this.frame, '//input[@name="serviceDataFormat"]/../ul/li//span[@class="ms-dd-label"]');
    let result = '';
    let i = 0;
    for (i = 0; i < formats.length; i++) {
      if (!(await this.actionUtils.isExist(this.frame, '//input[@name="serviceDataFormat"]/../ul/li[contains(@class, "enabled")]//span[contains(text(), "' + formats[i] + '")]'))) {
        continue;
      }
      if (result) {
        result += ',';
      }
      result += formats[i];
    }
    return result;
  }

  // 「出力フォーマットを追加」が表示されているか
  async isLightPlanShown() {
    return await this.actionUtils.isDisplayed(this.frame, '//a[@data-target="information-lightplan"]');
  }

  // 「出力フォーマットを追加」をクリックする
  async clickLightPlan() {
    await this.addComment('「出力フォーマットを追加」をクリックする');
    await this.actionUtils.click(this.frame, '//a[@data-target="information-lightplan"]');
  }

  // 「CSVダウンロード」をクリックする
  async download() {
    await this.addComment('「CSVダウンロード」をクリックする');
    return await this.actionUtils.downloadFile(this.frame, '#submit');
  }

  // 「CSVダウンロード」をクリックする（データ無）
  async downloadNG() {
    await this.addComment('「CSVダウンロード」をクリックする');
    await this.actionUtils.click(this.frame, '#submit');
    let msgPath = '//div[@id="confirmmodify-modal" and contains(@class, "is-active")]//section[@class="modal-card-body"]/p';
    await this.actionUtils.waitForLoading(msgPath);
    return await this.actionUtils.getText(this.frame, msgPath);
  }
}
exports.JournalDownloadPage = JournalDownloadPage;
