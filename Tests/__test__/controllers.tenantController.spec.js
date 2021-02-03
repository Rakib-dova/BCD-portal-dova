'use strict'
jest.mock('../../Application/models')
jest.mock('../../Application/lib/logger')

const tenantController = require('../../Application/controllers/tenantController')

let findOneSpy, errorSpy, tenantId
describe('tenantControllerのテスト', () => {
  beforeEach(() => {
    const Tenant = require('../../Application/models').Tenant
    const logger = require('../../Application/lib/logger')
    findOneSpy = jest.spyOn(Tenant, 'findOne')
    errorSpy = jest.spyOn(logger, 'error')
  })
  afterEach(() => {
    findOneSpy.mockRestore()
    errorSpy.mockRestore()
  })
  tenantId = '12345678-bdac-4195-80b9-1ea64b8cb70c'

  describe('findOne', () => {
    test('正常', async () => {
      // 準備
      // DBからの正常テナントデータの取得を想定する
      findOneSpy.mockReturnValueOnce({
        tenantId: tenantId,
        registeredBy: '12345678-fbe6-4864-a866-7a3ce9aa517e',
        customerId: null,
        createdAt: '2021-01-25T10:15:15.035Z',
        updatedAt: '2021-01-25T10:15:15.035Z'
      })

      // 試験実施
      const result = await tenantController.findOne(tenantId)

      // 期待結果
      // 取得したテナントデータがReturnされていること
      expect(result).toEqual({
        tenantId: tenantId,
        registeredBy: '12345678-fbe6-4864-a866-7a3ce9aa517e',
        customerId: null,
        createdAt: '2021-01-25T10:15:15.035Z',
        updatedAt: '2021-01-25T10:15:15.035Z'
      })
    })
    test('status 0のErrorログ: DBエラー時', async () => {
      // 準備
      // 1回目のアクセストークンによるアクセスは401エラーを想定する
      const dbError = new Error('DB error mock')
      findOneSpy.mockImplementation(() => {
        throw dbError
      })

      // 試験実施
      const result = await tenantController.findOne(tenantId)

      // 期待結果
      // status: 0のErrorログ出力が呼ばれること
      expect(errorSpy).toHaveBeenCalledWith({ user: tenantId, stack: expect.anything(), status: 0 }, expect.anything())
      // DBErrorが返されること
      expect(result).toEqual(dbError)
    })
  })
})
