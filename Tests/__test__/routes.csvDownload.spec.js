'use strict'

jest.mock('../../Application/node_modules/express', () => {
  return require('jest-express')
})

const csvDownload = require('../../Application/routes/csvDownload')
const Request = require('jest-express').Request
const Response = require('jest-express').Response
const next = require('jest-express').Next
const helper = require('../../Application/routes/helpers/middleware')
const errorHelper = require('../../Application/routes/helpers/error')
const noticeHelper = require('../../Application/routes/helpers/notice')
const apiManager = require('../../Application/controllers/apiManager.js')
const userController = require('../../Application/controllers/userController.js')
const contractController = require('../../Application/controllers/contractController.js')
const tenantController = require('../../Application/controllers/tenantController')
const logger = require('../../Application/lib/logger.js')

let request, response, infoSpy
let userControllerFindOneSpy,
  contractControllerFindOneSpy,
  tenantControllerFindOneSpy,
  contractControllerFindContractSpyon

// 404エラー定義
const error404 = new Error('お探しのページは見つかりませんでした。')
error404.name = 'Not Found'
error404.status = 404

const user = [
  {
    // 契約ステータス：契約中
    userId: '388014b9-d667-4144-9cc4-5da420981438'
  },
  {
    // 契約ステータス：解約中
    userId: '3b3ff8ac-f544-4eee-a4b0-0ca7a0edacea'
  },
  {
    // ユーザステータス：0以外
    userId: '045fb5fd-7cd1-499e-9e1d-b3635b039d9f'
  }
]
const session = {
  userContext: 'NotLoggedIn',
  userRole: 'dummy'
}

const status = [
  '送信済み/受信済み',
  '無効',
  '受理済み/承認済み',
  '提出済み/承認待ち',
  '入金確認済み/送金済み',
  '却下済み',
  '内容確認中',
  '期日超過',
  '失敗',
  '送金済み/決済済み',
  '送信中',
  '接続承認待ち',
  'クリアランス中',
  '差替え済み',
  '完了',
  '回収済み'
]

const buyAndSell = ['すべて', '販売', '購入']

// モックテーブル定義
const Users = require('../mockDB/Users_Table')
const Tenants = require('../mockDB/Tenants_Table')
const Contracts = require('../mockDB/Contracts_Table')

describe('csvDownloadのテスト', () => {
  beforeEach(() => {
    request = new Request()
    response = new Response()
    infoSpy = jest.spyOn(logger, 'info')
    apiManager.accessTradeshift = require('../lib/apiManager')
    userControllerFindOneSpy = jest.spyOn(userController, 'findOne')
    contractControllerFindOneSpy = jest.spyOn(contractController, 'findOne')
    tenantControllerFindOneSpy = jest.spyOn(tenantController, 'findOne')
    contractControllerFindContractSpyon = jest.spyOn(contractController, 'findContract')
  })
  afterEach(() => {
    request.resetMocked()
    response.resetMocked()
    next.mockReset()
    infoSpy.mockRestore()
    userControllerFindOneSpy.mockRestore()
    contractControllerFindOneSpy.mockRestore()
    tenantControllerFindOneSpy.mockRestore()
    contractControllerFindContractSpyon.mockRestore()
  })

  describe('ルーティング', () => {
    test('csvDownloadのルーティングを確認', async () => {
      expect(csvDownload.router.get).toBeCalledWith('/', helper.isAuthenticated, csvDownload.cbGetIndex)
      expect(csvDownload.router.post).toBeCalledWith('/', helper.isAuthenticated, csvDownload.cbPostIndex)
    })
  })

  describe('コールバック:cbGetIndex', () => {
    test('正常', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[0] }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[0])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[0])

      tenantControllerFindOneSpy.mockReturnValue(Tenants[0])

      contractControllerFindContractSpyon.mockReturnValue(Contracts[0])
      // 試験実施
      await csvDownload.cbGetIndex(request, response, next)

      const today = new Date()
      const minissuedate = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate())
        .toISOString()
        .split('T')[0]
      const maxissuedate = today.toISOString().split('T')[0]

      const status = [
        'すべて',
        '送信済み/受信済み',
        '無効',
        '受理済み/承認済み',
        '提出済み/承認待ち',
        '入金確認済み/送金済み',
        '却下済み',
        '内容確認中',
        '期日超過',
        '失敗',
        '送金済み/決済済み',
        '送信中',
        '接続承認待ち',
        'クリアランス中',
        '差替え済み',
        '完了',
        '回収済み'
      ]

      // 期待結果
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
      expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
      // response.renderでcsvDownloadが呼ばれ「る」
      expect(response.render).toHaveBeenCalledWith('csvDownload', {
        title: '請求明細ダウンロード',
        minissuedate: minissuedate,
        maxissuedate: maxissuedate,
        status: status,
        buyAndSell: buyAndSell
      })
    })

    test('正常：解約申込中の場合', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[1] }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[1])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[1])

      tenantControllerFindOneSpy.mockReturnValue(Tenants[1])

      contractControllerFindContractSpyon.mockReturnValue(Contracts[1])
      // 試験実施
      await csvDownload.cbGetIndex(request, response, next)

      // 期待結果
      // 404，500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      // expect(next).not.toHaveBeenCalledWith(errorHelper.create(500))
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
      request.session = { ...session }
      request.user = { ...user[1] }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[1])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[1])

      tenantControllerFindOneSpy.mockReturnValue(Tenants[1])

      contractControllerFindContractSpyon.mockReturnValue(Contracts[1])
      // 試験実施
      await csvDownload.cbGetIndex(request, response, next)

      // 期待結果
      // 404，500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      // expect(next).not.toHaveBeenCalledWith(errorHelper.create(500))
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
      expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
      // 解約手続き中画面が表示「される」
      expect(next).toHaveBeenCalledWith(noticeHelper.create('cancelprocedure'))
    })

    test('500エラー：requestのsession,userIdがnullの場合', async () => {
      // 試験実施
      await csvDownload.cbGetIndex(request, response, next)

      // 期待結果
      // 404，500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)

      // 解約手続き中画面が表示「される」
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
    })

    test('500エラー：user検索の時、DBエラー', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[2] }

      // DBからの正常なユーザデータの取得を想定する
      const userDbError = new Error('User Table Error')
      userControllerFindOneSpy.mockReturnValue(userDbError)

      // 試験実施
      await csvDownload.cbGetIndex(request, response, next)

      // 期待結果
      // 404，500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)

      // 解約手続き中画面が表示「される」
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
    })

    test('500エラー：user.statusが0ではない場合', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[2] }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[2])

      // 試験実施
      await csvDownload.cbGetIndex(request, response, next)

      // 期待結果
      expect(next).toHaveBeenCalledWith(errorHelper.create(404))
    })

    test('500エラー：contracts検索の時、DBエラー', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[0] }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[0])
      const contractDbError = new Error('Contracts Table Error')
      tenantControllerFindOneSpy.mockReturnValue(Tenants[0])
      contractControllerFindOneSpy.mockReturnValue(contractDbError)

      // 試験実施
      await csvDownload.cbGetIndex(request, response, next)

      // 期待結果
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
    })

    test('500エラー：テナントと契約テーブル検索結果無', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[0] }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[0])
      contractControllerFindOneSpy.mockReturnValue(Contracts[0])
      tenantControllerFindOneSpy.mockReturnValue(null)
      contractControllerFindContractSpyon.mockReturnValue(null)

      // 試験実施
      await csvDownload.cbGetIndex(request, response, next)

      // 期待結果
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
    })
  })

  describe('コールバック:cbPostIndex', () => {
    test('正常:1件', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[0] }
      request.body = {
        invoiceNumber: 'A01001',
        buyAndSell: buyAndSell[0],
        minIssuedate: '2021-08-01',
        maxIssuedate: '2021-11-09',
        minDueDate: '',
        maxDueDate: '',
        minDeliveryDate: '',
        maxDeliveryDate: '',
        sentTo: 'nocompany1',
        sentBy: 'nocompany2'
      }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[0])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[0])

      tenantControllerFindOneSpy.mockReturnValue(Tenants[0])

      contractControllerFindContractSpyon.mockReturnValue(Contracts[0])
      // 試験実施
      await csvDownload.cbPostIndex(request, response, next)

      // 期待結果
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
      expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
      // responseのヘッダ
      const today = new Date().toISOString().split('T')[0]
      expect(response.setHeader().headers['Content-Disposition']).toContain('attachment; filename=')
      expect(response.setHeader().headers['Content-Disposition']).toContain(`${today}`)
      expect(response.setHeader().headers['Content-Disposition']).toContain('A01001')

      // responseのcsvファイル
      const csvHeader = response.setHeader().body.split('\r\n')[0]
      const csvBody = response.setHeader().body.split('\r\n')[1]
      const checkingData = require('../mockInvoice/invoice1')
      expect(csvHeader).toBe(
        `${String.fromCharCode(
          0xfeff
        )}発行日,請求書番号,テナントID,支払期日,納品日,備考,銀行名,支店名,科目,口座番号,口座名義,その他特記事項,明細-項目ID,明細-内容,明細-数量,明細-単位,明細-単価,明細-税（消費税／軽減税率／不課税／免税／非課税）,明細-備考`
      )
      // 発行日
      expect(csvBody).toContain(`${checkingData.IssueDate.value}`)
      // 請求書番号
      expect(csvBody).toContain(`${checkingData.ID.value}`)
      // テナントID
      expect(csvBody).toContain(`${checkingData.AccountingCustomerParty.Party.PartyIdentification[0].ID.value}`)
      // 支払期日
      expect(csvBody).toContain(`${checkingData.PaymentMeans[0]?.PaymentDueDate?.value ?? ''}`)
      // 納品日
      expect(csvBody).toContain(`${checkingData.Delivery[0].ActualDeliveryDate?.value}`)
      // 備考
      expect(csvBody).toContain(`${checkingData.AdditionalDocumentReference[0].ID.value}`)
      // 銀行名
      expect(csvBody).toContain(
        `${
          checkingData.PaymentMeans[0].PayeeFinancialAccount?.FinancialInstitutionBranch?.FinancialInstitution?.Name
            .value ?? ''
        }`
      )
      // 支店名
      expect(csvBody).toContain(
        `${checkingData.PaymentMeans[0].PayeeFinancialAccount?.FinancialInstitutionBranch?.Name.value ?? ''}`
      )
      // 科目
      expect(csvBody).toContain(
        `${checkingData.PaymentMeans[0].PayeeFinancialAccount?.AccountTypeCode?.value === 'General' ? '普通' : '当座'}`
      )
      // 口座番号
      expect(csvBody).toContain(`${checkingData.PaymentMeans[0].PayeeFinancialAccount?.ID?.value ?? ''}`)
      // 口座名義
      expect(csvBody).toContain(
        `${checkingData.PaymentMeans[0].PayeeFinancialAccount?.FinancialInstitutionBranch?.Name.value ?? ''}`
      )
      // その他特記事項
      expect(csvBody).toContain(`${checkingData.PaymentMeans[0].PayeeFinancialAccount?.Name?.value ?? ''}`)
      // 明細-項目ID
      expect(csvBody).toContain(`${checkingData.Note[0].value}`)
      // 明細-内容
      expect(csvBody).toContain(`${checkingData.InvoiceLine[0].Item.Description[0].value}`)
      // 明細-数量
      expect(csvBody).toContain(`${checkingData.InvoiceLine[0].InvoicedQuantity.value}`)
      // 明細-単位
      const bconCsvUnitcode = require('../../Application/lib/bconCsvUnitcode')
      const unitCodeKeys = Object.keys(bconCsvUnitcode)
      let resultOfUnitSearch
      unitCodeKeys.some((item) => {
        if (`${checkingData.InvoiceLine[0].InvoicedQuantity.unitCode}` === bconCsvUnitcode[item]) {
          resultOfUnitSearch = item
          return true
        }
        return false
      })
      expect(csvBody).toContain(`${resultOfUnitSearch}`)
      // 明細-単価
      expect(csvBody).toContain(`${checkingData.InvoiceLine[0].LineExtensionAmount.value}`)
      // 明細-税（消費税／軽減税率／不課税／免税／非課税）
      const taxCategory = {
        'JP 不課税 0%': '不課税',
        'JP 免税 0%': '免税',
        'JP 消費税 10%': '消費税',
        'JP 消費税(軽減税率) 8%': '軽減税率',
        'JP 非課税 0%': '非課税'
      }
      expect(csvBody).toContain(
        `${taxCategory[checkingData.InvoiceLine[0].TaxTotal[0].TaxSubtotal[0].TaxCategory.TaxScheme.Name.value]}`
      )
      // 明細-備考
      expect(csvBody).toContain(
        `${
          checkingData.InvoiceLine[0].DocumentReference ? checkingData.InvoiceLine[0].DocumentReference[0].ID.value : ''
        }`
      )
    })

    test('正常:受信企業あり・送信企業あり', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[0] }
      request.body = {
        invoiceNumber: 'A01001',
        buyAndSell: buyAndSell[0],
        minIssuedate: '2021-08-01',
        maxIssuedate: '2021-11-09',
        minDueDate: '',
        maxDueDate: '',
        minDeliveryDate: '',
        maxDeliveryDate: '',
        sentTo: ['f783be0e-e716-4eab-a7ec-5ce36b3c7b31'],
        sentBy: ['221559d0-53aa-44a2-ab29-0c4a6cb02bde']
      }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[0])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[0])

      tenantControllerFindOneSpy.mockReturnValue(Tenants[0])

      contractControllerFindContractSpyon.mockReturnValue(Contracts[0])
      // 試験実施
      await csvDownload.cbPostIndex(request, response, next)

      // 期待結果
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
      expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
      // responseのヘッダ
      const today = new Date().toISOString().split('T')[0]
      expect(response.setHeader().headers['Content-Disposition']).toContain('attachment; filename=')
      expect(response.setHeader().headers['Content-Disposition']).toContain(`${today}`)
      expect(response.setHeader().headers['Content-Disposition']).toContain('A01001')

      // responseのcsvファイル
      const csvHeader = response.setHeader().body.split('\r\n')[0]
      const csvBody = response.setHeader().body.split('\r\n')[1]
      const checkingData = require('../mockInvoice/invoice1')
      expect(csvHeader).toBe(
        `${String.fromCharCode(
          0xfeff
        )}発行日,請求書番号,テナントID,支払期日,納品日,備考,銀行名,支店名,科目,口座番号,口座名義,その他特記事項,明細-項目ID,明細-内容,明細-数量,明細-単位,明細-単価,明細-税（消費税／軽減税率／不課税／免税／非課税）,明細-備考`
      )
      // 発行日
      expect(csvBody).toContain(`${checkingData.IssueDate.value}`)
      // 請求書番号
      expect(csvBody).toContain(`${checkingData.ID.value}`)
      // テナントID
      expect(csvBody).toContain(`${checkingData.AccountingCustomerParty.Party.PartyIdentification[0].ID.value}`)
      // 支払期日
      expect(csvBody).toContain(`${checkingData.PaymentMeans[0]?.PaymentDueDate?.value ?? ''}`)
      // 納品日
      expect(csvBody).toContain(`${checkingData.Delivery[0].ActualDeliveryDate?.value}`)
      // 備考
      expect(csvBody).toContain(`${checkingData.AdditionalDocumentReference[0].ID.value}`)
      // 銀行名
      expect(csvBody).toContain(
        `${
          checkingData.PaymentMeans[0].PayeeFinancialAccount?.FinancialInstitutionBranch?.FinancialInstitution?.Name
            .value ?? ''
        }`
      )
      // 支店名
      expect(csvBody).toContain(
        `${checkingData.PaymentMeans[0].PayeeFinancialAccount?.FinancialInstitutionBranch?.Name.value ?? ''}`
      )
      // 科目
      expect(csvBody).toContain(
        `${checkingData.PaymentMeans[0].PayeeFinancialAccount?.AccountTypeCode?.value === 'General' ? '普通' : '当座'}`
      )
      // 口座番号
      expect(csvBody).toContain(`${checkingData.PaymentMeans[0].PayeeFinancialAccount?.ID?.value ?? ''}`)
      // 口座名義
      expect(csvBody).toContain(
        `${checkingData.PaymentMeans[0].PayeeFinancialAccount?.FinancialInstitutionBranch?.Name.value ?? ''}`
      )
      // その他特記事項
      expect(csvBody).toContain(`${checkingData.PaymentMeans[0].PayeeFinancialAccount?.Name?.value ?? ''}`)
      // 明細-項目ID
      expect(csvBody).toContain(`${checkingData.Note[0].value}`)
      // 明細-内容
      expect(csvBody).toContain(`${checkingData.InvoiceLine[0].Item.Description[0].value}`)
      // 明細-数量
      expect(csvBody).toContain(`${checkingData.InvoiceLine[0].InvoicedQuantity.value}`)
      // 明細-単位
      const bconCsvUnitcode = require('../../Application/lib/bconCsvUnitcode')
      const unitCodeKeys = Object.keys(bconCsvUnitcode)
      let resultOfUnitSearch
      unitCodeKeys.some((item) => {
        if (`${checkingData.InvoiceLine[0].InvoicedQuantity.unitCode}` === bconCsvUnitcode[item]) {
          resultOfUnitSearch = item
          return true
        }
        return false
      })
      expect(csvBody).toContain(`${resultOfUnitSearch}`)
      // 明細-単価
      expect(csvBody).toContain(`${checkingData.InvoiceLine[0].LineExtensionAmount.value}`)
      // 明細-税（消費税／軽減税率／不課税／免税／非課税）
      const taxCategory = {
        'JP 不課税 0%': '不課税',
        'JP 免税 0%': '免税',
        'JP 消費税 10%': '消費税',
        'JP 消費税(軽減税率) 8%': '軽減税率',
        'JP 非課税 0%': '非課税'
      }
      expect(csvBody).toContain(
        `${taxCategory[checkingData.InvoiceLine[0].TaxTotal[0].TaxSubtotal[0].TaxCategory.TaxScheme.Name.value]}`
      )
      // 明細-備考
      expect(csvBody).toContain(
        `${
          checkingData.InvoiceLine[0].DocumentReference ? checkingData.InvoiceLine[0].DocumentReference[0].ID.value : ''
        }`
      )
    })

    test('正常:受信企業あり・送信企業なし', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[0] }
      request.body = {
        invoiceNumber: 'A01001',
        buyAndSell: buyAndSell[0],
        minIssuedate: '2021-08-01',
        maxIssuedate: '2021-11-09',
        minDueDate: '',
        maxDueDate: '',
        minDeliveryDate: '',
        maxDeliveryDate: '',
        sentTo: ['test1'],
        sentBy: 'nocompany2'
      }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[0])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[0])

      tenantControllerFindOneSpy.mockReturnValue(Tenants[0])

      contractControllerFindContractSpyon.mockReturnValue(Contracts[0])
      // 試験実施
      await csvDownload.cbPostIndex(request, response, next)

      // 期待結果
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
      expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
      // responseのヘッダ
      const today = new Date().toISOString().split('T')[0]
      expect(response.setHeader().headers['Content-Disposition']).toContain('attachment; filename=')
      expect(response.setHeader().headers['Content-Disposition']).toContain(`${today}`)
      expect(response.setHeader().headers['Content-Disposition']).toContain('A01001')

      // responseのcsvファイル
      const csvHeader = response.setHeader().body.split('\r\n')[0]
      const csvBody = response.setHeader().body.split('\r\n')[1]
      const checkingData = require('../mockInvoice/invoice1')
      expect(csvHeader).toBe(
        `${String.fromCharCode(
          0xfeff
        )}発行日,請求書番号,テナントID,支払期日,納品日,備考,銀行名,支店名,科目,口座番号,口座名義,その他特記事項,明細-項目ID,明細-内容,明細-数量,明細-単位,明細-単価,明細-税（消費税／軽減税率／不課税／免税／非課税）,明細-備考`
      )
      // 発行日
      expect(csvBody).toContain(`${checkingData.IssueDate.value}`)
      // 請求書番号
      expect(csvBody).toContain(`${checkingData.ID.value}`)
      // テナントID
      expect(csvBody).toContain(`${checkingData.AccountingCustomerParty.Party.PartyIdentification[0].ID.value}`)
      // 支払期日
      expect(csvBody).toContain(`${checkingData.PaymentMeans[0]?.PaymentDueDate?.value ?? ''}`)
      // 納品日
      expect(csvBody).toContain(`${checkingData.Delivery[0].ActualDeliveryDate?.value}`)
      // 備考
      expect(csvBody).toContain(`${checkingData.AdditionalDocumentReference[0].ID.value}`)
      // 銀行名
      expect(csvBody).toContain(
        `${
          checkingData.PaymentMeans[0].PayeeFinancialAccount?.FinancialInstitutionBranch?.FinancialInstitution?.Name
            .value ?? ''
        }`
      )
      // 支店名
      expect(csvBody).toContain(
        `${checkingData.PaymentMeans[0].PayeeFinancialAccount?.FinancialInstitutionBranch?.Name.value ?? ''}`
      )
      // 科目
      expect(csvBody).toContain(
        `${checkingData.PaymentMeans[0].PayeeFinancialAccount?.AccountTypeCode?.value === 'General' ? '普通' : '当座'}`
      )
      // 口座番号
      expect(csvBody).toContain(`${checkingData.PaymentMeans[0].PayeeFinancialAccount?.ID?.value ?? ''}`)
      // 口座名義
      expect(csvBody).toContain(
        `${checkingData.PaymentMeans[0].PayeeFinancialAccount?.FinancialInstitutionBranch?.Name.value ?? ''}`
      )
      // その他特記事項
      expect(csvBody).toContain(`${checkingData.PaymentMeans[0].PayeeFinancialAccount?.Name?.value ?? ''}`)
      // 明細-項目ID
      expect(csvBody).toContain(`${checkingData.Note[0].value}`)
      // 明細-内容
      expect(csvBody).toContain(`${checkingData.InvoiceLine[0].Item.Description[0].value}`)
      // 明細-数量
      expect(csvBody).toContain(`${checkingData.InvoiceLine[0].InvoicedQuantity.value}`)
      // 明細-単位
      const bconCsvUnitcode = require('../../Application/lib/bconCsvUnitcode')
      const unitCodeKeys = Object.keys(bconCsvUnitcode)
      let resultOfUnitSearch
      unitCodeKeys.some((item) => {
        if (`${checkingData.InvoiceLine[0].InvoicedQuantity.unitCode}` === bconCsvUnitcode[item]) {
          resultOfUnitSearch = item
          return true
        }
        return false
      })
      expect(csvBody).toContain(`${resultOfUnitSearch}`)
      // 明細-単価
      expect(csvBody).toContain(`${checkingData.InvoiceLine[0].LineExtensionAmount.value}`)
      // 明細-税（消費税／軽減税率／不課税／免税／非課税）
      const taxCategory = {
        'JP 不課税 0%': '不課税',
        'JP 免税 0%': '免税',
        'JP 消費税 10%': '消費税',
        'JP 消費税(軽減税率) 8%': '軽減税率',
        'JP 非課税 0%': '非課税'
      }
      expect(csvBody).toContain(
        `${taxCategory[checkingData.InvoiceLine[0].TaxTotal[0].TaxSubtotal[0].TaxCategory.TaxScheme.Name.value]}`
      )
      // 明細-備考
      expect(csvBody).toContain(
        `${
          checkingData.InvoiceLine[0].DocumentReference ? checkingData.InvoiceLine[0].DocumentReference[0].ID.value : ''
        }`
      )
    })

    test('正常:受信企業なし・送信企業あり', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[0] }
      request.body = {
        invoiceNumber: 'A01001',
        buyAndSell: buyAndSell[0],
        minIssuedate: '2021-08-01',
        maxIssuedate: '2021-11-09',
        minDueDate: '',
        maxDueDate: '',
        minDeliveryDate: '',
        maxDeliveryDate: '',
        sentTo: 'nocompany1',
        sentBy: ['test1']
      }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[0])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[0])

      tenantControllerFindOneSpy.mockReturnValue(Tenants[0])

      contractControllerFindContractSpyon.mockReturnValue(Contracts[0])
      // 試験実施
      await csvDownload.cbPostIndex(request, response, next)

      // 期待結果
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
      expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
      // responseのヘッダ
      const today = new Date().toISOString().split('T')[0]
      expect(response.setHeader().headers['Content-Disposition']).toContain('attachment; filename=')
      expect(response.setHeader().headers['Content-Disposition']).toContain(`${today}`)
      expect(response.setHeader().headers['Content-Disposition']).toContain('A01001')

      // responseのcsvファイル
      const csvHeader = response.setHeader().body.split('\r\n')[0]
      const csvBody = response.setHeader().body.split('\r\n')[1]
      const checkingData = require('../mockInvoice/invoice1')
      expect(csvHeader).toBe(
        `${String.fromCharCode(
          0xfeff
        )}発行日,請求書番号,テナントID,支払期日,納品日,備考,銀行名,支店名,科目,口座番号,口座名義,その他特記事項,明細-項目ID,明細-内容,明細-数量,明細-単位,明細-単価,明細-税（消費税／軽減税率／不課税／免税／非課税）,明細-備考`
      )
      // 発行日
      expect(csvBody).toContain(`${checkingData.IssueDate.value}`)
      // 請求書番号
      expect(csvBody).toContain(`${checkingData.ID.value}`)
      // テナントID
      expect(csvBody).toContain(`${checkingData.AccountingCustomerParty.Party.PartyIdentification[0].ID.value}`)
      // 支払期日
      expect(csvBody).toContain(`${checkingData.PaymentMeans[0]?.PaymentDueDate?.value ?? ''}`)
      // 納品日
      expect(csvBody).toContain(`${checkingData.Delivery[0].ActualDeliveryDate?.value}`)
      // 備考
      expect(csvBody).toContain(`${checkingData.AdditionalDocumentReference[0].ID.value}`)
      // 銀行名
      expect(csvBody).toContain(
        `${
          checkingData.PaymentMeans[0].PayeeFinancialAccount?.FinancialInstitutionBranch?.FinancialInstitution?.Name
            .value ?? ''
        }`
      )
      // 支店名
      expect(csvBody).toContain(
        `${checkingData.PaymentMeans[0].PayeeFinancialAccount?.FinancialInstitutionBranch?.Name.value ?? ''}`
      )
      // 科目
      expect(csvBody).toContain(
        `${checkingData.PaymentMeans[0].PayeeFinancialAccount?.AccountTypeCode?.value === 'General' ? '普通' : '当座'}`
      )
      // 口座番号
      expect(csvBody).toContain(`${checkingData.PaymentMeans[0].PayeeFinancialAccount?.ID?.value ?? ''}`)
      // 口座名義
      expect(csvBody).toContain(
        `${checkingData.PaymentMeans[0].PayeeFinancialAccount?.FinancialInstitutionBranch?.Name.value ?? ''}`
      )
      // その他特記事項
      expect(csvBody).toContain(`${checkingData.PaymentMeans[0].PayeeFinancialAccount?.Name?.value ?? ''}`)
      // 明細-項目ID
      expect(csvBody).toContain(`${checkingData.Note[0].value}`)
      // 明細-内容
      expect(csvBody).toContain(`${checkingData.InvoiceLine[0].Item.Description[0].value}`)
      // 明細-数量
      expect(csvBody).toContain(`${checkingData.InvoiceLine[0].InvoicedQuantity.value}`)
      // 明細-単位
      const bconCsvUnitcode = require('../../Application/lib/bconCsvUnitcode')
      const unitCodeKeys = Object.keys(bconCsvUnitcode)
      let resultOfUnitSearch
      unitCodeKeys.some((item) => {
        if (`${checkingData.InvoiceLine[0].InvoicedQuantity.unitCode}` === bconCsvUnitcode[item]) {
          resultOfUnitSearch = item
          return true
        }
        return false
      })
      expect(csvBody).toContain(`${resultOfUnitSearch}`)
      // 明細-単価
      expect(csvBody).toContain(`${checkingData.InvoiceLine[0].LineExtensionAmount.value}`)
      // 明細-税（消費税／軽減税率／不課税／免税／非課税）
      const taxCategory = {
        'JP 不課税 0%': '不課税',
        'JP 免税 0%': '免税',
        'JP 消費税 10%': '消費税',
        'JP 消費税(軽減税率) 8%': '軽減税率',
        'JP 非課税 0%': '非課税'
      }
      expect(csvBody).toContain(
        `${taxCategory[checkingData.InvoiceLine[0].TaxTotal[0].TaxSubtotal[0].TaxCategory.TaxScheme.Name.value]}`
      )
      // 明細-備考
      expect(csvBody).toContain(
        `${
          checkingData.InvoiceLine[0].DocumentReference ? checkingData.InvoiceLine[0].DocumentReference[0].ID.value : ''
        }`
      )
    })

    test('正常:条件検索（ステータス - すべて）', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[0] }
      request.body = {
        invoiceNumber: 'A01001',
        status: 'すべて',
        buyAndSell: buyAndSell[0],
        minIssuedate: '2021-08-01',
        maxIssuedate: '2021-11-09',
        minDueDate: '',
        maxDueDate: '',
        minDeliveryDate: '',
        maxDeliveryDate: ''
      }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[0])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[0])

      tenantControllerFindOneSpy.mockReturnValue(Tenants[0])

      contractControllerFindContractSpyon.mockReturnValue(Contracts[0])
      // 試験実施
      await csvDownload.cbPostIndex(request, response, next)

      // 期待結果
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
      expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
      // responseのヘッダ
      const today = new Date().toISOString().split('T')[0]
      expect(response.setHeader().headers['Content-Disposition']).toContain('attachment; filename=')
      expect(response.setHeader().headers['Content-Disposition']).toContain(`${today}`)
      expect(response.setHeader().headers['Content-Disposition']).toContain('A01001')

      // responseのcsvファイル
      const csvHeader = response.setHeader().body.split('\r\n')[0]
      const csvBody = response.setHeader().body.split('\r\n')[1]
      const checkingData = require('../mockInvoice/invoice1')
      expect(csvHeader).toBe(
        `${String.fromCharCode(
          0xfeff
        )}発行日,請求書番号,テナントID,支払期日,納品日,備考,銀行名,支店名,科目,口座番号,口座名義,その他特記事項,明細-項目ID,明細-内容,明細-数量,明細-単位,明細-単価,明細-税（消費税／軽減税率／不課税／免税／非課税）,明細-備考`
      )
      // 発行日
      expect(csvBody).toContain(`${checkingData.IssueDate.value}`)
      // 請求書番号
      expect(csvBody).toContain(`${checkingData.ID.value}`)
      // テナントID
      expect(csvBody).toContain(`${checkingData.AccountingCustomerParty.Party.PartyIdentification[0].ID.value}`)
      // 支払期日
      expect(csvBody).toContain(`${checkingData.PaymentMeans[0]?.PaymentDueDate?.value ?? ''}`)
      // 納品日
      expect(csvBody).toContain(`${checkingData.Delivery[0].ActualDeliveryDate?.value}`)
      // 備考
      expect(csvBody).toContain(`${checkingData.AdditionalDocumentReference[0].ID.value}`)
      // 銀行名
      expect(csvBody).toContain(
        `${
          checkingData.PaymentMeans[0].PayeeFinancialAccount?.FinancialInstitutionBranch?.FinancialInstitution?.Name
            .value ?? ''
        }`
      )
      // 支店名
      expect(csvBody).toContain(
        `${checkingData.PaymentMeans[0].PayeeFinancialAccount?.FinancialInstitutionBranch?.Name.value ?? ''}`
      )
      // 科目
      expect(csvBody).toContain(
        `${checkingData.PaymentMeans[0].PayeeFinancialAccount?.AccountTypeCode?.value === 'General' ? '普通' : '当座'}`
      )
      // 口座番号
      expect(csvBody).toContain(`${checkingData.PaymentMeans[0].PayeeFinancialAccount?.ID?.value ?? ''}`)
      // 口座名義
      expect(csvBody).toContain(
        `${checkingData.PaymentMeans[0].PayeeFinancialAccount?.FinancialInstitutionBranch?.Name.value ?? ''}`
      )
      // その他特記事項
      expect(csvBody).toContain(`${checkingData.PaymentMeans[0].PayeeFinancialAccount?.Name?.value ?? ''}`)
      // 明細-項目ID
      expect(csvBody).toContain(`${checkingData.Note[0].value}`)
      // 明細-内容
      expect(csvBody).toContain(`${checkingData.InvoiceLine[0].Item.Description[0].value}`)
      // 明細-数量
      expect(csvBody).toContain(`${checkingData.InvoiceLine[0].InvoicedQuantity.value}`)
      // 明細-単位
      const bconCsvUnitcode = require('../../Application/lib/bconCsvUnitcode')
      const unitCodeKeys = Object.keys(bconCsvUnitcode)
      let resultOfUnitSearch
      unitCodeKeys.some((item) => {
        if (`${checkingData.InvoiceLine[0].InvoicedQuantity.unitCode}` === bconCsvUnitcode[item]) {
          resultOfUnitSearch = item
          return true
        }
        return false
      })
      expect(csvBody).toContain(`${resultOfUnitSearch}`)
      // 明細-単価
      expect(csvBody).toContain(`${checkingData.InvoiceLine[0].LineExtensionAmount.value}`)
      // 明細-税（消費税／軽減税率／不課税／免税／非課税）
      const taxCategory = {
        'JP 不課税 0%': '不課税',
        'JP 免税 0%': '免税',
        'JP 消費税 10%': '消費税',
        'JP 消費税(軽減税率) 8%': '軽減税率',
        'JP 非課税 0%': '非課税'
      }
      expect(csvBody).toContain(
        `${taxCategory[checkingData.InvoiceLine[0].TaxTotal[0].TaxSubtotal[0].TaxCategory.TaxScheme.Name.value]}`
      )
      // 明細-備考
      expect(csvBody).toContain(
        `${
          checkingData.InvoiceLine[0].DocumentReference ? checkingData.InvoiceLine[0].DocumentReference[0].ID.value : ''
        }`
      )
    })

    test('正常:条件検索（ステータス - 送信済み/受信済み）', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[0] }
      request.body = {
        invoiceNumber: 'A01001',
        status: status[0],
        buyAndSell: buyAndSell[0],
        minIssuedate: '2021-08-01',
        maxIssuedate: '2021-11-09',
        minDueDate: '',
        maxDueDate: '',
        minDeliveryDate: '',
        maxDeliveryDate: ''
      }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[0])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[0])

      tenantControllerFindOneSpy.mockReturnValue(Tenants[0])

      contractControllerFindContractSpyon.mockReturnValue(Contracts[0])
      // 試験実施
      await csvDownload.cbPostIndex(request, response, next)

      // 期待結果
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
      expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
      // responseのヘッダ
      const today = new Date().toISOString().split('T')[0]
      expect(response.setHeader().headers['Content-Disposition']).toContain('attachment; filename=')
      expect(response.setHeader().headers['Content-Disposition']).toContain(`${today}`)
      expect(response.setHeader().headers['Content-Disposition']).toContain('A01001')

      // responseのcsvファイル
      const csvHeader = response.setHeader().body.split('\r\n')[0]
      const csvBody = response.setHeader().body.split('\r\n')[1]
      const checkingData = require('../mockInvoice/invoice1')
      expect(csvHeader).toBe(
        `${String.fromCharCode(
          0xfeff
        )}発行日,請求書番号,テナントID,支払期日,納品日,備考,銀行名,支店名,科目,口座番号,口座名義,その他特記事項,明細-項目ID,明細-内容,明細-数量,明細-単位,明細-単価,明細-税（消費税／軽減税率／不課税／免税／非課税）,明細-備考`
      )
      // 発行日
      expect(csvBody).toContain(`${checkingData.IssueDate.value}`)
      // 請求書番号
      expect(csvBody).toContain(`${checkingData.ID.value}`)
      // テナントID
      expect(csvBody).toContain(`${checkingData.AccountingCustomerParty.Party.PartyIdentification[0].ID.value}`)
      // 支払期日
      expect(csvBody).toContain(`${checkingData.PaymentMeans[0]?.PaymentDueDate?.value ?? ''}`)
      // 納品日
      expect(csvBody).toContain(`${checkingData.Delivery[0].ActualDeliveryDate?.value}`)
      // 備考
      expect(csvBody).toContain(`${checkingData.AdditionalDocumentReference[0].ID.value}`)
      // 銀行名
      expect(csvBody).toContain(
        `${
          checkingData.PaymentMeans[0].PayeeFinancialAccount?.FinancialInstitutionBranch?.FinancialInstitution?.Name
            .value ?? ''
        }`
      )
      // 支店名
      expect(csvBody).toContain(
        `${checkingData.PaymentMeans[0].PayeeFinancialAccount?.FinancialInstitutionBranch?.Name.value ?? ''}`
      )
      // 科目
      expect(csvBody).toContain(
        `${checkingData.PaymentMeans[0].PayeeFinancialAccount?.AccountTypeCode?.value === 'General' ? '普通' : '当座'}`
      )
      // 口座番号
      expect(csvBody).toContain(`${checkingData.PaymentMeans[0].PayeeFinancialAccount?.ID?.value ?? ''}`)
      // 口座名義
      expect(csvBody).toContain(
        `${checkingData.PaymentMeans[0].PayeeFinancialAccount?.FinancialInstitutionBranch?.Name.value ?? ''}`
      )
      // その他特記事項
      expect(csvBody).toContain(`${checkingData.PaymentMeans[0].PayeeFinancialAccount?.Name?.value ?? ''}`)
      // 明細-項目ID
      expect(csvBody).toContain(`${checkingData.Note[0].value}`)
      // 明細-内容
      expect(csvBody).toContain(`${checkingData.InvoiceLine[0].Item.Description[0].value}`)
      // 明細-数量
      expect(csvBody).toContain(`${checkingData.InvoiceLine[0].InvoicedQuantity.value}`)
      // 明細-単位
      const bconCsvUnitcode = require('../../Application/lib/bconCsvUnitcode')
      const unitCodeKeys = Object.keys(bconCsvUnitcode)
      let resultOfUnitSearch
      unitCodeKeys.some((item) => {
        if (`${checkingData.InvoiceLine[0].InvoicedQuantity.unitCode}` === bconCsvUnitcode[item]) {
          resultOfUnitSearch = item
          return true
        }
        return false
      })
      expect(csvBody).toContain(`${resultOfUnitSearch}`)
      // 明細-単価
      expect(csvBody).toContain(`${checkingData.InvoiceLine[0].LineExtensionAmount.value}`)
      // 明細-税（消費税／軽減税率／不課税／免税／非課税）
      const taxCategory = {
        'JP 不課税 0%': '不課税',
        'JP 免税 0%': '免税',
        'JP 消費税 10%': '消費税',
        'JP 消費税(軽減税率) 8%': '軽減税率',
        'JP 非課税 0%': '非課税'
      }
      expect(csvBody).toContain(
        `${taxCategory[checkingData.InvoiceLine[0].TaxTotal[0].TaxSubtotal[0].TaxCategory.TaxScheme.Name.value]}`
      )
      // 明細-備考
      expect(csvBody).toContain(
        `${
          checkingData.InvoiceLine[0].DocumentReference ? checkingData.InvoiceLine[0].DocumentReference[0].ID.value : ''
        }`
      )
    })

    test('正常:条件検索（ステータス - 無効）', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[0] }
      request.body = {
        invoiceNumber: 'A01001',
        status: status[1],
        buyAndSell: buyAndSell[0],
        minIssuedate: '2021-08-01',
        maxIssuedate: '2021-11-09',
        minDueDate: '',
        maxDueDate: '',
        minDeliveryDate: '',
        maxDeliveryDate: ''
      }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[0])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[0])

      tenantControllerFindOneSpy.mockReturnValue(Tenants[0])

      contractControllerFindContractSpyon.mockReturnValue(Contracts[0])
      // 試験実施
      await csvDownload.cbPostIndex(request, response, next)

      // 期待結果
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
      expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
      // responseのヘッダ
      const today = new Date().toISOString().split('T')[0]
      expect(response.setHeader().headers['Content-Disposition']).toContain('attachment; filename=')
      expect(response.setHeader().headers['Content-Disposition']).toContain(`${today}`)
      expect(response.setHeader().headers['Content-Disposition']).toContain('A01001')

      // responseのcsvファイル
      const csvHeader = response.setHeader().body.split('\r\n')[0]
      const csvBody = response.setHeader().body.split('\r\n')[1]
      const checkingData = require('../mockInvoice/invoice1')
      expect(csvHeader).toBe(
        `${String.fromCharCode(
          0xfeff
        )}発行日,請求書番号,テナントID,支払期日,納品日,備考,銀行名,支店名,科目,口座番号,口座名義,その他特記事項,明細-項目ID,明細-内容,明細-数量,明細-単位,明細-単価,明細-税（消費税／軽減税率／不課税／免税／非課税）,明細-備考`
      )
      // 発行日
      expect(csvBody).toContain(`${checkingData.IssueDate.value}`)
      // 請求書番号
      expect(csvBody).toContain(`${checkingData.ID.value}`)
      // テナントID
      expect(csvBody).toContain(`${checkingData.AccountingCustomerParty.Party.PartyIdentification[0].ID.value}`)
      // 支払期日
      expect(csvBody).toContain(`${checkingData.PaymentMeans[0]?.PaymentDueDate?.value ?? ''}`)
      // 納品日
      expect(csvBody).toContain(`${checkingData.Delivery[0].ActualDeliveryDate?.value}`)
      // 備考
      expect(csvBody).toContain(`${checkingData.AdditionalDocumentReference[0].ID.value}`)
      // 銀行名
      expect(csvBody).toContain(
        `${
          checkingData.PaymentMeans[0].PayeeFinancialAccount?.FinancialInstitutionBranch?.FinancialInstitution?.Name
            .value ?? ''
        }`
      )
      // 支店名
      expect(csvBody).toContain(
        `${checkingData.PaymentMeans[0].PayeeFinancialAccount?.FinancialInstitutionBranch?.Name.value ?? ''}`
      )
      // 科目
      expect(csvBody).toContain(
        `${checkingData.PaymentMeans[0].PayeeFinancialAccount?.AccountTypeCode?.value === 'General' ? '普通' : '当座'}`
      )
      // 口座番号
      expect(csvBody).toContain(`${checkingData.PaymentMeans[0].PayeeFinancialAccount?.ID?.value ?? ''}`)
      // 口座名義
      expect(csvBody).toContain(
        `${checkingData.PaymentMeans[0].PayeeFinancialAccount?.FinancialInstitutionBranch?.Name.value ?? ''}`
      )
      // その他特記事項
      expect(csvBody).toContain(`${checkingData.PaymentMeans[0].PayeeFinancialAccount?.Name?.value ?? ''}`)
      // 明細-項目ID
      expect(csvBody).toContain(`${checkingData.Note[0].value}`)
      // 明細-内容
      expect(csvBody).toContain(`${checkingData.InvoiceLine[0].Item.Description[0].value}`)
      // 明細-数量
      expect(csvBody).toContain(`${checkingData.InvoiceLine[0].InvoicedQuantity.value}`)
      // 明細-単位
      const bconCsvUnitcode = require('../../Application/lib/bconCsvUnitcode')
      const unitCodeKeys = Object.keys(bconCsvUnitcode)
      let resultOfUnitSearch
      unitCodeKeys.some((item) => {
        if (`${checkingData.InvoiceLine[0].InvoicedQuantity.unitCode}` === bconCsvUnitcode[item]) {
          resultOfUnitSearch = item
          return true
        }
        return false
      })
      expect(csvBody).toContain(`${resultOfUnitSearch}`)
      // 明細-単価
      expect(csvBody).toContain(`${checkingData.InvoiceLine[0].LineExtensionAmount.value}`)
      // 明細-税（消費税／軽減税率／不課税／免税／非課税）
      const taxCategory = {
        'JP 不課税 0%': '不課税',
        'JP 免税 0%': '免税',
        'JP 消費税 10%': '消費税',
        'JP 消費税(軽減税率) 8%': '軽減税率',
        'JP 非課税 0%': '非課税'
      }
      expect(csvBody).toContain(
        `${taxCategory[checkingData.InvoiceLine[0].TaxTotal[0].TaxSubtotal[0].TaxCategory.TaxScheme.Name.value]}`
      )
      // 明細-備考
      expect(csvBody).toContain(
        `${
          checkingData.InvoiceLine[0].DocumentReference ? checkingData.InvoiceLine[0].DocumentReference[0].ID.value : ''
        }`
      )
    })

    test('正常:条件検索（ステータス - 受理済み/承認済み）', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[0] }
      request.body = {
        invoiceNumber: 'A01001',
        status: status[2],
        buyAndSell: buyAndSell[0],
        minIssuedate: '2021-08-01',
        maxIssuedate: '2021-11-09',
        minDueDate: '',
        maxDueDate: '',
        minDeliveryDate: '',
        maxDeliveryDate: ''
      }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[0])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[0])

      tenantControllerFindOneSpy.mockReturnValue(Tenants[0])

      contractControllerFindContractSpyon.mockReturnValue(Contracts[0])
      // 試験実施
      await csvDownload.cbPostIndex(request, response, next)

      // 期待結果
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
      expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
      // responseのヘッダ
      const today = new Date().toISOString().split('T')[0]
      expect(response.setHeader().headers['Content-Disposition']).toContain('attachment; filename=')
      expect(response.setHeader().headers['Content-Disposition']).toContain(`${today}`)
      expect(response.setHeader().headers['Content-Disposition']).toContain('A01001')

      // responseのcsvファイル
      const csvHeader = response.setHeader().body.split('\r\n')[0]
      const csvBody = response.setHeader().body.split('\r\n')[1]
      const checkingData = require('../mockInvoice/invoice1')
      expect(csvHeader).toBe(
        `${String.fromCharCode(
          0xfeff
        )}発行日,請求書番号,テナントID,支払期日,納品日,備考,銀行名,支店名,科目,口座番号,口座名義,その他特記事項,明細-項目ID,明細-内容,明細-数量,明細-単位,明細-単価,明細-税（消費税／軽減税率／不課税／免税／非課税）,明細-備考`
      )
      // 発行日
      expect(csvBody).toContain(`${checkingData.IssueDate.value}`)
      // 請求書番号
      expect(csvBody).toContain(`${checkingData.ID.value}`)
      // テナントID
      expect(csvBody).toContain(`${checkingData.AccountingCustomerParty.Party.PartyIdentification[0].ID.value}`)
      // 支払期日
      expect(csvBody).toContain(`${checkingData.PaymentMeans[0]?.PaymentDueDate?.value ?? ''}`)
      // 納品日
      expect(csvBody).toContain(`${checkingData.Delivery[0].ActualDeliveryDate?.value}`)
      // 備考
      expect(csvBody).toContain(`${checkingData.AdditionalDocumentReference[0].ID.value}`)
      // 銀行名
      expect(csvBody).toContain(
        `${
          checkingData.PaymentMeans[0].PayeeFinancialAccount?.FinancialInstitutionBranch?.FinancialInstitution?.Name
            .value ?? ''
        }`
      )
      // 支店名
      expect(csvBody).toContain(
        `${checkingData.PaymentMeans[0].PayeeFinancialAccount?.FinancialInstitutionBranch?.Name.value ?? ''}`
      )
      // 科目
      expect(csvBody).toContain(
        `${checkingData.PaymentMeans[0].PayeeFinancialAccount?.AccountTypeCode?.value === 'General' ? '普通' : '当座'}`
      )
      // 口座番号
      expect(csvBody).toContain(`${checkingData.PaymentMeans[0].PayeeFinancialAccount?.ID?.value ?? ''}`)
      // 口座名義
      expect(csvBody).toContain(
        `${checkingData.PaymentMeans[0].PayeeFinancialAccount?.FinancialInstitutionBranch?.Name.value ?? ''}`
      )
      // その他特記事項
      expect(csvBody).toContain(`${checkingData.PaymentMeans[0].PayeeFinancialAccount?.Name?.value ?? ''}`)
      // 明細-項目ID
      expect(csvBody).toContain(`${checkingData.Note[0].value}`)
      // 明細-内容
      expect(csvBody).toContain(`${checkingData.InvoiceLine[0].Item.Description[0].value}`)
      // 明細-数量
      expect(csvBody).toContain(`${checkingData.InvoiceLine[0].InvoicedQuantity.value}`)
      // 明細-単位
      const bconCsvUnitcode = require('../../Application/lib/bconCsvUnitcode')
      const unitCodeKeys = Object.keys(bconCsvUnitcode)
      let resultOfUnitSearch
      unitCodeKeys.some((item) => {
        if (`${checkingData.InvoiceLine[0].InvoicedQuantity.unitCode}` === bconCsvUnitcode[item]) {
          resultOfUnitSearch = item
          return true
        }
        return false
      })
      expect(csvBody).toContain(`${resultOfUnitSearch}`)
      // 明細-単価
      expect(csvBody).toContain(`${checkingData.InvoiceLine[0].LineExtensionAmount.value}`)
      // 明細-税（消費税／軽減税率／不課税／免税／非課税）
      const taxCategory = {
        'JP 不課税 0%': '不課税',
        'JP 免税 0%': '免税',
        'JP 消費税 10%': '消費税',
        'JP 消費税(軽減税率) 8%': '軽減税率',
        'JP 非課税 0%': '非課税'
      }
      expect(csvBody).toContain(
        `${taxCategory[checkingData.InvoiceLine[0].TaxTotal[0].TaxSubtotal[0].TaxCategory.TaxScheme.Name.value]}`
      )
      // 明細-備考
      expect(csvBody).toContain(
        `${
          checkingData.InvoiceLine[0].DocumentReference ? checkingData.InvoiceLine[0].DocumentReference[0].ID.value : ''
        }`
      )
    })

    test('正常:条件検索（ステータス - 提出済み/承認待ち）', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[0] }
      request.body = {
        invoiceNumber: 'A01001',
        status: status[3],
        buyAndSell: buyAndSell[0],
        minIssuedate: '2021-08-01',
        maxIssuedate: '2021-11-09',
        minDueDate: '',
        maxDueDate: '',
        minDeliveryDate: '',
        maxDeliveryDate: ''
      }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[0])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[0])

      tenantControllerFindOneSpy.mockReturnValue(Tenants[0])

      contractControllerFindContractSpyon.mockReturnValue(Contracts[0])
      // 試験実施
      await csvDownload.cbPostIndex(request, response, next)

      // 期待結果
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
      expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
      // responseのヘッダ
      const today = new Date().toISOString().split('T')[0]
      expect(response.setHeader().headers['Content-Disposition']).toContain('attachment; filename=')
      expect(response.setHeader().headers['Content-Disposition']).toContain(`${today}`)
      expect(response.setHeader().headers['Content-Disposition']).toContain('A01001')

      // responseのcsvファイル
      const csvHeader = response.setHeader().body.split('\r\n')[0]
      const csvBody = response.setHeader().body.split('\r\n')[1]
      const checkingData = require('../mockInvoice/invoice1')
      expect(csvHeader).toBe(
        `${String.fromCharCode(
          0xfeff
        )}発行日,請求書番号,テナントID,支払期日,納品日,備考,銀行名,支店名,科目,口座番号,口座名義,その他特記事項,明細-項目ID,明細-内容,明細-数量,明細-単位,明細-単価,明細-税（消費税／軽減税率／不課税／免税／非課税）,明細-備考`
      )
      // 発行日
      expect(csvBody).toContain(`${checkingData.IssueDate.value}`)
      // 請求書番号
      expect(csvBody).toContain(`${checkingData.ID.value}`)
      // テナントID
      expect(csvBody).toContain(`${checkingData.AccountingCustomerParty.Party.PartyIdentification[0].ID.value}`)
      // 支払期日
      expect(csvBody).toContain(`${checkingData.PaymentMeans[0]?.PaymentDueDate?.value ?? ''}`)
      // 納品日
      expect(csvBody).toContain(`${checkingData.Delivery[0].ActualDeliveryDate?.value}`)
      // 備考
      expect(csvBody).toContain(`${checkingData.AdditionalDocumentReference[0].ID.value}`)
      // 銀行名
      expect(csvBody).toContain(
        `${
          checkingData.PaymentMeans[0].PayeeFinancialAccount?.FinancialInstitutionBranch?.FinancialInstitution?.Name
            .value ?? ''
        }`
      )
      // 支店名
      expect(csvBody).toContain(
        `${checkingData.PaymentMeans[0].PayeeFinancialAccount?.FinancialInstitutionBranch?.Name.value ?? ''}`
      )
      // 科目
      expect(csvBody).toContain(
        `${checkingData.PaymentMeans[0].PayeeFinancialAccount?.AccountTypeCode?.value === 'General' ? '普通' : '当座'}`
      )
      // 口座番号
      expect(csvBody).toContain(`${checkingData.PaymentMeans[0].PayeeFinancialAccount?.ID?.value ?? ''}`)
      // 口座名義
      expect(csvBody).toContain(
        `${checkingData.PaymentMeans[0].PayeeFinancialAccount?.FinancialInstitutionBranch?.Name.value ?? ''}`
      )
      // その他特記事項
      expect(csvBody).toContain(`${checkingData.PaymentMeans[0].PayeeFinancialAccount?.Name?.value ?? ''}`)
      // 明細-項目ID
      expect(csvBody).toContain(`${checkingData.Note[0].value}`)
      // 明細-内容
      expect(csvBody).toContain(`${checkingData.InvoiceLine[0].Item.Description[0].value}`)
      // 明細-数量
      expect(csvBody).toContain(`${checkingData.InvoiceLine[0].InvoicedQuantity.value}`)
      // 明細-単位
      const bconCsvUnitcode = require('../../Application/lib/bconCsvUnitcode')
      const unitCodeKeys = Object.keys(bconCsvUnitcode)
      let resultOfUnitSearch
      unitCodeKeys.some((item) => {
        if (`${checkingData.InvoiceLine[0].InvoicedQuantity.unitCode}` === bconCsvUnitcode[item]) {
          resultOfUnitSearch = item
          return true
        }
        return false
      })
      expect(csvBody).toContain(`${resultOfUnitSearch}`)
      // 明細-単価
      expect(csvBody).toContain(`${checkingData.InvoiceLine[0].LineExtensionAmount.value}`)
      // 明細-税（消費税／軽減税率／不課税／免税／非課税）
      const taxCategory = {
        'JP 不課税 0%': '不課税',
        'JP 免税 0%': '免税',
        'JP 消費税 10%': '消費税',
        'JP 消費税(軽減税率) 8%': '軽減税率',
        'JP 非課税 0%': '非課税'
      }
      expect(csvBody).toContain(
        `${taxCategory[checkingData.InvoiceLine[0].TaxTotal[0].TaxSubtotal[0].TaxCategory.TaxScheme.Name.value]}`
      )
      // 明細-備考
      expect(csvBody).toContain(
        `${
          checkingData.InvoiceLine[0].DocumentReference ? checkingData.InvoiceLine[0].DocumentReference[0].ID.value : ''
        }`
      )
    })

    test('正常:条件検索（ステータス - 入金確認済み/送金済み）', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[0] }
      request.body = {
        invoiceNumber: 'A01001',
        status: status[4],
        buyAndSell: buyAndSell[0],
        minIssuedate: '2021-08-01',
        maxIssuedate: '2021-11-09',
        minDueDate: '',
        maxDueDate: '',
        minDeliveryDate: '',
        maxDeliveryDate: ''
      }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[0])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[0])

      tenantControllerFindOneSpy.mockReturnValue(Tenants[0])

      contractControllerFindContractSpyon.mockReturnValue(Contracts[0])
      // 試験実施
      await csvDownload.cbPostIndex(request, response, next)

      // 期待結果
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
      expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
      // responseのヘッダ
      const today = new Date().toISOString().split('T')[0]
      expect(response.setHeader().headers['Content-Disposition']).toContain('attachment; filename=')
      expect(response.setHeader().headers['Content-Disposition']).toContain(`${today}`)
      expect(response.setHeader().headers['Content-Disposition']).toContain('A01001')

      // responseのcsvファイル
      const csvHeader = response.setHeader().body.split('\r\n')[0]
      const csvBody = response.setHeader().body.split('\r\n')[1]
      const checkingData = require('../mockInvoice/invoice1')
      expect(csvHeader).toBe(
        `${String.fromCharCode(
          0xfeff
        )}発行日,請求書番号,テナントID,支払期日,納品日,備考,銀行名,支店名,科目,口座番号,口座名義,その他特記事項,明細-項目ID,明細-内容,明細-数量,明細-単位,明細-単価,明細-税（消費税／軽減税率／不課税／免税／非課税）,明細-備考`
      )
      // 発行日
      expect(csvBody).toContain(`${checkingData.IssueDate.value}`)
      // 請求書番号
      expect(csvBody).toContain(`${checkingData.ID.value}`)
      // テナントID
      expect(csvBody).toContain(`${checkingData.AccountingCustomerParty.Party.PartyIdentification[0].ID.value}`)
      // 支払期日
      expect(csvBody).toContain(`${checkingData.PaymentMeans[0]?.PaymentDueDate?.value ?? ''}`)
      // 納品日
      expect(csvBody).toContain(`${checkingData.Delivery[0].ActualDeliveryDate?.value}`)
      // 備考
      expect(csvBody).toContain(`${checkingData.AdditionalDocumentReference[0].ID.value}`)
      // 銀行名
      expect(csvBody).toContain(
        `${
          checkingData.PaymentMeans[0].PayeeFinancialAccount?.FinancialInstitutionBranch?.FinancialInstitution?.Name
            .value ?? ''
        }`
      )
      // 支店名
      expect(csvBody).toContain(
        `${checkingData.PaymentMeans[0].PayeeFinancialAccount?.FinancialInstitutionBranch?.Name.value ?? ''}`
      )
      // 科目
      expect(csvBody).toContain(
        `${checkingData.PaymentMeans[0].PayeeFinancialAccount?.AccountTypeCode?.value === 'General' ? '普通' : '当座'}`
      )
      // 口座番号
      expect(csvBody).toContain(`${checkingData.PaymentMeans[0].PayeeFinancialAccount?.ID?.value ?? ''}`)
      // 口座名義
      expect(csvBody).toContain(
        `${checkingData.PaymentMeans[0].PayeeFinancialAccount?.FinancialInstitutionBranch?.Name.value ?? ''}`
      )
      // その他特記事項
      expect(csvBody).toContain(`${checkingData.PaymentMeans[0].PayeeFinancialAccount?.Name?.value ?? ''}`)
      // 明細-項目ID
      expect(csvBody).toContain(`${checkingData.Note[0].value}`)
      // 明細-内容
      expect(csvBody).toContain(`${checkingData.InvoiceLine[0].Item.Description[0].value}`)
      // 明細-数量
      expect(csvBody).toContain(`${checkingData.InvoiceLine[0].InvoicedQuantity.value}`)
      // 明細-単位
      const bconCsvUnitcode = require('../../Application/lib/bconCsvUnitcode')
      const unitCodeKeys = Object.keys(bconCsvUnitcode)
      let resultOfUnitSearch
      unitCodeKeys.some((item) => {
        if (`${checkingData.InvoiceLine[0].InvoicedQuantity.unitCode}` === bconCsvUnitcode[item]) {
          resultOfUnitSearch = item
          return true
        }
        return false
      })
      expect(csvBody).toContain(`${resultOfUnitSearch}`)
      // 明細-単価
      expect(csvBody).toContain(`${checkingData.InvoiceLine[0].LineExtensionAmount.value}`)
      // 明細-税（消費税／軽減税率／不課税／免税／非課税）
      const taxCategory = {
        'JP 不課税 0%': '不課税',
        'JP 免税 0%': '免税',
        'JP 消費税 10%': '消費税',
        'JP 消費税(軽減税率) 8%': '軽減税率',
        'JP 非課税 0%': '非課税'
      }
      expect(csvBody).toContain(
        `${taxCategory[checkingData.InvoiceLine[0].TaxTotal[0].TaxSubtotal[0].TaxCategory.TaxScheme.Name.value]}`
      )
      // 明細-備考
      expect(csvBody).toContain(
        `${
          checkingData.InvoiceLine[0].DocumentReference ? checkingData.InvoiceLine[0].DocumentReference[0].ID.value : ''
        }`
      )
    })

    test('正常:条件検索（ステータス - 却下済み）', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[0] }
      request.body = {
        invoiceNumber: 'A01001',
        status: status[5],
        buyAndSell: buyAndSell[0],
        minIssuedate: '2021-08-01',
        maxIssuedate: '2021-11-09',
        minDueDate: '',
        maxDueDate: '',
        minDeliveryDate: '',
        maxDeliveryDate: ''
      }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[0])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[0])

      tenantControllerFindOneSpy.mockReturnValue(Tenants[0])

      contractControllerFindContractSpyon.mockReturnValue(Contracts[0])
      // 試験実施
      await csvDownload.cbPostIndex(request, response, next)

      // 期待結果
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
      expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
      // responseのヘッダ
      const today = new Date().toISOString().split('T')[0]
      expect(response.setHeader().headers['Content-Disposition']).toContain('attachment; filename=')
      expect(response.setHeader().headers['Content-Disposition']).toContain(`${today}`)
      expect(response.setHeader().headers['Content-Disposition']).toContain('A01001')

      // responseのcsvファイル
      const csvHeader = response.setHeader().body.split('\r\n')[0]
      const csvBody = response.setHeader().body.split('\r\n')[1]
      const checkingData = require('../mockInvoice/invoice1')
      expect(csvHeader).toBe(
        `${String.fromCharCode(
          0xfeff
        )}発行日,請求書番号,テナントID,支払期日,納品日,備考,銀行名,支店名,科目,口座番号,口座名義,その他特記事項,明細-項目ID,明細-内容,明細-数量,明細-単位,明細-単価,明細-税（消費税／軽減税率／不課税／免税／非課税）,明細-備考`
      )
      // 発行日
      expect(csvBody).toContain(`${checkingData.IssueDate.value}`)
      // 請求書番号
      expect(csvBody).toContain(`${checkingData.ID.value}`)
      // テナントID
      expect(csvBody).toContain(`${checkingData.AccountingCustomerParty.Party.PartyIdentification[0].ID.value}`)
      // 支払期日
      expect(csvBody).toContain(`${checkingData.PaymentMeans[0]?.PaymentDueDate?.value ?? ''}`)
      // 納品日
      expect(csvBody).toContain(`${checkingData.Delivery[0].ActualDeliveryDate?.value}`)
      // 備考
      expect(csvBody).toContain(`${checkingData.AdditionalDocumentReference[0].ID.value}`)
      // 銀行名
      expect(csvBody).toContain(
        `${
          checkingData.PaymentMeans[0].PayeeFinancialAccount?.FinancialInstitutionBranch?.FinancialInstitution?.Name
            .value ?? ''
        }`
      )
      // 支店名
      expect(csvBody).toContain(
        `${checkingData.PaymentMeans[0].PayeeFinancialAccount?.FinancialInstitutionBranch?.Name.value ?? ''}`
      )
      // 科目
      expect(csvBody).toContain(
        `${checkingData.PaymentMeans[0].PayeeFinancialAccount?.AccountTypeCode?.value === 'General' ? '普通' : '当座'}`
      )
      // 口座番号
      expect(csvBody).toContain(`${checkingData.PaymentMeans[0].PayeeFinancialAccount?.ID?.value ?? ''}`)
      // 口座名義
      expect(csvBody).toContain(
        `${checkingData.PaymentMeans[0].PayeeFinancialAccount?.FinancialInstitutionBranch?.Name.value ?? ''}`
      )
      // その他特記事項
      expect(csvBody).toContain(`${checkingData.PaymentMeans[0].PayeeFinancialAccount?.Name?.value ?? ''}`)
      // 明細-項目ID
      expect(csvBody).toContain(`${checkingData.Note[0].value}`)
      // 明細-内容
      expect(csvBody).toContain(`${checkingData.InvoiceLine[0].Item.Description[0].value}`)
      // 明細-数量
      expect(csvBody).toContain(`${checkingData.InvoiceLine[0].InvoicedQuantity.value}`)
      // 明細-単位
      const bconCsvUnitcode = require('../../Application/lib/bconCsvUnitcode')
      const unitCodeKeys = Object.keys(bconCsvUnitcode)
      let resultOfUnitSearch
      unitCodeKeys.some((item) => {
        if (`${checkingData.InvoiceLine[0].InvoicedQuantity.unitCode}` === bconCsvUnitcode[item]) {
          resultOfUnitSearch = item
          return true
        }
        return false
      })
      expect(csvBody).toContain(`${resultOfUnitSearch}`)
      // 明細-単価
      expect(csvBody).toContain(`${checkingData.InvoiceLine[0].LineExtensionAmount.value}`)
      // 明細-税（消費税／軽減税率／不課税／免税／非課税）
      const taxCategory = {
        'JP 不課税 0%': '不課税',
        'JP 免税 0%': '免税',
        'JP 消費税 10%': '消費税',
        'JP 消費税(軽減税率) 8%': '軽減税率',
        'JP 非課税 0%': '非課税'
      }
      expect(csvBody).toContain(
        `${taxCategory[checkingData.InvoiceLine[0].TaxTotal[0].TaxSubtotal[0].TaxCategory.TaxScheme.Name.value]}`
      )
      // 明細-備考
      expect(csvBody).toContain(
        `${
          checkingData.InvoiceLine[0].DocumentReference ? checkingData.InvoiceLine[0].DocumentReference[0].ID.value : ''
        }`
      )
    })

    test('正常:条件検索（ステータス - 内容確認中）', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[0] }
      request.body = {
        invoiceNumber: 'A01001',
        status: status[6],
        buyAndSell: buyAndSell[0],
        minIssuedate: '2021-08-01',
        maxIssuedate: '2021-11-09',
        minDueDate: '',
        maxDueDate: '',
        minDeliveryDate: '',
        maxDeliveryDate: ''
      }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[0])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[0])

      tenantControllerFindOneSpy.mockReturnValue(Tenants[0])

      contractControllerFindContractSpyon.mockReturnValue(Contracts[0])
      // 試験実施
      await csvDownload.cbPostIndex(request, response, next)

      // 期待結果
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
      expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
      // responseのヘッダ
      const today = new Date().toISOString().split('T')[0]
      expect(response.setHeader().headers['Content-Disposition']).toContain('attachment; filename=')
      expect(response.setHeader().headers['Content-Disposition']).toContain(`${today}`)
      expect(response.setHeader().headers['Content-Disposition']).toContain('A01001')

      // responseのcsvファイル
      const csvHeader = response.setHeader().body.split('\r\n')[0]
      const csvBody = response.setHeader().body.split('\r\n')[1]
      const checkingData = require('../mockInvoice/invoice1')
      expect(csvHeader).toBe(
        `${String.fromCharCode(
          0xfeff
        )}発行日,請求書番号,テナントID,支払期日,納品日,備考,銀行名,支店名,科目,口座番号,口座名義,その他特記事項,明細-項目ID,明細-内容,明細-数量,明細-単位,明細-単価,明細-税（消費税／軽減税率／不課税／免税／非課税）,明細-備考`
      )
      // 発行日
      expect(csvBody).toContain(`${checkingData.IssueDate.value}`)
      // 請求書番号
      expect(csvBody).toContain(`${checkingData.ID.value}`)
      // テナントID
      expect(csvBody).toContain(`${checkingData.AccountingCustomerParty.Party.PartyIdentification[0].ID.value}`)
      // 支払期日
      expect(csvBody).toContain(`${checkingData.PaymentMeans[0]?.PaymentDueDate?.value ?? ''}`)
      // 納品日
      expect(csvBody).toContain(`${checkingData.Delivery[0].ActualDeliveryDate?.value}`)
      // 備考
      expect(csvBody).toContain(`${checkingData.AdditionalDocumentReference[0].ID.value}`)
      // 銀行名
      expect(csvBody).toContain(
        `${
          checkingData.PaymentMeans[0].PayeeFinancialAccount?.FinancialInstitutionBranch?.FinancialInstitution?.Name
            .value ?? ''
        }`
      )
      // 支店名
      expect(csvBody).toContain(
        `${checkingData.PaymentMeans[0].PayeeFinancialAccount?.FinancialInstitutionBranch?.Name.value ?? ''}`
      )
      // 科目
      expect(csvBody).toContain(
        `${checkingData.PaymentMeans[0].PayeeFinancialAccount?.AccountTypeCode?.value === 'General' ? '普通' : '当座'}`
      )
      // 口座番号
      expect(csvBody).toContain(`${checkingData.PaymentMeans[0].PayeeFinancialAccount?.ID?.value ?? ''}`)
      // 口座名義
      expect(csvBody).toContain(
        `${checkingData.PaymentMeans[0].PayeeFinancialAccount?.FinancialInstitutionBranch?.Name.value ?? ''}`
      )
      // その他特記事項
      expect(csvBody).toContain(`${checkingData.PaymentMeans[0].PayeeFinancialAccount?.Name?.value ?? ''}`)
      // 明細-項目ID
      expect(csvBody).toContain(`${checkingData.Note[0].value}`)
      // 明細-内容
      expect(csvBody).toContain(`${checkingData.InvoiceLine[0].Item.Description[0].value}`)
      // 明細-数量
      expect(csvBody).toContain(`${checkingData.InvoiceLine[0].InvoicedQuantity.value}`)
      // 明細-単位
      const bconCsvUnitcode = require('../../Application/lib/bconCsvUnitcode')
      const unitCodeKeys = Object.keys(bconCsvUnitcode)
      let resultOfUnitSearch
      unitCodeKeys.some((item) => {
        if (`${checkingData.InvoiceLine[0].InvoicedQuantity.unitCode}` === bconCsvUnitcode[item]) {
          resultOfUnitSearch = item
          return true
        }
        return false
      })
      expect(csvBody).toContain(`${resultOfUnitSearch}`)
      // 明細-単価
      expect(csvBody).toContain(`${checkingData.InvoiceLine[0].LineExtensionAmount.value}`)
      // 明細-税（消費税／軽減税率／不課税／免税／非課税）
      const taxCategory = {
        'JP 不課税 0%': '不課税',
        'JP 免税 0%': '免税',
        'JP 消費税 10%': '消費税',
        'JP 消費税(軽減税率) 8%': '軽減税率',
        'JP 非課税 0%': '非課税'
      }
      expect(csvBody).toContain(
        `${taxCategory[checkingData.InvoiceLine[0].TaxTotal[0].TaxSubtotal[0].TaxCategory.TaxScheme.Name.value]}`
      )
      // 明細-備考
      expect(csvBody).toContain(
        `${
          checkingData.InvoiceLine[0].DocumentReference ? checkingData.InvoiceLine[0].DocumentReference[0].ID.value : ''
        }`
      )
    })

    test('正常:条件検索（ステータス - 期日超過）', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[0] }
      request.body = {
        invoiceNumber: 'A01001',
        status: status[7],
        buyAndSell: buyAndSell[0],
        minIssuedate: '2021-08-01',
        maxIssuedate: '2021-11-09',
        minDueDate: '',
        maxDueDate: '',
        minDeliveryDate: '',
        maxDeliveryDate: ''
      }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[0])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[0])

      tenantControllerFindOneSpy.mockReturnValue(Tenants[0])

      contractControllerFindContractSpyon.mockReturnValue(Contracts[0])
      // 試験実施
      await csvDownload.cbPostIndex(request, response, next)

      // 期待結果
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
      expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
      // responseのヘッダ
      const today = new Date().toISOString().split('T')[0]
      expect(response.setHeader().headers['Content-Disposition']).toContain('attachment; filename=')
      expect(response.setHeader().headers['Content-Disposition']).toContain(`${today}`)
      expect(response.setHeader().headers['Content-Disposition']).toContain('A01001')

      // responseのcsvファイル
      const csvHeader = response.setHeader().body.split('\r\n')[0]
      const csvBody = response.setHeader().body.split('\r\n')[1]
      const checkingData = require('../mockInvoice/invoice1')
      expect(csvHeader).toBe(
        `${String.fromCharCode(
          0xfeff
        )}発行日,請求書番号,テナントID,支払期日,納品日,備考,銀行名,支店名,科目,口座番号,口座名義,その他特記事項,明細-項目ID,明細-内容,明細-数量,明細-単位,明細-単価,明細-税（消費税／軽減税率／不課税／免税／非課税）,明細-備考`
      )
      // 発行日
      expect(csvBody).toContain(`${checkingData.IssueDate.value}`)
      // 請求書番号
      expect(csvBody).toContain(`${checkingData.ID.value}`)
      // テナントID
      expect(csvBody).toContain(`${checkingData.AccountingCustomerParty.Party.PartyIdentification[0].ID.value}`)
      // 支払期日
      expect(csvBody).toContain(`${checkingData.PaymentMeans[0]?.PaymentDueDate?.value ?? ''}`)
      // 納品日
      expect(csvBody).toContain(`${checkingData.Delivery[0].ActualDeliveryDate?.value}`)
      // 備考
      expect(csvBody).toContain(`${checkingData.AdditionalDocumentReference[0].ID.value}`)
      // 銀行名
      expect(csvBody).toContain(
        `${
          checkingData.PaymentMeans[0].PayeeFinancialAccount?.FinancialInstitutionBranch?.FinancialInstitution?.Name
            .value ?? ''
        }`
      )
      // 支店名
      expect(csvBody).toContain(
        `${checkingData.PaymentMeans[0].PayeeFinancialAccount?.FinancialInstitutionBranch?.Name.value ?? ''}`
      )
      // 科目
      expect(csvBody).toContain(
        `${checkingData.PaymentMeans[0].PayeeFinancialAccount?.AccountTypeCode?.value === 'General' ? '普通' : '当座'}`
      )
      // 口座番号
      expect(csvBody).toContain(`${checkingData.PaymentMeans[0].PayeeFinancialAccount?.ID?.value ?? ''}`)
      // 口座名義
      expect(csvBody).toContain(
        `${checkingData.PaymentMeans[0].PayeeFinancialAccount?.FinancialInstitutionBranch?.Name.value ?? ''}`
      )
      // その他特記事項
      expect(csvBody).toContain(`${checkingData.PaymentMeans[0].PayeeFinancialAccount?.Name?.value ?? ''}`)
      // 明細-項目ID
      expect(csvBody).toContain(`${checkingData.Note[0].value}`)
      // 明細-内容
      expect(csvBody).toContain(`${checkingData.InvoiceLine[0].Item.Description[0].value}`)
      // 明細-数量
      expect(csvBody).toContain(`${checkingData.InvoiceLine[0].InvoicedQuantity.value}`)
      // 明細-単位
      const bconCsvUnitcode = require('../../Application/lib/bconCsvUnitcode')
      const unitCodeKeys = Object.keys(bconCsvUnitcode)
      let resultOfUnitSearch
      unitCodeKeys.some((item) => {
        if (`${checkingData.InvoiceLine[0].InvoicedQuantity.unitCode}` === bconCsvUnitcode[item]) {
          resultOfUnitSearch = item
          return true
        }
        return false
      })
      expect(csvBody).toContain(`${resultOfUnitSearch}`)
      // 明細-単価
      expect(csvBody).toContain(`${checkingData.InvoiceLine[0].LineExtensionAmount.value}`)
      // 明細-税（消費税／軽減税率／不課税／免税／非課税）
      const taxCategory = {
        'JP 不課税 0%': '不課税',
        'JP 免税 0%': '免税',
        'JP 消費税 10%': '消費税',
        'JP 消費税(軽減税率) 8%': '軽減税率',
        'JP 非課税 0%': '非課税'
      }
      expect(csvBody).toContain(
        `${taxCategory[checkingData.InvoiceLine[0].TaxTotal[0].TaxSubtotal[0].TaxCategory.TaxScheme.Name.value]}`
      )
      // 明細-備考
      expect(csvBody).toContain(
        `${
          checkingData.InvoiceLine[0].DocumentReference ? checkingData.InvoiceLine[0].DocumentReference[0].ID.value : ''
        }`
      )
    })

    test('正常:条件検索（ステータス - 失敗）', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[0] }
      request.body = {
        invoiceNumber: 'A01001',
        status: status[8],
        buyAndSell: buyAndSell[0],
        minIssuedate: '2021-08-01',
        maxIssuedate: '2021-11-09',
        minDueDate: '',
        maxDueDate: '',
        minDeliveryDate: '',
        maxDeliveryDate: ''
      }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[0])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[0])

      tenantControllerFindOneSpy.mockReturnValue(Tenants[0])

      contractControllerFindContractSpyon.mockReturnValue(Contracts[0])
      // 試験実施
      await csvDownload.cbPostIndex(request, response, next)

      // 期待結果
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
      expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
      // responseのヘッダ
      const today = new Date().toISOString().split('T')[0]
      expect(response.setHeader().headers['Content-Disposition']).toContain('attachment; filename=')
      expect(response.setHeader().headers['Content-Disposition']).toContain(`${today}`)
      expect(response.setHeader().headers['Content-Disposition']).toContain('A01001')

      // responseのcsvファイル
      const csvHeader = response.setHeader().body.split('\r\n')[0]
      const csvBody = response.setHeader().body.split('\r\n')[1]
      const checkingData = require('../mockInvoice/invoice1')
      expect(csvHeader).toBe(
        `${String.fromCharCode(
          0xfeff
        )}発行日,請求書番号,テナントID,支払期日,納品日,備考,銀行名,支店名,科目,口座番号,口座名義,その他特記事項,明細-項目ID,明細-内容,明細-数量,明細-単位,明細-単価,明細-税（消費税／軽減税率／不課税／免税／非課税）,明細-備考`
      )
      // 発行日
      expect(csvBody).toContain(`${checkingData.IssueDate.value}`)
      // 請求書番号
      expect(csvBody).toContain(`${checkingData.ID.value}`)
      // テナントID
      expect(csvBody).toContain(`${checkingData.AccountingCustomerParty.Party.PartyIdentification[0].ID.value}`)
      // 支払期日
      expect(csvBody).toContain(`${checkingData.PaymentMeans[0]?.PaymentDueDate?.value ?? ''}`)
      // 納品日
      expect(csvBody).toContain(`${checkingData.Delivery[0].ActualDeliveryDate?.value}`)
      // 備考
      expect(csvBody).toContain(`${checkingData.AdditionalDocumentReference[0].ID.value}`)
      // 銀行名
      expect(csvBody).toContain(
        `${
          checkingData.PaymentMeans[0].PayeeFinancialAccount?.FinancialInstitutionBranch?.FinancialInstitution?.Name
            .value ?? ''
        }`
      )
      // 支店名
      expect(csvBody).toContain(
        `${checkingData.PaymentMeans[0].PayeeFinancialAccount?.FinancialInstitutionBranch?.Name.value ?? ''}`
      )
      // 科目
      expect(csvBody).toContain(
        `${checkingData.PaymentMeans[0].PayeeFinancialAccount?.AccountTypeCode?.value === 'General' ? '普通' : '当座'}`
      )
      // 口座番号
      expect(csvBody).toContain(`${checkingData.PaymentMeans[0].PayeeFinancialAccount?.ID?.value ?? ''}`)
      // 口座名義
      expect(csvBody).toContain(
        `${checkingData.PaymentMeans[0].PayeeFinancialAccount?.FinancialInstitutionBranch?.Name.value ?? ''}`
      )
      // その他特記事項
      expect(csvBody).toContain(`${checkingData.PaymentMeans[0].PayeeFinancialAccount?.Name?.value ?? ''}`)
      // 明細-項目ID
      expect(csvBody).toContain(`${checkingData.Note[0].value}`)
      // 明細-内容
      expect(csvBody).toContain(`${checkingData.InvoiceLine[0].Item.Description[0].value}`)
      // 明細-数量
      expect(csvBody).toContain(`${checkingData.InvoiceLine[0].InvoicedQuantity.value}`)
      // 明細-単位
      const bconCsvUnitcode = require('../../Application/lib/bconCsvUnitcode')
      const unitCodeKeys = Object.keys(bconCsvUnitcode)
      let resultOfUnitSearch
      unitCodeKeys.some((item) => {
        if (`${checkingData.InvoiceLine[0].InvoicedQuantity.unitCode}` === bconCsvUnitcode[item]) {
          resultOfUnitSearch = item
          return true
        }
        return false
      })
      expect(csvBody).toContain(`${resultOfUnitSearch}`)
      // 明細-単価
      expect(csvBody).toContain(`${checkingData.InvoiceLine[0].LineExtensionAmount.value}`)
      // 明細-税（消費税／軽減税率／不課税／免税／非課税）
      const taxCategory = {
        'JP 不課税 0%': '不課税',
        'JP 免税 0%': '免税',
        'JP 消費税 10%': '消費税',
        'JP 消費税(軽減税率) 8%': '軽減税率',
        'JP 非課税 0%': '非課税'
      }
      expect(csvBody).toContain(
        `${taxCategory[checkingData.InvoiceLine[0].TaxTotal[0].TaxSubtotal[0].TaxCategory.TaxScheme.Name.value]}`
      )
      // 明細-備考
      expect(csvBody).toContain(
        `${
          checkingData.InvoiceLine[0].DocumentReference ? checkingData.InvoiceLine[0].DocumentReference[0].ID.value : ''
        }`
      )
    })

    test('正常:条件検索（ステータス - 送金済み/決済済み）', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[0] }
      request.body = {
        invoiceNumber: 'A01001',
        status: status[9],
        buyAndSell: buyAndSell[0],
        minIssuedate: '2021-08-01',
        maxIssuedate: '2021-11-09',
        minDueDate: '',
        maxDueDate: '',
        minDeliveryDate: '',
        maxDeliveryDate: ''
      }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[0])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[0])

      tenantControllerFindOneSpy.mockReturnValue(Tenants[0])

      contractControllerFindContractSpyon.mockReturnValue(Contracts[0])
      // 試験実施
      await csvDownload.cbPostIndex(request, response, next)

      // 期待結果
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
      expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
      // responseのヘッダ
      const today = new Date().toISOString().split('T')[0]
      expect(response.setHeader().headers['Content-Disposition']).toContain('attachment; filename=')
      expect(response.setHeader().headers['Content-Disposition']).toContain(`${today}`)
      expect(response.setHeader().headers['Content-Disposition']).toContain('A01001')

      // responseのcsvファイル
      const csvHeader = response.setHeader().body.split('\r\n')[0]
      const csvBody = response.setHeader().body.split('\r\n')[1]
      const checkingData = require('../mockInvoice/invoice1')
      expect(csvHeader).toBe(
        `${String.fromCharCode(
          0xfeff
        )}発行日,請求書番号,テナントID,支払期日,納品日,備考,銀行名,支店名,科目,口座番号,口座名義,その他特記事項,明細-項目ID,明細-内容,明細-数量,明細-単位,明細-単価,明細-税（消費税／軽減税率／不課税／免税／非課税）,明細-備考`
      )
      // 発行日
      expect(csvBody).toContain(`${checkingData.IssueDate.value}`)
      // 請求書番号
      expect(csvBody).toContain(`${checkingData.ID.value}`)
      // テナントID
      expect(csvBody).toContain(`${checkingData.AccountingCustomerParty.Party.PartyIdentification[0].ID.value}`)
      // 支払期日
      expect(csvBody).toContain(`${checkingData.PaymentMeans[0]?.PaymentDueDate?.value ?? ''}`)
      // 納品日
      expect(csvBody).toContain(`${checkingData.Delivery[0].ActualDeliveryDate?.value}`)
      // 備考
      expect(csvBody).toContain(`${checkingData.AdditionalDocumentReference[0].ID.value}`)
      // 銀行名
      expect(csvBody).toContain(
        `${
          checkingData.PaymentMeans[0].PayeeFinancialAccount?.FinancialInstitutionBranch?.FinancialInstitution?.Name
            .value ?? ''
        }`
      )
      // 支店名
      expect(csvBody).toContain(
        `${checkingData.PaymentMeans[0].PayeeFinancialAccount?.FinancialInstitutionBranch?.Name.value ?? ''}`
      )
      // 科目
      expect(csvBody).toContain(
        `${checkingData.PaymentMeans[0].PayeeFinancialAccount?.AccountTypeCode?.value === 'General' ? '普通' : '当座'}`
      )
      // 口座番号
      expect(csvBody).toContain(`${checkingData.PaymentMeans[0].PayeeFinancialAccount?.ID?.value ?? ''}`)
      // 口座名義
      expect(csvBody).toContain(
        `${checkingData.PaymentMeans[0].PayeeFinancialAccount?.FinancialInstitutionBranch?.Name.value ?? ''}`
      )
      // その他特記事項
      expect(csvBody).toContain(`${checkingData.PaymentMeans[0].PayeeFinancialAccount?.Name?.value ?? ''}`)
      // 明細-項目ID
      expect(csvBody).toContain(`${checkingData.Note[0].value}`)
      // 明細-内容
      expect(csvBody).toContain(`${checkingData.InvoiceLine[0].Item.Description[0].value}`)
      // 明細-数量
      expect(csvBody).toContain(`${checkingData.InvoiceLine[0].InvoicedQuantity.value}`)
      // 明細-単位
      const bconCsvUnitcode = require('../../Application/lib/bconCsvUnitcode')
      const unitCodeKeys = Object.keys(bconCsvUnitcode)
      let resultOfUnitSearch
      unitCodeKeys.some((item) => {
        if (`${checkingData.InvoiceLine[0].InvoicedQuantity.unitCode}` === bconCsvUnitcode[item]) {
          resultOfUnitSearch = item
          return true
        }
        return false
      })
      expect(csvBody).toContain(`${resultOfUnitSearch}`)
      // 明細-単価
      expect(csvBody).toContain(`${checkingData.InvoiceLine[0].LineExtensionAmount.value}`)
      // 明細-税（消費税／軽減税率／不課税／免税／非課税）
      const taxCategory = {
        'JP 不課税 0%': '不課税',
        'JP 免税 0%': '免税',
        'JP 消費税 10%': '消費税',
        'JP 消費税(軽減税率) 8%': '軽減税率',
        'JP 非課税 0%': '非課税'
      }
      expect(csvBody).toContain(
        `${taxCategory[checkingData.InvoiceLine[0].TaxTotal[0].TaxSubtotal[0].TaxCategory.TaxScheme.Name.value]}`
      )
      // 明細-備考
      expect(csvBody).toContain(
        `${
          checkingData.InvoiceLine[0].DocumentReference ? checkingData.InvoiceLine[0].DocumentReference[0].ID.value : ''
        }`
      )
    })

    test('正常:条件検索（ステータス - 送信中）', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[0] }
      request.body = {
        invoiceNumber: 'A01001',
        status: status[10],
        buyAndSell: buyAndSell[0],
        minIssuedate: '2021-08-01',
        maxIssuedate: '2021-11-09',
        minDueDate: '',
        maxDueDate: '',
        minDeliveryDate: '',
        maxDeliveryDate: ''
      }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[0])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[0])

      tenantControllerFindOneSpy.mockReturnValue(Tenants[0])

      contractControllerFindContractSpyon.mockReturnValue(Contracts[0])
      // 試験実施
      await csvDownload.cbPostIndex(request, response, next)

      // 期待結果
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
      expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
      // responseのヘッダ
      const today = new Date().toISOString().split('T')[0]
      expect(response.setHeader().headers['Content-Disposition']).toContain('attachment; filename=')
      expect(response.setHeader().headers['Content-Disposition']).toContain(`${today}`)
      expect(response.setHeader().headers['Content-Disposition']).toContain('A01001')

      // responseのcsvファイル
      const csvHeader = response.setHeader().body.split('\r\n')[0]
      const csvBody = response.setHeader().body.split('\r\n')[1]
      const checkingData = require('../mockInvoice/invoice1')
      expect(csvHeader).toBe(
        `${String.fromCharCode(
          0xfeff
        )}発行日,請求書番号,テナントID,支払期日,納品日,備考,銀行名,支店名,科目,口座番号,口座名義,その他特記事項,明細-項目ID,明細-内容,明細-数量,明細-単位,明細-単価,明細-税（消費税／軽減税率／不課税／免税／非課税）,明細-備考`
      )
      // 発行日
      expect(csvBody).toContain(`${checkingData.IssueDate.value}`)
      // 請求書番号
      expect(csvBody).toContain(`${checkingData.ID.value}`)
      // テナントID
      expect(csvBody).toContain(`${checkingData.AccountingCustomerParty.Party.PartyIdentification[0].ID.value}`)
      // 支払期日
      expect(csvBody).toContain(`${checkingData.PaymentMeans[0]?.PaymentDueDate?.value ?? ''}`)
      // 納品日
      expect(csvBody).toContain(`${checkingData.Delivery[0].ActualDeliveryDate?.value}`)
      // 備考
      expect(csvBody).toContain(`${checkingData.AdditionalDocumentReference[0].ID.value}`)
      // 銀行名
      expect(csvBody).toContain(
        `${
          checkingData.PaymentMeans[0].PayeeFinancialAccount?.FinancialInstitutionBranch?.FinancialInstitution?.Name
            .value ?? ''
        }`
      )
      // 支店名
      expect(csvBody).toContain(
        `${checkingData.PaymentMeans[0].PayeeFinancialAccount?.FinancialInstitutionBranch?.Name.value ?? ''}`
      )
      // 科目
      expect(csvBody).toContain(
        `${checkingData.PaymentMeans[0].PayeeFinancialAccount?.AccountTypeCode?.value === 'General' ? '普通' : '当座'}`
      )
      // 口座番号
      expect(csvBody).toContain(`${checkingData.PaymentMeans[0].PayeeFinancialAccount?.ID?.value ?? ''}`)
      // 口座名義
      expect(csvBody).toContain(
        `${checkingData.PaymentMeans[0].PayeeFinancialAccount?.FinancialInstitutionBranch?.Name.value ?? ''}`
      )
      // その他特記事項
      expect(csvBody).toContain(`${checkingData.PaymentMeans[0].PayeeFinancialAccount?.Name?.value ?? ''}`)
      // 明細-項目ID
      expect(csvBody).toContain(`${checkingData.Note[0].value}`)
      // 明細-内容
      expect(csvBody).toContain(`${checkingData.InvoiceLine[0].Item.Description[0].value}`)
      // 明細-数量
      expect(csvBody).toContain(`${checkingData.InvoiceLine[0].InvoicedQuantity.value}`)
      // 明細-単位
      const bconCsvUnitcode = require('../../Application/lib/bconCsvUnitcode')
      const unitCodeKeys = Object.keys(bconCsvUnitcode)
      let resultOfUnitSearch
      unitCodeKeys.some((item) => {
        if (`${checkingData.InvoiceLine[0].InvoicedQuantity.unitCode}` === bconCsvUnitcode[item]) {
          resultOfUnitSearch = item
          return true
        }
        return false
      })
      expect(csvBody).toContain(`${resultOfUnitSearch}`)
      // 明細-単価
      expect(csvBody).toContain(`${checkingData.InvoiceLine[0].LineExtensionAmount.value}`)
      // 明細-税（消費税／軽減税率／不課税／免税／非課税）
      const taxCategory = {
        'JP 不課税 0%': '不課税',
        'JP 免税 0%': '免税',
        'JP 消費税 10%': '消費税',
        'JP 消費税(軽減税率) 8%': '軽減税率',
        'JP 非課税 0%': '非課税'
      }
      expect(csvBody).toContain(
        `${taxCategory[checkingData.InvoiceLine[0].TaxTotal[0].TaxSubtotal[0].TaxCategory.TaxScheme.Name.value]}`
      )
      // 明細-備考
      expect(csvBody).toContain(
        `${
          checkingData.InvoiceLine[0].DocumentReference ? checkingData.InvoiceLine[0].DocumentReference[0].ID.value : ''
        }`
      )
    })

    test('正常:条件検索（ステータス - 接続承認待ち）', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[0] }
      request.body = {
        invoiceNumber: 'A01001',
        status: status[11],
        buyAndSell: buyAndSell[0],
        minIssuedate: '2021-08-01',
        maxIssuedate: '2021-11-09',
        minDueDate: '',
        maxDueDate: '',
        minDeliveryDate: '',
        maxDeliveryDate: ''
      }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[0])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[0])

      tenantControllerFindOneSpy.mockReturnValue(Tenants[0])

      contractControllerFindContractSpyon.mockReturnValue(Contracts[0])
      // 試験実施
      await csvDownload.cbPostIndex(request, response, next)

      // 期待結果
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
      expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
      // responseのヘッダ
      const today = new Date().toISOString().split('T')[0]
      expect(response.setHeader().headers['Content-Disposition']).toContain('attachment; filename=')
      expect(response.setHeader().headers['Content-Disposition']).toContain(`${today}`)
      expect(response.setHeader().headers['Content-Disposition']).toContain('A01001')

      // responseのcsvファイル
      const csvHeader = response.setHeader().body.split('\r\n')[0]
      const csvBody = response.setHeader().body.split('\r\n')[1]
      const checkingData = require('../mockInvoice/invoice1')
      expect(csvHeader).toBe(
        `${String.fromCharCode(
          0xfeff
        )}発行日,請求書番号,テナントID,支払期日,納品日,備考,銀行名,支店名,科目,口座番号,口座名義,その他特記事項,明細-項目ID,明細-内容,明細-数量,明細-単位,明細-単価,明細-税（消費税／軽減税率／不課税／免税／非課税）,明細-備考`
      )
      // 発行日
      expect(csvBody).toContain(`${checkingData.IssueDate.value}`)
      // 請求書番号
      expect(csvBody).toContain(`${checkingData.ID.value}`)
      // テナントID
      expect(csvBody).toContain(`${checkingData.AccountingCustomerParty.Party.PartyIdentification[0].ID.value}`)
      // 支払期日
      expect(csvBody).toContain(`${checkingData.PaymentMeans[0]?.PaymentDueDate?.value ?? ''}`)
      // 納品日
      expect(csvBody).toContain(`${checkingData.Delivery[0].ActualDeliveryDate?.value}`)
      // 備考
      expect(csvBody).toContain(`${checkingData.AdditionalDocumentReference[0].ID.value}`)
      // 銀行名
      expect(csvBody).toContain(
        `${
          checkingData.PaymentMeans[0].PayeeFinancialAccount?.FinancialInstitutionBranch?.FinancialInstitution?.Name
            .value ?? ''
        }`
      )
      // 支店名
      expect(csvBody).toContain(
        `${checkingData.PaymentMeans[0].PayeeFinancialAccount?.FinancialInstitutionBranch?.Name.value ?? ''}`
      )
      // 科目
      expect(csvBody).toContain(
        `${checkingData.PaymentMeans[0].PayeeFinancialAccount?.AccountTypeCode?.value === 'General' ? '普通' : '当座'}`
      )
      // 口座番号
      expect(csvBody).toContain(`${checkingData.PaymentMeans[0].PayeeFinancialAccount?.ID?.value ?? ''}`)
      // 口座名義
      expect(csvBody).toContain(
        `${checkingData.PaymentMeans[0].PayeeFinancialAccount?.FinancialInstitutionBranch?.Name.value ?? ''}`
      )
      // その他特記事項
      expect(csvBody).toContain(`${checkingData.PaymentMeans[0].PayeeFinancialAccount?.Name?.value ?? ''}`)
      // 明細-項目ID
      expect(csvBody).toContain(`${checkingData.Note[0].value}`)
      // 明細-内容
      expect(csvBody).toContain(`${checkingData.InvoiceLine[0].Item.Description[0].value}`)
      // 明細-数量
      expect(csvBody).toContain(`${checkingData.InvoiceLine[0].InvoicedQuantity.value}`)
      // 明細-単位
      const bconCsvUnitcode = require('../../Application/lib/bconCsvUnitcode')
      const unitCodeKeys = Object.keys(bconCsvUnitcode)
      let resultOfUnitSearch
      unitCodeKeys.some((item) => {
        if (`${checkingData.InvoiceLine[0].InvoicedQuantity.unitCode}` === bconCsvUnitcode[item]) {
          resultOfUnitSearch = item
          return true
        }
        return false
      })
      expect(csvBody).toContain(`${resultOfUnitSearch}`)
      // 明細-単価
      expect(csvBody).toContain(`${checkingData.InvoiceLine[0].LineExtensionAmount.value}`)
      // 明細-税（消費税／軽減税率／不課税／免税／非課税）
      const taxCategory = {
        'JP 不課税 0%': '不課税',
        'JP 免税 0%': '免税',
        'JP 消費税 10%': '消費税',
        'JP 消費税(軽減税率) 8%': '軽減税率',
        'JP 非課税 0%': '非課税'
      }
      expect(csvBody).toContain(
        `${taxCategory[checkingData.InvoiceLine[0].TaxTotal[0].TaxSubtotal[0].TaxCategory.TaxScheme.Name.value]}`
      )
      // 明細-備考
      expect(csvBody).toContain(
        `${
          checkingData.InvoiceLine[0].DocumentReference ? checkingData.InvoiceLine[0].DocumentReference[0].ID.value : ''
        }`
      )
    })

    test('正常:条件検索（ステータス - クリアランス中）', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[0] }
      request.body = {
        invoiceNumber: 'A01001',
        status: status[12],
        buyAndSell: buyAndSell[0],
        minIssuedate: '2021-08-01',
        maxIssuedate: '2021-11-09',
        minDueDate: '',
        maxDueDate: '',
        minDeliveryDate: '',
        maxDeliveryDate: ''
      }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[0])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[0])

      tenantControllerFindOneSpy.mockReturnValue(Tenants[0])

      contractControllerFindContractSpyon.mockReturnValue(Contracts[0])
      // 試験実施
      await csvDownload.cbPostIndex(request, response, next)

      // 期待結果
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
      expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
      // responseのヘッダ
      const today = new Date().toISOString().split('T')[0]
      expect(response.setHeader().headers['Content-Disposition']).toContain('attachment; filename=')
      expect(response.setHeader().headers['Content-Disposition']).toContain(`${today}`)
      expect(response.setHeader().headers['Content-Disposition']).toContain('A01001')

      // responseのcsvファイル
      const csvHeader = response.setHeader().body.split('\r\n')[0]
      const csvBody = response.setHeader().body.split('\r\n')[1]
      const checkingData = require('../mockInvoice/invoice1')
      expect(csvHeader).toBe(
        `${String.fromCharCode(
          0xfeff
        )}発行日,請求書番号,テナントID,支払期日,納品日,備考,銀行名,支店名,科目,口座番号,口座名義,その他特記事項,明細-項目ID,明細-内容,明細-数量,明細-単位,明細-単価,明細-税（消費税／軽減税率／不課税／免税／非課税）,明細-備考`
      )
      // 発行日
      expect(csvBody).toContain(`${checkingData.IssueDate.value}`)
      // 請求書番号
      expect(csvBody).toContain(`${checkingData.ID.value}`)
      // テナントID
      expect(csvBody).toContain(`${checkingData.AccountingCustomerParty.Party.PartyIdentification[0].ID.value}`)
      // 支払期日
      expect(csvBody).toContain(`${checkingData.PaymentMeans[0]?.PaymentDueDate?.value ?? ''}`)
      // 納品日
      expect(csvBody).toContain(`${checkingData.Delivery[0].ActualDeliveryDate?.value}`)
      // 備考
      expect(csvBody).toContain(`${checkingData.AdditionalDocumentReference[0].ID.value}`)
      // 銀行名
      expect(csvBody).toContain(
        `${
          checkingData.PaymentMeans[0].PayeeFinancialAccount?.FinancialInstitutionBranch?.FinancialInstitution?.Name
            .value ?? ''
        }`
      )
      // 支店名
      expect(csvBody).toContain(
        `${checkingData.PaymentMeans[0].PayeeFinancialAccount?.FinancialInstitutionBranch?.Name.value ?? ''}`
      )
      // 科目
      expect(csvBody).toContain(
        `${checkingData.PaymentMeans[0].PayeeFinancialAccount?.AccountTypeCode?.value === 'General' ? '普通' : '当座'}`
      )
      // 口座番号
      expect(csvBody).toContain(`${checkingData.PaymentMeans[0].PayeeFinancialAccount?.ID?.value ?? ''}`)
      // 口座名義
      expect(csvBody).toContain(
        `${checkingData.PaymentMeans[0].PayeeFinancialAccount?.FinancialInstitutionBranch?.Name.value ?? ''}`
      )
      // その他特記事項
      expect(csvBody).toContain(`${checkingData.PaymentMeans[0].PayeeFinancialAccount?.Name?.value ?? ''}`)
      // 明細-項目ID
      expect(csvBody).toContain(`${checkingData.Note[0].value}`)
      // 明細-内容
      expect(csvBody).toContain(`${checkingData.InvoiceLine[0].Item.Description[0].value}`)
      // 明細-数量
      expect(csvBody).toContain(`${checkingData.InvoiceLine[0].InvoicedQuantity.value}`)
      // 明細-単位
      const bconCsvUnitcode = require('../../Application/lib/bconCsvUnitcode')
      const unitCodeKeys = Object.keys(bconCsvUnitcode)
      let resultOfUnitSearch
      unitCodeKeys.some((item) => {
        if (`${checkingData.InvoiceLine[0].InvoicedQuantity.unitCode}` === bconCsvUnitcode[item]) {
          resultOfUnitSearch = item
          return true
        }
        return false
      })
      expect(csvBody).toContain(`${resultOfUnitSearch}`)
      // 明細-単価
      expect(csvBody).toContain(`${checkingData.InvoiceLine[0].LineExtensionAmount.value}`)
      // 明細-税（消費税／軽減税率／不課税／免税／非課税）
      const taxCategory = {
        'JP 不課税 0%': '不課税',
        'JP 免税 0%': '免税',
        'JP 消費税 10%': '消費税',
        'JP 消費税(軽減税率) 8%': '軽減税率',
        'JP 非課税 0%': '非課税'
      }
      expect(csvBody).toContain(
        `${taxCategory[checkingData.InvoiceLine[0].TaxTotal[0].TaxSubtotal[0].TaxCategory.TaxScheme.Name.value]}`
      )
      // 明細-備考
      expect(csvBody).toContain(
        `${
          checkingData.InvoiceLine[0].DocumentReference ? checkingData.InvoiceLine[0].DocumentReference[0].ID.value : ''
        }`
      )
    })

    test('正常:条件検索（ステータス - 差替え済み）', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[0] }
      request.body = {
        invoiceNumber: 'A01001',
        status: status[13],
        buyAndSell: buyAndSell[0],
        minIssuedate: '2021-08-01',
        maxIssuedate: '2021-11-09',
        minDueDate: '',
        maxDueDate: '',
        minDeliveryDate: '',
        maxDeliveryDate: ''
      }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[0])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[0])

      tenantControllerFindOneSpy.mockReturnValue(Tenants[0])

      contractControllerFindContractSpyon.mockReturnValue(Contracts[0])
      // 試験実施
      await csvDownload.cbPostIndex(request, response, next)

      // 期待結果
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
      expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
      // responseのヘッダ
      const today = new Date().toISOString().split('T')[0]
      expect(response.setHeader().headers['Content-Disposition']).toContain('attachment; filename=')
      expect(response.setHeader().headers['Content-Disposition']).toContain(`${today}`)
      expect(response.setHeader().headers['Content-Disposition']).toContain('A01001')

      // responseのcsvファイル
      const csvHeader = response.setHeader().body.split('\r\n')[0]
      const csvBody = response.setHeader().body.split('\r\n')[1]
      const checkingData = require('../mockInvoice/invoice1')
      expect(csvHeader).toBe(
        `${String.fromCharCode(
          0xfeff
        )}発行日,請求書番号,テナントID,支払期日,納品日,備考,銀行名,支店名,科目,口座番号,口座名義,その他特記事項,明細-項目ID,明細-内容,明細-数量,明細-単位,明細-単価,明細-税（消費税／軽減税率／不課税／免税／非課税）,明細-備考`
      )
      // 発行日
      expect(csvBody).toContain(`${checkingData.IssueDate.value}`)
      // 請求書番号
      expect(csvBody).toContain(`${checkingData.ID.value}`)
      // テナントID
      expect(csvBody).toContain(`${checkingData.AccountingCustomerParty.Party.PartyIdentification[0].ID.value}`)
      // 支払期日
      expect(csvBody).toContain(`${checkingData.PaymentMeans[0]?.PaymentDueDate?.value ?? ''}`)
      // 納品日
      expect(csvBody).toContain(`${checkingData.Delivery[0].ActualDeliveryDate?.value}`)
      // 備考
      expect(csvBody).toContain(`${checkingData.AdditionalDocumentReference[0].ID.value}`)
      // 銀行名
      expect(csvBody).toContain(
        `${
          checkingData.PaymentMeans[0].PayeeFinancialAccount?.FinancialInstitutionBranch?.FinancialInstitution?.Name
            .value ?? ''
        }`
      )
      // 支店名
      expect(csvBody).toContain(
        `${checkingData.PaymentMeans[0].PayeeFinancialAccount?.FinancialInstitutionBranch?.Name.value ?? ''}`
      )
      // 科目
      expect(csvBody).toContain(
        `${checkingData.PaymentMeans[0].PayeeFinancialAccount?.AccountTypeCode?.value === 'General' ? '普通' : '当座'}`
      )
      // 口座番号
      expect(csvBody).toContain(`${checkingData.PaymentMeans[0].PayeeFinancialAccount?.ID?.value ?? ''}`)
      // 口座名義
      expect(csvBody).toContain(
        `${checkingData.PaymentMeans[0].PayeeFinancialAccount?.FinancialInstitutionBranch?.Name.value ?? ''}`
      )
      // その他特記事項
      expect(csvBody).toContain(`${checkingData.PaymentMeans[0].PayeeFinancialAccount?.Name?.value ?? ''}`)
      // 明細-項目ID
      expect(csvBody).toContain(`${checkingData.Note[0].value}`)
      // 明細-内容
      expect(csvBody).toContain(`${checkingData.InvoiceLine[0].Item.Description[0].value}`)
      // 明細-数量
      expect(csvBody).toContain(`${checkingData.InvoiceLine[0].InvoicedQuantity.value}`)
      // 明細-単位
      const bconCsvUnitcode = require('../../Application/lib/bconCsvUnitcode')
      const unitCodeKeys = Object.keys(bconCsvUnitcode)
      let resultOfUnitSearch
      unitCodeKeys.some((item) => {
        if (`${checkingData.InvoiceLine[0].InvoicedQuantity.unitCode}` === bconCsvUnitcode[item]) {
          resultOfUnitSearch = item
          return true
        }
        return false
      })
      expect(csvBody).toContain(`${resultOfUnitSearch}`)
      // 明細-単価
      expect(csvBody).toContain(`${checkingData.InvoiceLine[0].LineExtensionAmount.value}`)
      // 明細-税（消費税／軽減税率／不課税／免税／非課税）
      const taxCategory = {
        'JP 不課税 0%': '不課税',
        'JP 免税 0%': '免税',
        'JP 消費税 10%': '消費税',
        'JP 消費税(軽減税率) 8%': '軽減税率',
        'JP 非課税 0%': '非課税'
      }
      expect(csvBody).toContain(
        `${taxCategory[checkingData.InvoiceLine[0].TaxTotal[0].TaxSubtotal[0].TaxCategory.TaxScheme.Name.value]}`
      )
      // 明細-備考
      expect(csvBody).toContain(
        `${
          checkingData.InvoiceLine[0].DocumentReference ? checkingData.InvoiceLine[0].DocumentReference[0].ID.value : ''
        }`
      )
    })

    test('正常:条件検索（ステータス - 完了）', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[0] }
      request.body = {
        invoiceNumber: 'A01001',
        status: status[14],
        buyAndSell: buyAndSell[0],
        minIssuedate: '2021-08-01',
        maxIssuedate: '2021-11-09',
        minDueDate: '',
        maxDueDate: '',
        minDeliveryDate: '',
        maxDeliveryDate: ''
      }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[0])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[0])

      tenantControllerFindOneSpy.mockReturnValue(Tenants[0])

      contractControllerFindContractSpyon.mockReturnValue(Contracts[0])
      // 試験実施
      await csvDownload.cbPostIndex(request, response, next)

      // 期待結果
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
      expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
      // responseのヘッダ
      const today = new Date().toISOString().split('T')[0]
      expect(response.setHeader().headers['Content-Disposition']).toContain('attachment; filename=')
      expect(response.setHeader().headers['Content-Disposition']).toContain(`${today}`)
      expect(response.setHeader().headers['Content-Disposition']).toContain('A01001')

      // responseのcsvファイル
      const csvHeader = response.setHeader().body.split('\r\n')[0]
      const csvBody = response.setHeader().body.split('\r\n')[1]
      const checkingData = require('../mockInvoice/invoice1')
      expect(csvHeader).toBe(
        `${String.fromCharCode(
          0xfeff
        )}発行日,請求書番号,テナントID,支払期日,納品日,備考,銀行名,支店名,科目,口座番号,口座名義,その他特記事項,明細-項目ID,明細-内容,明細-数量,明細-単位,明細-単価,明細-税（消費税／軽減税率／不課税／免税／非課税）,明細-備考`
      )
      // 発行日
      expect(csvBody).toContain(`${checkingData.IssueDate.value}`)
      // 請求書番号
      expect(csvBody).toContain(`${checkingData.ID.value}`)
      // テナントID
      expect(csvBody).toContain(`${checkingData.AccountingCustomerParty.Party.PartyIdentification[0].ID.value}`)
      // 支払期日
      expect(csvBody).toContain(`${checkingData.PaymentMeans[0]?.PaymentDueDate?.value ?? ''}`)
      // 納品日
      expect(csvBody).toContain(`${checkingData.Delivery[0].ActualDeliveryDate?.value}`)
      // 備考
      expect(csvBody).toContain(`${checkingData.AdditionalDocumentReference[0].ID.value}`)
      // 銀行名
      expect(csvBody).toContain(
        `${
          checkingData.PaymentMeans[0].PayeeFinancialAccount?.FinancialInstitutionBranch?.FinancialInstitution?.Name
            .value ?? ''
        }`
      )
      // 支店名
      expect(csvBody).toContain(
        `${checkingData.PaymentMeans[0].PayeeFinancialAccount?.FinancialInstitutionBranch?.Name.value ?? ''}`
      )
      // 科目
      expect(csvBody).toContain(
        `${checkingData.PaymentMeans[0].PayeeFinancialAccount?.AccountTypeCode?.value === 'General' ? '普通' : '当座'}`
      )
      // 口座番号
      expect(csvBody).toContain(`${checkingData.PaymentMeans[0].PayeeFinancialAccount?.ID?.value ?? ''}`)
      // 口座名義
      expect(csvBody).toContain(
        `${checkingData.PaymentMeans[0].PayeeFinancialAccount?.FinancialInstitutionBranch?.Name.value ?? ''}`
      )
      // その他特記事項
      expect(csvBody).toContain(`${checkingData.PaymentMeans[0].PayeeFinancialAccount?.Name?.value ?? ''}`)
      // 明細-項目ID
      expect(csvBody).toContain(`${checkingData.Note[0].value}`)
      // 明細-内容
      expect(csvBody).toContain(`${checkingData.InvoiceLine[0].Item.Description[0].value}`)
      // 明細-数量
      expect(csvBody).toContain(`${checkingData.InvoiceLine[0].InvoicedQuantity.value}`)
      // 明細-単位
      const bconCsvUnitcode = require('../../Application/lib/bconCsvUnitcode')
      const unitCodeKeys = Object.keys(bconCsvUnitcode)
      let resultOfUnitSearch
      unitCodeKeys.some((item) => {
        if (`${checkingData.InvoiceLine[0].InvoicedQuantity.unitCode}` === bconCsvUnitcode[item]) {
          resultOfUnitSearch = item
          return true
        }
        return false
      })
      expect(csvBody).toContain(`${resultOfUnitSearch}`)
      // 明細-単価
      expect(csvBody).toContain(`${checkingData.InvoiceLine[0].LineExtensionAmount.value}`)
      // 明細-税（消費税／軽減税率／不課税／免税／非課税）
      const taxCategory = {
        'JP 不課税 0%': '不課税',
        'JP 免税 0%': '免税',
        'JP 消費税 10%': '消費税',
        'JP 消費税(軽減税率) 8%': '軽減税率',
        'JP 非課税 0%': '非課税'
      }
      expect(csvBody).toContain(
        `${taxCategory[checkingData.InvoiceLine[0].TaxTotal[0].TaxSubtotal[0].TaxCategory.TaxScheme.Name.value]}`
      )
      // 明細-備考
      expect(csvBody).toContain(
        `${
          checkingData.InvoiceLine[0].DocumentReference ? checkingData.InvoiceLine[0].DocumentReference[0].ID.value : ''
        }`
      )
    })

    test('正常:条件検索（ステータス - 回収済み)', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[0] }
      request.body = {
        invoiceNumber: 'A01001',
        status: status[15],
        buyAndSell: buyAndSell[0],
        minIssuedate: '2021-08-01',
        maxIssuedate: '2021-11-09',
        minDueDate: '',
        maxDueDate: '',
        minDeliveryDate: '',
        maxDeliveryDate: ''
      }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[0])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[0])

      tenantControllerFindOneSpy.mockReturnValue(Tenants[0])

      contractControllerFindContractSpyon.mockReturnValue(Contracts[0])
      // 試験実施
      await csvDownload.cbPostIndex(request, response, next)

      // 期待結果
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
      expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
      // responseのヘッダ
      const today = new Date().toISOString().split('T')[0]
      expect(response.setHeader().headers['Content-Disposition']).toContain('attachment; filename=')
      expect(response.setHeader().headers['Content-Disposition']).toContain(`${today}`)
      expect(response.setHeader().headers['Content-Disposition']).toContain('A01001')

      // responseのcsvファイル
      const csvHeader = response.setHeader().body.split('\r\n')[0]
      const csvBody = response.setHeader().body.split('\r\n')[1]
      const checkingData = require('../mockInvoice/invoice1')
      expect(csvHeader).toBe(
        `${String.fromCharCode(
          0xfeff
        )}発行日,請求書番号,テナントID,支払期日,納品日,備考,銀行名,支店名,科目,口座番号,口座名義,その他特記事項,明細-項目ID,明細-内容,明細-数量,明細-単位,明細-単価,明細-税（消費税／軽減税率／不課税／免税／非課税）,明細-備考`
      )
      // 発行日
      expect(csvBody).toContain(`${checkingData.IssueDate.value}`)
      // 請求書番号
      expect(csvBody).toContain(`${checkingData.ID.value}`)
      // テナントID
      expect(csvBody).toContain(`${checkingData.AccountingCustomerParty.Party.PartyIdentification[0].ID.value}`)
      // 支払期日
      expect(csvBody).toContain(`${checkingData.PaymentMeans[0]?.PaymentDueDate?.value ?? ''}`)
      // 納品日
      expect(csvBody).toContain(`${checkingData.Delivery[0].ActualDeliveryDate?.value}`)
      // 備考
      expect(csvBody).toContain(`${checkingData.AdditionalDocumentReference[0].ID.value}`)
      // 銀行名
      expect(csvBody).toContain(
        `${
          checkingData.PaymentMeans[0].PayeeFinancialAccount?.FinancialInstitutionBranch?.FinancialInstitution?.Name
            .value ?? ''
        }`
      )
      // 支店名
      expect(csvBody).toContain(
        `${checkingData.PaymentMeans[0].PayeeFinancialAccount?.FinancialInstitutionBranch?.Name.value ?? ''}`
      )
      // 科目
      expect(csvBody).toContain(
        `${checkingData.PaymentMeans[0].PayeeFinancialAccount?.AccountTypeCode?.value === 'General' ? '普通' : '当座'}`
      )
      // 口座番号
      expect(csvBody).toContain(`${checkingData.PaymentMeans[0].PayeeFinancialAccount?.ID?.value ?? ''}`)
      // 口座名義
      expect(csvBody).toContain(
        `${checkingData.PaymentMeans[0].PayeeFinancialAccount?.FinancialInstitutionBranch?.Name.value ?? ''}`
      )
      // その他特記事項
      expect(csvBody).toContain(`${checkingData.PaymentMeans[0].PayeeFinancialAccount?.Name?.value ?? ''}`)
      // 明細-項目ID
      expect(csvBody).toContain(`${checkingData.Note[0].value}`)
      // 明細-内容
      expect(csvBody).toContain(`${checkingData.InvoiceLine[0].Item.Description[0].value}`)
      // 明細-数量
      expect(csvBody).toContain(`${checkingData.InvoiceLine[0].InvoicedQuantity.value}`)
      // 明細-単位
      const bconCsvUnitcode = require('../../Application/lib/bconCsvUnitcode')
      const unitCodeKeys = Object.keys(bconCsvUnitcode)
      let resultOfUnitSearch
      unitCodeKeys.some((item) => {
        if (`${checkingData.InvoiceLine[0].InvoicedQuantity.unitCode}` === bconCsvUnitcode[item]) {
          resultOfUnitSearch = item
          return true
        }
        return false
      })
      expect(csvBody).toContain(`${resultOfUnitSearch}`)
      // 明細-単価
      expect(csvBody).toContain(`${checkingData.InvoiceLine[0].LineExtensionAmount.value}`)
      // 明細-税（消費税／軽減税率／不課税／免税／非課税）
      const taxCategory = {
        'JP 不課税 0%': '不課税',
        'JP 免税 0%': '免税',
        'JP 消費税 10%': '消費税',
        'JP 消費税(軽減税率) 8%': '軽減税率',
        'JP 非課税 0%': '非課税'
      }
      expect(csvBody).toContain(
        `${taxCategory[checkingData.InvoiceLine[0].TaxTotal[0].TaxSubtotal[0].TaxCategory.TaxScheme.Name.value]}`
      )
      // 明細-備考
      expect(csvBody).toContain(
        `${
          checkingData.InvoiceLine[0].DocumentReference ? checkingData.InvoiceLine[0].DocumentReference[0].ID.value : ''
        }`
      )
    })

    test('正常:条件検索（ステータス複数選択）', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる

      request.session = { ...session }
      request.user = { ...user[0] }
      request.body = {
        invoiceNumber: 'A01001',
        status: status,
        buyAndSell: buyAndSell[0],
        minIssuedate: '2021-08-01',
        maxIssuedate: '2021-11-09',
        minDueDate: '',
        maxDueDate: '',
        minDeliveryDate: '',
        maxDeliveryDate: ''
      }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[0])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[0])

      tenantControllerFindOneSpy.mockReturnValue(Tenants[0])

      contractControllerFindContractSpyon.mockReturnValue(Contracts[0])
      // 試験実施
      await csvDownload.cbPostIndex(request, response, next)

      // 期待結果
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
      expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
      // responseのヘッダ
      const today = new Date().toISOString().split('T')[0]
      expect(response.setHeader().headers['Content-Disposition']).toContain('attachment; filename=')
      expect(response.setHeader().headers['Content-Disposition']).toContain(`${today}`)
      expect(response.setHeader().headers['Content-Disposition']).toContain('A01001')

      // responseのcsvファイル
      const csvHeader = response.setHeader().body.split('\r\n')[0]
      const csvBody = response.setHeader().body.split('\r\n')[1]
      const checkingData = require('../mockInvoice/invoice1')
      expect(csvHeader).toBe(
        `${String.fromCharCode(
          0xfeff
        )}発行日,請求書番号,テナントID,支払期日,納品日,備考,銀行名,支店名,科目,口座番号,口座名義,その他特記事項,明細-項目ID,明細-内容,明細-数量,明細-単位,明細-単価,明細-税（消費税／軽減税率／不課税／免税／非課税）,明細-備考`
      )
      // 発行日
      expect(csvBody).toContain(`${checkingData.IssueDate.value}`)
      // 請求書番号
      expect(csvBody).toContain(`${checkingData.ID.value}`)
      // テナントID
      expect(csvBody).toContain(`${checkingData.AccountingCustomerParty.Party.PartyIdentification[0].ID.value}`)
      // 支払期日
      expect(csvBody).toContain(`${checkingData.PaymentMeans[0]?.PaymentDueDate?.value ?? ''}`)
      // 納品日
      expect(csvBody).toContain(`${checkingData.Delivery[0].ActualDeliveryDate?.value}`)
      // 備考
      expect(csvBody).toContain(`${checkingData.AdditionalDocumentReference[0].ID.value}`)
      // 銀行名
      expect(csvBody).toContain(
        `${
          checkingData.PaymentMeans[0].PayeeFinancialAccount?.FinancialInstitutionBranch?.FinancialInstitution?.Name
            .value ?? ''
        }`
      )
      // 支店名
      expect(csvBody).toContain(
        `${checkingData.PaymentMeans[0].PayeeFinancialAccount?.FinancialInstitutionBranch?.Name.value ?? ''}`
      )
      // 科目
      expect(csvBody).toContain(
        `${checkingData.PaymentMeans[0].PayeeFinancialAccount?.AccountTypeCode?.value === 'General' ? '普通' : '当座'}`
      )
      // 口座番号
      expect(csvBody).toContain(`${checkingData.PaymentMeans[0].PayeeFinancialAccount?.ID?.value ?? ''}`)
      // 口座名義
      expect(csvBody).toContain(
        `${checkingData.PaymentMeans[0].PayeeFinancialAccount?.FinancialInstitutionBranch?.Name.value ?? ''}`
      )
      // その他特記事項
      expect(csvBody).toContain(`${checkingData.PaymentMeans[0].PayeeFinancialAccount?.Name?.value ?? ''}`)
      // 明細-項目ID
      expect(csvBody).toContain(`${checkingData.Note[0].value}`)
      // 明細-内容
      expect(csvBody).toContain(`${checkingData.InvoiceLine[0].Item.Description[0].value}`)
      // 明細-数量
      expect(csvBody).toContain(`${checkingData.InvoiceLine[0].InvoicedQuantity.value}`)
      // 明細-単位
      const bconCsvUnitcode = require('../../Application/lib/bconCsvUnitcode')
      const unitCodeKeys = Object.keys(bconCsvUnitcode)
      let resultOfUnitSearch
      unitCodeKeys.some((item) => {
        if (`${checkingData.InvoiceLine[0].InvoicedQuantity.unitCode}` === bconCsvUnitcode[item]) {
          resultOfUnitSearch = item
          return true
        }
        return false
      })
      expect(csvBody).toContain(`${resultOfUnitSearch}`)
      // 明細-単価
      expect(csvBody).toContain(`${checkingData.InvoiceLine[0].LineExtensionAmount.value}`)
      // 明細-税（消費税／軽減税率／不課税／免税／非課税）
      const taxCategory = {
        'JP 不課税 0%': '不課税',
        'JP 免税 0%': '免税',
        'JP 消費税 10%': '消費税',
        'JP 消費税(軽減税率) 8%': '軽減税率',
        'JP 非課税 0%': '非課税'
      }
      expect(csvBody).toContain(
        `${taxCategory[checkingData.InvoiceLine[0].TaxTotal[0].TaxSubtotal[0].TaxCategory.TaxScheme.Name.value]}`
      )
      // 明細-備考
      expect(csvBody).toContain(
        `${
          checkingData.InvoiceLine[0].DocumentReference ? checkingData.InvoiceLine[0].DocumentReference[0].ID.value : ''
        }`
      )
    })

    test('正常:条件検索（販売/購入 - 販売）', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[0] }
      request.body = {
        invoiceNumber: 'A01001',
        status: status[0],
        buyAndSell: '販売',
        minIssuedate: '2021-08-01',
        maxIssuedate: '2021-11-09',
        minDueDate: '',
        maxDueDate: '',
        minDeliveryDate: '',
        maxDeliveryDate: ''
      }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[0])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[0])

      tenantControllerFindOneSpy.mockReturnValue(Tenants[0])

      contractControllerFindContractSpyon.mockReturnValue(Contracts[0])
      // 試験実施
      await csvDownload.cbPostIndex(request, response, next)

      // 期待結果
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
      expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
      // responseのヘッダ
      const today = new Date().toISOString().split('T')[0]
      expect(response.setHeader().headers['Content-Disposition']).toContain('attachment; filename=')
      expect(response.setHeader().headers['Content-Disposition']).toContain(`${today}`)
      expect(response.setHeader().headers['Content-Disposition']).toContain('A01001')

      // responseのcsvファイル
      const csvHeader = response.setHeader().body.split('\r\n')[0]
      const csvBody = response.setHeader().body.split('\r\n')[1]
      const checkingData = require('../mockInvoice/invoice1')
      expect(csvHeader).toBe(
        `${String.fromCharCode(
          0xfeff
        )}発行日,請求書番号,テナントID,支払期日,納品日,備考,銀行名,支店名,科目,口座番号,口座名義,その他特記事項,明細-項目ID,明細-内容,明細-数量,明細-単位,明細-単価,明細-税（消費税／軽減税率／不課税／免税／非課税）,明細-備考`
      )
      // 発行日
      expect(csvBody).toContain(`${checkingData.IssueDate.value}`)
      // 請求書番号
      expect(csvBody).toContain(`${checkingData.ID.value}`)
      // テナントID
      expect(csvBody).toContain(`${checkingData.AccountingCustomerParty.Party.PartyIdentification[0].ID.value}`)
      // 支払期日
      expect(csvBody).toContain(`${checkingData.PaymentMeans[0]?.PaymentDueDate?.value ?? ''}`)
      // 納品日
      expect(csvBody).toContain(`${checkingData.Delivery[0].ActualDeliveryDate?.value}`)
      // 備考
      expect(csvBody).toContain(`${checkingData.AdditionalDocumentReference[0].ID.value}`)
      // 銀行名
      expect(csvBody).toContain(
        `${
          checkingData.PaymentMeans[0].PayeeFinancialAccount?.FinancialInstitutionBranch?.FinancialInstitution?.Name
            .value ?? ''
        }`
      )
      // 支店名
      expect(csvBody).toContain(
        `${checkingData.PaymentMeans[0].PayeeFinancialAccount?.FinancialInstitutionBranch?.Name.value ?? ''}`
      )
      // 科目
      expect(csvBody).toContain(
        `${checkingData.PaymentMeans[0].PayeeFinancialAccount?.AccountTypeCode?.value === 'General' ? '普通' : '当座'}`
      )
      // 口座番号
      expect(csvBody).toContain(`${checkingData.PaymentMeans[0].PayeeFinancialAccount?.ID?.value ?? ''}`)
      // 口座名義
      expect(csvBody).toContain(
        `${checkingData.PaymentMeans[0].PayeeFinancialAccount?.FinancialInstitutionBranch?.Name.value ?? ''}`
      )
      // その他特記事項
      expect(csvBody).toContain(`${checkingData.PaymentMeans[0].PayeeFinancialAccount?.Name?.value ?? ''}`)
      // 明細-項目ID
      expect(csvBody).toContain(`${checkingData.Note[0].value}`)
      // 明細-内容
      expect(csvBody).toContain(`${checkingData.InvoiceLine[0].Item.Description[0].value}`)
      // 明細-数量
      expect(csvBody).toContain(`${checkingData.InvoiceLine[0].InvoicedQuantity.value}`)
      // 明細-単位
      const bconCsvUnitcode = require('../../Application/lib/bconCsvUnitcode')
      const unitCodeKeys = Object.keys(bconCsvUnitcode)
      let resultOfUnitSearch
      unitCodeKeys.some((item) => {
        if (`${checkingData.InvoiceLine[0].InvoicedQuantity.unitCode}` === bconCsvUnitcode[item]) {
          resultOfUnitSearch = item
          return true
        }
        return false
      })
      expect(csvBody).toContain(`${resultOfUnitSearch}`)
      // 明細-単価
      expect(csvBody).toContain(`${checkingData.InvoiceLine[0].LineExtensionAmount.value}`)
      // 明細-税（消費税／軽減税率／不課税／免税／非課税）
      const taxCategory = {
        'JP 不課税 0%': '不課税',
        'JP 免税 0%': '免税',
        'JP 消費税 10%': '消費税',
        'JP 消費税(軽減税率) 8%': '軽減税率',
        'JP 非課税 0%': '非課税'
      }
      expect(csvBody).toContain(
        `${taxCategory[checkingData.InvoiceLine[0].TaxTotal[0].TaxSubtotal[0].TaxCategory.TaxScheme.Name.value]}`
      )
      // 明細-備考
      expect(csvBody).toContain(
        `${
          checkingData.InvoiceLine[0].DocumentReference ? checkingData.InvoiceLine[0].DocumentReference[0].ID.value : ''
        }`
      )
    })

    test('正常:条件検索（販売/購入 - 購入）', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[0] }
      request.body = {
        invoiceNumber: 'A01001',
        status: status[0],
        buyAndSell: '購入',
        minIssuedate: '2021-08-01',
        maxIssuedate: '2021-11-09',
        minDueDate: '',
        maxDueDate: '',
        minDeliveryDate: '',
        maxDeliveryDate: ''
      }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[0])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[0])

      tenantControllerFindOneSpy.mockReturnValue(Tenants[0])

      contractControllerFindContractSpyon.mockReturnValue(Contracts[0])
      // 試験実施
      await csvDownload.cbPostIndex(request, response, next)

      // 期待結果
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
      expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
      // responseのヘッダ
      const today = new Date().toISOString().split('T')[0]
      expect(response.setHeader().headers['Content-Disposition']).toContain('attachment; filename=')
      expect(response.setHeader().headers['Content-Disposition']).toContain(`${today}`)
      expect(response.setHeader().headers['Content-Disposition']).toContain('A01001')

      // responseのcsvファイル
      const csvHeader = response.setHeader().body.split('\r\n')[0]
      const csvBody = response.setHeader().body.split('\r\n')[1]
      const checkingData = require('../mockInvoice/invoice1')
      expect(csvHeader).toBe(
        `${String.fromCharCode(
          0xfeff
        )}発行日,請求書番号,テナントID,支払期日,納品日,備考,銀行名,支店名,科目,口座番号,口座名義,その他特記事項,明細-項目ID,明細-内容,明細-数量,明細-単位,明細-単価,明細-税（消費税／軽減税率／不課税／免税／非課税）,明細-備考`
      )
      // 発行日
      expect(csvBody).toContain(`${checkingData.IssueDate.value}`)
      // 請求書番号
      expect(csvBody).toContain(`${checkingData.ID.value}`)
      // テナントID
      expect(csvBody).toContain(`${checkingData.AccountingCustomerParty.Party.PartyIdentification[0].ID.value}`)
      // 支払期日
      expect(csvBody).toContain(`${checkingData.PaymentMeans[0]?.PaymentDueDate?.value ?? ''}`)
      // 納品日
      expect(csvBody).toContain(`${checkingData.Delivery[0].ActualDeliveryDate?.value}`)
      // 備考
      expect(csvBody).toContain(`${checkingData.AdditionalDocumentReference[0].ID.value}`)
      // 銀行名
      expect(csvBody).toContain(
        `${
          checkingData.PaymentMeans[0].PayeeFinancialAccount?.FinancialInstitutionBranch?.FinancialInstitution?.Name
            .value ?? ''
        }`
      )
      // 支店名
      expect(csvBody).toContain(
        `${checkingData.PaymentMeans[0].PayeeFinancialAccount?.FinancialInstitutionBranch?.Name.value ?? ''}`
      )
      // 科目
      expect(csvBody).toContain(
        `${checkingData.PaymentMeans[0].PayeeFinancialAccount?.AccountTypeCode?.value === 'General' ? '普通' : '当座'}`
      )
      // 口座番号
      expect(csvBody).toContain(`${checkingData.PaymentMeans[0].PayeeFinancialAccount?.ID?.value ?? ''}`)
      // 口座名義
      expect(csvBody).toContain(
        `${checkingData.PaymentMeans[0].PayeeFinancialAccount?.FinancialInstitutionBranch?.Name.value ?? ''}`
      )
      // その他特記事項
      expect(csvBody).toContain(`${checkingData.PaymentMeans[0].PayeeFinancialAccount?.Name?.value ?? ''}`)
      // 明細-項目ID
      expect(csvBody).toContain(`${checkingData.Note[0].value}`)
      // 明細-内容
      expect(csvBody).toContain(`${checkingData.InvoiceLine[0].Item.Description[0].value}`)
      // 明細-数量
      expect(csvBody).toContain(`${checkingData.InvoiceLine[0].InvoicedQuantity.value}`)
      // 明細-単位
      const bconCsvUnitcode = require('../../Application/lib/bconCsvUnitcode')
      const unitCodeKeys = Object.keys(bconCsvUnitcode)
      let resultOfUnitSearch
      unitCodeKeys.some((item) => {
        if (`${checkingData.InvoiceLine[0].InvoicedQuantity.unitCode}` === bconCsvUnitcode[item]) {
          resultOfUnitSearch = item
          return true
        }
        return false
      })
      expect(csvBody).toContain(`${resultOfUnitSearch}`)
      // 明細-単価
      expect(csvBody).toContain(`${checkingData.InvoiceLine[0].LineExtensionAmount.value}`)
      // 明細-税（消費税／軽減税率／不課税／免税／非課税）
      const taxCategory = {
        'JP 不課税 0%': '不課税',
        'JP 免税 0%': '免税',
        'JP 消費税 10%': '消費税',
        'JP 消費税(軽減税率) 8%': '軽減税率',
        'JP 非課税 0%': '非課税'
      }
      expect(csvBody).toContain(
        `${taxCategory[checkingData.InvoiceLine[0].TaxTotal[0].TaxSubtotal[0].TaxCategory.TaxScheme.Name.value]}`
      )
      // 明細-備考
      expect(csvBody).toContain(
        `${
          checkingData.InvoiceLine[0].DocumentReference ? checkingData.InvoiceLine[0].DocumentReference[0].ID.value : ''
        }`
      )
    })

    test('正常:検索結果201件', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[0] }
      request.body = {
        invoiceNumber: 'A01006'
      }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[0])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[0])

      tenantControllerFindOneSpy.mockReturnValue(Tenants[0])

      contractControllerFindContractSpyon.mockReturnValue(Contracts[0])
      // 試験実施
      await csvDownload.cbPostIndex(request, response, next)

      // 期待結果
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
      expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
      // responseのヘッダ
      const today = new Date().toISOString().split('T')[0]
      expect(response.setHeader().headers['Content-Disposition']).toContain('attachment; filename=')
      expect(response.setHeader().headers['Content-Disposition']).toContain(`${today}`)
      expect(response.setHeader().headers['Content-Disposition']).toContain('A01006')

      // responseのcsvファイル
      const csvHeader = response.setHeader().body.split('\r\n')[0]

      const checkingData = require('../mockInvoice/invoice6')
      expect(csvHeader).toBe(
        `${String.fromCharCode(
          0xfeff
        )}発行日,請求書番号,テナントID,支払期日,納品日,備考,銀行名,支店名,科目,口座番号,口座名義,その他特記事項,明細-項目ID,明細-内容,明細-数量,明細-単位,明細-単価,明細-税（消費税／軽減税率／不課税／免税／非課税）,明細-備考`
      )
      for (let idx = 0; idx < 201; idx++) {
        const csvBody = response.setHeader().body.split('\r\n')[idx + 1]
        // 発行日
        expect(csvBody).toContain(`${checkingData.IssueDate.value}`)
        // 請求書番号
        expect(csvBody).toContain(`${checkingData.ID.value}`)
        // テナントID
        expect(csvBody).toContain(`${checkingData.AccountingCustomerParty.Party.PartyIdentification[0].ID.value}`)
        // 支払期日
        expect(csvBody).toContain(`${checkingData.PaymentMeans[0].PaymentDueDate?.value ?? ''}`)
        // 納品日
        expect(csvBody).toContain(`${checkingData.Delivery[0].ActualDeliveryDate?.value ?? ''}`)
        // 備考
        expect(csvBody).toContain(`${checkingData.AdditionalDocumentReference[0].ID.value}`)
        // 銀行名
        expect(csvBody).toContain(
          `${
            checkingData.PaymentMeans[0].PayeeFinancialAccount?.FinancialInstitutionBranch?.FinancialInstitution?.Name
              .value ?? ''
          }`
        )
        // 支店名
        expect(csvBody).toContain(
          `${checkingData.PaymentMeans[0].PayeeFinancialAccount?.FinancialInstitutionBranch?.Name.value ?? ''}`
        )
        // 科目
        expect(csvBody).toContain(
          `${
            checkingData.PaymentMeans[0].PayeeFinancialAccount?.AccountTypeCode?.value === 'General' ? '普通' : '当座'
          }`
        )
        // 口座番号
        expect(csvBody).toContain(`${checkingData.PaymentMeans[0].PayeeFinancialAccount?.ID?.value ?? ''}`)
        // 口座名義
        expect(csvBody).toContain(
          `${checkingData.PaymentMeans[0].PayeeFinancialAccount?.FinancialInstitutionBranch?.Name.value ?? ''}`
        )
        // その他特記事項
        expect(csvBody).toContain(`${checkingData.PaymentMeans[0].PayeeFinancialAccount?.Name?.value ?? ''}`)
        // 明細-項目ID
        expect(csvBody).toContain(`${checkingData.Note[0].value}`)
        // 明細-内容
        expect(csvBody).toContain(`${checkingData.InvoiceLine[0].Item.Description[0].value}`)
        // 明細-数量
        expect(csvBody).toContain(`${checkingData.InvoiceLine[0].InvoicedQuantity.value}`)
        // 明細-単位
        const bconCsvUnitcode = require('../../Application/lib/bconCsvUnitcode')
        const unitCodeKeys = Object.keys(bconCsvUnitcode)
        let resultOfUnitSearch
        unitCodeKeys.some((item) => {
          if (`${checkingData.InvoiceLine[0].InvoicedQuantity.unitCode}` === bconCsvUnitcode[item]) {
            resultOfUnitSearch = item
            return true
          }
          return false
        })
        expect(csvBody).toContain(`${resultOfUnitSearch}`)
        // 明細-単価
        expect(csvBody).toContain(`${checkingData.InvoiceLine[0].LineExtensionAmount.value}`)
        // 明細-税（消費税／軽減税率／不課税／免税／非課税）
        const taxCategory = {
          'JP 不課税 0%': '不課税',
          'JP 免税 0%': '免税',
          'JP 消費税 10%': '消費税',
          'JP 消費税(軽減税率) 8%': '軽減税率',
          'JP 非課税 0%': '非課税'
        }
        expect(csvBody).toContain(
          `${taxCategory[checkingData.InvoiceLine[idx].TaxTotal[0].TaxSubtotal[0].TaxCategory.TaxScheme.Name.value]}`
        )
        // 明細-備考
        expect(csvBody).toContain(
          `${
            checkingData.InvoiceLine[0].DocumentReference
              ? checkingData.InvoiceLine[0].DocumentReference[0].ID.value
              : ''
          }`
        )
      }
    })

    test('正常:テナントIDがない請求書の場合', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[0] }
      request.body = {
        invoiceNumber: 'A01011',
        status: 'すべて',
        buyAndSell: '購入',
        minIssuedate: '2021-08-01',
        maxIssuedate: '2021-11-09',
        minDueDate: '',
        maxDueDate: '',
        minDeliveryDate: '',
        maxDeliveryDate: ''
      }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[0])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[0])

      tenantControllerFindOneSpy.mockReturnValue(Tenants[0])

      contractControllerFindContractSpyon.mockReturnValue(Contracts[0])
      // 試験実施
      await csvDownload.cbPostIndex(request, response, next)

      // 期待結果
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
      expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
      // responseのヘッダ
      const today = new Date().toISOString().split('T')[0]
      expect(response.setHeader().headers['Content-Disposition']).toContain('attachment; filename=')
      expect(response.setHeader().headers['Content-Disposition']).toContain(`${today}`)
      expect(response.setHeader().headers['Content-Disposition']).toContain('A01011')

      // responseのcsvファイル
      const csvHeader = response.setHeader().body.split('\r\n')[0]
      const csvBody = response.setHeader().body.split('\r\n')[1]
      const checkingData = require('../mockInvoice/invoice9')
      expect(csvHeader).toBe(
        `${String.fromCharCode(
          0xfeff
        )}発行日,請求書番号,テナントID,支払期日,納品日,備考,銀行名,支店名,科目,口座番号,口座名義,その他特記事項,明細-項目ID,明細-内容,明細-数量,明細-単位,明細-単価,明細-税（消費税／軽減税率／不課税／免税／非課税）,明細-備考`
      )
      // 発行日
      expect(csvBody).toContain(`${checkingData.IssueDate.value}`)
      // 請求書番号
      expect(csvBody).toContain(`${checkingData.ID.value}`)
      // 支払期日
      expect(csvBody).toContain(`${checkingData.PaymentMeans[0]?.PaymentDueDate?.value ?? ''}`)
      // 納品日
      expect(csvBody).toContain(`${checkingData.Delivery[0].ActualDeliveryDate?.value}`)
      // 備考
      expect(csvBody).toContain(`${checkingData.AdditionalDocumentReference[0].ID.value}`)
      // 銀行名
      expect(csvBody).toContain(
        `${
          checkingData.PaymentMeans[0].PayeeFinancialAccount?.FinancialInstitutionBranch?.FinancialInstitution?.Name
            .value ?? ''
        }`
      )
      // 支店名
      expect(csvBody).toContain(
        `${checkingData.PaymentMeans[0].PayeeFinancialAccount?.FinancialInstitutionBranch?.Name.value ?? ''}`
      )
      // 科目
      expect(csvBody).toContain(
        `${checkingData.PaymentMeans[0].PayeeFinancialAccount?.AccountTypeCode?.value === 'General' ? '普通' : '当座'}`
      )
      // 口座番号
      expect(csvBody).toContain(`${checkingData.PaymentMeans[0].PayeeFinancialAccount?.ID?.value ?? ''}`)
      // 口座名義
      expect(csvBody).toContain(
        `${checkingData.PaymentMeans[0].PayeeFinancialAccount?.FinancialInstitutionBranch?.Name.value ?? ''}`
      )
      // その他特記事項
      expect(csvBody).toContain(`${checkingData.PaymentMeans[0].PayeeFinancialAccount?.Name?.value ?? ''}`)
      // 明細-項目ID
      expect(csvBody).toContain(`${checkingData.Note[0].value}`)
      // 明細-内容
      expect(csvBody).toContain(`${checkingData.InvoiceLine[0].Item.Description[0].value}`)
      // 明細-数量
      expect(csvBody).toContain(`${checkingData.InvoiceLine[0].InvoicedQuantity.value}`)
      // 明細-単位
      const bconCsvUnitcode = require('../../Application/lib/bconCsvUnitcode')
      const unitCodeKeys = Object.keys(bconCsvUnitcode)
      let resultOfUnitSearch
      unitCodeKeys.some((item) => {
        if (`${checkingData.InvoiceLine[0].InvoicedQuantity.unitCode}` === bconCsvUnitcode[item]) {
          resultOfUnitSearch = item
          return true
        }
        return false
      })
      expect(csvBody).toContain(`${resultOfUnitSearch}`)
      // 明細-単価
      expect(csvBody).toContain(`${checkingData.InvoiceLine[0].LineExtensionAmount.value}`)
      // 明細-税（消費税／軽減税率／不課税／免税／非課税）
      const taxCategory = {
        'JP 不課税 0%': '不課税',
        'JP 免税 0%': '免税',
        'JP 消費税 10%': '消費税',
        'JP 消費税(軽減税率) 8%': '軽減税率',
        'JP 非課税 0%': '非課税'
      }
      expect(csvBody).toContain(
        `${taxCategory[checkingData.InvoiceLine[0].TaxTotal[0].TaxSubtotal[0].TaxCategory.TaxScheme.Name.value]}`
      )
      // 明細-備考
      expect(csvBody).toContain(
        `${
          checkingData.InvoiceLine[0].DocumentReference ? checkingData.InvoiceLine[0].DocumentReference[0].ID.value : ''
        }`
      )
    })

    test('正常:請求書複数の場合', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[0] }
      request.body = {
        invoiceNumber: '',
        buyAndSell: buyAndSell[0],
        minIssuedate: '2021-08-01',
        maxIssuedate: '2021-11-09',
        minDueDate: '',
        maxDueDate: '',
        minDeliveryDate: '',
        maxDeliveryDate: ''
      }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[0])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[0])

      tenantControllerFindOneSpy.mockReturnValue(Tenants[0])

      contractControllerFindContractSpyon.mockReturnValue(Contracts[0])

      // 試験実施
      await csvDownload.cbPostIndex(request, response, next)

      // 期待結果
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
      expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
      // responseのヘッダ
      const today = new Date().toISOString().split('T')[0]
      expect(response.setHeader().headers['Content-Disposition']).toContain('attachment; filename=')
      expect(response.setHeader().headers['Content-Disposition']).toContain(`${today}`)
      expect(response.setHeader().headers['Content-Disposition']).toContain(encodeURIComponent('請求書.csv'))

      // responseのcsvファイル
      const csvHeader = response.setHeader().body.split('\r\n')[0]

      expect(csvHeader).toBe(
        `${String.fromCharCode(
          0xfeff
        )}発行日,請求書番号,テナントID,支払期日,納品日,備考,銀行名,支店名,科目,口座番号,口座名義,その他特記事項,明細-項目ID,明細-内容,明細-数量,明細-単位,明細-単価,明細-税（消費税／軽減税率／不課税／免税／非課税）,明細-備考`
      )
    })

    test('準正常:請求書複数の場合のAPIエラー', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[0] }
      request.body = {
        invoiceNumber: '',
        buyAndSell: buyAndSell[0],
        minIssuedate: '1990-01-01',
        maxIssuedate: '2021-11-09',
        minDueDate: '',
        maxDueDate: '',
        minDeliveryDate: '',
        maxDeliveryDate: ''
      }

      request.flash = jest.fn()

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[0])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[0])

      tenantControllerFindOneSpy.mockReturnValue(Tenants[0])

      contractControllerFindContractSpyon.mockReturnValue(Contracts[0])

      // 試験実施
      await csvDownload.cbPostIndex(request, response, next)

      // 期待結果
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
      expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
      // request.flashが呼ばれ「る」
      expect(request.flash).toHaveBeenCalledWith(
        'noti',
        'APIエラーが発生しました。時間を空けてもう一度試してください。'
      )
      // ポータルにリダイレクト「される」
      expect(response.redirect).toHaveBeenCalledWith(303, '/csvDownload')
      expect(response.getHeader('Location')).toEqual('/csvDownload')
    })

    test('準正常:請求書番号APIエラー', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[0] }
      request.body = {
        invoiceNumber: 'A01009'
      }

      request.flash = jest.fn()

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[0])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[0])

      tenantControllerFindOneSpy.mockReturnValue(Tenants[0])

      contractControllerFindContractSpyon.mockReturnValue(Contracts[0])
      // 試験実施
      await csvDownload.cbPostIndex(request, response, next)

      // 期待結果
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
      expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
      // request.flashが呼ばれ「る」
      expect(request.flash).toHaveBeenCalledWith(
        'noti',
        'APIエラーが発生しました。時間を空けてもう一度試してください。'
      )
      // ポータルにリダイレクト「される」
      expect(response.redirect).toHaveBeenCalledWith(303, '/csvDownload')
      expect(response.getHeader('Location')).toEqual('/csvDownload')
    })

    test('準正常:請求書番号（UUID）APIエラー', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[0] }
      request.body = {
        invoiceNumber: 'A01010'
      }

      request.flash = jest.fn()

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[0])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[0])

      tenantControllerFindOneSpy.mockReturnValue(Tenants[0])

      contractControllerFindContractSpyon.mockReturnValue(Contracts[0])
      // 試験実施
      await csvDownload.cbPostIndex(request, response, next)

      // 期待結果
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
      expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
      // request.flashが呼ばれ「る」
      expect(request.flash).toHaveBeenCalledWith(
        'noti',
        'APIエラーが発生しました。時間を空けてもう一度試してください。'
      )
      // ポータルにリダイレクト「される」
      expect(response.redirect).toHaveBeenCalledWith(303, '/csvDownload')
      expect(response.getHeader('Location')).toEqual('/csvDownload')
    })

    test('準正常:完全一致結果なし', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[0] }
      request.body = {
        invoiceNumber: 'A'
      }

      request.flash = jest.fn()

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[0])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[0])

      tenantControllerFindOneSpy.mockReturnValue(Tenants[0])

      contractControllerFindContractSpyon.mockReturnValue(Contracts[0])
      // 試験実施
      await csvDownload.cbPostIndex(request, response, next)

      // 期待結果
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
      expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
      // request.flashが呼ばれ「る」
      expect(request.flash).toHaveBeenCalledWith('noti', '条件に合致する請求書が見つかりませんでした。')
      // ポータルにリダイレクト「される」
      expect(response.redirect).toHaveBeenCalledWith(303, '/csvDownload')
      expect(response.getHeader('Location')).toEqual('/csvDownload')
    })

    test('準正常:支払期日なし', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[0] }
      request.body = {
        invoiceNumber: 'A01002'
      }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[0])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[0])

      tenantControllerFindOneSpy.mockReturnValue(Tenants[0])

      contractControllerFindContractSpyon.mockReturnValue(Contracts[0])
      // 試験実施
      await csvDownload.cbPostIndex(request, response, next)

      // 期待結果
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
      expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
      // responseのヘッダ
      const today = new Date().toISOString().split('T')[0]
      expect(response.setHeader().headers['Content-Disposition']).toContain('attachment; filename=')
      expect(response.setHeader().headers['Content-Disposition']).toContain(`${today}`)
      expect(response.setHeader().headers['Content-Disposition']).toContain('A01002')

      // responseのcsvファイル
      const csvHeader = response.setHeader().body.split('\r\n')[0]

      const checkingData = require('../mockInvoice/invoice2')
      expect(csvHeader).toBe(
        `${String.fromCharCode(
          0xfeff
        )}発行日,請求書番号,テナントID,支払期日,納品日,備考,銀行名,支店名,科目,口座番号,口座名義,その他特記事項,明細-項目ID,明細-内容,明細-数量,明細-単位,明細-単価,明細-税（消費税／軽減税率／不課税／免税／非課税）,明細-備考`
      )

      const csvBody = response.setHeader().body.split('\r\n')[1]
      // 発行日
      expect(csvBody).toContain(`${checkingData.IssueDate.value}`)
      // 請求書番号
      expect(csvBody).toContain(`${checkingData.ID.value}`)
      // テナントID
      expect(csvBody).toContain(`${checkingData.AccountingCustomerParty.Party.PartyIdentification[0].ID.value}`)
      // 支払期日
      expect(csvBody).toContain(`${checkingData.PaymentMeans[0].PaymentDueDate?.value ?? ''}`)
      // 納品日
      expect(csvBody).toContain(`${checkingData.Delivery[0].ActualDeliveryDate?.value}`)
      // 備考
      expect(csvBody).toContain(`${checkingData.AdditionalDocumentReference[0].ID.value}`)
      // 銀行名
      expect(csvBody).toContain(
        `${
          checkingData.PaymentMeans[0].PayeeFinancialAccount?.FinancialInstitutionBranch?.FinancialInstitution?.Name
            .value ?? ''
        }`
      )
      // 支店名
      expect(csvBody).toContain(
        `${checkingData.PaymentMeans[0].PayeeFinancialAccount?.FinancialInstitutionBranch?.Name.value ?? ''}`
      )
      // 科目
      expect(csvBody).toContain(
        `${checkingData.PaymentMeans[0].PayeeFinancialAccount?.AccountTypeCode?.value === 'General' ? '普通' : '当座'}`
      )
      // 口座番号
      expect(csvBody).toContain(`${checkingData.PaymentMeans[0].PayeeFinancialAccount?.ID?.value ?? ''}`)
      // 口座名義
      expect(csvBody).toContain(
        `${checkingData.PaymentMeans[0].PayeeFinancialAccount?.FinancialInstitutionBranch?.Name.value ?? ''}`
      )
      // その他特記事項
      expect(csvBody).toContain(`${checkingData.PaymentMeans[0].PayeeFinancialAccount?.Name?.value ?? ''}`)
      // 明細-項目ID
      expect(csvBody).toContain(`${checkingData.Note[0].value}`)
      // 明細-内容
      expect(csvBody).toContain(`${checkingData.InvoiceLine[0].Item.Description[0].value}`)
      // 明細-数量
      expect(csvBody).toContain(`${checkingData.InvoiceLine[0].InvoicedQuantity.value}`)
      // 明細-単位
      const bconCsvUnitcode = require('../../Application/lib/bconCsvUnitcode')
      const unitCodeKeys = Object.keys(bconCsvUnitcode)
      let resultOfUnitSearch
      unitCodeKeys.some((item) => {
        if (`${checkingData.InvoiceLine[0].InvoicedQuantity.unitCode}` === bconCsvUnitcode[item]) {
          resultOfUnitSearch = item
          return true
        }
        return false
      })
      expect(csvBody).toContain(`${resultOfUnitSearch}`)
      // 明細-単価
      expect(csvBody).toContain(`${checkingData.InvoiceLine[0].LineExtensionAmount.value}`)
      // 明細-税（消費税／軽減税率／不課税／免税／非課税）
      const taxCategory = {
        'JP 不課税 0%': '不課税',
        'JP 免税 0%': '免税',
        'JP 消費税 10%': '消費税',
        'JP 消費税(軽減税率) 8%': '軽減税率',
        'JP 非課税 0%': '非課税'
      }
      expect(csvBody).toContain(
        `${taxCategory[checkingData.InvoiceLine[0].TaxTotal[0].TaxSubtotal[0].TaxCategory.TaxScheme.Name.value]}`
      )
      // 明細-備考
      expect(csvBody).toContain(
        `${
          checkingData.InvoiceLine[0].DocumentReference ? checkingData.InvoiceLine[0].DocumentReference[0].ID.value : ''
        }`
      )
    })

    test('準正常:税:JP 消費税 10%', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[0] }
      request.body = {
        invoiceNumber: 'A01003'
      }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[0])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[0])

      tenantControllerFindOneSpy.mockReturnValue(Tenants[0])

      contractControllerFindContractSpyon.mockReturnValue(Contracts[0])
      // 試験実施
      await csvDownload.cbPostIndex(request, response, next)

      // 期待結果
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
      expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
      // responseのヘッダ
      const today = new Date().toISOString().split('T')[0]
      expect(response.setHeader().headers['Content-Disposition']).toContain('attachment; filename=')
      expect(response.setHeader().headers['Content-Disposition']).toContain(`${today}`)
      expect(response.setHeader().headers['Content-Disposition']).toContain('A01003')

      // responseのcsvファイル
      const csvHeader = response.setHeader().body.split('\r\n')[0]

      const checkingData = require('../mockInvoice/invoice3')
      expect(csvHeader).toBe(
        `${String.fromCharCode(
          0xfeff
        )}発行日,請求書番号,テナントID,支払期日,納品日,備考,銀行名,支店名,科目,口座番号,口座名義,その他特記事項,明細-項目ID,明細-内容,明細-数量,明細-単位,明細-単価,明細-税（消費税／軽減税率／不課税／免税／非課税）,明細-備考`
      )

      const csvBody = response.setHeader().body.split('\r\n')[1]
      // 発行日
      expect(csvBody).toContain(`${checkingData.IssueDate.value}`)
      // 請求書番号
      expect(csvBody).toContain(`${checkingData.ID.value}`)
      // テナントID
      expect(csvBody).toContain(`${checkingData.AccountingCustomerParty.Party.PartyIdentification[0].ID.value}`)
      // 支払期日
      expect(csvBody).toContain(`${checkingData.PaymentMeans[0].PaymentDueDate?.value ?? ''}`)
      // 納品日
      expect(csvBody).toContain(`${checkingData.Delivery[0].ActualDeliveryDate?.value}`)
      // 備考
      expect(csvBody).toContain(`${checkingData.AdditionalDocumentReference[0].ID.value}`)
      // 銀行名
      expect(csvBody).toContain(
        `${
          checkingData.PaymentMeans[0].PayeeFinancialAccount?.FinancialInstitutionBranch?.FinancialInstitution?.Name
            .value ?? ''
        }`
      )
      // 支店名
      expect(csvBody).toContain(
        `${checkingData.PaymentMeans[0].PayeeFinancialAccount?.FinancialInstitutionBranch?.Name.value ?? ''}`
      )
      // 科目
      expect(csvBody).toContain(
        `${checkingData.PaymentMeans[0].PayeeFinancialAccount?.AccountTypeCode?.value === 'General' ? '普通' : '当座'}`
      )
      // 口座番号
      expect(csvBody).toContain(`${checkingData.PaymentMeans[0].PayeeFinancialAccount?.ID?.value ?? ''}`)
      // 口座名義
      expect(csvBody).toContain(
        `${checkingData.PaymentMeans[0].PayeeFinancialAccount?.FinancialInstitutionBranch?.Name.value ?? ''}`
      )
      // その他特記事項
      expect(csvBody).toContain(`${checkingData.PaymentMeans[0].PayeeFinancialAccount?.Name?.value ?? ''}`)
      // 明細-項目ID
      expect(csvBody).toContain(`${checkingData.Note[0].value}`)
      // 明細-内容
      expect(csvBody).toContain(`${checkingData.InvoiceLine[0].Item.Description[0].value}`)
      // 明細-数量
      expect(csvBody).toContain(`${checkingData.InvoiceLine[0].InvoicedQuantity.value}`)
      // 明細-単位
      const bconCsvUnitcode = require('../../Application/lib/bconCsvUnitcode')
      const unitCodeKeys = Object.keys(bconCsvUnitcode)
      let resultOfUnitSearch
      unitCodeKeys.some((item) => {
        if (`${checkingData.InvoiceLine[0].InvoicedQuantity.unitCode}` === bconCsvUnitcode[item]) {
          resultOfUnitSearch = item
          return true
        }
        return false
      })
      expect(csvBody).toContain(`${resultOfUnitSearch}`)
      // 明細-単価
      expect(csvBody).toContain(`${checkingData.InvoiceLine[0].LineExtensionAmount.value}`)
      // 明細-税（消費税／軽減税率／不課税／免税／非課税）
      const taxCategory = {
        O: '不課税',
        E: '免税',
        S: '消費税',
        AA: '軽減税率',
        Z: '非課税'
      }
      expect(csvBody).toContain(`${taxCategory[checkingData.TaxTotal[0].TaxSubtotal[0].TaxCategory.ID.value]}`)
      // 明細-備考
      expect(csvBody).toContain(
        `${
          checkingData.InvoiceLine[0].DocumentReference ? checkingData.InvoiceLine[0].DocumentReference[0].ID.value : ''
        }`
      )
    })

    test('準正常:明細書0件', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[0] }
      request.body = {
        invoiceNumber: 'A01000'
      }
      request.flash = jest.fn()

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[0])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[0])

      tenantControllerFindOneSpy.mockReturnValue(Tenants[0])

      contractControllerFindContractSpyon.mockReturnValue(Contracts[0])
      // 試験実施
      await csvDownload.cbPostIndex(request, response, next)

      // 期待結果
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
      expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
      // request.flashが呼ばれ「る」
      expect(request.flash).toHaveBeenCalledWith('noti', '条件に合致する請求書が見つかりませんでした。')
      // ポータルにリダイレクト「される」
      expect(response.redirect).toHaveBeenCalledWith(303, '/csvDownload')
      expect(response.getHeader('Location')).toEqual('/csvDownload')
    })

    test('正常：解約申込中の場合', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[1] }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[1])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[1])

      tenantControllerFindOneSpy.mockReturnValue(Tenants[1])

      contractControllerFindContractSpyon.mockReturnValue(Contracts[1])

      // 試験実施
      await csvDownload.cbPostIndex(request, response, next)

      // 期待結果
      // 404，500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(500))
      // statusCodeが400である
      expect(response.statusCode).toBe(400)
    })

    test('500エラー：requestのsession,userIdがnullの場合', async () => {
      // 試験実施
      await csvDownload.cbPostIndex(request, response, next)

      // 期待結果
      // 404，500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(500))
      // statusCodeが500である
      expect(response.statusCode).toBe(500)
    })

    test('500エラー：user検索の時、DBエラー', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[0] }

      // DBからの正常なユーザデータの取得を想定する
      const userDbError = new Error('User Table Error')
      userControllerFindOneSpy.mockReturnValue(userDbError)
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[1])

      tenantControllerFindOneSpy.mockReturnValue(Tenants[1])

      contractControllerFindContractSpyon.mockReturnValue(Contracts[1])

      // 試験実施
      await csvDownload.cbPostIndex(request, response, next)

      // 期待結果
      // 404，500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(500))
      // statusCodeが500である
      expect(response.statusCode).toBe(500)
    })

    test('500エラー：user.statusが0ではない場合', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[0] }
      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue({ dataValues: { userStatus: 1 } })
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[1])

      tenantControllerFindOneSpy.mockReturnValue(Tenants[1])

      contractControllerFindContractSpyon.mockReturnValue(Contracts[1])

      // 試験実施
      await csvDownload.cbPostIndex(request, response, next)

      // 期待結果
      // 404，500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(500))
      // statusCodeが500である
      expect(response.statusCode).toBe(500)
    })

    test('500エラー：contracts検索の時、DBエラー', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[0] }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[1])
      // DBからの正常な契約情報取得を想定する
      const contractDbError = new Error('Contracts Table Error')
      contractControllerFindOneSpy.mockReturnValue(contractDbError)

      tenantControllerFindOneSpy.mockReturnValue(Tenants[1])

      contractControllerFindContractSpyon.mockReturnValue(contractDbError)

      // 試験実施
      await csvDownload.cbPostIndex(request, response, next)

      // 期待結果
      // 404，500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(500))
      // statusCodeが500である
      expect(response.statusCode).toBe(500)
    })

    test('500エラー：不正なContractStatus、 DBエラー', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[0] }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[1])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[1])

      tenantControllerFindOneSpy.mockReturnValue(Tenants[1])

      contractControllerFindContractSpyon.mockReturnValue(Contracts[1])

      helper.checkContractStatus = (req, res, next) => {
        return 999
      }

      // 試験実施
      await csvDownload.cbPostIndex(request, response, next)

      // 期待結果
      // 404エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(500))
      // statusCodeが500である
      expect(response.statusCode).toBe(500)
    })

    test('異常:APIエラー', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[0] }
      request.body = {
        invoiceNumber: 'A01000'
      }
      request.flash = jest.fn()

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[0])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[0])

      tenantControllerFindOneSpy.mockReturnValue(Tenants[0])

      contractControllerFindContractSpyon.mockReturnValue(Contracts[0])
      // 試験実施
      await csvDownload.errorHandle(
        {
          config: {
            url: 'https://api-sandbox.tradeshift.com/tradeshift/rest/external/docussss?businessId=a',
            method: 'get',
            headers: {
              Accept: 'application/json',
              Authorization:
                'Bearer EVTpG2KBQtKsGQBJpYIg6/NRITF7PGvjXOynKatOFucOvoP3QoACC6ByediXnz5N/YuvstFVw5/ksgIMw1QtFQTZ+QNbY28wnVFQcHa7mOTyq/RXa6Nr6+cYXhZj74lxZrLPZbYEuY47xSmzRDALL65Q69Wnffweo+OJWIaZ3i6ZXn+7e0OIdDUe3b9dju3/l8IupvnysKxGDggCJcb/S9ix8+VEERUSoa8bZJMFFlY8Bk2hqJ0hHKvZFfMxavfgD61gAkbz5J7qB0DByXZEM6mzkzZAVQgZDeErorc2UqeMk4aHONlM0Z52j7XYCdrABznGGnQg746rov7nxDBYLEbUF0ggtPjpK5J/zMMhd2izm38CtqBUTdYWvX8NDYmHIkJGUrDubkjr+JSMBlAAWgIAAWDj6pSMBg==',
              'User-Agent': 'axios/0.21.1'
            },
            timeout: 0,
            xsrfCookieName: 'XSRF-TOKEN',
            xsrfHeaderName: 'X-XSRF-TOKEN',
            maxContentLength: -1,
            maxBodyLength: -1,
            data: undefined
          },
          response: {
            status: 404,
            statusText: 'Not Found',
            headers: {
              date: 'Fri, 05 Nov 2021 13:45:15 GMT',
              'content-type': 'application/json',
              'transfer-encoding': 'chunked',
              connection: 'close',
              vary: 'Accept-Encoding',
              'trace-id': 'f4a33ea31f5d8cda',
              'content-security-policy': 'frame-ancestors: https://sandbox.tradeshift.com;',
              'access-control-allow-origin': '*',
              'strict-transport-security': 'max-age=31536000; includeSubDomains; preload'
            },
            config: {
              url: 'https://api-sandbox.tradeshift.com/tradeshift/rest/external/docussss?businessId=a',
              method: 'get',
              headers: [Object],
              transformRequest: [Array],
              transformResponse: [Array],
              timeout: 0,
              xsrfCookieName: 'XSRF-TOKEN',
              xsrfHeaderName: 'X-XSRF-TOKEN',
              maxContentLength: -1,
              maxBodyLength: -1,
              data: undefined
            }
          },
          isAxiosError: true
        },
        response,
        request
      )

      // 期待結果
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('NotLoggedIn')
      // ポータルにリダイレクト「される」
      expect(response.redirect).toHaveBeenCalledWith(303, '/csvDownload')
      expect(response.getHeader('Location')).toEqual('/csvDownload')
    })

    test('異常:システムエラー', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[0] }
      request.body = {
        invoiceNumber: 'A01000'
      }
      request.flash = jest.fn()

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[0])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[0])

      tenantControllerFindOneSpy.mockReturnValue(Tenants[0])

      contractControllerFindContractSpyon.mockReturnValue(Contracts[0])
      // 試験実施
      await csvDownload.errorHandle(
        {
          config: {
            url: 'https://api-sandbox.tradeshift.com/tradeshift/rest/external/docussss?businessId=a',
            method: 'get',
            headers: {
              Accept: 'application/json',
              Authorization:
                'Bearer EVTpG2KBQtKsGQBJpYIg6/NRITF7PGvjXOynKatOFucOvoP3QoACC6ByediXnz5N/YuvstFVw5/ksgIMw1QtFQTZ+QNbY28wnVFQcHa7mOTyq/RXa6Nr6+cYXhZj74lxZrLPZbYEuY47xSmzRDALL65Q69Wnffweo+OJWIaZ3i6ZXn+7e0OIdDUe3b9dju3/l8IupvnysKxGDggCJcb/S9ix8+VEERUSoa8bZJMFFlY8Bk2hqJ0hHKvZFfMxavfgD61gAkbz5J7qB0DByXZEM6mzkzZAVQgZDeErorc2UqeMk4aHONlM0Z52j7XYCdrABznGGnQg746rov7nxDBYLEbUF0ggtPjpK5J/zMMhd2izm38CtqBUTdYWvX8NDYmHIkJGUrDubkjr+JSMBlAAWgIAAWDj6pSMBg==',
              'User-Agent': 'axios/0.21.1'
            },
            timeout: 0,
            xsrfCookieName: 'XSRF-TOKEN',
            xsrfHeaderName: 'X-XSRF-TOKEN',
            maxContentLength: -1,
            maxBodyLength: -1,
            data: undefined
          },
          response: {
            status: 500,
            statusText: 'Not Found',
            headers: {
              date: 'Fri, 05 Nov 2021 13:45:15 GMT',
              'content-type': 'application/json',
              'transfer-encoding': 'chunked',
              connection: 'close',
              vary: 'Accept-Encoding',
              'trace-id': 'f4a33ea31f5d8cda',
              'content-security-policy': 'frame-ancestors: https://sandbox.tradeshift.com;',
              'access-control-allow-origin': '*',
              'strict-transport-security': 'max-age=31536000; includeSubDomains; preload'
            },
            config: {
              url: 'https://api-sandbox.tradeshift.com/tradeshift/rest/external/docussss?businessId=a',
              method: 'get',
              headers: [Object],
              transformRequest: [Array],
              transformResponse: [Array],
              timeout: 0,
              xsrfCookieName: 'XSRF-TOKEN',
              xsrfHeaderName: 'X-XSRF-TOKEN',
              maxContentLength: -1,
              maxBodyLength: -1,
              data: undefined
            }
          },
          isAxiosError: true
        },
        response,
        request
      )

      // 期待結果
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('NotLoggedIn')
      // ポータルにリダイレクト「される」
      expect(response.redirect).toHaveBeenCalledWith(303, '/csvDownload')
      expect(response.getHeader('Location')).toEqual('/csvDownload')
    })
  })
})
