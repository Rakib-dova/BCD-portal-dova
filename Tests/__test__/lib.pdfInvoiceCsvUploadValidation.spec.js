'use strict'
const pdfInvoiceCsvUploadValidation = require('../../Application/lib/pdfInvoiceCsvUploadValidation')
const tax = require('../../Application/lib/tax')
const pdfInvoiceController = require('../../Application/controllers/pdfInvoiceController')

const testInvoiceData = {
  valid: [
    {
      sendTenantId: '691ed36b-7c2d-4fb2-92f3-f40a5b3faa2a',
      invoiceId: '74b0b766-5aae-49f2-aa2d-d26ed8b9ac09',
      invoiceNo: 'I2022070101',
      billingDate: new Date('2022-07-01'),
      paymentDate: new Date('2022-07-01'),
      deliveryDate: new Date('2022-07-01'),
      currency: 'JPY',
      recCompany: 'テスト宛先企業',
      recPost: '100-0004',
      recAddr1: '東京都',
      recAddr2: '千代田区大手町１－２－３',
      recAddr3: 'テストビル１F',
      sendCompany: 'サプライヤー２ひろはし',
      sendPost: '100-0004',
      sendAddr1: '東京都',
      sendAddr2: '大手町',
      sendAddr3: '',
      sendRegistrationNo: 'T0123456789123',
      bankName: '',
      branchName: '',
      accountType: '',
      accountName: '',
      accountNumber: '',
      note: 'これは備考です。',
      discounts: 3,
      discountDescription1: 'Aセール',
      discountAmount1: '2',
      discountUnit1: 'percent',
      discountDescription2: 'Bセール',
      discountAmount2: '3',
      discountUnit2: 'percent',
      discountDescription3: 'Cセール',
      discountAmount3: '100',
      discountUnit3: 'jpy'
    }
  ],
  invalid: [
    {
      sendTenantId: '691ed36b-7c2d-4fb2-92f3-f40a5b3faa2a',
      invoiceId: '74b0b766-5aae-49f2-aa2d-d26ed8b9ac09',
      invoiceNo: 'I2022070101',
      billingDate: new Date('2022-07-01'),
      paymentDate: new Date('2022-07-01'),
      deliveryDate: new Date('2022-07-01'),
      currency: 'JPY',
      recCompany: '',
      recPost: '100-0004',
      recAddr1: '東京都',
      recAddr2: '千代田区大手町１－２－３',
      recAddr3: 'テストビル１F',
      sendCompany: 'サプライヤー２ひろはし',
      sendPost: '100-0004',
      sendAddr1: '東京都',
      sendAddr2: '大手町',
      sendAddr3: '',
      sendRegistrationNo: 'T0123456789123',
      bankName: '',
      branchName: '',
      accountType: '',
      accountName: '',
      accountNumber: '',
      note: 'これは備考です。',
      discounts: 3,
      discountDescription1: 'Aセール',
      discountAmount1: '2',
      discountUnit1: 'percent',
      discountDescription2: 'Bセール',
      discountAmount2: '3',
      discountUnit2: 'percent',
      discountDescription3: 'Cセール',
      discountAmount3: '100',
      discountUnit3: 'jpy'
    }
  ],
  duplication: [
    {
      sendTenantId: '691ed36b-7c2d-4fb2-92f3-f40a5b3faa2a',
      invoiceId: '74b0b766-5aae-49f2-aa2d-d26ed8b9ac09',
      invoiceNo: 'I2022070101',
      billingDate: new Date('2022-07-01'),
      paymentDate: new Date('2022-07-01'),
      deliveryDate: new Date('2022-07-01'),
      currency: 'JPY',
      recCompany: 'テスト宛先企業',
      recPost: '100-0004',
      recAddr1: '東京都',
      recAddr2: '千代田区大手町１－２－３',
      recAddr3: 'テストビル１F',
      sendCompany: 'サプライヤー２ひろはし',
      sendPost: '100-0004',
      sendAddr1: '東京都',
      sendAddr2: '大手町',
      sendAddr3: '',
      sendRegistrationNo: 'T0123456789123',
      bankName: '',
      branchName: '',
      accountType: '',
      accountName: '',
      accountNumber: '',
      note: 'これは備考です。',
      discounts: 3,
      discountDescription1: 'Aセール',
      discountAmount1: '2',
      discountUnit1: 'percent',
      discountDescription2: 'Bセール',
      discountAmount2: '3',
      discountUnit2: 'percent',
      discountDescription3: 'Cセール',
      discountAmount3: '100',
      discountUnit3: 'jpy'
    },
    {
      sendTenantId: '691ed36b-7c2d-4fb2-92f3-f40a5b3faa2a',
      invoiceId: '74b0b766-5aae-49f2-aa2d-d26ed8b9ac09',
      invoiceNo: 'I2022070101',
      billingDate: new Date('2022-07-01'),
      paymentDate: new Date('2022-07-01'),
      deliveryDate: new Date('2022-07-01'),
      currency: 'JPY',
      recCompany: 'テスト宛先企業',
      recPost: '100-0004',
      recAddr1: '東京都',
      recAddr2: '千代田区大手町１－２－３',
      recAddr3: 'テストビル１F',
      sendCompany: 'サプライヤー２ひろはし',
      sendPost: '100-0004',
      sendAddr1: '東京都',
      sendAddr2: '大手町',
      sendAddr3: '',
      sendRegistrationNo: 'T0123456789123',
      bankName: '',
      branchName: '',
      accountType: '',
      accountName: '',
      accountNumber: '',
      note: 'これは備考です。',
      discounts: 3,
      discountDescription1: 'Aセール',
      discountAmount1: '2',
      discountUnit1: 'percent',
      discountDescription2: 'Bセール',
      discountAmount2: '3',
      discountUnit2: 'percent',
      discountDescription3: 'Cセール',
      discountAmount3: '100',
      discountUnit3: 'jpy'
    }
  ],
  succFailSkip: [
    {
      sendTenantId: '691ed36b-7c2d-4fb2-92f3-f40a5b3faa2a',
      invoiceId: '74b0b766-5aae-49f2-aa2d-d26ed8b9ac01',
      invoiceNo: 'I2022070101',
      billingDate: new Date('2022-07-01'),
      paymentDate: new Date('2022-07-01'),
      deliveryDate: new Date('2022-07-01'),
      currency: 'JPY',
      recCompany: 'テスト宛先企業',
      recPost: '100-0004',
      recAddr1: '東京都',
      recAddr2: '千代田区大手町１－２－３',
      recAddr3: 'テストビル１F',
      sendCompany: 'サプライヤー２ひろはし',
      sendPost: '100-0004',
      sendAddr1: '東京都',
      sendAddr2: '大手町',
      sendAddr3: '',
      sendRegistrationNo: 'T0123456789123',
      bankName: '',
      branchName: '',
      accountType: '',
      accountName: '',
      accountNumber: '',
      note: 'これは備考です。',
      discounts: 3,
      discountDescription1: 'Aセール',
      discountAmount1: '2',
      discountUnit1: 'percent',
      discountDescription2: 'Bセール',
      discountAmount2: '3',
      discountUnit2: 'percent',
      discountDescription3: 'Cセール',
      discountAmount3: '100',
      discountUnit3: 'jpy'
    },
    {
      sendTenantId: '691ed36b-7c2d-4fb2-92f3-f40a5b3faa2a',
      invoiceId: '74b0b766-5aae-49f2-aa2d-d26ed8b9ac02',
      invoiceNo: 'I2022070102',
      billingDate: new Date('2022-07-01'),
      paymentDate: new Date('2022-07-01'),
      deliveryDate: new Date('2022-07-01'),
      currency: 'JPY',
      recCompany: '',
      recPost: '100-0004',
      recAddr1: '東京都',
      recAddr2: '千代田区大手町１－２－３',
      recAddr3: 'テストビル１F',
      sendCompany: 'サプライヤー２ひろはし',
      sendPost: '100-0004',
      sendAddr1: '東京都',
      sendAddr2: '大手町',
      sendAddr3: '',
      sendRegistrationNo: 'T0123456789123',
      bankName: '',
      branchName: '',
      accountType: '',
      accountName: '',
      accountNumber: '',
      note: 'これは備考です。',
      discounts: 3,
      discountDescription1: 'Aセール',
      discountAmount1: '2',
      discountUnit1: 'percent',
      discountDescription2: 'Bセール',
      discountAmount2: '3',
      discountUnit2: 'percent',
      discountDescription3: 'Cセール',
      discountAmount3: '100',
      discountUnit3: 'jpy'
    },
    {
      sendTenantId: '691ed36b-7c2d-4fb2-92f3-f40a5b3faa2a',
      invoiceId: '74b0b766-5aae-49f2-aa2d-d26ed8b9acxx',
      invoiceNo: 'I2022070101',
      billingDate: new Date('2022-07-01'),
      paymentDate: new Date('2022-07-01'),
      deliveryDate: new Date('2022-07-01'),
      currency: 'JPY',
      recCompany: 'テスト宛先企業',
      recPost: '100-0004',
      recAddr1: '東京都',
      recAddr2: '千代田区大手町１－２－３',
      recAddr3: 'テストビル１F',
      sendCompany: 'サプライヤー２ひろはし',
      sendPost: '100-0004',
      sendAddr1: '東京都',
      sendAddr2: '大手町',
      sendAddr3: '',
      sendRegistrationNo: 'T0123456789121',
      bankName: '',
      branchName: '',
      accountType: '',
      accountName: '',
      accountNumber: '',
      note: 'これは備考です。',
      discounts: 3,
      discountDescription1: 'Aセール',
      discountAmount1: '2',
      discountUnit1: 'percent',
      discountDescription2: 'Bセール',
      discountAmount2: '3',
      discountUnit2: 'percent',
      discountDescription3: 'Cセール',
      discountAmount3: '100',
      discountUnit3: 'jpy'
    }
  ],
  succFail: [
    {
      sendTenantId: '691ed36b-7c2d-4fb2-92f3-f40a5b3faa2a',
      invoiceId: '74b0b766-5aae-49f2-aa2d-d26ed8b9ac01',
      invoiceNo: 'I2022070101',
      billingDate: new Date('2022-07-01'),
      paymentDate: new Date('2022-07-01'),
      deliveryDate: new Date('2022-07-01'),
      currency: 'JPY',
      recCompany: 'テスト宛先企業',
      recPost: '100-0004',
      recAddr1: '東京都',
      recAddr2: '千代田区大手町１－２－３',
      recAddr3: 'テストビル１F',
      sendCompany: 'サプライヤー２ひろはし',
      sendPost: '100-0004',
      sendAddr1: '東京都',
      sendAddr2: '大手町',
      sendAddr3: '',
      sendRegistrationNo: 'T0123456789123',
      bankName: '',
      branchName: '',
      accountType: '',
      accountName: '',
      accountNumber: '',
      note: 'これは備考です。',
      discounts: 3,
      discountDescription1: 'Aセール',
      discountAmount1: '2',
      discountUnit1: 'percent',
      discountDescription2: 'Bセール',
      discountAmount2: '3',
      discountUnit2: 'percent',
      discountDescription3: 'Cセール',
      discountAmount3: '100',
      discountUnit3: 'jpy'
    },
    {
      sendTenantId: '691ed36b-7c2d-4fb2-92f3-f40a5b3faa2a',
      invoiceId: '74b0b766-5aae-49f2-aa2d-d26ed8b9ac02',
      invoiceNo: 'I2022070102',
      billingDate: new Date('2022-07-01'),
      paymentDate: new Date('2022-07-01'),
      deliveryDate: new Date('2022-07-01'),
      currency: 'JPY',
      recCompany: '',
      recPost: '100-0004',
      recAddr1: '東京都',
      recAddr2: '千代田区大手町１－２－３',
      recAddr3: 'テストビル１F',
      sendCompany: 'サプライヤー２ひろはし',
      sendPost: '100-0004',
      sendAddr1: '東京都',
      sendAddr2: '大手町',
      sendAddr3: '',
      sendRegistrationNo: 'T0123456789123',
      bankName: '',
      branchName: '',
      accountType: '',
      accountName: '',
      accountNumber: '',
      note: 'これは備考です。',
      discounts: 3,
      discountDescription1: 'Aセール',
      discountAmount1: '2',
      discountUnit1: 'percent',
      discountDescription2: 'Bセール',
      discountAmount2: '3',
      discountUnit2: 'percent',
      discountDescription3: 'Cセール',
      discountAmount3: '100',
      discountUnit3: 'jpy'
    }
  ],
  succSkip: [
    {
      sendTenantId: '691ed36b-7c2d-4fb2-92f3-f40a5b3faa2a',
      invoiceId: '74b0b766-5aae-49f2-aa2d-d26ed8b9ac01',
      invoiceNo: 'I2022070101',
      billingDate: new Date('2022-07-01'),
      paymentDate: new Date('2022-07-01'),
      deliveryDate: new Date('2022-07-01'),
      currency: 'JPY',
      recCompany: 'テスト宛先企業',
      recPost: '100-0004',
      recAddr1: '東京都',
      recAddr2: '千代田区大手町１－２－３',
      recAddr3: 'テストビル１F',
      sendCompany: 'サプライヤー２ひろはし',
      sendPost: '100-0004',
      sendAddr1: '東京都',
      sendAddr2: '大手町',
      sendAddr3: '',
      sendRegistrationNo: 'T0123456789123',
      bankName: '',
      branchName: '',
      accountType: '',
      accountName: '',
      accountNumber: '',
      note: 'これは備考です。',
      discounts: 3,
      discountDescription1: 'Aセール',
      discountAmount1: '2',
      discountUnit1: 'percent',
      discountDescription2: 'Bセール',
      discountAmount2: '3',
      discountUnit2: 'percent',
      discountDescription3: 'Cセール',
      discountAmount3: '100',
      discountUnit3: 'jpy'
    },
    {
      sendTenantId: '691ed36b-7c2d-4fb2-92f3-f40a5b3faa2a',
      invoiceId: '74b0b766-5aae-49f2-aa2d-d26ed8b9acxx',
      invoiceNo: 'I2022070101',
      billingDate: new Date('2022-07-01'),
      paymentDate: new Date('2022-07-01'),
      deliveryDate: new Date('2022-07-01'),
      currency: 'JPY',
      recCompany: 'テスト宛先企業',
      recPost: '100-0004',
      recAddr1: '東京都',
      recAddr2: '千代田区大手町１－２－３',
      recAddr3: 'テストビル１F',
      sendCompany: 'サプライヤー２ひろはし',
      sendPost: '100-0004',
      sendAddr1: '東京都',
      sendAddr2: '大手町',
      sendAddr3: '',
      sendRegistrationNo: 'T0123456789121',
      bankName: '',
      branchName: '',
      accountType: '',
      accountName: '',
      accountNumber: '',
      note: 'これは備考です。',
      discounts: 3,
      discountDescription1: 'Aセール',
      discountAmount1: '2',
      discountUnit1: 'percent',
      discountDescription2: 'Bセール',
      discountAmount2: '3',
      discountUnit2: 'percent',
      discountDescription3: 'Cセール',
      discountAmount3: '100',
      discountUnit3: 'jpy'
    }
  ],
  failSkip: [
    {
      sendTenantId: '691ed36b-7c2d-4fb2-92f3-f40a5b3faa2a',
      invoiceId: '74b0b766-5aae-49f2-aa2d-d26ed8b9ac02',
      invoiceNo: 'I2022070102',
      billingDate: new Date('2022-07-01'),
      paymentDate: new Date('2022-07-01'),
      deliveryDate: new Date('2022-07-01'),
      currency: 'JPY',
      recCompany: '',
      recPost: '100-0004',
      recAddr1: '東京都',
      recAddr2: '千代田区大手町１－２－３',
      recAddr3: 'テストビル１F',
      sendCompany: 'サプライヤー２ひろはし',
      sendPost: '100-0004',
      sendAddr1: '東京都',
      sendAddr2: '大手町',
      sendAddr3: '',
      sendRegistrationNo: 'T0123456789123',
      bankName: '',
      branchName: '',
      accountType: '',
      accountName: '',
      accountNumber: '',
      note: 'これは備考です。',
      discounts: 3,
      discountDescription1: 'Aセール',
      discountAmount1: '2',
      discountUnit1: 'percent',
      discountDescription2: 'Bセール',
      discountAmount2: '3',
      discountUnit2: 'percent',
      discountDescription3: 'Cセール',
      discountAmount3: '100',
      discountUnit3: 'jpy'
    },
    {
      sendTenantId: '691ed36b-7c2d-4fb2-92f3-f40a5b3faa2a',
      invoiceId: '74b0b766-5aae-49f2-aa2d-d26ed8b9acxx',
      invoiceNo: 'I2022070101',
      billingDate: new Date('2022-07-01'),
      paymentDate: new Date('2022-07-01'),
      deliveryDate: new Date('2022-07-01'),
      currency: 'JPY',
      recCompany: 'テスト宛先企業',
      recPost: '100-0004',
      recAddr1: '東京都',
      recAddr2: '千代田区大手町１－２－３',
      recAddr3: 'テストビル１F',
      sendCompany: 'サプライヤー２ひろはし',
      sendPost: '100-0004',
      sendAddr1: '東京都',
      sendAddr2: '大手町',
      sendAddr3: '',
      sendRegistrationNo: 'T0123456789121',
      bankName: '',
      branchName: '',
      accountType: '',
      accountName: '',
      accountNumber: '',
      note: 'これは備考です。',
      discounts: 3,
      discountDescription1: 'Aセール',
      discountAmount1: '2',
      discountUnit1: 'percent',
      discountDescription2: 'Bセール',
      discountAmount2: '3',
      discountUnit2: 'percent',
      discountDescription3: 'Cセール',
      discountAmount3: '100',
      discountUnit3: 'jpy'
    }
  ]
}

const testLineData = {
  valid: [
    {
      invoiceId: '74b0b766-5aae-49f2-aa2d-d26ed8b9ac09',
      lineIndex: 0,
      lineId: '1',
      lineDescription: 'しな１',
      unit: 'kg',
      unitPrice: '3000',
      quantity: '10',
      taxType: '消費税',
      discounts: 3,
      discountDescription1: 'ワゴンA',
      discountAmount1: '2',
      discountUnit1: 'percent',
      discountDescription2: 'ワゴンB',
      discountAmount2: '3',
      discountUnit2: 'percent',
      discountDescription3: 'ワゴンC',
      discountAmount3: '100',
      discountUnit3: 'jpy',
      invoiceNo: 'I2022070101'
    }
  ],
  invalid: [
    {
      invoiceId: '74b0b766-5aae-49f2-aa2d-d26ed8b9ac09',
      lineIndex: 0,
      lineId: '1',
      lineDescription: '',
      unit: 'kg',
      unitPrice: '3000',
      quantity: '10',
      taxType: '消費税',
      discounts: 3,
      discountDescription1: 'ワゴンA',
      discountAmount1: '2',
      discountUnit1: 'percent',
      discountDescription2: 'ワゴンB',
      discountAmount2: '3',
      discountUnit2: 'percent',
      discountDescription3: 'ワゴンC',
      discountAmount3: '100',
      discountUnit3: 'jpy',
      invoiceNo: 'I2022070101'
    }
  ],
  succFailSkip: [
    {
      invoiceId: '74b0b766-5aae-49f2-aa2d-d26ed8b9ac01',
      lineIndex: 0,
      lineId: '1',
      lineDescription: 'しな１',
      unit: 'kg',
      unitPrice: '3000',
      quantity: '10',
      taxType: '消費税',
      discounts: 3,
      discountDescription1: 'ワゴンA',
      discountAmount1: '2',
      discountUnit1: 'percent',
      discountDescription2: 'ワゴンB',
      discountAmount2: '3',
      discountUnit2: 'percent',
      discountDescription3: 'ワゴンC',
      discountAmount3: '100',
      discountUnit3: 'jpy',
      invoiceNo: 'I2022070101'
    },
    {
      invoiceId: '74b0b766-5aae-49f2-aa2d-d26ed8b9ac02',
      lineIndex: 1,
      lineId: '1',
      lineDescription: '',
      unit: 'kg',
      unitPrice: '3000',
      quantity: '10',
      taxType: '消費税',
      discounts: 3,
      discountDescription1: 'ワゴンA',
      discountAmount1: '2',
      discountUnit1: 'percent',
      discountDescription2: 'ワゴンB',
      discountAmount2: '3',
      discountUnit2: 'percent',
      discountDescription3: 'ワゴンC',
      discountAmount3: '100',
      discountUnit3: 'jpy',
      invoiceNo: 'I2022070102'
    },
    {
      invoiceId: '74b0b766-5aae-49f2-aa2d-d26ed8b9acxx',
      lineIndex: 2,
      lineId: '1',
      lineDescription: 'しな１',
      unit: 'kg',
      unitPrice: '3000',
      quantity: '10',
      taxType: '消費税',
      discounts: 3,
      discountDescription1: 'ワゴンA',
      discountAmount1: '2',
      discountUnit1: 'percent',
      discountDescription2: 'ワゴンB',
      discountAmount2: '3',
      discountUnit2: 'percent',
      discountDescription3: 'ワゴンC',
      discountAmount3: '100',
      discountUnit3: 'jpy',
      invoiceNo: 'I2022070101'
    }
  ],
  succFail: [
    {
      invoiceId: '74b0b766-5aae-49f2-aa2d-d26ed8b9ac01',
      lineIndex: 0,
      lineId: '1',
      lineDescription: 'しな１',
      unit: 'kg',
      unitPrice: '3000',
      quantity: '10',
      taxType: '消費税',
      discounts: 3,
      discountDescription1: 'ワゴンA',
      discountAmount1: '2',
      discountUnit1: 'percent',
      discountDescription2: 'ワゴンB',
      discountAmount2: '3',
      discountUnit2: 'percent',
      discountDescription3: 'ワゴンC',
      discountAmount3: '100',
      discountUnit3: 'jpy',
      invoiceNo: 'I2022070101'
    },
    {
      invoiceId: '74b0b766-5aae-49f2-aa2d-d26ed8b9ac02',
      lineIndex: 1,
      lineId: '1',
      lineDescription: '',
      unit: 'kg',
      unitPrice: '3000',
      quantity: '10',
      taxType: '消費税',
      discounts: 3,
      discountDescription1: 'ワゴンA',
      discountAmount1: '2',
      discountUnit1: 'percent',
      discountDescription2: 'ワゴンB',
      discountAmount2: '3',
      discountUnit2: 'percent',
      discountDescription3: 'ワゴンC',
      discountAmount3: '100',
      discountUnit3: 'jpy',
      invoiceNo: 'I2022070102'
    }
  ],
  succSkip: [
    {
      invoiceId: '74b0b766-5aae-49f2-aa2d-d26ed8b9ac01',
      lineIndex: 0,
      lineId: '1',
      lineDescription: 'しな１',
      unit: 'kg',
      unitPrice: '3000',
      quantity: '10',
      taxType: '消費税',
      discounts: 3,
      discountDescription1: 'ワゴンA',
      discountAmount1: '2',
      discountUnit1: 'percent',
      discountDescription2: 'ワゴンB',
      discountAmount2: '3',
      discountUnit2: 'percent',
      discountDescription3: 'ワゴンC',
      discountAmount3: '100',
      discountUnit3: 'jpy',
      invoiceNo: 'I2022070101'
    },
    {
      invoiceId: '74b0b766-5aae-49f2-aa2d-d26ed8b9acxx',
      lineIndex: 1,
      lineId: '1',
      lineDescription: 'しな１',
      unit: 'kg',
      unitPrice: '3000',
      quantity: '10',
      taxType: '消費税',
      discounts: 3,
      discountDescription1: 'ワゴンA',
      discountAmount1: '2',
      discountUnit1: 'percent',
      discountDescription2: 'ワゴンB',
      discountAmount2: '3',
      discountUnit2: 'percent',
      discountDescription3: 'ワゴンC',
      discountAmount3: '100',
      discountUnit3: 'jpy',
      invoiceNo: 'I2022070101'
    }
  ],
  failSkip: [
    {
      invoiceId: '74b0b766-5aae-49f2-aa2d-d26ed8b9ac02',
      lineIndex: 0,
      lineId: '1',
      lineDescription: '',
      unit: 'kg',
      unitPrice: '3000',
      quantity: '10',
      taxType: '消費税',
      discounts: 3,
      discountDescription1: 'ワゴンA',
      discountAmount1: '2',
      discountUnit1: 'percent',
      discountDescription2: 'ワゴンB',
      discountAmount2: '3',
      discountUnit2: 'percent',
      discountDescription3: 'ワゴンC',
      discountAmount3: '100',
      discountUnit3: 'jpy',
      invoiceNo: 'I2022070102'
    },
    {
      invoiceId: '74b0b766-5aae-49f2-aa2d-d26ed8b9acxx',
      lineIndex: 1,
      lineId: '1',
      lineDescription: 'しな１',
      unit: 'kg',
      unitPrice: '3000',
      quantity: '10',
      taxType: '消費税',
      discounts: 3,
      discountDescription1: 'ワゴンA',
      discountAmount1: '2',
      discountUnit1: 'percent',
      discountDescription2: 'ワゴンB',
      discountAmount2: '3',
      discountUnit2: 'percent',
      discountDescription3: 'ワゴンC',
      discountAmount3: '100',
      discountUnit3: 'jpy',
      invoiceNo: 'I2022070101'
    }
  ]
}

const defaultTenantId = 'dummyTenantId'
const defaultFileName = 'dummyCsvFile'

const copyTestData = (srcArray) => {
  const clone = JSON.parse(JSON.stringify(srcArray))

  clone.map((src) => {
    for (const key of Object.keys(src)) {
      if (key === 'billingDate' || key === 'paymentDate' || key === 'deliveryDate') {
        src[key] = new Date('2022-07-01')
      }
    }
    return src
  })

  return clone
}

const convertValidLineModel = (lines) => {
  const clone = copyTestData(lines)
  clone.forEach((line) => {
    line.taxType = tax.getTaxTypeByName(line.taxType)
    delete line.invoiceNo // 一時的に設けた不要なプロパティを削除
  })
  return clone
}

let findAllInvoicesSpy

describe('lib/pdfInvoiceCsvUploadValidation のテスト', () => {
  describe('validate()', () => {
    beforeEach(() => {
      findAllInvoicesSpy = jest.spyOn(pdfInvoiceController, 'findAllRawInvoices')
    })
    afterEach(() => {
      findAllInvoicesSpy.mockRestore()
    })

    test('正常: 全てのバリデーション成功', async () => {
      findAllInvoicesSpy.mockResolvedValue([])

      const { validInvoices, validLines, uploadHistory, csvRows } = await pdfInvoiceCsvUploadValidation.validate(
        copyTestData(testInvoiceData.valid),
        copyTestData(testLineData.valid),
        defaultTenantId,
        defaultFileName
      )

      expect(validInvoices).toEqual(testInvoiceData.valid)
      expect(validLines).toEqual(convertValidLineModel(testLineData.valid))
      expect(uploadHistory).toEqual({
        csvFileName: 'dummyCsvFile',
        failCount: 0,
        historyId: uploadHistory.historyId,
        invoiceCount: 1,
        skipCount: 0,
        successCount: 1,
        tenantId: 'dummyTenantId'
      })
      expect(csvRows).toEqual([
        {
          errorData: '',
          historyDetailId: csvRows[0].historyDetailId,
          historyId: csvRows[0].historyId,
          invoiceNo: 'I2022070101',
          lines: 1,
          status: 0
        }
      ])
    })
    test('正常: 明細数が20件でバリデーション成功', async () => {
      findAllInvoicesSpy.mockResolvedValue([])

      const lineOverData = []
      for (let i = 0; i < 20; i++) {
        const validData = copyTestData(testLineData.valid)[0]
        validData.lineIndex = i
        lineOverData.push(validData)
      }

      const { validInvoices, validLines, uploadHistory, csvRows } = await pdfInvoiceCsvUploadValidation.validate(
        copyTestData(testInvoiceData.valid),
        lineOverData,
        defaultTenantId,
        defaultFileName
      )

      expect(validInvoices).toEqual(testInvoiceData.valid)
      expect(validLines).toEqual(lineOverData)
      expect(uploadHistory).toEqual({
        csvFileName: 'dummyCsvFile',
        failCount: 0,
        historyId: uploadHistory.historyId,
        invoiceCount: 1,
        skipCount: 0,
        successCount: 20,
        tenantId: 'dummyTenantId'
      })
      for (let i = 0; i < 20; i++) {
        expect(csvRows[i]).toEqual({
          errorData: '',
          historyDetailId: csvRows[i].historyDetailId,
          historyId: csvRows[i].historyId,
          invoiceNo: 'I2022070101',
          lines: i + 1,
          status: 0
        })
      }
    })
    test('正常: 明細数が20より多いでバリデーション失敗', async () => {
      findAllInvoicesSpy.mockResolvedValue([])

      const lineOverData = []
      for (let i = 0; i < 21; i++) {
        const validData = copyTestData(testLineData.valid)[0]
        validData.lineIndex = i
        lineOverData.push(validData)
      }

      const { validInvoices, validLines, uploadHistory, csvRows } = await pdfInvoiceCsvUploadValidation.validate(
        copyTestData(testInvoiceData.valid),
        lineOverData,
        defaultTenantId,
        defaultFileName
      )

      expect(validInvoices).toEqual([])
      expect(validLines).toEqual([])
      expect(uploadHistory).toEqual({
        csvFileName: 'dummyCsvFile',
        failCount: 21,
        historyId: uploadHistory.historyId,
        invoiceCount: 0,
        skipCount: 0,
        successCount: 0,
        tenantId: 'dummyTenantId'
      })
      for (let i = 0; i < 21; i++) {
        expect(csvRows[i]).toEqual({
          errorData: '一つの請求書で作成できる明細数は20までです。',
          historyDetailId: csvRows[i].historyDetailId,
          historyId: csvRows[i].historyId,
          invoiceNo: 'I2022070101',
          lines: i + 1,
          status: 2
        })
      }
    })
    test('正常: アップロード済みでバリデーション失敗', async () => {
      findAllInvoicesSpy.mockResolvedValue(testInvoiceData.valid)

      const { validInvoices, validLines, uploadHistory, csvRows } = await pdfInvoiceCsvUploadValidation.validate(
        copyTestData(testInvoiceData.invalid),
        copyTestData(testLineData.invalid),
        defaultTenantId,
        defaultFileName
      )

      expect(validInvoices).toEqual([])
      expect(validLines).toEqual([])
      expect(uploadHistory).toEqual({
        csvFileName: 'dummyCsvFile',
        failCount: 0,
        historyId: uploadHistory.historyId,
        invoiceCount: 0,
        skipCount: 1,
        successCount: 0,
        tenantId: 'dummyTenantId'
      })
      expect(csvRows).toEqual([
        {
          errorData: '取込済みのため、処理をスキップしました。',
          historyDetailId: csvRows[0].historyDetailId,
          historyId: csvRows[0].historyId,
          invoiceNo: 'I2022070101',
          lines: 1,
          status: 1
        }
      ])
    })
    test('正常: 重複でバリデーション失敗', async () => {
      findAllInvoicesSpy.mockResolvedValue([])

      const { validInvoices, validLines, uploadHistory, csvRows } = await pdfInvoiceCsvUploadValidation.validate(
        copyTestData(testInvoiceData.duplication),
        copyTestData(testLineData.valid),
        defaultTenantId,
        defaultFileName
      )

      expect(validInvoices).toEqual(testInvoiceData.valid)
      expect(validLines).toEqual(convertValidLineModel(testLineData.valid))
      expect(uploadHistory).toEqual({
        csvFileName: 'dummyCsvFile',
        failCount: 0,
        historyId: uploadHistory.historyId,
        invoiceCount: 1,
        skipCount: 1,
        successCount: 1,
        tenantId: 'dummyTenantId'
      })
      expect(csvRows).toEqual([
        {
          errorData: '',
          historyDetailId: csvRows[0].historyDetailId,
          historyId: csvRows[0].historyId,
          invoiceNo: 'I2022070101',
          lines: 1,
          status: 0
        },
        {
          errorData: '重複のため、処理をスキップしました。',
          historyDetailId: csvRows[1].historyDetailId,
          historyId: csvRows[1].historyId,
          invoiceNo: 'I2022070101',
          lines: 1,
          status: 1
        }
      ])
    })
    test('正常: invoice がバリデーションに失敗', async () => {
      findAllInvoicesSpy.mockResolvedValue([])

      const { validInvoices, validLines, uploadHistory, csvRows } = await pdfInvoiceCsvUploadValidation.validate(
        copyTestData(testInvoiceData.invalid),
        copyTestData(testLineData.valid),
        defaultTenantId,
        defaultFileName
      )

      expect(validInvoices).toEqual([])
      expect(validLines).toEqual([])
      expect(uploadHistory).toEqual({
        csvFileName: 'dummyCsvFile',
        failCount: 1,
        historyId: uploadHistory.historyId,
        invoiceCount: 0,
        skipCount: 0,
        successCount: 0,
        tenantId: 'dummyTenantId'
      })
      expect(csvRows).toEqual([
        {
          errorData: '宛先企業は必須です。' + '\r\n',
          historyDetailId: csvRows[0].historyDetailId,
          historyId: csvRows[0].historyId,
          invoiceNo: 'I2022070101',
          lines: 1,
          status: 2
        }
      ])
    })
    test('正常: line がバリデーションに失敗', async () => {
      findAllInvoicesSpy.mockResolvedValue([])

      const { validInvoices, validLines, uploadHistory, csvRows } = await pdfInvoiceCsvUploadValidation.validate(
        copyTestData(testInvoiceData.valid),
        copyTestData(testLineData.invalid),
        defaultTenantId,
        defaultFileName
      )

      expect(validInvoices).toEqual([])
      expect(validLines).toEqual([])
      expect(uploadHistory).toEqual({
        csvFileName: 'dummyCsvFile',
        failCount: 1,
        historyId: uploadHistory.historyId,
        invoiceCount: 0,
        skipCount: 0,
        successCount: 0,
        tenantId: 'dummyTenantId'
      })
      expect(csvRows).toEqual([
        {
          errorData: '明細-内容は必須です。' + '\r\n',
          historyDetailId: csvRows[0].historyDetailId,
          historyId: csvRows[0].historyId,
          invoiceNo: 'I2022070101',
          lines: 1,
          status: 2
        }
      ])
    })
    test('正常: invoice がバリデーション失敗 / line がバリデーション失敗', async () => {
      findAllInvoicesSpy.mockResolvedValue([])

      const { validInvoices, validLines, uploadHistory, csvRows } = await pdfInvoiceCsvUploadValidation.validate(
        copyTestData(testInvoiceData.invalid),
        copyTestData(testLineData.invalid),
        defaultTenantId,
        defaultFileName
      )

      expect(validInvoices).toEqual([])
      expect(validLines).toEqual([])
      expect(uploadHistory).toEqual({
        csvFileName: 'dummyCsvFile',
        failCount: 1,
        historyId: uploadHistory.historyId,
        invoiceCount: 0,
        skipCount: 0,
        successCount: 0,
        tenantId: 'dummyTenantId'
      })
      expect(csvRows).toEqual([
        {
          errorData: '宛先企業は必須です。' + '\r\n' + '明細-内容は必須です。' + '\r\n',
          historyDetailId: csvRows[0].historyDetailId,
          historyId: csvRows[0].historyId,
          invoiceNo: 'I2022070101',
          lines: 1,
          status: 2
        }
      ])
    })
    test('正常: 成功 / 失敗 / スキップ', async () => {
      findAllInvoicesSpy.mockResolvedValue([])

      const { validInvoices, validLines, uploadHistory, csvRows } = await pdfInvoiceCsvUploadValidation.validate(
        copyTestData(testInvoiceData.succFailSkip),
        copyTestData(testLineData.succFailSkip),
        defaultTenantId,
        defaultFileName
      )

      expect(validInvoices).toEqual([testInvoiceData.succFailSkip[0]])
      expect(validLines).toEqual(convertValidLineModel([testLineData.succFailSkip[0]]))
      expect(uploadHistory).toEqual({
        csvFileName: 'dummyCsvFile',
        failCount: 1,
        historyId: uploadHistory.historyId,
        invoiceCount: 1,
        skipCount: 1,
        successCount: 1,
        tenantId: 'dummyTenantId'
      })
      expect(csvRows).toEqual([
        {
          errorData: '',
          historyDetailId: csvRows[0].historyDetailId,
          historyId: csvRows[0].historyId,
          invoiceNo: 'I2022070101',
          lines: 1,
          status: 0
        },
        {
          errorData: '宛先企業は必須です。' + '\r\n' + '明細-内容は必須です。' + '\r\n',
          historyDetailId: csvRows[1].historyDetailId,
          historyId: csvRows[1].historyId,
          invoiceNo: 'I2022070102',
          lines: 2,
          status: 2
        },
        {
          errorData: '重複のため、処理をスキップしました。',
          historyDetailId: csvRows[2].historyDetailId,
          historyId: csvRows[2].historyId,
          invoiceNo: 'I2022070101',
          lines: 3,
          status: 1
        }
      ])
    })
    test('正常: 成功 / 失敗', async () => {
      findAllInvoicesSpy.mockResolvedValue([])

      const { validInvoices, validLines, uploadHistory, csvRows } = await pdfInvoiceCsvUploadValidation.validate(
        copyTestData(testInvoiceData.succFail),
        copyTestData(testLineData.succFail),
        defaultTenantId,
        defaultFileName
      )

      expect(validInvoices).toEqual([testInvoiceData.succFail[0]])
      expect(validLines).toEqual(convertValidLineModel([testLineData.succFail[0]]))
      expect(uploadHistory).toEqual({
        csvFileName: 'dummyCsvFile',
        failCount: 1,
        historyId: uploadHistory.historyId,
        invoiceCount: 1,
        skipCount: 0,
        successCount: 1,
        tenantId: 'dummyTenantId'
      })
      expect(csvRows).toEqual([
        {
          errorData: '',
          historyDetailId: csvRows[0].historyDetailId,
          historyId: csvRows[0].historyId,
          invoiceNo: 'I2022070101',
          lines: 1,
          status: 0
        },
        {
          errorData: '宛先企業は必須です。' + '\r\n' + '明細-内容は必須です。' + '\r\n',
          historyDetailId: csvRows[1].historyDetailId,
          historyId: csvRows[1].historyId,
          invoiceNo: 'I2022070102',
          lines: 2,
          status: 2
        }
      ])
    })
    test('正常: 成功 / スキップ', async () => {
      findAllInvoicesSpy.mockResolvedValue([])

      const { validInvoices, validLines, uploadHistory, csvRows } = await pdfInvoiceCsvUploadValidation.validate(
        copyTestData(testInvoiceData.succSkip),
        copyTestData(testLineData.succSkip),
        defaultTenantId,
        defaultFileName
      )

      expect(validInvoices).toEqual([testInvoiceData.succSkip[0]])
      expect(validLines).toEqual(convertValidLineModel([testLineData.succSkip[0]]))
      expect(uploadHistory).toEqual({
        csvFileName: 'dummyCsvFile',
        failCount: 0,
        historyId: uploadHistory.historyId,
        invoiceCount: 1,
        skipCount: 1,
        successCount: 1,
        tenantId: 'dummyTenantId'
      })
      expect(csvRows).toEqual([
        {
          errorData: '',
          historyDetailId: csvRows[0].historyDetailId,
          historyId: csvRows[0].historyId,
          invoiceNo: 'I2022070101',
          lines: 1,
          status: 0
        },
        {
          errorData: '重複のため、処理をスキップしました。',
          historyDetailId: csvRows[1].historyDetailId,
          historyId: csvRows[1].historyId,
          invoiceNo: 'I2022070101',
          lines: 2,
          status: 1
        }
      ])
    })
    test('正常: 失敗 / スキップ', async () => {
      findAllInvoicesSpy.mockResolvedValue([testInvoiceData.failSkip[1]])

      const { validInvoices, validLines, uploadHistory, csvRows } = await pdfInvoiceCsvUploadValidation.validate(
        copyTestData(testInvoiceData.failSkip),
        copyTestData(testLineData.failSkip),
        defaultTenantId,
        defaultFileName
      )

      expect(validInvoices).toEqual([])
      expect(validLines).toEqual([])
      expect(uploadHistory).toEqual({
        csvFileName: 'dummyCsvFile',
        failCount: 1,
        historyId: uploadHistory.historyId,
        invoiceCount: 0,
        skipCount: 1,
        successCount: 0,
        tenantId: 'dummyTenantId'
      })
      expect(csvRows).toEqual([
        {
          errorData: '宛先企業は必須です。' + '\r\n' + '明細-内容は必須です。' + '\r\n',
          historyDetailId: csvRows[0].historyDetailId,
          historyId: csvRows[0].historyId,
          invoiceNo: 'I2022070102',
          lines: 1,
          status: 2
        },
        {
          errorData: '取込済みのため、処理をスキップしました。',
          historyDetailId: csvRows[1].historyDetailId,
          historyId: csvRows[1].historyId,
          invoiceNo: 'I2022070101',
          lines: 2,
          status: 1
        }
      ])
    })
  })
})
