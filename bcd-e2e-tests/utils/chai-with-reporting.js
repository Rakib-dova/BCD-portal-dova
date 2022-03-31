"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Chaiのassertion系のメソッドとプロパティをオーバーライドします。
 *
 * メソッドはアサーションを呼び出した後にレポートへログを記録するように書き換えます。
 * プロパティはアサーションを含まないので、そのままです。
 * 参照：
 *   http://www.chaijs.com/guide/helpers/
 */
function chaiWithReporting(chai, utils) {
    const Assertion = chai.Assertion;
    const chainableMethods = [
        'an', 'a', 'include', 'contain', 'contains', 'includes', 'length', 'lengthOf'
    ];
    const properties = [
        'ok', 'true', 'false', 'null', 'undefined', 'NaN', 'exist', 'empty', 'arguments',
        'Arguments', 'extensible', 'sealed', 'frozen', 'finite'
    ];
    const methods = [
        'equal', 'equals', 'eq', 'eql', 'eqls', 'above', 'gt', 'greaterThan', 'least', 'gte',
        'below', 'lt', 'lessThan', 'most', 'lte', 'within', 'instanceof', 'instanceOf',
        'property', 'ownProperty', 'haveOwnProperty', 'ownPropertyDescriptor', 'haveOwnPropertyDescriptor',
        'match', 'matches', 'string', 'keys', 'key', 'throw', 'throws', 'Throw', 'respondTo', 'respondsTo',
        'satisfy', 'satisfies', 'closeTo', 'approximately', 'members', 'oneOf', 'change', 'changes',
        'increase', 'increases', 'decrease', 'decreases', 'by'
    ];
    chainableMethods.forEach((method) => {
        Assertion.overwriteChainableMethod(method, function (_super) {
            return function () {
                _super.apply(this, arguments);
                if (global.reporter) {
                    const message = utils.flag(this, 'message');
                    return global.reporter.addSuccessTestLog(message);
                }
            };
        }, function (_super) {
            return function () {
                _super.call(this);
            };
        });
    });
    properties.forEach((property) => {
        Assertion.overwriteProperty(property, function (_super) {
            return function () {
                _super.call(this);
                if (global.reporter) {
                    const message = utils.flag(this, 'message');
                    return global.reporter.addSuccessTestLog(message);
                }
            };
        });
    });
    methods.forEach((method) => {
        Assertion.overwriteMethod(method, function (_super) {
            return function () {
                _super.apply(this, arguments);
                if (global.reporter) {
                    const message = utils.flag(this, 'message');
                    return global.reporter.addSuccessTestLog(message);
                }
            };
        });
    });
}
exports.chaiWithReporting = chaiWithReporting;
async function comment(message) {
    if (global.reporter) {
        await global.reporter.addInfoTestLog(message);
    }
}
exports.comment = comment;
//# sourceMappingURL=chai-with-reporting.js.map