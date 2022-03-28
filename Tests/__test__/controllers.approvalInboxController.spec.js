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
const TradeshiftDTO = require('../../Application/DTO/TradeshiftDTO')
const UserAccounts = require('../../Application/DTO/VO/UserAccounts')

// アクセストークンの用意
const accessToken = 'dummy-access-token'
const refreshToken = 'dummy-refresh-token'
const contract = 'dummy'
const invoiceId = 'dummy'
const tenant = 'dummy-tennant'

const ApprovalData1 = require('../mockDB/Approval_Table1')
const ApprovalData2 = require('../mockDB/Approval_Table2')
const ApprovalData3 = require('../mockDB/Approval_Table3')

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
  journalizeInvoiceFindAllSpy,
  tradeshiftDTOSpy,
  userAccountsGetNameSpy
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
    tradeshiftDTOSpy = jest.spyOn(TradeshiftDTO.prototype, 'findUser')
    userAccountsGetNameSpy = jest.spyOn(UserAccounts.prototype, 'getName')
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
    tradeshiftDTOSpy.mockRestore()
    userAccountsGetNameSpy.mockRestore()
  })

  describe('getRequestApproval', () => {
    test('正常：支払依頼取得ステータス：10', async () => {
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
        status: '10',
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
              id: 'dummyUserUUID'
            },
            contractId: 'dummy',
            message: null,
            next: 'c08ddssf-c305-455f-89f9-42b53614cb0e',
            prev: null,
            request: '221559d0-53aa-44a2-ab29-0c4a6cb02bde',
            status: '10',
            getName: function () {
              return 'test1'
            }
          }
        ],

        prevUser: {
          message: 'dummyData',
          name: 'test2'
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
        status: '10',
        message: 'dummyData',
        create: new Date(),
        isSaved: true
      })

      approvalFineOne.mockReturnValue(ApprovalData1[0])
      approverControllerGetApprover.mockReturnValue(expectGetApprover)
      requestApprovalFindOne.mockReturnValue(expectRequestApproval)
      approverControllerGetApproveRoute.mockReturnValue(expectGetApproveRoute)
      tradeshiftDTOSpy.mockReturnValue({
        users: [
          {
            firstName: 'a',
            lastName: 'b',
            companyName: 'dummyRouteName',
            email: 'dummyCount',
            id: 'dummyUserUUID'
          }
        ],
        getName: function () {
          return 'test2'
        }
      })
      TradeshiftDTO.prototype.setUserAccounts('../../Application/DTO/VO/UserAccounts')
      userAccountsGetNameSpy.mockReturnValue('test')

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
      expect(result.prevUser).toEqual(expectResult.prevUser)
    })

    test('正常：支払依頼取得ステータス：11', async () => {
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
              id: 'dummyUserUUID'
            },
            contractId: 'dummy',
            message: null,
            next: 'c08ddssf-c305-455f-89f9-42b53614cb0e',
            prev: null,
            request: '221559d0-53aa-44a2-ab29-0c4a6cb02bde',
            status: '11',
            getName: function () {
              return 'test1'
            }
          }
        ],

        prevUser: {
          message: 'k',
          name: 'test2'
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

      approvalFineOne.mockReturnValue(ApprovalData1[0])
      approverControllerGetApprover.mockReturnValue(expectGetApprover)
      requestApprovalFindOne.mockReturnValue(expectRequestApproval)
      approverControllerGetApproveRoute.mockReturnValue(expectGetApproveRoute)
      tradeshiftDTOSpy.mockReturnValue({
        users: [
          {
            firstName: 'a',
            lastName: 'b',
            companyName: 'dummyRouteName',
            email: 'dummyCount',
            id: 'dummyUserUUID'
          }
        ],
        getName: function () {
          return 'test2'
        }
      })
      TradeshiftDTO.prototype.setUserAccounts('../../Application/DTO/VO/UserAccounts')
      userAccountsGetNameSpy.mockReturnValue('test')

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
      expect(result.prevUser).toEqual(expectResult.prevUser)
    })

    test('正常：承認者９人', async () => {
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

      approvalFineOne.mockReturnValue(ApprovalData3[0])
      approverControllerGetApprover.mockReturnValue(expectGetApprover)
      requestApprovalFindOne.mockReturnValue(expectRequestApproval)
      approverControllerGetApproveRoute.mockReturnValue(expectGetApproveRoute)
      tradeshiftDTOSpy.mockReturnValue({
        users: [
          {
            firstName: 'a',
            lastName: 'b',
            companyName: 'dummyRouteName',
            email: 'dummyCount',
            id: 'dummyUserUUID'
          }
        ],
        getName: function () {
          return 'test2'
        }
      })
      TradeshiftDTO.prototype.setUserAccounts('../../Application/DTO/VO/UserAccounts')
      userAccountsGetNameSpy.mockReturnValue('test')

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

    test('異常：ユーザ数が０の場合', async () => {
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

      approvalFineOne.mockReturnValue(ApprovalData2[0])
      approverControllerGetApprover.mockReturnValue(expectGetApprover)
      requestApprovalFindOne.mockReturnValue(expectRequestApproval)
      approverControllerGetApproveRoute.mockReturnValue(expectGetApproveRoute)
      tradeshiftDTOSpy.mockReturnValue({
        users: [
          {
            firstName: 'a',
            lastName: 'b',
            companyName: 'dummyRouteName',
            email: 'dummyCount',
            id: 'dummyUserUUID'
          }
        ],
        getName: function () {
          return 'test2'
        }
      })
      TradeshiftDTO.prototype.setUserAccounts('../../Application/DTO/VO/UserAccounts')
      userAccountsGetNameSpy.mockReturnValue('test')

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

      const expectApproval = {
        requestId: requestApproval.requestId,
        requestUserId: requestApproval.requester,
        approveStatus: requestApproval.status,
        approveRouteN: 'UTテスト',
        approveUserLast: 'aa974511-8188-4022-bd86-45e251fd259e',
        approveUserCount: 1
      }
      requestApprovalFindOne.mockReturnValueOnce(RequestApproval.build({ ...requestApproval }))
      approvalFineOne.mockReturnValueOnce(Approval.build({ ...expectApproval }))
      const result = await approvalInboxController.hasPowerOfEditing(contractId, userId, requestApproval.requestId)

      // 結果確認
      expect(result).toBe(true)
    })

    test('準正常：requestApprovalがnullの場合', async () => {
      // パラメータ作成
      const contractId = '343b34d1-f4db-484e-b822-8e2ce9017d14'
      const userId = 'aa974511-8188-4022-bd86-45e251fd259e'
      const requestId = null
      const result = await approvalInboxController.hasPowerOfEditing(contractId, userId, requestId)

      // 結果確認
      expect(result).toBe(-1)
    })

    test('準正常：支払依頼承認権限がない場合（１ユーザー）', async () => {
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

      const expectApproval = {
        requestId: requestApproval.requestId,
        requestUserId: requestApproval.requester,
        approveStatus: requestApproval.status,
        approveRouteN: 'UTテスト',
        approveUserLast: 'c08ddcbf-c305-455f-89f9-42b53614cb0e',
        approveUserCount: 1
      }
      requestApprovalFindOne.mockReturnValueOnce(RequestApproval.build({ ...requestApproval }))
      approvalFineOne.mockReturnValueOnce(Approval.build({ ...expectApproval }))
      requestApprovalFindOne.mockReturnValueOnce(RequestApproval.build({ ...requestApproval }))
      const result = await approvalInboxController.hasPowerOfEditing(contractId, userId, requestApproval.requestId)
      // 結果確認
      expect(result).toBe(false)
    })

    test('準正常：支払依頼承認権限がない場合（11ユーザー）', async () => {
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

      const expectApproval = {
        requestId: requestApproval.requestId,
        requestUserId: requestApproval.requester,
        approveStatus: requestApproval.status,
        approveRouteN: 'UTテスト',
        approveUser1: 'a08ddcbf-c305-455f-89f9-42b53614cb0e',
        approveUser2: 'b08ddcbf-c305-455f-89f9-42b53614cb0e',
        approveUser3: 'c08ddcbf-c305-455f-89f9-42b53614cb0e',
        approveUser4: 'd08ddcbf-c305-455f-89f9-42b53614cb0e',
        approveUser5: 'e08ddcbf-c305-455f-89f9-42b53614cb0e',
        approveUser6: 'f08ddcbf-c305-455f-89f9-42b53614cb0e',
        approveUser7: 'g08ddcbf-c305-455f-89f9-42b53614cb0e',
        approveUser8: 'h08ddcbf-c305-455f-89f9-42b53614cb0e',
        approveUser9: 'i08ddcbf-c305-455f-89f9-42b53614cb0e',
        approveUser10: 'j08ddcbf-c305-455f-89f9-42b53614cb0e',
        approveUserLast: 'k08ddcbf-c305-455f-89f9-42b53614cb0e',
        approveUserCount: 11
      }
      requestApprovalFindOne.mockReturnValueOnce(RequestApproval.build({ ...requestApproval }))
      approvalFineOne.mockReturnValueOnce(Approval.build({ ...expectApproval }))
      requestApprovalFindOne.mockReturnValueOnce(RequestApproval.build({ ...requestApproval }))
      const result = await approvalInboxController.hasPowerOfEditing(contractId, userId, requestApproval.requestId)
      // 結果確認
      expect(result).toBe(false)
    })

    test('準正常：Approvalテーブルにデータがない場合', async () => {
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

      requestApprovalFindOne.mockReturnValueOnce(RequestApproval.build({ ...requestApproval }))
      approvalFineOne.mockReturnValueOnce(null)
      requestApprovalFindOne.mockReturnValueOnce(RequestApproval.build({ ...requestApproval }))
      const result = await approvalInboxController.hasPowerOfEditing(contractId, userId, requestApproval.requestId)
      // 結果確認
      expect(result).toBe(-1)
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

      const result = await approvalInboxController.hasPowerOfEditing(contractId, userId, requestApproval.requestId)

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
