"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Jasmine用のテストレポートのアダプター
 * 参照：
 *   https://jasmine.github.io/tutorials/custom_reporter
 */
class WrReporterJasmineAdaptor {
    constructor(reporter) {
        this.asyncFlow = [];
        this.reporter = reporter;
    }
    jasmineStarted(suiteInfo) {
        try {
            // console.log('WrReporterJasmineAdaptor jasmineStarted')
            this.reporter.startProject();
            global.reporter = this.reporter;
            // 非同期処理を実行させるために待ち処理を入れる（this.reporter.endTest 完了後にafterAll(セッション解放)を行いたいため？）
            beforeEach(() => this.awaitAsyncFlow());
            afterAll(() => this.awaitAsyncFlow());
        } catch (e) {
            console.log(e)
        }
    }
    specStarted(result) {
        // console.log('WrReporterJasmineAdaptor specStarted')
        this.addTaskToFlow(async () => this.reporter.startTest(result.fullName));
    }
    specDone(result) {
        // console.log('WrReporterJasmineAdaptor specDone')
        if (result.failedExpectations !== undefined && result.failedExpectations.length > 0) {
            const error = result.failedExpectations[0];
            this.addTaskToFlow(async () => this.reporter.addErrorTestLog(error).then(() => this.reporter.endTest()));
        }
        else {
            this.addTaskToFlow(async () => this.reporter.endTest());
        }
    }
    jasmineDone() {
        try {
            // console.log('WrReporterJasmineAdaptor jasmineDone')
            this.reporter.endProject();
        } catch (e) {
            console.log(e)
        }
    }
    addTaskToFlow(task) {
        this.asyncFlow.push(task);
    }
    async awaitAsyncFlow() {
        for (const task of this.asyncFlow) {
            try {
                await task();
            } catch (e) {
                console.log(e)
            }
        }
        this.asyncFlow = [];
    }
}
exports.WrReporterJasmineAdaptor = WrReporterJasmineAdaptor;