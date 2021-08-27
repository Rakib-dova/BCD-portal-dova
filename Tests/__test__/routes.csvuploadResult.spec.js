/* eslint-disable new-cap */
'use strict'

/*

 テスト実施するためにはテストソース「csvupload.js」の最後行の「module.exports」に
 cbPostUpload, cbUploadCsv, cbRemoveCsv, cbExtractInvoice, getTimeStampの登録が必要

  module.exports = {
    router: router,
    cbGetIndex: cbGetIndex,
    cbPostUpload: cbPostUpload,
    cbUploadCsv: cbUploadCsv,
    cbRemoveCsv: cbRemoveCsv,
    cbExtractInvoice: cbExtractInvoice,
    getTimeStamp: getTimeStamp
  }

*/

jest.mock('../../Application/node_modules/express', () => {
  return require('jest-express')
})

const csvuploadResult = require('../../Application/routes/csvuploadResult')
const Request = require('jest-express').Request
const Response = require('jest-express').Response
const next = require('jest-express').Next
const helper = require('../../Application/routes/helpers/middleware')
const errorHelper = require('../../Application/routes/helpers/error')
const noticeHelper = require('../../Application/routes/helpers/notice')
const userController = require('../../Application/controllers/userController.js')
const contractController = require('../../Application/controllers/contractController.js')
const invoicesController = require('../../Application/controllers/invoiceController')
const logger = require('../../Application/lib/logger.js')
const { v4: uuidv4 } = require('uuid')

if (process.env.LOCALLY_HOSTED === 'true') {
  // NODE_ENVはJestがデフォルトでtestに指定する。dotenvで上書きできなかったため、package.jsonの実行引数でdevelopmentを指定
  require('dotenv').config({ path: './config/.env' })
}
let request, response, infoSpy
describe('csvuploadResultのテスト', () => {
  beforeEach(() => {
    request = new Request()
    response = new Response()
    infoSpy = jest.spyOn(logger, 'info')
    userController.findOne = jest.fn((userId) => {
      if (users[userId] instanceof Error) {
        return users[userId]
      }
      if (users[userId]) {
        return { dataValues: users[userId] }
      }
      return null
    })
    invoicesController.findforTenant = jest.fn((tenantId) => {
      const result = []
      invoicesDB.forEach((recod) => {
        if (recod.tenantId === tenantId) {
          result.push({ dataValues: recod })
        }
      })
      return result
    })
    contractController.findOne = jest.fn((tenantId) => {
      const result = []
      if (tenantId === '76543210-7777-44a2-ab29-0c4a6cb02bd1') {
        return new Error()
      }
      contractDB.forEach((recod) => {
        if (recod.dataValues.tenantId === tenantId) {
          result.push({ ...recod })
        }
      })
      if (result.length === 0) return null
      return result[0]
    })
  })

  afterEach(() => {
    request.resetMocked()
    response.resetMocked()
    next.mockReset()
    infoSpy.mockRestore()
  })

  const userTemplate = {
    userId: '12345678-cb0b-48ad-857d-4b42a44ede13',
    tenantId: '221559d0-53aa-44a2-ab29-0c4a6cb02bde',
    userRole: 'a6a3edcd-00d9-427c-bf03-4ef0112ba16d',
    appVersion: '0.0.1',
    refreshToken: 'dummy',
    subRefreshToken: 'dummy',
    userStatus: 0,
    lastRefreshedAt: null,
    createdAt: null,
    updatedAt: null
  }
  const users = {
    '12345678-cb0b-48ad-857d-4b42a44ede13': {
      ...userTemplate
    },
    '6cf3acd65-4a94-b94b-b94b-53607702603': {
      ...userTemplate,
      userId: '6cf3acd65-4a94-b94b-b94b-53607702603'
    },
    '87654321-cb0b-48ad-857d-4b42a44ede99': {
      ...userTemplate,
      userId: '87654321-cb0b-48ad-857d-4b42a44ede99',
      tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089'
    },
    '87654321-cb0b-48ad-857d-4b42a44ede88': {
      ...userTemplate,
      userId: '87654321-cb0b-48ad-857d-4b42a44ede88',
      tenantId: '123456d0-53aa-44a2-ab29-0c4a6cb02bd1'
    },
    '99999999-cb0b-48ad-857d-4b42a44ede88': {
      ...userTemplate,
      userId: '99999999-cb0b-48ad-857d-4b42a44ede88',
      tenantId: '76543210-53aa-44a2-ab29-0c4a6cb02bd1'
    },
    '88888888-cb0b-48ad-857d-4b42a44ede88': {
      ...userTemplate,
      userId: '88888888-cb0b-48ad-857d-4b42a44ede88',
      tenantId: '76543210-7777-44a2-ab29-0c4a6cb02bd1'
    },
    '99999999-cb0b-9999-aaaa-4b42a44ede88': new Error(),
    '88888888-8888-48ad-857d-4b42a44ede88': {
      ...userTemplate,
      userId: '88888888-8888-48ad-857d-4b42a44ede88',
      tenantId: '76543210-7777-44a2-ab29-0c4a6cb02bd1',
      userStatus: 1
    }
  }

  const invoiceDbTemplate = {
    invoicesId: uuidv4(),
    tenantId: '221559d0-53aa-44a2-ab29-0c4a6cb02bde',
    csvFileName: 'routes.csvuploadResultFile1.csv',
    successCount: 8,
    failCount: 2,
    skipCount: 0,
    createdAt: Date(),
    updatedAt: Date()
  }
  const invoicesDB = [
    {
      ...invoiceDbTemplate
    },
    {
      ...invoiceDbTemplate,
      invoicesId: uuidv4(),
      csvFileName: 'routes.csvuploadResultFile2.csv',
      successCount: 10,
      failCount: 0,
      skipCount: 2
    },
    {
      ...invoiceDbTemplate,
      invoicesId: uuidv4(),
      csvFileName: 'routes.csvuploadResultFile3.csv',
      successCount: 10,
      failCount: 0,
      skipCount: 2
    },
    {
      ...invoiceDbTemplate,
      invoicesId: uuidv4(),
      csvFileName: 'routes.csvuploadResultFile4.csv',
      successCount: 10,
      failCount: 0,
      skipCount: 2
    },
    {
      ...invoiceDbTemplate,
      invoicesId: uuidv4(),
      csvFileName: 'routes.csvuploadResultFile5.csv',
      successCount: 10,
      failCount: 0,
      skipCount: 2
    }
  ]

  // 404エラー定義
  const error404 = new Error('お探しのページは見つかりませんでした。')
  error404.name = 'Not Found'
  error404.status = 404

  // 正常系データ定義
  // email,userId正常値
  const user = {
    email: 'dummy@testdummy.com',
    userId: '12345678-cb0b-48ad-857d-4b42a44ede13',
    tenantId: '221559d0-53aa-44a2-ab29-0c4a6cb02bde'
  }

  const user30 = {
    email: 'dummy@testdummy.com',
    userId: '87654321-cb0b-48ad-857d-4b42a44ede99',
    tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089'
  }

  const user31 = {
    email: 'dummy@testdummy.com',
    userId: '87654321-cb0b-48ad-857d-4b42a44ede88',
    tenantId: '123456d0-53aa-44a2-ab29-0c4a6cb02bd1'
  }

  const userContractNull = {
    email: 'dummy@testdummy.com',
    userId: '99999999-cb0b-48ad-857d-4b42a44ede88',
    tenantId: '76543210-53aa-44a2-ab29-0c4a6cb02bd1'
  }

  const userContractError = {
    email: 'dummy@testdummy.com',
    userId: '88888888-cb0b-48ad-857d-4b42a44ede88',
    tenantId: '76543210-7777-44a2-ab29-0c4a6cb02bd1'
  }

  const userStatusNotZero = {
    email: 'dummy@testdummy.com',
    userId: '88888888-8888-48ad-857d-4b42a44ede88',
    tenantId: '76543210-7777-44a2-ab29-0c4a6cb02bd1'
  }

  // 異常系データ定義
  // userIdがnullの場合
  const usernull = {
    email: 'dummy@testdummy.com',
    userId: '99999999-cb0b-9999-857d-4b42a44ede88',
    tenantId: '221559d0-53aa-44a2-ab29-0c4a6cb02bde'
  }

  const userError = {
    email: 'dummy@testdummy.com',
    userId: '99999999-cb0b-9999-aaaa-4b42a44ede88',
    tenantId: '221559d0-53aa-44a2-aaaa-0c4a6cb02bde'
  }

  const contractdataValues = {
    dataValues: {
      contractId: '87654321-cb0b-48ad-857d-4b42a44ede13',
      tenantId: '221559d0-53aa-44a2-ab29-0c4a6cb02bde',
      numberN: '0000011111',
      contractStatus: '00',
      deleteFlag: false,
      createdAt: '2021-01-25T08:45:49.803Z',
      updatedAt: '2021-01-25T08:45:49.803Z'
    }
  }

  const contractdataValues2 = {
    dataValues: {
      contractId: '87654321-cb0b-48ad-857d-4b42a44ede13',
      tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
      numberN: '0000011111',
      contractStatus: '30',
      deleteFlag: false,
      createdAt: '2021-01-25T08:45:49.803Z',
      updatedAt: '2021-01-25T08:45:49.803Z'
    }
  }

  const contractdataValues3 = {
    dataValues: {
      contractId: '87654321-cb0b-48ad-857d-4b42a44ede13',
      tenantId: '123456d0-53aa-44a2-ab29-0c4a6cb02bd1',
      numberN: '0000011111',
      contractStatus: '31',
      deleteFlag: false,
      createdAt: '2021-01-25T08:45:49.803Z',
      updatedAt: '2021-01-25T08:45:49.803Z'
    }
  }

  const contractdataValues4 = {
    dataValues: {
      contractId: '87654321-cb0b-48ad-857d-4b42a44ede13',
      tenantId: '99999999-8ba0-42a4-8582-b234cb4a2089',
      numberN: '0000011111',
      contractStatus: null,
      deleteFlag: false,
      createdAt: '2021-01-25T08:45:49.803Z',
      updatedAt: '2021-01-25T08:45:49.803Z'
    }
  }

  const contractdataValues5 = {
    dataValues: {
      contractId: '87654321-cb0b-48ad-857d-4b42a44ede13',
      tenantId: '99999999-8ba0-42a4-8582-b234cb4a2089',
      numberN: '0000011111',
      contractStatus: '00',
      deleteFlag: false,
      createdAt: '2021-01-25T08:45:49.803Z',
      updatedAt: '2021-01-25T08:45:49.803Z'
    }
  }

  const contractDB = [
    contractdataValues,
    contractdataValues2,
    contractdataValues3,
    contractdataValues4,
    contractdataValues5
  ]
  describe('ルーティング', () => {
    test('csvuploadのルーティングを確認', async () => {
      expect(csvuploadResult.router.get).toBeCalledWith(
        '/',
        helper.isAuthenticated,
        helper.isTenantRegistered,
        helper.isUserRegistered,
        csvuploadResult.cbGetIndex
      )
    })
  })

  describe('コールバック:cbGetIndex', () => {
    test('正常', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = {
        userContext: 'NotLoggedIn',
        userRole: 'dummy'
      }
      request.user = user

      const csvuploadResultArr = []
      invoicesDB.reduce((acc, currVal, currIdx, arr) => {
        const invoice = currVal
        const invoiceAll = ~~invoice.successCount + ~~invoice.failCount
        const status = invoice.failCount === 0
        csvuploadResultArr.push({
          index: currIdx + 1,
          date: timeStamp(invoice.updatedAt),
          filename: invoice.csvFileName,
          invoicesAll: invoiceAll,
          invoicesSuccess: invoice.successCount,
          invoicesSkip: invoice.skipCount,
          invoicesFail: invoice.failCount,
          status: status
        })
        return ''
      })

      // 試験実施
      await csvuploadResult.cbGetIndex(request, response, next)

      // 期待結果
      // 404，500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(500))
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
      expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
      // response.renderでcsvuploadが呼ばれ「る」
      expect(response.render).toHaveBeenCalledWith('csvuploadResult', { csvuploadResultArr: csvuploadResultArr })
    })

    test('正常：解約申込中の場合', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = {
        userContext: 'NotLoggedIn',
        userRole: 'dummy'
      }
      request.user = user30

      // 試験実施
      await csvuploadResult.cbGetIndex(request, response, next)

      // 期待結果
      // 404，500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(500))
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
      expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
      // 解約手続き中画面が表示「される」
      expect(next).toHaveBeenCalledWith(noticeHelper.create('cancelprocedure'))
    })

    test('正常：解約受取中の場合', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = {
        userContext: 'NotLoggedIn',
        userRole: 'dummy'
      }
      request.user = user31

      // 試験実施
      await csvuploadResult.cbGetIndex(request, response, next)

      // 期待結果
      // 404，500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(500))
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
      expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
      // 解約手続き中画面が表示「される」
      expect(next).toHaveBeenCalledWith(noticeHelper.create('cancelprocedure'))
    })

    test('500エラー:不正なContractデータの場合', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = {
        userContext: 'NotLoggedIn',
        userRole: 'dummy'
      }
      request.user = userContractError

      helper.checkContractStatus = 999

      // 試験実施
      await csvuploadResult.cbGetIndex(request, response, next)

      // 期待結果
      // 404，500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      // 500エラーがエラーハンドリング「される」
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
    })

    test('500エラー：requestのsession,userIdがnullの場合', async () => {
      // 準備
      // requestのsession,userIdにnullを入れる
      delete request.session
      delete request.user

      helper.checkContractStatus = 10

      // 試験実施
      await csvuploadResult.cbGetIndex(request, response, next)

      // 期待結果
      // 500エラーがエラーハンドリング「される」
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
      // userContextがLoggedInになって「いない」
      expect(request.session?.userContext).not.toBe('LoggedIn')
      // response.renderが呼ばれ「ない」
      expect(response.render).not.toHaveBeenCalled()
    })

    test('500エラー：DBからユーザが取得できなかった(null)場合', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = {
        userContext: 'NotLoggedIn',
        userRole: 'dummy'
      }
      request.user = usernull

      // 試験実施
      await csvuploadResult.cbGetIndex(request, response, next)

      // 期待結果
      // 404エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      // 500エラーがエラーハンドリング「される」
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
      // userContextがLoggedInになって「いない」
      expect(request.session?.userContext).not.toBe('LoggedIn')
      // session.userRoleが初期値のままになっている
      expect(request.session?.userRole).toBe('dummy')
      // response.renderが呼ばれ「ない」
      expect(response.render).not.toHaveBeenCalled()
    })

    test('500エラー：DBから契約情報が取得できなかった(null)場合', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = {
        userContext: 'NotLoggedIn',
        userRole: 'dummy'
      }
      request.user = userContractNull

      // 試験実施
      await csvuploadResult.cbGetIndex(request, response, next)

      // 期待結果
      // 404エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      // 500エラーがエラーハンドリング「される」
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
      // userContextがLoggedInになって「いない」
      expect(request.session?.userContext).not.toBe('LoggedIn')
      // session.userRoleが初期値のままになっている
      expect(request.session?.userRole).toBe('dummy')
      // response.renderが呼ばれ「ない」
      expect(response.render).not.toHaveBeenCalled()
    })

    test('500エラー：ユーザDBエラーの場合', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = {
        userContext: 'NotLoggedIn',
        userRole: 'dummy'
      }
      request.user = userError

      // 試験実施
      await csvuploadResult.cbGetIndex(request, response, next)

      // 期待結果
      // 500エラーがエラーハンドリング「される」
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
    })

    test('500エラー：契約DBエラーの場合', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = {
        userContext: 'NotLoggedIn',
        userRole: 'dummy'
      }
      request.user = userContractError

      // 試験実施
      await csvuploadResult.cbGetIndex(request, response, next)

      // 期待結果
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
    })

    test('404エラー：DBから取得したユーザのuserStatusが0以外の場合', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = {
        userContext: 'NotLoggedIn',
        userRole: 'dummy'
      }
      request.user = userStatusNotZero

      // 試験実施
      await csvuploadResult.cbGetIndex(request, response, next)

      // 期待結果
      // 404エラーがエラーハンドリング「される」
      expect(next).toHaveBeenCalledWith(error404)
    })
  })
})

// UTIL
const timeStamp = (date) => {
  const now = new Date(date)
  const year = now.getFullYear()
  const month = now.getMonth() + 1 < 10 ? '0' + (now.getMonth() + 1) : now.getMonth() + 1
  const day = now.getDate() < 10 ? '0' + now.getDate() : now.getDate()
  const hour = now.getHours() < 10 ? '0' + now.getHours() : now.getHours()
  const min = now.getMinutes() < 10 ? '0' + now.getMinutes() : now.getMinutes()
  const sec = now.getSeconds() < 10 ? '0' + now.getSeconds() : now.getSeconds()
  const stamp = `${year}/${month}/ ${day} ${hour}:${min}:${sec}`
  return stamp
}
