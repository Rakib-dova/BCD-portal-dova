'use strict'
jest.mock('../../Application/models')
jest.mock('../../Application/lib/logger')

const postalNumberController = require('../../Application/controllers/postalNumberController')
const logger = require('../../Application/lib/logger')
const Address = require('../../Application/models').Address

let findAllAddressSpy, errorSpy
describe('postalNumberControllerのテスト', () => {
  beforeEach(() => {
    findAllAddressSpy = jest.spyOn(Address, 'findAll')
    errorSpy = jest.spyOn(logger, 'error')
  })
  afterEach(() => {
    findAllAddressSpy.mockRestore()
    errorSpy.mockRestore()
  })
  const resultAddressList = {
    statuscode: 200,
    value: [{
      address: 'dummyStatedummyCitydummyaddress1dummyaddress2'
    }]
  }
  const resultAddressListWithNull = {
    statuscode: 200,
    value: [{
      address: 'dummyStatedummyCity'
    }]
  }
  const resultAddressListWithError = {
    statuscode: 500,
    value: []
  }
  const addressResult = [{
    dataValues: {
      state: 'dummyState',
      city: 'dummyCity',
      address1: 'dummyaddress1',
      address2: 'dummyaddress2'
    }
  }]
  const addressResultWithNull = [{
    dataValues: {
      state: 'dummyState',
      city: 'dummyCity',
      address1: null,
      address2: null
    }
  }]
  describe('findone', () => {
    test('正常：findone', async () => {
      // 準備
      const postalNumber = 'dummyPostalNumber'
      // DBからの正常解約情報の取得を想定する
      findAllAddressSpy.mockReturnValue(addressResult)

      // 試験実施
      const result = await postalNumberController.findOne(postalNumber)

      // 期待結果
      // 想定した契約情報がReturnされていること
      expect(result).toEqual(resultAddressList)
    })
    test('正常：findone address1,address2がnullの場合', async () => {
      // 準備
      const postalNumber = 'dummyPostalNumber'
      // DBからの正常解約情報の取得を想定する
      findAllAddressSpy.mockReturnValue(addressResultWithNull)

      // 試験実施
      const result = await postalNumberController.findOne(postalNumber)

      // 期待結果
      // 想定した契約情報がReturnされていること
      expect(result).toEqual(resultAddressListWithNull)
    })
    test('findallのError: DBエラー時', async () => {
      // 準備
      const postalNumber = 'dummyPostalNumber'
      const dbError = new Error('DB error mock')
      findAllAddressSpy.mockImplementation(() => {
        throw dbError
      })
      // 試験実施
      const result = await postalNumberController.findOne(postalNumber)

      // 期待結果
      // status: 0のErrorログ出力が呼ばれること
      expect(errorSpy).toHaveBeenCalledWith({ postalNumber: postalNumber, stack: dbError.stack, status: 0 }, dbError.name)
      // DBErrorが返されること
      expect(result).toEqual(resultAddressListWithError)
    })
  })
})
