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

const formatDate = (date, format) => {
  format = format.replace(/YYYY/, date.getFullYear())
  format = format.replace(/MM/, date.getMonth() + 1)
  format = format.replace(/DD/, date.getDate())
  return format
}

const getType = (val) => {
  return Object.prototype.toString.call(val).replace(/\[|\]|object /g, '')
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
  formatDate: formatDate,
  getType,
  getBrowser
}
