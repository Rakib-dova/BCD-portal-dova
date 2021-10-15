'use stric'

const uploadFormat = require('../models').UploadFormat
const logger = require('../lib/logger')

const getFormatList = async (tenantId) => {
  // テナントIDでDBからアップロードフォーマットデータを取得
  const uploadFormats = await uploadFormat.getUploadFormatList(tenantId)
  if (uploadFormats instanceof Error) {
    logger.error(uploadFormats)
    return uploadFormats
  }

  // 取得したデータを画面に表示するデータに加工
  // 加工物
  // {
  //    uuid：      アップロードフォーマットのユニークな番号
  //    No：        作成日から並べた順番
  //    setName：   使用者が設定したアップロードフォーマットの名称
  //    uploadType：アップロードフォーマットの種別
  //    updatedAt： アップロードフォーマットの更新日
  // }
  const displayList = uploadFormats.map((item, idx) => {
    const timestamp = `${item.updatedAt.getFullYear()}/${('0' + (item.updatedAt.getMonth() + 1)).slice(-2)}/${(
      '0' + item.updatedAt.getDate()
    ).slice(-2)}`
    return {
      uuid: item.uploadFormatId,
      No: idx + 1,
      setName: item.setName,
      uploadType: item.uploadType,
      updatedAt: timestamp
    }
  })

  return displayList
}

module.exports = {
  getFormatList: getFormatList
}
