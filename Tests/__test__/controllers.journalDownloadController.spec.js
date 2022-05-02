'use strict'
jest.mock('../../Application/models')
jest.mock('../../Application/lib/logger')

const journalDownloadController = require('../../Application/controllers/journalDownloadController')
const apiManager = require('../../Application/controllers/apiManager.js')
const logger = require('../../Application/lib/logger')
const JournalizeInvoice = require('../../Application/models').JournalizeInvoice
const Contract = require('../../Application/models').Contract
const requestApprovalController = require('../../Application/controllers/requestApprovalController')
const YayoiService = require('../../Application/service/YayoiService')
const ObcService = require('../../Application/service/ObcService')

let findOneRequestApprovalSpy, journalfindAllSpy, errorSpy, getCodingSpy, yayoiServiceSpy, obcServiceSpy

describe('journalDownloadControllerのテスト', () => {
  beforeEach(() => {
    apiManager.accessTradeshift = require('../lib/apiManager')
    journalfindAllSpy = jest.spyOn(JournalizeInvoice, 'findAll')
    getCodingSpy = jest.spyOn(Contract, 'findAll')
    findOneRequestApprovalSpy = jest.spyOn(requestApprovalController, 'findOneRequestApproval')
    yayoiServiceSpy = jest.spyOn(YayoiService.prototype, 'convertToKaikei')
    obcServiceSpy = jest.spyOn(ObcService.prototype, 'convertToKaikei')
    errorSpy = jest.spyOn(logger, 'error')
  })
  afterEach(() => {
    journalfindAllSpy.mockRestore()
    getCodingSpy.mockRestore()
    findOneRequestApprovalSpy.mockRestore()
    yayoiServiceSpy.mockRestore()
    obcServiceSpy.mockRestore()
    errorSpy.mockRestore()
  })

  // ヘッダ予想値
  const header =
    '請求書番号,発行日,宛先-テナントID,宛先-会社名,宛先-国/地域,宛先-私書箱,宛先-郵便番号,宛先-都道府県,宛先-市区町村・番地,宛先-ビル、マンション名,宛先-登録番号,宛先-GLN,宛先-法人番号,差出人-テナントID,差出人-会社名,差出人-国/地域,差出人-私書箱,差出人-郵便番号,差出人-都道府県,差出人-市区町村・番地,差出人-ビル、マンション名,差出人-登録番号,差出人-GLN,差出人-法人番号,支払期日,納品日,納品開始日,納品終了日,備考,注文書番号,注文書発行日,参考情報,契約書番号,部門,取引先担当者（アドレス）,輸送情報,Tradeshiftクリアランス,通関識別情報,ID,課税日,販売者の手数料番号,DUNSナンバー,暫定時間,予約番号,為替レート,為替レート-通貨,為替レート-日付,為替レート換算後の税金総額,為替レート-Convertd Document Total(incl taxes),支払方法,支払い条件-割引率,支払い条件-割増率,支払い条件-決済開始日,支払い条件-決済終了日,支払い条件-ペナルティ開始日,支払い条件-ペナルティ終了日,支払い条件-説明,銀行口座-銀行名,銀行口座-支店名,銀行口座-口座番号,銀行口座-科目,銀行口座-口座名義,銀行口座-番地,銀行口座-ビル名 / フロア等,銀行口座-家屋番号,銀行口座-市区町村,銀行口座-都道府県,銀行口座-郵便番号,銀行口座-所在地,銀行口座-国,DirectDebit-銀行名,DirectDebit-支店名,DirectDebit-口座番号,DirectDebit-科目,DirectDebit-口座名義,DirectDebit-番地,DirectDebit-ビル名 / フロア等,DirectDebit-家屋番号,DirectDebit-市区町村,DirectDebit-都道府県,DirectDebit-郵便番号,DirectDebit-所在地,DirectDebit-国,IBAN払い-銀行識別コード / SWIFTコード,IBAN払い-IBAN,IBAN払い-説明,国際電信送金-ABAナンバー,国際電信送金-SWIFTコード,国際電信送金-IBAN,国際電信送金-口座名義,国際電信送金-番地,国際電信送金-ビル名 / フロア等,国際電信送金-家屋番号,国際電信送金-市区町村,国際電信送金-都道府県,国際電信送金-郵便番号,国際電信送金 - 所在地,国際電信送金-国,国際電信送金-説明,支払方法-予備,その他特記事項,明細-項目ID,明細-内容,明細-数量,明細-単位,明細-単価,明細-税（消費税／軽減税率／不課税／免税／非課税）,明細-小計 (税抜),明細-割引1-内容,明細-割引1-値,明細-割引1-単位,明細-割引1-単価,明細-割引2-内容,明細-割引2-値,明細-割引2-単位,明細-割引2-単価,明細-割引3-内容,明細-割引3-値,明細-割引3-単位,明細-割引3-単価,明細-割引4以降,明細-追加料金1-内容,明細-追加料金1-値,明細-追加料金1-単位,明細-追加料金1-単価,明細-追加料金2-内容,明細-追加料金2-値,明細-追加料金2-単位,明細-追加料金2-単価,明細-追加料金3-内容,明細-追加料金3-値,明細-追加料金3-単位,明細-追加料金3-単価,明細-追加料金4以降,明細-輸送情報,明細-備考,明細-シリアルナンバー,明細-商品分類コード: ECCN,明細-発注者品番,明細-注文明細番号,明細-EAN/GTIN,明細-ロケーションID,明細-貨物注文番号,明細-納品日,明細-HSN/SAC区分,明細-HSN/SACの値,明細-非課税/免税の理由,明細-注文書番号,明細-詳細,明細-メーカー名,明細-原産国,明細-納期,明細-配送先-私書箱,明細-配送先-市区町村番地,明細-配送先-マンション名,明細-配送先-都道府県,明細-配送先-郵便番号,明細-配送先-国,割引1-項目ID,割引1-内容,割引1-数量,割引1-単位,割引1-税（消費税／軽減税率／不課税／免税／非課税）,割引1-小計（税抜）,割引2-項目ID,割引2-内容,割引2-数量,割引2-単位,割引2-税（消費税／軽減税率／不課税／免税／非課税）,割引2-小計（税抜）,割引3-項目ID,割引3-内容,割引3-数量,割引3-単位,割引3-税（消費税／軽減税率／不課税／免税／非課税）,割引3-小計（税抜）,割引4以降,追加料金1-項目ID,追加料金1-内容,追加料金1-数量,追加料金1-単位,追加料金1-税（消費税／軽減税率／不課税／免税／非課税）,追加料金1-小計（税抜）,追加料金2-項目ID,追加料金2-内容,追加料金2-数量,追加料金2-単位,追加料金2-税（消費税／軽減税率／不課税／免税／非課税）,追加料金2-小計（税抜）,追加料金3-項目ID,追加料金3-内容,追加料金3-数量,追加料金3-単位,追加料金3-税（消費税／軽減税率／不課税／免税／非課税）,追加料金3-小計（税抜）,追加料金4以降,固定税-項目ID,固定税-税' +
    ',仕訳情報1-借方勘定科目名,仕訳情報1-借方勘定科目コード,仕訳情報1-借方補助科目名,仕訳情報1-借方補助科目コード,仕訳情報1-借方部門名,仕訳情報1-借方部門コード,仕訳情報1-貸方勘定科目名,仕訳情報1-貸方勘定科目コード,仕訳情報1-貸方補助科目名,仕訳情報1-貸方補助科目コード,仕訳情報1-貸方部門名,仕訳情報1-貸方部門コード,仕訳情報1-計上金額,仕訳情報2-借方勘定科目名,仕訳情報2-借方勘定科目コード,仕訳情報2-借方補助科目名,仕訳情報2-借方補助科目コード,仕訳情報2-借方部門名,仕訳情報2-借方部門コード,仕訳情報2-貸方勘定科目名,仕訳情報2-貸方勘定科目コード,仕訳情報2-貸方補助科目名,仕訳情報2-貸方補助科目コード,仕訳情報2-貸方部門名,仕訳情報2-貸方部門コード,仕訳情報2-計上金額,仕訳情報3-借方勘定科目名,仕訳情報3-借方勘定科目コード,仕訳情報3-借方補助科目名,仕訳情報3-借方補助科目コード,仕訳情報3-借方部門名,仕訳情報3-借方部門コード,仕訳情報3-貸方勘定科目名,仕訳情報3-貸方勘定科目コード,仕訳情報3-貸方補助科目名,仕訳情報3-貸方補助科目コード,仕訳情報3-貸方部門名,仕訳情報3-貸方部門コード,仕訳情報3-計上金額,仕訳情報4-借方勘定科目名,仕訳情報4-借方勘定科目コード,仕訳情報4-借方補助科目名,仕訳情報4-借方補助科目コード,仕訳情報4-借方部門名,仕訳情報4-借方部門コード,仕訳情報4-貸方勘定科目名,仕訳情報4-貸方勘定科目コード,仕訳情報4-貸方補助科目名,仕訳情報4-貸方補助科目コード,仕訳情報4-貸方部門名,仕訳情報4-貸方部門コード,仕訳情報4-計上金額,仕訳情報5-借方勘定科目名,仕訳情報5-借方勘定科目コード,仕訳情報5-借方補助科目名,仕訳情報5-借方補助科目コード,仕訳情報5-借方部門名,仕訳情報5-借方部門コード,仕訳情報5-貸方勘定科目名,仕訳情報5-貸方勘定科目コード,仕訳情報5-貸方補助科目名,仕訳情報5-貸方補助科目コード,仕訳情報5-貸方部門名,仕訳情報5-貸方部門コード,仕訳情報5-計上金額,仕訳情報6-借方勘定科目名,仕訳情報6-借方勘定科目コード,仕訳情報6-借方補助科目名,仕訳情報6-借方補助科目コード,仕訳情報6-借方部門名,仕訳情報6-借方部門コード,仕訳情報6-貸方勘定科目名,仕訳情報6-貸方勘定科目コード,仕訳情報6-貸方補助科目名,仕訳情報6-貸方補助科目コード,仕訳情報6-貸方部門名,仕訳情報6-貸方部門コード,仕訳情報6-計上金額,仕訳情報7-借方勘定科目名,仕訳情報7-借方勘定科目コード,仕訳情報7-借方補助科目名,仕訳情報7-借方補助科目コード,仕訳情報7-借方部門名,仕訳情報7-借方部門コード,仕訳情報7-貸方勘定科目名,仕訳情報7-貸方勘定科目コード,仕訳情報7-貸方補助科目名,仕訳情報7-貸方補助科目コード,仕訳情報7-貸方部門名,仕訳情報7-貸方部門コード,仕訳情報7-計上金額,仕訳情報8-借方勘定科目名,仕訳情報8-借方勘定科目コード,仕訳情報8-借方補助科目名,仕訳情報8-借方補助科目コード,仕訳情報8-借方部門名,仕訳情報8-借方部門コード,仕訳情報8-貸方勘定科目名,仕訳情報8-貸方勘定科目コード,仕訳情報8-貸方補助科目名,仕訳情報8-貸方補助科目コード,仕訳情報8-貸方部門名,仕訳情報8-貸方部門コード,仕訳情報8-計上金額,仕訳情報9-借方勘定科目名,仕訳情報9-借方勘定科目コード,仕訳情報9-借方補助科目名,仕訳情報9-借方補助科目コード,仕訳情報9-借方部門名,仕訳情報9-借方部門コード,仕訳情報9-貸方勘定科目名,仕訳情報9-貸方勘定科目コード,仕訳情報9-貸方補助科目名,仕訳情報9-貸方補助科目コード,仕訳情報9-貸方部門名,仕訳情報9-貸方部門コード,仕訳情報9-計上金額,仕訳情報10-借方勘定科目名,仕訳情報10-借方勘定科目コード,仕訳情報10-借方補助科目名,仕訳情報10-借方補助科目コード,仕訳情報10-借方部門名,仕訳情報10-借方部門コード,仕訳情報10-貸方勘定科目名,仕訳情報10-貸方勘定科目コード,仕訳情報10-貸方補助科目名,仕訳情報10-貸方補助科目コード,仕訳情報10-貸方部門名,仕訳情報10-貸方部門コード,仕訳情報10-計上金額'

  const yayoiServiceResult =
    '"2111","","","","acc1","subAcc1","de1","課税売上込10%","299900","0","cAcc1","cSubAcc1","cDe1","課対仕入込10%","299900","0","","","","3","","","","","no"'

  const obcServiceResult =
    '"GL0010000","GL0010001","GL0010002","GL0010003","GL0010007","GL0010008","GL0010005","GL0010006","GL0010004","GL0012001","GL0012002","GL0012003","GL0012004","GL0012015","GL0012005","GL0012006","GL0012007","GL0012008","GL0012009","GL0012101","GL0012102","GL0013001","GL0013002","GL0013003","GL0013004","GL0013015","GL0013005","GL0013006","GL0013007","GL0013008","GL0013009","GL0013101","GL0013102","GL0011001","GL0011002","GL0011003"\r\n' +
    '"*","","","","","","1","","0","","202204152","","0010","10","","1","","",299900,0,"DE3763","Acc10","","0060","10","","1","","",299900,0,"","",""\r\n' +
    '"","","","","","","1","","0","","Acc1","subAcc1","0010","10","","1","","",100,0,"","Acc10","","0060","10","","1","","",100,0,"","",""\r\n'

  const obcServiceHeader =
    '"GL0010000","GL0010001","GL0010002","GL0010003","GL0010007","GL0010008","GL0010005","GL0010006","GL0010004","GL0012001","GL0012002","GL0012003","GL0012004","GL0012015","GL0012005","GL0012006","GL0012007","GL0012008","GL0012009","GL0012101","GL0012102","GL0013001","GL0013002","GL0013003","GL0013004","GL0013015","GL0013005","GL0013006","GL0013007","GL0013008","GL0013009","GL0013101","GL0013102","GL0011001","GL0011002","GL0011003"'

  // DBデータ設定
  const Contracts = require('../mockDB/Contracts_Table')

  const journalfindAllSpyResult = [
    {
      journalId: '75fd64cd-e4b5-4d0a-84cc-8af25a24f2a8',
      contractId: 'f10b95a4-74a1-4691-880a-827c9f1a1faf',
      invoiceId: '1f3ce3dc-4dbb-548a-a090-d39dc604a6e1',
      lineNo: 1,
      lineId: '1',
      accountCode: 'acc1',
      subAccountCode: 'subAcc1',
      departmentCode: 'de1',
      creditAccountCode: 'cAcc1',
      creditSubAccountCode: 'cSubAcc1',
      creditDepartmentCode: 'cDe1',
      accountName: 'accName1',
      subAccountName: 'subAccName1',
      departmentName: 'deName1',
      creditAccountName: 'cAccName1',
      creditSubAccountName: 'cSubAccName1',
      creditDepartmentName: 'cDeName1',

      installmentAmount: 51223,
      createdAt: new Date('2021-11-25T04:30:00.000Z'),
      updatedAt: new Date('2021-11-25T04:30:00.000Z'),
      journalNo: 'lineAccountCode1'
    },
    {
      journalId: '75fd64cd-e4b5-4d0a-84cc-8af25a24f2a8',
      contractId: 'f10b95a4-74a1-4691-880a-827c9f1a1faf',
      invoiceId: '1f3ce3dc-4dbb-548a-a090-d39dc604a6e1',
      lineNo: 1,
      lineId: '1',
      accountCode: 'acc2',
      subAccountCode: 'subAcc2',
      departmentCode: 'de2',
      creditAccountCode: 'cAcc2',
      creditSubAccountCode: 'cSubAcc2',
      creditDepartmentCode: 'cDe2',
      accountName: 'accName2',
      subAccountName: 'subAccName2',
      departmentName: 'deName2',
      creditAccountName: 'cAccName2',
      creditSubAccountName: 'cSubAccName2',
      creditDepartmentName: 'cDeName2',

      installmentAmount: 51223,
      createdAt: new Date('2021-11-25T04:30:00.000Z'),
      updatedAt: new Date('2021-11-25T04:30:00.000Z'),
      journalNo: 'lineAccountCode2'
    }
  ]

  // 最終承認済みのDBデータ
  const findOneRequestApprovalFinalResult = {
    requestId: '2b055e3f-aa3b-4d39-9d8e-98cdaa04625b',
    contractId: 'f10b95a4-74a1-4691-880a-827c9f1a1faf',
    approveRouteId: '50b3aea7-c5b1-445a-952c-5ef0883d1504',
    invoiceId: '1f3ce3dc-4dbb-548a-a090-d39dc604a6e1',
    requester: 'e8266cfa-4732-4cbd-8442-0ebcb073013d',
    status: '00',
    message: '',
    create: new Date('2021-11-25T04:30:00.000Z'),
    isSaved: true
  }

  const findOneRequestApprovalNoneFinalResult = {
    requestId: '2b055e3f-aa3b-4d39-9d8e-98cdaa04625b',
    contractId: 'f10b95a4-74a1-4691-880a-827c9f1a1faf',
    approveRouteId: '50b3aea7-c5b1-445a-952c-5ef0883d1504',
    invoiceId: '1f3ce3dc-4dbb-548a-a090-d39dc604a6e1',
    requester: 'e8266cfa-4732-4cbd-8442-0ebcb073013d',
    status: '10',
    message: '',
    create: new Date('2021-11-25T04:30:00.000Z'),
    isSaved: true
  }

  // Tokenとユーザ情報設定
  const accessToken = 'dummyAccessToken'
  const refreshToken = 'dummyRefreshToken'
  const userId = '388014b9-d667-4144-9cc4-5da420981438'

  // パラメータ設定
  const document = [{ DocumentId: '1f3ce3dc-4dbb-548a-a090-d39dc604a6e1' }]
  const contractId = 'f10b95a4-74a1-4691-880a-827c9f1a1faf'
  const chkFinalapproval = 'finalapproval'

  describe('createInvoiceDataForDownload', () => {
    test('正常：最終承認済みの請求書', async () => {
      // 準備
      journalfindAllSpy.mockReturnValue(journalfindAllSpyResult)
      findOneRequestApprovalSpy.mockReturnValue(findOneRequestApprovalFinalResult)

      // 試験実施
      const result = await journalDownloadController.createInvoiceDataForDownload(
        accessToken,
        refreshToken,
        document,
        contractId,
        chkFinalapproval,
        userId
      )

      // 期待結果
      const dataHeader = result.split('\r\n')[0]
      const dataBody = result.split('\r\n')[1]
      const checkingData = require('../mockInvoice/invoice1')
      // 想定したデータがReturnされていること
      expect(dataHeader).toEqual(header)
      // 発行日
      expect(dataBody).toContain(`${checkingData.IssueDate.value}`)
      // 請求書番号
      expect(dataBody).toContain(`${checkingData.ID.value}`)
      // テナントID
      expect(dataBody).toContain(`${checkingData.AccountingCustomerParty.Party.PartyIdentification[0].ID.value}`)
      // 支払期日
      expect(dataBody).toContain(`${checkingData.PaymentMeans[0]?.PaymentDueDate?.value ?? ''}`)
      // 納品日
      expect(dataBody).toContain(`${checkingData.Delivery[0].ActualDeliveryDate?.value}`)
      // 備考
      expect(dataBody).toContain(`${checkingData.AdditionalDocumentReference[0].ID.value}`)
      // 銀行名
      expect(dataBody).toContain(
        `${
          checkingData.PaymentMeans[0].PayeeFinancialAccount?.FinancialInstitutionBranch?.FinancialInstitution?.Name
            .value ?? ''
        }`
      )
      // 支店名
      expect(dataBody).toContain(
        `${checkingData.PaymentMeans[0].PayeeFinancialAccount?.FinancialInstitutionBranch?.Name.value ?? ''}`
      )
      // 科目
      expect(dataBody).toContain(
        `${checkingData.PaymentMeans[0].PayeeFinancialAccount?.AccountTypeCode?.value === 'General' ? '普通' : '当座'}`
      )
      // 口座番号
      expect(dataBody).toContain(`${checkingData.PaymentMeans[0].PayeeFinancialAccount?.ID?.value ?? ''}`)
      // 口座名義
      expect(dataBody).toContain(
        `${checkingData.PaymentMeans[0].PayeeFinancialAccount?.FinancialInstitutionBranch?.Name.value ?? ''}`
      )
      // その他特記事項
      expect(dataBody).toContain(`${checkingData.PaymentMeans[0].PayeeFinancialAccount?.Name?.value ?? ''}`)
      // 明細-項目ID
      expect(dataBody).toContain(`${checkingData.Note[0].value}`)
      // 明細-内容
      expect(dataBody).toContain(`${checkingData.InvoiceLine[0].Item.Description[0].value}`)
      // 明細-数量
      expect(dataBody).toContain(`${checkingData.InvoiceLine[0].InvoicedQuantity.value}`)
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
      expect(dataBody).toContain(`${resultOfUnitSearch}`)
      // 明細-単価
      expect(dataBody).toContain(`${checkingData.InvoiceLine[0].LineExtensionAmount.value}`)
      // 明細-税（消費税／軽減税率／不課税／免税／非課税）
      const taxCategory = {
        'JP 不課税 0%': '不課税',
        'JP 免税 0%': '免税',
        'JP 消費税 10%': '消費税',
        'JP 消費税(軽減税率) 8%': '軽減税率',
        'JP 非課税 0%': '非課税'
      }
      expect(dataBody).toContain(
        `${taxCategory[checkingData.InvoiceLine[0].TaxTotal[0].TaxSubtotal[0].TaxCategory.TaxScheme.Name.value]}`
      )
      // 明細-備考
      expect(dataBody).toContain(
        `${
          checkingData.InvoiceLine[0].DocumentReference ? checkingData.InvoiceLine[0].DocumentReference[0].ID.value : ''
        }`
      )

      // 仕訳情報
      expect(dataBody).toContain(`${journalfindAllSpyResult[0].accountCode}`)
      expect(dataBody).toContain(`${journalfindAllSpyResult[0].subAccountCode}`)
      expect(dataBody).toContain(`${journalfindAllSpyResult[0].departmentCode}`)
      expect(dataBody).toContain(`${journalfindAllSpyResult[0].accountName}`)
      expect(dataBody).toContain(`${journalfindAllSpyResult[0].subAccountName}`)
      expect(dataBody).toContain(`${journalfindAllSpyResult[0].departmentName}`)
      expect(dataBody).toContain(`${journalfindAllSpyResult[1].accountCode}`)
      expect(dataBody).toContain(`${journalfindAllSpyResult[1].subAccountCode}`)
      expect(dataBody).toContain(`${journalfindAllSpyResult[1].departmentCode}`)
      expect(dataBody).toContain(`${journalfindAllSpyResult[1].accountName}`)
      expect(dataBody).toContain(`${journalfindAllSpyResult[1].subAccountName}`)
      expect(dataBody).toContain(`${journalfindAllSpyResult[1].departmentName}`)
    })

    test('正常：仕訳済みの請求書）', async () => {
      // 準備
      const noneFinalapproval = 'noneFinalapproval'
      journalfindAllSpy.mockReturnValue(journalfindAllSpyResult)
      findOneRequestApprovalSpy.mockReturnValue(findOneRequestApprovalNoneFinalResult)

      // 試験実施
      const result = await journalDownloadController.createInvoiceDataForDownload(
        accessToken,
        refreshToken,
        document,
        contractId,
        noneFinalapproval,
        userId
      )

      // 期待結果
      const dataHeader = result.split('\r\n')[0]
      const dataBody = result.split('\r\n')[1]
      const checkingData = require('../mockInvoice/invoice1')
      // 想定したデータがReturnされていること
      expect(dataHeader).toEqual(header)
      // 発行日
      expect(dataBody).toContain(`${checkingData.IssueDate.value}`)
      // 請求書番号
      expect(dataBody).toContain(`${checkingData.ID.value}`)
      // テナントID
      expect(dataBody).toContain(`${checkingData.AccountingCustomerParty.Party.PartyIdentification[0].ID.value}`)
      // 支払期日
      expect(dataBody).toContain(`${checkingData.PaymentMeans[0]?.PaymentDueDate?.value ?? ''}`)
      // 納品日
      expect(dataBody).toContain(`${checkingData.Delivery[0].ActualDeliveryDate?.value}`)
      // 備考
      expect(dataBody).toContain(`${checkingData.AdditionalDocumentReference[0].ID.value}`)
      // 銀行名
      expect(dataBody).toContain(
        `${
          checkingData.PaymentMeans[0].PayeeFinancialAccount?.FinancialInstitutionBranch?.FinancialInstitution?.Name
            .value ?? ''
        }`
      )
      // 支店名
      expect(dataBody).toContain(
        `${checkingData.PaymentMeans[0].PayeeFinancialAccount?.FinancialInstitutionBranch?.Name.value ?? ''}`
      )
      // 科目
      expect(dataBody).toContain(
        `${checkingData.PaymentMeans[0].PayeeFinancialAccount?.AccountTypeCode?.value === 'General' ? '普通' : '当座'}`
      )
      // 口座番号
      expect(dataBody).toContain(`${checkingData.PaymentMeans[0].PayeeFinancialAccount?.ID?.value ?? ''}`)
      // 口座名義
      expect(dataBody).toContain(
        `${checkingData.PaymentMeans[0].PayeeFinancialAccount?.FinancialInstitutionBranch?.Name.value ?? ''}`
      )
      // その他特記事項
      expect(dataBody).toContain(`${checkingData.PaymentMeans[0].PayeeFinancialAccount?.Name?.value ?? ''}`)
      // 明細-項目ID
      expect(dataBody).toContain(`${checkingData.Note[0].value}`)
      // 明細-内容
      expect(dataBody).toContain(`${checkingData.InvoiceLine[0].Item.Description[0].value}`)
      // 明細-数量
      expect(dataBody).toContain(`${checkingData.InvoiceLine[0].InvoicedQuantity.value}`)
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
      expect(dataBody).toContain(`${resultOfUnitSearch}`)
      // 明細-単価
      expect(dataBody).toContain(`${checkingData.InvoiceLine[0].LineExtensionAmount.value}`)
      // 明細-税（消費税／軽減税率／不課税／免税／非課税）
      const taxCategory = {
        'JP 不課税 0%': '不課税',
        'JP 免税 0%': '免税',
        'JP 消費税 10%': '消費税',
        'JP 消費税(軽減税率) 8%': '軽減税率',
        'JP 非課税 0%': '非課税'
      }
      expect(dataBody).toContain(
        `${taxCategory[checkingData.InvoiceLine[0].TaxTotal[0].TaxSubtotal[0].TaxCategory.TaxScheme.Name.value]}`
      )
      // 明細-備考
      expect(dataBody).toContain(
        `${
          checkingData.InvoiceLine[0].DocumentReference ? checkingData.InvoiceLine[0].DocumentReference[0].ID.value : ''
        }`
      )

      // 仕訳情報
      expect(dataBody).toContain(`${journalfindAllSpyResult[0].accountCode}`)
      expect(dataBody).toContain(`${journalfindAllSpyResult[0].subAccountCode}`)
      expect(dataBody).toContain(`${journalfindAllSpyResult[0].departmentCode}`)
      expect(dataBody).toContain(`${journalfindAllSpyResult[0].accountName}`)
      expect(dataBody).toContain(`${journalfindAllSpyResult[0].subAccountName}`)
      expect(dataBody).toContain(`${journalfindAllSpyResult[0].departmentName}`)
      expect(dataBody).toContain(`${journalfindAllSpyResult[1].accountCode}`)
      expect(dataBody).toContain(`${journalfindAllSpyResult[1].subAccountCode}`)
      expect(dataBody).toContain(`${journalfindAllSpyResult[1].departmentCode}`)
      expect(dataBody).toContain(`${journalfindAllSpyResult[1].accountName}`)
      expect(dataBody).toContain(`${journalfindAllSpyResult[1].subAccountName}`)
      expect(dataBody).toContain(`${journalfindAllSpyResult[1].departmentName}`)
    })

    test('正常：仕訳済みの請求書（未処理）', async () => {
      // 準備
      const noneFinalapproval = 'noneFinalapproval'
      journalfindAllSpy.mockReturnValue(journalfindAllSpyResult)
      findOneRequestApprovalSpy.mockReturnValue(null)

      // 試験実施
      const result = await journalDownloadController.createInvoiceDataForDownload(
        accessToken,
        refreshToken,
        document,
        contractId,
        noneFinalapproval,
        userId
      )

      // 期待結果
      const dataHeader = result.split('\r\n')[0]
      const dataBody = result.split('\r\n')[1]
      const checkingData = require('../mockInvoice/invoice1')
      // 想定したデータがReturnされていること
      expect(dataHeader).toEqual(header)
      // 発行日
      expect(dataBody).toContain(`${checkingData.IssueDate.value}`)
      // 請求書番号
      expect(dataBody).toContain(`${checkingData.ID.value}`)
      // テナントID
      expect(dataBody).toContain(`${checkingData.AccountingCustomerParty.Party.PartyIdentification[0].ID.value}`)
      // 支払期日
      expect(dataBody).toContain(`${checkingData.PaymentMeans[0]?.PaymentDueDate?.value ?? ''}`)
      // 納品日
      expect(dataBody).toContain(`${checkingData.Delivery[0].ActualDeliveryDate?.value}`)
      // 備考
      expect(dataBody).toContain(`${checkingData.AdditionalDocumentReference[0].ID.value}`)
      // 銀行名
      expect(dataBody).toContain(
        `${
          checkingData.PaymentMeans[0].PayeeFinancialAccount?.FinancialInstitutionBranch?.FinancialInstitution?.Name
            .value ?? ''
        }`
      )
      // 支店名
      expect(dataBody).toContain(
        `${checkingData.PaymentMeans[0].PayeeFinancialAccount?.FinancialInstitutionBranch?.Name.value ?? ''}`
      )
      // 科目
      expect(dataBody).toContain(
        `${checkingData.PaymentMeans[0].PayeeFinancialAccount?.AccountTypeCode?.value === 'General' ? '普通' : '当座'}`
      )
      // 口座番号
      expect(dataBody).toContain(`${checkingData.PaymentMeans[0].PayeeFinancialAccount?.ID?.value ?? ''}`)
      // 口座名義
      expect(dataBody).toContain(
        `${checkingData.PaymentMeans[0].PayeeFinancialAccount?.FinancialInstitutionBranch?.Name.value ?? ''}`
      )
      // その他特記事項
      expect(dataBody).toContain(`${checkingData.PaymentMeans[0].PayeeFinancialAccount?.Name?.value ?? ''}`)
      // 明細-項目ID
      expect(dataBody).toContain(`${checkingData.Note[0].value}`)
      // 明細-内容
      expect(dataBody).toContain(`${checkingData.InvoiceLine[0].Item.Description[0].value}`)
      // 明細-数量
      expect(dataBody).toContain(`${checkingData.InvoiceLine[0].InvoicedQuantity.value}`)
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
      expect(dataBody).toContain(`${resultOfUnitSearch}`)
      // 明細-単価
      expect(dataBody).toContain(`${checkingData.InvoiceLine[0].LineExtensionAmount.value}`)
      // 明細-税（消費税／軽減税率／不課税／免税／非課税）
      const taxCategory = {
        'JP 不課税 0%': '不課税',
        'JP 免税 0%': '免税',
        'JP 消費税 10%': '消費税',
        'JP 消費税(軽減税率) 8%': '軽減税率',
        'JP 非課税 0%': '非課税'
      }
      expect(dataBody).toContain(
        `${taxCategory[checkingData.InvoiceLine[0].TaxTotal[0].TaxSubtotal[0].TaxCategory.TaxScheme.Name.value]}`
      )
      // 明細-備考
      expect(dataBody).toContain(
        `${
          checkingData.InvoiceLine[0].DocumentReference ? checkingData.InvoiceLine[0].DocumentReference[0].ID.value : ''
        }`
      )

      // 仕訳情報
      expect(dataBody).toContain(`${journalfindAllSpyResult[0].accountCode}`)
      expect(dataBody).toContain(`${journalfindAllSpyResult[0].subAccountCode}`)
      expect(dataBody).toContain(`${journalfindAllSpyResult[0].departmentCode}`)
      expect(dataBody).toContain(`${journalfindAllSpyResult[0].accountName}`)
      expect(dataBody).toContain(`${journalfindAllSpyResult[0].subAccountName}`)
      expect(dataBody).toContain(`${journalfindAllSpyResult[0].departmentName}`)
      expect(dataBody).toContain(`${journalfindAllSpyResult[1].accountCode}`)
      expect(dataBody).toContain(`${journalfindAllSpyResult[1].subAccountCode}`)
      expect(dataBody).toContain(`${journalfindAllSpyResult[1].departmentCode}`)
      expect(dataBody).toContain(`${journalfindAllSpyResult[1].accountName}`)
      expect(dataBody).toContain(`${journalfindAllSpyResult[1].subAccountName}`)
      expect(dataBody).toContain(`${journalfindAllSpyResult[1].departmentName}`)
    })

    test('正常：複数の請求書', async () => {
      // 準備
      const noneFinalapproval = 'noneFinalapproval'
      const documents = [
        { DocumentId: '1f3ce3dc-4dbb-548a-a090-d39dc604a6e1' },
        { DocumentId: '79b516e2-9d51-57fb-95cc-9581abe715bb' }
      ]
      journalfindAllSpy.mockReturnValue(journalfindAllSpyResult)
      findOneRequestApprovalSpy.mockReturnValue(null)

      // 試験実施
      const result = await journalDownloadController.createInvoiceDataForDownload(
        accessToken,
        refreshToken,
        documents,
        contractId,
        noneFinalapproval,
        userId
      )

      // 期待結果
      const dataHeader = result.split('\r\n')[0]
      const dataBody1 = result.split('\r\n')[1]
      const dataBody2 = result.split('\r\n')[2]
      const checkingData1 = require('../mockInvoice/invoice1')
      const checkingData2 = require('../mockInvoice/invoice2')

      // 想定したデータがReturnされていること
      expect(dataHeader).toEqual(header)

      // 1行目
      // 発行日
      expect(dataBody1).toContain(`${checkingData1.IssueDate.value}`)
      // 請求書番号
      expect(dataBody1).toContain(`${checkingData1.ID.value}`)
      // テナントID
      expect(dataBody1).toContain(`${checkingData1.AccountingCustomerParty.Party.PartyIdentification[0].ID.value}`)
      // 支払期日
      expect(dataBody1).toContain(`${checkingData1.PaymentMeans[0]?.PaymentDueDate?.value ?? ''}`)
      // 納品日
      expect(dataBody1).toContain(`${checkingData1.Delivery[0].ActualDeliveryDate?.value}`)
      // 備考
      expect(dataBody1).toContain(`${checkingData1.AdditionalDocumentReference[0].ID.value}`)
      // 銀行名
      expect(dataBody1).toContain(
        `${
          checkingData1.PaymentMeans[0].PayeeFinancialAccount?.FinancialInstitutionBranch?.FinancialInstitution?.Name
            .value ?? ''
        }`
      )
      // 支店名
      expect(dataBody1).toContain(
        `${checkingData1.PaymentMeans[0].PayeeFinancialAccount?.FinancialInstitutionBranch?.Name.value ?? ''}`
      )
      // 科目
      expect(dataBody1).toContain(
        `${checkingData1.PaymentMeans[0].PayeeFinancialAccount?.AccountTypeCode?.value === 'General' ? '普通' : '当座'}`
      )
      // 口座番号
      expect(dataBody1).toContain(`${checkingData1.PaymentMeans[0].PayeeFinancialAccount?.ID?.value ?? ''}`)
      // 口座名義
      expect(dataBody1).toContain(
        `${checkingData1.PaymentMeans[0].PayeeFinancialAccount?.FinancialInstitutionBranch?.Name.value ?? ''}`
      )
      // その他特記事項
      expect(dataBody1).toContain(`${checkingData1.PaymentMeans[0].PayeeFinancialAccount?.Name?.value ?? ''}`)
      // 明細-項目ID
      expect(dataBody1).toContain(`${checkingData1.Note[0].value}`)
      // 明細-内容
      expect(dataBody1).toContain(`${checkingData1.InvoiceLine[0].Item.Description[0].value}`)
      // 明細-数量
      expect(dataBody1).toContain(`${checkingData1.InvoiceLine[0].InvoicedQuantity.value}`)
      // 明細-単位
      const bconCsvUnitcode = require('../../Application/lib/bconCsvUnitcode')
      const unitCodeKeys = Object.keys(bconCsvUnitcode)
      let resultOfUnitSearch
      unitCodeKeys.some((item) => {
        if (`${checkingData1.InvoiceLine[0].InvoicedQuantity.unitCode}` === bconCsvUnitcode[item]) {
          resultOfUnitSearch = item
          return true
        }
        return false
      })
      expect(dataBody1).toContain(`${resultOfUnitSearch}`)
      // 明細-単価
      expect(dataBody1).toContain(`${checkingData1.InvoiceLine[0].LineExtensionAmount.value}`)
      // 明細-税（消費税／軽減税率／不課税／免税／非課税）
      const taxCategory = {
        'JP 不課税 0%': '不課税',
        'JP 免税 0%': '免税',
        'JP 消費税 10%': '消費税',
        'JP 消費税(軽減税率) 8%': '軽減税率',
        'JP 非課税 0%': '非課税'
      }
      expect(dataBody1).toContain(
        `${taxCategory[checkingData1.InvoiceLine[0].TaxTotal[0].TaxSubtotal[0].TaxCategory.TaxScheme.Name.value]}`
      )
      // 明細-備考
      expect(dataBody1).toContain(
        `${
          checkingData1.InvoiceLine[0].DocumentReference
            ? checkingData1.InvoiceLine[0].DocumentReference[0].ID.value
            : ''
        }`
      )

      // 仕訳情報
      expect(dataBody1).toContain(`${journalfindAllSpyResult[0].accountCode}`)
      expect(dataBody1).toContain(`${journalfindAllSpyResult[0].subAccountCode}`)
      expect(dataBody1).toContain(`${journalfindAllSpyResult[0].departmentCode}`)
      expect(dataBody1).toContain(`${journalfindAllSpyResult[0].accountName}`)
      expect(dataBody1).toContain(`${journalfindAllSpyResult[0].subAccountName}`)
      expect(dataBody1).toContain(`${journalfindAllSpyResult[0].departmentName}`)
      expect(dataBody1).toContain(`${journalfindAllSpyResult[1].accountCode}`)
      expect(dataBody1).toContain(`${journalfindAllSpyResult[1].subAccountCode}`)
      expect(dataBody1).toContain(`${journalfindAllSpyResult[1].departmentCode}`)
      expect(dataBody1).toContain(`${journalfindAllSpyResult[1].accountName}`)
      expect(dataBody1).toContain(`${journalfindAllSpyResult[1].subAccountName}`)
      expect(dataBody1).toContain(`${journalfindAllSpyResult[1].departmentName}`)

      // 2行目
      // 発行日
      expect(dataBody2).toContain(`${checkingData2.IssueDate.value}`)
      // 請求書番号
      expect(dataBody2).toContain(`${checkingData2.ID.value}`)
      // テナントID
      expect(dataBody2).toContain(`${checkingData2.AccountingCustomerParty.Party.PartyIdentification[0].ID.value}`)
      // 支払期日
      expect(dataBody2).toContain(`${checkingData2.PaymentMeans[0]?.PaymentDueDate?.value ?? ''}`)
      // 納品日
      expect(dataBody2).toContain(`${checkingData2.Delivery[0].ActualDeliveryDate?.value}`)
      // 備考
      expect(dataBody2).toContain(`${checkingData2.AdditionalDocumentReference[0].ID.value}`)
      // 銀行名
      expect(dataBody2).toContain(
        `${
          checkingData2.PaymentMeans[0].PayeeFinancialAccount?.FinancialInstitutionBranch?.FinancialInstitution?.Name
            .value ?? ''
        }`
      )
      // 支店名
      expect(dataBody2).toContain(
        `${checkingData2.PaymentMeans[0].PayeeFinancialAccount?.FinancialInstitutionBranch?.Name.value ?? ''}`
      )
      // 科目
      expect(dataBody2).toContain(
        `${checkingData2.PaymentMeans[0].PayeeFinancialAccount?.AccountTypeCode?.value === 'General' ? '普通' : '当座'}`
      )
      // 口座番号
      expect(dataBody2).toContain(`${checkingData2.PaymentMeans[0].PayeeFinancialAccount?.ID?.value ?? ''}`)
      // 口座名義
      expect(dataBody2).toContain(
        `${checkingData2.PaymentMeans[0].PayeeFinancialAccount?.FinancialInstitutionBranch?.Name.value ?? ''}`
      )
      // その他特記事項
      expect(dataBody2).toContain(`${checkingData2.PaymentMeans[0].PayeeFinancialAccount?.Name?.value ?? ''}`)
      // 明細-項目ID
      expect(dataBody2).toContain(`${checkingData2.Note[0].value}`)
      // 明細-内容
      expect(dataBody2).toContain(`${checkingData2.InvoiceLine[0].Item.Description[0].value}`)
      // 明細-数量
      expect(dataBody2).toContain(`${checkingData2.InvoiceLine[0].InvoicedQuantity.value}`)
      // 明細-単位
      unitCodeKeys.some((item) => {
        if (`${checkingData2.InvoiceLine[0].InvoicedQuantity.unitCode}` === bconCsvUnitcode[item]) {
          resultOfUnitSearch = item
          return true
        }
        return false
      })
      expect(dataBody2).toContain(`${resultOfUnitSearch}`)
      // 明細-単価
      expect(dataBody2).toContain(`${checkingData2.InvoiceLine[0].LineExtensionAmount.value}`)
      // 明細-税（消費税／軽減税率／不課税／免税／非課税）
      expect(dataBody2).toContain(
        `${taxCategory[checkingData2.InvoiceLine[0].TaxTotal[0].TaxSubtotal[0].TaxCategory.TaxScheme.Name.value]}`
      )
      // 明細-備考
      expect(dataBody2).toContain(
        `${
          checkingData2.InvoiceLine[0].DocumentReference
            ? checkingData2.InvoiceLine[0].DocumentReference[0].ID.value
            : ''
        }`
      )

      // 仕訳情報
      expect(dataBody2).toContain(`${journalfindAllSpyResult[0].accountCode}`)
      expect(dataBody2).toContain(`${journalfindAllSpyResult[0].subAccountCode}`)
      expect(dataBody2).toContain(`${journalfindAllSpyResult[0].departmentCode}`)
      expect(dataBody2).toContain(`${journalfindAllSpyResult[0].accountName}`)
      expect(dataBody2).toContain(`${journalfindAllSpyResult[0].subAccountName}`)
      expect(dataBody2).toContain(`${journalfindAllSpyResult[0].departmentName}`)
      expect(dataBody2).toContain(`${journalfindAllSpyResult[1].accountCode}`)
      expect(dataBody2).toContain(`${journalfindAllSpyResult[1].subAccountCode}`)
      expect(dataBody2).toContain(`${journalfindAllSpyResult[1].departmentCode}`)
      expect(dataBody2).toContain(`${journalfindAllSpyResult[1].accountName}`)
      expect(dataBody2).toContain(`${journalfindAllSpyResult[1].subAccountName}`)
      expect(dataBody2).toContain(`${journalfindAllSpyResult[1].departmentName}`)
    })

    test('異常：APIエラー', async () => {
      // 準備
      const errorDocuments = [{ DocumentId: 'c1aa94c2-f6c9-465a-911f-a2cd4b654321' }]
      journalfindAllSpy.mockReturnValue(journalfindAllSpyResult)
      findOneRequestApprovalSpy.mockReturnValue(null)

      // 試験実施
      const result = await journalDownloadController.createInvoiceDataForDownload(
        accessToken,
        refreshToken,
        errorDocuments,
        contractId,
        chkFinalapproval,
        userId
      )

      // 期待結果
      // return値がない
      expect(result).toEqual(new Error('Request failed with status code 404'))
    })

    test('異常：DBエラー', async () => {
      // 準備
      const errorDb = new Error('DB ERROR')
      journalfindAllSpy.mockImplementation(() => {
        throw errorDb
      })

      // 試験実施
      const result = await journalDownloadController.createInvoiceDataForDownload(
        accessToken,
        refreshToken,
        document,
        contractId,
        chkFinalapproval,
        userId
      )

      // 期待結果
      // return値がない
      expect(errorSpy).toHaveBeenCalledWith({ DocumentId: document[0].DocumentId, stack: errorDb.stack, status: 0 })
      expect(result).toEqual(errorDb)
    })
  })

  describe('getSentToCompany', () => {
    test('正常', async () => {
      // 準備
      // DBからの正常データ取得を想定する

      // 試験実施
      const result = await journalDownloadController.getSentToCompany(accessToken, refreshToken)

      // 期待結果
      // 想定したデータがReturnされていること
      expect(result).toEqual(['621559d0-53aa-44a2-ab29-0c4a6cb02bd1'])
    })
  })

  describe('dowonloadKaikei', () => {
    const passport = {
      accessToken: accessToken,
      refreshToken: refreshToken,
      tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089'
    }

    test('正常:企業条件がない場合（弥生会計）', async () => {
      // 準備
      const invoiceNumber = ''
      const minIssuedate = '2021-10-01'
      const maxIssuedate = '2022-04-25'
      const chkFinalapproval = 'finalapproval'
      const sentBy = []
      const serviceDataFormat = 1

      yayoiServiceSpy.mockReturnValue(yayoiServiceResult)

      // 試験実施
      const result = await journalDownloadController.dowonloadKaikei(
        passport,
        Contracts[0],
        invoiceNumber,
        minIssuedate,
        maxIssuedate,
        sentBy,
        chkFinalapproval,
        serviceDataFormat
      )

      // 期待結果
      // 想定したデータがReturnされていること
      expect(result).toEqual([yayoiServiceResult])
    })

    test('正常:企業条件がある場合（弥生会計）', async () => {
      // 準備
      const invoiceNumber = ''
      const minIssuedate = '2021-10-01'
      const maxIssuedate = '2022-04-25'
      const chkFinalapproval = 'finalapproval'
      const sentBy = ['221559d0-53aa-44a2-ab29-0c4a6cb02bd1']
      const serviceDataFormat = 1

      yayoiServiceSpy.mockReturnValue(yayoiServiceResult)

      // 試験実施
      const result = await journalDownloadController.dowonloadKaikei(
        passport,
        Contracts[0],
        invoiceNumber,
        minIssuedate,
        maxIssuedate,
        sentBy,
        chkFinalapproval,
        serviceDataFormat
      )

      // 期待結果
      // 想定したデータがReturnされていること
      expect(result).toEqual([yayoiServiceResult])
    })

    test('正常:データがない場合（弥生会計）', async () => {
      // 準備
      const invoiceNumber = ''
      const minIssuedate = '2021-10-01'
      const maxIssuedate = '2022-04-25'
      const chkFinalapproval = 'finalapproval'
      const sentBy = []
      const serviceDataFormat = 1

      yayoiServiceSpy.mockReturnValue(null)

      // 試験実施
      const result = await journalDownloadController.dowonloadKaikei(
        passport,
        Contracts[0],
        invoiceNumber,
        minIssuedate,
        maxIssuedate,
        sentBy,
        chkFinalapproval,
        serviceDataFormat
      )

      // 期待結果
      // 想定したデータがReturnされていること
      expect(result).toEqual(null)
    })

    test('正常:企業条件がない場合（勘定奉行（OBC））', async () => {
      // 準備
      const invoiceNumber = ''
      const minIssuedate = '2021-10-01'
      const maxIssuedate = '2022-04-25'
      const chkFinalapproval = 'finalapproval'
      const sentBy = []
      const serviceDataFormat = 2

      obcServiceSpy.mockReturnValue(obcServiceResult)

      // 試験実施
      const result = await journalDownloadController.dowonloadKaikei(
        passport,
        Contracts[0],
        invoiceNumber,
        minIssuedate,
        maxIssuedate,
        sentBy,
        chkFinalapproval,
        serviceDataFormat
      )

      // 期待結果
      // 想定したデータがReturnされていること
      // ヘッダ確認
      const dataHeader = result[0].split('\r\n')[0]
      // データ確認
      expect(dataHeader).toEqual(obcServiceHeader)
      expect(result).toEqual([obcServiceResult])
    })

    test('正常:企業条件がある場合（勘定奉行（OBC））', async () => {
      // 準備
      const invoiceNumber = ''
      const minIssuedate = '2021-10-01'
      const maxIssuedate = '2022-04-25'
      const chkFinalapproval = 'finalapproval'
      const sentBy = ['221559d0-53aa-44a2-ab29-0c4a6cb02bd1']
      const serviceDataFormat = 2

      obcServiceSpy.mockReturnValue(obcServiceResult)

      // 試験実施
      const result = await journalDownloadController.dowonloadKaikei(
        passport,
        Contracts[0],
        invoiceNumber,
        minIssuedate,
        maxIssuedate,
        sentBy,
        chkFinalapproval,
        serviceDataFormat
      )

      // 期待結果
      // 想定したデータがReturnされていること
      // ヘッダ確認
      const dataHeader = result[0].split('\r\n')[0]
      // データ確認
      expect(dataHeader).toEqual(obcServiceHeader)
      expect(result).toEqual([obcServiceResult])
    })

    test('正常:データがない場合（勘定奉行（OBC））', async () => {
      // 準備
      const invoiceNumber = ''
      const minIssuedate = '2021-10-01'
      const maxIssuedate = '2022-04-25'
      const chkFinalapproval = 'finalapproval'
      const sentBy = []
      const serviceDataFormat = 2

      obcServiceSpy.mockReturnValue(null)

      // 試験実施
      const result = await journalDownloadController.dowonloadKaikei(
        passport,
        Contracts[0],
        invoiceNumber,
        minIssuedate,
        maxIssuedate,
        sentBy,
        chkFinalapproval,
        serviceDataFormat
      )

      // 期待結果
      // 想定したデータがReturnされていること
      expect(result).toEqual(null)
    })

    test('異常系:serviceDataFormatが正しくない場合', async () => {
      // 準備
      const invoiceNumber = ''
      const minIssuedate = '2021-10-01'
      const maxIssuedate = '2022-04-25'
      const chkFinalapproval = 'finalapproval'
      const sentBy = []
      const serviceDataFormat = 6

      // 試験実施
      const result = await journalDownloadController.dowonloadKaikei(
        passport,
        Contracts[0],
        invoiceNumber,
        minIssuedate,
        maxIssuedate,
        sentBy,
        chkFinalapproval,
        serviceDataFormat
      )

      // 期待結果
      // 想定したデータがReturnされていること
      expect(result).toEqual(null)
    })
  })
})
