'use strict'
jest.mock('../../Application/node_modules/express', () => {
  return require('jest-express')
})

const index = require('../../Application/routes/api/index')
const Request = require('jest-express').Request
const Response = require('jest-express').Response
const next = require('jest-express').Next
const helper = require('../../Application/routes/helpers/middleware')

let request, response
describe('api/indexのテスト', () => {
  beforeEach(() => {
    request = new Request()
    response = new Response()
  })
  afterEach(() => {
    request.resetMocked()
    response.resetMocked()
    next.mockReset()
  })

  describe('ルーティング', () => {
    test('indexのルーティングを確認', async () => {
      expect(index.router.get).toBeCalledWith('/noticeCount', helper.isAuthenticated, index.noticeCount)
    })
  })
})
