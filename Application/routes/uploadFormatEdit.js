'use strict'
const express = require('express')
const router = express.Router()
const helper = require('./helpers/middleware')
const logger = require('../lib/logger')
const validate = require('../lib/validate')
const constantsDefine = require('../constants')
const userController = require('../controllers/userController.js')
const contractController = require('../controllers/contractController.js')
const uploadFormatController = require('../controllers/uploadFormatController')

const cbGetIndex = async (req, res, next) => {
  logger.info(constantsDefine.logMessage.INF000 + 'cbGetIndex')

  if (!req.session || !req.user?.userId) return next(errorHelper.create(500))

  // DBからuserデータ取得
  const user = await userController.findOne(req.user.userId)
  // データベースエラーは、エラーオブジェクトが返る
  // user未登録の場合もエラーを上げる
  if (user instanceof Error || user === null) return next(errorHelper.create(500))

  // TX依頼後に改修、ユーザステイタスが0以外の場合、「404」エラーとする not 403
  if (user.dataValues?.userStatus !== 0) return next(errorHelper.create(404))

  // DBから契約情報取得
  const contract = await contractController.findOne(req.user.tenantId)
  // データベースエラーは、エラーオブジェクトが返る
  // 契約情報未登録の場合もエラーを上げる
  if (contract instanceof Error || contract === null) return next(errorHelper.create(500))

  // ユーザ権限を取得
  req.session.userRole = user.dataValues?.userRole
  const deleteFlag = contract.dataValues.deleteFlag
  const contractStatus = contract.dataValues.contractStatus
  const checkContractStatus = helper.checkContractStatus

  if (checkContractStatus === null || checkContractStatus === 999) return next(errorHelper.create(500))

  if (!validate.isStatusForCancel(contractStatus, deleteFlag)) return next(noticeHelper.create('cancelprocedure'))

  // ダミーデータ
  // const getDataForUploadFormat = await uploadFormatController.getDataForUploadFormat(req.params.uploadFormatId)
  const getDataForUploadFormat = {
    headerItems: [
      { item: '備考', value: '2021/10/11' },
      { item: '支払期日', value: 'PBI147902001' },
      { item: 'テナントID', value: '221559d0-53aa-44a2-ab29-0c4a6cb02bde' },
      { item: '請求書番号', value: '2021/10/12' },
      { item: '納品日', value: '2021/10/12' },
      { item: '発行日', value: 'PBI1479_手動試験' },
      { item: '銀行名', value: '手動銀行' },
      { item: '支店名', value: '手動支店' },
      { item: '科目', value: '普通' },
      { item: '口座番号', value: '1234567' },
      { item: '口座名義', value: '手動' },
      { item: 'その他特記事項', value: '請求書一括作成_2.csv' },
      { item: '明細-項目ID', value: '1' },
      { item: '明細-内容', value: '明細１' },
      { item: '明細-数量', value: '1' },
      { item: '明細-単位', value: 'test1' },
      { item: '明細-単価', value: '100000' },
      { item: '明細-税', value: '免税' },
      { item: '明細-備考', value: '手動試験データ' }
    ],
    columnArr: [
      { columnName: '発行日', item: '', value: '' },
      { columnName: '請求書番号', item: '', value: '' },
      { columnName: 'テナントID', item: '', value: '' },
      { columnName: '支払期日', item: '', value: '' },
      { columnName: '納品日', item: '', value: '' },
      { columnName: '備考', item: '', value: '' },
      { columnName: '銀行名', item: '', value: '' },
      { columnName: '支店名', item: '', value: '' },
      { columnName: '科目', item: '', value: '' },
      { columnName: '口座番号', item: '', value: '' },
      { columnName: '口座名義', item: '', value: '' },
      { columnName: 'その他特記事項', item: '', value: '' },
      { columnName: '明細-項目ID', item: '', value: '' },
      { columnName: '明細-内容', item: '', value: '' },
      { columnName: '明細-数量', item: '', value: '' },
      { columnName: '明細-単位', item: '', value: '' },
      { columnName: '明細-単価', item: '', value: '' },
      { columnName: '明細-税（消費税／軽減税率／不課税／免税／非課税）', item: '', value: '' },
      { columnName: '明細-備考', item: '', value: '' }
    ],
    uploadGeneral: { uploadFormatItemName: 'aaa', uploadType: '請求書データ' },
    taxIds: {
      keyConsumptionTax: { key: 'keyConsumptionTax', value: '1212', itemName: '消費税' },
      keyReducedTax: { key: 'keyReducedTax', value: '', itemName: '軽減税率' },
      keyFreeTax: { key: 'keyFreeTax', value: '', itemName: '不課税' },
      keyDutyFree: { key: 'keyDutyFree', value: '', itemName: '免税' },
      keyExemptTax: { key: 'keyExemptTax', value: '', itemName: '非課税' }
    },
    unitIds: {
      keyManMonth: { key: 'keyManMonth', value: '', itemName: '人月' },
      keyBottle: { key: 'keyBottle', value: '', itemName: 'ボトル' },
      keyCost: { key: 'keyCost', value: '', itemName: 'コスト' },
      keyContainer: { key: 'keyContainer', value: '', itemName: 'コンテナ' },
      keyCentilitre: { key: 'keyCentilitre', value: '', itemName: 'センチリットル' },
      keySquareCentimeter: {
        key: 'keySquareCentimeter',
        value: '1212',
        itemName: '平方センチメートル'
      },
      keyCubicCentimeter: { key: 'keyCubicCentimeter', value: '', itemName: '立方センチメートル' },
      keyCentimeter: { key: 'keyCentimeter', value: '12121', itemName: 'センチメートル' },
      keyCase: { key: 'keyCase', value: '', itemName: 'ケース' },
      keyCarton: { key: 'keyCarton', value: '', itemName: 'カートン' },
      keyDay: { key: 'keyDay', value: '', itemName: '日' },
      keyDeciliter: { key: 'keyDeciliter', value: '', itemName: 'デシリットル' },
      keyDecimeter: { key: 'keyDecimeter', value: '', itemName: 'デシメートル' },
      keyGrossKilogram: { key: 'keyGrossKilogram', value: '', itemName: 'グロス・キログラム' },
      keyPieces: { key: 'keyPieces', value: '', itemName: '個' },
      keyFeet: { key: 'keyFeet', value: '', itemName: 'フィート' },
      keyGallon: { key: 'keyGallon', value: '', itemName: 'ガロン' },
      keyGram: { key: 'keyGram', value: '', itemName: 'グラム' },
      keyGrossTonnage: { key: 'keyGrossTonnage', value: '', itemName: '総トン' },
      keyHour: { key: 'keyHour', value: '', itemName: '時間' },
      keyKilogram: { key: 'keyKilogram', value: '', itemName: 'キログラム' },
      keyKilometers: { key: 'keyKilometers', value: '', itemName: 'キロメートル' },
      keyKilowattHour: { key: 'keyKilowattHour', value: '', itemName: 'キロワット時' },
      keyPound: { key: 'keyPound', value: '', itemName: 'ポンド' },
      keyLiter: { key: 'keyLiter', value: '', itemName: 'リットル' },
      keyMilligram: { key: 'keyMilligram', value: '', itemName: 'ミリグラム' },
      keyMilliliter: { key: 'keyMilliliter', value: '', itemName: 'ミリリットル' },
      keyMillimeter: { key: 'keyMillimeter', value: '', itemName: 'ミリメートル' },
      keyMonth: { key: 'keyMonth', value: '', itemName: '月' },
      keySquareMeter: { key: 'keySquareMeter', value: '', itemName: '平方メートル' },
      keyCubicMeter: { key: 'keyCubicMeter', value: '', itemName: '立方メートル' },
      keyMeter: { key: 'keyMeter', value: '', itemName: 'メーター' },
      keyNetTonnage: { key: 'keyNetTonnage', value: '', itemName: '純トン' },
      keyPackage: { key: 'keyPackage', value: '', itemName: '包' },
      keyRoll: { key: 'keyRoll', value: '', itemName: '巻' },
      keyFormula: { key: 'keyFormula', value: '', itemName: '式' },
      keyTonnage: { key: 'keyTonnage', value: '', itemName: 'トン' },
      keyOthers: { key: 'keyOthers', value: '', itemName: 'その他' }
    },
    csvfilename: '/51f3eb20-82a5-4900-acd2-4281621be954_1697_1.csv',
    selectedFormatData: [
      '1', '3', '4', '', '', '', '',
      '', '', '', '', '18', '19', '16',
      '11', '13', '15', '14', ''
    ],
    itemRowNo: '1',
    dataStartRowNo: '2',
    checkItemNameLine: 'on'
  }

  res.render('uploadFormatEdit', getDataForUploadFormat)

  logger.info(constantsDefine.logMessage.INF001 + 'cbGetIndex')
}

router.get('/:uploadFormatId', helper.isAuthenticated, cbGetIndex)

module.exports = {
  router: router,
  cbGetIndex: cbGetIndex
}
