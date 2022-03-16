const constantsDefine = require('node-constants')(exports)
constantsDefine({
  // 支払依頼送信
  ReqAppr: {
    subject: 'BConnectionデジタルトレードお知らせ　支払依頼',
    text: '承認依頼を受領しました。○○にアクセスし承認してください。'
  }
})
