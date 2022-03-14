const constantsDefine = require('node-constants')(exports)
constantsDefine({
  INF000: 'INF001:Start - ', // メソッド名を出力
  INF001: 'INF002:END - ', // メソッド名を出力
  WARN001: 'WARN001:Authentication failure - ', // 失敗理由を出力
  ERR001: 'ERR001:TradeShift API ERROR - ', // 失敗理由を出力

  CMMERR000: 'パラメータがありません。', // メソッドパラメータエラー
  DBINF000: '検索結果がありません。', // DB検索結果0件
  DBINF001: 'データ操作に失敗しました。', // DB操作結果なし

  MAILINF000: 'MIALINF000: Email send start', // メール送信処理開始
  MAILINF001: 'MIALINF000: Email send end', // メール送信終了
  MAILINF002: 'MIALINF000: Email sent - ', // メール送信完了
  MAILWAN000: 'MAILWAN000: Email send error - ' // メール相送信エラー
})
