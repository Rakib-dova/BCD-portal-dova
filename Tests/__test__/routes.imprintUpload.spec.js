'use strict'

jest.mock('../../Application/node_modules/express', () => {
  return require('jest-express')
})

const imprintUpload = require('../../Application/routes/imprintUpload.js')
const Request = require('jest-express').Request
const Response = require('jest-express').Response
const next = require('jest-express').Next
// const helper = require('../../Application/routes/helpers/middleware')
const errorHelper = require('../../Application/routes/helpers/error')
const storageCommon = require('../../Application/lib/storageCommon')

jest.mock('../../Application/lib/pdfGenerator')

let request, response
let getSealImpSpy, uploadsealImpSpy, deleteSealImpSpy

const user = [
  {
    // 契約ステータス：契約中
    userId: '388014b9-d667-4144-9cc4-5da420981438',
    email: 'dummy@testdummy.com',
    tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
    accessToken: 'dummyAccessToken',
    refreshToken: 'dummyRefreshToken'
  }
]

describe('imprintUploadのテスト', () => {
  beforeEach(() => {
    request = new Request()
    request.user = user[0]
    request.file = { buffer: Buffer.from('dummyFile') }
    request.csrfToken = () => 'dummyCsrfToken'
    response = new Response()
    getSealImpSpy = jest.spyOn(storageCommon, 'getSealImp')
    uploadsealImpSpy = jest.spyOn(storageCommon, 'upload')
    deleteSealImpSpy = jest.spyOn(storageCommon, 'deleteSealImp')
  })
  afterEach(() => {
    request.resetMocked()
    response.resetMocked()
    next.mockReset()
    getSealImpSpy.mockRestore()
    uploadsealImpSpy.mockRestore()
    deleteSealImpSpy.mockRestore()
  })

  describe('コールバック:showImprintUpload', () => {
    test('正常', async () => {
      getSealImpSpy.mockReturnValue(Buffer.from('dummyImg'))

      await imprintUpload.showImprintUpload(request, response, next)

      expect(response.render).toHaveBeenCalledWith('imprintUpload', {
        sealImp: 'data:image/png;base64,ZHVtbXlJbWc=',
        csrfToken: 'dummyCsrfToken'
      })
    })

    test('正常', async () => {
      getSealImpSpy.mockReturnValue(null)

      await imprintUpload.showImprintUpload(request, response, next)

      expect(response.render).toHaveBeenCalledWith('imprintUpload', {
        sealImp: null,
        csrfToken: 'dummyCsrfToken'
      })
    })
  })

  describe('コールバック:uploadImprint', () => {
    test('正常', async () => {
      uploadsealImpSpy.mockReturnValue('dummy')

      await imprintUpload.uploadImprint(request, response, next)

      expect(response.redirect)
    })

    test('準正常', async () => {
      uploadsealImpSpy.mockImplementation(() => {
        throw new Error('')
      })
      await imprintUpload.uploadImprint(request, response, next)

      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
    })
  })

  describe('コールバック:deleteImprint', () => {
    test('正常', async () => {
      deleteSealImpSpy.mockReturnValue()

      await imprintUpload.deleteImprint(request, response, next)

      expect(response.redirect)
    })

    test('準正常', async () => {
      deleteSealImpSpy.mockImplementation(() => {
        throw new Error('')
      })
      await imprintUpload.deleteImprint(request, response, next)

      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
    })
  })
})
