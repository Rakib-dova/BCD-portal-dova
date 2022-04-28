const { ActionUtils } = require('../utils/action-utils');

// 承認ルート一覧
class ApproveRouteListPage {

  // コンストラクタ
  constructor(browser, page) {
    this.browser = browser;
    this.page = page;
    this.actionUtils = new ActionUtils(browser, page);
  }

  // ページが表示されるまで待機する
  async waitForLoading() {
    let frame = await this.actionUtils.waitForLoading('//*[@class="hero-body-noImage"]/*[contains(text(),"承認ルート一覧")]')
    this.frame = frame;
    return frame;
  }
}
exports.ApproveRouteListPage = ApproveRouteListPage;
