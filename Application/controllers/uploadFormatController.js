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
      const uploadFormatDetailIds = await uploadFormatDetailId.getUploadFormatId(uploadFormat.uploadFormatId)
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
  },
  changeDataForUploadFormat: async (uploadFormatId, changeData) => {
    logger.info(constantsDefine.logMessage.INF000 + 'changeDataForUploadFormat')
    try {
      // DBの「UploadFormatDetail」と「UploadFormatIdentifier」のObjectを用意
      delete changeData.checkItemNameLine
      delete changeData.itemRowNo
      delete changeData.dataStartRowNo
      delete changeData.headerItems
      delete changeData.uploadType

      const UploadFormatDetail = db.UploadFormatDetail
      const UploadFormatIdentifier = db.UploadFormatIdentifier
      const standardHeader = constantsDefine.csvFormatDefine.columnArr
      const createUploadFormatDetail = []
      const uploadFormatIds = []

      // DBの３つテーブルから「uploadFormatId」のデータ取得
      const uploadFormat = await Upload.findOne({
        where: {
          uploadFormatId: uploadFormatId
        }
      })

      uploadFormat.setName = changeData.uploadFormatItemName
      await uploadFormat.save()

      // ユーザヘッダ取り出し
      const uploadFormatHeader = uploadFormat.uploadData
        .toString('utf-8')
        .replace('\x00', '')
        .split(/\r?\n|\r/)[0]
        .split(',')

      // 必須項目入力チェック
      let failFormDataFlag = false
      changeData.formatData.forEach((item, idx) => {
        if (
          idx === 0 ||
          idx === 1 ||
          idx === 2 ||
          idx === 12 ||
          idx === 13 ||
          idx === 14 ||
          idx === 15 ||
          idx === 16 ||
          idx === 17 ||
          idx === 18
        ) {
          if (item !== '' && (~~item < 0 || ~~item > uploadFormatHeader.length)) {
            failFormDataFlag = true
          }
        }
      })

      if (failFormDataFlag) return -1

      const uploadFormatDetail = await UploadFormatDetail.findAll({
        where: {
          uploadFormatId: uploadFormatId
        },
        order: [['uploadFormatNumber', 'ASC']]
      })

      const uploadFormatIdentifier = await UploadFormatIdentifier.findAll({
        where: {
          uploadFormatId: uploadFormatId
        },
        order: [['serialNumber', 'ASC']]
      })

      uploadFormat.uploadFormatItemName = changeData.uploadFormatItemName
      delete changeData.uploadFormatItemName

      const convertUploadFormatDetail = uploadFormatHeader.map((item, idx) => {
        return {
          uploadForamtItemName: item
        }
      })

      changeData.formatData.forEach((item, idx) => {
        if (item !== '') {
          createUploadFormatDetail.push(
            UploadFormatDetail.build({
              uploadFormatId: uploadFormatId,
              serialNumber: idx + 1,
              uploadFormatItemName: convertUploadFormatDetail[~~item].uploadForamtItemName,
              uploadFormatNumber: ~~item,
              defaultItemName: standardHeader[idx].columnName,
              defaultNumber: idx
            })
          )
        }
      })
      delete changeData.formatData

      const keys = Object.keys(changeData)

      uploadFormatDetail.forEach(async (item) => {
        await item.destroy()
      })

      createUploadFormatDetail.forEach(async (item) => {
        await item.save()
      })

      uploadFormatIdentifier.forEach(async (item) => {
        await item.destroy()
      })

      const defaultExtensionItems = {
        keyConsumptionTax: '消費税',
        keyReducedTax: '軽減税率',
        keyFreeTax: '不課税',
        keyDutyFree: '免税',
        keyExemptTax: '非課税',
        keyManMonth: '人月',
        keyBottle: 'ボトル',
        keyCost: 'コスト',
        keyContainer: 'コンテナ',
        keyCentilitre: 'センチリットル',
        keySquareCentimeter: '平方センチメートル',
        keyCubicCentimeter: '立方センチメートル',
        keyCentimeter: 'センチメートル',
        keyCase: 'ケース',
        keyCarton: 'カートン',
        keyDay: '日',
        keyDeciliter: 'デシリットル',
        keyDecimeter: 'デシメートル',
        keyGrossKilogram: 'グロス・キログラム',
        keyPieces: '個',
        keyFeet: 'フィート',
        keyGallon: 'ガロン',
        keyGram: 'グラム',
        keyGrossTonnage: '総トン',
        keyHour: '時間',
        keyKilogram: 'キログラム',
        keyKilometers: 'キロメートル',
        keyKilowattHour: 'キロワット時',
        keyPound: 'ポンド',
        keyLiter: 'リットル',
        keyMilligram: 'ミリグラム',
        keyMilliliter: 'ミリリットル',
        keyMillimeter: 'ミリメートル',
        keyMonth: '月',
        keySquareMeter: '平方メートル',
        keyCubicMeter: '立方メートル',
        keyMeter: 'メーター',
        keyNetTonnage: '純トン',
        keyPackage: '包',
        keyRoll: '巻',
        keyFormula: '式',
        keyTonnage: 'トン',
        keyOthers: 'その他'
      }

      keys.forEach((key) => {
        const obj = {
          uploadFormatId: uploadFormatId,
          extensionType: '',
          uploadFormatExtension: '',
          defaultExtension: ''
        }

        if (key.match(/tax/i) || key.match(/dutyfree/i)) {
          obj.extensionType = 0
        } else {
          obj.extensionType = 1
        }

        obj.uploadFormatExtension = changeData[key]
        obj.defaultExtension = defaultExtensionItems[key]

        if (changeData[key] !== '') {
          uploadFormatIds.push(
            UploadFormatIdentifier.build({
              ...obj
            })
          )
        }
      })

      uploadFormatIds.forEach(async (item, idx) => {
        item.serialNumber = idx + 1
        await item.save()
      })

      logger.info(constantsDefine.logMessage.INF001 + 'changeDataForUploadFormat')
      return 0
    } catch (error) {
      console.log(error)
      return error
    }
  },
  deleteDataForUploadFormat: async (uploadFormatId) => {
    try {
      // アップロードフォーマットを検索
      const deleteTargetUploadFormat = await Upload.findOne({
        where: {
          uploadFormatId: uploadFormatId
        }
      })

      // nullの場合、既に削除されたと想定する。
      if (deleteTargetUploadFormat === null) return -1

      // ヘッダ内容を検索する。
      const deleteTargetUploadFormatDetail = await db.UploadFormatDetail.findAll({
        where: {
          uploadFormatId: deleteTargetUploadFormat.uploadFormatId
        }
      })

      // 税と単位を検索する。
      const deleteTargetUploadFormatIdentifier = await db.UploadFormatIdentifier.findAll({
        whiere: {
          uploadFormatId: deleteTargetUploadFormat.uploadFormatId
        }
      })

      // ユーザカスタマイズされた税と単位がある場合削除する。
      if (deleteTargetUploadFormatIdentifier) {
        logger.info(`${deleteTargetUploadFormat.uploadFormatId}のIdentifierデータを削除開始します。`)
        deleteTargetUploadFormatIdentifier.forEach((item) => {
          item.destroy()
        })
        logger.info(`${deleteTargetUploadFormat.uploadFormatId}のIdentifierデータを削除終了します。`)
      }

      // ユーザカスタマイズヘッダ削除
      logger.info(`${deleteTargetUploadFormat.uploadFormatId}のDetailデータを削除開始します。`)
      deleteTargetUploadFormatDetail.forEach((item) => {
        item.destroy()
      })
      logger.info(`${deleteTargetUploadFormat.uploadFormatId}のDetailデータを削除終了します。`)

      // アップロードフォーマット削除
      logger.info(`${deleteTargetUploadFormat.uploadFormatId}のデータを削除終了します。`)
      deleteTargetUploadFormat.destroy()
      logger.info(`${deleteTargetUploadFormat.uploadFormatId}のデータを削除終了します。`)

      return 1
    } catch (error) {
      logger.error(error)
      return 0
    }
  }
}
