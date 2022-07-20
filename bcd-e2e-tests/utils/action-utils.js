const fs = require('fs');
class ActionUtils {

  constructor(browser, page) {
    this.browser = browser;
    this.page = page;
  }

  // 要素を取得する
  async getElement(target, selector) {
    await target.waitForSelector(selector, { state: 'attached' });
    let elem = await target.$(selector);
    return elem;
  }

  // 要素を複数取得する
  async getElements(target, selector) {
    return await target.$$(selector);
  }

  // フレーム内の要素が表示されるまで待機する
  async waitForLoading(elemSelector, frameSelector = '[name="main-app-iframe"]') {
    let frame, elem, elems;
    const timeout = 60000;
    const start = Date.now();
    while (true) {
      if ((Date.now() - start) >= timeout) {
        break;
      }
      try {
        elem = await this.getElement(this.page, frameSelector);
        frame = await elem.contentFrame();
        elems = await frame.$$(elemSelector)
        if (elems.length > 0) {
          break;
        }
      } catch (e) {
        // console.log(e)
      }
      await this.page.waitForTimeout(1000);
    }
    await this.page.waitForTimeout(3000);
    return frame;
  }

  // クリックする
  async click(target, selector) {
    const elem = await this.getElement(target, selector);
    await elem.click();
    await this.page.waitForTimeout(500);
  }

  // テキスト入力する
  async fill(target, selector, text) {
    await this.commonInput(target, selector, text, true);
    await this.page.waitForTimeout(500);
  }
  async type(target, selector, text) {
    await this.commonInput(target, selector, text, false);
    await this.page.waitForTimeout(500);
  }
  async commonInput(target, selector, text, isFill) {
    const elem = await this.getElement(target, selector);
    // 数値が渡されてきた場合は、文字列に変換する
    if (Number.isFinite(text)) {
      text = String(text);
    }
    if (isFill) {
      await elem.fill(text);
    } else {
      await elem.type(text);
    }
  }

  // チェックボックスにチェックを入れる、外す。
  async check(target, selector, checked) {
    const elem = await this.getElement(target, selector);
    await elem.setChecked(checked);
    await this.page.waitForTimeout(500);
  }

  // チェックボックスにチェックが入っているか
  async isChecked(target, selector) {
    const elem = await this.getElement(target, selector);
    return await elem.isChecked();
  }

  // チェックボックスにチェックが入っているか
  async getEachElementsIsChecked(target, selector) {
    const elems = await this.getElements(target, selector);
    const resultList = [];
    for (const elem of elems) {
      resultList.push(await elem.isChecked());
    }
    return resultList;
  }

  // ドロップダウンリストから選択する（xpathのみ対応）
  async selectByXpath(target, xpath, text) {
    const option = await target.$(`${xpath}//option[text()="${text}"]`);
    await target.evaluate(node => node.selected = true, option);
    await this.page.waitForTimeout(500);
  }

  // ファイルをアップロードする
  async uploadFile(target, selector, filePath) {
    await target.setInputFiles(selector, filePath);
    await this.page.waitForTimeout(500);
  }

  // ファイルをダウンロードする
  async downloadFile(frame, selector) {
    const [download] = await Promise.all([
      this.page.waitForEvent('download'),
      this.click(frame, selector),
    ]);
    return await download.path();
  }

  // クリックにより開かれたタブのURLを取得する
  async openNewTabAndGetUrl(target, selector) {
    const newPage = await this.openNewTab(target, selector);
    await this.page.waitForTimeout(500);
    const url = newPage.url();
    await newPage.close();
    await this.page.bringToFront();
    return url;
  }

  // クリックによりタブを開く
  async openNewTab(target, selector) {
    const [newPage] = await Promise.all([
      this.page.waitForEvent('popup'),
      this.click(target, selector)
    ]);
    await this.page.waitForTimeout(1000)
    return newPage;
  }

  // 属性値を取得する
  async getAttr(target, selector, attrName) {
    const elem = await this.getElement(target, selector);
    return await target.evaluate(([node, attr]) => node.getAttribute(attr), [elem, attrName]);
  }

  // テキストを取得する
  async getText(target, selector) {
    const elem = await this.getElement(target, selector);
    return (await target.evaluate(node => node.textContent, elem)).trim();
  }

  // 各要素のテキストを配列で取得する
  async getTexts(target, selector) {
    const elems = await this.getElements(target, selector);
    const textList = [];
    for (const elem of elems) {
      textList.push((await target.evaluate(node => node.textContent, elem)).trim());
    }
    return textList;
  }

  // Value属性を取得する
  async getValue(target, selector) {
    const elem = await this.getElement(target, selector);
    return (await target.evaluate(node => node.value, elem)).trim();
  }

  // 各要素のValue属性を配列で取得する
  async getValues(target, selector) {
    const elems = await this.getElements(target, selector);
    const valueList = [];
    for (const elem of elems) {
      valueList.push((await target.evaluate(node => node.value, elem)).trim());
    }
    return valueList;
  }

  // 要素が存在するか
  async isExist(target, selector) {
    const elems = await this.getElements(target, selector);
    return elems.length > 0
  }

  // 要素が表示されているか
  async isDisplayed(target, selector) {
    const elems = await this.getElements(target, selector);
    return (elems.length > 0) && (await target.evaluate(node => window.getComputedStyle(node).display, elems[0]) != 'none')
  }

  // 要素が非活性状態であるか
  async isDisabled(target, selector) {
    const elems = await this.getElements(target, selector);
    return (elems.length > 0) && (await elems[0].isDisabled());
  }

  // 一番下までスクロールする
  async scrollToEnd(target, selector) {
    const elem = await this.getElement(target, selector);
    await elem.press('End');
    await this.page.waitForTimeout(500);
  }
}
exports.ActionUtils = ActionUtils;
