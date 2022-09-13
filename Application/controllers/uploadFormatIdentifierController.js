const db = require('../models')
const logger = require('../lib/logger')
const uploadFormatController = require('./uploadFormatController')
const UploadIdentifier = db.UploadFormatIdentifier
const constantsDefine = require('../constants')

module.exports = {
  /**
   * アップロードフォーマット識別子テーブル登録
   * @param {object} values
   * {
   *   uploadFormatId(PK)(FK)=>UploadFormat(uploadFormatId),
   *   serialNumber(PK),
   *   extensionType,
   *   uploadFormatExtension,
   *   defaultExtension,
   *   createdAt,
   *   updatedAt
   *  }
   * @returns {UploadFormatIdentifier} アップロードフォーマット識別子情報
   */
  insert: async (values) => {
    const functionName = 'uploadFormatIdentifierController.insert'
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

    let resultToInsertUploadFormatIdentifier

    try {
      resultToInsertUploadFormatIdentifier = await UploadIdentifier.create({
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
    return resultToInsertUploadFormatIdentifier
  },
  /**
   * アップロードフォーマット識別子情報取得
   * @param {uuid} uploadFormatId アップロードフォーマットID
   * @returns {UploadFormatIdentifier} アップロードフォーマット識別子情報（正常）、Error（DBエラー、システムエラーなど）
   */
  findByUploadFormatId: async (uploadFormatId) => {
    try {
      return await UploadIdentifier.findAll({
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
