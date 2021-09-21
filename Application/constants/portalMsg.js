const constantsDefine = require('node-constants')(exports)
constantsDefine({
  // お知らせ取得メッセージ
  NEWS_NONE: '現在、お知らせはありません。',
  MAINTENANCE_NON: '現在、工事故障情報はありません。',
  NEWS_CONN_ERR: '接続エラーが発生しました。'
})
