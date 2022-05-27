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
  if (/^(?=.*AppleWebKit)(?=.*Safari)(?=.*Chrome).*$/.test(ua)) {
    return 'chrome'
  } else if (/^(?=.*Chromium)(?=.*Edge).*$/.test(ua)) {
    return 'edge'
  } else if (/^(?=.*Gecko)(?=.*Firefox).*$/.test(ua)) {
    return 'firefox'
  } else if (/^(?=.*Opera).*$/.test(ua)) {
    return 'opera'
  } else if (/^(?=.*Mac)(?=.*Safari).*$/.test(ua)) {
    return 'safari'
  } else {
    return 'others'
  }
}

module.exports = {
  timestampForList: timestampForList,
  getBrowser
}
