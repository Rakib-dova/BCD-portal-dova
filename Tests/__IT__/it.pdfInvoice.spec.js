/**
 * @jest-environment jsdom
 */

'use strict'

const app = require('../../Application/app')
const request = require('supertest')
const multer = require('../../Application/node_modules/multer')
const csurf = require('../../Application/node_modules/csurf')

const pdfInvoiceController = require('../../Application/controllers/pdfInvoiceController.js')
const apiManager = require('../../Application/controllers/apiManager.js')
const pdfGenerator = require('../../Application/lib/pdfGenerator')
jest.mock('../../Application/lib/pdfGenerator')

const defaultUser = { tenantId: 'dummyTenantId' }
const defaultParams = {}
const defaultBody = {}
const defaultFile = {}

jest.mock('../../Application/routes/helpers/middleware', () => {
  return {
    isAuthenticated: (req, res, next) => {
      console.log('====    ======')
      return next()
    },
    isTenantRegistered: (req, res, next) => next(),
    isUserRegistered: (req, res, next) => next(),
    bcdAuthenticate: (req, res, next) => {
      req.user = defaultUser
      req.params = defaultParams
      req.body = defaultBody
      req.file = defaultFile
      return next()
    }
  }
})
jest.mock('../../Application/node_modules/multer', () => {
  const multer = function() {
    return {
      single: () => (req, res, next) => next(),
      array: () => () => (req, res, next) => next()
    }
  }
  multer.memoryStorage = () => {}
  return multer
})
jest.mock('../../Application/node_modules/csurf', () => {
  return () => () => (req, res, next) => next()
})

let apiManagerSpy
let findAllInvoicesSpy, findInvoiceSpy, createInvoiceSpy, updateInvoiceSpy

const listData = {
  success: [
    {
      dataValues: {
        invoiceId: 'fc2589b1-2d61-475a-92f7-feac88dd0714',
        invoiceNo: 'B20220501022',
        tmpFlg: false,
        outputDate: null,
        billingDate: null,
        currency: 'JPY',
        paymentDate: new Date('2022-05-01T00:00:00.000Z'),
        deliveryDate: null,
        recCompany: '宛先企業',
        recPost: null,
        recAddr1: null,
        recAddr2: null,
        recAddr3: null,
        sendTenantId: '691ed36b-7c2d-4fb2-92f3-f40a5b3faa2a',
        sendCompany: 'サプライヤー２ひろはし',
        sendPost: '100-0004',
        sendAddr1: '東京都',
        sendAddr2: '大手町',
        sendAddr3: '',
        bankName: null,
        branchName: null,
        accountType: null,
        accountName: null,
        accountNumber: null,
        note: null,
        createdAt: '2022-05-16T00:10:12.121Z',
        updatedAt: new Date('2022-05-16T00:10:19.654Z'),
        PdfInvoiceLines: [
          {
            invoiceId: 'fddebebb-6bd2-4e79-9343-af7be96091e5',
            lineIndex: 0,
            lineId: 'a0001',
            lineDiscription: '内容１',
            unit: 'KG',
            unitPrice: 100,
            quantity: 20,
            taxType: 'tax8p'
          }
        ]
      },
      PdfInvoiceLines: [
        {
          invoiceId: 'fddebebb-6bd2-4e79-9343-af7be96091e5',
          lineIndex: 0,
          lineId: 'a0001',
          lineDiscription: '内容１',
          unit: 'KG',
          unitPrice: 100,
          quantity: 20,
          taxType: 'tax8p'
        }
      ]
    }
  ]
}

const accountInfoTestData = {
  noLogo: {
    CompanyName: '送信先ダミー企業',
    Country: 'JP',
    CompanyAccountId: '795e60d0-1cf4-4bb3-a3e5-06d94ad438af',
    State: 'ACTIVE',
    Description: '送信先ダミー企業',
    Identifiers: [{ scheme: 'TS:ID', value: '795e60d0-1cf4-4bb3-a3e5-06d94ad438af' }],
    AddressLines: [
      { scheme: 'city', value: '東京都' },
      { scheme: 'locality', value: '大手町プレイスウエスト' },
      { scheme: 'street', value: '大手町' },
      { scheme: 'zip', value: '100-8019' }
    ],
    BackgroundURL: null,
    PublicProfile: false,
    NonuserInvoicing: false,
    AutoAcceptConnections: false,
    Restricted: true,
    Created: '2021-07-27T09:10:59.241Z',
    Modified: '2021-07-27T09:13:17.436Z',
    AccountType: 'FREE'
  },
  hasLogo: {
    CompanyName: '送信先ダミー企業',
    Country: 'JP',
    CompanyAccountId: '795e60d0-1cf4-4bb3-a3e5-06d94ad438af',
    State: 'ACTIVE',
    Description: '送信先ダミー企業',
    Identifiers: [{ scheme: 'TS:ID', value: '795e60d0-1cf4-4bb3-a3e5-06d94ad438af' }],
    AddressLines: [
      { scheme: 'city', value: '東京都' },
      { scheme: 'locality', value: '大手町プレイスウエスト' },
      { scheme: 'street', value: '大手町' },
      { scheme: 'zip', value: '100-8019' }
    ],
    BackgroundURL: 'https://res.cloudinary.com/tradeshift-test/image/upload/fa0cc2df-fa4f-5052-b22a-b6984d326ab6.png',
    PublicProfile: false,
    NonuserInvoicing: false,
    AutoAcceptConnections: false,
    Restricted: true,
    Created: '2021-07-27T09:10:59.241Z',
    Modified: '2021-07-27T09:13:17.436Z',
    AccountType: 'FREE'
  }
}

const pdfInvoiceTestData = {
  noSealImp: {
    dataValues: {
      invoiceId: 'fddebebb-6bd2-4e79-9343-af7be96091e5',
      invoiceNo: '111111',
      tmpFlg: false,
      outputDate: new Date('2022-05-12T04:16:21.170Z'),
      billingDate: new Date('2022-05-13T00:00:00.000Z'),
      currency: 'JPY',
      paymentDate: new Date('2022-05-14T00:00:00.000Z'),
      deliveryDate: new Date('2022-05-15T00:00:00.000Z'),
      recCompany: '宛先ダミー企業',
      recPost: '0000000',
      recAddr1: '東京都',
      recAddr2: '大手町',
      recAddr3: '大手町ビル',
      sendTenantId: '795e60d0-1cf4-4bb3-a3e5-06d94ad438af',
      sendCompany: '送信先ダミー企業',
      sendPost: '100-8019',
      sendAddr1: '東京都',
      sendAddr2: '大手町',
      sendAddr3: '大手町プレイスウエスト',
      bankName: '銀行名',
      branchName: '支店',
      accountType: '科目',
      accountName: 'あああ',
      accountNumber: '1234567',
      note: '備考備考備考\n備考',
      createdAt: new Date('2022-05-13T00:00:00.000Z'),
      updatedAt: new Date('2022-05-13T00:00:00.000Z'),
      PdfSealImp: {
        dataValues: { invoiceId: 'fddebebb-6bd2-4e79-9343-af7be96091e5', image: null }
      }
    },
    PdfInvoiceLines: [
      {
        dataValues: {
          invoiceId: 'fddebebb-6bd2-4e79-9343-af7be96091e5',
          lineIndex: 0,
          lineId: 'a0001',
          lineDiscription: '内容１',
          unit: 'KG',
          unitPrice: 100,
          quantity: 20,
          taxType: 'tax8p'
        }
      },
      {
        dataValues: {
          invoiceId: 'fddebebb-6bd2-4e79-9343-af7be96091e5',
          lineIndex: 1,
          lineId: 'a0002',
          lineDiscription: '内容２',
          unit: 'KG',
          unitPrice: 200,
          quantity: 20,
          taxType: 'tax8p'
        }
      }
    ]
  },
  tmpFlgIstrue: {
    dataValues: {
      invoiceId: 'fddebebb-6bd2-4e79-9343-af7be96091e5',
      invoiceNo: '111111',
      tmpFlg: true,
      outputDate: new Date('2022-05-12T04:16:21.170Z'),
      billingDate: new Date('2022-05-13T00:00:00.000Z'),
      currency: 'JPY',
      paymentDate: new Date('2022-05-14T00:00:00.000Z'),
      deliveryDate: new Date('2022-05-15T00:00:00.000Z'),
      recCompany: '宛先ダミー企業',
      recPost: '0000000',
      recAddr1: '東京都',
      recAddr2: '大手町',
      recAddr3: '大手町ビル',
      sendTenantId: '795e60d0-1cf4-4bb3-a3e5-06d94ad438af',
      sendCompany: '送信先ダミー企業',
      sendPost: '100-8019',
      sendAddr1: '東京都',
      sendAddr2: '大手町',
      sendAddr3: '大手町プレイスウエスト',
      bankName: '銀行名',
      branchName: '支店',
      accountType: '科目',
      accountName: 'あああ',
      accountNumber: '1234567',
      note: '備考備考備考\n備考',
      createdAt: new Date('2022-05-13T00:00:00.000Z'),
      updatedAt: new Date('2022-05-13T00:00:00.000Z'),
      PdfSealImp: {
        dataValues: { invoiceId: 'fddebebb-6bd2-4e79-9343-af7be96091e5', image: 'dummyBuffer' }
      }
    },
    PdfInvoiceLines: [
      {
        dataValues: {
          invoiceId: 'fddebebb-6bd2-4e79-9343-af7be96091e5',
          lineIndex: 0,
          lineId: 'a0001',
          lineDiscription: '内容１',
          unit: 'KG',
          unitPrice: 100,
          quantity: 20,
          taxType: 'tax8p'
        }
      },
      {
        dataValues: {
          invoiceId: 'fddebebb-6bd2-4e79-9343-af7be96091e5',
          lineIndex: 1,
          lineId: 'a0002',
          lineDiscription: '内容２',
          unit: 'KG',
          unitPrice: 200,
          quantity: 20,
          taxType: 'tax8p'
        }
      }
    ]
  },
  hasPdfSealImp: {
    dataValues: {
      invoiceId: 'fddebebb-6bd2-4e79-9343-af7be96091e5',
      invoiceNo: '111111',
      tmpFlg: false,
      outputDate: new Date('2022-05-12T04:16:21.170Z'),
      billingDate: new Date('2022-05-13T00:00:00.000Z'),
      currency: 'JPY',
      paymentDate: new Date('2022-05-14T00:00:00.000Z'),
      deliveryDate: new Date('2022-05-15T00:00:00.000Z'),
      recCompany: '宛先ダミー企業',
      recPost: '0000000',
      recAddr1: '東京都',
      recAddr2: '大手町',
      recAddr3: '大手町ビル',
      sendTenantId: '795e60d0-1cf4-4bb3-a3e5-06d94ad438af',
      sendCompany: '送信先ダミー企業',
      sendPost: '100-8019',
      sendAddr1: '東京都',
      sendAddr2: '大手町',
      sendAddr3: '大手町プレイスウエスト',
      bankName: '銀行名',
      branchName: '支店',
      accountType: '科目',
      accountName: 'あああ',
      accountNumber: '1234567',
      note: '備考備考備考\n備考',
      createdAt: new Date('2022-05-13T00:00:00.000Z'),
      updatedAt: new Date('2022-05-13T00:00:00.000Z'),
      PdfSealImp: {
        dataValues: { invoiceId: 'fddebebb-6bd2-4e79-9343-af7be96091e5', image: 'dummyBuffer' }
      }
    },
    PdfInvoiceLines: [
      {
        dataValues: {
          invoiceId: 'fddebebb-6bd2-4e79-9343-af7be96091e5',
          lineIndex: 0,
          lineId: 'a0001',
          lineDiscription: '内容１',
          unit: 'KG',
          unitPrice: 100,
          quantity: 20,
          taxType: 'tax8p'
        }
      },
      {
        dataValues: {
          invoiceId: 'fddebebb-6bd2-4e79-9343-af7be96091e5',
          lineIndex: 1,
          lineId: 'a0002',
          lineDiscription: '内容２',
          unit: 'KG',
          unitPrice: 200,
          quantity: 20,
          taxType: 'tax8p'
        }
      }
    ],
    PdfSealImp: { dataValues: { image: null } }
  }
}

const createTestData = {
  dataValues: {
    tmpFlg: false,
    sendCompany: 'サプライヤー２ひろはし',
    sendPost: '100-0004',
    sendAddr1: '東京都',
    sendAddr2: '大手町',
    sendAddr3: '',
    currency: 'JPY',
    recCompany: '宛先企業',
    recPost: '1000004',
    recAddr1: '東京都千代田区',
    recAddr2: '１－２－３',
    recAddr3: 'コムビルジング',
    invoiceNo: 'B20220501011',
    billingDate: '2022-05-01T00:00:00.000Z',
    paymentDate: '2022-05-02T00:00:00.000Z',
    deliveryDate: '2022-05-03T00:00:00.000Z',
    bankName: 'みずほ銀行',
    branchName: 'テスト支店',
    accountType: '普通',
    accountNumber: '1234567',
    accountName: 'テスト差出人企業',
    note: 'aaaa\n11111\nｶﾀｶﾅ\nああああああ\nアアアアアア\n漢字',
    sendTenantId: '691ed36b-7c2d-4fb2-92f3-f40a5b3faa2a',
    invoiceId: '378fe0e9-4a8d-490c-a406-fc901b64d617',
    updatedAt: '2022-05-14T13:14:51.354Z',
    createdAt: '2022-05-14T13:14:51.354Z',
    outputDate: null
  },
  _previousDataValues: {
    sendCompany: 'サプライヤー２ひろはし',
    sendPost: '100-0004',
    sendAddr1: '東京都',
    sendAddr2: '大手町',
    sendAddr3: '',
    currency: 'JPY',
    recCompany: '宛先企業',
    recPost: '1000004',
    recAddr1: '東京都千代田区',
    recAddr2: '１－２－３',
    recAddr3: 'コムビルジング',
    invoiceNo: 'B20220501011',
    billingDate: '2022-05-01T00:00:00.000Z',
    paymentDate: '2022-05-02T00:00:00.000Z',
    deliveryDate: '2022-05-03T00:00:00.000Z',
    bankName: 'みずほ銀行',
    branchName: 'テスト支店',
    accountType: '普通',
    accountNumber: '1234567',
    accountName: 'テスト差出人企業',
    note: 'aaaa\n11111\nｶﾀｶﾅ\nああああああ\nアアアアアア\n漢字',
    sendTenantId: '691ed36b-7c2d-4fb2-92f3-f40a5b3faa2a',
    invoiceId: '378fe0e9-4a8d-490c-a406-fc901b64d617',
    tmpFlg: false,
    outputDate: null,
    createdAt: '2022-05-14T13:14:51.354Z',
    updatedAt: '2022-05-14T13:14:51.354Z'
  },
  _changed: {},
  _options: {
    isNewRecord: true,
    _schema: null,
    _schemaDelimiter: '',
    attributes: undefined,
    include: undefined,
    raw: undefined,
    silent: undefined
  },
  isNewRecord: false,
  null: null
}

describe('pdfInvocie.js ITテスト', () => {
  beforeEach(() => {
    apiManagerSpy = jest.spyOn(apiManager, 'accessTradeshift')
    findAllInvoicesSpy = jest.spyOn(pdfInvoiceController, 'findAllInvoices')
    findInvoiceSpy = jest.spyOn(pdfInvoiceController, 'findInvoice')
    createInvoiceSpy = jest.spyOn(pdfInvoiceController, 'createInvoice')
    updateInvoiceSpy = jest.spyOn(pdfInvoiceController, 'updateInvoice')
    defaultParams.invoiceId = ''
    defaultBody.invoice = ''
    defaultBody.lines = ''
  })
  afterEach(() => {
    apiManagerSpy.mockRestore()
    findAllInvoicesSpy.mockRestore()
    findInvoiceSpy.mockRestore()
    createInvoiceSpy.mockRestore()
    updateInvoiceSpy.mockRestore()
  })

  describe('get /list リクエスト', () => {
    test('正常: ', async () => {
      findAllInvoicesSpy.mockReturnValue(listData.success)

      const res = await request(app)
        .get('/pdfInvoices/list')
        .set('Accept', 'application/json')

      expect(res.text).toMatch(/2160/i)
      expect(res.text).toMatch(/内容１/i)
      expect(res.text).toMatch(/2022年5月1日/i)
      expect(res.text).toMatch(/2022年5月16日/i)
    })
    test('準正常: PDF請求書情報取得時、DBエラー', async () => {
      findAllInvoicesSpy.mockImplementation(() => { throw new Error('DB Error') })

      const res = await request(app)
        .get('/pdfInvoices/list')
        .set('Accept', 'application/json')

      expect(res.text).toMatch(/お探しのページは見つかりませんでした。/i)
      expect(res.text).toMatch(/上部メニューのHOMEボタンを押下し、トップページへお戻りください。/i)
    })
  })

  describe('get /register リクエスト', () => {
    test('正常', async () => {
      apiManagerSpy.mockReturnValue(accountInfoTestData.noLogo) // ユーザ情報正常取得を想定する

      const res = await request(app)
        .get('/pdfInvoices/register')
        .set('Accept', 'application/json')

      expect(res.text).toMatch(/送信先ダミー企業/i)
      expect(res.text).toMatch(/100-8019/i)
      expect(res.text).toMatch(/東京都/i)
      expect(res.text).toMatch(/大手町/i)
      expect(res.text).toMatch(/大手町プレイスウエスト/i)
    })

    test('準正常: ユーザ情報取得APIエラー', async () => {
      apiManagerSpy.mockReturnValue(new Error('API Error'))

      const res = await request(app)
        .get('/pdfInvoices/register')
        .set('Accept', 'application/json')

      expect(res.text).toMatch(/お探しのページは見つかりませんでした。/i)
      expect(res.text).toMatch(/上部メニューのHOMEボタンを押下し、トップページへお戻りください。/i)
    })
  })

  describe('get /edit/:invoiceId リクエスト', () => {
    test('正常', async () => {
      defaultParams.invoiceId = 'dummyId'
      apiManagerSpy.mockReturnValue(accountInfoTestData.noLogo) // ユーザ情報正常取得を想定する
      findInvoiceSpy.mockReturnValue(pdfInvoiceTestData.noSealImp) // DBからの正常なPDF請求書情報の取得を想定する

      const res = await request(app)
        .get('/pdfInvoices/edit/dummyId')
        .set('Accept', 'application/json')

      expect(res.text).toMatch(/111111/i)
      expect(res.text).toMatch(/銀行名/i)
      expect(res.text).toMatch(/支店/i)
      expect(res.text).toMatch(/科目/i)
      expect(res.text).toMatch(/あああ/i)
      expect(res.text).toMatch(/1234567/i)
      expect(res.text).toMatch(/備考備考備考/i)
      expect(res.text).toMatch(/送信先ダミー企業/i)
      expect(res.text).toMatch(/100-8019/i)
      expect(res.text).toMatch(/東京都/i)
      expect(res.text).toMatch(/大手町/i)
      expect(res.text).toMatch(/大手町プレイスウエスト/i)
    })

    test('準正常: 請求書IDなしの不正リクエスト', async () => {
      const res = await request(app)
        .get('/pdfInvoices/edit/dummyId')
        .set('Accept', 'application/json')

      expect(res.text).toMatch(/不正なページからアクセスされたか、セッションタイムアウトが発生しました。/i)
      expect(res.text).toMatch(/上部メニューのHOMEボタンを押下し、再度操作をやり直してください。/i)
    })

    test('準正常: ユーザ情報取得APIエラー', async () => {
      defaultParams.invoiceId = 'dummyId'
      apiManagerSpy.mockReturnValue(new Error('API Error'))

      const res = await request(app)
        .get('/pdfInvoices/edit/dummyId')
        .set('Accept', 'application/json')

      expect(res.text).toMatch(/お探しのページは見つかりませんでした。/i)
      expect(res.text).toMatch(/上部メニューのHOMEボタンを押下し、トップページへお戻りください。/i)
    })

    test('準正常: PDF請求書情報取得時、DBエラー', async () => {
      defaultParams.invoiceId = 'dummyId'
      apiManagerSpy.mockReturnValue(accountInfoTestData.noLogo) // ユーザ情報正常取得を想定する
      findInvoiceSpy.mockImplementation(() => { throw new Error('DB Error') })

      const res = await request(app)
        .get('/pdfInvoices/edit/dummyId')
        .set('Accept', 'application/json')

      expect(res.text).toMatch(/お探しのページは見つかりませんでした。/i)
      expect(res.text).toMatch(/上部メニューのHOMEボタンを押下し、トップページへお戻りください。/i)
    })
  })

  describe('get /show/:invoiceId リクエスト', () => {
    test('正常', async () => {
      defaultParams.invoiceId = 'dummyId'
      apiManagerSpy.mockReturnValue(accountInfoTestData.noLogo) // ユーザ情報正常取得を想定する
      findInvoiceSpy.mockReturnValue(pdfInvoiceTestData.noSealImp) // DBからの正常なPDF請求書情報の取得を想定する

      const res = await request(app)
        .get('/pdfInvoices/show/dummyId')
        .set('Accept', 'application/json')

      expect(res.text).toMatch(/111111/i)
      expect(res.text).toMatch(/銀行名/i)
      expect(res.text).toMatch(/支店/i)
      expect(res.text).toMatch(/科目/i)
      expect(res.text).toMatch(/あああ/i)
      expect(res.text).toMatch(/1234567/i)
      expect(res.text).toMatch(/備考備考備考/i)
      expect(res.text).toMatch(/送信先ダミー企業/i)
      expect(res.text).toMatch(/100-8019/i)
      expect(res.text).toMatch(/東京都/i)
      expect(res.text).toMatch(/大手町/i)
      expect(res.text).toMatch(/大手町プレイスウエスト/i)
    })
    test('準正常: 請求書IDなしの不正リクエスト', async () => {
      const res = await request(app)
        .get('/pdfInvoices/show/dummyId')
        .set('Accept', 'application/json')

      expect(res.text).toMatch(/不正なページからアクセスされたか、セッションタイムアウトが発生しました。/i)
      expect(res.text).toMatch(/上部メニューのHOMEボタンを押下し、再度操作をやり直してください。/i)
    })
    test('準正常: ユーザ情報取得APIエラー', async () => {
      defaultParams.invoiceId = 'dummyId'
      apiManagerSpy.mockReturnValue(new Error('API Error'))

      const res = await request(app)
        .get('/pdfInvoices/show/dummyId')
        .set('Accept', 'application/json')

      expect(res.text).toMatch(/お探しのページは見つかりませんでした。/i)
      expect(res.text).toMatch(/上部メニューのHOMEボタンを押下し、トップページへお戻りください。/i)
    })

    test('準正常: PDF請求書情報取得時、DBエラー', async () => {
      defaultParams.invoiceId = 'dummyId'
      apiManagerSpy.mockReturnValue(accountInfoTestData.noLogo) // ユーザ情報正常取得を想定する
      findInvoiceSpy.mockImplementation(() => { throw new Error('DB Error') })

      const res = await request(app)
        .get('/pdfInvoices/show/dummyId')
        .set('Accept', 'application/json')

      expect(res.text).toMatch(/お探しのページは見つかりませんでした。/i)
      expect(res.text).toMatch(/上部メニューのHOMEボタンを押下し、トップページへお戻りください。/i)
    })
  })

  describe('post / リクエスト', () => {
    test('正常', async () => {
      defaultBody.invoice = JSON.stringify({}) // supertest の関数でテータ送信を定義していないことに注意
      defaultBody.lines = JSON.stringify([]) // supertest の関数でテータ送信を定義していないことに注意
      createInvoiceSpy.mockReturnValue(createTestData)

      const res = await request(app).post('/pdfInvoices')

      expect(res.text).toMatch(/B20220501011/i)
      expect(res.text).toMatch(/みずほ銀行/i)
      expect(res.text).toMatch(/テスト支店/i)
      expect(res.text).toMatch(/普通/i)
      expect(res.text).toMatch(/テスト差出人企業/i)
      expect(res.text).toMatch(/1234567/i)
      expect(res.text).toMatch(/aaaa/i)
      expect(res.text).toMatch(/宛先企業/i)
      expect(res.text).toMatch(/1000004/i)
      expect(res.text).toMatch(/東京都千代田区/i)
      expect(res.text).toMatch(/１－２－３/i)
      expect(res.text).toMatch(/コムビルジング/i)
    })
    test('準正常: 入力データが存在しない', async () => {
      const res = await request(app).post('/pdfInvoices')

      expect(res.text).toMatch(/不正なページからアクセスされたか、セッションタイムアウトが発生しました。/i)
      expect(res.text).toMatch(/上部メニューのHOMEボタンを押下し、再度操作をやり直してください。/i)
    })
    test('準正常: 入力された明細データが不正', async () => {
      defaultBody.invoice = JSON.stringify({}) // supertest の関数でテータ送信を定義していないことに注意
      defaultBody.lines = JSON.stringify({}) // supertest の関数でテータ送信を定義していないことに注意

      const res = await request(app).post('/pdfInvoices')

      expect(res.text).toMatch(/不正なページからアクセスされたか、セッションタイムアウトが発生しました。/i)
      expect(res.text).toMatch(/上部メニューのHOMEボタンを押下し、再度操作をやり直してください。/i)
    })
    test('準正常: PDF請求書作成時 DBエラー', async () => {
      defaultBody.invoice = JSON.stringify({}) // supertest の関数でテータ送信を定義していないことに注意
      defaultBody.lines = JSON.stringify([]) // supertest の関数でテータ送信を定義していないことに注意
      createInvoiceSpy.mockImplementation(() => { throw new Error('DB Error') })

      const res = await request(app).post('/pdfInvoices')

      expect(res.text).toMatch(/お探しのページは見つかりませんでした。/i)
      expect(res.text).toMatch(/上部メニューのHOMEボタンを押下し、トップページへお戻りください。/i)
    })
  })

  describe('put /:invoiceId リクエスト', () => {
    test('正常', async () => {
      defaultParams.invoiceId = 'dummyId' // supertest の関数でテータ送信を定義していないことに注意
      defaultBody.invoice = JSON.stringify({}) // supertest の関数でテータ送信を定義していないことに注意
      defaultBody.lines = JSON.stringify([]) // supertest の関数でテータ送信を定義していないことに注意
      findInvoiceSpy.mockReturnValue(pdfInvoiceTestData.noSealImp)
      updateInvoiceSpy.mockReturnValue([1])

      const res = await request(app).put('/pdfInvoices/dummyId')

      expect(res.text).toMatch(/result/i)
      expect(res.text).toMatch(/1/i)
    })
    test('準正常: 請求書IDなしの不正リクエスト', async () => {
      const res = await request(app).put('/pdfInvoices/dummyId')

      expect(res.text).toMatch(/不正なページからアクセスされたか、セッションタイムアウトが発生しました。/i)
      expect(res.text).toMatch(/上部メニューのHOMEボタンを押下し、再度操作をやり直してください。/i)
    })
    test('準正常: 入力データが存在しない', async () => {
      defaultParams.invoiceId = 'dummyId'

      const res = await request(app).put('/pdfInvoices/dummyId')

      expect(res.text).toMatch(/不正なページからアクセスされたか、セッションタイムアウトが発生しました。/i)
      expect(res.text).toMatch(/上部メニューのHOMEボタンを押下し、再度操作をやり直してください。/i)
    })
    test('準正常: 入力された明細データが不正', async () => {
      defaultParams.invoiceId = 'dummyId' // supertest の関数でテータ送信を定義していないことに注意
      defaultBody.invoice = JSON.stringify({}) // supertest の関数でテータ送信を定義していないことに注意
      defaultBody.lines = JSON.stringify({}) // supertest の関数でテータ送信を定義していないことに注意

      const res = await request(app).put('/pdfInvoices/dummyId')

      expect(res.text).toMatch(/不正なページからアクセスされたか、セッションタイムアウトが発生しました。/i)
      expect(res.text).toMatch(/上部メニューのHOMEボタンを押下し、再度操作をやり直してください。/i)
    })
    test('準正常: PDF請求書情報取得時、DBエラー', async () => {
      defaultParams.invoiceId = 'dummyId' // supertest の関数でテータ送信を定義していないことに注意
      defaultBody.invoice = JSON.stringify({}) // supertest の関数でテータ送信を定義していないことに注意
      defaultBody.lines = JSON.stringify([]) // supertest の関数でテータ送信を定義していないことに注意
      findInvoiceSpy.mockImplementation(() => { throw new Error('DB Error') })

      const res = await request(app).put('/pdfInvoices/dummyId')

      expect(res.text).toMatch(/お探しのページは見つかりませんでした。/i)
      expect(res.text).toMatch(/上部メニューのHOMEボタンを押下し、トップページへお戻りください。/i)
    })
    test('準正常: 出力済みのPDF請求書を更新', async () => {
      defaultParams.invoiceId = 'dummyId' // supertest の関数でテータ送信を定義していないことに注意
      defaultBody.invoice = JSON.stringify({}) // supertest の関数でテータ送信を定義していないことに注意
      defaultBody.lines = JSON.stringify([]) // supertest の関数でテータ送信を定義していないことに注意
      findInvoiceSpy.mockReturnValue(pdfInvoiceTestData.tmpFlgIstrue)

      const res = await request(app).put('/pdfInvoices/dummyId')

      expect(res.text).toMatch(/不正なページからアクセスされたか、セッションタイムアウトが発生しました。/i)
      expect(res.text).toMatch(/上部メニューのHOMEボタンを押下し、再度操作をやり直してください。/i)
    })
    test('準正常: PDF請求書作成時 DBエラー', async () => {
      defaultParams.invoiceId = 'dummyId' // supertest の関数でテータ送信を定義していないことに注意
      defaultBody.invoice = JSON.stringify({}) // supertest の関数でテータ送信を定義していないことに注意
      defaultBody.lines = JSON.stringify([]) // supertest の関数でテータ送信を定義していないことに注意
      findInvoiceSpy.mockReturnValue(pdfInvoiceTestData.noSealImp)
      updateInvoiceSpy.mockImplementation(() => { throw new Error('DB Error') })

      const res = await request(app).put('/pdfInvoices/dummyId')

      expect(res.text).toMatch(/お探しのページは見つかりませんでした。/i)
      expect(res.text).toMatch(/上部メニューのHOMEボタンを押下し、トップページへお戻りください。/i)
    })
  })

  describe('post /createAndOutput リクエスト', () => {
    test('正常', async () => {
      defaultBody.invoice = JSON.stringify({}) // supertest の関数でテータ送信を定義していないことに注意
      defaultBody.lines = JSON.stringify([]) // supertest の関数でテータ送信を定義していないことに注意
      apiManagerSpy.mockReturnValue(accountInfoTestData.noLogo) // ユーザ情報正常取得を想定する
      defaultFile.mimetype = 'image/png' // supertest の関数でテータ送信を定義していないことに注意
      pdfGenerator.renderInvoiceHTML.mockReturnValue('<html></html>')
      pdfGenerator.generatePdf.mockResolvedValue('dummyBuffer')
      createInvoiceSpy.mockResolvedValue('dummyInvoiceRecord')

      const res = await request(app).post('/pdfInvoices/createAndOutput')

      expect(res.text).toBe('dummyBuffer')
    })
    test('準正常: 入力データが存在しない', async () => {
      const res = await request(app).post('/pdfInvoices/createAndOutput')

      expect(res.text).toMatch(/不正なページからアクセスされたか、セッションタイムアウトが発生しました。/i)
      expect(res.text).toMatch(/上部メニューのHOMEボタンを押下し、再度操作をやり直してください。/i)
    })
    test('準正常: 入力された明細データが不正', async () => {
      defaultBody.invoice = JSON.stringify({}) // supertest の関数でテータ送信を定義していないことに注意
      defaultBody.lines = JSON.stringify({}) // supertest の関数でテータ送信を定義していないことに注意

      const res = await request(app).post('/pdfInvoices/createAndOutput')

      expect(res.text).toMatch(/不正なページからアクセスされたか、セッションタイムアウトが発生しました。/i)
      expect(res.text).toMatch(/上部メニューのHOMEボタンを押下し、再度操作をやり直してください。/i)
    })
    test('準正常: ユーザ情報取得APIエラー', async () => {
      defaultBody.invoice = JSON.stringify({}) // supertest の関数でテータ送信を定義していないことに注意
      defaultBody.lines = JSON.stringify([]) // supertest の関数でテータ送信を定義していないことに注意
      apiManagerSpy.mockReturnValue(new Error('API Error'))

      const res = await request(app).post('/pdfInvoices/createAndOutput')

      expect(res.text).toMatch(/お探しのページは見つかりませんでした。/i)
      expect(res.text).toMatch(/上部メニューのHOMEボタンを押下し、トップページへお戻りください。/i)
    })
    test('準正常: HTML生成失敗', async () => {
      defaultBody.invoice = JSON.stringify({}) // supertest の関数でテータ送信を定義していないことに注意
      defaultBody.lines = JSON.stringify([]) // supertest の関数でテータ送信を定義していないことに注意
      apiManagerSpy.mockReturnValue(accountInfoTestData.noLogo) // ユーザ情報正常取得を想定する
      defaultFile.mimetype = 'image/png' // supertest の関数でテータ送信を定義していないことに注意
      pdfGenerator.renderInvoiceHTML.mockReturnValue(null)

      const res = await request(app).post('/pdfInvoices/createAndOutput')

      expect(res.text).toMatch(/お探しのページは見つかりませんでした。/i)
      expect(res.text).toMatch(/上部メニューのHOMEボタンを押下し、トップページへお戻りください。/i)
    })
    test('準正常: PDF生成失敗', async () => {
      defaultBody.invoice = JSON.stringify({}) // supertest の関数でテータ送信を定義していないことに注意
      defaultBody.lines = JSON.stringify([]) // supertest の関数でテータ送信を定義していないことに注意
      apiManagerSpy.mockReturnValue(accountInfoTestData.noLogo) // ユーザ情報正常取得を想定する
      defaultFile.mimetype = 'image/png' // supertest の関数でテータ送信を定義していないことに注意
      pdfGenerator.renderInvoiceHTML.mockReturnValue('<html></html>')
      pdfGenerator.generatePdf.mockImplementation(() => { throw new Error('pdf generate failed') })

      const res = await request(app).post('/pdfInvoices/createAndOutput')

      expect(res.text).toMatch(/お探しのページは見つかりませんでした。/i)
      expect(res.text).toMatch(/上部メニューのHOMEボタンを押下し、トップページへお戻りください。/i)
    })
    test('準正常: PDF請求書作成時 DBエラー', async () => {
      defaultBody.invoice = JSON.stringify({}) // supertest の関数でテータ送信を定義していないことに注意
      defaultBody.lines = JSON.stringify([]) // supertest の関数でテータ送信を定義していないことに注意
      apiManagerSpy.mockReturnValue(accountInfoTestData.noLogo) // ユーザ情報正常取得を想定する
      defaultFile.mimetype = 'image/png' // supertest の関数でテータ送信を定義していないことに注意
      pdfGenerator.renderInvoiceHTML.mockReturnValue('<html></html>')
      pdfGenerator.generatePdf.mockResolvedValue('dummyBuffer')
      createInvoiceSpy.mockImplementation(() => { throw new Error('DB Error') })

      const res = await request(app).post('/pdfInvoices/createAndOutput')

      expect(res.text).toMatch(/お探しのページは見つかりませんでした。/i)
      expect(res.text).toMatch(/上部メニューのHOMEボタンを押下し、トップページへお戻りください。/i)
    })
  })

  describe('post /updateAndOutput/:invoiceId リクエスト', () => {
    test('正常: 初出力', async () => {
      defaultParams.invoiceId = 'dummyId' // supertest の関数でテータ送信を定義していないことに注意
      defaultBody.invoice = JSON.stringify({}) // supertest の関数でテータ送信を定義していないことに注意
      defaultBody.lines = JSON.stringify([]) // supertest の関数でテータ送信を定義していないことに注意
      findInvoiceSpy.mockReturnValue(pdfInvoiceTestData.noSealImp)
      apiManagerSpy.mockReturnValue(accountInfoTestData.noLogo) // ユーザ情報正常取得を想定する
      defaultFile.mimetype = 'image/png' // supertest の関数でテータ送信を定義していないことに注意
      pdfGenerator.renderInvoiceHTML.mockReturnValue('<html></html>')
      pdfGenerator.generatePdf.mockResolvedValue('dummyBuffer')
      updateInvoiceSpy.mockReturnValue([1])

      const res = await request(app).post('/pdfInvoices/updateAndOutput/:invoiceId')

      expect(res.text).toBe('dummyBuffer')
    })
    test('正常: 出力済み', async () => {
      defaultParams.invoiceId = 'dummyId' // supertest の関数でテータ送信を定義していないことに注意
      defaultBody.invoice = JSON.stringify({}) // supertest の関数でテータ送信を定義していないことに注意
      defaultBody.lines = JSON.stringify([]) // supertest の関数でテータ送信を定義していないことに注意
      findInvoiceSpy.mockReturnValue(pdfInvoiceTestData.tmpFlgIstrue)
      apiManagerSpy.mockReturnValue(accountInfoTestData.noLogo) // ユーザ情報正常取得を想定する
      defaultFile.mimetype = 'image/png' // supertest の関数でテータ送信を定義していないことに注意
      pdfGenerator.renderInvoiceHTML.mockReturnValue('<html></html>')
      pdfGenerator.generatePdf.mockResolvedValue('dummyBuffer')
      updateInvoiceSpy.mockReturnValue([1])

      const res = await request(app).post('/pdfInvoices/updateAndOutput/:invoiceId')

      expect(res.text).toBe('dummyBuffer')
    })
    test('準正常: 請求書IDなしの不正リクエスト', async () => {
      const res = await request(app).post('/pdfInvoices/updateAndOutput/:invoiceId')

      expect(res.text).toMatch(/不正なページからアクセスされたか、セッションタイムアウトが発生しました。/i)
      expect(res.text).toMatch(/上部メニューのHOMEボタンを押下し、再度操作をやり直してください。/i)
    })
    test('準正常: 入力データが存在しない', async () => {
      defaultParams.invoiceId = 'dummyId'

      const res = await request(app).post('/pdfInvoices/updateAndOutput/:invoiceId')

      expect(res.text).toMatch(/不正なページからアクセスされたか、セッションタイムアウトが発生しました。/i)
      expect(res.text).toMatch(/上部メニューのHOMEボタンを押下し、再度操作をやり直してください。/i)
    })
    test('準正常: 入力された明細データが不正', async () => {
      defaultParams.invoiceId = 'dummyId' // supertest の関数でテータ送信を定義していないことに注意
      defaultBody.invoice = JSON.stringify({}) // supertest の関数でテータ送信を定義していないことに注意
      defaultBody.lines = JSON.stringify({}) // supertest の関数でテータ送信を定義していないことに注意

      const res = await request(app).post('/pdfInvoices/updateAndOutput/:invoiceId')

      expect(res.text).toMatch(/不正なページからアクセスされたか、セッションタイムアウトが発生しました。/i)
      expect(res.text).toMatch(/上部メニューのHOMEボタンを押下し、再度操作をやり直してください。/i)
    })
    test('準正常: PDF請求書情報取得時、DBエラー', async () => {
      defaultParams.invoiceId = 'dummyId' // supertest の関数でテータ送信を定義していないことに注意
      defaultBody.invoice = JSON.stringify({}) // supertest の関数でテータ送信を定義していないことに注意
      defaultBody.lines = JSON.stringify([]) // supertest の関数でテータ送信を定義していないことに注意
      findInvoiceSpy.mockImplementation(() => { throw new Error('DB Error') })

      const res = await request(app).post('/pdfInvoices/updateAndOutput/:invoiceId')

      expect(res.text).toMatch(/お探しのページは見つかりませんでした。/i)
      expect(res.text).toMatch(/上部メニューのHOMEボタンを押下し、トップページへお戻りください。/i)
    })
    test('準正常: ユーザ情報取得APIエラー', async () => {
      defaultParams.invoiceId = 'dummyId' // supertest の関数でテータ送信を定義していないことに注意
      defaultBody.invoice = JSON.stringify({}) // supertest の関数でテータ送信を定義していないことに注意
      defaultBody.lines = JSON.stringify([]) // supertest の関数でテータ送信を定義していないことに注意
      findInvoiceSpy.mockReturnValue(pdfInvoiceTestData.tmpFlgIstrue)
      apiManagerSpy.mockReturnValue(new Error('API Error'))

      const res = await request(app).post('/pdfInvoices/updateAndOutput/:invoiceId')

      expect(res.text).toMatch(/お探しのページは見つかりませんでした。/i)
      expect(res.text).toMatch(/上部メニューのHOMEボタンを押下し、トップページへお戻りください。/i)
    })
    test('準正常: HTML生成失敗', async () => {
      defaultParams.invoiceId = 'dummyId' // supertest の関数でテータ送信を定義していないことに注意
      defaultBody.invoice = JSON.stringify({}) // supertest の関数でテータ送信を定義していないことに注意
      defaultBody.lines = JSON.stringify([]) // supertest の関数でテータ送信を定義していないことに注意
      findInvoiceSpy.mockReturnValue(pdfInvoiceTestData.tmpFlgIstrue)
      apiManagerSpy.mockReturnValue(accountInfoTestData.noLogo) // ユーザ情報正常取得を想定する
      defaultFile.mimetype = 'image/png' // supertest の関数でテータ送信を定義していないことに注意
      pdfGenerator.renderInvoiceHTML.mockReturnValue(null)

      const res = await request(app).post('/pdfInvoices/updateAndOutput/:invoiceId')

      expect(res.text).toMatch(/お探しのページは見つかりませんでした。/i)
      expect(res.text).toMatch(/上部メニューのHOMEボタンを押下し、トップページへお戻りください。/i)
    })
    test('準正常: PDF生成失敗', async () => {
      defaultParams.invoiceId = 'dummyId' // supertest の関数でテータ送信を定義していないことに注意
      defaultBody.invoice = JSON.stringify({}) // supertest の関数でテータ送信を定義していないことに注意
      defaultBody.lines = JSON.stringify([]) // supertest の関数でテータ送信を定義していないことに注意
      findInvoiceSpy.mockReturnValue(pdfInvoiceTestData.tmpFlgIstrue)
      apiManagerSpy.mockReturnValue(accountInfoTestData.noLogo) // ユーザ情報正常取得を想定する
      defaultFile.mimetype = 'image/png' // supertest の関数でテータ送信を定義していないことに注意
      pdfGenerator.renderInvoiceHTML.mockReturnValue('<html></html>')
      pdfGenerator.generatePdf.mockImplementation(() => { throw new Error('pdf generate failed') })

      const res = await request(app).post('/pdfInvoices/updateAndOutput/:invoiceId')

      expect(res.text).toMatch(/お探しのページは見つかりませんでした。/i)
      expect(res.text).toMatch(/上部メニューのHOMEボタンを押下し、トップページへお戻りください。/i)
    })
    test('準正常: PDF請求書作成時 DBエラー', async () => {
      defaultParams.invoiceId = 'dummyId' // supertest の関数でテータ送信を定義していないことに注意
      defaultBody.invoice = JSON.stringify({}) // supertest の関数でテータ送信を定義していないことに注意
      defaultBody.lines = JSON.stringify([]) // supertest の関数でテータ送信を定義していないことに注意
      findInvoiceSpy.mockReturnValue(pdfInvoiceTestData.noSealImp)
      apiManagerSpy.mockReturnValue(accountInfoTestData.noLogo) // ユーザ情報正常取得を想定する
      defaultFile.mimetype = 'image/png' // supertest の関数でテータ送信を定義していないことに注意
      pdfGenerator.renderInvoiceHTML.mockReturnValue('<html></html>')
      pdfGenerator.generatePdf.mockResolvedValue('dummyBuffer')
      createInvoiceSpy.mockImplementation(() => { throw new Error('DB Error') })

      const res = await request(app).post('/pdfInvoices/updateAndOutput/:invoiceId')

      expect(res.text).toMatch(/お探しのページは見つかりませんでした。/i)
      expect(res.text).toMatch(/上部メニューのHOMEボタンを押下し、トップページへお戻りください。/i)
    })
  })
})
