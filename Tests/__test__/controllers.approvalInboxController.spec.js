'use strict'

const logger = require('../../Application/lib/logger')
const apiManager = require('../../Application/controllers/apiManager')
const userController = require('../../Application/controllers/userController')
const approverController = require('../../Application/controllers/approverController')
const approvalInboxController = require('../../Application/controllers/approvalInboxController')
const db = require('../../Application/models')
const ApproveRoute = db.ApproveRoute
const ApproveUser = db.ApproveUser
const RequestApproval = db.RequestApproval
const Approval = db.Approval
const ApproveStatus = db.ApproveStatus
const JournalizeInvoice = db.JournalizeInvoice
const validate = require('../../Application/lib/validate')

// アクセストークンの用意
const accessToken = 'dummy-access-token'
const refreshToken = 'dummy-refresh-token'
const contract = 'dummy'
const invoiceId = 'dummy'
const tenant = 'dummy-tennant'

let errorSpy, infoSpy, accessTradeshift
let approveRouteFindAll,
  approverouteCreate,
  approveGetApproveRoute,
  approveRouteUpdate,
  approveRouteFindOne,
  requestApprovalFindOne,
  approveStatusFindOne,
  userControllerFindOne,
  approverControllerGetApprover,
  approverControllerGetApproveRoute,
  approvalFineOne,
  journalizeInvoiceFindAllSpy
let approveUserCreate, approveUserFindOne
let validateIsUUID

describe('approvalInboxControllerのテスト', () => {
  beforeEach(() => {
    errorSpy = jest.spyOn(logger, 'error')
    infoSpy = jest.spyOn(logger, 'info')
    accessTradeshift = jest.spyOn(apiManager, 'accessTradeshift')
    approveRouteFindAll = jest.spyOn(ApproveRoute, 'findAll')
    approverouteCreate = jest.spyOn(ApproveRoute, 'create')
    approveRouteUpdate = jest.spyOn(ApproveRoute, 'update')
    approveUserCreate = jest.spyOn(ApproveUser, 'create')
    approveGetApproveRoute = jest.spyOn(ApproveRoute, 'getApproveRoute')
    approveUserFindOne = jest.spyOn(ApproveUser, 'findOne')
    ApproveUser.save = jest.fn()
    approveRouteFindOne = jest.spyOn(ApproveRoute, 'findOne')
    requestApprovalFindOne = jest.spyOn(RequestApproval, 'findOne')
    approveStatusFindOne = jest.spyOn(ApproveStatus, 'findOne')
    userControllerFindOne = jest.spyOn(userController, 'findOne')
    RequestApproval.save = jest.fn()
    validateIsUUID = jest.spyOn(validate, 'isUUID')
    approverControllerGetApprover = jest.spyOn(approverController, 'getApprover')
    approverControllerGetApproveRoute = jest.spyOn(approverController, 'getApproveRoute')
    approvalFineOne = jest.spyOn(Approval, 'findOne')
    journalizeInvoiceFindAllSpy = jest.spyOn(JournalizeInvoice, 'findAll')
  })

  afterEach(() => {
    errorSpy.mockRestore()
    infoSpy.mockRestore()
    accessTradeshift.mockRestore()
    approveRouteFindAll.mockRestore()
    approverouteCreate.mockRestore()
    approveUserCreate.mockRestore()
    approveGetApproveRoute.mockRestore()
    approveUserFindOne.mockRestore()
    approveRouteUpdate.mockRestore()
    approveRouteFindOne.mockRestore()
    requestApprovalFindOne.mockRestore()
    approveStatusFindOne.mockRestore()
    userControllerFindOne.mockRestore()
    validateIsUUID.mockRestore()
    approverControllerGetApprover.mockRestore()
    approverControllerGetApproveRoute.mockRestore()
    approvalFineOne.mockRestore()
    journalizeInvoiceFindAllSpy.mockRestore()
  })

  describe('getRequestApproval', () => {
    test('正常：承認依頼取得ステータス：10', async () => {
      // 準備
      const expectGetApproveRoute = {
        users: [
          {
            No: 1,
            approveRouteName: 'dummyRouteName',
            approverCount: 'dummyCount',
            id: 'dummyUserUUID'
          }
        ]
      }

      // 検索予想結果
      const expectResult = {
        requestId: '221559d0-53aa-44a2-ab29-0c4a6cb02bde',
        contractId: '343b34d1-f4db-484e-b822-8e2ce9017d14',
        invoiceId: '53607702-b94b-4a94-9459-6cf3acd65603',
        message: 'dummyData',
        status: '10',
        requester: 'dummyUserUUID',
        approveRoute: {
          users: [
            {
              No: 1,
              approveRouteName: 'dummyRouteName',
              approverCount: 'dummyCount',
              id: 'dummyUserUUID'
            }
          ]
        },
        approvals: [
          {
            approvalDate: null,
            approvalId: 'c08ddcbf-c305-455f-89f9-42b53614cb0e',
            approver: {
              No: 1,
              approveRouteName: 'dummyRouteName',
              approverCount: 'dummyCount',
              id: 'dummyUserUUID'
            },
            contractId: 'dummy',
            message: null,
            next: null,
            prev: null,
            request: '221559d0-53aa-44a2-ab29-0c4a6cb02bde',
            status: '10'
          }
        ],

        prevUser: {
          message: 'dummyData',
          name: 'dummyName'
        }
      }
      const expectGetApprover = [
        {
          id: 'dummyId',
          name: 'dummyName',
          email: 'dummyEmail'
        }
      ]
      const expectRequestApproval = RequestApproval.build({
        requestId: '221559d0-53aa-44a2-ab29-0c4a6cb02bde',
        contractId: '343b34d1-f4db-484e-b822-8e2ce9017d14',
        approveRouteId: '7fa489ad-4c50-43d6-8057-1279877c8ef5',
        invoiceId: '53607702-b94b-4a94-9459-6cf3acd65603',
        requester: 'dummyId',
        status: '10',
        message: 'dummyData',
        create: new Date(),
        isSaved: true
      })
      const approval = Approval.build({
        approvalId: '22155dd0-53aa-44a2-ab29-0c4a6cb02bde',
        requestId: '221559d0-53aa-44a2-ab29-0c4a6cb02bde',
        requestUserId: '221559d0-f4db-484e-b822-0c4a6cb02bde',
        approveRouteId: '7fa489ad-4c50-43d6-8057-1279877c8ef5',
        approveStatus: '80',
        approveRouteName: 'dummyId'
      })

      approvalFineOne.mockReturnValue(approval)
      approverControllerGetApprover.mockReturnValue(expectGetApprover)
      requestApprovalFindOne.mockReturnValue(expectRequestApproval)
      approverControllerGetApproveRoute.mockReturnValue(expectGetApproveRoute)

      // 試験実施
      const result = await approvalInboxController.getRequestApproval(
        accessToken,
        refreshToken,
        contract,
        invoiceId,
        tenant
      )

      // 期待結果
      // 想定したデータがReturnされていること
      expect(result.requestId).toEqual(expectResult.requestId)
      expect(result.contractId).toEqual(expectResult.contractId)
      expect(result.invoiceId).toEqual(expectResult.invoiceId)
      expect(result.message).toEqual(expectResult.message)
      expect(result.status).toEqual(expectResult.status)
      expect(result.approveRoute).toEqual(expectResult.approveRoute)
      expect(result.approvals[0].approvalDate).toEqual(expectResult.approvals[0].approvalDate)
      expect(result.approvals[0].approvalId).toEqual(expect.any(String))
      expect(result.approvals[0].approver).toEqual(expectResult.approvals[0].approver)
      expect(result.approvals[0].contractId).toEqual(expectResult.approvals[0].contractId)
      expect(result.approvals[0].next).toEqual(expectResult.approvals[0].next)
      expect(result.approvals[0].prev).toEqual(expectResult.approvals[0].prev)
      expect(result.approvals[0].status).toEqual(expectResult.approvals[0].status)
      expect(result.prevUser).toEqual(expectResult.prevUser)
    })

    test('正常：承認依頼取得ステータス：11', async () => {
      // 準備
      const expectGetApproveRoute = {
        users: [
          {
            No: 1,
            approveRouteName: 'dummyRouteName',
            approverCount: 'dummyCount',
            id: 'dummyUserUUID',
            getName: function () {
              return 'test1'
            }
          },
          {
            No: 2,
            approveRouteName: 'dummyRouteName2',
            approverCount: 'dummyCount2',
            id: 'dummyUserUUID2',
            getName: function () {
              return 'test2'
            }
          }
        ]
      }

      // 検索予想結果
      const expectResult = {
        requestId: '221559d0-53aa-44a2-ab29-0c4a6cb02bde',
        contractId: '343b34d1-f4db-484e-b822-8e2ce9017d14',
        invoiceId: '53607702-b94b-4a94-9459-6cf3acd65603',
        message: 'dummyData',
        status: '11',
        requester: 'dummyUserUUID',
        approveRoute: {
          users: [
            {
              No: 1,
              approveRouteName: 'dummyRouteName',
              approverCount: 'dummyCount',
              id: 'dummyUserUUID',
              getName: function () {
                return 'test1'
              }
            },
            {
              No: 2,
              approveRouteName: 'dummyRouteName2',
              approverCount: 'dummyCount2',
              id: 'dummyUserUUID2',
              getName: function () {
                return 'test2'
              }
            }
          ]
        },
        approvals: [
          {
            approvalDate: null,
            approvalId: 'c08ddcbf-c305-455f-89f9-42b53614cb0e',
            approver: {
              No: 1,
              approveRouteName: 'dummyRouteName',
              approverCount: 'dummyCount',
              id: 'dummyUserUUID',
              getName: function () {
                return 'test1'
              }
            },
            contractId: 'dummy',
            message: null,
            next: 'c08ddssf-c305-455f-89f9-42b53614cb0e',
            prev: null,
            request: '221559d0-53aa-44a2-ab29-0c4a6cb02bde',
            status: '11'
          },
          {
            approvalDate: null,
            approvalId: 'c08ddssf-c305-455f-89f9-42b53614cb0e',
            approver: {
              No: 2,
              approveRouteName: 'dummyRouteName2',
              approverCount: 'dummyCount2',
              id: 'dummyUserUUID2',
              getName: function () {
                return 'test2'
              }
            },
            contractId: 'dummy',
            message: null,
            next: null,
            prev: 'c08ddcbf-c305-455f-89f9-42b53614cb0e',
            request: '221559d0-53aa-44a2-ab29-0c4a6cb02bde',
            status: '11'
          }
        ],

        prevUser: {
          message: 'test',
          name: 'test1'
        }
      }
      const expectGetApprover = [
        {
          id: 'dummyId',
          name: 'dummyName',
          email: 'dummyEmail'
        },
        {
          id: 'dummyId2',
          name: 'dummyName2',
          email: 'dummyEmail2'
        }
      ]
      const expectRequestApproval = RequestApproval.build({
        requestId: '221559d0-53aa-44a2-ab29-0c4a6cb02bde',
        contractId: '343b34d1-f4db-484e-b822-8e2ce9017d14',
        approveRouteId: '7fa489ad-4c50-43d6-8057-1279877c8ef5',
        invoiceId: '53607702-b94b-4a94-9459-6cf3acd65603',
        requester: 'dummyId',
        status: '11',
        message: 'dummyData',
        create: new Date(),
        isSaved: true
      })
      const approval = Approval.build({
        approvalId: '22155dd0-53aa-44a2-ab29-0c4a6cb02bde',
        requestId: '221559d0-53aa-44a2-ab29-0c4a6cb02bde',
        requestUserId: '221559d0-f4db-484e-b822-0c4a6cb02bde',
        approveRouteId: '7fa489ad-4c50-43d6-8057-1279877c8ef5',
        approveStatus: '11',
        approveRouteName: 'dummyId',
        message1: 'test'
      })

      approvalFineOne.mockReturnValue(approval)
      approverControllerGetApprover.mockReturnValue(expectGetApprover)
      requestApprovalFindOne.mockReturnValue(expectRequestApproval)
      approverControllerGetApproveRoute.mockReturnValue(expectGetApproveRoute)

      // 試験実施
      const result = await approvalInboxController.getRequestApproval(
        accessToken,
        refreshToken,
        contract,
        invoiceId,
        tenant
      )

      // 期待結果
      // 想定したデータがReturnされていること
      expect(result.requestId).toEqual(expectResult.requestId)
      expect(result.contractId).toEqual(expectResult.contractId)
      expect(result.invoiceId).toEqual(expectResult.invoiceId)
      expect(result.message).toEqual(expectResult.message)
      expect(result.status).toEqual(expectResult.status)
      expect(JSON.stringify(result.approveRoute)).toEqual(JSON.stringify(expectResult.approveRoute))
      expect(result.approvals[0].approvalDate).toEqual(expectResult.approvals[0].approvalDate)
      expect(result.approvals[0].approvalId).toEqual(expect.any(String))
      expect(JSON.stringify(result.approvals[0].approver)).toEqual(JSON.stringify(expectResult.approvals[0].approver))
      expect(result.approvals[0].contractId).toEqual(expectResult.approvals[0].contractId)
      expect(result.approvals[0].status).toEqual(expectResult.approvals[0].status)
      expect(result.prevUser).toEqual(expectResult.prevUser)
    })

    test('正常：承認依頼取得(userのidとrequestApproval.requesterが間違っている場合)', async () => {
      // 準備
      const expectGetApproveRoute = {
        users: [
          {
            No: 1,
            approveRouteName: 'dummyRouteName',
            approverCount: 'dummyCount',
            uuid: 'dummyUUID'
          },
          {
            No: 2,
            approveRouteName: 'dummyRouteName2',
            approverCount: 'dummyCount2',
            uuid: 'dummyUserUUID33333'
          }
        ]
      }
      // 検索予想結果
      const expectResult = {
        requestId: '221559d0-53aa-44a2-ab29-0c4a6cb02bde',
        contractId: '343b34d1-f4db-484e-b822-8e2ce9017d14',
        invoiceId: '53607702-b94b-4a94-9459-6cf3acd65603',
        message: 'dummyData',
        status: '10',
        requester: 'dummyUserUUID',
        approveRoute: {
          users: [
            {
              No: 1,
              approveRouteName: 'dummyRouteName',
              approverCount: 'dummyCount',
              uuid: 'dummyUserUUID22222'
            },
            {
              No: 2,
              approveRouteName: 'dummyRouteName2',
              approverCount: 'dummyCount2',
              uuid: 'dummyUserUUID33333'
            }
          ]
        },
        approvals: [
          {
            approvalDate: null,
            approvalId: 'c08ddcbf-c305-455f-89f9-42b53614cb0e',
            approver: {
              No: 1,
              approveRouteName: 'dummyRouteName',
              approverCount: 'dummyCount',
              uuid: 'dummyUUID'
            },
            contractId: 'dummy',
            message: null,
            next: null,
            prev: null,
            request: '221559d0-53aa-44a2-ab29-0c4a6cb02bde',
            status: '10'
          }
        ],
        prevUser: {
          message: 'dummyData',
          name: 'dummyName'
        }
      }
      const expectGetApprover = [
        {
          id: 'dummyUUID',
          name: 'dummyName',
          email: 'dummyEmail'
        },
        {
          id: 'dummyId',
          name: 'dummyName',
          email: 'dummyEmail'
        }
      ]
      const expectRequestApproval = RequestApproval.build({
        requestId: '221559d0-53aa-44a2-ab29-0c4a6cb02bde',
        contractId: '343b34d1-f4db-484e-b822-8e2ce9017d14',
        approveRouteId: '7fa489ad-4c50-43d6-8057-1279877c8ef5',
        invoiceId: '53607702-b94b-4a94-9459-6cf3acd65603',
        requester: 'dummyId',
        status: '10',
        message: 'dummyData',
        create: new Date(),
        isSaved: true
      })
      const approval = Approval.build({
        approvalId: '22155dd0-53aa-44a2-ab29-0c4a6cb02bde',
        requestId: '221559d0-53aa-44a2-ab29-0c4a6cb02bde',
        requestUserId: '221559d0-f4db-484e-b822-0c4a6cb02bde',
        approveRouteId: '7fa489ad-4c50-43d6-8057-1279877c8ef5',
        approveStatus: '10',
        approveRouteName: 'dummyId',
        message1: 'dummyData'
      })
      approvalFineOne.mockReturnValue(approval)
      approverControllerGetApprover.mockReturnValue(expectGetApprover)
      requestApprovalFindOne.mockReturnValue(expectRequestApproval)
      approverControllerGetApproveRoute.mockReturnValue(expectGetApproveRoute)

      // 試験実施
      const result = await approvalInboxController.getRequestApproval(
        accessToken,
        refreshToken,
        contract,
        invoiceId,
        tenant
      )

      // 期待結果
      // 想定したデータがReturnされていること
      expect(result.requestId).toEqual(expectResult.requestId)
      expect(result.contractId).toEqual(expectResult.contractId)
      expect(result.invoiceId).toEqual(expectResult.invoiceId)
      expect(result.message).toEqual(expectResult.message)
      expect(result.status).toEqual(expectResult.status)
      expect(result.approveRoute.users[0].uuid).toEqual('dummyUUID')
      expect(result.approvals[0].approvalDate).toEqual(expectResult.approvals[0].approvalDate)
      expect(result.approvals[0].approvalId).not.toEqual(expectResult.approvals[0].approvalId)
      expect(result.approvals[0].approver).toEqual(expectResult.approvals[0].approver)
      expect(result.approvals[0].contractId).toEqual(expectResult.approvals[0].contractId)
      expect(result.approvals[0].next).not.toEqual(expectResult.approvals[0].next)
      expect(result.approvals[0].prev).toEqual(expectResult.approvals[0].prev)
      expect(result.approvals[0].request).not.toEqual(expectResult.approvals[0].request)
      expect(result.approvals[0].status).toEqual(expectResult.approvals[0].status)
      expect(result.prevUser).toEqual(expectResult.prevUser)
    })

    test('正常：承認依頼取得(request.statusテスト)', async () => {
      // 準備
      const expectGetApproveRoute = {
        users: [
          {
            No: 1,
            approveRouteName: 'dummyRouteName',
            approverCount: 'dummyCount',
            uuid: 'dummyUUID'
          },
          {
            No: 2,
            approveRouteName: 'dummyRouteName2',
            approverCount: 'dummyCount2',
            uuid: 'dummyUserUUID33333'
          }
        ]
      }
      // 検索予想結果
      const expectResult = {
        requestId: '221559d0-53aa-44a2-ab29-0c4a6cb02bde',
        contractId: '343b34d1-f4db-484e-b822-8e2ce9017d14',
        invoiceId: '53607702-b94b-4a94-9459-6cf3acd65603',
        message: 'dummyData',
        status: 10,
        requester: 'dummyUserUUID',
        approveRoute: {
          users: [
            {
              No: 1,
              approveRouteName: 'dummyRouteName',
              approverCount: 'dummyCount',
              uuid: 'dummyUserUUID22222'
            },
            {
              No: 2,
              approveRouteName: 'dummyRouteName2',
              approverCount: 'dummyCount2',
              uuid: 'dummyUserUUID33333'
            },
            {
              No: 3,
              approveRouteName: 'dummyRouteName3',
              approverCount: 'dummyCount3',
              uuid: 'dummyUserUUID44444'
            },
            {
              No: 4,
              approveRouteName: 'dummyRouteName4',
              approverCount: 'dummyCount4',
              uuid: 'dummyUserUUID44444'
            },
            {
              No: 5,
              approveRouteName: 'dummyRouteName5',
              approverCount: 'dummyCount5',
              uuid: 'dummyUserUUID55555'
            },
            {
              No: 6,
              approveRouteName: 'dummyRouteName6',
              approverCount: 'dummyCount6',
              uuid: 'dummyUserUUID6666'
            },
            {
              No: 7,
              approveRouteName: 'dummyRouteName7',
              approverCount: 'dummyCount7',
              uuid: 'dummyUserUUID77777'
            },
            {
              No: 8,
              approveRouteName: 'dummyRouteName8',
              approverCount: 'dummyCount8',
              uuid: 'dummyUserUUID88888'
            },
            {
              No: 9,
              approveRouteName: 'dummyRouteName9',
              approverCount: 'dummyCount9',
              uuid: 'dummyUserUUID99999'
            },
            {
              No: 10,
              approveRouteName: 'dummyRouteName10',
              approverCount: 'dummyCount10',
              uuid: 'dummyUserUUID101010'
            }
          ]
        },
        approvals: [
          {
            approvalDate: null,
            approvalId: 'c08ddcbf-c305-455f-89f9-42b53614cb0e',
            approver: {
              No: 1,
              approveRouteName: 'dummyRouteName',
              approverCount: 'dummyCount',
              uuid: 'dummyUUID'
            },
            contractId: 'dummy',
            message: null,
            next: {},
            prev: null,
            request: '221559d0-53aa-44a2-ab29-0c4a6cb02bde',
            status: 20
          }
        ],
        prevUser: {
          message: null,
          name: null
        }
      }
      const expectGetApprover = [
        {
          id: 'dummyUUID',
          name: 'dummyName',
          email: 'dummyEmail'
        },
        {
          id: 'dummyId',
          name: 'dummyName',
          email: 'dummyEmail'
        }
      ]
      const expectRequestApproval = RequestApproval.build({
        requestId: '221559d0-53aa-44a2-ab29-0c4a6cb02bde',
        contractId: '343b34d1-f4db-484e-b822-8e2ce9017d14',
        approveRouteId: '7fa489ad-4c50-43d6-8057-1279877c8ef5',
        invoiceId: '53607702-b94b-4a94-9459-6cf3acd65603',
        requester: 'dummyId',
        status: 10,
        message: 'dummyData',
        create: new Date(),
        isSaved: true
      })
      const approval = Approval.build({
        approvalId: '22155dd0-53aa-44a2-ab29-0c4a6cb02bde',
        requestId: '221559d0-53aa-44a2-ab29-0c4a6cb02bde',
        requestUserId: '221559d0-f4db-484e-b822-0c4a6cb02bde',
        approveRouteId: '7fa489ad-4c50-43d6-8057-1279877c8ef5',
        approveStatus: '80',
        approveRouteName: 'dummyId',
        message1: 'test'
      })

      approverControllerGetApprover.mockReturnValue(expectGetApprover)
      requestApprovalFindOne.mockReturnValue(expectRequestApproval)
      approverControllerGetApproveRoute.mockReturnValue(expectGetApproveRoute)
      approvalFineOne.mockReturnValue(approval)
      // 試験実施
      const result = await approvalInboxController.getRequestApproval(
        accessToken,
        refreshToken,
        contract,
        invoiceId,
        tenant
      )

      // 期待結果
      // 想定したデータがReturnされていること
      expect(result.status).toEqual(expectResult.status)
    })

    test('正常：承認依頼取得(request.statusテスト1)', async () => {
      // 準備
      const expectGetApproveRoute = {
        users: [
          {
            No: 1,
            approveRouteName: 'dummyRouteName',
            approverCount: 'dummyCount',
            uuid: 'dummyUserUUID22222'
          },
          {
            No: 2,
            approveRouteName: 'dummyRouteName2',
            approverCount: 'dummyCount2',
            uuid: 'dummyUserUUID33333'
          },
          {
            No: 3,
            approveRouteName: 'dummyRouteName3',
            approverCount: 'dummyCount3',
            uuid: 'dummyUserUUID44444'
          },
          {
            No: 4,
            approveRouteName: 'dummyRouteName4',
            approverCount: 'dummyCount4',
            uuid: 'dummyUserUUID44444'
          },
          {
            No: 5,
            approveRouteName: 'dummyRouteName5',
            approverCount: 'dummyCount5',
            uuid: 'dummyUserUUID55555'
          },
          {
            No: 6,
            approveRouteName: 'dummyRouteName6',
            approverCount: 'dummyCount6',
            uuid: 'dummyUserUUID6666'
          },
          {
            No: 7,
            approveRouteName: 'dummyRouteName7',
            approverCount: 'dummyCount7',
            uuid: 'dummyUserUUID77777'
          },
          {
            No: 8,
            approveRouteName: 'dummyRouteName8',
            approverCount: 'dummyCount8',
            uuid: 'dummyUserUUID88888'
          },
          {
            No: 9,
            approveRouteName: 'dummyRouteName9',
            approverCount: 'dummyCount9',
            uuid: 'dummyUserUUID99999'
          },
          {
            No: 10,
            approveRouteName: 'dummyRouteName10',
            approverCount: 'dummyCount10',
            uuid: 'dummyUserUUID101010'
          },
          {
            No: 11,
            approveRouteName: 'dummyRouteName11',
            approverCount: 'dummyCount11',
            uuid: 'dummyUserUUID111111'
          }
        ],
        approvals: [
          {
            message: 'message1'
          },
          {
            message: 'message2'
          },
          {
            message: 'message3'
          },
          {
            message: 'message4'
          },
          {
            message: 'message5'
          },
          {
            message: 'message6'
          },
          {
            message: 'message7'
          },
          {
            message: 'message8'
          },
          {
            message: 'message9'
          },
          {
            message: 'message10'
          },
          {
            message: 'message11'
          }
        ]
      }
      // 検索予想結果
      const expectResult = {
        requestId: '221559d0-53aa-44a2-ab29-0c4a6cb02bde',
        contractId: '343b34d1-f4db-484e-b822-8e2ce9017d14',
        invoiceId: '53607702-b94b-4a94-9459-6cf3acd65603',
        message: 'dummyData',
        status: '10',
        requester: 'dummyUserUUID',
        approveRoute: {
          users: [
            {
              No: 1,
              approveRouteName: 'dummyRouteName',
              approverCount: 'dummyCount',
              uuid: 'dummyUserUUID22222'
            },
            {
              No: 2,
              approveRouteName: 'dummyRouteName2',
              approverCount: 'dummyCount2',
              uuid: 'dummyUserUUID33333'
            },
            {
              No: 3,
              approveRouteName: 'dummyRouteName3',
              approverCount: 'dummyCount3',
              uuid: 'dummyUserUUID44444'
            },
            {
              No: 4,
              approveRouteName: 'dummyRouteName4',
              approverCount: 'dummyCount4',
              uuid: 'dummyUserUUID44444'
            },
            {
              No: 5,
              approveRouteName: 'dummyRouteName5',
              approverCount: 'dummyCount5',
              uuid: 'dummyUserUUID55555'
            },
            {
              No: 6,
              approveRouteName: 'dummyRouteName6',
              approverCount: 'dummyCount6',
              uuid: 'dummyUserUUID6666'
            },
            {
              No: 7,
              approveRouteName: 'dummyRouteName7',
              approverCount: 'dummyCount7',
              uuid: 'dummyUserUUID77777'
            },
            {
              No: 8,
              approveRouteName: 'dummyRouteName8',
              approverCount: 'dummyCount8',
              uuid: 'dummyUserUUID88888'
            },
            {
              No: 9,
              approveRouteName: 'dummyRouteName9',
              approverCount: 'dummyCount9',
              uuid: 'dummyUserUUID99999'
            },
            {
              No: 10,
              approveRouteName: 'dummyRouteName10',
              approverCount: 'dummyCount10',
              uuid: 'dummyUserUUID101010'
            },
            {
              No: 11,
              approveRouteName: 'dummyRouteName11',
              approverCount: 'dummyCount11',
              uuid: 'dummyUserUUID111111'
            }
          ]
        },
        approvals: [
          {
            approvalDate: null,
            approvalId: 'c08ddcbf-c305-455f-89f9-42b53614cb0e',
            approver: {
              No: 1,
              approveRouteName: 'dummyRouteName',
              approverCount: 'dummyCount',
              uuid: 'dummyUUID'
            },
            contractId: 'dummy',
            message: null,
            next: {},
            prev: null,
            request: '221559d0-53aa-44a2-ab29-0c4a6cb02bde',
            status: 11
          }
        ],
        prevUser: {
          message: null,
          name: null
        }
      }
      const expectGetApprover = [
        {
          id: 'dummyUUID',
          name: 'dummyName',
          email: 'dummyEmail'
        },
        {
          id: 'dummyId',
          name: 'dummyName',
          email: 'dummyEmail'
        }
      ]
      const expectRequestApproval = RequestApproval.build({
        requestId: '221559d0-53aa-44a2-ab29-0c4a6cb02bde',
        contractId: '343b34d1-f4db-484e-b822-8e2ce9017d14',
        approveRouteId: '7fa489ad-4c50-43d6-8057-1279877c8ef5',
        invoiceId: '53607702-b94b-4a94-9459-6cf3acd65603',
        requester: 'dummyId',
        status: '10',
        message: 'dummyData',
        create: new Date(),
        isSaved: true
      })
      const approval = Approval.build({
        approvalId: '22155dd0-53aa-44a2-ab29-0c4a6cb02bde',
        requestId: '221559d0-53aa-44a2-ab29-0c4a6cb02bde',
        requestUserId: '221559d0-f4db-484e-b822-0c4a6cb02bde',
        approveRouteId: '7fa489ad-4c50-43d6-8057-1279877c8ef5',
        approveStatus: '10',
        approveRouteName: 'dummyId'
      })

      approvalFineOne.mockReturnValue(approval)
      approverControllerGetApprover.mockReturnValue(expectGetApprover)
      requestApprovalFindOne.mockReturnValue(expectRequestApproval)
      approverControllerGetApproveRoute.mockReturnValue(expectGetApproveRoute)

      // 試験実施
      const result = await approvalInboxController.getRequestApproval(
        accessToken,
        refreshToken,
        contract,
        invoiceId,
        tenant
      )

      // 期待結果
      // 想定したデータがReturnされていること
      expect(result.status).toEqual(expectResult.status)
    })
    test('準正常:RequestApproval検索の結果がRequestApproval形式ではない場合', async () => {
      // 準備
      const expectGetApproveRoute = {
        users: [
          {
            No: 1,
            approveRouteName: 'dummyRouteName',
            approverCount: 'dummyCount',
            uuid: 'dummyUUID'
          }
        ]
      }

      const expectGetApprover = [
        {
          id: 'dummyId',
          name: 'dummyName',
          email: 'dummyEmail'
        }
      ]
      const expectRequestApproval = {}

      approverControllerGetApprover.mockReturnValue(expectGetApprover)
      requestApprovalFindOne.mockReturnValue(expectRequestApproval)
      approverControllerGetApproveRoute.mockReturnValue(expectGetApproveRoute)

      // 試験実施
      const result = await approvalInboxController.getRequestApproval(
        accessToken,
        refreshToken,
        contract,
        invoiceId,
        tenant
      )

      // 期待結果
      // 想定したデータがReturnされていること
      expect(result).toEqual(null)
    })

    test('準正常:DBエラー', async () => {
      // 準備
      const dbError = new Error('DB Conncetion Error')
      approverControllerGetApprover.mockImplementation(() => {
        throw dbError
      })
      // 試験実施
      const result = await approvalInboxController.getRequestApproval(
        accessToken,
        refreshToken,
        contract,
        invoiceId,
        tenant
      )

      // 期待結果
      // 想定したデータがReturnされていること
      expect(result).toEqual(null)
    })
  })

  describe('hasPowerOfEditing', () => {
    test('正常：ユーザーが編集権限を持っている場合', async () => {
      // パラメータ作成
      const userId = 'aa974511-8188-4022-bd86-45e251fd259e'
      const contractId = '343b34d1-f4db-484e-b822-8e2ce9017d14'
      const requestApproval = {
        requestId: '221559d0-53aa-44a2-ab29-0c4a6cb02bde',
        contractId: '343b34d1-f4db-484e-b822-8e2ce9017d14',
        invoiceId: '53607702-b94b-4a94-9459-6cf3acd65603',
        message: 'dummyData',
        status: '10',
        requester: 'aa974511-8188-4022-bd86-45e251fd259e',
        approveRoute: {
          users: [
            {
              No: 1,
              approveRouteName: 'dummyRouteName',
              approverCount: 'dummyCount',
              id: 'aa974511-8188-4022-bd86-45e251fd259e'
            }
          ]
        },
        approvals: [
          {
            approvalDate: null,
            approvalId: 'c08ddcbf-c305-455f-89f9-42b53614cb0e',
            approver: {
              No: 1,
              approveRouteName: 'dummyRouteName',
              approverCount: 'dummyCount',
              Id: 'aa974511-8188-4022-bd86-45e251fd259e'
            },
            contractId: 'dummy',
            message: null,
            next: null,
            prev: null,
            request: [],
            status: '10'
          }
        ],

        prevUser: {
          message: null,
          name: null
        }
      }

      const result = await approvalInboxController.hasPowerOfEditing(contractId, userId, requestApproval)

      // 結果確認
      expect(result).toBe(true)
    })

    test('準正常：requestApprovalがnullの場合', async () => {
      // パラメータ作成
      const contractId = '343b34d1-f4db-484e-b822-8e2ce9017d14'
      const userId = 'aa974511-8188-4022-bd86-45e251fd259e'
      const requestApproval = null
      const result = await approvalInboxController.hasPowerOfEditing(contractId, userId, requestApproval)

      // 結果確認
      expect(result).toBe(-1)
    })

    test('準正常：DB検索の結果がrequestApprovalのapproveRouteのusersのidがUserIdと違い場合', async () => {
      // パラメータ作成
      const contractId = '343b34d1-f4db-484e-b822-8e2ce9017d14'
      const userId = 'aa974511-8188-4022-bd86-45e251fd259e'
      const requestApproval = {
        requestId: '221559d0-53aa-44a2-ab29-0c4a6cb02bde',
        contractId: '343b34d1-f4db-484e-b822-8e2ce9017d14',
        invoiceId: '53607702-b94b-4a94-9459-6cf3acd65603',
        requester: 'aa974511-8188-4022-bd86-45e251fd259e',
        message: 'dummyData',
        status: '10',
        approveRoute: {
          users: [
            {
              No: 1,
              approveRouteName: 'dummyRouteName',
              approverCount: 'dummyCount',
              id: 'dummyUUID'
            }
          ]
        },
        approvals: [
          {
            approvalDate: null,
            approvalId: 'c08ddcbf-c305-455f-89f9-42b53614cb0e',
            approver: {
              No: 1,
              approveRouteName: 'dummyRouteName',
              approverCount: 'dummyCount',
              Id: 'dummyUUID'
            },
            contractId: 'dummy',
            message: null,
            next: null,
            prev: null,
            request: [],
            status: '10'
          }
        ],
        prevUser: {
          message: null,
          name: null
        }
      }

      const result = await approvalInboxController.hasPowerOfEditing(contractId, userId, requestApproval)
      // 結果確認
      expect(result).toBe(false)
    })

    test('異常：DBエラーの場合', async () => {
      // パラメータ作成
      const contractId = '343b34d1-f4db-484e-b822-8e2ce9017d14'
      const userId = 'aa974511-8188-4022-bd86-45e251fd259e'
      const requestApproval = {
        requestId: '221559d0-53aa-44a2-ab29-0c4a6cb02bde',
        contractId: '343b34d1-f4db-484e-b822-8e2ce9017d14',
        invoiceId: '53607702-b94b-4a94-9459-6cf3acd65603',
        message: 'dummyData',
        status: '11',
        requester: 'aa974511-8188-4022-bd86-45e251fd259e',
        approveRoute: {
          users: [
            {
              No: 1,
              approveRouteName: 'dummyRouteName',
              approverCount: 'dummyCount',
              id: 'aa974511-8188-4022-bd86-45e251fd259e'
            }
          ]
        },
        approvals: [
          {
            approvalDate: null,
            approvalId: 'c08ddcbf-c305-455f-89f9-42b53614cb0e',
            approver: {
              No: 1,
              approveRouteName: 'dummyRouteName',
              approverCount: 'dummyCount',
              Id: 'dummyUUID'
            },
            contractId: 'dummy',
            message: null,
            next: null,
            prev: null,
            request: [],
            status: '10'
          }
        ],

        prevUser: {
          message: null,
          name: null
        }
      }

      const result = await approvalInboxController.hasPowerOfEditing(contractId, userId, requestApproval)

      // 結果確認
      expect(result).toBe(-1)
    })
  })

  describe('insertAndUpdateJournalizeInvoice', () => {
    const data = {
      lineNo: 1,
      lineNo1_lineAccountCode1_accountCode: '',
      lineNo1_lineAccountCode1_subAccountCode: '',
      lineNo1_lineAccountCode1_departmentCode: '',
      lineNo1_lineAccountCode1_input_amount: '1000'
    }
    test('正常', async () => {
      const contractId = '343b34d1-f4db-484e-b822-8e2ce9017d14'
      const invoiceId = '3064665f-a90a-5f2e-a9e1-d59988ef3591'
      journalizeInvoiceFindAllSpy.mockReturnValueOnce([])
      const result = await approvalInboxController.insertAndUpdateJournalizeInvoice(contractId, invoiceId, data)
      expect(result.status).toBe(0)
    })
  })
})
