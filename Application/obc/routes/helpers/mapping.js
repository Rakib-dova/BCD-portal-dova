'use strict'
const Parser = require('./parser')

const mapping = [
  {
    key: 'AccountingCustomerParty.Party.PartyIdentification.[0].ID',
    src: 'SD5011094',
    attr: 'customerId'
  },
  {
    key: 'AccountingCustomerParty.Party.PartyName.[0].Name',
    src: 'SD5010006',
    attr: 'customerName'
  },
  {
    key: 'ID',
    src: 'SD5011002',
    attr: 'invoiceId'
  },
  {
    key: 'IssueDate',
    src: 'SD5011001',
    cnv: Parser.forDate,
    attr: 'issueDate'
  },
  {
    key: 'AccountingCost',
    src: 'SD5011079',
    label: '部門'
  },
  {
    key: 'PaymentMeans/PaymentDueDate',
    src: ['SD5011006', 'SD5019001'],
    cnv: Parser.forDate,
    label: '支払期日',
    attr: 'dueDate'
  },
  {
    key: 'AllowanceCharge/AllowanceChargeReason',
    src: 'SD5013001'
  },
  {
    key: 'AllowanceCharge/ChargeIndicator',
    src: 'SD5014031',
    cnv: Parser.isPositive
  },
  {
    key: 'AllowanceCharge/Amount',
    src: 'SD5014031',
    cnv: Parser.forInverseInteger
  },
  {
    key: 'AllowanceCharge/TaxCategory.[0]/Rate',
    src: 'SD5014035',
    cnv: Parser.forInteger
  },
  {
    key: 'AllowanceCharge/TaxCategory.[0]/Type',
    src: 'SD5014036',
    cnv: Parser.forTaxType
  },
  {
    key: 'AllowanceCharge/TaxTotal.TaxAmount',
    src: 'SD5014037',
    cnv: Parser.forInteger
  },
  {
    key: 'TaxTotal.[0].TaxAmount',
    src: ['SD5018002', 'SD5018005', 'SD5011052'],
    cnv: Parser.forInteger
  },
  {
    key: 'TaxTotal.[0].TaxSubtotal[0].TaxableAmount',
    src: ['SD5018017', 'SD5011071'],
    cnv: Parser.forInteger
  },
  {
    key: 'TaxTotal.[0].TaxSubtotal[0].TaxAmount',
    src: ['SD5018013', 'SD5011067'],
    cnv: Parser.forInteger
  },
  {
    key: 'TaxTotal.[0].TaxSubtotal[1].TaxableAmount',
    src: ['SD5018018', 'SD5011072'],
    cnv: Parser.forInteger
  },
  {
    key: 'TaxTotal.[0].TaxSubtotal[1].TaxAmount',
    src: ['SD5018014', 'SD5011068'],
    cnv: Parser.forInteger
  },
  {
    key: 'TaxTotal.[0].TaxSubtotal[2].TaxableAmount',
    src: ['SD5018019', 'SD5011073'],
    cnv: Parser.forInteger
  },
  {
    key: 'TaxTotal.[0].TaxSubtotal[2].TaxAmount',
    src: ['SD5018015', 'SD5011069'],
    cnv: Parser.forInteger
  },
  {
    key: 'TaxTotal.[0].TaxSubtotal[3].TaxableAmount',
    src: ['SD5018020', 'SD5011074'],
    cnv: Parser.forInteger
  },
  {
    key: 'TaxTotal.[0].TaxSubtotal[3].TaxAmount',
    src: ['SD5018016', 'SD5011070'],
    cnv: Parser.forInteger
  },
  {
    key: 'LegalMonetaryTotal.LineExtensionAmount',
    src: ['SD5018006', 'SD5018003', 'SD5011050'],
    cnv: Parser.forInteger
  },
  {
    key: 'LegalMonetaryTotal.TaxExclusiveAmount',
    src: 'SD5011052',
    cnv: Parser.forInteger
  },
  {
    key: 'LegalMonetaryTotal.TaxInclusiveAmount',
    src: 'SD5011051',
    cnv: Parser.forInteger
  },
  {
    key: 'LegalMonetaryTotal.PayableAmount',
    src: ['SD5018001', 'SD5018004', 'SD5011051', 'SD5011056'],
    cnv: Parser.forInteger,
    attr: 'totalAmount'
  },
  {
    key: 'InvoiceLine/Item.SellersItemIdentification.ID',
    src: 'SD5013001'
  },
  {
    key: 'InvoiceLine/InvoicedQuantity',
    src: 'SD5014025',
    cnv: Parser.forInteger,
    fallback: 1
  },
  {
    key: 'InvoiceLine/LineExtensionAmount',
    src: 'SD5014031',
    cnv: Parser.forInteger
  },
  {
    key: 'InvoiceLine/TaxTotal.[0].TaxAmount',
    src: 'SD5014037',
    cnv: Parser.forInteger
  },
  {
    key: 'InvoiceLine/TaxTotal.[0].TaxSubtotal.[0].TaxableAmount',
    src: 'SD5014031',
    cnv: Parser.forInteger
  },
  {
    key: 'InvoiceLine/TaxTotal.[0].TaxSubtotal.[0].TaxAmount',
    src: 'SD5014037',
    cnv: Parser.forInteger
  },
  {
    key: 'InvoiceLine/TaxTotal.[0].TaxSubtotal.[0].TaxCategory/Rate',
    src: 'SD5014035',
    cnv: Parser.forInteger
  },
  {
    key: 'InvoiceLine/TaxTotal.[0].TaxSubtotal.[0].TaxCategory/Type',
    src: 'SD5014036',
    cnv: Parser.forTaxType
  },
  {
    key: 'InvoiceLine/Item.Description.[0]',
    src: 'SD5014014',
    fallback: '-'
  },
  {
    key: 'InvoiceLine/Item.Name',
    src: 'SD5014014',
    fallback: '-'
  },
  {
    key: 'InvoiceLine/Price.PriceAmount',
    src: 'SD5014029',
    cnv: Parser.forInteger
  },
  {
    key: 'InvoiceLine/DocumentReference.[0]/Note',
    src: 'SD5014038',
    label: '明細 備考'
  },
  {
    key: 'InvoiceLine/AccountingCost',
    src: 'SD5014006',
    label: '明細 部門'
  },
  {
    key: 'InvoiceLine/OrderLineReference.[0].LineID',
    src: 'SD5014021',
    label: '明細 注文明細番号'
  },
  {
    key: 'InvoiceLine/OrderLineReference.[0].OrderReference.ID',
    src: 'SD5014003',
    label: '明細 注文書番号'
  },
  {
    key: 'InvoiceLine/Item.ModelName.[0]',
    src: 'SD5014015',
    label: '明細 詳細'
  },
  {
    key: 'InvoiceLine/Item.ManufacturerParty.[0].PartyName.[0].Name',
    src: 'SD5014016',
    label: '明細 メーカー名'
  },
  {
    key: 'PaymentMeans',
    label: '銀行口座',
    items: [
      {
        key: 'PayeeFinancialAccount.FinancialInstitutionBranch.FinancialInstitution.Name',
        src: ['SD5011039', 'SD5019007']
      },
      {
        key: 'PayeeFinancialAccount.FinancialInstitutionBranch.Name',
        src: ['SD5011040', 'SD5019009']
      },
      {
        key: 'PayeeFinancialAccount.ID',
        src: ['SD5011042', 'SD5019011']
      },
      {
        key: 'PayeeFinancialAccount.AccountTypeCode',
        src: ['SD5011041', 'SD5019010'],
        cnv: Parser.forAccountTypeCode
      },
      {
        key: 'PayeeFinancialAccount.Name',
        src: ['SD5011043', 'SD5019012']
      }
    ]
  }
]

module.exports = mapping
