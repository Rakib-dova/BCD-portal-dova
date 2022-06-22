'use strict'

jest.mock('../../Application/node_modules/express', () => {
  return require('jest-express')
})

const pdfInvoice = require('../../Application/routes/pdfInvoice.js')
const Request = require('jest-express').Request
const Response = require('jest-express').Response
const next = require('jest-express').Next
// const helper = require('../../Application/routes/helpers/middleware')
const errorHelper = require('../../Application/routes/helpers/error')
const apiManager = require('../../Application/controllers/apiManager.js')
const pdfInvoiceController = require('../../Application/controllers/pdfInvoiceController.js')
const logger = require('../../Application/lib/logger.js')
const pdfGenerator = require('../../Application/lib/pdfGenerator')
jest.mock('../../Application/lib/pdfGenerator')

let request, response, infoSpy, errorSpy, accessTradeshift
let pdfInvoiceControllerFindAllInvoicesSpy, pdfInvoiceControllerfindInvoiceSpy, createInvoiceSpy, updateInvoiceSpy

// 404エラー定義
const error404 = new Error('お探しのページは見つかりませんでした。')
error404.name = 'Not Found'
error404.status = 404

const user = [
  {
    // 契約ステータス：契約中
    userId: '388014b9-d667-4144-9cc4-5da420981438',
    email: 'dummy@testdummy.com',
    tenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
    accessToken: 'dummyAccessToken',
    refreshToken: 'dummyRefreshToken'
  }
]

// 戻り値定義
const pdfInvoices = [
  {
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
      PdfInvoiceLines: [
        {
          invoiceId: 'fddebebb-6bd2-4e79-9343-af7be96091e5',
          lineIndex: 0,
          lineId: 'a0001',
          lineDescription: '内容１',
          unit: 'KG',
          unitPrice: 100,
          quantity: 20,
          taxType: 'tax8p'
        },
        {
          invoiceId: 'fddebebb-6bd2-4e79-9343-af7be96091e5',
          lineIndex: 1,
          lineId: 'a0002',
          lineDescription: '内容２',
          unit: 'KG',
          unitPrice: 200,
          quantity: 20,
          taxType: 'tax8p'
        }
      ],
      PdfSealImp: {
        dataValues: { invoiceId: 'fddebebb-6bd2-4e79-9343-af7be96091e5', image: null }
      }
    }
  }
]

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
          lineDescription: '内容１',
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
          lineDescription: '内容２',
          unit: 'KG',
          unitPrice: 200,
          quantity: 20,
          taxType: 'tax8p'
        }
      }
    ]
  },
  hasSealImp: {
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
          lineDescription: '内容１',
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
          lineDescription: '内容２',
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
          lineDescription: '内容１',
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
          lineDescription: '内容２',
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

const accountInfo = {
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
  LogoURL: 'https://res.cloudinary.com/tradeshift-test/image/upload/fa0cc2df-fa4f-5052-b22a-b6984d326ab6.png',
  PublicProfile: false,
  NonuserInvoicing: false,
  AutoAcceptConnections: false,
  Restricted: true,
  Created: '2021-07-27T09:10:59.241Z',
  Modified: '2021-07-27T09:13:17.436Z',
  AccountType: 'FREE'
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
    LogoURL: null,
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
    LogoURL: 'https://res.cloudinary.com/tradeshift-test/image/upload/fa0cc2df-fa4f-5052-b22a-b6984d326ab6.png',
    PublicProfile: false,
    NonuserInvoicing: false,
    AutoAcceptConnections: false,
    Restricted: true,
    Created: '2021-07-27T09:10:59.241Z',
    Modified: '2021-07-27T09:13:17.436Z',
    AccountType: 'FREE'
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

const exprectedShowData = {
  noSealImpNoLogo: {
    title: 'PDF請求書',
    engTitle: 'PDF INVOICE',
    invoice: JSON.stringify({
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
      updatedAt: new Date('2022-05-13T00:00:00.000Z')
    }),
    lines: JSON.stringify([
      {
        invoiceId: 'fddebebb-6bd2-4e79-9343-af7be96091e5',
        lineIndex: 0,
        lineId: 'a0001',
        lineDescription: '内容１',
        unit: 'KG',
        unitPrice: 100,
        quantity: 20,
        taxType: 'tax8p'
      },
      {
        invoiceId: 'fddebebb-6bd2-4e79-9343-af7be96091e5',
        lineIndex: 1,
        lineId: 'a0002',
        lineDescription: '内容２',
        unit: 'KG',
        unitPrice: 200,
        quantity: 20,
        taxType: 'tax8p'
      }
    ]),
    sealImpSrc: null,
    logoSrc: null,
    csrfToken: 'dummyCsrfToken'
  },
  hasSealImpNoLogo: {
    title: 'PDF請求書',
    engTitle: 'PDF INVOICE',
    invoice: JSON.stringify({
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
      updatedAt: new Date('2022-05-13T00:00:00.000Z')
    }),
    lines: JSON.stringify([
      {
        invoiceId: 'fddebebb-6bd2-4e79-9343-af7be96091e5',
        lineIndex: 0,
        lineId: 'a0001',
        lineDescription: '内容１',
        unit: 'KG',
        unitPrice: 100,
        quantity: 20,
        taxType: 'tax8p'
      },
      {
        invoiceId: 'fddebebb-6bd2-4e79-9343-af7be96091e5',
        lineIndex: 1,
        lineId: 'a0002',
        lineDescription: '内容２',
        unit: 'KG',
        unitPrice: 200,
        quantity: 20,
        taxType: 'tax8p'
      }
    ]),
    sealImpSrc: 'data:image/png;base64,dummyBuffer',
    logoSrc: null,
    csrfToken: 'dummyCsrfToken'
  },
  noSealImpHasLogo: {
    title: 'PDF請求書',
    engTitle: 'PDF INVOICE',
    invoice: JSON.stringify({
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
      updatedAt: new Date('2022-05-13T00:00:00.000Z')
    }),
    lines: JSON.stringify([
      {
        invoiceId: 'fddebebb-6bd2-4e79-9343-af7be96091e5',
        lineIndex: 0,
        lineId: 'a0001',
        lineDescription: '内容１',
        unit: 'KG',
        unitPrice: 100,
        quantity: 20,
        taxType: 'tax8p'
      },
      {
        invoiceId: 'fddebebb-6bd2-4e79-9343-af7be96091e5',
        lineIndex: 1,
        lineId: 'a0002',
        lineDescription: '内容２',
        unit: 'KG',
        unitPrice: 200,
        quantity: 20,
        taxType: 'tax8p'
      }
    ]),
    sealImpSrc: null,
    logoSrc: 'https://res.cloudinary.com/tradeshift-test/image/upload/fa0cc2df-fa4f-5052-b22a-b6984d326ab6.png',
    csrfToken: 'dummyCsrfToken'
  },
  hasSealImpHasLogo: {
    title: 'PDF請求書',
    engTitle: 'PDF INVOICE',
    invoice: JSON.stringify({
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
      updatedAt: new Date('2022-05-13T00:00:00.000Z')
    }),
    lines: JSON.stringify([
      {
        invoiceId: 'fddebebb-6bd2-4e79-9343-af7be96091e5',
        lineIndex: 0,
        lineId: 'a0001',
        lineDescription: '内容１',
        unit: 'KG',
        unitPrice: 100,
        quantity: 20,
        taxType: 'tax8p'
      },
      {
        invoiceId: 'fddebebb-6bd2-4e79-9343-af7be96091e5',
        lineIndex: 1,
        lineId: 'a0002',
        lineDescription: '内容２',
        unit: 'KG',
        unitPrice: 200,
        quantity: 20,
        taxType: 'tax8p'
      }
    ]),
    sealImpSrc: 'data:image/png;base64,dummyBuffer',
    logoSrc: 'https://res.cloudinary.com/tradeshift-test/image/upload/fa0cc2df-fa4f-5052-b22a-b6984d326ab6.png',
    csrfToken: 'dummyCsrfToken'
  }
}

const exprectedEditData = {
  noSealImpNoLogo: {
    title: 'PDF請求書編集',
    engTitle: 'EDIT PDF INVOICE',
    invoice: JSON.stringify({
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
      updatedAt: new Date('2022-05-13T00:00:00.000Z')
    }),
    lines: JSON.stringify([
      {
        invoiceId: 'fddebebb-6bd2-4e79-9343-af7be96091e5',
        lineIndex: 0,
        lineId: 'a0001',
        lineDescription: '内容１',
        unit: 'KG',
        unitPrice: 100,
        quantity: 20,
        taxType: 'tax8p'
      },
      {
        invoiceId: 'fddebebb-6bd2-4e79-9343-af7be96091e5',
        lineIndex: 1,
        lineId: 'a0002',
        lineDescription: '内容２',
        unit: 'KG',
        unitPrice: 200,
        quantity: 20,
        taxType: 'tax8p'
      }
    ]),
    sealImpSrc: '/image/ts-app-digitaltrade-func-icon-pdf_stamp_select.svg',
    logoSrc: null,
    editing: true,
    csrfToken: 'dummyCsrfToken'
  },
  hasSealImpNoLogo: {
    title: 'PDF請求書編集',
    engTitle: 'EDIT PDF INVOICE',
    invoice: JSON.stringify({
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
      updatedAt: new Date('2022-05-13T00:00:00.000Z')
    }),
    lines: JSON.stringify([
      {
        invoiceId: 'fddebebb-6bd2-4e79-9343-af7be96091e5',
        lineIndex: 0,
        lineId: 'a0001',
        lineDescription: '内容１',
        unit: 'KG',
        unitPrice: 100,
        quantity: 20,
        taxType: 'tax8p'
      },
      {
        invoiceId: 'fddebebb-6bd2-4e79-9343-af7be96091e5',
        lineIndex: 1,
        lineId: 'a0002',
        lineDescription: '内容２',
        unit: 'KG',
        unitPrice: 200,
        quantity: 20,
        taxType: 'tax8p'
      }
    ]),
    sealImpSrc: 'data:image/png;base64,dummyBuffer',
    logoSrc: null,
    editing: true,
    csrfToken: 'dummyCsrfToken'
  },
  noSealImpHasLogo: {
    title: 'PDF請求書編集',
    engTitle: 'EDIT PDF INVOICE',
    invoice: JSON.stringify({
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
      updatedAt: new Date('2022-05-13T00:00:00.000Z')
    }),
    lines: JSON.stringify([
      {
        invoiceId: 'fddebebb-6bd2-4e79-9343-af7be96091e5',
        lineIndex: 0,
        lineId: 'a0001',
        lineDescription: '内容１',
        unit: 'KG',
        unitPrice: 100,
        quantity: 20,
        taxType: 'tax8p'
      },
      {
        invoiceId: 'fddebebb-6bd2-4e79-9343-af7be96091e5',
        lineIndex: 1,
        lineId: 'a0002',
        lineDescription: '内容２',
        unit: 'KG',
        unitPrice: 200,
        quantity: 20,
        taxType: 'tax8p'
      }
    ]),
    sealImpSrc: '/image/ts-app-digitaltrade-func-icon-pdf_stamp_select.svg',
    logoSrc: 'https://res.cloudinary.com/tradeshift-test/image/upload/fa0cc2df-fa4f-5052-b22a-b6984d326ab6.png',
    editing: true,
    csrfToken: 'dummyCsrfToken'
  },
  hasSealImpHasLogo: {
    title: 'PDF請求書編集',
    engTitle: 'EDIT PDF INVOICE',
    invoice: JSON.stringify({
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
      updatedAt: new Date('2022-05-13T00:00:00.000Z')
    }),
    lines: JSON.stringify([
      {
        invoiceId: 'fddebebb-6bd2-4e79-9343-af7be96091e5',
        lineIndex: 0,
        lineId: 'a0001',
        lineDescription: '内容１',
        unit: 'KG',
        unitPrice: 100,
        quantity: 20,
        taxType: 'tax8p'
      },
      {
        invoiceId: 'fddebebb-6bd2-4e79-9343-af7be96091e5',
        lineIndex: 1,
        lineId: 'a0002',
        lineDescription: '内容２',
        unit: 'KG',
        unitPrice: 200,
        quantity: 20,
        taxType: 'tax8p'
      }
    ]),
    sealImpSrc: 'data:image/png;base64,dummyBuffer',
    logoSrc: 'https://res.cloudinary.com/tradeshift-test/image/upload/fa0cc2df-fa4f-5052-b22a-b6984d326ab6.png',
    editing: true,
    csrfToken: 'dummyCsrfToken'
  }
}

const expectedCreateData = {
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

// const renderHtmlInput = {
//   billingDate: new Date('1970-01-01T00:00:00.000Z'),
//   deliveryDate: new Date('1970-01-01T00:00:00.000Z'),
//   invoiceId: '6239b0a0-5d77-4954-81ff-2e3e7d7b8cbf',
//   lines: [],
//   outputDate: new Date('2022-05-14T15:12:47.008Z'),
//   paymentDate: new Date('1970-01-01T00:00:00.000Z'),
//   sendTenantId: '15e2d952-8ba0-42a4-8582-b234cb4a2089',
//   tmpFlg: true
// }

describe('pdfInvoiceのテスト', () => {
  beforeEach(() => {
    request = new Request()
    request.user = user[0]
    request.csrfToken = () => 'dummyCsrfToken'
    response = new Response()
    infoSpy = jest.spyOn(logger, 'info')
    errorSpy = jest.spyOn(logger, 'error')
    accessTradeshift = jest.spyOn(apiManager, 'accessTradeshift')
    request.flash = jest.fn()
    pdfInvoiceControllerFindAllInvoicesSpy = jest.spyOn(pdfInvoiceController, 'findAllInvoices')
    pdfInvoiceControllerfindInvoiceSpy = jest.spyOn(pdfInvoiceController, 'findInvoice')
    createInvoiceSpy = jest.spyOn(pdfInvoiceController, 'createInvoice')
    updateInvoiceSpy = jest.spyOn(pdfInvoiceController, 'updateInvoice')
  })
  afterEach(() => {
    request.resetMocked()
    response.resetMocked()
    next.mockReset()
    infoSpy.mockRestore()
    errorSpy.mockRestore()
    accessTradeshift.mockRestore()
    pdfInvoiceControllerFindAllInvoicesSpy.mockRestore()
    pdfInvoiceControllerfindInvoiceSpy.mockRestore()
    createInvoiceSpy.mockRestore()
    updateInvoiceSpy.mockRestore()
  })

  describe('コールバック:pdfInvoiceList', () => {
    test('正常', async () => {
      pdfInvoiceControllerFindAllInvoicesSpy.mockReturnValue(pdfInvoices) // DBからの正常なPDF請求書情報の取得を想定する

      await pdfInvoice.pdfInvoiceList(request, response, next)

      expect(response.render).toHaveBeenCalledWith('pdfInvoiceList', {
        title: 'PDF請求書',
        engTitle: 'PDF INVOICING',
        itemCount: 1,
        invoices: JSON.stringify([
          {
            invoiceId: 'fddebebb-6bd2-4e79-9343-af7be96091e5',
            invoiceNo: '111111',
            tmpFlg: true,
            outputDate: new Date('2022-05-12T04:16:21.170Z'),
            billingDate: new Date('2022-05-13T00:00:00.000Z'),
            currency: 'JPY',
            paymentDate: '2022年5月14日',
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
            updatedAt: '2022年5月13日',
            PdfInvoiceLines: [
              {
                invoiceId: 'fddebebb-6bd2-4e79-9343-af7be96091e5',
                lineIndex: 0,
                lineId: 'a0001',
                lineDescription: '内容１',
                unit: 'KG',
                unitPrice: 100,
                quantity: 20,
                taxType: 'tax8p'
              },
              {
                invoiceId: 'fddebebb-6bd2-4e79-9343-af7be96091e5',
                lineIndex: 1,
                lineId: 'a0002',
                lineDescription: '内容２',
                unit: 'KG',
                unitPrice: 200,
                quantity: 20,
                taxType: 'tax8p'
              }
            ],
            PdfSealImp: {
              dataValues: { invoiceId: 'fddebebb-6bd2-4e79-9343-af7be96091e5', image: null }
            },
            total: 6480
          }
        ]),
        csrfToken: 'dummyCsrfToken'
      })
    })

    test('準正常: PDF請求書情報取得時、DBエラー', async () => {
      pdfInvoiceControllerFindAllInvoicesSpy.mockImplementation(() => {
        throw new Error('PdfInvoice Table Error')
      })

      await pdfInvoice.pdfInvoiceList(request, response, next)

      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
    })
  })

  describe('コールバック:pdfInvoiceRegister', () => {
    test('正常: ロゴあり', async () => {
      accessTradeshift.mockReturnValue(accountInfo)

      await pdfInvoice.pdfInvoiceRegister(request, response, next)

      expect(response.render).toHaveBeenCalledWith('pdfInvoice', {
        title: 'PDF請求書作成',
        engTitle: 'REGISTER PDF INVOICE',
        invoice: JSON.stringify({
          sendCompany: '送信先ダミー企業',
          sendPost: '100-8019',
          sendAddr1: '東京都',
          sendAddr2: '大手町',
          sendAddr3: '大手町プレイスウエスト'
        }),
        lines: JSON.stringify([]),
        sealImpSrc: '/image/ts-app-digitaltrade-func-icon-pdf_stamp_select.svg',
        logoSrc: 'https://res.cloudinary.com/tradeshift-test/image/upload/fa0cc2df-fa4f-5052-b22a-b6984d326ab6.png',
        editing: true,
        csrfToken: 'dummyCsrfToken'
      })
    })
    test('正常: ロゴなし', async () => {
      // ロゴなしユーザ情報取得を想定する
      const account = accountInfo
      delete account.LogoURL
      accessTradeshift.mockReturnValue(account)

      await pdfInvoice.pdfInvoiceRegister(request, response, next)

      expect(response.render).toHaveBeenCalledWith('pdfInvoice', {
        title: 'PDF請求書作成',
        engTitle: 'REGISTER PDF INVOICE',
        invoice: JSON.stringify({
          sendCompany: '送信先ダミー企業',
          sendPost: '100-8019',
          sendAddr1: '東京都',
          sendAddr2: '大手町',
          sendAddr3: '大手町プレイスウエスト'
        }),
        lines: JSON.stringify([]),
        sealImpSrc: '/image/ts-app-digitaltrade-func-icon-pdf_stamp_select.svg',
        logoSrc: null,
        editing: true,
        csrfToken: 'dummyCsrfToken'
      })
    })
    test('準正常: ユーザ情報取得APIエラー', async () => {
      accessTradeshift.mockReturnValue(new Error('API Error')) // APIエラーを想定

      await pdfInvoice.pdfInvoiceRegister(request, response, next)

      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
    })
  })

  describe('コールバック:pdfInvoiceEdit', () => {
    test('正常: 印影なし、ロゴなし', async () => {
      request.params.invoiceId = 'dummyId'
      accessTradeshift.mockReturnValue(accountInfoTestData.noLogo) // ユーザ情報正常取得を想定する
      pdfInvoiceControllerfindInvoiceSpy.mockReturnValue(pdfInvoiceTestData.noSealImp) // DBからの正常なPDF請求書情報の取得を想定する

      await pdfInvoice.pdfInvoiceEdit(request, response, next)

      expect(response.render).toHaveBeenCalledWith('pdfInvoice', exprectedEditData.noSealImpNoLogo)
    })
    test('正常: 印影あり、ロゴなし', async () => {
      request.params.invoiceId = 'dummyId'
      accessTradeshift.mockReturnValue(accountInfoTestData.noLogo) // ユーザ情報正常取得を想定する
      pdfInvoiceControllerfindInvoiceSpy.mockReturnValue(pdfInvoiceTestData.hasSealImp) // DBからの正常なPDF請求書情報の取得を想定する

      await pdfInvoice.pdfInvoiceEdit(request, response, next)

      expect(response.render).toHaveBeenCalledWith('pdfInvoice', exprectedEditData.hasSealImpNoLogo)
    })
    test('正常: 印影なし、ロゴあり', async () => {
      request.params.invoiceId = 'dummyId'
      accessTradeshift.mockReturnValue(accountInfoTestData.hasLogo) // ユーザ情報正常取得を想定する
      pdfInvoiceControllerfindInvoiceSpy.mockReturnValue(pdfInvoiceTestData.noSealImp) // DBからの正常なPDF請求書情報の取得を想定する

      await pdfInvoice.pdfInvoiceEdit(request, response, next)

      expect(response.render).toHaveBeenCalledWith('pdfInvoice', exprectedEditData.noSealImpHasLogo)
    })
    test('正常: 印影あり、ロゴあり', async () => {
      request.params.invoiceId = 'dummyId'
      accessTradeshift.mockReturnValue(accountInfoTestData.hasLogo) // ユーザ情報正常取得を想定する
      pdfInvoiceControllerfindInvoiceSpy.mockReturnValue(pdfInvoiceTestData.hasSealImp) // DBからの正常なPDF請求書情報の取得を想定する

      await pdfInvoice.pdfInvoiceEdit(request, response, next)

      expect(response.render).toHaveBeenCalledWith('pdfInvoice', exprectedEditData.hasSealImpHasLogo)
    })
    test('準正常: 請求書IDなしの不正リクエスト', async () => {
      request.params.invoiceId = undefined

      await pdfInvoice.pdfInvoiceEdit(request, response, next)

      expect(next).toHaveBeenCalledWith(errorHelper.create(400))
    })
    test('準正常: ユーザ情報取得APIエラー', async () => {
      request.params.invoiceId = 'dummyId'
      accessTradeshift.mockReturnValue(new Error('API Error')) // APIエラーを想定

      await pdfInvoice.pdfInvoiceEdit(request, response, next)

      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
    })
    test('準正常: PDF請求書情報取得時、DBエラー', async () => {
      request.params.invoiceId = 'dummyId'
      accessTradeshift.mockReturnValue(accountInfoTestData.noLogo)
      pdfInvoiceControllerfindInvoiceSpy.mockImplementation(() => {
        throw new Error('DB Error')
      })

      await pdfInvoice.pdfInvoiceEdit(request, response, next)

      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
    })
  })

  describe('コールバック:pdfInvoiceShow', () => {
    test('正常: 印影なし、ロゴなし', async () => {
      request.params.invoiceId = 'dummyId'
      accessTradeshift.mockReturnValue(accountInfoTestData.noLogo) // ユーザ情報正常取得を想定する
      pdfInvoiceControllerfindInvoiceSpy.mockReturnValue(pdfInvoiceTestData.noSealImp) // DBからの正常なPDF請求書情報の取得を想定する

      await pdfInvoice.pdfInvoiceShow(request, response, next)

      expect(response.render).toHaveBeenCalledWith('pdfInvoice', exprectedShowData.noSealImpNoLogo)
    })
    test('正常: 印影あり、ロゴなし', async () => {
      request.params.invoiceId = 'dummyId'
      accessTradeshift.mockReturnValue(accountInfoTestData.noLogo) // ユーザ情報正常取得を想定する
      pdfInvoiceControllerfindInvoiceSpy.mockReturnValue(pdfInvoiceTestData.hasSealImp) // DBからの正常なPDF請求書情報の取得を想定する

      await pdfInvoice.pdfInvoiceShow(request, response, next)

      expect(response.render).toHaveBeenCalledWith('pdfInvoice', exprectedShowData.hasSealImpNoLogo)
    })
    test('正常: 印影なし、ロゴあり', async () => {
      request.params.invoiceId = 'dummyId'
      accessTradeshift.mockReturnValue(accountInfoTestData.hasLogo) // ユーザ情報正常取得を想定する
      pdfInvoiceControllerfindInvoiceSpy.mockReturnValue(pdfInvoiceTestData.noSealImp) // DBからの正常なPDF請求書情報の取得を想定する

      await pdfInvoice.pdfInvoiceShow(request, response, next)

      expect(response.render).toHaveBeenCalledWith('pdfInvoice', exprectedShowData.noSealImpHasLogo)
    })
    test('正常: 印影あり、ロゴあり', async () => {
      request.params.invoiceId = 'dummyId'
      accessTradeshift.mockReturnValue(accountInfoTestData.hasLogo) // ユーザ情報正常取得を想定する
      pdfInvoiceControllerfindInvoiceSpy.mockReturnValue(pdfInvoiceTestData.hasSealImp) // DBからの正常なPDF請求書情報の取得を想定する

      await pdfInvoice.pdfInvoiceShow(request, response, next)

      expect(response.render).toHaveBeenCalledWith('pdfInvoice', exprectedShowData.hasSealImpHasLogo)
    })
    test('準正常: 請求書IDなしの不正リクエスト', async () => {
      request.params.invoiceId = undefined

      await pdfInvoice.pdfInvoiceEdit(request, response, next)

      expect(next).toHaveBeenCalledWith(errorHelper.create(400))
    })
    test('準正常: ユーザ情報取得APIエラー', async () => {
      request.params.invoiceId = 'dummyId'
      accessTradeshift.mockReturnValue(new Error('API Error')) // APIエラーを想定

      await pdfInvoice.pdfInvoiceEdit(request, response, next)

      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
    })
    test('準正常: PDF請求書情報取得時、DBエラー', async () => {
      request.params.invoiceId = 'dummyId'
      accessTradeshift.mockReturnValue(accountInfoTestData.noLogo)
      pdfInvoiceControllerfindInvoiceSpy.mockImplementation(() => {
        throw new Error('DB Error')
      })

      await pdfInvoice.pdfInvoiceEdit(request, response, next)

      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
    })
  })

  describe('コールバック:createPdfInvoice', () => {
    test('正常', async () => {
      request.body = { invoice: '{}', lines: '[]' }
      createInvoiceSpy.mockReturnValue(createTestData)

      await pdfInvoice.createPdfInvoice(request, response, next)

      expect(response.status).toHaveBeenCalledWith(201)
      expect(response.send).toHaveBeenCalledWith({ invoice: expectedCreateData })
    })
    test('準正常: 入力データが存在しない', async () => {
      request.body = {}

      await pdfInvoice.createPdfInvoice(request, response, next)

      expect(next).toHaveBeenCalledWith(errorHelper.create(400))
    })
    test('準正常: 入力された明細データが不正', async () => {
      request.body = { invoice: '{}', lines: '{}' }

      await pdfInvoice.createPdfInvoice(request, response, next)

      expect(next).toHaveBeenCalledWith(errorHelper.create(400))
    })
    test('準正常: PDF請求書作成時 DBエラー', async () => {
      request.body = { invoice: '{}', lines: '[]' }
      createInvoiceSpy.mockImplementation(() => {
        throw new Error('DB Error')
      })

      await pdfInvoice.createPdfInvoice(request, response, next)

      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
    })
  })

  describe('コールバック:updatePdfInvoice', () => {
    test('正常', async () => {
      request.params.invoiceId = 'dummyId'
      request.body = { invoice: '{}', lines: '[]' }
      pdfInvoiceControllerfindInvoiceSpy.mockResolvedValue(pdfInvoiceTestData.noSealImp)
      updateInvoiceSpy.mockReturnValue([1])

      await pdfInvoice.updatePdfInvoice(request, response, next)

      expect(response.status).toHaveBeenCalledWith(200)
      expect(response.send).toHaveBeenCalledWith({ result: 1 })
    })
    test('準正常: 請求書IDなしの不正リクエスト', async () => {
      request.params.invoiceId = undefined

      await pdfInvoice.updatePdfInvoice(request, response, next)

      expect(next).toHaveBeenCalledWith(errorHelper.create(400))
    })
    test('準正常: 入力データが存在しない', async () => {
      request.params.invoiceId = 'dummyId'
      request.body = {}

      await pdfInvoice.updatePdfInvoice(request, response, next)

      expect(next).toHaveBeenCalledWith(errorHelper.create(400))
    })
    test('準正常: 入力された明細データが不正', async () => {
      request.params.invoiceId = 'dummyId'
      request.body = { invoice: '{}', lines: '{}' }

      await pdfInvoice.updatePdfInvoice(request, response, next)

      expect(next).toHaveBeenCalledWith(errorHelper.create(400))
    })
    test('準正常: PDF請求書情報取得時、DBエラー', async () => {
      request.params.invoiceId = 'dummyID'
      request.body = { invoice: '{}', lines: '[]' }
      pdfInvoiceControllerfindInvoiceSpy.mockImplementation(() => {
        throw new Error('DB Error')
      })

      await pdfInvoice.updatePdfInvoice(request, response, next)

      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
    })
    test('準正常: PDF請求書更新時 DBエラー', async () => {
      request.params.invoiceId = 'dummyId'
      request.body = { invoice: '{}', lines: '[]' }
      pdfInvoiceControllerfindInvoiceSpy.mockResolvedValue(pdfInvoiceTestData.noSealImp)
      updateInvoiceSpy.mockImplementation(() => {
        throw new Error('DB Error')
      })

      await pdfInvoice.updatePdfInvoice(request, response, next)

      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
    })
  })

  describe('コールバック:createAndOutputPdfInvoice', () => {
    test('正常', async () => {
      request.body = { invoice: '{"billingDate":null,"paymentDate":null,"deliveryDate":null}', lines: '[]' }
      accessTradeshift.mockReturnValue(accountInfoTestData.noLogo) // ユーザ情報正常取得を想定する
      pdfGenerator.renderInvoiceHTML.mockReturnValue('<html></html>')
      pdfGenerator.generatePdf.mockResolvedValue('dummyBuffer')
      createInvoiceSpy.mockResolvedValue('dummyInvoiceRecord')

      await pdfInvoice.createAndOutputPdfInvoice(request, response, next)

      // expect(pdfGenerator.renderInvoiceHTML).toHaveBeenCalledWith(renderHtmlInput, undefined, undefined)
      expect(response.status).toHaveBeenCalledWith(200)
      expect(response.send).toHaveBeenCalledWith('dummyBuffer')
    })
    test('準正常: 入力データが存在しない', async () => {
      request.body = {}

      await pdfInvoice.createAndOutputPdfInvoice(request, response, next)

      expect(next).toHaveBeenCalledWith(errorHelper.create(400))
    })
    test('準正常: 入力された明細データが不正', async () => {
      request.params.invoiceId = 'dummyID'
      request.body = { invoice: '{}', lines: '{}' }

      await pdfInvoice.createAndOutputPdfInvoice(request, response, next)

      expect(next).toHaveBeenCalledWith(errorHelper.create(400))
    })
    test('準正常: ユーザ情報取得APIエラー', async () => {
      request.params.invoiceId = 'dummyID'
      request.body = { invoice: '{}', lines: '[]' }
      accessTradeshift.mockReturnValue(new Error('API Error')) // APIエラーを想定

      await pdfInvoice.createAndOutputPdfInvoice(request, response, next)

      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
    })
    test('準正常: HTML生成失敗', async () => {
      request.body = { invoice: '{"billingDate":null,"paymentDate":null,"deliveryDate":null}', lines: '[]' }
      accessTradeshift.mockReturnValue(accountInfoTestData.noLogo) // ユーザ情報正常取得を想定する
      pdfGenerator.renderInvoiceHTML.mockReturnValue(null)

      await pdfInvoice.createAndOutputPdfInvoice(request, response, next)

      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
    })
    test('準正常: PDF生成失敗', async () => {
      request.body = { invoice: '{"billingDate":null,"paymentDate":null,"deliveryDate":null}', lines: '[]' }
      accessTradeshift.mockReturnValue(accountInfoTestData.noLogo) // ユーザ情報正常取得を想定する
      pdfGenerator.renderInvoiceHTML.mockReturnValue('<html></html>')
      pdfGenerator.generatePdf.mockImplementation(() => {
        throw new Error('pdf generate failed')
      })

      await pdfInvoice.createAndOutputPdfInvoice(request, response, next)

      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
    })
    test('準正常: PDF請求書作成時 DBエラー', async () => {
      request.body = { invoice: '{"billingDate":null,"paymentDate":null,"deliveryDate":null}', lines: '[]' }
      accessTradeshift.mockReturnValue(accountInfoTestData.noLogo) // ユーザ情報正常取得を想定する
      pdfGenerator.renderInvoiceHTML.mockReturnValue('<html></html>')
      pdfGenerator.generatePdf.mockResolvedValue('dummyBuffer')
      createInvoiceSpy.mockImplementation(() => {
        throw new Error('DB Error')
      })

      await pdfInvoice.createAndOutputPdfInvoice(request, response, next)

      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
    })
  })

  describe('コールバック:updateAndOutputPdfInvoice', () => {
    test('正常', async () => {
      request.params.invoiceId = 'dummyID'
      request.body = { invoice: '{"billingDate":null,"paymentDate":null,"deliveryDate":null}', lines: '[]' }
      pdfInvoiceControllerfindInvoiceSpy.mockResolvedValue(pdfInvoiceTestData.hasPdfSealImp)
      accessTradeshift.mockReturnValue(accountInfoTestData.noLogo)
      pdfGenerator.renderInvoiceHTML.mockReturnValue('<html></html>')
      pdfGenerator.generatePdf.mockResolvedValue('dummyBuffer')
      updateInvoiceSpy.mockReturnValue('dummyInvoiceRecord')

      await pdfInvoice.updateAndOutputPdfInvoice(request, response, next)

      expect(response.status).toHaveBeenCalledWith(200)
      expect(response.send).toHaveBeenCalledWith('dummyBuffer')
    })
    test('準正常: 請求書IDなしの不正リクエスト', async () => {
      request.params.invoiceId = undefined

      await pdfInvoice.updateAndOutputPdfInvoice(request, response, next)

      expect(next).toHaveBeenCalledWith(errorHelper.create(400))
    })
    test('準正常: 入力データが存在しない', async () => {
      request.body = {}

      await pdfInvoice.updateAndOutputPdfInvoice(request, response, next)

      expect(next).toHaveBeenCalledWith(errorHelper.create(400))
    })
    test('準正常: 入力された明細データが不正', async () => {
      request.params.invoiceId = 'dummyID'
      request.body = { invoice: '{}', lines: '{}' }

      await pdfInvoice.updateAndOutputPdfInvoice(request, response, next)

      expect(next).toHaveBeenCalledWith(errorHelper.create(400))
    })
    test('準正常: PDF請求書情報取得時、DBエラー', async () => {
      request.params.invoiceId = 'dummyID'
      request.body = { invoice: '{}', lines: '[]' }
      pdfInvoiceControllerfindInvoiceSpy.mockImplementation(() => {
        throw new Error('DB Error')
      })

      await pdfInvoice.updateAndOutputPdfInvoice(request, response, next)

      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
    })
    test('準正常: ユーザ情報取得APIエラー', async () => {
      request.params.invoiceId = 'dummyID'
      request.body = { invoice: '{}', lines: '[]' }
      pdfInvoiceControllerfindInvoiceSpy.mockResolvedValue(pdfInvoiceTestData.noSealImp)
      accessTradeshift.mockReturnValue(new Error('API Error'))

      await pdfInvoice.updateAndOutputPdfInvoice(request, response, next)

      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
    })
    test('準正常: HTML生成失敗', async () => {
      request.params.invoiceId = 'dummyID'
      request.body = { invoice: '{"billingDate":null,"paymentDate":null,"deliveryDate":null}', lines: '[]' }
      pdfInvoiceControllerfindInvoiceSpy.mockResolvedValue(pdfInvoiceTestData.hasPdfSealImp)
      accessTradeshift.mockReturnValue(accountInfoTestData.noLogo)
      pdfGenerator.renderInvoiceHTML.mockReturnValue(null)

      await pdfInvoice.updateAndOutputPdfInvoice(request, response, next)

      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
    })
    test('準正常: PDF生成失敗', async () => {
      request.params.invoiceId = 'dummyID'
      request.body = { invoice: '{"billingDate":null,"paymentDate":null,"deliveryDate":null}', lines: '[]' }
      pdfInvoiceControllerfindInvoiceSpy.mockResolvedValue(pdfInvoiceTestData.hasPdfSealImp)
      accessTradeshift.mockReturnValue(accountInfoTestData.noLogo)
      pdfGenerator.renderInvoiceHTML.mockReturnValue('<html></html>')
      pdfGenerator.generatePdf.mockImplementation(() => {
        throw new Error('pdf generate failed')
      })

      await pdfInvoice.updateAndOutputPdfInvoice(request, response, next)

      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
    })
    test('準正常: PDF請求書更新時 DBエラー', async () => {
      request.params.invoiceId = 'dummyID'
      request.body = { invoice: '{"billingDate":null,"paymentDate":null,"deliveryDate":null}', lines: '[]' }
      pdfInvoiceControllerfindInvoiceSpy.mockResolvedValue(pdfInvoiceTestData.hasPdfSealImp)
      accessTradeshift.mockReturnValue(accountInfoTestData.noLogo)
      pdfGenerator.renderInvoiceHTML.mockReturnValue('<html></html>')
      pdfGenerator.generatePdf.mockResolvedValue('dummyBuffer')
      updateInvoiceSpy.mockImplementation(() => {
        throw new Error('DB Error')
      })

      await pdfInvoice.updateAndOutputPdfInvoice(request, response, next)

      expect(next).toHaveBeenCalledWith(errorHelper.create(500))
    })
  })
})
