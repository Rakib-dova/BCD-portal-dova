const { ActionUtils } = require('../utils/action-utils');
class RakkoToolsPage {

  constructor(browser, page) {
    this.browser = browser;
    this.page = page;
    this.actionUtils = new ActionUtils(browser, page);
  }

  // 対象URLを入力する
  async setUrl(url) {
    await this.actionUtils.fill(this.page, '#requestUrl', url);
    await this.actionUtils.click(this.page, '"確認する"');
  }

  // 表示されている各種テキストを取得する
  async getTexts() {
    const texts = {};
    texts.twitterPc = await this.actionUtils.getText(this.page, '#twUrlResultArea .simulator_area_tw_in'); // Twitter PC
    texts.twitterSp = await this.actionUtils.getText(this.page, '#twUrlResultArea .simulator_area_tw_sp_in'); // Twitter SP
    texts.twitterLPc = await this.actionUtils.getText(this.page, '#twUrlResultArea .simulator_area_tw_large_in'); // Twitter Large PC
    texts.twitterLSp = await this.actionUtils.getText(this.page, '#twUrlResultArea .simulator_area_tw_large_sp_in'); // Twitter Large SP
    return texts;
  }


}
exports.RakkoToolsPage = RakkoToolsPage;
