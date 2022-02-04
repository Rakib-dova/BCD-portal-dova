'use strict'

jest.mock('../../Application/node_modules/express', () => {
  return require('jest-express')
})

const journalDownload = require('../../Application/routes/journalDownload')
const Request = require('jest-express').Request
const Response = require('jest-express').Response
const next = require('jest-express').Next
const helper = require('../../Application/routes/helpers/middleware')
const errorHelper = require('../../Application/routes/helpers/error')
const noticeHelper = require('../../Application/routes/helpers/notice')
const apiManager = require('../../Application/controllers/apiManager.js')
const userController = require('../../Application/controllers/userController.js')
const contractController = require('../../Application/controllers/contractController.js')
const tenantController = require('../../Application/controllers/tenantController.js')
const journalDownloadController = require('../../Application/controllers/journalDownloadController.js')
const logger = require('../../Application/lib/logger.js')
const DOMParser = require('dom-parser')
const notiTitle = '請求書ダウンロード'
const journalDownloadSysError = 'システムエラーが発生しました。時間を空けてもう一度試してください。'
const JournalizeInvoice = require('../../Application/models').JournalizeInvoice
const journalizeResult = new JournalizeInvoice()
journalizeResult.journalId = '388014b9-d667-4144-9cc4-5da420981433'
journalizeResult.contractId = 'f10b95a4-74a1-4691-880a-827c9f1a1faf'
journalizeResult.invoiceId = '3b3ff8ac-f544-4eee-a4b0-0ca7a0edacjs'
journalizeResult.lineNo = 1
journalizeResult.lineId = '1'
journalizeResult.accountCode = 'accountCode'
journalizeResult.subAccountCode = 'subAccountCode'
journalizeResult.installmentAmount = 51222
journalizeResult.createdAt = new Date('2021-07-09T04:30:00.000Z')
journalizeResult.updatedAt = new Date('2021-07-09T04:30:00.000Z')
journalizeResult.journalNo = 'lineAccountCode1'

let request, response, infoSpy
let userControllerFindOneSpy,
  contractControllerFindOneSpy,
  tenantControllerFindOneSpy,
  contractControllerFindContractSpyon,
  journalfindAllSpy,
  getSentToCompanySpy

const dbJournalTable = []
const dbJournal100Table = []
dbJournal100Table.length = 100

for (let idx = 0; idx < 100; ++idx) {
  const item = new JournalizeInvoice()
  const { v4: uuidV4 } = require('uuid')
  item.journalId = uuidV4()
  item.contractId = 'f10b95a4-74a1-4691-880a-827c9f1a1faf'
  item.invoiceId = '3b3ff8ac-f544-4eee-a4b0-0ca7a0edacjs'
  item.lineNo = idx + 1
  item.lineId = `${idx + 1}`
  item.accountCode = `accountCode${idx + 1}`
  item.subAccountCode = `subAccountCode${idx + 1}`
  item.installmentAmount = 51222 + 1
  item.createdAt = new Date('2021-11-25T04:30:00.000Z')
  item.updatedAt = new Date('2021-11-25T04:30:00.000Z')
  item.journalNo = `lineAccountCode${idx + 1}`
  dbJournalTable.push(item)
}

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

const headers =
  '請求書番号,発行日,宛先-テナントID,宛先-会社名,宛先-国/地域,宛先-私書箱,宛先-郵便番号,宛先-都道府県,宛先-市区町村・番地,宛先-ビル、マンション名,宛先-登録番号,宛先-GLN,宛先-法人番号,差出人-テナントID,差出人-会社名,差出人-国/地域,差出人-私書箱,差出人-郵便番号,差出人-都道府県,差出人-市区町村・番地,差出人-ビル、マンション名,差出人-登録番号,差出人-GLN,差出人-法人番号,支払期日,納品日,納品開始日,納品終了日,備考,注文書番号,注文書発行日,参考情報,契約書番号,部門,取引先担当者（アドレス）,輸送情報,Tradeshiftクリアランス,通関識別情報,ID,課税日,販売者の手数料番号,DUNSナンバー,暫定時間,予約番号,為替レート,為替レート-通貨,為替レート-日付,為替レート換算後の税金総額,為替レート-Convertd Document Total(incl taxes),支払方法,支払い条件-割引率,支払い条件-割増率,支払い条件-決済開始日,支払い条件-決済終了日,支払い条件-ペナルティ開始日,支払い条件-ペナルティ終了日,支払い条件-説明,銀行口座-銀行名,銀行口座-支店名,銀行口座-口座番号,銀行口座-科目,銀行口座-口座名義,銀行口座-番地,銀行口座-ビル名 / フロア等,銀行口座-家屋番号,銀行口座-市区町村,銀行口座-都道府県,銀行口座-郵便番号,銀行口座-所在地,銀行口座-国,DirectDebit-銀行名,DirectDebit-支店名,DirectDebit-口座番号,DirectDebit-科目,DirectDebit-口座名義,DirectDebit-番地,DirectDebit-ビル名 / フロア等,DirectDebit-家屋番号,DirectDebit-市区町村,DirectDebit-都道府県,DirectDebit-郵便番号,DirectDebit-所在地,DirectDebit-国,IBAN払い-銀行識別コード / SWIFTコード,IBAN払い-IBAN,IBAN払い-説明,国際電信送金-ABAナンバー,国際電信送金-SWIFTコード,国際電信送金-IBAN,国際電信送金-口座名義,国際電信送金-番地,国際電信送金-ビル名 / フロア等,国際電信送金-家屋番号,国際電信送金-市区町村,国際電信送金-都道府県,国際電信送金-郵便番号,国際電信送金 - 所在地,国際電信送金-国,国際電信送金-説明,支払方法-予備,その他特記事項,明細-項目ID,明細-内容,明細-数量,明細-単位,明細-単価,明細-税（消費税／軽減税率／不課税／免税／非課税）,明細-小計 (税抜),明細-割引1-内容,明細-割引1-値,明細-割引1-単位,明細-割引1-単価,明細-割引2-内容,明細-割引2-値,明細-割引2-単位,明細-割引2-単価,明細-割引3-内容,明細-割引3-値,明細-割引3-単位,明細-割引3-単価,明細-割引4以降,明細-追加料金1-内容,明細-追加料金1-値,明細-追加料金1-単位,明細-追加料金1-単価,明細-追加料金2-内容,明細-追加料金2-値,明細-追加料金2-単位,明細-追加料金2-単価,明細-追加料金3-内容,明細-追加料金3-値,明細-追加料金3-単位,明細-追加料金3-単価,明細-追加料金4以降,明細-輸送情報,明細-備考,明細-シリアルナンバー,明細-商品分類コード: ECCN,明細-発注者品番,明細-注文明細番号,明細-EAN/GTIN,明細-ロケーションID,明細-貨物注文番号,明細-納品日,明細-HSN/SAC区分,明細-HSN/SACの値,明細-非課税/免税の理由,明細-注文書番号,明細-詳細,明細-メーカー名,明細-原産国,明細-納期,明細-配送先-私書箱,明細-配送先-市区町村番地,明細-配送先-マンション名,明細-配送先-都道府県,明細-配送先-郵便番号,明細-配送先-国,割引1-項目ID,割引1-内容,割引1-数量,割引1-単位,割引1-税（消費税／軽減税率／不課税／免税／非課税）,割引1-小計（税抜）,割引2-項目ID,割引2-内容,割引2-数量,割引2-単位,割引2-税（消費税／軽減税率／不課税／免税／非課税）,割引2-小計（税抜）,割引3-項目ID,割引3-内容,割引3-数量,割引3-単位,割引3-税（消費税／軽減税率／不課税／免税／非課税）,割引3-小計（税抜）,割引4以降,追加料金1-項目ID,追加料金1-内容,追加料金1-数量,追加料金1-単位,追加料金1-税（消費税／軽減税率／不課税／免税／非課税）,追加料金1-小計（税抜）,追加料金2-項目ID,追加料金2-内容,追加料金2-数量,追加料金2-単位,追加料金2-税（消費税／軽減税率／不課税／免税／非課税）,追加料金2-小計（税抜）,追加料金3-項目ID,追加料金3-内容,追加料金3-数量,追加料金3-単位,追加料金3-税（消費税／軽減税率／不課税／免税／非課税）,追加料金3-小計（税抜）,追加料金4以降,固定税-項目ID,固定税-税,仕訳情報1-勘定科目コード,仕訳情報1-補助科目コード' +
  ',仕訳情報1-計上金額,仕訳情報2-勘定科目コード,仕訳情報2-補助科目コード,仕訳情報2-計上金額,仕訳情報3-勘定科目コード,仕訳情報3-補助科目コード,仕訳情報3-計上金額,仕訳情報4-勘定科目コード,仕訳情報4-補助科目コード,仕訳情報4-計上金額,仕訳情報5-勘定科目コード,仕訳情報5-補助科目コード,仕訳情報5-計上金額,仕訳情報6-勘定科目コード,仕訳情報6-補助科目コード,仕訳情報6-計上金額,仕訳情報7-勘定科目コード,仕訳情報7-補助科目コード,仕訳情報7-計上金額,仕訳情報8-勘定科目コード,仕訳情報8-補助科目コード,仕訳情報8-計上金額,仕訳情報9-勘定科目コード,仕訳情報9-補助科目コード,仕訳情報9-計上金額,仕訳情報10-勘定科目コード,仕訳情報10-補助科目コード,仕訳情報10-計上金額'

// モックテーブル定義
const Users = require('../mockDB/Users_Table')
const Tenants = require('../mockDB/Tenants_Table')
const Contracts = require('../mockDB/Contracts_Table')

describe('journalDownloadのテスト', () => {
  beforeEach(() => {
    request = new Request()
    response = new Response()
    infoSpy = jest.spyOn(logger, 'info')
    apiManager.accessTradeshift = require('../lib/apiManager')
    userControllerFindOneSpy = jest.spyOn(userController, 'findOne')
    contractControllerFindOneSpy = jest.spyOn(contractController, 'findOne')
    tenantControllerFindOneSpy = jest.spyOn(tenantController, 'findOne')
    contractControllerFindContractSpyon = jest.spyOn(contractController, 'findContract')
    journalfindAllSpy = jest.spyOn(JournalizeInvoice, 'findAll')
    getSentToCompanySpy = jest.spyOn(journalDownloadController, 'getSentToCompany')
    request.flash = jest.fn()
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
    journalfindAllSpy.mockRestore()
    getSentToCompanySpy.mockRestore()
  })

  describe('ルーティング', () => {
    test('journalDownloadのルーティングを確認', async () => {
      expect(journalDownload.router.get).toBeCalledWith('/', helper.isAuthenticated, journalDownload.cbGetIndex)
      expect(journalDownload.router.post).toBeCalledWith('/', helper.isAuthenticated, journalDownload.cbPostIndex)
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
      await journalDownload.cbGetIndex(request, response, next)

      const today = new Date()
      const minissuedate = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate())
        .toISOString()
        .split('T')[0]
      const maxissuedate = today.toISOString().split('T')[0]

      // 期待結果
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
      expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
      // response.renderでjournalDownloadが呼ばれ「る」
      expect(response.render).toHaveBeenCalledWith('journalDownload', {
        title: '仕訳情報ダウンロード',
        minissuedate: minissuedate,
        maxissuedate: maxissuedate
      })
    })

    test('正常：解約申込中の場合', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[1] }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[6])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[5])

      tenantControllerFindOneSpy.mockReturnValue(Tenants[5])

      contractControllerFindContractSpyon.mockReturnValue(Contracts[5])

      journalfindAllSpy.mockReturnValue(dbJournalTable)

      // 試験実施
      await journalDownload.cbGetIndex(request, response, next)

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
      userControllerFindOneSpy.mockReturnValue(Users[0])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[7])

      tenantControllerFindOneSpy.mockReturnValue(Tenants[1])

      contractControllerFindContractSpyon.mockReturnValue(Contracts[7])

      journalfindAllSpy.mockReturnValue(dbJournalTable)

      // 試験実施
      await journalDownload.cbGetIndex(request, response, next)

      // 期待結果
      // 404エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      // expect(next).not.toHaveBeenCalledWith(errorHelper.create(500))
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
      expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
      // 500エラーがエラーハンドリング「される」
      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
    })

    test('500エラー：requestのsession,userIdがnullの場合', async () => {
      // 試験実施
      await journalDownload.cbGetIndex(request, response, next)

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
      await journalDownload.cbGetIndex(request, response, next)

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
      userControllerFindOneSpy.mockReturnValue(Users[8])

      // 試験実施
      await journalDownload.cbGetIndex(request, response, next)

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
      await journalDownload.cbGetIndex(request, response, next)

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
      await journalDownload.cbGetIndex(request, response, next)

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
        minIssuedate: '2021-08-01',
        maxIssuedate: '2021-11-09'
      }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[0])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[0])

      tenantControllerFindOneSpy.mockReturnValue(Tenants[0])

      contractControllerFindContractSpyon.mockReturnValue(Contracts[0])

      journalfindAllSpy.mockReturnValue(dbJournalTable)

      // 試験実施
      await journalDownload.cbPostIndex(request, response, next)

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
      expect(csvHeader).toBe(`${String.fromCharCode(0xfeff)}${headers}`)
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
        minIssuedate: '2021-08-01',
        maxIssuedate: '2021-11-09',
        sentTo: ['f783be0e-e716-4eab-a7ec-5ce36b3c7b31'],
        sentBy: ['221559d0-53aa-44a2-ab29-0c4a6cb02bde']
      }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[0])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[0])

      tenantControllerFindOneSpy.mockReturnValue(Tenants[0])

      contractControllerFindContractSpyon.mockReturnValue(Contracts[0])

      journalfindAllSpy.mockReturnValue(dbJournalTable)

      // 試験実施
      await journalDownload.cbPostIndex(request, response, next)

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
      expect(csvHeader).toBe(`${String.fromCharCode(0xfeff)}${headers}`)
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

      journalfindAllSpy.mockReturnValue(dbJournalTable)

      // 試験実施
      await journalDownload.cbPostIndex(request, response, next)

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
      expect(csvHeader).toBe(`${String.fromCharCode(0xfeff)}${headers}`)
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

    test('正常:宛先-テナントIDがない請求書の場合', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[0] }
      request.body = {
        invoiceNumber: 'A01011',
        minIssuedate: '2021-08-01',
        maxIssuedate: '2021-11-09'
      }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[0])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[0])

      tenantControllerFindOneSpy.mockReturnValue(Tenants[0])

      contractControllerFindContractSpyon.mockReturnValue(Contracts[0])

      journalfindAllSpy.mockReturnValue(dbJournalTable)

      // 試験実施
      await journalDownload.cbPostIndex(request, response, next)

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
      expect(csvHeader).toBe(`${String.fromCharCode(0xfeff)}${headers}`)
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

    test('正常:宛先-GNLが設定されている請求書の場合', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[0] }
      request.body = {
        invoiceNumber: 'A01014',
        minIssuedate: '2021-08-01',
        maxIssuedate: '2021-11-09'
      }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[0])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[0])

      tenantControllerFindOneSpy.mockReturnValue(Tenants[0])

      contractControllerFindContractSpyon.mockReturnValue(Contracts[0])

      journalfindAllSpy.mockReturnValue(dbJournalTable)

      // 試験実施
      await journalDownload.cbPostIndex(request, response, next)

      // 期待結果
      // responseのヘッダ
      const today = new Date().toISOString().split('T')[0]
      expect(response.setHeader().headers['Content-Disposition']).toContain('attachment; filename=')
      expect(response.setHeader().headers['Content-Disposition']).toContain(`${today}`)
      expect(response.setHeader().headers['Content-Disposition']).toContain('A01014')

      // responseのcsvファイル
      const csvHeader = response.setHeader().body.split('\r\n')[0]
      const csvBody = response.setHeader().body.split('\r\n')[1]
      const checkingData = require('../mockInvoice/invoice12')
      expect(csvHeader).toBe(`${String.fromCharCode(0xfeff)}${headers}`)
      checkingData.AccountingCustomerParty.Party.PartyIdentification.forEach((item) => {
        switch (item.ID.schemeID) {
          case 'TS:REGNO':
            expect(csvBody).toContain(`${item.ID.value}`)
            break
          case 'GLN':
            expect(csvBody).toContain(`${item.ID.value}`)
            break
          case 'JP:CT':
            expect(csvBody).toContain(`${item.ID.value}`)
            break
        }
      })
    })

    test('正常:宛先-テナントID以外が設定（複数）されている請求書の場合', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[0] }
      request.body = {
        invoiceNumber: 'A01013',
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

      journalfindAllSpy.mockReturnValue(dbJournalTable)

      // 試験実施
      await journalDownload.cbPostIndex(request, response, next)

      // 期待結果
      // responseのヘッダ
      const today = new Date().toISOString().split('T')[0]
      expect(response.setHeader().headers['Content-Disposition']).toContain('attachment; filename=')
      expect(response.setHeader().headers['Content-Disposition']).toContain(`${today}`)
      expect(response.setHeader().headers['Content-Disposition']).toContain('A01013')

      // responseのcsvファイル
      const csvHeader = response.setHeader().body.split('\r\n')[0]
      const csvBody = response.setHeader().body.split('\r\n')[1]
      const checkingData = require('../mockInvoice/invoice11')
      expect(csvHeader).toBe(`${String.fromCharCode(0xfeff)}${headers}`)
      checkingData.AccountingCustomerParty.Party.PartyIdentification.forEach((item) => {
        switch (item.ID.schemeID) {
          case 'TS:REGNO':
            expect(csvBody).toContain(`${item.ID.value}`)
            break
          case 'GLN':
            expect(csvBody).toContain(`${item.ID.value}`)
            break
          case 'JP:CT':
            expect(csvBody).toContain(`${item.ID.value}`)
            break
        }
      })
    })

    test('正常:宛先-会社名がない請求書の場合', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[0] }
      request.body = {
        invoiceNumber: 'A01011',
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

      journalfindAllSpy.mockReturnValue(dbJournalTable)

      // 試験実施
      await journalDownload.cbPostIndex(request, response, next)

      // 期待結果
      // responseのヘッダ
      const today = new Date().toISOString().split('T')[0]
      expect(response.setHeader().headers['Content-Disposition']).toContain('attachment; filename=')
      expect(response.setHeader().headers['Content-Disposition']).toContain(`${today}`)
      expect(response.setHeader().headers['Content-Disposition']).toContain('A01011')

      // responseのcsvファイル
      const csvHeader = response.setHeader().body.split('\r\n')[0]
      const csvBody = response.setHeader().body.split('\r\n')[1]
      const checkData = csvBody.split(',')
      expect(csvHeader).toBe(`${String.fromCharCode(0xfeff)}${headers}`)
      // 宛先-会社名が空欄になっている。
      expect(checkData[2]).toBe('""')
    })

    test('正常:宛先-国/地域がない請求書の場合', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[0] }
      request.body = {
        invoiceNumber: 'A01011',
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

      journalfindAllSpy.mockReturnValue(dbJournalTable)

      // 試験実施
      await journalDownload.cbPostIndex(request, response, next)

      // 期待結果
      // responseのヘッダ
      const today = new Date().toISOString().split('T')[0]
      expect(response.setHeader().headers['Content-Disposition']).toContain('attachment; filename=')
      expect(response.setHeader().headers['Content-Disposition']).toContain(`${today}`)
      expect(response.setHeader().headers['Content-Disposition']).toContain('A01011')

      // responseのcsvファイル
      const csvHeader = response.setHeader().body.split('\r\n')[0]
      const csvBody = response.setHeader().body.split('\r\n')[1]
      const checkData = csvBody.split(',')
      expect(csvHeader).toBe(`${String.fromCharCode(0xfeff)}${headers}`)
      // 宛先-国/地域が空欄になっている。
      expect(checkData[3]).toBe('""')
    })

    test('正常:宛先-私書箱がある請求書の場合', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[0] }
      request.body = {
        invoiceNumber: 'A01011',
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

      journalfindAllSpy.mockReturnValue(dbJournalTable)

      // 試験実施
      await journalDownload.cbPostIndex(request, response, next)

      // 期待結果
      // responseのヘッダ
      const today = new Date().toISOString().split('T')[0]
      expect(response.setHeader().headers['Content-Disposition']).toContain('attachment; filename=')
      expect(response.setHeader().headers['Content-Disposition']).toContain(`${today}`)
      expect(response.setHeader().headers['Content-Disposition']).toContain('A01011')

      // responseのcsvファイル
      const csvHeader = response.setHeader().body.split('\r\n')[0]
      const csvBody = response.setHeader().body.split('\r\n')[1]
      const checkingData = require('../mockInvoice/invoice9')
      expect(csvHeader).toBe(`${String.fromCharCode(0xfeff)}${headers}`)
      // 宛先-私書箱がある
      expect(csvBody).toContain(checkingData.AccountingCustomerParty.Party.PostalAddress.Postbox.value)
    })

    test('正常:宛先-郵便番号がない請求書の場合', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[0] }
      request.body = {
        invoiceNumber: 'A01011',
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

      journalfindAllSpy.mockReturnValue(dbJournalTable)

      // 試験実施
      await journalDownload.cbPostIndex(request, response, next)

      // 期待結果
      // responseのヘッダ
      const today = new Date().toISOString().split('T')[0]
      expect(response.setHeader().headers['Content-Disposition']).toContain('attachment; filename=')
      expect(response.setHeader().headers['Content-Disposition']).toContain(`${today}`)
      expect(response.setHeader().headers['Content-Disposition']).toContain('A01011')

      // responseのcsvファイル
      const csvHeader = response.setHeader().body.split('\r\n')[0]
      const csvBody = response.setHeader().body.split('\r\n')[1]
      const checkData = csvBody.split(',')
      expect(csvHeader).toBe(`${String.fromCharCode(0xfeff)}${headers}`)
      // 宛先-郵便番号が空欄になっている。
      expect(checkData[6]).toBe('""')
    })

    test('正常:宛先-都道府県がない請求書の場合', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[0] }
      request.body = {
        invoiceNumber: 'A01011',
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

      journalfindAllSpy.mockReturnValue(dbJournalTable)

      // 試験実施
      await journalDownload.cbPostIndex(request, response, next)

      // 期待結果
      // responseのヘッダ
      const today = new Date().toISOString().split('T')[0]
      expect(response.setHeader().headers['Content-Disposition']).toContain('attachment; filename=')
      expect(response.setHeader().headers['Content-Disposition']).toContain(`${today}`)
      expect(response.setHeader().headers['Content-Disposition']).toContain('A01011')

      // responseのcsvファイル
      const csvHeader = response.setHeader().body.split('\r\n')[0]
      const csvBody = response.setHeader().body.split('\r\n')[1]
      const checkData = csvBody.split(',')
      expect(csvHeader).toBe(`${String.fromCharCode(0xfeff)}${headers}`)
      // 宛先-都道府県が空欄になっている。
      expect(checkData[6]).toBe('""')
    })

    test('正常:宛先-市区町村・番地がない請求書の場合', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[0] }
      request.body = {
        invoiceNumber: 'A01011',
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

      journalfindAllSpy.mockReturnValue(dbJournalTable)

      // 試験実施
      await journalDownload.cbPostIndex(request, response, next)

      // 期待結果
      // responseのヘッダ
      const today = new Date().toISOString().split('T')[0]
      expect(response.setHeader().headers['Content-Disposition']).toContain('attachment; filename=')
      expect(response.setHeader().headers['Content-Disposition']).toContain(`${today}`)
      expect(response.setHeader().headers['Content-Disposition']).toContain('A01011')

      // responseのcsvファイル
      const csvHeader = response.setHeader().body.split('\r\n')[0]
      const csvBody = response.setHeader().body.split('\r\n')[1]
      const checkData = csvBody.split(',')
      expect(csvHeader).toBe(`${String.fromCharCode(0xfeff)}${headers}`)
      // 宛先-市区町村・番地が空欄になっている。
      expect(checkData[7]).toBe('""')
    })

    test('正常:宛先-ビル、マンション名がある請求書の場合', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[0] }
      request.body = {
        invoiceNumber: 'A01011',
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

      journalfindAllSpy.mockReturnValue(dbJournalTable)

      // 試験実施
      await journalDownload.cbPostIndex(request, response, next)

      // 期待結果
      // responseのヘッダ
      const today = new Date().toISOString().split('T')[0]
      expect(response.setHeader().headers['Content-Disposition']).toContain('attachment; filename=')
      expect(response.setHeader().headers['Content-Disposition']).toContain(`${today}`)
      expect(response.setHeader().headers['Content-Disposition']).toContain('A01011')

      // responseのcsvファイル
      const csvHeader = response.setHeader().body.split('\r\n')[0]
      const csvBody = response.setHeader().body.split('\r\n')[1]
      const checkingData = require('../mockInvoice/invoice9')
      expect(csvHeader).toBe(`${String.fromCharCode(0xfeff)}${headers}`)
      // 宛先-ビル、マンション名がある
      expect(csvBody).toContain(checkingData.AccountingCustomerParty.Party.PostalAddress.AdditionalStreetName.value)
    })

    test('正常:宛先の住所情報がない請求書の場合', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[0] }
      request.body = {
        invoiceNumber: 'A01012',
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

      journalfindAllSpy.mockReturnValue(dbJournalTable)

      // 試験実施
      await journalDownload.cbPostIndex(request, response, next)

      // 期待結果
      // responseのヘッダ
      const today = new Date().toISOString().split('T')[0]
      expect(response.setHeader().headers['Content-Disposition']).toContain('attachment; filename=')
      expect(response.setHeader().headers['Content-Disposition']).toContain(`${today}`)
      expect(response.setHeader().headers['Content-Disposition']).toContain('A01012')

      // responseのcsvファイル
      const csvHeader = response.setHeader().body.split('\r\n')[0]
      const csvBody = response.setHeader().body.split('\r\n')[1]
      const checkData = csvBody.split(',')
      expect(csvHeader).toBe(`${String.fromCharCode(0xfeff)}${headers}`)
      // 差出人-テナントIDが空欄になっている。

      for (let idx = 3; idx < 9; idx++) {
        expect(checkData[idx]).toBe('""')
      }
    })

    test('正常:差出人-テナントIDがない請求書の場合', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[0] }
      request.body = {
        invoiceNumber: 'A01011',
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

      journalfindAllSpy.mockReturnValue(dbJournalTable)

      // 試験実施
      await journalDownload.cbPostIndex(request, response, next)

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
      const checkData = csvBody.split(',')
      expect(csvHeader).toBe(`${String.fromCharCode(0xfeff)}${headers}`)
      // 差出人-テナントIDが空欄になっている。
      expect(checkData[10]).toBe('""')
    })

    test('正常:差出人-GNLが設定されている請求書の場合', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[0] }
      request.body = {
        invoiceNumber: 'A01014',
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

      journalfindAllSpy.mockReturnValue(dbJournalTable)

      // 試験実施
      await journalDownload.cbPostIndex(request, response, next)

      // 期待結果
      // responseのヘッダ
      const today = new Date().toISOString().split('T')[0]
      expect(response.setHeader().headers['Content-Disposition']).toContain('attachment; filename=')
      expect(response.setHeader().headers['Content-Disposition']).toContain(`${today}`)
      expect(response.setHeader().headers['Content-Disposition']).toContain('A01014')

      // responseのcsvファイル
      const csvHeader = response.setHeader().body.split('\r\n')[0]
      const csvBody = response.setHeader().body.split('\r\n')[1]
      const checkingData = require('../mockInvoice/invoice12')
      expect(csvHeader).toBe(`${String.fromCharCode(0xfeff)}${headers}`)
      checkingData.AccountingSupplierParty.Party.PartyIdentification.forEach((item) => {
        switch (item.ID.schemeID) {
          case 'TS:REGNO':
            expect(csvBody).toContain(`${item.ID.value}`)
            break
          case 'GLN':
            expect(csvBody).toContain(`${item.ID.value}`)
            break
          case 'JP:CT':
            expect(csvBody).toContain(`${item.ID.value}`)
            break
        }
      })
    })

    test('正常:差出人-テナントID以外が設定（複数）されている請求書の場合', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[0] }
      request.body = {
        invoiceNumber: 'A01013',
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

      journalfindAllSpy.mockReturnValue(dbJournalTable)

      // 試験実施
      await journalDownload.cbPostIndex(request, response, next)

      // 期待結果
      // responseのヘッダ
      const today = new Date().toISOString().split('T')[0]
      expect(response.setHeader().headers['Content-Disposition']).toContain('attachment; filename=')
      expect(response.setHeader().headers['Content-Disposition']).toContain(`${today}`)
      expect(response.setHeader().headers['Content-Disposition']).toContain('A01013')

      // responseのcsvファイル
      const csvHeader = response.setHeader().body.split('\r\n')[0]
      const csvBody = response.setHeader().body.split('\r\n')[1]
      const checkingData = require('../mockInvoice/invoice11')
      expect(csvHeader).toBe(`${String.fromCharCode(0xfeff)}${headers}`)
      checkingData.AccountingSupplierParty.Party.PartyIdentification.forEach((item) => {
        switch (item.ID.schemeID) {
          case 'TS:REGNO':
            expect(csvBody).toContain(`${item.ID.value}`)
            break
          case 'GLN':
            expect(csvBody).toContain(`${item.ID.value}`)
            break
          case 'JP:CT':
            expect(csvBody).toContain(`${item.ID.value}`)
            break
        }
      })
    })

    test('正常:差出人-会社名がない請求書の場合', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[0] }
      request.body = {
        invoiceNumber: 'A01011',
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

      journalfindAllSpy.mockReturnValue(dbJournalTable)

      // 試験実施
      await journalDownload.cbPostIndex(request, response, next)

      // 期待結果
      // responseのヘッダ
      const today = new Date().toISOString().split('T')[0]
      expect(response.setHeader().headers['Content-Disposition']).toContain('attachment; filename=')
      expect(response.setHeader().headers['Content-Disposition']).toContain(`${today}`)
      expect(response.setHeader().headers['Content-Disposition']).toContain('A01011')

      // responseのcsvファイル
      const csvHeader = response.setHeader().body.split('\r\n')[0]
      const csvBody = response.setHeader().body.split('\r\n')[1]
      const checkData = csvBody.split(',')
      expect(csvHeader).toBe(`${String.fromCharCode(0xfeff)}${headers}`)
      // 差出人-会社名が空欄になっている。
      expect(checkData[11]).toBe('""')
    })

    test('正常:差出人-国/地域がない請求書の場合', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[0] }
      request.body = {
        invoiceNumber: 'A01011',
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

      journalfindAllSpy.mockReturnValue(dbJournalTable)

      // 試験実施
      await journalDownload.cbPostIndex(request, response, next)

      // 期待結果
      // responseのヘッダ
      const today = new Date().toISOString().split('T')[0]
      expect(response.setHeader().headers['Content-Disposition']).toContain('attachment; filename=')
      expect(response.setHeader().headers['Content-Disposition']).toContain(`${today}`)
      expect(response.setHeader().headers['Content-Disposition']).toContain('A01011')

      // responseのcsvファイル
      const csvHeader = response.setHeader().body.split('\r\n')[0]
      const csvBody = response.setHeader().body.split('\r\n')[1]
      const checkData = csvBody.split(',')
      expect(csvHeader).toBe(`${String.fromCharCode(0xfeff)}${headers}`)
      // 差出人-国/地域が空欄になっている。
      expect(checkData[12]).toBe('""')
    })

    test('正常:差出人-私書箱がある請求書の場合', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[0] }
      request.body = {
        invoiceNumber: 'A01011',
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

      journalfindAllSpy.mockReturnValue(dbJournalTable)

      // 試験実施
      await journalDownload.cbPostIndex(request, response, next)

      // 期待結果
      // responseのヘッダ
      const today = new Date().toISOString().split('T')[0]
      expect(response.setHeader().headers['Content-Disposition']).toContain('attachment; filename=')
      expect(response.setHeader().headers['Content-Disposition']).toContain(`${today}`)
      expect(response.setHeader().headers['Content-Disposition']).toContain('A01011')

      // responseのcsvファイル
      const csvHeader = response.setHeader().body.split('\r\n')[0]
      const csvBody = response.setHeader().body.split('\r\n')[1]
      const checkingData = require('../mockInvoice/invoice9')
      expect(csvHeader).toBe(`${String.fromCharCode(0xfeff)}${headers}`)
      // 差出人-私書箱がある
      expect(csvBody).toContain(checkingData.AccountingSupplierParty.Party.PostalAddress.Postbox?.value ?? '')
    })

    test('正常:差出人-郵便番号がない請求書の場合', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[0] }
      request.body = {
        invoiceNumber: 'A01011',
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

      journalfindAllSpy.mockReturnValue(dbJournalTable)

      // 試験実施
      await journalDownload.cbPostIndex(request, response, next)

      // 期待結果
      // responseのヘッダ
      const today = new Date().toISOString().split('T')[0]
      expect(response.setHeader().headers['Content-Disposition']).toContain('attachment; filename=')
      expect(response.setHeader().headers['Content-Disposition']).toContain(`${today}`)
      expect(response.setHeader().headers['Content-Disposition']).toContain('A01011')

      // responseのcsvファイル
      const csvHeader = response.setHeader().body.split('\r\n')[0]
      const csvBody = response.setHeader().body.split('\r\n')[1]
      const checkData = csvBody.split(',')
      expect(csvHeader).toBe(`${String.fromCharCode(0xfeff)}${headers}`)
      // 差出人-郵便番号が空欄になっている。
      expect(checkData[14]).toBe('""')
    })

    test('正常:差出人-都道府県がない請求書の場合', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[0] }
      request.body = {
        invoiceNumber: 'A01011',
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

      journalfindAllSpy.mockReturnValue(dbJournalTable)

      // 試験実施
      await journalDownload.cbPostIndex(request, response, next)

      // 期待結果
      // responseのヘッダ
      const today = new Date().toISOString().split('T')[0]
      expect(response.setHeader().headers['Content-Disposition']).toContain('attachment; filename=')
      expect(response.setHeader().headers['Content-Disposition']).toContain(`${today}`)
      expect(response.setHeader().headers['Content-Disposition']).toContain('A01011')

      // responseのcsvファイル
      const csvHeader = response.setHeader().body.split('\r\n')[0]
      const csvBody = response.setHeader().body.split('\r\n')[1]
      const checkData = csvBody.split(',')
      expect(csvHeader).toBe(`${String.fromCharCode(0xfeff)}${headers}`)
      // 差出人-都道府県が空欄になっている。
      expect(checkData[15]).toBe('""')
    })

    test('正常:差出人-市区町村・番地がない請求書の場合', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[0] }
      request.body = {
        invoiceNumber: 'A01011',
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

      journalfindAllSpy.mockReturnValue(dbJournalTable)

      // 試験実施
      await journalDownload.cbPostIndex(request, response, next)

      // 期待結果
      // responseのヘッダ
      const today = new Date().toISOString().split('T')[0]
      expect(response.setHeader().headers['Content-Disposition']).toContain('attachment; filename=')
      expect(response.setHeader().headers['Content-Disposition']).toContain(`${today}`)
      expect(response.setHeader().headers['Content-Disposition']).toContain('A01011')

      // responseのcsvファイル
      const csvHeader = response.setHeader().body.split('\r\n')[0]
      const csvBody = response.setHeader().body.split('\r\n')[1]
      const checkData = csvBody.split(',')
      expect(csvHeader).toBe(`${String.fromCharCode(0xfeff)}${headers}`)
      // 差出人-市区町村・番地が空欄になっている。
      expect(checkData[19]).toBe('""')
    })

    test('正常:差出人-ビル、マンション名がある請求書の場合', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[0] }
      request.body = {
        invoiceNumber: 'A01011',
        minIssuedate: '2021-08-01',
        maxIssuedate: '2021-11-09'
      }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[0])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[0])

      tenantControllerFindOneSpy.mockReturnValue(Tenants[0])

      contractControllerFindContractSpyon.mockReturnValue(Contracts[0])

      journalfindAllSpy.mockReturnValue(dbJournalTable)

      // 試験実施
      await journalDownload.cbPostIndex(request, response, next)

      // 期待結果
      // responseのヘッダ
      const today = new Date().toISOString().split('T')[0]
      expect(response.setHeader().headers['Content-Disposition']).toContain('attachment; filename=')
      expect(response.setHeader().headers['Content-Disposition']).toContain(`${today}`)
      expect(response.setHeader().headers['Content-Disposition']).toContain('A01011')

      // responseのcsvファイル
      const csvHeader = response.setHeader().body.split('\r\n')[0]
      const csvBody = response.setHeader().body.split('\r\n')[1]
      const checkingData = require('../mockInvoice/invoice9')
      expect(csvHeader).toBe(`${String.fromCharCode(0xfeff)}${headers}`)
      // 差出人-ビル、マンション名がある
      expect(csvBody).toContain(
        checkingData.AccountingSupplierParty.Party.PostalAddress.AdditionalStreetName?.value ?? ''
      )
    })

    test('正常:差出人の住所情報がない請求書の場合', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[0] }
      request.body = {
        invoiceNumber: 'A01012',
        minIssuedate: '2021-08-01',
        maxIssuedate: '2021-11-09'
      }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[0])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[0])

      tenantControllerFindOneSpy.mockReturnValue(Tenants[0])

      contractControllerFindContractSpyon.mockReturnValue(Contracts[0])

      journalfindAllSpy.mockReturnValue(dbJournalTable)

      // 試験実施
      await journalDownload.cbPostIndex(request, response, next)

      // 期待結果
      // responseのヘッダ
      const today = new Date().toISOString().split('T')[0]
      expect(response.setHeader().headers['Content-Disposition']).toContain('attachment; filename=')
      expect(response.setHeader().headers['Content-Disposition']).toContain(`${today}`)
      expect(response.setHeader().headers['Content-Disposition']).toContain('A01012')

      // responseのcsvファイル
      const csvHeader = response.setHeader().body.split('\r\n')[0]
      const csvBody = response.setHeader().body.split('\r\n')[1]
      const checkData = csvBody.split(',')
      expect(csvHeader).toBe(`${String.fromCharCode(0xfeff)}${headers}`)
      // 差出人の住所情報が空欄になっている。
      for (let idx = 15; idx < 21; idx++) {
        expect(checkData[idx]).toBe('""')
      }
    })

    test('正常:オプション項目を追加した請求書の場合', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[0] }
      request.body = {
        invoiceNumber: 'A01015',
        minIssuedate: '2021-08-01',
        maxIssuedate: '2021-11-09'
      }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[0])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[0])

      tenantControllerFindOneSpy.mockReturnValue(Tenants[0])

      contractControllerFindContractSpyon.mockReturnValue(Contracts[0])

      journalfindAllSpy.mockReturnValue(dbJournalTable)

      // 試験実施
      await journalDownload.cbPostIndex(request, response, next)

      // 期待結果
      // responseのヘッダ
      const today = new Date().toISOString().split('T')[0]
      expect(response.setHeader().headers['Content-Disposition']).toContain('attachment; filename=')
      expect(response.setHeader().headers['Content-Disposition']).toContain(`${today}`)
      expect(response.setHeader().headers['Content-Disposition']).toContain('A01015')

      // responseのcsvファイル
      const csvHeader = response.setHeader().body.split('\r\n')[0]
      const csvBody = response.setHeader().body.split('\r\n')[1]
      const checkingData = require('../mockInvoice/invoice13')
      expect(csvHeader).toBe(`${String.fromCharCode(0xfeff)}${headers}`)
      // 指定したオプション項目がある
      // 支払期日
      expect(csvBody).toContain(`${checkingData.PaymentMeans[0].PaymentDueDate.value}`)
      // 納品日
      expect(csvBody).toContain(`${checkingData.Delivery[0].ActualDeliveryDate?.value}`)
      // 納品開始日
      expect(csvBody).toContain(`${checkingData.Delivery[0].PromisedDeliveryPeriod?.StartDate?.value}`)
      // 納品終了日
      expect(csvBody).toContain(`${checkingData.Delivery[0].PromisedDeliveryPeriod?.EndDate?.value}`)
      // 販売者の手数料番号
      expect(csvBody).toContain(`${checkingData.Delivery[0].Despatch?.ID?.value}`)
      // 注文書番号
      expect(csvBody).toContain(`${checkingData.OrderReference?.ID?.value}`)
      // 注文書発行日
      expect(csvBody).toContain(`${checkingData.OrderReference?.IssueDate?.value}`)
      // 参考情報
      expect(csvBody).toContain(`${checkingData.BillingReference[0]?.InvoiceDocumentReference?.ID?.value}`)
      // 契約書番号
      expect(csvBody).toContain(`${checkingData.ContractDocumentReference[0]?.ID?.value}`)
      // 部門
      expect(csvBody).toContain(`${checkingData.AccountingCost?.value}`)
      // 取引先担当者（アドレス）
      expect(csvBody).toContain(`${checkingData.AccountingCustomerParty.Party.Contact?.ID?.value}`)
      // ID
      expect(csvBody).toContain(`${checkingData.AccountingCustomerParty.CustomerAssignedAccountID?.value}`)

      for (let i = 0; i < checkingData.AdditionalDocumentReference.length; i++) {
        if (checkingData.AdditionalDocumentReference[i]?.DocumentTypeCode?.value === 'File ID') {
          // 備考
          expect(csvBody).toContain(`${checkingData.AdditionalDocumentReference[i].ID.value}`)
        } else if (checkingData.AdditionalDocumentReference[i].DocumentTypeCode.value === 'BOL ID') {
          // 輸送情報
          expect(csvBody).toContain(`${checkingData.AdditionalDocumentReference[i].ID.value}`)
        } else if (checkingData.AdditionalDocumentReference[i].DocumentTypeCode.value === 'Interim Hours') {
          // 暫定時間
          expect(csvBody).toContain(`${checkingData.AdditionalDocumentReference[i].ID.value}`)
        } else if (checkingData.AdditionalDocumentReference[i].DocumentTypeCode.value === 'Clearance Clave') {
          // 通関識別情報
          expect(csvBody).toContain(`${checkingData.AdditionalDocumentReference[i].ID.value}`)
        } else if (checkingData.AdditionalDocumentReference[i].DocumentTypeCode.value === 'TS Clearance') {
          // Tradeshiftクリアランス
          expect(csvBody).toContain(`${checkingData.AdditionalDocumentReference[i].ID.value}`)
        } else if (checkingData.AdditionalDocumentReference[i].DocumentTypeCode.value === 'BookingNumber') {
          // 予約番号
          expect(csvBody).toContain(`${checkingData.AdditionalDocumentReference[i].ID.value}`)
        }
      }

      // 課税日
      expect(csvBody).toContain(`${checkingData.TaxPointDate?.value}`)
      // DUNSナンバー
      expect(csvBody).toContain(`${checkingData.AccountingSupplierParty.Party?.PhysicalLocation?.ID?.value}`)
      // 為替レート
      expect(csvBody).toContain(`${checkingData.TaxExchangeRate?.CalculationRate?.value}`)
      // 為替レート-通貨
      expect(csvBody).toContain(`${checkingData.TaxExchangeRate?.TargetCurrencyCode?.value}`)
      // 為替レート-日付
      expect(csvBody).toContain(`${checkingData.TaxExchangeRate?.Date?.value}`)
      // 為替レート換算後の税金総額
      expect(csvBody).toContain(`${checkingData.TaxTotal[0]?.TaxSubtotal[0]?.TransactionCurrencyTaxAmount?.value}`)
      // 為替レート-Convertd Document Total(incl taxes)
      const dom = new DOMParser().parseFromString(
        checkingData.UBLExtensions?.UBLExtension[0]?.ExtensionContent?.value,
        'text/xml'
      )
      const xmlValue = dom.getElementsByTagName('ts')[0]?.childNodes[0]?.text
      expect(csvBody).toContain(`${xmlValue}`)
    })

    test('正常:オプション項目を追加した請求書（値がない場合）の場合', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[0] }
      request.body = {
        invoiceNumber: 'A01026',
        minIssuedate: '2021-08-01',
        maxIssuedate: '2021-11-09'
      }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[0])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[0])

      tenantControllerFindOneSpy.mockReturnValue(Tenants[0])

      contractControllerFindContractSpyon.mockReturnValue(Contracts[0])

      journalfindAllSpy.mockReturnValue(dbJournalTable)

      // 試験実施
      await journalDownload.cbPostIndex(request, response, next)

      // 期待結果
      // responseのヘッダ
      const today = new Date().toISOString().split('T')[0]
      expect(response.setHeader().headers['Content-Disposition']).toContain('attachment; filename=')
      expect(response.setHeader().headers['Content-Disposition']).toContain(`${today}`)
      expect(response.setHeader().headers['Content-Disposition']).toContain('A01026')

      // responseのcsvファイル
      const csvHeader = response.setHeader().body.split('\r\n')[0]
      const csvBody = response.setHeader().body.split('\r\n')[1]
      const checkingData = require('../mockInvoice/invoice13')
      expect(csvHeader).toBe(`${String.fromCharCode(0xfeff)}${headers}`)
      // 指定したオプション項目がある
      // 支払期日
      expect(csvBody).not.toContain(`${checkingData.PaymentMeans[0].PaymentDueDate.value}`)
      // 納品日
      expect(csvBody).not.toContain(`${checkingData.Delivery[0].ActualDeliveryDate?.value}`)
      // 納品開始日
      expect(csvBody).not.toContain(`${checkingData.Delivery[0].PromisedDeliveryPeriod?.StartDate?.value}`)
      // 納品終了日
      expect(csvBody).not.toContain(`${checkingData.Delivery[0].PromisedDeliveryPeriod?.EndDate?.value}`)
      // 販売者の手数料番号
      expect(csvBody).not.toContain(`${checkingData.Delivery[0].Despatch?.ID?.value}`)
      // 注文書番号
      expect(csvBody).not.toContain(`${checkingData.OrderReference?.ID?.value}`)
      // 注文書発行日
      expect(csvBody).not.toContain(`${checkingData.OrderReference?.IssueDate?.value}`)
      // 参考情報
      expect(csvBody).not.toContain(`${checkingData.BillingReference[0]?.InvoiceDocumentReference?.ID?.value}`)
      // 契約書番号
      expect(csvBody).not.toContain(`${checkingData.ContractDocumentReference[0]?.ID?.value}`)
      // 部門
      expect(csvBody).not.toContain(`${checkingData.AccountingCost?.value}`)
      // 取引先担当者（アドレス）
      expect(csvBody).not.toContain(`${checkingData.AccountingCustomerParty.Party.Contact?.ID?.value}`)
      // ID
      expect(csvBody).not.toContain(`${checkingData.AccountingCustomerParty.CustomerAssignedAccountID?.value}`)

      for (let i = 0; i < checkingData.AdditionalDocumentReference.length; i++) {
        if (checkingData.AdditionalDocumentReference[i]?.DocumentTypeCode?.value === 'File ID') {
          // 備考
          expect(csvBody).not.toContain(`${checkingData.AdditionalDocumentReference[i].ID.value}`)
        } else if (checkingData.AdditionalDocumentReference[i].DocumentTypeCode.value === 'BOL ID') {
          // 輸送情報
          expect(csvBody).not.toContain(`${checkingData.AdditionalDocumentReference[i].ID.value}`)
        } else if (checkingData.AdditionalDocumentReference[i].DocumentTypeCode.value === 'Interim Hours') {
          // 暫定時間
          expect(csvBody).not.toContain(`${checkingData.AdditionalDocumentReference[i].ID.value}`)
        } else if (checkingData.AdditionalDocumentReference[i].DocumentTypeCode.value === 'Clearance Clave') {
          // 通関識別情報
          expect(csvBody).not.toContain(`${checkingData.AdditionalDocumentReference[i].ID.value}`)
        } else if (checkingData.AdditionalDocumentReference[i].DocumentTypeCode.value === 'TS Clearance') {
          // Tradeshiftクリアランス
          expect(csvBody).not.toContain(`${checkingData.AdditionalDocumentReference[i].ID.value}`)
        } else if (checkingData.AdditionalDocumentReference[i].DocumentTypeCode.value === 'BookingNumber') {
          // 予約番号
          expect(csvBody).not.toContain(`${checkingData.AdditionalDocumentReference[i].ID.value}`)
        }
      }

      // 課税日
      expect(csvBody).not.toContain(`${checkingData.TaxPointDate?.value}`)
      // DUNSナンバー
      expect(csvBody).not.toContain(`${checkingData.AccountingSupplierParty.Party?.PhysicalLocation?.ID?.value}`)
      // 為替レート
      expect(csvBody).not.toContain(`${checkingData.TaxExchangeRate?.CalculationRate?.value}`)
      // 為替レート-通貨
      expect(csvBody).not.toContain(`${checkingData.TaxExchangeRate?.TargetCurrencyCode?.value}`)
      // 為替レート-日付
      expect(csvBody).not.toContain(`${checkingData.TaxExchangeRate?.Date?.value}`)
      // 為替レート換算後の税金総額
      expect(csvBody).not.toContain(`${checkingData.TaxTotal[0]?.TaxSubtotal[0]?.TransactionCurrencyTaxAmount?.value}`)
      // 為替レート-Convertd Document Total(incl taxes)
      const dom = new DOMParser().parseFromString(
        checkingData.UBLExtensions?.UBLExtension[0]?.ExtensionContent?.value,
        'text/xml'
      )
      const xmlValue = dom.getElementsByTagName('ts')[0]?.childNodes[0]?.text
      expect(csvBody).not.toContain(`${xmlValue}`)
    })

    test('正常:支払条件がない場合。', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[0] }
      request.body = {
        invoiceNumber: 'A01016',
        minIssuedate: '2021-08-01',
        maxIssuedate: '2021-11-09'
      }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[0])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[0])

      tenantControllerFindOneSpy.mockReturnValue(Tenants[0])

      contractControllerFindContractSpyon.mockReturnValue(Contracts[0])

      journalfindAllSpy.mockReturnValue(dbJournalTable)

      // 試験実施
      await journalDownload.cbPostIndex(request, response, next)

      // 期待結果
      // responseのヘッダ
      const today = new Date().toISOString().split('T')[0]
      expect(response.setHeader().headers['Content-Disposition']).toContain('attachment; filename=')
      expect(response.setHeader().headers['Content-Disposition']).toContain(`${today}`)
      expect(response.setHeader().headers['Content-Disposition']).toContain('A01016')

      // responseのcsvファイル
      const csvHeader = response.setHeader().body.split('\r\n')[0]
      const csvBody = response.setHeader().body.split('\r\n')[1]
      const checkData = csvBody.split(',')
      expect(csvHeader).toBe(`${String.fromCharCode(0xfeff)}${headers}`)
      // 支払い条件が空欄になっている。
      for (let idx = 52; idx < 59; idx++) {
        expect(checkData[idx]).toBe('""')
      }
    })

    test('正常:支払い方法が全部取得出来る', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[0] }
      request.body = {
        invoiceNumber: 'A01017',
        minIssuedate: '2021-08-01',
        maxIssuedate: '2021-11-09'
      }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[0])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[0])

      tenantControllerFindOneSpy.mockReturnValue(Tenants[0])

      contractControllerFindContractSpyon.mockReturnValue(Contracts[0])

      journalfindAllSpy.mockReturnValue(dbJournalTable)

      // 試験実施
      await journalDownload.cbPostIndex(request, response, next)

      // 期待結果
      // responseのヘッダ
      const today = new Date().toISOString().split('T')[0]
      expect(response.setHeader().headers['Content-Disposition']).toContain('attachment; filename=')
      expect(response.setHeader().headers['Content-Disposition']).toContain(`${today}`)
      expect(response.setHeader().headers['Content-Disposition']).toContain('A01017')

      // responseのcsvファイル
      const csvHeader = response.setHeader().body.split('\r\n')[0]
      const csvBody = response.setHeader().body.split('\r\n')[1]
      const checkingData = require('../mockInvoice/invoice15')
      expect(csvHeader).toBe(`${String.fromCharCode(0xfeff)}${headers}`)
      // 支払い方法が全部取得出来る
      // 支払い条件-割引率
      expect(csvBody).toContain(`${checkingData.PaymentTerms[0].SettlementDiscountPercent.value}`)
      // 支払い条件-割増率
      expect(csvBody).toContain(`${checkingData.PaymentTerms[0].PenaltySurchargePercent.value}`)
      // 支払い条件-決済開始日
      expect(csvBody).toContain(`${checkingData.PaymentTerms[0].SettlementPeriod.StartDate.value}`)
      // 支払い条件-決済終了日
      expect(csvBody).toContain(`${checkingData.PaymentTerms[0].SettlementPeriod.EndDate.value}`)
      // 支払い条件-ペナルティ開始日
      expect(csvBody).toContain(`${checkingData.PaymentTerms[0].PenaltyPeriod.StartDate.value}`)
      // 支払い条件-ペナルティ終了日
      expect(csvBody).toContain(`${checkingData.PaymentTerms[0].PenaltyPeriod.EndDate.value}`)
      // 支払い条件-説明
      expect(csvBody).toContain(`${checkingData.PaymentTerms[0].Note[0].value}`)
      // 銀行口座-銀行名
      expect(csvBody).toContain(
        `${checkingData.PaymentMeans[2].PayeeFinancialAccount?.FinancialInstitutionBranch?.FinancialInstitution?.Name?.value}`
      )
      // 銀行口座-支店名
      expect(csvBody).toContain(
        `${checkingData.PaymentMeans[2].PayeeFinancialAccount.FinancialInstitutionBranch.Name.value}`
      )
      // 銀行口座-口座番号
      expect(csvBody).toContain(`${checkingData.PaymentMeans[2].PayeeFinancialAccount.ID.value}`)
      // 銀行口座-科目
      switch (checkingData.PaymentMeans[2].PayeeFinancialAccount.AccountTypeCode.value) {
        case 'General':
          expect(csvBody).toContain('普通')
          break
        case 'Current':
          expect(csvBody).toContain('当座')
          break
      }
      // 銀行口座-口座名義
      expect(csvBody).toContain(`${checkingData.PaymentMeans[2].PayeeFinancialAccount.Name.value}`)
      // 銀行口座-番地
      expect(csvBody).toContain(
        `${checkingData.PaymentMeans[2].PayeeFinancialAccount.FinancialInstitutionBranch.Address.StreetName.value}`
      )
      // 銀行口座-ビル名 / フロア等
      expect(csvBody).toContain(
        `${checkingData.PaymentMeans[2].PayeeFinancialAccount.FinancialInstitutionBranch.Address.AdditionalStreetName.value}`
      )
      // 銀行口座-家屋番号
      expect(csvBody).toContain(
        `${checkingData.PaymentMeans[2].PayeeFinancialAccount.FinancialInstitutionBranch.Address.BuildingNumber.value}`
      )
      // 銀行口座-市区町村
      expect(csvBody).toContain(
        `${checkingData.PaymentMeans[2].PayeeFinancialAccount.FinancialInstitutionBranch.Address.CountrySubentity.value}`
      )
      // 銀行口座-都道府県
      expect(csvBody).toContain(
        `${checkingData.PaymentMeans[2].PayeeFinancialAccount.FinancialInstitutionBranch.FinancialInstitution.Name.value}`
      )
      // 銀行口座-郵便番号
      expect(csvBody).toContain(
        `${checkingData.PaymentMeans[2].PayeeFinancialAccount.FinancialInstitutionBranch.Address.PostalZone.value}`
      )
      // 銀行口座-所在地
      expect(csvBody).toContain(
        `${checkingData.PaymentMeans[2].PayeeFinancialAccount.FinancialInstitutionBranch.Address.AddressLine[0].Line.value}`
      )
      // 銀行口座-国
      expect(csvBody).toContain(
        `${checkingData.PaymentMeans[2].PayeeFinancialAccount.FinancialInstitutionBranch.Address.Country.IdentificationCode.value}`
      )

      // DirectDebit-銀行名
      expect(csvBody).toContain(
        `${checkingData.PaymentMeans[1].PayeeFinancialAccount.FinancialInstitutionBranch.FinancialInstitution.Name.value}`
      )
      // DirectDebit-支店名
      expect(csvBody).toContain(
        `${checkingData.PaymentMeans[1].PayeeFinancialAccount.FinancialInstitutionBranch.Name.value}`
      )
      // DirectDebit-口座番号
      expect(csvBody).toContain(`${checkingData.PaymentMeans[1].PayeeFinancialAccount.ID.value}`)
      // DirectDebit-科目
      switch (checkingData.PaymentMeans[1].PayeeFinancialAccount.AccountTypeCode.value) {
        case 'General':
          expect(csvBody).toContain('普通')
          break
        case 'Current':
          expect(csvBody).toContain('当座')
          break
      }
      // DirectDebit-口座名義
      expect(csvBody).toContain(`${checkingData.PaymentMeans[1].PayeeFinancialAccount?.Name?.value}`)
      // DirectDebit-番地
      expect(csvBody).toContain(
        `${checkingData.PaymentMeans[1].PayeeFinancialAccount.FinancialInstitutionBranch.Address.StreetName.value}`
      )
      // DirectDebit-ビル名 / フロア等
      expect(csvBody).toContain(
        `${checkingData.PaymentMeans[1].PayeeFinancialAccount.FinancialInstitutionBranch.Address.AdditionalStreetName.value}`
      )
      // DirectDebit-家屋番号
      expect(csvBody).toContain(
        `${checkingData.PaymentMeans[1].PayeeFinancialAccount.FinancialInstitutionBranch.Address?.BuildingNumber.value}`
      )
      // DirectDebit-市区町村
      expect(csvBody).toContain(
        `${checkingData.PaymentMeans[1].PayeeFinancialAccount.FinancialInstitutionBranch.Address.CityName.value}`
      )
      // DirectDebit-都道府県
      expect(csvBody).toContain(
        `${checkingData.PaymentMeans[1].PayeeFinancialAccount.FinancialInstitutionBranch.Address.CountrySubentity.value}`
      )
      // DirectDebit-郵便番号
      expect(csvBody).toContain(
        `${checkingData.PaymentMeans[1].PayeeFinancialAccount.FinancialInstitutionBranch.Address.PostalZone.value}`
      )
      // DirectDebit-所在地
      expect(csvBody).toContain(
        `${checkingData.PaymentMeans[1].PayeeFinancialAccount.FinancialInstitutionBranch.Address.AddressLine[0].Line.value}`
      )
      // DirectDebit-国
      expect(csvBody).toContain(
        `${checkingData.PaymentMeans[1].PayeeFinancialAccount.FinancialInstitutionBranch.Address.Country.IdentificationCode.value}`
      )

      // IBAN払い-IBAN
      expect(csvBody).toContain(`${checkingData.PaymentMeans[3].PayeeFinancialAccount?.ID?.value}`)
      // IBAN払い-説明
      expect(csvBody).toContain(`${checkingData.PaymentMeans[3].PayeeFinancialAccount.PaymentNote[0].value}`)
      // IBAN払い-銀行識別コード / SWIFTコード
      expect(csvBody).toContain(
        `${checkingData.PaymentMeans[3].PayeeFinancialAccount.FinancialInstitutionBranch.FinancialInstitution.ID.value}`
      )

      // 国際電信送金-ABAナンバー
      expect(csvBody).toContain(
        `${checkingData.PaymentMeans[4].PayeeFinancialAccount.FinancialInstitutionBranch.ID.value}`
      )
      // 国際電信送金-SWIFTコード
      expect(csvBody).toContain(
        `${checkingData.PaymentMeans[4].PayeeFinancialAccount.FinancialInstitutionBranch.FinancialInstitution.ID.value}`
      )
      // 国際電信送金-IBAN
      expect(csvBody).toContain(`${checkingData.PaymentMeans[4].PayeeFinancialAccount.ID.value}`)

      // DirectDebit-口座名義
      expect(csvBody).toContain(`${checkingData.PaymentMeans[4].PayeeFinancialAccount.Name.value}`)
      // 国際電信送金-番地
      expect(csvBody).toContain(
        `${checkingData.PaymentMeans[4].PayeeFinancialAccount.FinancialInstitutionBranch.Address.StreetName.value}`
      )
      // 国際電信送金-ビル名 / フロア等
      expect(csvBody).toContain(
        `${checkingData.PaymentMeans[4].PayeeFinancialAccount.FinancialInstitutionBranch.Address.AdditionalStreetName.value}`
      )
      // 国際電信送金-家屋番号
      expect(csvBody).toContain(
        `${checkingData.PaymentMeans[4].PayeeFinancialAccount.FinancialInstitutionBranch.Address.BuildingNumber.value}`
      )
      // 国際電信送金-市区町村
      expect(csvBody).toContain(
        `${checkingData.PaymentMeans[4].PayeeFinancialAccount.FinancialInstitutionBranch.Address.CityName.value}`
      )
      // 国際電信送金-都道府県
      expect(csvBody).toContain(
        `${checkingData.PaymentMeans[4].PayeeFinancialAccount.FinancialInstitutionBranch.Address.CountrySubentity.value}`
      )
      // 国際電信送金-郵便番号
      expect(csvBody).toContain(
        `${checkingData.PaymentMeans[4].PayeeFinancialAccount.FinancialInstitutionBranch.Address.PostalZone.value}`
      )
      // 国際電信送金-所在地
      expect(csvBody).toContain(
        `${checkingData.PaymentMeans[4].PayeeFinancialAccount.FinancialInstitutionBranch.Address.AddressLine[0].Line.value}`
      )
      // 国際電信送金-国
      expect(csvBody).toContain(
        `${checkingData.PaymentMeans[4].PayeeFinancialAccount.FinancialInstitutionBranch.Address.Country.IdentificationCode.value}`
      )
      // 国際電信送金-説明
      expect(csvBody).toContain(`${checkingData.PaymentMeans[4].PayeeFinancialAccount.PaymentNote[0].value}`)
    })

    test('正常:科目が複数の場合', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[0] }
      request.body = {
        invoiceNumber: 'A01018',
        minIssuedate: '2021-08-01',
        maxIssuedate: '2021-11-09'
      }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[0])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[0])

      tenantControllerFindOneSpy.mockReturnValue(Tenants[0])

      contractControllerFindContractSpyon.mockReturnValue(Contracts[0])

      journalfindAllSpy.mockReturnValue(dbJournalTable)

      // 試験実施
      await journalDownload.cbPostIndex(request, response, next)

      // 期待結果
      // responseのヘッダ
      const today = new Date().toISOString().split('T')[0]
      expect(response.setHeader().headers['Content-Disposition']).toContain('attachment; filename=')
      expect(response.setHeader().headers['Content-Disposition']).toContain(`${today}`)
      expect(response.setHeader().headers['Content-Disposition']).toContain('A01018')

      // responseのcsvファイル
      const csvHeader = response.setHeader().body.split('\r\n')[0]
      const csvBody = response.setHeader().body.split('\r\n')[1]

      expect(csvHeader).toBe(`${String.fromCharCode(0xfeff)}${headers}`)
      // 支払い条件が複数になっている。
      expect(csvBody).toContain("'支払方法2':'小切手払い'")
    })

    test('正常:国際電信送金が複数の場合', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[0] }
      request.body = {
        invoiceNumber: 'A01019',
        minIssuedate: '2021-08-01',
        maxIssuedate: '2021-11-09'
      }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[0])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[0])

      tenantControllerFindOneSpy.mockReturnValue(Tenants[0])

      contractControllerFindContractSpyon.mockReturnValue(Contracts[0])

      journalfindAllSpy.mockReturnValue(dbJournalTable)

      // 試験実施
      await journalDownload.cbPostIndex(request, response, next)

      // 期待結果
      // responseのヘッダ
      const today = new Date().toISOString().split('T')[0]
      expect(response.setHeader().headers['Content-Disposition']).toContain('attachment; filename=')
      expect(response.setHeader().headers['Content-Disposition']).toContain(`${today}`)
      expect(response.setHeader().headers['Content-Disposition']).toContain('A01019')

      // responseのcsvファイル
      const csvHeader = response.setHeader().body.split('\r\n')[0]
      const csvBody = response.setHeader().body.split('\r\n')[1]
      expect(csvHeader).toBe(`${String.fromCharCode(0xfeff)}${headers}`)
      // 国際電信送金3がある
      expect(csvBody).toContain('国際電信送金3')
    })

    test('正常:DirectDebitが複数の場合', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[0] }
      request.body = {
        invoiceNumber: 'A01020',
        minIssuedate: '2021-08-01',
        maxIssuedate: '2021-11-09'
      }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[0])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[0])

      tenantControllerFindOneSpy.mockReturnValue(Tenants[0])

      contractControllerFindContractSpyon.mockReturnValue(Contracts[0])

      journalfindAllSpy.mockReturnValue(dbJournalTable)

      // 試験実施
      await journalDownload.cbPostIndex(request, response, next)

      // 期待結果
      // responseのヘッダ
      const today = new Date().toISOString().split('T')[0]
      expect(response.setHeader().headers['Content-Disposition']).toContain('attachment; filename=')
      expect(response.setHeader().headers['Content-Disposition']).toContain(`${today}`)
      expect(response.setHeader().headers['Content-Disposition']).toContain('A01020')

      // responseのcsvファイル
      const csvHeader = response.setHeader().body.split('\r\n')[0]
      const csvBody = response.setHeader().body.split('\r\n')[1]
      expect(csvHeader).toBe(`${String.fromCharCode(0xfeff)}${headers}`)
      // DirectDebit3がある
      expect(csvBody).toContain('DirectDebit3')
    })

    test('正常:銀行口座が複数の場合', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[0] }
      request.body = {
        invoiceNumber: 'A01021',
        minIssuedate: '2021-08-01',
        maxIssuedate: '2021-11-09'
      }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[0])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[0])

      tenantControllerFindOneSpy.mockReturnValue(Tenants[0])

      contractControllerFindContractSpyon.mockReturnValue(Contracts[0])

      journalfindAllSpy.mockReturnValue(dbJournalTable)

      // 試験実施
      await journalDownload.cbPostIndex(request, response, next)

      // 期待結果
      // responseのヘッダ
      const today = new Date().toISOString().split('T')[0]
      expect(response.setHeader().headers['Content-Disposition']).toContain('attachment; filename=')
      expect(response.setHeader().headers['Content-Disposition']).toContain(`${today}`)
      expect(response.setHeader().headers['Content-Disposition']).toContain('A01021')

      // responseのcsvファイル
      const csvHeader = response.setHeader().body.split('\r\n')[0]
      const csvBody = response.setHeader().body.split('\r\n')[1]
      expect(csvHeader).toBe(`${String.fromCharCode(0xfeff)}${headers}`)
      // 口座名義3がある
      expect(csvBody).toContain('口座名義3')
    })

    test('正常:IBANが複数の場合', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[0] }
      request.body = {
        invoiceNumber: 'A01022',
        minIssuedate: '2021-08-01',
        maxIssuedate: '2021-11-09'
      }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[0])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[0])

      tenantControllerFindOneSpy.mockReturnValue(Tenants[0])

      contractControllerFindContractSpyon.mockReturnValue(Contracts[0])

      journalfindAllSpy.mockReturnValue(dbJournalTable)

      // 試験実施
      await journalDownload.cbPostIndex(request, response, next)

      // 期待結果
      // responseのヘッダ
      const today = new Date().toISOString().split('T')[0]
      expect(response.setHeader().headers['Content-Disposition']).toContain('attachment; filename=')
      expect(response.setHeader().headers['Content-Disposition']).toContain(`${today}`)
      expect(response.setHeader().headers['Content-Disposition']).toContain('A01022')

      // responseのcsvファイル
      const csvHeader = response.setHeader().body.split('\r\n')[0]
      const csvBody = response.setHeader().body.split('\r\n')[1]
      expect(csvHeader).toBe(`${String.fromCharCode(0xfeff)}${headers}`)
      // IBANノート3がある
      expect(csvBody).toContain('IBANノート3')
    })

    test('正常:現金払いが複数の場合', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[0] }
      request.body = {
        invoiceNumber: 'A01023',
        minIssuedate: '2021-08-01',
        maxIssuedate: '2021-11-09'
      }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[0])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[0])

      tenantControllerFindOneSpy.mockReturnValue(Tenants[0])

      contractControllerFindContractSpyon.mockReturnValue(Contracts[0])

      journalfindAllSpy.mockReturnValue(dbJournalTable)

      // 試験実施
      await journalDownload.cbPostIndex(request, response, next)

      // 期待結果
      // responseのヘッダ
      const today = new Date().toISOString().split('T')[0]
      expect(response.setHeader().headers['Content-Disposition']).toContain('attachment; filename=')
      expect(response.setHeader().headers['Content-Disposition']).toContain(`${today}`)
      expect(response.setHeader().headers['Content-Disposition']).toContain('A01023')

      // responseのcsvファイル
      const csvHeader = response.setHeader().body.split('\r\n')[0]
      const csvBody = response.setHeader().body.split('\r\n')[1]
      expect(csvHeader).toBe(`${String.fromCharCode(0xfeff)}${headers}`)
      // 現金払いがある
      expect(csvBody).toContain("'支払方法2':'現金払い'")
    })

    test('正常:小切手払いが複数の場合', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[0] }
      request.body = {
        invoiceNumber: 'A01024',
        minIssuedate: '2021-08-01',
        maxIssuedate: '2021-11-09'
      }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[0])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[0])

      tenantControllerFindOneSpy.mockReturnValue(Tenants[0])

      contractControllerFindContractSpyon.mockReturnValue(Contracts[0])

      journalfindAllSpy.mockReturnValue(dbJournalTable)

      // 試験実施
      await journalDownload.cbPostIndex(request, response, next)

      // 期待結果
      // responseのヘッダ
      const today = new Date().toISOString().split('T')[0]
      expect(response.setHeader().headers['Content-Disposition']).toContain('attachment; filename=')
      expect(response.setHeader().headers['Content-Disposition']).toContain(`${today}`)
      expect(response.setHeader().headers['Content-Disposition']).toContain('A01024')

      // responseのcsvファイル
      const csvHeader = response.setHeader().body.split('\r\n')[0]
      const csvBody = response.setHeader().body.split('\r\n')[1]
      expect(csvHeader).toBe(`${String.fromCharCode(0xfeff)}${headers}`)
      // 小切手払いがある
      expect(csvBody).toContain("'支払方法2':'小切手払い'")
    })

    test('正常:BankCardが複数の場合', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[0] }
      request.body = {
        invoiceNumber: 'A01025',
        minIssuedate: '2021-08-01',
        maxIssuedate: '2021-11-09'
      }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[0])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[0])

      tenantControllerFindOneSpy.mockReturnValue(Tenants[0])

      contractControllerFindContractSpyon.mockReturnValue(Contracts[0])

      journalfindAllSpy.mockReturnValue(dbJournalTable)

      // 試験実施
      await journalDownload.cbPostIndex(request, response, next)

      // 期待結果
      // responseのヘッダ
      const today = new Date().toISOString().split('T')[0]
      expect(response.setHeader().headers['Content-Disposition']).toContain('attachment; filename=')
      expect(response.setHeader().headers['Content-Disposition']).toContain(`${today}`)
      expect(response.setHeader().headers['Content-Disposition']).toContain('A01025')

      // responseのcsvファイル
      const csvHeader = response.setHeader().body.split('\r\n')[0]
      const csvBody = response.setHeader().body.split('\r\n')[1]
      expect(csvHeader).toBe(`${String.fromCharCode(0xfeff)}${headers}`)
      // BankCardがある
      expect(csvBody).toContain("'支払方法2':'BankCard'")
    })

    test('正常:明細部分のオプションが登録された（割引・追加料金各5個）場合', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[0] }
      request.body = {
        invoiceNumber: 'A01027',
        minIssuedate: '2021-08-01',
        maxIssuedate: '2021-11-09'
      }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[0])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[0])

      tenantControllerFindOneSpy.mockReturnValue(Tenants[0])

      contractControllerFindContractSpyon.mockReturnValue(Contracts[0])

      journalfindAllSpy.mockReturnValue(dbJournalTable)

      // 試験実施
      await journalDownload.cbPostIndex(request, response, next)

      // 期待結果
      // responseのヘッダ
      const today = new Date().toISOString().split('T')[0]
      expect(response.setHeader().headers['Content-Disposition']).toContain('attachment; filename=')
      expect(response.setHeader().headers['Content-Disposition']).toContain(`${today}`)
      expect(response.setHeader().headers['Content-Disposition']).toContain('A01027')

      // responseのcsvファイル
      const csvHeader = response.setHeader().body.split('\r\n')[0]
      const csvBody = response.setHeader().body.split('\r\n')[1]
      expect(csvHeader).toBe(`${String.fromCharCode(0xfeff)}${headers}`)
      // 明細-追加料金が5個ある
      expect(csvBody).toContain('追加料金１')
      expect(csvBody).toContain('追加料金２')
      expect(csvBody).toContain('追加料金３')
      expect(csvBody).toContain('追加料金４')
      expect(csvBody).toContain('追加料金５')
      // 明細-割引が5個ある
      expect(csvBody).toContain('割引１')
      expect(csvBody).toContain('割引２')
      expect(csvBody).toContain('割引３')
      expect(csvBody).toContain('割引４')
      expect(csvBody).toContain('割引５')
    })

    test('正常:明細部分のオプションが登録された（JPY、割引・追加料金各5個）場合', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[0] }
      request.body = {
        invoiceNumber: 'A01028',
        minIssuedate: '2021-08-01',
        maxIssuedate: '2021-11-09',
        minDueDate: ''
      }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[0])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[0])

      tenantControllerFindOneSpy.mockReturnValue(Tenants[0])

      contractControllerFindContractSpyon.mockReturnValue(Contracts[0])

      journalfindAllSpy.mockReturnValue(dbJournalTable)

      // 試験実施
      await journalDownload.cbPostIndex(request, response, next)

      // 期待結果
      // responseのヘッダ
      const today = new Date().toISOString().split('T')[0]
      expect(response.setHeader().headers['Content-Disposition']).toContain('attachment; filename=')
      expect(response.setHeader().headers['Content-Disposition']).toContain(`${today}`)
      expect(response.setHeader().headers['Content-Disposition']).toContain('A01028')

      // responseのcsvファイル
      const csvHeader = response.setHeader().body.split('\r\n')[0]
      const csvBody = response.setHeader().body.split('\r\n')[1]
      expect(csvHeader).toBe(`${String.fromCharCode(0xfeff)}${headers}`)
      // 明細-追加料金が5個ある
      expect(csvBody).toContain('追加料金１')
      expect(csvBody).toContain('追加料金２')
      expect(csvBody).toContain('追加料金３')
      expect(csvBody).toContain('追加料金４')
      expect(csvBody).toContain('追加料金５')
      // 明細-割引が5個ある
      expect(csvBody).toContain('割引１')
      expect(csvBody).toContain('割引２')
      expect(csvBody).toContain('割引３')
      expect(csvBody).toContain('割引４')
      expect(csvBody).toContain('割引５')
      // JPYがある
      expect(csvBody).toContain('JPY')
    })

    test('正常:明細部分のオプションが登録された（割引・追加料金各3個）場合', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[0] }
      request.body = {
        invoiceNumber: 'A01032',
        minIssuedate: '2021-08-01',
        maxIssuedate: '2021-11-09'
      }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[0])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[0])

      tenantControllerFindOneSpy.mockReturnValue(Tenants[0])

      contractControllerFindContractSpyon.mockReturnValue(Contracts[0])

      journalfindAllSpy.mockReturnValue(dbJournalTable)

      // 試験実施
      await journalDownload.cbPostIndex(request, response, next)

      // 期待結果
      // responseのヘッダ
      const today = new Date().toISOString().split('T')[0]
      expect(response.setHeader().headers['Content-Disposition']).toContain('attachment; filename=')
      expect(response.setHeader().headers['Content-Disposition']).toContain(`${today}`)
      expect(response.setHeader().headers['Content-Disposition']).toContain('A01032')

      // responseのcsvファイル
      const csvHeader = response.setHeader().body.split('\r\n')[0]
      const csvBody = response.setHeader().body.split('\r\n')[1]
      expect(csvHeader).toBe(`${String.fromCharCode(0xfeff)}${headers}`)
      // 明細-追加料金が5個ある
      expect(csvBody).toContain('追加料金１')
      expect(csvBody).toContain('追加料金２')
      expect(csvBody).toContain('追加料金３')
      // 明細-割引が5個ある
      expect(csvBody).toContain('割引１')
      expect(csvBody).toContain('割引２')
      expect(csvBody).toContain('割引３')
    })

    test('正常:割引・追加料金を登録した場合（各５個）', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[0] }
      request.body = {
        invoiceNumber: 'A01033',
        minIssuedate: '2021-08-01',
        maxIssuedate: '2021-11-09'
      }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[0])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[0])

      tenantControllerFindOneSpy.mockReturnValue(Tenants[0])

      contractControllerFindContractSpyon.mockReturnValue(Contracts[0])

      journalfindAllSpy.mockReturnValue(dbJournalTable)

      // 試験実施
      await journalDownload.cbPostIndex(request, response, next)

      // 期待結果
      // responseのヘッダ
      const today = new Date().toISOString().split('T')[0]
      expect(response.setHeader().headers['Content-Disposition']).toContain('attachment; filename=')
      expect(response.setHeader().headers['Content-Disposition']).toContain(`${today}`)
      expect(response.setHeader().headers['Content-Disposition']).toContain('A01033')

      // responseのcsvファイル
      const csvHeader = response.setHeader().body.split('\r\n')[0]
      const csvBody = response.setHeader().body.split('\r\n')[1]
      expect(csvHeader).toBe(`${String.fromCharCode(0xfeff)}${headers}`)
      // 明細-追加料金が5個ある
      expect(csvBody).toContain('追加料金１')
      expect(csvBody).toContain('追加料金２')
      expect(csvBody).toContain('追加料金３')
      expect(csvBody).toContain('追加料金４')
      expect(csvBody).toContain('追加料金５')
      // 明細-割引が5個ある
      expect(csvBody).toContain('割引１')
      expect(csvBody).toContain('割引２')
      expect(csvBody).toContain('割引３')
      expect(csvBody).toContain('割引４')
      expect(csvBody).toContain('割引５')
      // 固定税がない
      expect(csvBody).not.toContain('固定税')
    })

    test('正常:割引・追加料金を登録した場合（固定税設定した場合、各５個）', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[0] }
      request.body = {
        invoiceNumber: 'A01029',
        minIssuedate: '2021-08-01',
        maxIssuedate: '2021-11-09'
      }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[0])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[0])

      tenantControllerFindOneSpy.mockReturnValue(Tenants[0])

      contractControllerFindContractSpyon.mockReturnValue(Contracts[0])

      journalfindAllSpy.mockReturnValue(dbJournalTable)

      // 試験実施
      await journalDownload.cbPostIndex(request, response, next)

      // 期待結果
      // responseのヘッダ
      const today = new Date().toISOString().split('T')[0]
      expect(response.setHeader().headers['Content-Disposition']).toContain('attachment; filename=')
      expect(response.setHeader().headers['Content-Disposition']).toContain(`${today}`)
      expect(response.setHeader().headers['Content-Disposition']).toContain('A01029')

      // responseのcsvファイル
      const csvHeader = response.setHeader().body.split('\r\n')[0]
      const csvBody = response.setHeader().body.split('\r\n')[1]
      expect(csvHeader).toBe(`${String.fromCharCode(0xfeff)}${headers}`)
      // 明細-追加料金が3個ある
      expect(csvBody).toContain('追加料金１')
      expect(csvBody).toContain('追加料金２')
      expect(csvBody).toContain('追加料金３')
      expect(csvBody).toContain('追加料金４')
      expect(csvBody).toContain('追加料金５')
      // 明細-割引が3個ある
      expect(csvBody).toContain('割引１')
      expect(csvBody).toContain('割引２')
      expect(csvBody).toContain('割引３')
      expect(csvBody).toContain('割引４')
      expect(csvBody).toContain('割引５')
      // 固定税がある
      expect(csvBody).toContain('固定税')
    })

    test('正常:割引・追加料金を登録した場合（JPY設定した場合、各５個）', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[0] }
      request.body = {
        invoiceNumber: 'A01030',
        minIssuedate: '2021-08-01',
        maxIssuedate: '2021-11-09'
      }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[0])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[0])

      tenantControllerFindOneSpy.mockReturnValue(Tenants[0])

      contractControllerFindContractSpyon.mockReturnValue(Contracts[0])

      journalfindAllSpy.mockReturnValue(dbJournalTable)

      // 試験実施
      await journalDownload.cbPostIndex(request, response, next)

      // 期待結果
      // responseのヘッダ
      const today = new Date().toISOString().split('T')[0]
      expect(response.setHeader().headers['Content-Disposition']).toContain('attachment; filename=')
      expect(response.setHeader().headers['Content-Disposition']).toContain(`${today}`)
      expect(response.setHeader().headers['Content-Disposition']).toContain('A01030')

      // responseのcsvファイル
      const csvHeader = response.setHeader().body.split('\r\n')[0]
      const csvBody = response.setHeader().body.split('\r\n')[1]
      expect(csvHeader).toBe(`${String.fromCharCode(0xfeff)}${headers}`)
      // 明細-追加料金が5個ある
      expect(csvBody).toContain('追加料金１')
      expect(csvBody).toContain('追加料金２')
      expect(csvBody).toContain('追加料金３')
      expect(csvBody).toContain('追加料金４')
      expect(csvBody).toContain('追加料金５')
      // 明細-割引が5個ある
      expect(csvBody).toContain('割引１')
      expect(csvBody).toContain('割引２')
      expect(csvBody).toContain('割引３')
      expect(csvBody).toContain('割引４')
      expect(csvBody).toContain('割引５')
      // JPYがある
      expect(csvBody).toContain('JPY')
    })

    test('正常:割引・追加料金を登録した場合（各３個）', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[0] }
      request.body = {
        invoiceNumber: 'A01031',
        minIssuedate: '2021-08-01',
        maxIssuedate: '2021-11-09'
      }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[0])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[0])

      tenantControllerFindOneSpy.mockReturnValue(Tenants[0])

      contractControllerFindContractSpyon.mockReturnValue(Contracts[0])

      journalfindAllSpy.mockReturnValue(dbJournalTable)

      // 試験実施
      await journalDownload.cbPostIndex(request, response, next)

      // 期待結果
      // responseのヘッダ
      const today = new Date().toISOString().split('T')[0]
      expect(response.setHeader().headers['Content-Disposition']).toContain('attachment; filename=')
      expect(response.setHeader().headers['Content-Disposition']).toContain(`${today}`)
      expect(response.setHeader().headers['Content-Disposition']).toContain('A01031')

      // responseのcsvファイル
      const csvHeader = response.setHeader().body.split('\r\n')[0]
      const csvBody = response.setHeader().body.split('\r\n')[1]
      expect(csvHeader).toBe(`${String.fromCharCode(0xfeff)}${headers}`)
      // 明細-追加料金が3個ある
      expect(csvBody).toContain('追加料金１')
      expect(csvBody).toContain('追加料金２')
      expect(csvBody).toContain('追加料金３')
      // 明細-割引が3個ある
      expect(csvBody).toContain('割引１')
      expect(csvBody).toContain('割引２')
      expect(csvBody).toContain('割引３')
    })

    test('正常:請求書複数の場合', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[0] }
      request.body = {
        invoiceNumber: '',
        minIssuedate: '2021-08-01',
        maxIssuedate: '2021-11-09'
      }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[0])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[0])

      tenantControllerFindOneSpy.mockReturnValue(Tenants[0])

      contractControllerFindContractSpyon.mockReturnValue(Contracts[0])

      journalfindAllSpy.mockReturnValue(dbJournalTable)

      // 試験実施
      await journalDownload.cbPostIndex(request, response, next)

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

      expect(csvHeader).toBe(`${String.fromCharCode(0xfeff)}${headers}`)
    })

    test('準正常:請求書複数の場合のAPIエラー', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[0] }
      request.body = {
        invoiceNumber: 'A01009',
        minIssuedate: '1990-01-01',
        maxIssuedate: '2021-11-09'
      }

      request.flash = jest.fn()

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[0])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[0])

      tenantControllerFindOneSpy.mockReturnValue(Tenants[0])

      contractControllerFindContractSpyon.mockReturnValue(Contracts[0])

      journalfindAllSpy.mockReturnValue(dbJournalTable)

      // 試験実施
      await journalDownload.cbPostIndex(request, response, next)

      // 期待結果
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
      expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
      // request.flashが呼ばれ「る」
      expect(request.flash).toHaveBeenCalledWith('noti', [
        '請求書ダウンロード',
        'APIエラーが発生しました。時間を空けてもう一度試してください。'
      ])
      // ポータルにリダイレクト「される」
      expect(response.redirect).toHaveBeenCalledWith(303, '/journalDownload')
      expect(response.getHeader('Location')).toEqual('/journalDownload')
    })

    test('準正常:請求書番号APIエラー', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[0] }
      request.body = {
        invoiceNumber: 'A01009'
      }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[0])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[0])

      tenantControllerFindOneSpy.mockReturnValue(Tenants[0])

      contractControllerFindContractSpyon.mockReturnValue(Contracts[0])

      journalfindAllSpy.mockReturnValue(dbJournalTable)

      // 試験実施
      await journalDownload.cbPostIndex(request, response, next)

      // 期待結果
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
      expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
      // request.flashが呼ばれ「る」
      expect(request.flash).toHaveBeenCalledWith('noti', [
        '請求書ダウンロード',
        'APIエラーが発生しました。時間を空けてもう一度試してください。'
      ])
      // ポータルにリダイレクト「される」
      expect(response.redirect).toHaveBeenCalledWith(303, '/journalDownload')
      expect(response.getHeader('Location')).toEqual('/journalDownload')
    })

    test('準正常:企業検索エラー', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[0] }
      request.body = {
        invoiceNumber: 'A01031'
      }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[0])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[0])

      tenantControllerFindOneSpy.mockReturnValue(Tenants[0])

      contractControllerFindContractSpyon.mockReturnValue(Contracts[0])

      journalfindAllSpy.mockReturnValue(dbJournalTable)

      const apiError = new Error('API ERROR')
      getSentToCompanySpy.mockReturnValue(apiError)

      // 試験実施
      await journalDownload.cbPostIndex(request, response, next)

      // 期待結果
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
      expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
      // request.flashが呼ばれ「る」
      expect(request.flash).toHaveBeenCalledWith('noti', [
        '請求書ダウンロード',
        'APIエラーが発生しました。時間を空けてもう一度試してください。'
      ])
      // ポータルにリダイレクト「される」
      expect(response.redirect).toHaveBeenCalledWith(303, '/journalDownload')
      expect(response.getHeader('Location')).toEqual('/journalDownload')
    })

    test('準正常:仕訳DBエラー', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[0] }
      request.body = {
        invoiceNumber: ''
      }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[0])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[0])

      tenantControllerFindOneSpy.mockReturnValue(Tenants[0])

      contractControllerFindContractSpyon.mockReturnValue(Contracts[0])

      const dbError = new Error('DB ERROR')
      journalfindAllSpy.mockReturnValue(dbError)

      // 試験実施
      await journalDownload.cbPostIndex(request, response, next)

      // 期待結果
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
      expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
      // request.flashが呼ばれ「る」
      expect(request.flash).toHaveBeenCalledWith('noti', [
        '請求書ダウンロード',
        'システムエラーが発生しました。時間を空けてもう一度試してください。'
      ])
      // ポータルにリダイレクト「される」
      expect(response.redirect).toHaveBeenCalledWith(303, '/journalDownload')
      expect(response.getHeader('Location')).toEqual('/journalDownload')
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

      journalfindAllSpy.mockReturnValue(dbJournalTable)

      // 試験実施
      await journalDownload.cbPostIndex(request, response, next)

      // 期待結果
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
      expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
      // request.flashが呼ばれ「る」
      expect(request.flash).toHaveBeenCalledWith('noti', [
        '請求書ダウンロード',
        'APIエラーが発生しました。時間を空けてもう一度試してください。'
      ])
      // ポータルにリダイレクト「される」
      expect(response.redirect).toHaveBeenCalledWith(303, '/journalDownload')
      expect(response.getHeader('Location')).toEqual('/journalDownload')
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

      journalfindAllSpy.mockReturnValue(dbJournalTable)

      // 試験実施
      await journalDownload.cbPostIndex(request, response, next)

      // 期待結果
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
      expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
      // request.flashが呼ばれ「る」
      expect(request.flash).toHaveBeenCalledWith('noti', [
        '請求書ダウンロード',
        '条件に合致する請求書が見つかりませんでした。'
      ])
      // ポータルにリダイレクト「される」
      expect(response.redirect).toHaveBeenCalledWith(303, '/journalDownload')
      expect(response.getHeader('Location')).toEqual('/journalDownload')
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

      journalfindAllSpy.mockReturnValue(dbJournalTable)

      // 試験実施
      await journalDownload.cbPostIndex(request, response, next)

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
      expect(csvHeader).toBe(`${String.fromCharCode(0xfeff)}${headers}`)

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

      journalfindAllSpy.mockReturnValue(dbJournalTable)

      // 試験実施
      await journalDownload.cbPostIndex(request, response, next)

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
      expect(csvHeader).toBe(`${String.fromCharCode(0xfeff)}${headers}`)

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

      journalfindAllSpy.mockReturnValue(dbJournalTable)

      // 試験実施
      await journalDownload.cbPostIndex(request, response, next)

      // 期待結果
      // userContextがLoggedInになっている
      expect(request.session?.userContext).toBe('LoggedIn')
      // session.userRoleが'a6a3edcd-00d9-427c-bf03-4ef0112ba16d'になっている
      expect(request.session?.userRole).toBe('a6a3edcd-00d9-427c-bf03-4ef0112ba16d')
      // request.flashが呼ばれ「る」
      expect(request.flash).toHaveBeenCalledWith('noti', [
        '請求書ダウンロード',
        '条件に合致する請求書が見つかりませんでした。'
      ])
      // ポータルにリダイレクト「される」
      expect(response.redirect).toHaveBeenCalledWith(303, '/journalDownload')
      expect(response.getHeader('Location')).toEqual('/journalDownload')
    })

    test('正常：解約申込中の場合', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[1] }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[6])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[5])

      tenantControllerFindOneSpy.mockReturnValue(Tenants[5])

      contractControllerFindContractSpyon.mockReturnValue(Contracts[5])

      journalfindAllSpy.mockReturnValue(dbJournalTable)

      // 試験実施
      await journalDownload.cbPostIndex(request, response, next)

      // 期待結果
      // 404，500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(500))
      // 解約画面表示
      expect(next).toHaveBeenCalledWith(noticeHelper.create('cancelprocedure'))
    })

    test('500エラー：requestのsession,userIdがnullの場合', async () => {
      // 試験実施
      await journalDownload.cbPostIndex(request, response, next)

      // 期待結果
      // 500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(500))
      // 404エラー画面表示
      expect(next).toHaveBeenCalledWith(errorHelper.create(400))
      expect(response.render).not.toHaveBeenCalledWith()
    })

    test('正常:1つの企業の場合', async () => {
      // 準備
      // requestのsession,userIdに正常値を入れる
      request.session = { ...session }
      request.user = { ...user[0] }
      request.body = {
        invoiceNumber: 'A01001',
        sentTo: 'f783be0e-e716-4eab-a7ec-5ce36b3c7b31',
        sentBy: '221559d0-53aa-44a2-ab29-0c4a6cb02bde',
        minIssuedate: '2021-08-01',
        maxIssuedate: '2021-11-09'
      }

      // DBからの正常なユーザデータの取得を想定する
      userControllerFindOneSpy.mockReturnValue(Users[0])
      // DBからの正常な契約情報取得を想定する
      contractControllerFindOneSpy.mockReturnValue(Contracts[0])

      tenantControllerFindOneSpy.mockReturnValue(Tenants[0])

      contractControllerFindContractSpyon.mockReturnValue(Contracts[0])

      journalfindAllSpy.mockReturnValue(dbJournalTable)

      // 試験実施
      await journalDownload.cbPostIndex(request, response, next)

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
      expect(csvHeader).toBe(`${String.fromCharCode(0xfeff)}${headers}`)
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

      journalfindAllSpy.mockReturnValue(dbJournalTable)

      // 試験実施
      await journalDownload.cbPostIndex(request, response, next)

      // 期待結果
      // 404，500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(500))
      // エラーが発生するとダウンロードページにリダイレクト及びエラーメッセージ表示
      expect(response.statusCode).toBe(303)
      expect(response.headers.Location).toMatch('/journalDownload')
      expect(request.flash).toHaveBeenCalledWith('noti', [notiTitle, journalDownloadSysError])
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

      journalfindAllSpy.mockReturnValue(dbJournalTable)

      // 試験実施
      await journalDownload.cbPostIndex(request, response, next)

      // 期待結果
      // 500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(500))
      // 404画面を表示する。
      expect(next).toHaveBeenCalledWith(errorHelper.create(404))
      // response.renderが呼ばれない
      expect(response.render).not.toHaveBeenCalledWith()
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

      journalfindAllSpy.mockReturnValue(dbJournalTable)

      // 試験実施
      await journalDownload.cbPostIndex(request, response, next)

      // 期待結果
      // 404，500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(error404)
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(500))
      // エラーが発生するとダウンロードページにリダイレクト及びエラーメッセージ表示
      expect(response.statusCode).toBe(303)
      expect(response.headers.Location).toMatch('/journalDownload')
      expect(request.flash).toHaveBeenCalledWith('noti', [notiTitle, journalDownloadSysError])
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

      journalfindAllSpy.mockReturnValue(dbJournalTable)

      helper.checkContractStatus = (req, res, next) => {
        return 999
      }

      // 試験実施
      await journalDownload.cbPostIndex(request, response, next)

      // 期待結果
      // 500エラーがエラーハンドリング「されない」
      expect(next).not.toHaveBeenCalledWith(errorHelper.create(500))
      // エラー画面表示
      expect(next).toHaveBeenCalledWith(errorHelper.create(400))
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

      journalfindAllSpy.mockReturnValue(dbJournalTable)

      // 試験実施
      await journalDownload.errorHandle(
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
      expect(response.redirect).toHaveBeenCalledWith(303, '/journalDownload')
      expect(response.getHeader('Location')).toEqual('/journalDownload')
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

      journalfindAllSpy.mockReturnValue(dbJournalTable)

      // 試験実施
      await journalDownload.errorHandle(
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
      expect(response.redirect).toHaveBeenCalledWith(303, '/journalDownload')
      expect(response.getHeader('Location')).toEqual('/journalDownload')
    })
  })
})
