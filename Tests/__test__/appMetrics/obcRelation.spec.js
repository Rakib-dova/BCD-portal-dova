'use strict'
jest.mock('../../../Application/node_modules/express', () => {
  return require('jest-express')
})
// Application/obc/routes/tos.js を読み込むとO/Rにアクセスしエラーになるので、modelsのモック化が必要
jest.mock('../../../Application/obc/models', () => {
  return {
    Terms: { findOne: () => {} },
    User: { update: () => {} },
    Sequelize: { lte: Symbol('lte') }
  }
})
const tosRouter = require('../../../Application/obc/routes/tos')
const { User } = require('../../../Application/obc/models')
const logger = require('../../../Application/lib/logger.js')

const Request = require('jest-express').Request
const Response = require('jest-express').Response
const next = require('jest-express').Next

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

let request, response, infoSpy
let userUpdateSpy

describe('アプリ効果測定UT_デジトレ', () => {
  beforeEach(() => {
    request = new Request()
    request.user = user[0]
    request.session = session
    response = new Response()
    infoSpy = jest.spyOn(logger, 'info')
    userUpdateSpy = jest.spyOn(User, 'update')
  })
  afterEach(() => {
    request.resetMocked()
    response.resetMocked()
    next.mockReset()
    infoSpy.mockRestore()
    userUpdateSpy.mockRestore()
  })

  describe('OBC連携', () => {
    test('契約画面の「次へ」ボタンを押下した場合', async () => {
      userUpdateSpy.mockResolvedValue(null)

      await tosRouter.agree(request, response, next)

      expect(infoSpy).nthCalledWith(1, { action: 'relatedOBC', tenantId: 'dummyTenantId' })
    })
  })
})
