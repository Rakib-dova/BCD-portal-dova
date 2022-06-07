'use strict'
jest.mock('../../../Application/node_modules/express', () => {
  return require('jest-express')
})

const Request = require('jest-express').Request
const Response = require('jest-express').Response
const next = require('jest-express').Next

const uploadFormatRouter = require('../../../Application/routes/uploadFormat')

const helper = require('../../../Application/routes/helpers/middleware')
const errorHelper = require('../../../Application/routes/helpers/error')
const userController = require('../../../Application/controllers/userController')
const contractController = require('../../../Application/controllers/contractController')
const uploadFormatController = require('../../../Application/controllers/uploadFormatController')
const uploadFormatDetailController = require('../../../Application/controllers/uploadFormatDetailController')
const logger = require('../../../Application/lib/logger.js')

let request, response, infoSpy
let userControllerFindOneSpy, contractControllerFindOneSpy, checkContractStatusSpy
let uploadFormatInsertSpy, uploadFormatDetailInsertSpy

const user = [
  {
    userId: '388014b9-d667-4144-9cc4-5da420981438',
    email: 'dummy@testdummy.com',
    tenantId: 'dummyTenantId',
    accessToken: 'dummyAccessToken',
    refreshToken: 'dummyRefreshToken'
  }
]

const session = {
  userContext: 'NotLoggedIn',
  userRole: 'dummy'
}

const uploadFormatBody = {
  formatData: Array(19).fill(''),
  keyConsumptionTax: '',
  keyReducedTax: '',
  keyFreeTax: '',
  keyDutyFree: '',
  keyExemptTax: '',
  keyManMonth: '',
  keyBottle: '',
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

describe('アプリ効果測定UT_デジトレ', () => {
  beforeEach(() => {
    request = new Request()
    request.user = user[0]
    request.session = session
    response = new Response()
    infoSpy = jest.spyOn(logger, 'info')
    checkContractStatusSpy = jest.spyOn(helper, 'checkContractStatus')
    userControllerFindOneSpy = jest.spyOn(userController, 'findOne')
    contractControllerFindOneSpy = jest.spyOn(contractController, 'findOne')
    uploadFormatInsertSpy = jest.spyOn(uploadFormatController, 'insert')
    uploadFormatDetailInsertSpy = jest.spyOn(uploadFormatDetailController, 'insert')
    request.flash = jest.fn()
  })
  afterEach(() => {
    request.resetMocked()
    response.resetMocked()
    next.mockReset()
    infoSpy.mockRestore()
    userControllerFindOneSpy.mockRestore()
    contractControllerFindOneSpy.mockRestore()
    checkContractStatusSpy.mockRestore()
    uploadFormatInsertSpy.mockRestore()
    uploadFormatDetailInsertSpy.mockRestore()
  })

  describe('アップロードフォーマット登録', () => {
    test('登録に失敗する場合', async () => {
      request.body = uploadFormatBody
      request.file = { filename: 'dummyUploadFormat.csv', originalname: 'dummyOriginal.csv' }
      userControllerFindOneSpy.mockResolvedValue({ dataValues: { userId: 'dummyUserId', userRole: 'a6a3edcd-00d9-427c-bf03-4ef0112ba16d', userStatus: 0 } })
      contractControllerFindOneSpy.mockResolvedValue({ dataValues: { contractId: '232457c2-07af-4235-8fff-6dfa32e37f5e', deleteFlag: false } })
      checkContractStatusSpy.mockResolvedValue(999)

      await uploadFormatRouter.cbPostConfirmIndex(request, response, next)

      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
      expect(infoSpy).not.nthCalledWith(2, { action: 'registerUploadFormat', tenantId: 'dummyTenantId' })
    })

    test('登録に成功する場合', async () => {
      request.body = uploadFormatBody
      request.file = { filename: 'dummyUploadFormat.csv', originalname: 'dummyOriginal.csv' }
      userControllerFindOneSpy.mockResolvedValue({ dataValues: { userId: 'dummyUserId', userRole: 'a6a3edcd-00d9-427c-bf03-4ef0112ba16d', userStatus: 0 } })
      contractControllerFindOneSpy.mockResolvedValue({ dataValues: { contractId: '232457c2-07af-4235-8fff-6dfa32e37f5e', deleteFlag: false } })
      checkContractStatusSpy.mockResolvedValue(10)
      uploadFormatInsertSpy.mockResolvedValue({ dataValues: 'dummy' })
      uploadFormatDetailInsertSpy.mockResolvedValue({ dataValues: 'dummy' })

      await uploadFormatRouter.cbPostConfirmIndex(request, response, next)

      expect(infoSpy).nthCalledWith(2, { action: 'registerUploadFormat', tenantId: 'dummyTenantId' })
    })
  })
})
