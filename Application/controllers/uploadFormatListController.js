'use stric'

const uploadFormat = require('../models').UploadFormat
const logger = require('../lib/logger')

const getFormatList = async (tenantId) => {
  const uploadFormats = await uploadFormat.getUploadFormatList(tenantId)
  if (uploadFormats instanceof Error) {
    logger.error(uploadFormats)
    return []
  }

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
