'use strict'
jest.mock('../../Application/lib/logger')

const pdfInvoiceHistoryDetailController = require('../../Application/controllers/pdfInvoiceHistoryDetailController')
const logger = require('../../Application/lib/logger')
const pdfInvoiceHistoryDetail = require('../../Application/models').pdfInvoiceHistoryDetail
const Sequelize = require('../../Application/models').Sequelize
const Op = Sequelize.Op

let infoSpy, errorSpy
let createSpy, findAllSpy

describe('contractControllerのテスト', () => {
  beforeEach(() => {
    infoSpy = jest.spyOn(logger, 'info')
    errorSpy = jest.spyOn(logger, 'error')
    createSpy = jest.spyOn(pdfInvoiceHistoryDetail, 'create')
    findAllSpy = jest.spyOn(pdfInvoiceHistoryDetail, 'findAll')
  })
  afterEach(() => {
    infoSpy.mockRestore()
    errorSpy.mockRestore()
    createSpy.mockRestore()
    findAllSpy.mockRestore()
  })

  describe('findInvoiceDetail', () => {
    test('正常', async () => {
      findAllSpy.mockReturnValue('findAllReturn')

      // 試験実施
      const result = await pdfInvoiceHistoryDetailController.findInvoiceDetail('dummyhistoryId')

      // 期待結果
      expect(findAllSpy).toHaveBeenCalled()
      expect(result).toEqual('findAllReturn')
      expect(findAllSpy).nthCalledWith(1, {
        where: {
          historyId: 'dummyhistoryId'
        },
        order: [
          ['lines', 'ASC'],
          ['invoiceNo', 'ASC']
        ]
      })
    })
    test('異常：DBエラーの場合', async () => {
      // 準備
      // DBエラーを想定する
      const dbError = new Error('DB error mock')
      findAllSpy.mockImplementation(() => {
        throw dbError
      })
      // 試験実施
      const result = await pdfInvoiceHistoryDetailController.findInvoiceDetail('dummyTenantId')

      // 期待結果
      expect(result).toEqual(dbError)
    })
  })

  describe('create', () => {
    test('正常', async () => {
      createSpy.mockReturnValue('createReturn')

      // 試験実施
      const result = await pdfInvoiceHistoryDetailController.create({
        values1: 'dummyValues1',
        values2: 'dummyValues2',
        values3: 'dummyValues3'
      })

      // 期待結果
      expect(result).toEqual('createReturn')
      expect(createSpy).nthCalledWith(1, {
        values1: 'dummyValues1',
        values2: 'dummyValues2',
        values3: 'dummyValues3'
      })
    })

    test('異常：DBエラーの場合', async () => {
      const dbError = new Error('DB error mock')
      createSpy.mockImplementation(() => {
        throw dbError
      })

      // 試験実施
      const result = await pdfInvoiceHistoryDetailController.create({
        values1: 'dummyValues1',
        values2: 'dummyValues2',
        values3: 'dummyValues3'
      })

      // 期待結果
      expect(result).toEqual(dbError)
    })
  })
})
