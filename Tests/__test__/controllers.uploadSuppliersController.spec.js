'use strict'
jest.mock('../../Application/models')
jest.mock('../../Application/lib/logger')

const uploadSuppliersController = require('../../Application/controllers/uploadSuppliersController')
const logger = require('../../Application/lib/logger')
const validate = require('../../Application/lib/validate')
const tradeshiftAPI = require('../../Application/lib/tradeshiftAPI')

// DBのuploadData、バイナリ表示のため、EsLintチェック除外
const fs = require('fs')

const passport = {
  tenantId: '11367bd9-9710-4772-bdf7-10be2085976c',
  email: 'inte.kanri.user@gmail.com',
  userId: '53607702-b94b-4a94-9459-6cf3acd65603',
  accessToken: 'dummy',
  refreshToken: 'dummy'
}

const Contracts = require('../mockDB/Contracts_Table')
const testTime = new Date()
const contract = {
  contractId: 'f6133be0-1e7b-4792-841d-99c6fff801be',
  tenantId: '11367bd9-9710-4772-bdf7-10be2085976c',
  numberN: '1234567890',
  contractStatus: '00',
  deleteFlag: 0,
  createdAt: testTime,
  updatedAt: testTime
}

const nominalListTemplate = {
  fieldname: 'suppliersFileUpload',
  originalname: '取引先一括登録フォーマット.csv',
  encoding: '7bit',
  mimetype: 'text/csv',
  destination: './testData',
  filename: '',
  path: '',
  userId: '53607702-b94b-4a94-9459-6cf3acd65603'
}

const returnGetCompaniesValue = {
  numPages: 0,
  Connection: [{ CompanyName: 'test', CompanyAccountId: '11367bd9-9710-4772-bdf7-10be2085976c' }]
}
const returnGetCompaniesNoValue = {
  numPages: 0,
  Connection: []
}

const returnGetConnectionForCompanyValue = { response: [{ status: 404 }] }
const returnGetUserInformationByEmailValue = {
  CompanyAccountId: '11367bd9-9710-4772-bdf7-10be2085976c'
}
const returnAddNetworkConnectionValue = { response: [{ status: 200 }] }
const returnUpdateNetworkConnectionValue = { response: [{ status: 200 }] }

let errorSpy, infoSpy, fsUnlinkSyncSpy, fsExistsSyncSpy, validateIsContactEmailSpy
let getCompaniesSpy,
  getConnectionsSpy,
  updateNetworkConnectionSpy,
  getConnectionForCompanySpy,
  getUserInformationByEmailSpy,
  addNetworkConnectionSpy
describe('uploadUsersControllerのテスト', () => {
  beforeEach(() => {
    errorSpy = jest.spyOn(logger, 'error')
    infoSpy = jest.spyOn(logger, 'info')
    fs.unlinkSync = jest.fn()
    fsUnlinkSyncSpy = jest.spyOn(fs, 'unlinkSync')
    fsExistsSyncSpy = jest.spyOn(fs, 'existsSync')
    validateIsContactEmailSpy = jest.spyOn(validate, 'isValidEmail')
    getCompaniesSpy = jest.spyOn(tradeshiftAPI, 'getCompanies')
    getConnectionsSpy = jest.spyOn(tradeshiftAPI, 'getConnections')
    updateNetworkConnectionSpy = jest.spyOn(tradeshiftAPI, 'updateNetworkConnection')
    getConnectionForCompanySpy = jest.spyOn(tradeshiftAPI, 'getConnectionForCompany')
    getUserInformationByEmailSpy = jest.spyOn(tradeshiftAPI, 'getUserInformationByEmail')
    addNetworkConnectionSpy = jest.spyOn(tradeshiftAPI, 'addNetworkConnection')
  })
  afterEach(() => {
    errorSpy.mockRestore()
    infoSpy.mockRestore()
    fsUnlinkSyncSpy.mockRestore()
    fsExistsSyncSpy.mockRestore()
    validateIsContactEmailSpy.mockRestore()
    getCompaniesSpy.mockRestore()
    getConnectionsSpy.mockRestore()
    updateNetworkConnectionSpy.mockRestore()
    getConnectionForCompanySpy.mockRestore()
    getUserInformationByEmailSpy.mockRestore()
    addNetworkConnectionSpy.mockRestore()
  })

  describe('upload', () => {
    test('正常:１企業のネットワーク接続登録', async () => {
      // 準備
      const testNominal = { ...nominalListTemplate }
      testNominal.filename = 'suppliersUpload_test1.csv'
      validateIsContactEmailSpy.mockReturnValueOnce(0)
      getCompaniesSpy.mockReturnValueOnce(returnGetCompaniesValue)
      getConnectionForCompanySpy.mockReturnValueOnce(returnGetConnectionForCompanyValue)
      getUserInformationByEmailSpy.mockReturnValueOnce(returnGetUserInformationByEmailValue)
      addNetworkConnectionSpy.mockReturnValueOnce(returnAddNetworkConnectionValue)

      const [status, resultSuppliersCompany] = await uploadSuppliersController.upload(
        passport,
        Contracts[0],
        testNominal
      )

      // 期待結果
      expect(status).toBe(0)
      expect(JSON.stringify(resultSuppliersCompany)).toMatch(
        JSON.stringify([{ companyName: 'test', mailAddress: 'test@test.com', status: 'Add Success', stack: null }])
      )
    })

    test('正常:１企業の企業登録招待', async () => {
      // 準備
      const testNominal = { ...nominalListTemplate }
      testNominal.filename = 'suppliersUpload_test1.csv'
      validateIsContactEmailSpy.mockReturnValueOnce(0)
      getCompaniesSpy.mockReturnValueOnce(returnGetCompaniesNoValue)
      getConnectionsSpy.mockReturnValueOnce({ Connection: [] })
      updateNetworkConnectionSpy.mockReturnValueOnce(returnUpdateNetworkConnectionValue)

      const [status, resultSuppliersCompany] = await uploadSuppliersController.upload(passport, contract, testNominal)

      // 期待結果
      expect(status).toBe(0)
      expect(JSON.stringify(resultSuppliersCompany)).toMatch(
        JSON.stringify([{ companyName: 'test', mailAddress: 'test@test.com', status: 'Update Success', stack: null }])
      )
    })

    test('正常:空行がある場合', async () => {
      // 準備
      const testNominal = { ...nominalListTemplate }
      testNominal.filename = 'suppliersUpload_test2.csv'
      validateIsContactEmailSpy.mockReturnValue(0)
      getCompaniesSpy.mockReturnValue(returnGetCompaniesValue)
      getConnectionForCompanySpy.mockReturnValue(returnGetConnectionForCompanyValue)
      getUserInformationByEmailSpy.mockReturnValue(returnGetUserInformationByEmailValue)
      addNetworkConnectionSpy.mockReturnValue(returnAddNetworkConnectionValue)

      const [status, resultSuppliersCompany] = await uploadSuppliersController.upload(passport, contract, testNominal)

      // 期待結果
      expect(status).toBe(0)
      expect(JSON.stringify(resultSuppliersCompany)).toMatch(
        JSON.stringify([{ companyName: 'test', mailAddress: 'test@test.com', status: 'Add Success', stack: null }])
      )
    })

    test('正常:既に企業登録招待されたメールアドレスの場合', async () => {
      // 準備
      const testNominal = { ...nominalListTemplate }
      testNominal.filename = 'suppliersUpload_test1.csv'
      validateIsContactEmailSpy.mockReturnValueOnce(0)
      getCompaniesSpy.mockReturnValueOnce(returnGetCompaniesNoValue)
      getConnectionsSpy.mockReturnValueOnce({ Connection: [{ Email: 'test@test.com' }] })
      updateNetworkConnectionSpy.mockReturnValueOnce(returnUpdateNetworkConnectionValue)

      const [status, resultSuppliersCompany] = await uploadSuppliersController.upload(passport, contract, testNominal)

      // 期待結果
      expect(status).toBe(0)
      expect(JSON.stringify(resultSuppliersCompany)).toMatch(
        JSON.stringify([
          { companyName: 'test', mailAddress: 'test@test.com', status: 'Already Invitation', stack: null }
        ])
      )
    })

    test('異常:ヘッダが異なる場合', async () => {
      // 準備
      const testNominal = { ...nominalListTemplate }
      testNominal.filename = 'suppliersUpload_testHeader.csv'

      // 試験実施
      const [status, resultSuppliersCompany] = await uploadSuppliersController.upload(passport, contract, testNominal)

      // 期待結果
      expect(status).toBe(-1)
      expect(resultSuppliersCompany).toEqual(null)
    })

    test('異常:getConnectionsAPIエラー', async () => {
      // 準備
      const testNominal = { ...nominalListTemplate }
      testNominal.filename = 'suppliersUpload_test1.csv'
      validateIsContactEmailSpy.mockReturnValueOnce(0)
      getCompaniesSpy.mockReturnValueOnce(returnGetCompaniesNoValue)
      const apiError = new Error('API Error')
      getConnectionsSpy.mockReturnValueOnce(apiError)

      const [status, resultSuppliersCompany] = await uploadSuppliersController.upload(passport, contract, testNominal)

      // 期待結果
      expect(status).toBe(0)
      expect(JSON.stringify(resultSuppliersCompany)).toMatch(
        JSON.stringify([
          { companyName: 'test', mailAddress: 'test@test.com', status: 'API Error', stack: apiError.stack }
        ])
      )
    })

    test('異常:updateNetworkConnectionAPIエラー', async () => {
      // 準備
      const testNominal = { ...nominalListTemplate }
      testNominal.filename = 'suppliersUpload_test1.csv'
      validateIsContactEmailSpy.mockReturnValueOnce(0)
      getCompaniesSpy.mockReturnValueOnce(returnGetCompaniesNoValue)
      getConnectionsSpy.mockReturnValueOnce({ Connection: [] })
      const apiError = new Error('API Error')
      updateNetworkConnectionSpy.mockReturnValueOnce(apiError)

      const [status, resultSuppliersCompany] = await uploadSuppliersController.upload(passport, contract, testNominal)

      // 期待結果
      expect(status).toBe(0)
      expect(JSON.stringify(resultSuppliersCompany)).toMatch(
        JSON.stringify([
          { companyName: 'test', mailAddress: 'test@test.com', status: 'API Error', stack: apiError.stack }
        ])
      )
    })

    test('異常:ファイルがない場合', async () => {
      // 準備
      const testNominal = { ...nominalListTemplate }
      testNominal.filename = 'suppliersUpload_nofile.csv'
      const readNominalListError = new Error()

      // 試験実施
      const [status, resultSuppliersCompany] = await uploadSuppliersController.upload(passport, contract, testNominal)

      // 期待結果
      expect(status).toMatchObject(readNominalListError)
      expect(resultSuppliersCompany).toEqual(null)
    })

    test('準正常:ファイル削除の時、ファイルがない場合', async () => {
      // 準備
      const testNominal = { ...nominalListTemplate }
      testNominal.filename = 'suppliersUpload_test1.csv'
      validateIsContactEmailSpy.mockReturnValueOnce(0)
      getCompaniesSpy.mockReturnValueOnce(returnGetCompaniesValue)
      getConnectionForCompanySpy.mockReturnValueOnce(returnGetConnectionForCompanyValue)
      getUserInformationByEmailSpy.mockReturnValueOnce(returnGetUserInformationByEmailValue)
      addNetworkConnectionSpy.mockReturnValueOnce(returnAddNetworkConnectionValue)
      fsExistsSyncSpy.mockReturnValueOnce(false)
      const deleteError = new Error('ファイル削除エラー')

      // 試験実施
      const [status, resultSuppliersCompany] = await uploadSuppliersController.upload(passport, contract, testNominal)

      // 期待結果
      expect(status).toMatchObject(deleteError)
      expect(resultSuppliersCompany).toEqual(null)
    })

    test('準正常:ファイル削除の時、unlinkSyncエラーの場合', async () => {
      // 準備
      const testNominal = { ...nominalListTemplate }
      testNominal.filename = 'suppliersUpload_test1.csv'
      validateIsContactEmailSpy.mockReturnValueOnce(0)
      getCompaniesSpy.mockReturnValueOnce(returnGetCompaniesValue)
      getConnectionForCompanySpy.mockReturnValueOnce(returnGetConnectionForCompanyValue)
      getUserInformationByEmailSpy.mockReturnValueOnce(returnGetUserInformationByEmailValue)
      addNetworkConnectionSpy.mockReturnValueOnce(returnAddNetworkConnectionValue)
      fsExistsSyncSpy.mockReturnValueOnce(true)
      const fileError = new Error('file unlink error')
      fsUnlinkSyncSpy.mockImplementationOnce(() => {
        throw fileError
      })

      // 試験実施
      const [status, resultSuppliersCompany] = await uploadSuppliersController.upload(passport, contract, testNominal)

      // 期待結果
      expect(status).toMatchObject(fileError)
      expect(resultSuppliersCompany).toEqual(null)
    })

    test('準正常:getCompaniesApiエラー', async () => {
      // 準備
      const testNominal = { ...nominalListTemplate }
      testNominal.filename = 'suppliersUpload_test1.csv'
      validateIsContactEmailSpy.mockReturnValueOnce(0)
      const apiError = new Error('API Error')
      getCompaniesSpy.mockReturnValueOnce(apiError)

      const [status, resultSuppliersCompany] = await uploadSuppliersController.upload(
        passport,
        Contracts[0],
        testNominal
      )

      // 期待結果
      expect(status).toBe(0)
      expect(JSON.stringify(resultSuppliersCompany)).toMatch(
        JSON.stringify([
          { companyName: 'test', mailAddress: 'test@test.com', status: 'API Error', stack: apiError.stack }
        ])
      )
    })

    test('準正常:getConnectionForCompanyApiエラー', async () => {
      // 準備
      const testNominal = { ...nominalListTemplate }
      testNominal.filename = 'suppliersUpload_test1.csv'
      validateIsContactEmailSpy.mockReturnValueOnce(0)
      getCompaniesSpy.mockReturnValueOnce(returnGetCompaniesValue)
      const apiError = new Error('API Error')
      getConnectionForCompanySpy.mockReturnValueOnce(apiError)

      const [status, resultSuppliersCompany] = await uploadSuppliersController.upload(
        passport,
        Contracts[0],
        testNominal
      )

      // 期待結果
      expect(status).toBe(0)
      expect(JSON.stringify(resultSuppliersCompany)).toMatch(
        JSON.stringify([
          { companyName: 'test', mailAddress: 'test@test.com', status: 'API Error', stack: apiError.stack }
        ])
      )
    })

    test('準正常:getConnectionForCompanyApiでNetwork接続済みの場合', async () => {
      // 準備
      const testNominal = { ...nominalListTemplate }
      testNominal.filename = 'suppliersUpload_test1.csv'
      validateIsContactEmailSpy.mockReturnValueOnce(0)
      getCompaniesSpy.mockReturnValueOnce(returnGetCompaniesValue)
      getConnectionForCompanySpy.mockReturnValueOnce({ CompanyAccountId: 'test' })

      const [status, resultSuppliersCompany] = await uploadSuppliersController.upload(
        passport,
        Contracts[0],
        testNominal
      )

      // 期待結果
      expect(status).toBe(0)
      expect(resultSuppliersCompany[0].status).toBe('Already Connection')
    })

    test('準正常:getUserInformationByEmailApiエラー', async () => {
      // 準備
      const testNominal = { ...nominalListTemplate }
      testNominal.filename = 'suppliersUpload_test1.csv'
      validateIsContactEmailSpy.mockReturnValueOnce(0)
      getCompaniesSpy.mockReturnValueOnce(returnGetCompaniesValue)
      getConnectionForCompanySpy.mockReturnValueOnce(returnGetConnectionForCompanyValue)
      const apiError = new Error('API Error')
      getUserInformationByEmailSpy.mockReturnValueOnce(apiError)

      const [status, resultSuppliersCompany] = await uploadSuppliersController.upload(
        passport,
        Contracts[0],
        testNominal
      )

      // 期待結果
      expect(status).toBe(0)
      expect(JSON.stringify(resultSuppliersCompany)).toMatch(
        JSON.stringify([
          { companyName: 'test', mailAddress: 'test@test.com', status: 'API Error', stack: apiError.stack }
        ])
      )
    })

    test('準正常:getUserInformationByEmailApiでテナントIDが一致しない場合', async () => {
      // 準備
      const testNominal = { ...nominalListTemplate }
      testNominal.filename = 'suppliersUpload_test1.csv'
      validateIsContactEmailSpy.mockReturnValueOnce(0)
      getCompaniesSpy.mockReturnValueOnce(returnGetCompaniesValue)
      getConnectionForCompanySpy.mockReturnValueOnce(returnGetConnectionForCompanyValue)
      getUserInformationByEmailSpy.mockReturnValueOnce({ CompanyAccountId: 'test' })

      const [status, resultSuppliersCompany] = await uploadSuppliersController.upload(
        passport,
        Contracts[0],
        testNominal
      )

      // 期待結果
      expect(status).toBe(0)
      expect(resultSuppliersCompany[0].status).toBe('Email Not Match')
    })

    test('準正常:addNetworkConnectionApiエラー', async () => {
      // 準備
      const testNominal = { ...nominalListTemplate }
      testNominal.filename = 'suppliersUpload_test1.csv'
      validateIsContactEmailSpy.mockReturnValueOnce(0)
      getCompaniesSpy.mockReturnValueOnce(returnGetCompaniesValue)
      getConnectionForCompanySpy.mockReturnValueOnce(returnGetConnectionForCompanyValue)
      getUserInformationByEmailSpy.mockReturnValueOnce(returnGetUserInformationByEmailValue)
      const apiError = new Error('API Error')
      addNetworkConnectionSpy.mockReturnValueOnce(apiError)

      const [status, resultSuppliersCompany] = await uploadSuppliersController.upload(
        passport,
        Contracts[0],
        testNominal
      )

      // 期待結果
      expect(status).toBe(0)
      expect(JSON.stringify(resultSuppliersCompany)).toMatch(
        JSON.stringify([
          { companyName: 'test', mailAddress: 'test@test.com', status: 'API Error', stack: apiError.stack }
        ])
      )
    })

    test('準正常:CSVファイルのメールアドレス重複', async () => {
      // 準備
      const testNominal = { ...nominalListTemplate }
      testNominal.filename = 'suppliersUpload_test5.csv'
      validateIsContactEmailSpy.mockReturnValueOnce(0)
      getCompaniesSpy.mockReturnValueOnce(returnGetCompaniesValue)
      getConnectionForCompanySpy.mockReturnValueOnce(returnGetConnectionForCompanyValue)
      getUserInformationByEmailSpy.mockReturnValueOnce(returnGetUserInformationByEmailValue)
      addNetworkConnectionSpy.mockReturnValueOnce(returnAddNetworkConnectionValue)

      const [status, resultSuppliersCompany] = await uploadSuppliersController.upload(
        passport,
        Contracts[0],
        testNominal
      )

      // 期待結果
      expect(status).toBe(0)
      expect(JSON.stringify(resultSuppliersCompany)).toMatch(
        JSON.stringify([
          { companyName: 'test', mailAddress: 'test@test.com', status: 'Add Success', stack: null },
          { companyName: 'test2', mailAddress: 'test@test.com', status: 'Duplicate Email Error', stack: null }
        ])
      )
    })

    test('準正常:メールアドレスバリデーションエラー', async () => {
      // 準備
      const testNominal = { ...nominalListTemplate }
      testNominal.filename = 'suppliersUpload_test1.csv'
      validateIsContactEmailSpy.mockReturnValueOnce(false)

      const [status, resultSuppliersCompany] = await uploadSuppliersController.upload(
        passport,
        Contracts[0],
        testNominal
      )

      // 期待結果
      expect(status).toBe(0)
      expect(JSON.stringify(resultSuppliersCompany)).toMatch(
        JSON.stringify([{ companyName: 'test', mailAddress: 'test@test.com', status: 'Email Type Error', stack: null }])
      )
    })

    test('異常:項目数が異なる場合', async () => {
      // 準備
      const testNominal = { ...nominalListTemplate }
      testNominal.filename = 'suppliersUpload_test3.csv'

      const [status, resultSuppliersCompany] = await uploadSuppliersController.upload(
        passport,
        Contracts[0],
        testNominal
      )

      // 期待結果
      expect(status).toBe(-2)
      expect(resultSuppliersCompany).toBe(null)
    })

    test('異常:一括登録取引先が200件を超えている場合', async () => {
      // 準備
      const testNominal = { ...nominalListTemplate }
      testNominal.filename = 'suppliersUpload_test4.csv'

      const [status, resultSuppliersCompany] = await uploadSuppliersController.upload(
        passport,
        Contracts[0],
        testNominal
      )

      // 期待結果
      expect(status).toBe(-3)
      expect(resultSuppliersCompany).toBe(null)
    })
  })
})
