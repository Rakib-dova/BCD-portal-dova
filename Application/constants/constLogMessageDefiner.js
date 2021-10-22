const constantsDefine = require('node-constants')(exports)
constantsDefine({
  INF000: 'INF001:Start - ', // メソッド名を出力
  INF001: 'INF002:END - ', // メソッド名を出力
  WARN001: 'WARN001:Authentication failure - ', // 失敗理由を出力
  ERR001: 'ERR001:TradeShift API ERROR - ', // 失敗理由を出力
  DBG001: 'DBG001:Tradeshift API Access: reqest', // API呼び出しリクエスト情報を出力
  DBG002: 'DBG002:Tradeshift API Access: response', // API呼び出しレスポンス情報を出力
  DBG003: 'DBG003:Tradeshift API Access: try token refresh', // API呼び出しリフレッシュトークン
  TRC001: 'TRC001:Trace reqest', // リクエスト情報を出力
  TRC002: 'TRC002:Trace response', // レスポンス情報を出力
  TRC003: 'TRC003:Trace param', // パラメータ情報を出力
  TRC004: 'TRC003:Trace result', // 返却結果を出力

  CMMERR000: 'パラメータがありません。', // メソッドパラメータエラー
  DBINF000: '検索結果がありません。', // DB検索結果0件
  DBINF001: 'データ操作に失敗しました。' // DB操作結果なし
})
