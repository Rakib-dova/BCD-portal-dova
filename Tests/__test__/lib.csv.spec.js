'use strict'
const csv = require('../../Application/lib/csv')

describe('lib/csv のテスト', () => {
  describe('convertCsvStringToMultiArray ()', () => {
    test('正常: 成功', async () => {
      const result = await csv.convertCsvStringToMultiArray('a,b,c\r\n\r\nd,e,f')

      expect(result).toEqual([
        ['a', 'b', 'c'],
        ['d', 'e', 'f']
      ])
    })
    test('正常: 文字列以外', async () => {
      const result = await csv.convertCsvStringToMultiArray(['a,b,c\r\nd,e,f'])

      expect(result).toBeNull()
    })
  })
  describe('convertToDataObject ()', () => {
    test('正常: modifierからの返却が文字列パターン＆nullパターン', () => {
      const row = [
        '',
        '160',
        '2022/8/10',
        '2022 /8/12',
        '2022 /8/14',
        'テスト企業',
        '100-0004',
        '東京都',
        'テスト住所',
        'テストビル',
        'テスト銀行',
        'テスト支店',
        '普通',
        '1234567',
        'テスト名義',
        'テスト備考',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '1',
        'テスト明細内容',
        '1',
        '個',
        '100',
        'その他の消費税',
        '',
        '999999999999',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        ''
      ]
      const result = csv.convertToDataObject(row, csv.invoiceHeaderArray, csv.pdfInvoiceMapper)
      expect(result).toEqual({
        accountName: 'テスト名義',
        accountNumber: '1234567',
        accountType: '普通',
        bankName: 'テスト銀行',
        billingDate: '2022 /8/12',
        branchName: 'テスト支店',
        deliveryDate: '2022 /8/14',
        'inv-discountAmount1': null,
        'inv-discountAmount2': null,
        'inv-discountAmount3': null,
        'inv-discountDescription1': null,
        'inv-discountDescription2': null,
        'inv-discountDescription3': null,
        'inv-discountUnit1': null,
        'inv-discountUnit2': null,
        'inv-discountUnit3': null,
        invoiceNo: '160',
        'line-discountAmount1': null,
        'line-discountAmount2': null,
        'line-discountAmount3': null,
        'line-discountDescription1': null,
        'line-discountDescription2': null,
        'line-discountDescription3': null,
        'line-discountUnit1': null,
        'line-discountUnit2': null,
        'line-discountUnit3': undefined,
        'line-taxAmount': '999999999999',
        'line-taxLabel': null,
        lineDescription: 'テスト明細内容',
        lineId: '1',
        note: 'テスト備考',
        paymentDate: '2022/8/10',
        quantity: '1',
        recAddr1: '東京都',
        recAddr2: 'テスト住所',
        recAddr3: 'テストビル',
        recCompany: 'テスト企業',
        recPost: '100-0004',
        sendRegistrationNo: '',
        taxType: 'その他の消費税',
        unit: '個',
        unitPrice: '100'
      })
    })
    test('正常: csvStringArrayが配列ではない', () => {
      const row = ''
      const result = csv.convertToDataObject(row, csv.invoiceHeaderArray, csv.pdfInvoiceMapper)
      expect(result).toBeNull()
    })
    test('正常: headerArrayが配列ではない', () => {
      const row = []
      const result = csv.convertToDataObject(row, '', csv.pdfInvoiceMapper)
      expect(result).toBeNull()
    })
    test('正常: pdfInvoiceMapperが配列ではない', () => {
      const row = []
      const result = csv.convertToDataObject(row, csv.invoiceHeaderArray, '')
      expect(result).toBeNull()
    })
  })
  describe('convertCsvDataArrayToPdfInvoiceModels  ()', () => {
    const csvArray = [
      {
        accountName: 'テスト名義',
        accountNumber: '1234567',
        accountType: '普通',
        bankName: 'テスト銀行',
        billingDate: '2022 /8/12',
        branchName: 'テスト支店',
        deliveryDate: '2022 /8/14',
        'inv-discountAmount1': null,
        'inv-discountAmount2': null,
        'inv-discountAmount3': null,
        'inv-discountDescription1': null,
        'inv-discountDescription2': null,
        'inv-discountDescription3': null,
        'inv-discountUnit1': null,
        'inv-discountUnit2': null,
        'inv-discountUnit3': null,
        invoiceNo: '160',
        'line-discountAmount1': null,
        'line-discountAmount2': null,
        'line-discountAmount3': null,
        'line-discountDescription1': null,
        'line-discountDescription2': null,
        'line-discountDescription3': null,
        'line-discountUnit1': null,
        'line-discountUnit2': null,
        'line-discountUnit3': undefined,
        'line-taxAmount': '999999999999',
        'line-taxLabel': null,
        lineDescription: 'テスト明細内容',
        lineId: '1',
        note: 'テスト備考',
        paymentDate: '2022/8/10',
        quantity: '1',
        recAddr1: '東京都',
        recAddr2: 'テスト住所',
        recAddr3: 'テストビル',
        recCompany: 'テスト企業',
        recPost: '100-0004',
        sendRegistrationNo: '',
        taxType: 'その他の消費税',
        unit: '個',
        unitPrice: '100'
      },
      {
        accountName: 'テスト名義',
        accountNumber: '1234567',
        accountType: '普通',
        bankName: 'テスト銀行',
        billingDate: '2022 /8/12',
        branchName: 'テスト支店',
        deliveryDate: '2022 /8/14',
        'inv-discountAmount1': null,
        'inv-discountAmount2': null,
        'inv-discountAmount3': null,
        'inv-discountDescription1': null,
        'inv-discountDescription2': null,
        'inv-discountDescription3': null,
        'inv-discountUnit1': null,
        'inv-discountUnit2': null,
        'inv-discountUnit3': null,
        invoiceNo: '160',
        'line-discountAmount1': null,
        'line-discountAmount2': null,
        'line-discountAmount3': null,
        'line-discountDescription1': null,
        'line-discountDescription2': null,
        'line-discountDescription3': null,
        'line-discountUnit1': null,
        'line-discountUnit2': null,
        'line-discountUnit3': undefined,
        'line-taxAmount': '99',
        'line-taxLabel': 'あああいいいううう',
        lineDescription: 'テスト明細内容',
        lineId: '1',
        note: 'テスト備考',
        paymentDate: '2022/8/10',
        quantity: '1',
        recAddr1: '東京都',
        recAddr2: 'テスト住所',
        recAddr3: 'テストビル',
        recCompany: 'テスト企業',
        recPost: '100-0004',
        sendRegistrationNo: '',
        taxType: 'その他の消費税',
        unit: '個',
        unitPrice: '100'
      },
      {
        accountName: 'テスト名義',
        accountNumber: '1234567',
        accountType: '普通',
        bankName: 'テスト銀行',
        billingDate: '2022 /8/12',
        branchName: 'テスト支店',
        deliveryDate: '2022 /8/14',
        'inv-discountAmount1': null,
        'inv-discountAmount2': null,
        'inv-discountAmount3': null,
        'inv-discountDescription1': null,
        'inv-discountDescription2': null,
        'inv-discountDescription3': null,
        'inv-discountUnit1': null,
        'inv-discountUnit2': null,
        'inv-discountUnit3': null,
        invoiceNo: '160',
        'line-discountAmount1': null,
        'line-discountAmount2': null,
        'line-discountAmount3': null,
        'line-discountDescription1': null,
        'line-discountDescription2': null,
        'line-discountDescription3': null,
        'line-discountUnit1': null,
        'line-discountUnit2': null,
        'line-discountUnit3': undefined,
        'line-taxAmount': '99',
        'line-taxLabel': 'あああいいいううう',
        lineDescription: 'テスト明細内容',
        lineId: '1',
        note: 'テスト備考',
        paymentDate: '2022/8/10',
        quantity: '1',
        recAddr1: '東京都',
        recAddr2: 'テスト住所',
        recAddr3: 'テストビル',
        recCompany: 'テスト企業',
        recPost: '100-0004',
        sendRegistrationNo: '',
        taxType: '消費税',
        unit: '個',
        unitPrice: '100'
      }
    ]
    test('正常: 変換成功', () => {
      const senderInfo = {
        sendCompany: 'A',
        sendPost: 'B',
        sendAddr1: 'C',
        sendAddr2: 'D',
        sendAddr3: 'E'
      }
      const tenantId = 'tenant001'
      const result = csv.convertCsvDataArrayToPdfInvoiceModels(csvArray, senderInfo, tenantId)
      // console.log('result:', result)
      // 内部で動的に振られるinvoiceIdはチェックからはずす
      for (let i = 0; i < result.pdfInvoices.length; i++) {
        delete result.pdfInvoices[i].invoiceId
      }
      // 内部で動的に振られるinvoiceIdはチェックからはずす
      for (let i = 0; i < result.pdfInvoiceLines.length; i++) {
        delete result.pdfInvoiceLines[i].invoiceId
      }

      expect(result).toEqual({
        pdfInvoices: [
          {
            sendTenantId: 'tenant001',
            invoiceNo: '160',
            billingDate: new Date('2022-08-11T15:00:00.000Z'),
            paymentDate: new Date('2022-08-09T15:00:00.000Z'),
            deliveryDate: new Date('2022-08-13T15:00:00.000Z'),
            currency: 'JPY',
            recCompany: 'テスト企業',
            recPost: '100-0004',
            recAddr1: '東京都',
            recAddr2: 'テスト住所',
            recAddr3: 'テストビル',
            sendCompany: 'A',
            sendPost: 'B',
            sendAddr1: 'C',
            sendAddr2: 'D',
            sendAddr3: 'E',
            sendRegistrationNo: '',
            bankName: 'テスト銀行',
            branchName: 'テスト支店',
            accountType: '普通',
            accountName: 'テスト名義',
            accountNumber: '1234567',
            note: 'テスト備考',
            discounts: 0,
            discountDescription1: null,
            discountAmount1: null,
            discountUnit1: null,
            discountDescription2: null,
            discountAmount2: null,
            discountUnit2: null,
            discountDescription3: null,
            discountAmount3: null,
            discountUnit3: null
          }
        ],
        pdfInvoiceLines: [
          {
            lineIndex: 0,
            lineId: '1',
            lineDescription: 'テスト明細内容',
            unit: '個',
            unitPrice: '100',
            quantity: '1',
            taxType: 'その他の消費税',
            taxLabel: null,
            taxAmount: '999999999999',
            discounts: 0,
            discountDescription1: null,
            discountAmount1: null,
            discountUnit1: null,
            discountDescription2: null,
            discountAmount2: null,
            discountUnit2: null,
            discountDescription3: null,
            discountAmount3: null,
            discountUnit3: undefined,
            invoiceNo: '160'
          },
          {
            lineIndex: 1,
            lineId: '1',
            lineDescription: 'テスト明細内容',
            unit: '個',
            unitPrice: '100',
            quantity: '1',
            taxType: 'その他の消費税',
            taxLabel: 'あああいいいううう',
            taxAmount: '99',
            discounts: 0,
            discountDescription1: null,
            discountAmount1: null,
            discountUnit1: null,
            discountDescription2: null,
            discountAmount2: null,
            discountUnit2: null,
            discountDescription3: null,
            discountAmount3: null,
            discountUnit3: undefined,
            invoiceNo: '160'
          },
          {
            lineIndex: 2,
            lineId: '1',
            lineDescription: 'テスト明細内容',
            unit: '個',
            unitPrice: '100',
            quantity: '1',
            taxType: '消費税',
            taxLabel: null,
            taxAmount: null,
            discounts: 0,
            discountDescription1: null,
            discountAmount1: null,
            discountUnit1: null,
            discountDescription2: null,
            discountAmount2: null,
            discountUnit2: null,
            discountDescription3: null,
            discountAmount3: null,
            discountUnit3: undefined,
            invoiceNo: '160'
          }
        ]
      })
    })
    test('正常: csvArrayの内容が文字列', () => {
      const senderInfo = {
        sendCompany: 'A',
        sendPost: 'B',
        sendAddr1: 'C',
        sendAddr2: 'D',
        sendAddr3: 'E'
      }
      const tenantId = 'tenant001'
      const result = csv.convertCsvDataArrayToPdfInvoiceModels([''], senderInfo, tenantId)
      expect(result).toEqual({
        pdfInvoices: null,
        pdfInvoiceLines: null
      })
    })
  })
  describe('getDiscountLength  ()', () => {
    test('正常: invoiceカウントあり', () => {
      const row = {
        'inv-discountDescription1': '1',
        'inv-discountAmount1': '2',
        'inv-discountUnit1': '3',
        'inv-discountDescription2': '4',
        'inv-discountAmount2': '5',
        'inv-discountUnit2': '6',
        'inv-discountDescription3': '7',
        'inv-discountAmount3': '8',
        'inv-discountUnit3': '9',
        'line-discountDescription1': '10',
        'line-discountAmount1': '11',
        'line-discountUnit1': '12',
        'line-discountDescription2': '13',
        'line-discountAmount2': '14',
        'line-discountUnit2': '15',
        'line-discountDescription3': '16',
        'line-discountAmount3': '17',
        'line-discountUnit3': '18'
      }
      const count = csv.getDiscountLength(row, 'invoice')
      expect(count).toEqual(3)
    })
    test('正常: invoiceカウントなし', () => {
      const row = {
        'inv-discountDescription1': '',
        'inv-discountAmount1': '',
        'inv-discountUnit1': '',
        'inv-discountDescription2': '',
        'inv-discountAmount2': '',
        'inv-discountUnit2': '',
        'inv-discountDescription3': '',
        'inv-discountAmount3': '',
        'inv-discountUnit3': '',
        'line-discountDescription1': '',
        'line-discountAmount1': '',
        'line-discountUnit1': '',
        'line-discountDescription2': '',
        'line-discountAmount2': '',
        'line-discountUnit2': '',
        'line-discountDescription3': '',
        'line-discountAmount3': '',
        'line-discountUnit3': ''
      }
      const count = csv.getDiscountLength(row, 'invoice')
      expect(count).toEqual(0)
    })
    test('正常: lineカウントあり', () => {
      const row = {
        'inv-discountDescription1': '1',
        'inv-discountAmount1': '2',
        'inv-discountUnit1': '3',
        'inv-discountDescription2': '4',
        'inv-discountAmount2': '5',
        'inv-discountUnit2': '6',
        'inv-discountDescription3': '7',
        'inv-discountAmount3': '8',
        'inv-discountUnit3': '9',
        'line-discountDescription1': '10',
        'line-discountAmount1': '11',
        'line-discountUnit1': '12',
        'line-discountDescription2': '13',
        'line-discountAmount2': '14',
        'line-discountUnit2': '15',
        'line-discountDescription3': '16',
        'line-discountAmount3': '17',
        'line-discountUnit3': '18'
      }
      const count = csv.getDiscountLength(row, 'line')
      expect(count).toEqual(3)
    })
    test('正常: lineカウントなし', () => {
      const row = {
        'inv-discountDescription1': '',
        'inv-discountAmount1': '',
        'inv-discountUnit1': '',
        'inv-discountDescription2': '',
        'inv-discountAmount2': '',
        'inv-discountUnit2': '',
        'inv-discountDescription3': '',
        'inv-discountAmount3': '',
        'inv-discountUnit3': '',
        'line-discountDescription1': '',
        'line-discountAmount1': '',
        'line-discountUnit1': '',
        'line-discountDescription2': '',
        'line-discountAmount2': '',
        'line-discountUnit2': '',
        'line-discountDescription3': '',
        'line-discountAmount3': '',
        'line-discountUnit3': ''
      }
      const count = csv.getDiscountLength(row, 'line')
      expect(count).toEqual(0)
    })
  })
})
