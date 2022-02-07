'use strict'
const define = require('node-constants')(exports)
define({
  // 一回の請求書発行の最大数
  MAX_SEND_SIZE: 100,
  // Tradeshiftから一括取得する最大文書数
  MAX_PAGE_SIZE: 10000
})
