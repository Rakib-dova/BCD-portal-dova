const db = require('../models')
const logger = require('../lib/logger')
const contractController = require('./contractController')
const Upload = db.UploadFormat
const constantsDefine = require('../constants')

module.exports = {
  // パラメータ値
  // values = {
  //   uploadFormatId(PK) - フォーマットID,
  //   contractId(FK)=>Contracts(contractIdId) - 契約ID,
  //   setName - フォーマット名,
  //   uploadType - フォーマットタイプ,
  //   itemRowNo - 項目名の行番号,
  //   dataStartRowNo - データ開始行番号,
  //   createdAt - 作成日付,
  //   updatedAt - 更新日付
  // }
  insert: async (_tenantId, values) => {
    const functionName = 'uploadFormatController.insert'
    let contractRow
    let contractId
    let resultToInsertUpload
    logger.info(`${constantsDefine.logMessage.INF000}${functionName}`)

    const uploadContractId = values?.contractId
    if (!uploadContractId) {
      logger.error(`${constantsDefine.logMessage.CMMERR000}${functionName}`)
      return
    }

    try {
      contractRow = await contractController.findContract({ tenantId: _tenantId, deleteFlag: false }, 'createdAt DESC')
      contractId = contractRow?.dataValues?.contractId
    } catch (error) {
      logger.error({ contractId: uploadContractId, stack: error.stack, status: 0 })
      return
    }

    if (!contractId || contractId !== uploadContractId) {
      logger.info(`${constantsDefine.logMessage.DBINF000}${functionName}`)
      return
    }

    try {
      resultToInsertUpload = await Upload.create({
        ...values,
        contractId: contractId
      })
    } catch (error) {
      logger.error({ contractId: uploadContractId, stack: error.stack, status: 0 })
      return
    }

    logger.info(`${constantsDefine.logMessage.INF001}${functionName}`)
    return resultToInsertUpload
  },
  findUploadFormat: async (uploadFormatId) => {
    const functionName = 'uploadFormatController.findUploadFormat'
    logger.info(`${constantsDefine.logMessage.INF000}${functionName}`)
    let uploadFormat
    try {
      uploadFormat = await Upload.findOne({
        where: {
          uploadFormatId: uploadFormatId
        }
      })
    } catch (error) {
      logger.error({ uploadFormatId: uploadFormatId, stack: error.stack, status: 0 })
    }
    logger.info(`${constantsDefine.logMessage.INF001}${functionName}`)
    return uploadFormat
  },
  findByContractId: async (contractId) => {
    try {
      return await Upload.findAll({
        where: {
          contractId: contractId
        }
      })
    } catch (error) {
      // status 0はDBエラー
      logger.error({ contractId: contractId, stack: error.stack, status: 0 }, error.name)
      return error
    }
  },

  getDataForUploadFormat: async (uploadFormatId) => {
    try {
      // DBからuploadFormatデータ取得
      const uploadFormat = await Upload.findOne({ where: { uploadFormatId: uploadFormatId } })
      const uploadForamtDetail = db.UploadFormatDetail
      const uploadFormatDetailId = db.UploadFormatIdentifier
      const uploadFormatDetails = await uploadForamtDetail.getUploadFormatDetail(uploadFormat.uploadFormatId)
      const uploadFormatDetailIds = await uploadFormatDetailId.getUploadFromatIdId(uploadFormat.uploadFormatId)
      const columnArr = constantsDefine.csvFormatDefine.columnArr
      const uploadGeneral = {
        uploadFormatItemName: uploadFormat.setName,
        uploadType: uploadFormat.uploadType
      }

      // ユーザアップロードデータからヘッダ取り出す、ない場合空配列作成
      const headers =
        uploadFormat.uploadData
          ?.toString('utf-8')
          .split(/\r?\n|\r/)[0]
          .split(',') || []

      // ユーザアップロードデータからデータ取り出す、ない場合空配列作成
      const contentValues =
        uploadFormat.uploadData
          ?.toString('utf-8')
          .split(/\r?\n|\r/)[1]
          .split(',') || []

      // ユーザアップロードした取込データ列作成
      const headerItems = headers.map((item, idx) => {
        return {
          item: item,
          value: contentValues[idx] || ''
        }
      })

      // 請求書用フォーマットの設定した情報取り出して、請求書用フォーマット列作成
      const selectedFormatData = []
      for (let idx = 0; idx < 19; idx++) {
        uploadFormatDetails.forEach((item) => {
          if (item.defaultNumber === idx) {
            selectedFormatData.push(item.uploadFormatNumber)
          }
        })
        if (selectedFormatData[idx] === undefined) {
          selectedFormatData.push('')
        }
      }

      // 登録した税の設定取り出し
      const csvTax = constantsDefine.csvFormatDefine.csvTax
      const taxIds = {}

      csvTax.forEach((item) => {
        taxIds[item.id] = {
          key: item.id,
          value: '',
          itemName: item.name
        }
      })

      const taxKey = Object.keys(taxIds)

      uploadFormatDetailIds.forEach((item) => {
        if (item.extensionType === '0') {
          taxKey.forEach((key) => {
            if (item.defaultExtension === taxIds[key].itemName) {
              taxIds[key].value = item.uploadFormatExtension
            }
          })
        }
      })

      // 登録した単位の設定取り出し
      const csvUnit = constantsDefine.csvFormatDefine.csvUnit
      const unitIds = {}

      csvUnit.forEach((item) => {
        unitIds[item.id] = {
          key: item.id,
          value: '',
          itemName: item.name
        }
      })

      const unitKey = Object.keys(unitIds)

      uploadFormatDetailIds.forEach((item) => {
        if (item.extensionType === '1') {
          unitKey.forEach((key) => {
            if (item.defaultExtension === unitIds[key].itemName) {
              unitIds[key].value = item.uploadFormatExtension
            }
          })
        }
      })

      // ページに表すデータ作成
      return {
        headerItems: headerItems,
        columnArr: columnArr,
        uploadGeneral: uploadGeneral,
        taxIds: taxIds,
        unitIds: unitIds,
        csvfilename: '',
        selectedFormatData: selectedFormatData,
        itemRownNo: uploadFormat.itemRowNo,
        dataStartRowNo: uploadFormat.dataStartRowNo,
        checkItemNameLine: uploadFormat.itemRowNo !== 0 ? 'on' : 'off'
      }
    } catch (error) {
      return error
    }
  }
}
