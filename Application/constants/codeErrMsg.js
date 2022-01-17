const constantsDefine = require('node-constants')(exports)
const codeValidDefine = require('./codeValidDefine')
constantsDefine({
  // 勘定科目コードエラーメッセージ
  ACCOUNTCODEERR000: `${codeValidDefine.ACCOUNTCODE_KEY}が未入力です。`,
  ACCOUNTCODEERR001: `${codeValidDefine.ACCOUNTCODE_KEY}は${codeValidDefine.CODE_LENGTH}文字以内で入力してください。`,
  ACCOUNTCODEERR002: `${codeValidDefine.ACCOUNTCODE_KEY}は英数字で入力してください。`,
  ACCOUNTCODEERR003: `入力した${codeValidDefine.ACCOUNTCODE_KEY}は既に登録されています。`,
  ACCOUNTCODEERR004: `未登録の${codeValidDefine.ACCOUNTCODE_KEY}です。事前に「勘定科目登録画面」から${codeValidDefine.ACCOUNTCODE_KEY}を登録してください。`,

  // 勘定科目名エラーメッセージ
  ACCOUNTNAMEERR000: `${codeValidDefine.ACCOUNTNAME_KEY}が未入力です。`,
  ACCOUNTNAMEERR001: `${codeValidDefine.ACCOUNTNAME_KEY}は${codeValidDefine.NAME_LENGTH}文字以内で入力してください。`,

  // 補助科目コードエラーメッセージ

  SUBACCOUNTCODEERR000: `${codeValidDefine.SUBACCOUNTCODE_KEY}が未入力です。`,
  SUBACCOUNTCODEERR001: `${codeValidDefine.SUBACCOUNTCODE_KEY}は${codeValidDefine.CODE_LENGTH}文字以内で入力してください。`,
  SUBACCOUNTCODEERR002: `${codeValidDefine.SUBACCOUNTCODE_KEY}は英数字で入力してください。`,
  SUBACCOUNTCODEERR003: `入力した${codeValidDefine.SUBACCOUNTCODE_KEY}は既に登録されています。`,

  // 補助科目名エラーメッセージ
  SUBACCOUNTNAMEERR000: `${codeValidDefine.SUBACCOUNTNAME_KEY}が未入力です。`,
  SUBACCOUNTNAMEERR001: `${codeValidDefine.SUBACCOUNTNAME_KEY}は${codeValidDefine.NAME_LENGTH}文字以内で入力してください。`,

  // CSVファイル件数
  ACCOUNTCOUNTERR000:
    '勘定科目が200件を超えています。<BR>CSVファイルを確認後もう一度アップロードしてください。<BR>  （一度に取り込める勘定科目は200件までとなります。）',

  // システムエラー
  SYSERR000: 'システムエラーです。<BR>（後程、接続してください。）',

  // CSVファイルヘッダエラー
  ACCOUNTHEADERERR000: 'ヘッダーが指定のものと異なります。',

  // CSVファイルデータエラー
  ACCOUNTDATAERR000: '項目数が異なります。'
})
