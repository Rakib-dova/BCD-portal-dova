const constantsDefine = require('node-constants')(exports)
constantsDefine({
  INF000: 'INF001:Start - ', // メソッド名を出力
  INF001: 'INF002:END - ', // メソッド名を出力
  WARN001: 'WARN001:Authentication failure - ', // 失敗理由を出力
  ERR001: 'ERR001:TradeShift API ERROR - ' // 失敗理由を出力
})
