const constantsDefine = require('node-constants')(exports)
constantsDefine({
  // 承認依頼送信
  ReqAppr: { subject: '承認依頼受領', text: '承認依頼を受領しました。○○にアクセスし承認してください。' }
})
