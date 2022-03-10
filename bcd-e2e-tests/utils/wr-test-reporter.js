"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const uuid = require("uuid");
const mkdirp = require("mkdirp");
const os = require("os");
const path = require("path");
const screenshot_utils_1 = require("./screenshot-utils");
const REPORT_FILE_NAME = 'result.json';

/**
 * テストレポートツールのメインクラス
 */
class WrTestReporter {
    /**
     * コンストラクタ、設定ファイルの読み込みをして初期化する
     */
    constructor(config) {
        this.config = config;
    }
    // get browser() {
    //     return this.browser;
    // }
    setBrowserInfo(browser, page) {
        this.browser = browser;
        this.page = page;
    }

    /**
     * テストプロジェクトの開始時に呼び出されるメソッド
     */
    startProject() {
        // console.log('WrTestReporter startProject');
        this.testProject = {
            id: uuid.v4(),
            projectName: this.config.projectName,
            systemInformation: this.fetchSystemInformation(),
            runtimeInformation: this.fetchRuntimeInformation(),
            jenkinsInformation: this.fetchJenkinsInformation(),
            testCases: new Array()
        };

        this.reportDir = this.config.reportDirectory;

        // 現在の日付を取得する
        const now = new Date();
        this.dayTime = this.getFormattedDate(now);

        // 出力先ディレクトリがある場合、消して作成し直す
        if (fs.existsSync(this.reportDir)) {
            this.rmdirRecursive(this.reportDir);
        }
        mkdirp.sync(this.reportDir);
    }
    /**
     * テスト個別の開始ごとに呼び出されるメソッド
     * @param testCaseName テストケースの名称
     */
    startTest(testCaseName) {
        // console.log('WrTestReporter startTest');
        this.testCase = {
            id: uuid.v4(),
            testCaseName: testCaseName,
            runningTimeInformation: {
                startTime: new Date().toISOString()
            },
            testLogs: new Array()
        };
    }
    /**
     * テスト個別の終了ごとに呼び出されるメソッド
     */
    async endTest() {
        // console.log('WrTestReporter endTest');
        if (this.testCase === undefined || this.testProject === undefined) {
            throw new Error('初期化されていません');
        }
        this.testCase.runningTimeInformation.endTime = new Date().toISOString();
        this.testCase.driverInformation = await this.fetchDriverInformation();
        this.testCase.browserLogs = await this.fetchBrowserLogs();
        this.testProject.testCases.push(this.testCase);

        // セッションを終了する
        if (this.closeProcess != null) {
            await this.closeProcess();
        }
    }

    // 個別テスト終了処理(endTest)の最後にWebDriverを終了するため、一時的に終了処理を保持しておく
    setCloseDriver(closeProcess) {
        this.closeProcess = closeProcess;
    }

    /**
     * テストプロジェクトの終了時に呼び出されるメソッド
     */
    async endProject() {
        // console.log('WrTestReporter endProject');
        mkdirp.sync(this.reportDir);
        const output = path.join(this.reportDir, REPORT_FILE_NAME);
        fs.writeFileSync(output, JSON.stringify(this.testProject, null, 4));
    }

    /**
     * アサーション成功時のログを追加します
     * @param string 記録するメッセージ
     */
    async addSuccessTestLog(message) {
        // console.log('WrTestReporter addSuccessTestLog');
        if (this.testCase === undefined) {
            throw new Error('初期化されていません');
        }
        const testLog = {
            id: uuid.v4(),
            timestamp: new Date().toISOString(),
            logType: 'SUCCESS',
            description: message
        };
        // スクリーンショットの取得
        if (this.config.enableScreenshot === 'ALWAYS') {
            try {
                testLog.attachedFiles = [await this.getScreenShot(testLog)];
            }
            catch (e) {
                console.log('スクリーンショットの取得に失敗しました');
                console.log(e);
                testLog.attachedFiles = [];
            }
        }
        // ページ情報の取得
        if (this.config.enablePageInformation === 'ALWAYS') {
            testLog.currentPageInformation = await this.fetchCurrentPageInformation();
        }
        // テストケースに格納する
        this.testCase.testLogs.push(testLog);
    }
    /**
     * 任意のログ（アサーションでないもの）を追加します
     * @param message 記録するメッセージ
     */
    async addInfoTestLog(message) {
        // console.log('WrTestReporter addInfoTestLog');
        if (this.testCase === undefined) {
            throw new Error('初期化されていません');
        }
        const testLog = {
            id: uuid.v4(),
            timestamp: new Date().toISOString(),
            logType: 'INFO',
            description: message
        };
        // スクリーンショットの取得
        if (this.config.enableScreenshot === 'ALWAYS') {
            try {
                testLog.attachedFiles = [await this.getScreenShot(testLog)];
            }
            catch (e) {
                console.log('スクリーンショットの取得に失敗しました');
                console.log(e);
                testLog.attachedFiles = [];
            }
        }
        // ページ情報の取得
        if (this.config.enablePageInformation === 'ALWAYS') {
            testLog.currentPageInformation = await this.fetchCurrentPageInformation();
        }
        // テストケースに格納する
        this.testCase.testLogs.push(testLog);
    }
    /**
     * エラー発生時にのログを追加します
     * @param error 例外情報
     */
    async addErrorTestLog(error) {
        // console.log('WrTestReporter addErrorTestLog');
        if (this.testCase === undefined) {
            throw new Error('初期化されていません');
        }
        let description = error.message;
        if (error.name) {
            description = `${error.name}: ${description}`;
        }
        const testLog = {
            id: uuid.v4(),
            timestamp: new Date().toISOString(),
            logType: 'ERROR',
            description: description,
            stackTrace: error.stack
        };
        // スクリーンショットの取得
        if (this.config.enableScreenshot === 'ALWAYS' || this.config.enableScreenshot === 'ERROR_ONLY') {
            try {
                testLog.attachedFiles = [await this.getScreenShot(testLog)];
            }
            catch (e) {
                console.log('スクリーンショットの取得に失敗しました');
                console.log(e);
                testLog.attachedFiles = [];
            }
        }
        // ページ情報の取得
        if (this.config.enablePageInformation === 'ALWAYS' || this.config.enableScreenshot === 'ERROR_ONLY') {
            try {
                testLog.currentPageInformation = await this.fetchCurrentPageInformation();
            }
            catch (e) {
                console.log('ページ情報の取得に失敗しました');
                console.log(e);
                testLog.currentPageInformation = null;
            }
        }
        // テストケースに格納する
        this.testCase.testLogs.push(testLog);
    }
    async getScreenShot(testLog) {
        if (this.testCase === undefined) {
            throw new Error('初期化されていません');
        }
        // 待機時間の指定があれば待機する
        if (this.config.screenshotWait > 0) {
            await this.page.waitForTimeout(this.config.screenshotWait);
        }
        const attachedFile = {
            id: uuid.v4()
        };
        // スクリーンショットの保存先ディレクトリを作成する
        const pngDir = path.join('testCases', this.testCase.id, 'testLogs', testLog.id, 'attachedFiles');
        await mkdirp.sync(path.join(this.reportDir, pngDir));
        // スクリーンショットのファイル名を作成する
        const filename = `${attachedFile.id}.png`;
        const outputPath = path.join(this.reportDir, pngDir, filename);
        // スクリーンショットの取得
        if (this.config.enableFullPageScreenshot) {
            await screenshot_utils_1.makeFullScreenShot(this.page, outputPath);
        }
        else {
            await screenshot_utils_1.makeScreenShot(this.page, outputPath);
        }
        attachedFile.path = path.join(pngDir, filename);
        attachedFile.fileType = 'SCREENSHOT';
        attachedFile.mimeType = 'image/png';
        return attachedFile;
    }
    fetchSystemInformation() {
        return {
            os: this.getOsName(),
            hostName: this.getHostName(),
            ipAddress: this.getLocalAddress()
        };
    }
    getOsName() {
        return `${os.platform()}, ${os.arch()}, ${os.release()}`;
    }
    getHostName() {
        return os.hostname();
    }
    getLocalAddress() {
        try {
            const interfaces = os.networkInterfaces();
            const addresses = new Array();
            for (const dev in interfaces) {
                if (interfaces.hasOwnProperty(dev)) {
                    interfaces[dev].forEach((details) => {
                        if (!details.internal && details.family === 'IPv4') {
                            addresses.push(details.address);
                        }
                    });
                }
            }
            return addresses.length > 0 ? addresses[0] : 'Unknown';
        }
        catch (e) {
            return 'Unknown';
        }
    }
    fetchRuntimeInformation() {
        return {
            runtimeLanguage: 'JavaScript/Node.js',
            runtimeVersion: `Node.js ${process.version} ${process.platform}`,
            workspace: process.cwd()
        };
    }
    fetchJenkinsInformation() {
        const jobName = process.env['JOB_NAME'];
        const buildNo = process.env['BUILD_NUMBER'];
        if (jobName === undefined || buildNo === undefined) {
            return null;
        }
        return {
            jobName: jobName,
            buildNo: parseInt(buildNo, 10)
        };
    }
    async fetchDriverInformation() {
        try {
            const browserInfo = await this.browser.version();
            const browserInfoList = browserInfo.split('/');
            return {
                capabilities: {
                    browserName: browserInfoList[0],
                    browserVersion: browserInfoList[1],
                    platformName: os.platform(),
                    platformVersion: os.release()
                }
            };
        }
        catch (e) {
            return null;
        }
    }
    toObject(cap) {
        const ret = Object.create(null);
        for (const key of cap.keys()) {
            ret[key] = cap.get(key);
        }
        return ret;
    }
    async fetchBrowserLogs() {
        // WebDriverIOではブラウザログを取得できないため、コメントアウトする
        // const availableLogTypes = await this.driver.logTypes();
        // if (availableLogTypes.indexOf('browser') === -1) {
        //     return null;
        // }
        // const logs = await this.driver.log('browser');
        // return logs.map((log) => {
        //     return {
        //         level: log.level.name,
        //         message: log.message,
        //         timestamp: new Date(log.timestamp).toISOString()
        //     };
        // });
    }
    async fetchCurrentPageInformation() {
        // if (!this.browserType.name()) {
        //     return null;
        // }

        const pageTitle = await this.page.title();
        const pageUrl = await this.page.url();
        // if (caps.platformName &&
        //     (caps.platformName.toUpperCase() === 'ANDROID'
        //         || caps.platformName.toUpperCase() === 'IOS')) {
        //     return {
        //         pageTitle: pageTitle,
        //         pageUrl: pageUrl,
        //         windowSize: null,
        //         windowPosition: null
        //     };
        // }
        const size = await this.page.viewportSize();
        // WebDriverIOはウインドウ位置を取得できないためコメントアウトする
        // const position = await this.driver.getWindowPosition();
        return {
            pageTitle: pageTitle,
            pageUrl: pageUrl,
            windowSize: size ? `(${size.width}, ${size.height})` : null,
            windowPosition: null
            // windowPosition: `(${position.x}, ${position.y})`
        };
    }
    rmdirRecursive(dir) {
        const files = fs.readdirSync(dir);
        for (const file of files) {
            const filename = path.join(dir, file);
            const stat = fs.statSync(filename);
            if (stat.isDirectory()) {
                this.rmdirRecursive(filename);
            }
            else if (stat.isFile()) {
                fs.unlinkSync(filename);
            }
        }
        fs.rmdirSync(dir);
    }

    // Date型の日付をYYYYMMDDHHMMSS形式の文字列に変換する
    getFormattedDate(date) {
        return date.getFullYear()
            + ('0' + (date.getMonth() + 1)).slice(-2)
            + ('0' + date.getDate()).slice(-2)
            + ('0' + date.getHours()).slice(-2)
            + ('0' + date.getMinutes()).slice(-2)
            + ('0' + date.getSeconds()).slice(-2);
    }
}
exports.WrTestReporter = WrTestReporter;
//# sourceMappingURL=wr-test-reporter.js.map