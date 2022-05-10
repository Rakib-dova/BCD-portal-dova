'use strict'
jest.mock('../../Application/node_modules/express', () => {
  return require('jest-express')
})
jest.mock('rss-parser')
const portal = require('../../Application/routes/portal')
const Request = require('jest-express').Request
const Response = require('jest-express').Response
const next = require('jest-express').Next
const helper = require('../../Application/routes/helpers/middleware')
const noticeHelper = require('../../Application/routes/helpers/notice')
const errorHelper = require('../../Application/routes/helpers/error')
const userController = require('../../Application/controllers/userController.js')
const contractController = require('../../Application/controllers/contractController.js')
const approvalInboxController = require('../../Application/controllers/approvalInboxController')
const db = require('../../Application/models')
const requestApprovalModel = db.RequestApproval
const logger = require('../../Application/lib/logger.js')
const Parser = require('../../Application/node_modules/rss-parser')

const MemberSiteSessionDto = require('../../Application/memberSite/dtos/memberSiteSessionDto')

const resultofRequestApprovals = [
  {
    requestId: '0e11ba9a-bd33-46f0-87db-cca918e2bb87',
    contractId: '198851fe-f220-4c7a-9aca-a08f744e45ae',
    approveRouteId: 'bdaea953-79f3-4560-8209-8d0e1710a224',
    invoiceId: 'd58ce0d1-87fb-5ea3-8abe-03549b981939',
    requester: 'c7dc9c91-41ec-4209-8c11-b68e4f84c1de',
    status: '10',
    message: 'test1234',
    create: '2022-03-15T04:59:18.436Z',
    isSaved: false
  },
  {
    requestId: '14c82982-1562-4cfb-b13a-a83578db0f39',
    contractId: '198851fe-f220-4c7a-9aca-a08f744e45ae',
    approveRouteId: 'bdaea953-79f3-4560-8209-8d0e1710a224',
    invoiceId: 'd58ce0d1-87fb-5ea3-8abe-03549b981939',
    requester: '12345678-cb0b-48ad-857d-4b42a44ede13',
    status: '90',
    message: 'test1234',
    create: '2022-03-15T04:59:18.436Z',
    isSaved: false
  }
]

if (process.env.LOCALLY_HOSTED === 'true') {
  // NODE_ENVはJestがデフォルトでtestに指定する。dotenvで上書きできなかったため、package.jsonの実行引数でdevelopmentを指定
  require('dotenv').config({ path: './config/.env' })
}

let request, response, infoSpy, findOneSpy, findOneSpyContracts, parseUrlSpy
let approvalInboxControllerGetRequestApprovalSpy,
  approvalInboxControllerHasPowerOfEditingSpy,
  requestApprovalModelFindAllSpy
describe('portalのテスト', () => {
  beforeEach(() => {
    request = new Request()
    response = new Response()
    infoSpy = jest.spyOn(logger, 'info')
    findOneSpy = jest.spyOn(userController, 'findOne')
    findOneSpyContracts = jest.spyOn(contractController, 'findOne')
    parseUrlSpy = jest.spyOn(Parser.prototype, 'parseURL')
    approvalInboxControllerGetRequestApprovalSpy = jest.spyOn(approvalInboxController, 'getRequestApproval')
    approvalInboxControllerHasPowerOfEditingSpy = jest.spyOn(approvalInboxController, 'hasPowerOfEditing')
    requestApprovalModelFindAllSpy = jest.spyOn(requestApprovalModel, 'findAll')
  })
  afterEach(() => {
    request.resetMocked()
    response.resetMocked()
    next.mockReset()
    infoSpy.mockRestore()
    findOneSpy.mockRestore()
    findOneSpyContracts.mockRestore()
    parseUrlSpy.mockRestore()
    approvalInboxControllerGetRequestApprovalSpy.mockRestore()
    approvalInboxControllerHasPowerOfEditingSpy.mockRestore()
    requestApprovalModelFindAllSpy.mockRestore()
  })

  // 404エラー定義
  const error404 = new Error('お探しのページは見つかりませんでした。')
  error404.name = 'Not Found'
  error404.status = 404

  describe('ルーティング', () => {
    test('portalのルーティングを確認', async () => {
      expect(portal.router.get).toBeCalledWith(
        '/',
        helper.isAuthenticated,
        helper.isTenantRegistered,
        helper.isUserRegistered,
        expect.any(Function),
        portal.cbGetIndex
      )
    })
  })

  describe('コールバック:cbGetIndex', () => {
    test('正常：支払依頼が来た時', async () => {
      // 準備
      // 会員サイト開発により追加
      const memberSiteCoopSessionDto = new MemberSiteSessionDto()
      memberSiteCoopSessionDto.memberSiteFlg = true
      // 会員サイト開発により追加

      // requestのsession,userIdに正常値を入れる
      request.session = {
        userContext: 'NotLoggedIn',
        userRole: 'dummy',
        memberSiteCoopSession: memberSiteCoopSessionDto // 会員サイト開発により追加
      }
      request.user = {
        userId: '12345678-cb0b-48ad-857d-4b42a44ede13'
      }
      // DBからの正常なユーザデータの取得を想定する
      findOneSpy.mockReturnValue({
        dataValues: {
          userId: '12345678-cb0b-48ad-857d-4b42a44ede13',
          tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
          userRole: 'a6a3edcd-00d9-427c-bf03-4ef0112ba16d',
          appVersion: '0.0.1',
          refreshToken: 'dummyRefreshToken',
          subRefreshToken: null,
          userStatus: 0,
          lastRefreshedAt: null,
          createdAt: '2021-01-25T08:45:49.803Z',
          updatedAt: '2021-01-25T08:45:49.803Z'
        },
        userId: '12345678-cb0b-48ad-857d-4b42a44ede13'
      })
      findOneSpyContracts.mockReturnValue({
        dataValues: {
          contractId: '87654321-cb0b-48ad-857d-4b42a44ede13',
          tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
          numberN: '0000011111',
          contractStatus: '10',
          deleteFlag: false,
          createdAt: '2021-01-25T08:45:49.803Z',
          updatedAt: '2021-01-25T08:45:49.803Z'
        }
      })

      // お知らせ取得
      const constructDataArr = {
        items: []
      }
      const newsDataArr = {
        items: []
      }

      parseUrlSpy.mockImplementationOnce(async () => {
        return newsDataArr
      })
      parseUrlSpy.mockImplementationOnce(async () => {
        return constructDataArr
      })

      const expectDateArr = [{ message: '現在、お知らせはありません。' }]
      const expectconstructDataArr = [{ message: '現在、工事故障情報はありません。' }]
      // CSRF対策
      const dummyTokne = 'testCsrfToken'
      request.csrfToken = jest.fn(() => {
        return dummyTokne
      })

      requestApprovalModelFindAllSpy.mockReturnValueOnce(resultofRequestApprovals)
      approvalInboxControllerHasPowerOfEditingSpy.mockReturnValueOnce(true).mockReturnValueOnce(false)

      // 試験実施
      await portal.cbGetIndex(request, response, next)

      // 期待結果
      // 404，500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(500))
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
      expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
      // response.renderでportalが呼ばれ「る」
      expect(response.render).toHaveBeenCalledWith('portal', {
        constructDataArr: expectconstructDataArr,
        constructDataArrSize: expectconstructDataArr[0].title ? expectconstructDataArr.length : 0,
        newsDataArr: expectDateArr,
        newsDataArrSize: newsDataArr.items.length,
        title: 'ポータル',
        tenantId: request.user.tenantId,
        userRole: request.session.userRole,
        numberN: '0000011111',
        TS_HOST: process.env.TS_HOST,
        memberSiteFlg: memberSiteCoopSessionDto.memberSiteFlg /* 会員サイト開発により追加 */,
        csrfToken: dummyTokne /* 会員サイト開発により追加 */,
        rejectedNoticeCnt: 1,
        requestNoticeCnt: 1
      })
    })

    test('正常', async () => {
      // 準備
      // 会員サイト開発により追加
      const memberSiteCoopSessionDto = new MemberSiteSessionDto()
      memberSiteCoopSessionDto.memberSiteFlg = true
      // 会員サイト開発により追加

      // requestのsession,userIdに正常値を入れる
      request.session = {
        userContext: 'NotLoggedIn',
        userRole: 'dummy',
        memberSiteCoopSession: memberSiteCoopSessionDto // 会員サイト開発により追加
      }
      request.user = {
        userId: '12345678-cb0b-48ad-857d-4b42a44ede13'
      }
      // DBからの正常なユーザデータの取得を想定する
      findOneSpy.mockReturnValue({
        dataValues: {
          userId: '12345678-cb0b-48ad-857d-4b42a44ede13',
          tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
          userRole: 'a6a3edcd-00d9-427c-bf03-4ef0112ba16d',
          appVersion: '0.0.1',
          refreshToken: 'dummyRefreshToken',
          subRefreshToken: null,
          userStatus: 0,
          lastRefreshedAt: null,
          createdAt: '2021-01-25T08:45:49.803Z',
          updatedAt: '2021-01-25T08:45:49.803Z'
        }
      })
      findOneSpyContracts.mockReturnValue({
        dataValues: {
          contractId: '87654321-cb0b-48ad-857d-4b42a44ede13',
          tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
          numberN: '0000011111',
          contractStatus: '10',
          deleteFlag: false,
          createdAt: '2021-01-25T08:45:49.803Z',
          updatedAt: '2021-01-25T08:45:49.803Z'
        }
      })

      // お知らせ取得
      const constructDataArr = {
        items: []
      }
      const newsDataArr = {
        items: []
      }
      const rssMaker = function (title, link, date) {
        return {
          title: title,
          link: link,
          date: date
        }
      }
      constructDataArr.items.push(rssMaker('BConnection RSS 1', 'http://test', '2022-03-08'))
      constructDataArr.items.push(rssMaker('BConnection RSS 2', 'http://test', '2022-03-08'))
      newsDataArr.items.push(rssMaker('BConnection RSS2 1', 'http://test', '2022-03-08'))
      newsDataArr.items.push(rssMaker('BConnection RSS2 2', 'http://test', '2022-03-08'))
      const expectDateArr = newsDataArr.items.map((item) => {
        const day = new Date(item.date)
        return {
          ...item,
          date: day.getFullYear() + '年' + (day.getMonth() + 1) + '月' + day.getDate() + '日'
        }
      })
      const expectconstructDataArr = constructDataArr.items.map((item) => {
        const day = new Date(item.date)
        return {
          ...item,
          date: day.getFullYear() + '年' + (day.getMonth() + 1) + '月' + day.getDate() + '日'
        }
      })
      parseUrlSpy.mockImplementationOnce(async () => {
        return newsDataArr
      })
      parseUrlSpy.mockImplementationOnce(async () => {
        return constructDataArr
      })

      // CSRF対策
      const dummyTokne = 'testCsrfToken'
      request.csrfToken = jest.fn(() => {
        return dummyTokne
      })

      requestApprovalModelFindAllSpy.mockReturnValueOnce(resultofRequestApprovals)
      approvalInboxControllerHasPowerOfEditingSpy.mockReturnValue(false)

      // 試験実施
      await portal.cbGetIndex(request, response, next)

      // 期待結果
      // 404，500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(500))
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
      expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
      // response.renderでportalが呼ばれ「る」
      expect(response.render).toHaveBeenCalledWith('portal', {
        constructDataArr: expectconstructDataArr,
        constructDataArrSize: expectconstructDataArr[0].title ? expectconstructDataArr.length : 0,
        newsDataArr: expectDateArr,
        newsDataArrSize: expectDateArr.length,
        title: 'ポータル',
        tenantId: request.user.tenantId,
        userRole: request.session.userRole,
        numberN: '0000011111',
        TS_HOST: process.env.TS_HOST,
        memberSiteFlg: memberSiteCoopSessionDto.memberSiteFlg /* 会員サイト開発により追加 */,
        csrfToken: dummyTokne /* 会員サイト開発により追加 */,
        rejectedNoticeCnt: 0,
        requestNoticeCnt: 0
      })
    })

    test('正常:RSS３件以上の場合', async () => {
      // 準備
      // 会員サイト開発により追加
      const memberSiteCoopSessionDto = new MemberSiteSessionDto()
      memberSiteCoopSessionDto.memberSiteFlg = true
      // 会員サイト開発により追加

      // requestのsession,userIdに正常値を入れる
      request.session = {
        userContext: 'NotLoggedIn',
        userRole: 'dummy',
        memberSiteCoopSession: memberSiteCoopSessionDto // 会員サイト開発により追加
      }
      request.user = {
        userId: '12345678-cb0b-48ad-857d-4b42a44ede13'
      }
      // DBからの正常なユーザデータの取得を想定する
      findOneSpy.mockReturnValue({
        dataValues: {
          userId: '12345678-cb0b-48ad-857d-4b42a44ede13',
          tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
          userRole: 'a6a3edcd-00d9-427c-bf03-4ef0112ba16d',
          appVersion: '0.0.1',
          refreshToken: 'dummyRefreshToken',
          subRefreshToken: null,
          userStatus: 0,
          lastRefreshedAt: null,
          createdAt: '2021-01-25T08:45:49.803Z',
          updatedAt: '2021-01-25T08:45:49.803Z'
        }
      })
      findOneSpyContracts.mockReturnValue({
        dataValues: {
          contractId: '87654321-cb0b-48ad-857d-4b42a44ede13',
          tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
          numberN: '0000011111',
          contractStatus: '10',
          deleteFlag: false,
          createdAt: '2021-01-25T08:45:49.803Z',
          updatedAt: '2021-01-25T08:45:49.803Z'
        }
      })

      // お知らせ取得
      const constructDataArr = {
        items: []
      }
      const newsDataArr = {
        items: []
      }
      const rssMaker = function (title, link, date) {
        return {
          title: title,
          link: link,
          date: date
        }
      }
      constructDataArr.items.push(rssMaker('BConnection RSS 1', 'http://test', '2022-03-08'))
      constructDataArr.items.push(rssMaker('BConnection RSS 2', 'http://test', '2022-03-08'))
      constructDataArr.items.push(rssMaker('BConnection RSS 3', 'http://test', '2021-12-09'))
      constructDataArr.items.push(rssMaker('BConnection RSS 4', 'http://test', '2021-12-10'))
      newsDataArr.items.push(rssMaker('BConnection RSS2 1', 'http://test', '2022-03-08'))
      newsDataArr.items.push(rssMaker('BConnection RSS2 2', 'http://test', '2022-03-08'))
      newsDataArr.items.push(rssMaker('BConnection RSS2 3', 'http://test', '2021-12-09'))
      newsDataArr.items.push(rssMaker('BConnection RSS2 4', 'http://test', '2021-12-10'))
      const expectDateArr = []
      newsDataArr.items.forEach((item, idx) => {
        if (idx < 3) {
          const day = new Date(item.date)
          expectDateArr.push({
            ...item,
            date: day.getFullYear() + '年' + (day.getMonth() + 1) + '月' + day.getDate() + '日'
          })
        }
      })
      const expectconstructDataArr = []
      constructDataArr.items.forEach((item, idx) => {
        if (idx < 3) {
          const day = new Date(item.date)
          expectconstructDataArr.push({
            ...item,
            date: day.getFullYear() + '年' + (day.getMonth() + 1) + '月' + day.getDate() + '日'
          })
        }
      })
      parseUrlSpy.mockImplementationOnce(async () => {
        return newsDataArr
      })
      parseUrlSpy.mockImplementationOnce(async () => {
        return constructDataArr
      })

      // CSRF対策
      const dummyTokne = 'testCsrfToken'
      request.csrfToken = jest.fn(() => {
        return dummyTokne
      })

      requestApprovalModelFindAllSpy.mockReturnValueOnce([])
      approvalInboxControllerHasPowerOfEditingSpy.mockReturnValue(false)

      // 試験実施
      await portal.cbGetIndex(request, response, next)

      // 期待結果
      // 404，500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(500))
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
      expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
      // response.renderでportalが呼ばれ「る」
      expect(response.render).toHaveBeenCalledWith('portal', {
        constructDataArr: expectconstructDataArr,
        constructDataArrSize: expectconstructDataArr[0].title ? expectconstructDataArr.length : 0,
        newsDataArr: expectDateArr,
        newsDataArrSize: newsDataArr.items.length,
        title: 'ポータル',
        tenantId: request.user.tenantId,
        userRole: request.session.userRole,
        numberN: '0000011111',
        TS_HOST: process.env.TS_HOST,
        memberSiteFlg: memberSiteCoopSessionDto.memberSiteFlg /* 会員サイト開発により追加 */,
        csrfToken: dummyTokne /* 会員サイト開発により追加 */,
        rejectedNoticeCnt: 0,
        requestNoticeCnt: 0
      })
    })

    test('正常：解約申込中の場合', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = {
        userContext: 'NotLoggedIn',
        userRole: 'dummy'
      }
      request.user = {
        userId: '12345678-cb0b-48ad-857d-4b42a44ede13'
      }
      // DBからの正常なユーザデータの取得を想定する
      findOneSpy.mockReturnValue({
        dataValues: {
          userId: '12345678-cb0b-48ad-857d-4b42a44ede13',
          tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
          userRole: 'a6a3edcd-00d9-427c-bf03-4ef0112ba16d',
          appVersion: '0.0.1',
          refreshToken: 'dummyRefreshToken',
          subRefreshToken: null,
          userStatus: 0,
          lastRefreshedAt: null,
          createdAt: '2021-01-25T08:45:49.803Z',
          updatedAt: '2021-01-25T08:45:49.803Z'
        }
      })
      findOneSpyContracts.mockReturnValue({
        dataValues: {
          contractId: '87654321-cb0b-48ad-857d-4b42a44ede13',
          tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
          numberN: '0000011111',
          contractStatus: '30',
          deleteFlag: false,
          createdAt: '2021-01-25T08:45:49.803Z',
          updatedAt: '2021-01-25T08:45:49.803Z'
        }
      })

      // 試験実施
      await portal.cbGetIndex(request, response, next)

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
      request.user = {
        userId: '12345678-cb0b-48ad-857d-4b42a44ede13'
      }
      // DBからの正常なユーザデータの取得を想定する
      findOneSpy.mockReturnValue({
        dataValues: {
          userId: '12345678-cb0b-48ad-857d-4b42a44ede13',
          tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
          userRole: 'a6a3edcd-00d9-427c-bf03-4ef0112ba16d',
          appVersion: '0.0.1',
          refreshToken: 'dummyRefreshToken',
          subRefreshToken: null,
          userStatus: 0,
          lastRefreshedAt: null,
          createdAt: '2021-01-25T08:45:49.803Z',
          updatedAt: '2021-01-25T08:45:49.803Z'
        }
      })
      findOneSpyContracts.mockReturnValue({
        dataValues: {
          contractId: '87654321-cb0b-48ad-857d-4b42a44ede13',
          tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
          numberN: '0000011111',
          contractStatus: '31',
          deleteFlag: false,
          createdAt: '2021-01-25T08:45:49.803Z',
          updatedAt: '2021-01-25T08:45:49.803Z'
        }
      })

      // 試験実施
      await portal.cbGetIndex(request, response, next)

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

    test('500エラー：requestのsession,userIdがnullの場合', async () => {
      // 準備
      // requestのsession,userIdにnullを入れる
      request.session = null
      request.user = {
        userId: null
      }

      // 試験実施
      await portal.cbGetIndex(request, response, next)

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
      request.user = {
        userId: '12345678-cb0b-48ad-857d-4b42a44ede13'
      }
      // DBからのユーザデータの取得ができなかった(null)場合を想定する
      findOneSpy.mockReturnValue(null)
      findOneSpyContracts.mockReturnValue({
        dataValues: {
          contractId: '87654321-cb0b-48ad-857d-4b42a44ede13',
          tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
          numberN: '0000011111',
          contractStatus: '31',
          deleteFlag: false,
          createdAt: '2021-01-25T08:45:49.803Z',
          updatedAt: '2021-01-25T08:45:49.803Z'
        }
      })

      // 試験実施
      await portal.cbGetIndex(request, response, next)

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
      request.user = {
        userId: '12345678-cb0b-48ad-857d-4b42a44ede13'
      }
      // DBからの契約情報が取得できなかった(null)場合を想定する
      findOneSpy.mockReturnValue({
        dataValues: {
          userId: '12345678-cb0b-48ad-857d-4b42a44ede13',
          tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
          userRole: 'a6a3edcd-00d9-427c-bf03-4ef0112ba16d',
          appVersion: '0.0.1',
          refreshToken: 'dummyRefreshToken',
          subRefreshToken: null,
          userStatus: 0,
          lastRefreshedAt: null,
          createdAt: '2021-01-25T08:45:49.803Z',
          updatedAt: '2021-01-25T08:45:49.803Z'
        }
      })
      findOneSpyContracts.mockReturnValue(null)

      // 試験実施
      await portal.cbGetIndex(request, response, next)

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
      request.user = {
        userId: '12345678-cb0b-48ad-857d-4b42a44ede13'
      }

      findOneSpyContracts.mockReturnValue({
        dataValues: {
          contractId: '87654321-cb0b-48ad-857d-4b42a44ede13',
          tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
          numberN: '0000011111',
          contractStatus: '31',
          deleteFlag: false,
          createdAt: '2021-01-25T08:45:49.803Z',
          updatedAt: '2021-01-25T08:45:49.803Z'
        }
      })
      // DBからのユーザデータの取得でエラーが発生した場合を想定する
      findOneSpy.mockReturnValue(new Error('DB error mock'))

      // 試験実施
      await portal.cbGetIndex(request, response, next)

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

    test('500エラー：契約DBエラーの場合', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = {
        userContext: 'NotLoggedIn',
        userRole: 'dummy'
      }
      request.user = {
        userId: '12345678-cb0b-48ad-857d-4b42a44ede13'
      }

      findOneSpy.mockReturnValue({
        dataValues: {
          userId: '12345678-cb0b-48ad-857d-4b42a44ede13',
          tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
          userRole: 'a6a3edcd-00d9-427c-bf03-4ef0112ba16d',
          appVersion: '0.0.1',
          refreshToken: 'dummyRefreshToken',
          subRefreshToken: null,
          userStatus: 0,
          lastRefreshedAt: null,
          createdAt: '2021-01-25T08:45:49.803Z',
          updatedAt: '2021-01-25T08:45:49.803Z'
        }
      })

      // DBからの契約情報取得でエラーが発生した場合を想定する
      findOneSpyContracts.mockReturnValue(new Error('DB error mock'))

      // 試験実施
      await portal.cbGetIndex(request, response, next)

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

    test('404エラー：DBから取得したユーザのuserStatusが0以外の場合', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = {
        userContext: 'NotLoggedIn',
        userRole: 'dummy'
      }
      request.user = {
        userId: '12345678-cb0b-48ad-857d-4b42a44ede13'
      }
      // DBから取得したユーザデータのuserStatusが0以外の場合を想定する
      findOneSpy.mockReturnValue({
        dataValues: {
          userId: '12345678-cb0b-48ad-857d-4b42a44ede13',
          tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
          userRole: 'a6a3edcd-00d9-427c-bf03-4ef0112ba16d',
          appVersion: '0.0.1',
          refreshToken: 'dummyRefreshToken',
          subRefreshToken: null,
          userStatus: 1,
          lastRefreshedAt: null,
          createdAt: '2021-01-25T08:45:49.803Z',
          updatedAt: '2021-01-25T08:45:49.803Z'
        }
      })
      // 試験実施
      await portal.cbGetIndex(request, response, next)

      // 期待結果
      // 404エラーがエラーハンドリング「される」
      expect(next).toHaveBeenCalledWith(error404)
      // 500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(500))

      // userContextがLoggedInになって「いない」
      expect(request.session?.userContext).not.toBe('LoggedIn')
      // session.userRoleが初期値のままになっている
      expect(request.session?.userRole).toBe('dummy')
      // response.renderが呼ばれ「ない」
      expect(response.render).not.toHaveBeenCalled()
    })

    test('準正常:RSSエラーが発生', async () => {
      // 準備
      // 会員サイト開発により追加
      const memberSiteCoopSessionDto = new MemberSiteSessionDto()
      memberSiteCoopSessionDto.memberSiteFlg = true
      // 会員サイト開発により追加

      // requestのsession,userIdに正常値を入れる
      request.session = {
        userContext: 'NotLoggedIn',
        userRole: 'dummy',
        memberSiteCoopSession: memberSiteCoopSessionDto // 会員サイト開発により追加
      }
      request.user = {
        userId: '12345678-cb0b-48ad-857d-4b42a44ede13'
      }
      // DBからの正常なユーザデータの取得を想定する
      findOneSpy.mockReturnValue({
        dataValues: {
          userId: '12345678-cb0b-48ad-857d-4b42a44ede13',
          tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
          userRole: 'a6a3edcd-00d9-427c-bf03-4ef0112ba16d',
          appVersion: '0.0.1',
          refreshToken: 'dummyRefreshToken',
          subRefreshToken: null,
          userStatus: 0,
          lastRefreshedAt: null,
          createdAt: '2021-01-25T08:45:49.803Z',
          updatedAt: '2021-01-25T08:45:49.803Z'
        }
      })
      findOneSpyContracts.mockReturnValue({
        dataValues: {
          contractId: '87654321-cb0b-48ad-857d-4b42a44ede13',
          tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
          numberN: '0000011111',
          contractStatus: '10',
          deleteFlag: false,
          createdAt: '2021-01-25T08:45:49.803Z',
          updatedAt: '2021-01-25T08:45:49.803Z'
        }
      })

      // お知らせ取得
      const refusedError = new Error('connect ECONNREFUSED 127.0.0.1:443')
      parseUrlSpy.mockImplementationOnce(async () => {
        throw refusedError
      })
      parseUrlSpy.mockImplementationOnce(async () => {
        return refusedError
      })

      // CSRF対策
      const dummyTokne = 'testCsrfToken'
      request.csrfToken = jest.fn(() => {
        return dummyTokne
      })

      requestApprovalModelFindAllSpy.mockReturnValueOnce(resultofRequestApprovals)
      approvalInboxControllerHasPowerOfEditingSpy.mockReturnValue(false)

      // 試験実施
      await portal.cbGetIndex(request, response, next)

      // 期待結果
      // 404，500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(500))
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
      expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
      // response.renderでportalが呼ばれ「る」
      expect(response.render).toHaveBeenCalledWith('portal', {
        constructDataArr: [{ message: '接続エラーが発生しました。' }],
        constructDataArrSize: 0,
        newsDataArr: [{ message: '接続エラーが発生しました。' }],
        newsDataArrSize: 0,
        title: 'ポータル',
        tenantId: request.user.tenantId,
        userRole: request.session.userRole,
        numberN: '0000011111',
        TS_HOST: process.env.TS_HOST,
        memberSiteFlg: memberSiteCoopSessionDto.memberSiteFlg /* 会員サイト開発により追加 */,
        csrfToken: dummyTokne /* 会員サイト開発により追加 */,
        rejectedNoticeCnt: 0,
        requestNoticeCnt: 0
      })
    })
  })
})
