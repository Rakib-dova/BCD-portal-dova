'use strict'
jest.mock('../../Application/models')
jest.mock('../../Application/lib/logger')

const uploadFormatController = require('../../Application/controllers/uploadFormatController')
const contractController = require('../../Application/controllers/contractController')
const constantsDefine = require('../../Application/constants')
const logger = require('../../Application/lib/logger')
const UploadFormat = require('../../Application/models').UploadFormat
const UploadFormatDetail = require('../../Application/models').UploadFormatDetail
const UploadFormatDetailId = require('../../Application/models').UploadFormatIdentifier

// DBのuploadData、バイナリ表示のため、EsLintチェック除外
const fs = require('fs')
const path = require('path')
const uploadData = fs.readFileSync(path.resolve('.', 'testData', 'csvFormatUpload2.csv'), {
  encoding: 'utf-8'
})
const uploadFileName = 'UTコードテストファイル.csv'

const baseResult = {
  headerItems: [
    { item: '発行日', value: '2021-09-16' },
    { item: '請求書番号', value: 'PB148300302' },
    { item: 'テナントID', value: '7e5255fe-05e6-4fc9-acf0-076574bc35f7' },
    { item: '支払期日', value: '2021-09-16' },
    { item: '納品日', value: '2021-09-16' },
    { item: '備考', value: 'PBI1483_手動試験' },
    { item: '銀行名', value: '手動銀行' },
    { item: '支店名', value: '手動支店' },
    { item: '科目', value: '普通' },
    { item: '口座番号', value: '1234567' },
    { item: '口座名義', value: '手動' },
    { item: 'その他特記事項', value: '請求書一括作成_7.csv' },
    { item: '明細-項目ID', value: '3' },
    { item: '明細-内容', value: '明細' },
    { item: '明細-数量', value: '1' },
    { item: '明細-単位', value: '個' },
    { item: '明細-単価', value: '100000' },
    { item: '明細-税（消費税／軽減税率／不課税／免税／非課税）', value: '消費税' },
    { item: '明細-備考', value: 'PBI318_手動試験' }
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
  uploadGeneral: {
    uploadFormatItemName: 'controllersUploadFormatControllerSpecJs.getDataForUploadFormat',
    uploadType: '請求書データ'
  },
  taxIds: {
    keyConsumptionTax: { key: 'keyConsumptionTax', value: '', itemName: '消費税' },
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
    keySquareCentimeter: { key: 'keySquareCentimeter', value: '', itemName: '平方センチメートル' },
    keyCubicCentimeter: { key: 'keyCubicCentimeter', value: '', itemName: '立方センチメートル' },
    keyCentimeter: { key: 'keyCentimeter', value: '', itemName: 'センチメートル' },
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
  csvFileName: uploadFileName,
  selectedFormatData: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18],
  itemRownNo: 1,
  dataStartRowNo: 2,
  checkItemNameLine: 'on'
}

let errorSpy,
  tenantId,
  contractId,
  uploadFormatId,
  uploadFormatId2,
  findOneSpy,
  findContractSpy,
  infoSpy,
  createSpy,
  findAllSpy,
  uploadFormatDetailGetUploadFormatDetailSpy,
  uploadFormatDetailIdsGetUploadFormatId,
  successResult,
  uploadFormatDetailFindAllSpy,
  uploadFormatDetailIdsFindAll

describe('uploadFormatControllerのテスト', () => {
  beforeEach(() => {
    createSpy = jest.spyOn(UploadFormat, 'create')
    findOneSpy = jest.spyOn(UploadFormat, 'findOne')
    findAllSpy = jest.spyOn(UploadFormat, 'findAll')
    findContractSpy = jest.spyOn(contractController, 'findContract')
    errorSpy = jest.spyOn(logger, 'error')
    infoSpy = jest.spyOn(logger, 'info')
    uploadFormatDetailGetUploadFormatDetailSpy = jest.spyOn(UploadFormatDetail, 'getUploadFormatDetail')
    uploadFormatDetailFindAllSpy = jest.spyOn(UploadFormatDetail, 'findAll')
    uploadFormatDetailIdsGetUploadFormatId = jest.spyOn(UploadFormatDetailId, 'getUploadFormatId')
    uploadFormatDetailIdsFindAll = jest.spyOn(UploadFormatDetailId, 'findAll')
    UploadFormatDetail.build = jest.fn((item) => {
      return { ...item, save: () => {}, destroy: () => {} }
    })
    UploadFormatDetailId.build = jest.fn((item) => {
      return { ...item, save: () => {}, destroy: () => {} }
    })
    successResult = { ...baseResult }
  })
  afterEach(() => {
    createSpy.mockRestore()
    findOneSpy.mockRestore()
    findAllSpy.mockRestore()
    findContractSpy.mockRestore()
    errorSpy.mockRestore()
    infoSpy.mockRestore()
    uploadFormatDetailGetUploadFormatDetailSpy.mockRestore()
    uploadFormatDetailFindAllSpy.mockRestore()
    uploadFormatDetailIdsFindAll.mockRestore()
  })
  tenantId = '12345678-bdac-4195-80b9-1ea64b8cb70c'
  contractId = '87654321-fbe6-4864-a866-7a3ce9aa517e'
  uploadFormatId = '55555555-fbe6-4864-a866-7a3ce9aa517e'
  uploadFormatId2 = 'daca9d11-07b4-4a3d-8650-b5b0a6ed059a'

  const findOneReturn = {
    dataValues: {
      contractId: contractId,
      tenantId: tenantId,
      numberN: '1234567890',
      contractStatus: constantsDefine.statusConstants.contractStatusNewContractReceive,
      deleteFlag: false,
      createdAt: '2021-07-09T04:30:00.000Z',
      updatedAt: '2021-07-09T04:30:00.000Z'
    }
  }

  const findOneResult = {
    uploadFormatId: uploadFormatId,
    contractId: contractId,
    setName: 'uploadFormatName',
    uploadType: '',
    createdAt: '2021-07-09T04:30:00.000Z',
    updatedAt: '2021-07-09T04:30:00.000Z'
  }

  const uploadFormatData = {
    contractId: contractId,
    setName: 'uploadFormatName',
    uploadType: '',
    uploadData: uploadData,
    uploadFileName: uploadFileName
  }

  const uploadFormatChangeData = {
    checkItemNameLine: 'on',
    itemRowNo: '',
    dataStartRowNo: '2',
    headerItems: [
      '発行日',
      '請求書番号',
      'テナントID',
      '支払期日',
      '納品日',
      '備考',
      '銀行名',
      '支店名',
      '科目',
      '口座番号',
      '口座名義',
      'その他特記事項',
      '明細-項目ID',
      '明細-内容',
      '明細-数量',
      '明細-単位',
      '明細-単価',
      '明細-税（消費税／軽減税率／不課税／免税／非課税）',
      '明細-備考'
    ],
    formatData: ['0', '1', '2', '3', '', '', '', '', '', '', '', '', '12', '13', '14', '15', '16', '17', ''],
    uploadFormatItemName: '請求書フォーマット2',
    uploadType: ['請求書データ', '請求書データ'],
    keyConsumptionTax: 'a11122222',
    keyReducedTax: 'b111',
    keyFreeTax: 'f111',
    keyDutyFree: '',
    keyExemptTax: '',
    keyManMonth: 'c122',
    keyBottle: 'd122',
    keyCost: '',
    keyContainer: '',
    keyCentilitre: '',
    keySquareCentimeter: '',
    keyCubicCentimeter: '',
    keyCentimeter: '',
    keyCase: '',
    keyCarton: '',
    keyDay: '',
    keyDeciliter: '',
    keyDecimeter: '',
    keyGrossKilogram: '',
    keyPieces: '',
    keyFeet: '',
    keyGallon: '',
    keyGram: '',
    keyGrossTonnage: '',
    keyHour: '',
    keyKilogram: '',
    keyKilometers: '',
    keyKilowattHour: '',
    keyPound: '',
    keyLiter: '',
    keyMilligram: '',
    keyMilliliter: '',
    keyMillimeter: '',
    keyMonth: '',
    keySquareMeter: '',
    keyCubicMeter: '',
    keyMeter: '',
    keyNetTonnage: '',
    keyPackage: '',
    keyRoll: '',
    keyFormula: '',
    keyTonnage: '',
    keyOthers: ''
  }

  const uploadFormatChangeDataError = {
    ...uploadFormatChangeData,
    formatData: ['0', '1', '2', '3', '', '', '', '', '', '', '', '', '12', '13', '14', '30', '16', '17', '']
  }

  const uploadFormatDataNotContractId = {
    contractId: null,
    setName: 'uploadFormatName',
    uploadType: '',
    uploadData: uploadData,
    uploadFileName: uploadFileName
  }

  const uploadFormatDataDifferentContractId = {
    contractId: 'null',
    setName: 'uploadFormatName',
    uploadType: '',
    uploadData: uploadData,
    uploadFileName: uploadFileName
  }

  const findAllResult = [
    {
      uploadFormatId: uploadFormatId,
      contractId: contractId,
      setName: '請求書フォーマット1',
      uploadType: '請求書データ',
      createdAt: '2021-07-09T04:30:00.000Z',
      updatedAt: '2021-07-09T04:30:00.000Z'
    },
    {
      uploadFormatId: uploadFormatId2,
      contractId: contractId,
      setName: '請求書フォーマット2',
      uploadType: '請求書データ',
      createdAt: '2021-07-09T04:30:00.000Z',
      updatedAt: '2021-07-09T04:30:00.000Z'
    }
  ]

  const uploadFormatResult = {
    uploadFormatId: '794d3ea4-a69d-4c55-b366-17c0d323d212',
    contractId: '0255ba15-565d-4597-b074-11908b39a1ad',
    setName: '請求書フォーマット2',
    itemRowNo: 1,
    dataStartRowNo: 2,
    uploadType: '請求書データ',
    uploadData: uploadData,
    uploadFileName: uploadFileName,
    createdAt: '2021-10-21T09:00:20.743Z',
    updatedAt: '2021-10-21T09:00:20.743Z',
    dataValues: {
      uploadFormatId: '794d3ea4-a69d-4c55-b366-17c0d323d212',
      contractId: '0255ba15-565d-4597-b074-11908b39a1ad',
      setName: '請求書フォーマット2',
      itemRowNo: 1,
      dataStartRowNo: 2,
      uploadType: '請求書データ',
      uploadData: uploadData,
      uploadFileName: uploadFileName,
      createdAt: '2021-10-21T09:00:20.743Z',
      updatedAt: '2021-10-21T09:00:20.743Z'
    },
    save: () => {}
  }

  const uploadFormatIdentifierResult = [
    {
      uploadFormatId: '794d3ea4-a69d-4c55-b366-17c0d323d212',
      serialNumber: 1,
      extensionType: '0',
      uploadFormatExtension: 'a11122222',
      defaultExtension: '消費税',
      createdAt: '2021-10-22T00:04:22.464Z',
      updatedAt: '2021-10-22T00:04:22.464Z',
      save: () => {},
      destroy: () => {}
    },
    {
      uploadFormatId: '794d3ea4-a69d-4c55-b366-17c0d323d212',
      serialNumber: 2,
      extensionType: '0',
      uploadFormatExtension: 'b111',
      defaultExtension: '軽減税率',
      createdAt: '2021-10-22T00:04:22.465Z',
      updatedAt: '2021-10-22T00:04:22.465Z',
      save: () => {},
      destroy: () => {}
    },
    {
      uploadFormatId: '794d3ea4-a69d-4c55-b366-17c0d323d212',
      serialNumber: 3,
      extensionType: '0',
      uploadFormatExtension: 'f111',
      defaultExtension: '不課税',
      createdAt: '2021-10-22T00:04:22.465Z',
      updatedAt: '2021-10-22T00:04:22.465Z',
      save: () => {},
      destroy: () => {}
    },
    {
      uploadFormatId: '794d3ea4-a69d-4c55-b366-17c0d323d212',
      serialNumber: 4,
      extensionType: '1',
      uploadFormatExtension: 'c122',
      defaultExtension: '人月',
      createdAt: '2021-10-22T00:04:22.465Z',
      updatedAt: '2021-10-22T00:04:22.465Z',
      save: () => {},
      destroy: () => {}
    },
    {
      uploadFormatId: '794d3ea4-a69d-4c55-b366-17c0d323d212',
      serialNumber: 5,
      extensionType: '1',
      uploadFormatExtension: 'd122',
      defaultExtension: 'ボトル',
      createdAt: '2021-10-22T00:04:22.465Z',
      updatedAt: '2021-10-22T00:04:22.465Z',
      save: () => {},
      destroy: () => {}
    }
  ]

  describe('insert', () => {
    test('正常', async () => {
      // 準備
      findContractSpy.mockReturnValue(findOneReturn)
      createSpy.mockReturnValue({
        ...uploadFormatData,
        contractId: contractId
      })

      // 試験実施
      const result = await uploadFormatController.insert(tenantId, uploadFormatData)

      // 期待結果
      // 想定したデータがReturnされていること
      expect(result).toEqual(uploadFormatData)
    })

    test('異常：ContractIdなし', async () => {
      // 準備
      findContractSpy.mockReturnValue(findOneReturn)
      createSpy.mockReturnValue({
        ...uploadFormatDataNotContractId,
        contractId: contractId
      })

      // 試験実施
      const result = await uploadFormatController.insert(tenantId, null)

      // 期待結果
      // 想定したデータがReturnされていること
      expect(result).toEqual(undefined)
    })

    test('異常：findContract（DB）エラー', async () => {
      // 準備
      const dbError = new Error('DB error mock')
      findContractSpy.mockImplementation(() => {
        throw dbError
      })

      // 試験実施
      const result = await uploadFormatController.insert(tenantId, uploadFormatData)

      // 期待結果
      // undefinedが返されること
      expect(result).toEqual(undefined)
    })

    test('異常：ContractIdエラー', async () => {
      // 準備
      findContractSpy.mockReturnValue(findOneReturn)
      createSpy.mockReturnValue({
        ...uploadFormatData,
        contractId: contractId
      })

      // 試験実施
      const result = await uploadFormatController.insert(tenantId, uploadFormatDataDifferentContractId)

      // 期待結果
      // 想定したデータがReturnされていること
      expect(result).toEqual(undefined)
    })

    test('異常：Upload.create（DB）エラー', async () => {
      // 準備
      findContractSpy.mockReturnValue(findOneReturn)
      const dbError = new Error('DB error mock')
      createSpy.mockImplementation(() => {
        throw dbError
      })

      // 試験実施
      const result = await uploadFormatController.insert(tenantId, uploadFormatData)

      // 期待結果
      // undefinedが返されること
      expect(result).toEqual(undefined)
    })
  })

  describe('findUploadFormat', () => {
    test('正常', async () => {
      // 準備
      findOneSpy.mockReturnValue(findOneResult)

      // 試験実施
      const result = await uploadFormatController.findUploadFormat(uploadFormatId)

      // 期待結果
      // 想定したデータがReturnされていること
      expect(result).toEqual(findOneResult)
    })

    test('異常：uploadFormat.findOne（DB）エラー', async () => {
      // 準備
      // DBエラーを想定する
      const dbError = new Error('DB error mock')
      findOneSpy.mockImplementation(() => {
        throw dbError
      })
      // 試験実施
      const result = await uploadFormatController.findUploadFormat(uploadFormatId)

      // 期待結果
      // undefinedが返されること
      expect(result).toEqual(undefined)
    })
  })

  describe('findByContractId', () => {
    test('正常', async () => {
      // 準備
      findAllSpy.mockReturnValue(findAllResult)

      // 試験実施
      const result = await uploadFormatController.findByContractId(contractId)
      // 期待結果
      // 想定したデータがReturnされていること
      expect(result).toEqual(findAllResult)
    })

    test('異常：uploadFormat.findAll（DB）エラー', async () => {
      // 準備
      // DBエラーを想定する
      const dbError = new Error('DB error mock')
      findAllSpy.mockImplementation(() => {
        throw dbError
      })
      // 試験実施
      const result = await uploadFormatController.findByContractId(contractId)

      // 期待結果
      // undefinedが返されること
      expect(result).toEqual(dbError)
    })
  })

  describe('getDataForUploadFormat', () => {
    test('正常:ヘッダなし', async () => {
      // 準備
      const now = new Date()
      const uploadFormatDB = {
        uploadFormatId: 'c1e543ad-c23e-455b-b33a-2b84651ffe05',
        setName: 'controllersUploadFormatControllerSpecJs.getDataForUploadFormat',
        itemRowNo: 0,
        dataStartRowNo: 2,
        uploadType: '請求書データ',
        uploadFileName: uploadFileName,
        deleteFlag: 0,
        uploadData: uploadData,
        createdAt: now,
        updatedAt: now
      }
      const uploadFormatDetailDB = [
        {
          uploadFormatId: 'c1e543ad-c23e-455b-b33a-2b84651ffe05',
          serialNumber: 1,
          uploadFormatItemName: '',
          uploadFormatNumber: 0,
          defaultItemName: '発行日',
          defaultNumber: 0,
          createdAt: now,
          updatedAt: now
        },
        {
          uploadFormatId: 'c1e543ad-c23e-455b-b33a-2b84651ffe05',
          serialNumber: 2,
          uploadFormatItemName: '',
          uploadFormatNumber: 1,
          defaultItemName: '請求書番号',
          defaultNumber: 1,
          createdAt: now,
          updatedAt: now
        },
        {
          uploadFormatId: 'c1e543ad-c23e-455b-b33a-2b84651ffe05',
          serialNumber: 3,
          uploadFormatItemName: '',
          uploadFormatNumber: 2,
          defaultItemName: 'テナントID',
          defaultNumber: 2,
          createdAt: now,
          updatedAt: now
        },
        {
          uploadFormatId: 'c1e543ad-c23e-455b-b33a-2b84651ffe05',
          serialNumber: 4,
          uploadFormatItemName: '',
          uploadFormatNumber: 3,
          defaultItemName: '支払期日',
          defaultNumber: 3,
          createdAt: now,
          updatedAt: now
        },
        {
          uploadFormatId: 'c1e543ad-c23e-455b-b33a-2b84651ffe05',
          serialNumber: 5,
          uploadFormatItemName: '',
          uploadFormatNumber: 4,
          defaultItemName: '納品日',
          defaultNumber: 4,
          createdAt: now,
          updatedAt: now
        },
        {
          uploadFormatId: 'c1e543ad-c23e-455b-b33a-2b84651ffe05',
          serialNumber: 6,
          uploadFormatItemName: '',
          uploadFormatNumber: 5,
          defaultItemName: '備考',
          defaultNumber: 5,
          createdAt: now,
          updatedAt: now
        },
        {
          uploadFormatId: 'c1e543ad-c23e-455b-b33a-2b84651ffe05',
          serialNumber: 7,
          uploadFormatItemName: '',
          uploadFormatNumber: 6,
          defaultItemName: '銀行名',
          defaultNumber: 6,
          createdAt: now,
          updatedAt: now
        },
        {
          uploadFormatId: 'c1e543ad-c23e-455b-b33a-2b84651ffe05',
          serialNumber: 8,
          uploadFormatItemName: '',
          uploadFormatNumber: 7,
          defaultItemName: '支店名',
          defaultNumber: 7,
          createdAt: now,
          updatedAt: now
        },
        {
          uploadFormatId: 'c1e543ad-c23e-455b-b33a-2b84651ffe05',
          serialNumber: 9,
          uploadFormatItemName: '',
          uploadFormatNumber: 8,
          defaultItemName: '科目',
          defaultNumber: 8,
          createdAt: now,
          updatedAt: now
        },
        {
          uploadFormatId: 'c1e543ad-c23e-455b-b33a-2b84651ffe05',
          serialNumber: 10,
          uploadFormatItemName: '',
          uploadFormatNumber: 9,
          defaultItemName: '口座番号',
          defaultNumber: 9,
          createdAt: now,
          updatedAt: now
        },
        {
          uploadFormatId: 'c1e543ad-c23e-455b-b33a-2b84651ffe05',
          serialNumber: 11,
          uploadFormatItemName: '',
          uploadFormatNumber: 10,
          defaultItemName: '口座名義',
          defaultNumber: 10,
          createdAt: now,
          updatedAt: now
        },
        {
          uploadFormatId: 'c1e543ad-c23e-455b-b33a-2b84651ffe05',
          serialNumber: 12,
          uploadFormatItemName: '',
          uploadFormatNumber: 11,
          defaultItemName: 'その他特記事項',
          defaultNumber: 11,
          createdAt: now,
          updatedAt: now
        },
        {
          uploadFormatId: 'c1e543ad-c23e-455b-b33a-2b84651ffe05',
          serialNumber: 13,
          uploadFormatItemName: '',
          uploadFormatNumber: 12,
          defaultItemName: '明細-項目ID',
          defaultNumber: 12,
          createdAt: now,
          updatedAt: now
        },
        {
          uploadFormatId: 'c1e543ad-c23e-455b-b33a-2b84651ffe05',
          serialNumber: 14,
          uploadFormatItemName: '',
          uploadFormatNumber: 13,
          defaultItemName: '明細-内容',
          defaultNumber: 13,
          createdAt: now,
          updatedAt: now
        },
        {
          uploadFormatId: 'c1e543ad-c23e-455b-b33a-2b84651ffe05',
          serialNumber: 15,
          uploadFormatItemName: '',
          uploadFormatNumber: 14,
          defaultItemName: '明細-数量',
          defaultNumber: 14,
          createdAt: now,
          updatedAt: now
        },
        {
          uploadFormatId: 'c1e543ad-c23e-455b-b33a-2b84651ffe05',
          serialNumber: 16,
          uploadFormatItemName: '',
          uploadFormatNumber: 15,
          defaultItemName: '明細-単位',
          defaultNumber: 15,
          createdAt: now,
          updatedAt: now
        },
        {
          uploadFormatId: 'c1e543ad-c23e-455b-b33a-2b84651ffe05',
          serialNumber: 17,
          uploadFormatItemName: '',
          uploadFormatNumber: 16,
          defaultItemName: '明細-単価',
          defaultNumber: 16,
          createdAt: now,
          updatedAt: now
        },
        {
          uploadFormatId: 'c1e543ad-c23e-455b-b33a-2b84651ffe05',
          serialNumber: 18,
          uploadFormatItemName: '',
          uploadFormatNumber: 17,
          defaultItemName: '明細-税（消費税／軽減税率／不課税／免税／非課税）',
          defaultNumber: 17,
          createdAt: now,
          updatedAt: now
        },
        {
          uploadFormatId: 'c1e543ad-c23e-455b-b33a-2b84651ffe05',
          serialNumber: 19,
          uploadFormatItemName: '',
          uploadFormatNumber: 18,
          defaultItemName: ' 明細-備考',
          defaultNumber: 18,
          createdAt: now,
          updatedAt: now
        }
      ]
      findOneSpy.mockReturnValue(uploadFormatDB)
      uploadFormatDetailGetUploadFormatDetailSpy.mockReturnValue(uploadFormatDetailDB)
      uploadFormatDetailIdsGetUploadFormatId.mockReturnValue([])
      const userUploadFormatId = 'c1e543ad-c23e-455b-b33a-2b84651ffe05'
      successResult.itemRownNo = 0
      successResult.checkItemNameLine = 'off'

      // 試験実施
      const result = await uploadFormatController.getDataForUploadFormat(userUploadFormatId)
      // 期待結果
      // 想定したデータがReturnされていること
      expect(result).toEqual(successResult)
    })

    test('正常:ヘッダあり', async () => {
      // 準備
      const now = new Date()
      const uploadFormatDB = {
        uploadFormatId: 'c1e543ad-c23e-455b-b33a-2b84651ffe05',
        setName: 'controllersUploadFormatControllerSpecJs.getDataForUploadFormat',
        itemRowNo: 1,
        dataStartRowNo: 2,
        uploadType: '請求書データ',
        deleteFlag: 0,
        uploadData: uploadData,
        uploadFileName: uploadFileName,
        createdAt: now,
        updatedAt: now
      }
      findOneSpy.mockReturnValue(uploadFormatDB)
      uploadFormatDetailGetUploadFormatDetailSpy.mockReturnValue([])
      uploadFormatDetailIdsGetUploadFormatId.mockReturnValue([])
      const userUploadFormatId = 'c1e543ad-c23e-455b-b33a-2b84651ffe05'
      successResult.selectedFormatData = []
      for (let idx = 0; idx < 19; idx++) {
        successResult.selectedFormatData.push('')
      }

      // 試験実施
      const result = await uploadFormatController.getDataForUploadFormat(userUploadFormatId)
      // 期待結果
      // 想定したデータがReturnされていること
      expect(result).toEqual(successResult)
    })

    test('正常:ヘッダあり,dataが一つ項目が「””」の場合', async () => {
      // 準備
      const now = new Date()
      const uploadData2 =
        uploadData.split(/\r?\n|\r/)[0] +
        '\r\n' +
        '2021-09-16,,7e5255fe-05e6-4fc9-acf0-076574bc35f7,2021-09-16,2021-09-16,PBI1483_手動試験,手動銀行,手動支店,普通,1234567,手動,請求書一括作成_7.csv,3,明細,1,個,100000,消費税,PBI318_手動試験'
      const uploadFormatDB = {
        uploadFormatId: 'c1e543ad-c23e-455b-b33a-2b84651ffe05',
        setName: 'controllersUploadFormatControllerSpecJs.getDataForUploadFormat',
        itemRowNo: 1,
        dataStartRowNo: 2,
        uploadType: '請求書データ',
        deleteFlag: 0,
        uploadData: uploadData2,
        uploadFileName: uploadFileName,
        createdAt: now,
        updatedAt: now
      }
      findOneSpy.mockReturnValue(uploadFormatDB)
      uploadFormatDetailGetUploadFormatDetailSpy.mockReturnValue([])
      uploadFormatDetailIdsGetUploadFormatId.mockReturnValue([])
      const userUploadFormatId = 'c1e543ad-c23e-455b-b33a-2b84651ffe05'
      successResult.selectedFormatData = []
      for (let idx = 0; idx < 19; idx++) {
        successResult.selectedFormatData.push('')
      }
      successResult.itemRownNo = 1
      successResult.checkItemNameLine = 'on'
      successResult.headerItems[1].value = ''

      // 試験実施
      const result = await uploadFormatController.getDataForUploadFormat(userUploadFormatId)
      // 期待結果
      // 想定したデータがReturnされていること
      expect(result).toEqual(successResult)
    })

    test('正常:uploadDataがnull', async () => {
      // 準備
      const now = new Date()
      const uploadFormatDB = {
        uploadFormatId: 'c1e543ad-c23e-455b-b33a-2b84651ffe05',
        setName: 'controllersUploadFormatControllerSpecJs.getDataForUploadFormat',
        itemRowNo: 1,
        dataStartRowNo: 2,
        uploadType: '請求書データ',
        deleteFlag: 0,
        uploadData: null,
        uploadFileName: uploadFileName,
        createdAt: now,
        updatedAt: now
      }
      findOneSpy.mockReturnValue(uploadFormatDB)
      uploadFormatDetailGetUploadFormatDetailSpy.mockReturnValue([])
      uploadFormatDetailIdsGetUploadFormatId.mockReturnValue([])
      const userUploadFormatId = 'c1e543ad-c23e-455b-b33a-2b84651ffe05'
      successResult.selectedFormatData = []
      for (let idx = 0; idx < 19; idx++) {
        successResult.selectedFormatData.push('')
      }

      // 試験実施
      const result = await uploadFormatController.getDataForUploadFormat(userUploadFormatId)
      successResult.headerItems = []
      // 期待結果
      // 想定したデータがReturnされていること
      expect(result).toEqual(successResult)
    })

    test('正常:uploadFormatDetailIdentifierデータがあり', async () => {
      // 準備
      const now = new Date()
      const uploadFormatDB = {
        uploadFormatId: 'c1e543ad-c23e-455b-b33a-2b84651ffe05',
        setName: 'controllersUploadFormatControllerSpecJs.getDataForUploadFormat',
        itemRowNo: 1,
        dataStartRowNo: 2,
        uploadType: '請求書データ',
        deleteFlag: 0,
        uploadData: null,
        uploadFileName: uploadFileName,
        createdAt: now,
        updatedAt: now
      }
      findOneSpy.mockReturnValue(uploadFormatDB)
      uploadFormatDetailGetUploadFormatDetailSpy.mockReturnValue([])
      uploadFormatDetailIdsGetUploadFormatId.mockReturnValue([
        {
          uploadFormatId: 'c1e543ad-c23e-455b-b33a-2b84651ffe05',
          serialNumber: 0,
          extensionType: '0',
          uploadFormatExtension: 'AAA',
          defaultExtension: '免税',
          createdAt: now,
          updatedAt: now
        },
        {
          uploadFormatId: 'c1e543ad-c23e-455b-b33a-2b84651ffe05',
          serialNumber: 0,
          extensionType: '1',
          uploadFormatExtension: 'MANS',
          defaultExtension: '人月',
          createdAt: now,
          updatedAt: now
        }
      ])
      const userUploadFormatId = 'c1e543ad-c23e-455b-b33a-2b84651ffe05'
      successResult.selectedFormatData = []
      successResult.taxIds.keyDutyFree.value = 'AAA'
      successResult.unitIds.keyManMonth.value = 'MANS'
      for (let idx = 0; idx < 19; idx++) {
        successResult.selectedFormatData.push('')
      }

      // 試験実施
      const result = await uploadFormatController.getDataForUploadFormat(userUploadFormatId)
      successResult.headerItems = []
      // 期待結果
      // 想定したデータがReturnされていること
      expect(result).toEqual(successResult)
    })

    test('異常：DBエラー', async () => {
      // 準備
      const uploadFormatDB = new Error('DB Connection Error')
      UploadFormat.findOne = jest.fn((value) => {
        throw uploadFormatDB
      })
      uploadFormatDetailGetUploadFormatDetailSpy.mockReturnValue([])
      uploadFormatDetailIdsGetUploadFormatId.mockReturnValue([])
      const userUploadFormatId = 'c1e543ad-c23e-455b-b33a-2b84651ffe05'

      // 試験実施
      const result = await uploadFormatController.getDataForUploadFormat(userUploadFormatId)
      // 期待結果
      // 想定したデータがReturnされていること
      expect(result).toEqual(uploadFormatDB)
    })
  })

  describe('updateDataForUploadFormat', () => {
    test('正常', async () => {
      // 準備
      findOneSpy.mockReturnValue(uploadFormatResult)
      uploadFormatDetailFindAllSpy.mockReturnValue(uploadFormatResult)
      uploadFormatDetailIdsFindAll.mockReturnValue(uploadFormatIdentifierResult)

      // 試験実施
      const result = await uploadFormatController.changeDataForUploadFormat(tenantId, uploadFormatChangeData)

      // 期待結果
      // 想定したデータ'0'がReturnされていること
      expect(result).toEqual(0)
    })

    test('準正常：必須項目入力チェックにエラーが発生した場合', async () => {
      // 準備
      findOneSpy.mockReturnValue(uploadFormatResult)
      uploadFormatDetailFindAllSpy.mockReturnValue(uploadFormatResult)
      uploadFormatDetailIdsFindAll.mockReturnValue(uploadFormatIdentifierResult)

      // 試験実施
      const result = await uploadFormatController.changeDataForUploadFormat(tenantId, uploadFormatChangeDataError)

      // 期待結果
      // 想定したデータ'-1'がReturnされていること
      expect(result).toEqual(-1)
    })

    test('異常：DBコネクションエラー', async () => {
      // 準備
      const uploadFormatDB = new Error('DB Connection Error')
      UploadFormat.findOne = jest.fn((value) => {
        throw uploadFormatDB
      })
      uploadFormatDetailGetUploadFormatDetailSpy.mockReturnValue([])
      uploadFormatDetailIdsGetUploadFormatId.mockReturnValue([])
      const userUploadFormatId = 'c1e543ad-c23e-455b-b33a-2b84651ffe05'

      // 試験実施
      const result = await uploadFormatController.changeDataForUploadFormat(userUploadFormatId, uploadFormatChangeData)
      // 期待結果
      // 想定したデータ(DB Connection Error)がReturnされていること
      expect(result).toEqual(uploadFormatDB)
    })
  })
})
