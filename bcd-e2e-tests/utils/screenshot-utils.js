/**
 * スクリーンショットを取得します
 * @param page ページクラス
 * @param path 保存先のファイルのパス
 */
async function makeScreenShot(page, path) {
    await page.screenshot({ path: path, fullPage: false });
}
exports.makeScreenShot = makeScreenShot;

/**
 * フルスクリーンショットを取得します
 * @param page ページクラス
 * @param path 保存先のファイルのパス
 */
async function makeFullScreenShot(page, path) {
    await page.screenshot({ path: path, fullPage: true });
}
exports.makeFullScreenShot = makeFullScreenShot;
