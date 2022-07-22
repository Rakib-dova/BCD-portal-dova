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

  // 部門コードエラーメッセージ
  DEPARTMENTCODEERR000: `${codeValidDefine.DEPARTMENTCODE_KEY}が未入力です。`,
  DEPARTMENTCODEERR001: `${codeValidDefine.DEPARTMENTCODE_KEY}は${codeValidDefine.CODE_LENGTH}文字以内で入力してください。`,
  DEPARTMENTCODEERR002: `${codeValidDefine.DEPARTMENTCODE_KEY}は英数字カナで入力してください。`,
  DEPARTMENTCODEERR003: `入力した${codeValidDefine.DEPARTMENTCODE_KEY}は既に登録されています。`,

  // 部門名エラーメッセージ
  DEPARTMENTNAMEERR000: `${codeValidDefine.DEPARTMENTNAME_KEY}が未入力です。`,
  DEPARTMENTNAMEERR001: `${codeValidDefine.DEPARTMENTNAME_KEY}は${codeValidDefine.NAME_LENGTH}文字以内で入力してください。`,

  // --------------------CSVファイル件数
  // 勘定科目上限値超過
  ACCOUNTCOUNTERR000:
    '勘定科目が200件を超えています。<BR>CSVファイルを確認後もう一度アップロードしてください。<BR>  （一度に取り込める勘定科目は200件までとなります。）',
  // 補助科目上限値超過
  SUBACCOUNTCOUNTERR000:
    '補助科目が200件を超えています。<BR>CSVファイルを確認後もう一度アップロードしてください。<BR>（一度に取り込める補助科目は200件までとなります。）',
  // 部門データ上限値超過
  DEPARTMENTCOUNTERR000:
    '部門データが200件を超えています。<BR>CSVファイルを確認後もう一度アップロードしてください。<BR>  （一度に取り込める部門データは200件までとなります。）',
  // ユーザーデータ上限値超過
  UPLOADUSERCOUNTER000:
    '一括登録ユーザーが200件を超えています。<BR>CSVファイルを確認後もう一度アップロードしてください。<BR>  （一度に取り込めるユーザーは200件までとなります。）',
  // 取引先データ上限値超過
  UPLOADSUPPLIERSCOUNTER000:
    '一括登録取引先ーが200件を超えています。<BR>CSVファイルを確認後もう一度アップロードしてください。<BR>  （一度に取り込める取引先は200件までとなります。）',

  // --------------------共通メッセージ--------------------
  // システムエラー
  SYSERR000: 'システムエラーです。<BR>（後程、接続してください。）',
  // CSVファイルヘッダエラーメッセージ
  CODEHEADERERR000: 'ヘッダーが指定のものと異なります。',
  // CSVファイルデータエラーメッセージ
  CODEDATAERR000: '項目数が異なります。'
})
