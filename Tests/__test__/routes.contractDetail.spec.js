'use strict'
jest.mock('../../Application/lib/logger')
jest.mock('../../Application/node_modules/express', () => {
  return require('jest-express')
})

const contractDetail = require('../../Application/routes/contractDetail')
const contractController = require('../../Application/controllers/contractController.js')
const Request = require('jest-express').Request
const Response = require('jest-express').Response
const next = require('jest-express').Next
const middleware = require('../../Application/routes/helpers/middleware')
const errorHelper = require('../../Application/routes/helpers/error')

const tenantId = '12345678-bdac-4195-80b9-1ea64b8cb70c'

const user = {
  tenantId: tenantId,
  userId: '976d46d7-cb0b-48ad-857d-4b42a44ede13',
  accessToken: 'dummyAccessToken',
  refreshToken: 'dummyRefreshToken'
}

const dbError = new Error('DB error')

let request, response, findContractsSpy

describe('contractDetailのテスト', () => {
  beforeEach(() => {
    request = new Request()
    response = new Response()

    // 使っている内部モジュールの関数をspyOn
    findContractsSpy = jest.spyOn(contractController, 'findContracts')
  })

  afterEach(() => {
    request.resetMocked()
    response.resetMocked()
    next.mockReset()
    findContractsSpy.mockRestore()
  })

  describe('ルーティング', () => {
    test('contractDetailのルーティングを確認', async () => {
      expect(contractDetail.router.get).toBeCalledWith(
        '/',
        expect.any(Function),
        middleware.bcdAuthenticate,
        middleware.isTenantManager,
        contractDetail.showContractDetail
      )
    })
  })

  describe('showContractDetail', () => {
    test('正常 無償契約のみ', async () => {
      // 準備
      findContractsSpy.mockReturnValue([
        {
          contractId: '096e42c0-d937-41d2-a0b8-96b2abcaa0e6',
          tenantId: tenantId,
          serviceType: '010',
          numberN: '',
          contractStatus: '10',
          deleteFlag: false,
          createdAt: '2022-06-30T06:16:24.572Z',
          updatedAt: '2022-06-30T06:16:24.577Z'
        }
      ])

      // request.userに正常値を想定する
      request.user = user

      // 試験実施
      await contractDetail.showContractDetail(request, response, next)

      // 期待結果
      expect(response.render).toHaveBeenCalledWith('contractDetail', {
        title: 'ご契約内容',
        engTitle: 'CONTRACT DETAIL',
        continuingContractList: [{ serviceType: '010', contractNumber: '', contractStatus: '10' }],
        oneShotContractList: []
      })
    })

    test('正常 無償契約、ライトプランス', async () => {
      // 準備
      findContractsSpy.mockReturnValue([
        {
          contractId: '096e42c0-d937-41d2-a0b8-96b2abcaa0e6',
          tenantId: tenantId,
          serviceType: '010',
          numberN: '123',
          contractStatus: '00',
          deleteFlag: false,
          createdAt: '2022-06-30T06:16:24.572Z',
          updatedAt: '2022-06-30T06:16:24.577Z'
        },
        {
          contractId: '096e42c0-d937-41d2-a0b8-96b2abcaa0e7',
          tenantId: tenantId,
          serviceType: '030',
          numberN: '',
          contractStatus: '10',
          deleteFlag: false,
          createdAt: '2022-07-01T06:16:24.572Z',
          updatedAt: '2022-07-01T06:16:24.577Z'
        }
      ])

      // request.userに正常値を想定する
      request.user = user

      // 試験実施
      await contractDetail.showContractDetail(request, response, next)

      // 期待結果
      expect(response.render).toHaveBeenCalledWith('contractDetail', {
        title: 'ご契約内容',
        engTitle: 'CONTRACT DETAIL',
        continuingContractList: [
          { serviceType: '010', contractNumber: '123', contractStatus: '00' },
          { serviceType: '030', contractNumber: '', contractStatus: '10' }
        ],
        oneShotContractList: []
      })
    })

    test('正常 無償契約、導入支援(ステータス:10)', async () => {
      // 準備
      findContractsSpy.mockReturnValue([
        {
          contractId: '096e42c0-d937-41d2-a0b8-96b2abcaa0e6',
          tenantId: tenantId,
          serviceType: '010',
          numberN: '123',
          contractStatus: '00',
          deleteFlag: false,
          createdAt: '2022-06-30T06:16:24.572Z',
          updatedAt: '2022-06-30T06:16:24.577Z'
        },
        {
          contractId: '096e42c0-d937-41d2-a0b8-96b2abcaa0e7',
          tenantId: tenantId,
          serviceType: '020',
          numberN: '',
          contractStatus: '10',
          deleteFlag: false,
          createdAt: '2022-07-01T06:16:24.572Z',
          updatedAt: '2022-07-01T06:16:24.577Z'
        }
      ])

      // request.userに正常値を想定する
      request.user = user

      // 試験実施
      await contractDetail.showContractDetail(request, response, next)

      // 期待結果
      expect(response.render).toHaveBeenCalledWith('contractDetail', {
        title: 'ご契約内容',
        engTitle: 'CONTRACT DETAIL',
        continuingContractList: [{ serviceType: '010', contractNumber: '123', contractStatus: '00' }],
        oneShotContractList: [{ serviceType: '020', contractNumber: '', contractStatus: '10' }]
      })
    })

    test('正常 無償契約、導入支援(ステータス:11)', async () => {
      // 準備
      findContractsSpy.mockReturnValue([
        {
          contractId: '096e42c0-d937-41d2-a0b8-96b2abcaa0e6',
          tenantId: tenantId,
          serviceType: '010',
          numberN: '123',
          contractStatus: '00',
          deleteFlag: false,
          createdAt: '2022-06-30T06:16:24.572Z',
          updatedAt: '2022-06-30T06:16:24.577Z'
        },
        {
          contractId: '096e42c0-d937-41d2-a0b8-96b2abcaa0e7',
          tenantId: tenantId,
          serviceType: '020',
          numberN: '',
          contractStatus: '11',
          deleteFlag: false,
          createdAt: '2022-07-01T06:16:24.572Z',
          updatedAt: '2022-07-01T06:16:24.577Z'
        }
      ])

      // request.userに正常値を想定する
      request.user = user

      // 試験実施
      await contractDetail.showContractDetail(request, response, next)

      // 期待結果
      expect(response.render).toHaveBeenCalledWith('contractDetail', {
        title: 'ご契約内容',
        engTitle: 'CONTRACT DETAIL',
        continuingContractList: [{ serviceType: '010', contractNumber: '123', contractStatus: '00' }],
        oneShotContractList: [{ serviceType: '020', contractNumber: '', contractStatus: '11' }]
      })
    })

    test('正常 無償契約、導入支援(ステータス:12)', async () => {
      // 準備
      findContractsSpy.mockReturnValue([
        {
          contractId: '096e42c0-d937-41d2-a0b8-96b2abcaa0e6',
          tenantId: tenantId,
          serviceType: '010',
          numberN: '123',
          contractStatus: '00',
          deleteFlag: false,
          createdAt: '2022-06-30T06:16:24.572Z',
          updatedAt: '2022-06-30T06:16:24.577Z'
        },
        {
          contractId: '096e42c0-d937-41d2-a0b8-96b2abcaa0e7',
          tenantId: tenantId,
          serviceType: '020',
          numberN: '',
          contractStatus: '12',
          deleteFlag: false,
          createdAt: '2022-07-01T06:16:24.572Z',
          updatedAt: '2022-07-01T06:16:24.577Z'
        }
      ])

      // request.userに正常値を想定する
      request.user = user

      // 試験実施
      await contractDetail.showContractDetail(request, response, next)

      // 期待結果
      expect(response.render).toHaveBeenCalledWith('contractDetail', {
        title: 'ご契約内容',
        engTitle: 'CONTRACT DETAIL',
        continuingContractList: [{ serviceType: '010', contractNumber: '123', contractStatus: '00' }],
        oneShotContractList: [{ serviceType: '020', contractNumber: '', contractStatus: '12' }]
      })
    })

    test('正常 無償契約、導入支援(ステータス:00)', async () => {
      // 準備
      findContractsSpy.mockReturnValue([
        {
          contractId: '096e42c0-d937-41d2-a0b8-96b2abcaa0e6',
          tenantId: tenantId,
          serviceType: '010',
          numberN: '123',
          contractStatus: '00',
          deleteFlag: false,
          createdAt: '2022-06-30T06:16:24.572Z',
          updatedAt: '2022-06-30T06:16:24.577Z'
        },
        {
          contractId: '096e42c0-d937-41d2-a0b8-96b2abcaa0e7',
          tenantId: tenantId,
          serviceType: '020',
          numberN: '',
          contractStatus: '00',
          deleteFlag: false,
          createdAt: '2022-07-01T06:16:24.572Z',
          updatedAt: '2022-07-01T06:16:24.577Z'
        }
      ])

      // request.userに正常値を想定する
      request.user = user

      // 試験実施
      await contractDetail.showContractDetail(request, response, next)

      // 期待結果
      expect(response.render).toHaveBeenCalledWith('contractDetail', {
        title: 'ご契約内容',
        engTitle: 'CONTRACT DETAIL',
        continuingContractList: [{ serviceType: '010', contractNumber: '123', contractStatus: '00' }],
        oneShotContractList: []
      })
    })

    test('正常 無償契約、ライトプランス、導入支援', async () => {
      // 準備
      findContractsSpy.mockReturnValue([
        {
          contractId: '096e42c0-d937-41d2-a0b8-96b2abcaa0e6',
          tenantId: tenantId,
          serviceType: '010',
          numberN: '123',
          contractStatus: '00',
          deleteFlag: false,
          createdAt: '2022-06-30T06:16:24.572Z',
          updatedAt: '2022-06-30T06:16:24.577Z'
        },
        {
          contractId: '096e42c0-d937-41d2-a0b8-96b2abcaa0e7',
          tenantId: tenantId,
          serviceType: '020',
          numberN: '',
          contractStatus: '10',
          deleteFlag: false,
          createdAt: '2022-07-01T06:16:24.572Z',
          updatedAt: '2022-07-01T06:16:24.577Z'
        },
        {
          contractId: '096e42c0-d937-41d2-a0b8-96b2abcaa0e7',
          tenantId: tenantId,
          serviceType: '030',
          numberN: '',
          contractStatus: '10',
          deleteFlag: false,
          createdAt: '2022-07-01T06:16:24.572Z',
          updatedAt: '2022-07-01T06:16:24.577Z'
        }
      ])

      // request.userに正常値を想定する
      request.user = user

      // 試験実施
      await contractDetail.showContractDetail(request, response, next)

      // 期待結果
      expect(response.render).toHaveBeenCalledWith('contractDetail', {
        title: 'ご契約内容',
        engTitle: 'CONTRACT DETAIL',
        continuingContractList: [
          { serviceType: '010', contractNumber: '123', contractStatus: '00' },
          { serviceType: '030', contractNumber: '', contractStatus: '10' }
        ],
        oneShotContractList: [{ serviceType: '020', contractNumber: '', contractStatus: '10' }]
      })
    })

    test('準正常: DBエラー時', async () => {
      // 準備
      findContractsSpy.mockImplementation(async () => {
        return dbError
      })

      // requestに正常値を想定する
      request.user = user

      // 試験実施
      await contractDetail.showContractDetail(request, response, next)

      // 期待結果
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
    })
  })
})
