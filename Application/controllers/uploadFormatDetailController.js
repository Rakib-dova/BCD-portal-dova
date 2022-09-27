const db = require('../models')
const logger = require('../lib/logger')
const uploadFormatController = require('./uploadFormatController')
const UploadDetail = db.UploadFormatDetail
const constantsDefine = require('../constants')

module.exports = {
  /**
   * アップロードフォーマット詳細テーブル登録
   * @param {object} values
   * {
   *   uploadFormatId(PK)(FK)=>UploadFormat(uploadFormatId),
   *   serialNumber(PK),
   *   uploadFormatItemName,
   *   uploadFormatNumber,
   *   defaultItemName,
   *   defaultNumber,
   *   createdAt,
   *   updatedAt
   *  }
   * @returns {UploadFormatDetail} アップロードフォーマット詳細情報
   */
  insert: async (values) => {
    const functionName = 'uploadFormatDetailController.insert'
    logger.info(`${constantsDefine.logMessage.INF000}${functionName}`)
    const uploadFormatId = values?.uploadFormatId

    if (!uploadFormatId) {
      logger.error(`${constantsDefine.logMessage.CMMERR000}${functionName}`)
      return
    }
    const uploadFormatRow = await uploadFormatController.findUploadFormat(uploadFormatId)

    if (!uploadFormatRow?.dataValues.uploadFormatId) {
      logger.info(`${constantsDefine.logMessage.DBINF000}${functionName}`)
      return
    }

    let resultToInsertUploadFormatDetail

    try {
      resultToInsertUploadFormatDetail = await UploadDetail.create({
        ...values,
        uploadFormatId: uploadFormatRow?.dataValues.uploadFormatId
      })
    } catch (error) {
      logger.error(
        {
          values: {
            ...values,
            uploadFormatId: uploadFormatRow?.dataValues.uploadFormatId
          },
          stack: error.stack,
          status: 0
        },
        error.name
      )
    }

    logger.info(`${constantsDefine.logMessage.INF001}${functionName}`)
    return resultToInsertUploadFormatDetail
  },
  /**
   * アップロードフォーマット詳細情報取得
   * @param {uuid} uploadFormatId アップロードフォーマットID
   * @returns {UploadFormatDetail} アップロードフォーマット詳細情報（正常）、Error（DBエラー、システムエラーなど）
   */
  findByUploadFormatId: async (uploadFormatId) => {
    try {
      return await UploadDetail.findAll({
        where: {
          uploadFormatId: uploadFormatId
        }
      })
    } catch (error) {
      // status 0はDBエラー
      logger.error({ uploadFormatId: uploadFormatId, stack: error.stack, status: 0 }, error.name)
      return error
    }
  }
}
