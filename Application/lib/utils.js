// 一覧の更新日を出力するタイムスタンプ「yyyy/mm/dd」、データObjectではない場合''に返す
const timestampForList = (timeObject) => {
  if (timeObject instanceof Date) {
    return `${timeObject.getFullYear()}/${('0' + (timeObject.getMonth() + 1)).slice(-2)}/${(
      '0' + timeObject.getDate()
    ).slice(-2)}`
  } else {
    return ''
  }
}

const getBrowser = (ua) => {
  if (/^(?=.*AppleWebKit)(?=.*Safari)(?=.*Chrome)(?!.*Firefox)(?!.*Edg)(?!.*Mac)(?!.*OPR)/.test(ua)) {
    return 'chrome'
  } else if (/^(?=.*Chrome)(?=.*Edg)(?!.*Firefox)/.test(ua)) {
    return 'edge'
  } else if (/^(?=.*Firefox)(?!.*AppleWebKit)/.test(ua)) {
    return 'firefox'
  } else {
    return 'others'
  }
}

module.exports = {
  timestampForList: timestampForList,
  getBrowser
}
