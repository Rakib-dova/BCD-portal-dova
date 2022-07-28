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
const PcaService = require('../../Application/service/PcaService')
const OhkenService = require('../../Application/service/OhkenService')
const FreeeService = require('../../Application/service/FreeeService')

let findOneRequestApprovalSpy,
  journalfindAllSpy,
  errorSpy,
  getCodingSpy,
  yayoiServiceSpy,
  obcServiceSpy,
  pcaServiceSpy,
  OhkenServiceSpy,
  FreeeServiceSpy

describe('journalDownloadControllerのテスト', () => {
  beforeEach(() => {
    apiManager.accessTradeshift = require('../lib/apiManager')
    journalfindAllSpy = jest.spyOn(JournalizeInvoice, 'findAll')
    getCodingSpy = jest.spyOn(Contract, 'findAll')
    findOneRequestApprovalSpy = jest.spyOn(requestApprovalController, 'findOneRequestApproval')
    yayoiServiceSpy = jest.spyOn(YayoiService.prototype, 'convertToKaikei')
    obcServiceSpy = jest.spyOn(ObcService.prototype, 'convertToKaikei')
    pcaServiceSpy = jest.spyOn(PcaService.prototype, 'convertToKaikei')
    OhkenServiceSpy = jest.spyOn(OhkenService.prototype, 'convertToKaikei')
    FreeeServiceSpy = jest.spyOn(FreeeService.prototype, 'convertToKaikei')
    errorSpy = jest.spyOn(logger, 'error')
  })
  afterEach(() => {
    journalfindAllSpy.mockRestore()
    getCodingSpy.mockRestore()
    findOneRequestApprovalSpy.mockRestore()
    yayoiServiceSpy.mockRestore()
    obcServiceSpy.mockRestore()
    pcaServiceSpy.mockRestore()
    OhkenServiceSpy.mockRestore()
    FreeeServiceSpy.mockRestore()
    errorSpy.mockRestore()
  })

  const yayoiServiceResult =
    '"2111","","","","acc1","subAcc1","de1","課税売上込10%","299900","0","cAcc1","cSubAcc1","cDe1","課対仕入込10%","299900","0","","","","3","","","","","no"'

  const obcServiceResult =
    '"GL0010000","GL0010001","GL0010002","GL0010003","GL0010007","GL0010008","GL0010005","GL0010006","GL0010004","GL0012001","GL0012002","GL0012003","GL0012004","GL0012015","GL0012005","GL0012006","GL0012007","GL0012008","GL0012009","GL0012101","GL0012102","GL0013001","GL0013002","GL0013003","GL0013004","GL0013015","GL0013005","GL0013006","GL0013007","GL0013008","GL0013009","GL0013101","GL0013102","GL0011001","GL0011002","GL0011003"\r\n' +
    '"*","","","","","","1","","0","","202204152","","0010","10","","1","","",299900,0,"DE3763","Acc10","","0060","10","","1","","",299900,0,"","",""\r\n' +
    '"","","","","","","1","","0","","Acc1","subAcc1","0010","10","","1","","",100,0,"","Acc10","","0060","10","","1","","",100,0,"","",""\r\n'

  const obcServiceHeader =
    '"GL0010000","GL0010001","GL0010002","GL0010003","GL0010007","GL0010008","GL0010005","GL0010006","GL0010004","GL0012001","GL0012002","GL0012003","GL0012004","GL0012015","GL0012005","GL0012006","GL0012007","GL0012008","GL0012009","GL0012101","GL0012102","GL0013001","GL0013002","GL0013003","GL0013004","GL0013015","GL0013005","GL0013006","GL0013007","GL0013008","GL0013009","GL0013101","GL0013102","GL0011001","GL0011002","GL0011003"'

  const pcaServiceHeader =
    '"伝票日付","伝票番号","仕訳区分","管理仕訳区分","借方税計算モード","借方部門コード","借方部門名","借方科目コード","借方科目名","借方補助コード","借方補助名","借方税区分コード","借方税区分名","借方金額","借方消費税額","貸方税計算モード","貸方部門コード","貸方部門名","貸方科目コード","貸方科目名","貸方補助コード","貸方補助名","貸方税区分コード","貸方税区分名","貸方金額","貸方消費税額","摘要文","数字１","数字２","入力プログラム区分","配賦元税計算","配賦元集計方法","配賦元集計開始日付","配賦元集計終了日付","配賦元管理仕訳区分","配賦元部門コード","配賦元部門名","配賦元科目コード","配賦元科目名","配賦元補助コード","配賦元補助名","配賦元金額","数字３","数字４","数字５","金額１","金額２","金額３","金額４","金額５","文字列１","文字列２","文字列３","文字列４","文字列５","入力日付時間","借方取引先コード","借方取引先名","借方セグメント１コード","借方セグメント１名","借方セグメント２コード","借方セグメント２名","借方セグメント３コード","借方セグメント３名","貸方取引先コード","貸方取引先名","貸方セグメント１コード","貸方セグメント１名","貸方セグメント２コード","貸方セグメント２名","貸方セグメント３コード","貸方セグメント３名","配賦選択","配賦元取引先コード","配賦元取引先名","配賦元セグメント１コード","配賦元セグメント１名","配賦元セグメント２コード","配賦元セグメント２名","配賦元セグメント３コード","配賦元セグメント３名"'

  const pcaServiceResult =
    '"伝票日付","伝票番号","仕訳区分","管理仕訳区分","借方税計算モード","借方部門コード","借方部門名","借方科目コード","借方科目名","借方補助コード","借方補助名","借方税区分コード","借方税区分名","借方金額","借方消費税額","貸方税計算モード","貸方部門コード","貸方部門名","貸方科目コード","貸方科目名","貸方補助コード","貸方補助名","貸方税区分コード","貸方税区分名","貸方金額","貸方消費税額","摘要文","数字１","数字２","入力プログラム区分","配賦元税計算","配賦元集計方法","配賦元集計開始日付","配賦元集計終了日付","配賦元管理仕訳区分","配賦元部門コード","配賦元部門名","配賦元科目コード","配賦元科目名","配賦元補助コード","配賦元補助名","配賦元金額","数字３","数字４","数字５","金額１","金額２","金額３","金額４","金額５","文字列１","文字列２","文字列３","文字列４","文字列５","入力日付時間","借方取引先コード","借方取引先名","借方セグメント１コード","借方セグメント１名","借方セグメント２コード","借方セグメント２名","借方セグメント３コード","借方セグメント３名","貸方取引先コード","貸方取引先名","貸方セグメント１コード","貸方セグメント１名","貸方セグメント２コード","貸方セグメント２名","貸方セグメント３コード","貸方セグメント３名","配賦選択","配賦元取引先コード","配賦元取引先名","配賦元セグメント１コード","配賦元セグメント１名","配賦元セグメント２コード","配賦元セグメント２名","配賦元セグメント３コード","配賦元セグメント３名"\r\n' +
    '"*20220505","00001","21","0","1","000","","0000001710","","","","Q6","",24200,"1936","1","000","","0000001110","","","","00","",24200,"0","","","","1","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","",""\r\n' +
    '"20220505","00001","21","0","1","000","","0000001710","","","","Q6","",24200,"1936","1","000","","0000001110","","","","00","",24200,"0","","","","1","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","",""\r\n' +
    '"20220505","00001","21","0","1","000","","0000001710","","","","Q6","",29340,"2347","1","000","","0000001110","","","","00","",29340,"0","","","","1","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","",""\r\n'

  const ohkenResult =
    '"","","","1","1","","","160","","","","","115","","","1320","","","","","100","","","","","115","","","1320","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","",""'

  const freeeServiceHeader =
    '"[表題行]","日付","伝票番号","決算整理仕訳","借方勘定科目","借方科目コード","借方補助科目","借方取引先","借方取引先コード","借方部門","借方品目","借方メモタグ","借方セグメント1","借方セグメント2","借方セグメント3","借方金額","借方税区分","借方税額","貸方勘定科目","貸方科目コード","貸方補助科目","貸方取引先","貸方取引先コード","貸方部門","貸方品目","貸方メモタグ","貸方セグメント1","貸方セグメント2","貸方セグメント3","貸方金額","貸方税区分","貸方税額","摘要"'

  const freeeServiceResult =
    '"[表題行]","日付","伝票番号","決算整理仕訳","借方勘定科目","借方科目コード","借方補助科目","借方取引先","借方取引先コード","借方部門","借方品目","借方メモタグ","借方セグメント1","借方セグメント2","借方セグメント3","借方金額","借方税区分","借方税額","貸方勘定科目","貸方科目コード","貸方補助科目","貸方取引先","貸方取引先コード","貸方部門","貸方品目","貸方メモタグ","貸方セグメント1","貸方セグメント2","貸方セグメント3","貸方金額","貸方税区分","貸方税額","摘要"\r\n' +
    '"[明細行]","2022/07/28","700","","現金","GENKIN","","","","販売部","商品A","","エリアA","プロジェクトA","","1100000","対象外","0","売上高","URIAGE","freee株式会社","","","販売部","商品A","","エリアA","プロジェクトA","","1100000","課税売上10%","100000","決済済み収入取引・単一行"\r\n'

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
        document[0],
        contractId,
        chkFinalapproval,
        userId
      )

      // 期待結果
      const invoice = require('../mockInvoice/invoice1')
      const checkData = [{ invoice, journalizeInvoiceFinal: journalfindAllSpyResult }]
      expect(result).toEqual(checkData)
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
        document[0],
        contractId,
        noneFinalapproval,
        userId
      )

      // 期待結果
      const invoice = require('../mockInvoice/invoice1')
      const checkData = [{ invoice, journalizeInvoiceFinal: journalfindAllSpyResult }]
      expect(result).toEqual(checkData)
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
        document[0],
        contractId,
        noneFinalapproval,
        userId
      )

      // 期待結果
      const invoice = require('../mockInvoice/invoice1')
      const checkData = [{ invoice, journalizeInvoiceFinal: journalfindAllSpyResult }]
      expect(result).toEqual(checkData)
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
        errorDocuments[0],
        contractId,
        chkFinalapproval,
        userId
      )

      // 期待結果
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
        document[0],
        contractId,
        chkFinalapproval,
        userId
      )

      // 期待結果
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

    test('正常:企業条件がない場合（PCA（version 7））', async () => {
      // 準備
      const invoiceNumber = ''
      const minIssuedate = '2021-10-01'
      const maxIssuedate = '2022-04-25'
      const chkFinalapproval = 'finalapproval'
      const sentBy = []
      const serviceDataFormat = 3

      pcaServiceSpy.mockReturnValue(pcaServiceResult)

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
      expect(dataHeader).toEqual(pcaServiceHeader)
      expect(result).toEqual([pcaServiceResult])
    })

    test('正常:企業条件がある場合（PCA（version 7））', async () => {
      // 準備
      const invoiceNumber = ''
      const minIssuedate = '2021-10-01'
      const maxIssuedate = '2022-04-25'
      const chkFinalapproval = 'finalapproval'
      const sentBy = ['221559d0-53aa-44a2-ab29-0c4a6cb02bd1']
      const serviceDataFormat = 3

      pcaServiceSpy.mockReturnValue(pcaServiceResult)

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
      expect(dataHeader).toEqual(pcaServiceHeader)
      expect(result).toEqual([pcaServiceResult])
    })

    test('正常:データがない場合（PCA（version 7））', async () => {
      // 準備
      const invoiceNumber = ''
      const minIssuedate = '2021-10-01'
      const maxIssuedate = '2022-04-25'
      const chkFinalapproval = 'finalapproval'
      const sentBy = []
      const serviceDataFormat = 3

      pcaServiceSpy.mockReturnValue(null)

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

    test('正常:企業条件がない場合（大蔵大臣NX））', async () => {
      // 準備
      const invoiceNumber = ''
      const minIssuedate = '2021-10-01'
      const maxIssuedate = '2022-04-25'
      const chkFinalapproval = 'finalapproval'
      const sentBy = []
      const serviceDataFormat = 4

      OhkenServiceSpy.mockReturnValue(ohkenResult)

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
      // データ確認
      expect(result).toEqual([ohkenResult])
    })

    test('正常:企業条件がある場合（大蔵大臣NX）', async () => {
      // 準備
      const invoiceNumber = ''
      const minIssuedate = '2021-10-01'
      const maxIssuedate = '2022-04-25'
      const chkFinalapproval = 'finalapproval'
      const sentBy = ['221559d0-53aa-44a2-ab29-0c4a6cb02bd1']
      const serviceDataFormat = 4

      OhkenServiceSpy.mockReturnValue(ohkenResult)

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
      // データ確認
      // expect(dataHeader).toEqual(pcaServiceHeader)
      expect(result).toEqual([ohkenResult])
    })

    test('正常:データがない場合（大蔵大臣NX)', async () => {
      // 準備
      const invoiceNumber = ''
      const minIssuedate = '2021-10-01'
      const maxIssuedate = '2022-04-25'
      const chkFinalapproval = 'finalapproval'
      const sentBy = []
      const serviceDataFormat = 4

      OhkenServiceSpy.mockReturnValue(null)

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

    test('正常:企業条件がない場合（freee会計））', async () => {
      // 準備
      const invoiceNumber = ''
      const minIssuedate = '2022-01-01'
      const maxIssuedate = '2022-07-31'
      const chkFinalapproval = 'finalapproval'
      const sentBy = []
      const serviceDataFormat = 5

      FreeeServiceSpy.mockReturnValue(freeeServiceResult)

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
      // データ確認
      const dataHeader = result[0].split('\r\n')[0]
      expect(dataHeader).toEqual(freeeServiceHeader)
      expect(result).toEqual([freeeServiceResult])
    })

    test('正常:企業条件がある場合（freee会計）', async () => {
      // 準備
      const invoiceNumber = ''
      const minIssuedate = '2022-01-01'
      const maxIssuedate = '2022-07-31'
      const chkFinalapproval = 'finalapproval'
      const sentBy = ['221559d0-53aa-44a2-ab29-0c4a6cb02bd1']
      const serviceDataFormat = 5

      FreeeServiceSpy.mockReturnValue(freeeServiceResult)

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
      // データ確認
      const dataHeader = result[0].split('\r\n')[0]
      expect(dataHeader).toEqual(freeeServiceHeader)
      expect(result).toEqual([freeeServiceResult])
    })

    test('正常:データがない場合（freee会計', async () => {
      // 準備
      const invoiceNumber = ''
      const minIssuedate = '2022-01-01'
      const maxIssuedate = '2022-07-31'
      const chkFinalapproval = 'finalapproval'
      const sentBy = []
      const serviceDataFormat = 5

      FreeeServiceSpy.mockReturnValue(null)

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
      const serviceDataFormat = 99

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
