'use strict'
jest.mock('../../../Application/node_modules/express', () => {
  return require('jest-express')
})

const memberSiteController = require('../../../Application/memberSite/controllers/memberSiteController')
const memberSiteControllerDao = require('../../../Application/memberSite/daos/memberSiteControllerDao')
const db = require('../../../Application/models')
const logger = require('../../../Application/lib/logger.js')
const Request = require('jest-express').Request
const Response = require('jest-express').Response
const next = require('jest-express').Next

let request, response, logerInfoSpy
let getServiceLinkSpy, createServiceLinkageIdSpy, transactionSpy

describe('アプリ効果測定UT_デジトレ', () => {
  beforeEach(() => {
    request = new Request()
    response = new Response()
    logerInfoSpy = jest.spyOn(logger, 'info')
    getServiceLinkSpy = jest.spyOn(memberSiteControllerDao, 'getServiceLinkageIdBydigitaltradeId')
    createServiceLinkageIdSpy = jest.spyOn(memberSiteControllerDao, 'createServiceLinkageId')
    transactionSpy = jest.spyOn(db.sequelize, 'transaction') // db.sequelize.transaction() でエラーを出力させない為に必要
  })
  afterEach(() => {
    request.resetMocked()
    response.resetMocked()
    next.mockReset()
    logerInfoSpy.mockRestore()
    getServiceLinkSpy.mockRestore()
    createServiceLinkageIdSpy.mockRestore()
    transactionSpy.mockRestore()
  })

  describe('会員サイトデジトレ連携', () => {
    test('連携済みの場合', async () => {
      transactionSpy.mockResolvedValue({}) // db.sequelize.transaction() でエラーを出力させない為に必要
      getServiceLinkSpy.mockResolvedValue({}) // 連携済み情報を返す (nullを返さない)

      await memberSiteController.idAssociation({ fingerprintVerifyFlg: true, tradeshiftTenantId: 'dummyTenantId' })

      expect(logerInfoSpy).nthCalledWith(2, 'INF-MB106 ServiceLinkageId exists')
      expect(logerInfoSpy).not.nthCalledWith(3, { action: 'relatedBCD', tenantId: 'dummyTenantId' })
    })

    test('未連携の場合', async () => {
      transactionSpy.mockResolvedValue({}) // db.sequelize.transaction() でエラーを出力させない為に必要
      getServiceLinkSpy.mockResolvedValue(null) // 紐付け情報なしを返す
      createServiceLinkageIdSpy.mockResolvedValue(null) // 紐付け情報なしを返す

      await memberSiteController.idAssociation({ fingerprintVerifyFlg: true, tradeshiftTenantId: 'dummyTenantId' })

      expect(logerInfoSpy).nthCalledWith(3, { action: 'relatedBCD', tenantId: 'dummyTenantId' })
    })
  })
})
