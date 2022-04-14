'use strict'
const { v4: uuidv4 } = require('uuid')

/**
 * UUIDv4を返す関数を返す
 */
const uuid = () => {
  return (key, data) => uuidv4()
}

/**
 * keyに該当する値を 'value'プロパティの値として持つオブジェクトを返す関数を返す
 */
const value = (options, postfix = '') => {
  return (key, data) => {
    let value = data.get(key + postfix)
    return value == null
      ? null
      : Object.assign(
          {
            value: value
          },
          options
        )
  }
}

/**
 * 通貨項目定義
 */
const currency = () => {
  return value({
    currencyID: 'JPY'
  })
}

/**
 * 支払方法を整形する (銀行口座と支払期日のみ対応)
 */
const paymentMeans = (template) => {
  return (key, data) => {
    let result = data.payments
      .map((data, index) => {
        return processObject(data, 'PaymentMeans/', template)
      })
      .filter((pm) => pm.PayeeFinancialAccount)
    if (result.length > 0) {
      return result
    }
    let dueDate = data.get('PaymentMeans/PaymentDueDate')
    if (!dueDate) {
      return null
    }
    return [
      {
        ID: {
          value: uuidv4()
        },
        PaymentMeansCode: {
          value: '1',
          listID: 'urn:tradeshift.com:api:1.0:paymentmeanscode'
        },
        PaymentDueDate: {
          value: dueDate
        }
      }
    ]
  }
}

/**
 * 割引行を整形する
 */
const allowanceCharge = (template) => {
  return (key, data) => {
    if (data.discounts.length == 0) {
      return null
    }
    return data.discounts.map((data, index) => {
      return processObject(data.bind({ 'AllowanceCharge/ID': index + 1 }), 'AllowanceCharge/', template)
    })
  }
}

/**
 * 明細行を整形する
 */
const invoiceLine = (template) => {
  return (key, data) => {
    return data.lines.map((line, index) => {
      return processObject(line.bind({ 'InvoiceLine/ID': index + 1 }), 'InvoiceLine/', template)
    })
  }
}

/**
 * 文書参照を整形する
 */
const documentReference = (postfix, type) => {
  return (key, data) => {
    let value = data.get(key + postfix)
    return (
      value && {
        ID: {
          value: value
        },
        DocumentTypeCode: {
          value: type,
          listID: 'urn:tradeshift.com:api:1.0:documenttypecode'
        }
      }
    )
  }
}

/**
 * 税別明細を整形する
 */
const taxSubtotal = (template) => {
  return (key, data) => {
    return processArray(data, key, template).filter(
      (e) => e.TaxableAmount && e.TaxableAmount.value && e.TaxAmount && e.TaxAmount.value
    )
  }
}

/**
 * 税区分を整形する関数を返す
 */
const taxCategoryInLine = () => {
  return (key, data) => {
    return taxCategory(data.get(key + '/Rate'), data.get(key + '/Type'))
  }
}

/**
 * 税区分を整形する
 */
const taxCategory = (percent, reduced) => {
  let id
  let name
  if (percent == 0) {
    id = 'Z'
    name = 'JP 非課税 0%'
  } else if (reduced) {
    id = 'A'
    name = `JP 消費税(軽減税率) ${percent}%`
  } else {
    id = 'S'
    name = `JP 消費税 ${percent}%`
  }

  return {
    ID: {
      value: id,
      schemeID: 'UN/ECE 5305',
      schemeAgencyID: '6',
      schemeVersionID: 'D08B'
    },
    Percent: {
      value: percent
    },
    TaxScheme: {
      ID: {
        value: 'VAT',
        schemeID: 'UN/ECE 5153 Subset',
        schemeAgencyID: '6',
        schemeVersionID: 'D08B'
      },
      Name: {
        value: name
      }
    }
  }
}

const invoice = {
  DocumentType: 'InvoiceType',
  UBLVersionID: {
    value: '2.0'
  },
  ID: value(),
  IssueDate: value(),
  DocumentCurrencyCode: {
    value: 'JPY'
  },
  AccountingCost: value(),
  AccountingSupplierParty: {
    Party: {
      PartyIdentification: [
        {
          ID: value({
            schemeID: 'TS:ID'
          })
        }
      ]
    }
  },
  AccountingCustomerParty: {
    Party: {
      PartyIdentification: [
        {
          ID: value({
            schemeID: 'TS:ID'
          })
        }
      ],
      PartyName: [
        {
          Name: value()
        }
      ]
    }
  },
  PaymentMeans: paymentMeans({
    ID: {
      value: uuid()
    },
    PaymentMeansCode: {
      value: '42',
      listID: 'urn:tradeshift.com:api:1.0:paymentmeanscode'
    },
    PaymentDueDate: value(),
    PaymentChannelCode: {
      value: 'JP:BANK',
      listID: 'urn:tradeshift.com:api:1.0:paymentchannelcode'
    },
    PayeeFinancialAccount: {
      ID: value(),
      Name: value(),
      AccountTypeCode: value(),
      FinancialInstitutionBranch: {
        Name: value(),
        FinancialInstitution: {
          Name: value()
        }
      }
    }
  }),
  AllowanceCharge: allowanceCharge({
    ID: value(),
    ChargeIndicator: value(),
    AllowanceChargeReason: value(),
    MultiplierFactorNumeric: {
      value: 1
    },
    Amount: currency(),
    TaxCategory: [taxCategoryInLine()],
    TaxTotal: {
      TaxAmount: currency()
    }
  }),
  TaxTotal: [
    {
      TaxAmount: currency(),
      TaxSubtotal: taxSubtotal([
        {
          TaxableAmount: currency(),
          TaxAmount: currency(),
          TaxCategory: taxCategory(10, false)
        },
        {
          TaxableAmount: currency(),
          TaxAmount: currency(),
          TaxCategory: taxCategory(8, true)
        },
        {
          TaxableAmount: currency(),
          TaxAmount: currency(),
          TaxCategory: taxCategory(8, false)
        },
        {
          TaxableAmount: currency(),
          TaxAmount: currency(),
          TaxCategory: taxCategory(5, false)
        }
      ])
    }
  ],
  LegalMonetaryTotal: {
    LineExtensionAmount: currency(),
    TaxExclusiveAmount: currency(),
    TaxInclusiveAmount: currency(),
    PayableAmount: currency()
  },
  InvoiceLine: invoiceLine({
    ID: value(),
    InvoicedQuantity: value({
      unitCode: 'EA'
    }),
    LineExtensionAmount: currency(),
    AccountingCost: value(),
    OrderLineReference: [
      {
        LineID: value(),
        OrderReference: {
          ID: value()
        }
      }
    ],
    DocumentReference: [documentReference('/Note', 'File ID')],
    TaxTotal: [
      {
        TaxAmount: currency(),
        TaxSubtotal: [
          {
            TaxableAmount: currency(),
            TaxAmount: currency(),
            CalculationSequenceNumeric: {
              value: 1
            },
            TaxCategory: taxCategoryInLine()
          }
        ]
      }
    ],
    Item: {
      Description: [value()],
      Name: value(),
      ModelName: [value()],
      SellersItemIdentification: {
        ID: value()
      },
      ManufacturerParty: [
        {
          PartyName: [
            {
              Name: value()
            }
          ]
        }
      ]
    },
    Price: {
      PriceAmount: currency(),
      BaseQuantity: {
        value: 1,
        unitCode: 'EA'
      },
      OrderableUnitFactorRate: {
        value: 1
      }
    }
  })
}

/**
 * nullとundefinedの場合にtruthyを返す
 */
const isNull = (a) => a == null

/**
 * nullとundefinedの場合にfalsyを返す
 */
const notNull = (a) => !isNull(a)

/**
 * オブジェクトテンプレートから文書を構成する
 */
const processObject = (data, prefix, object) => {
  let result = {}
  for (const [key, value] of Object.entries(object)) {
    let ret = processValue(data, prefix + key, value)
    if (notNull(ret)) {
      result[key] = ret
    }
  }
  return Object.keys(result).length > 0 ? result : null
}

/**
 * 配列テンプレートから文書を構成する
 */
const processArray = (data, prefix, array) => {
  let result = array.map((value, i) => processValue(data, `${prefix}[${i}]`, value)).filter(notNull)
  return result.length > 0 ? result : null
}

/**
 * 型に応じて値を処理する
 */
const processValue = (data, key, value) => {
  switch (Object.prototype.toString.call(value)) {
    case '[object Object]':
      return processObject(data, key + '.', value)
    case '[object Array]':
      return processArray(data, key + '.', value)
    case '[object Function]':
      return value(key, data)
    default:
      return value
  }
}

/**
 * 請求書テンプレートから文書を構成する
 */
const create = (data, supplierPartyId, customerPartyId) => {
  const options = {
    'AccountingSupplierParty.Party.PartyIdentification.[0].ID': supplierPartyId,
    'AccountingCustomerParty.Party.PartyIdentification.[0].ID': customerPartyId
  }
  return processObject(data.bind(options), '', invoice)
}

module.exports = {
  create
}
