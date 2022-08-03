'use strict'
jest.mock('../../Application/lib/logger')

const ChannelDepartment = require('../../Application/models').ChannelDepartment
const channelDepartmentController = require('../../Application/controllers/channelDepartmentController')

const dbError = new Error('DB error')

let findAllSpy, findOneSpy

describe('channelDepartmentControllerのテスト', () => {
  beforeEach(() => {
    findAllSpy = jest.spyOn(ChannelDepartment, 'findAll')
    findOneSpy = jest.spyOn(ChannelDepartment, 'findOne')
  })

  afterEach(() => {
    findAllSpy.mockRestore()
    findOneSpy.mockRestore()
  })

  describe('findAll', () => {
    test('正常', async () => {
      // 準備
      const channelDepartments = [
        { code: '01', name: 'Com第一営業本部' },
        { code: '02', name: 'Com第二営業本部' }
      ]
      findAllSpy.mockReturnValueOnce(channelDepartments)

      // 試験実施
      const result = await channelDepartmentController.findAll()

      // 期待結果
      expect(result).toEqual(channelDepartments)
    })

    test('準正常: DBエラー時', async () => {
      // 準備
      findAllSpy.mockImplementation(async () => {
        throw dbError
      })

      // 試験実施
      const result = await channelDepartmentController.findAll()
      // 期待結果
      expect(result).toEqual(dbError)
    })
  })

  describe('findOne', () => {
    test('正常', async () => {
      // 準備
      const inputCode = '01'
      const channelDepartment = { code: '01', name: 'Com第一営業本部' }
      findOneSpy.mockImplementation(async (option) => {
        expect(option.where.code).toEqual(inputCode)
        return channelDepartment
      })

      // 試験実施
      const result = await channelDepartmentController.findOne(inputCode)

      // 期待結果
      expect(result).toEqual(channelDepartment)
    })

    test('準正常: DBエラー時', async () => {
      // 準備
      const inputCode = '01'
      findOneSpy.mockImplementation(async (option) => {
        expect(option.where.code).toEqual(inputCode)
        throw dbError
      })

      // 試験実施
      const result = await channelDepartmentController.findOne(inputCode)
      // 期待結果
      expect(result).toEqual(dbError)
    })
  })
})
