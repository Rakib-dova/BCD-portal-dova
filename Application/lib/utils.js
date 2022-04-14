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

module.exports = {
  timestampForList: timestampForList
}
