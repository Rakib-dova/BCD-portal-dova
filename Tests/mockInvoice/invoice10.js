'use stric'
module.exports = {
  DocumentType: 'InvoiceType',
  UBLVersionID: {
    value: '2.0'
  },
  CustomizationID: {
    value: 'urn:tradeshift.com:ubl-2.0-customizations:2010-06'
  },
  ProfileID: {
    value: 'urn:www.cenbii.eu:profile:bii04:ver1.0',
    schemeID: 'CWA 16073:2010',
    schemeAgencyID: 'CEN/ISSS WS/BII',
    schemeVersionID: '1'
  },
  ID: {
    value: 'A01012'
  },
  IssueDate: {
    value: '2021-08-20'
  },
  InvoiceTypeCode: {
    value: '380',
    listID: 'UN/ECE 1001 Subset',
    listAgencyID: '6',
    listVersionID: 'D08B'
  },
  Note: [
    {
      value: '特記事項テスト1です。'
    }
  ],
  DocumentCurrencyCode: {
    value: 'JPY'
  },
  AdditionalDocumentReference: [
    {
      ID: {
        value: 'DOWN'
      },
      DocumentTypeCode: {
        value: 'File ID',
        listID: 'urn:tradeshift.com:api:1.0:documenttypecode'
      }
    },
    {
      ID: {
        value: '1'
      },
      DocumentTypeCode: {
        value: 'humanreadableversion',
        listID: 'urn:tradeshift.com:api:1.0:documenttypecode'
      },
      Attachment: {}
    }
  ],
  AccountingSupplierParty: {
    Party: {
      PartyIdentification: [
        {
          ID: {
            value: '221559d0-53aa-44a2-ab29-0c4a6cb02bde',
            schemeID: 'TS:ID',
            schemeName: 'Tradeshift identifier'
          }
        }
      ],
      Contact: {
        ID: {
          value: '27f7188b-f6c7-4b5e-9826-96052bba495e',
          schemeURI: 'http://tradeshift.com/api/1.0/userId'
        },
        Name: {
          value: '浩 河西'
        },
        ElectronicMail: {
          value: 'jikim@cseltd.co.jp'
        }
      },
      Person: {
        FirstName: {
          value: '浩'
        },
        FamilyName: {
          value: '河西'
        }
      }
    }
  },
  AccountingCustomerParty: {
    Party: {
      PartyIdentification: [
        {
          ID: {
            value: '221559d0-53aa-44a2-ab29-0c4a6cb02bde',
            schemeID: 'TS:ID',
            schemeName: 'Tradeshift identifier'
          }
        }
      ],
      Contact: {}
    }
  },
  Delivery: [
    {
      ActualDeliveryDate: {
        value: '2021-08-23'
      }
    }
  ],
  PaymentMeans: [
    {
      ID: {
        value: 'fca33ef8-6cf9-48e5-ad6c-51c10210e61f'
      },
      PaymentMeansCode: {
        value: '42',
        listID: 'urn:tradeshift.com:api:1.0:paymentmeanscode'
      },
      PaymentDueDate: {
        value: ''
      },
      PayeeFinancialAccount: {
        ID: {
          value: '2222222'
        },
        Name: {
          value: 'kang_test'
        },
        AccountTypeCode: {
          value: 'General'
        },
        FinancialInstitutionBranch: {
          Name: {
            value: 'testbank'
          },
          FinancialInstitution: {
            Name: {
              value: 'testsiten'
            }
          }
        }
      }
    }
  ],
  TaxTotal: [
    {
      TaxAmount: {
        value: 0,
        currencyID: 'JPY'
      },
      TaxSubtotal: [
        {
          TaxableAmount: {
            value: 1100,
            currencyID: 'JPY'
          },
          TaxAmount: {
            value: 0,
            currencyID: 'JPY'
          },
          TaxCategory: {
            ID: {
              value: 'AA',
              schemeID: 'UN/ECE 5305',
              schemeAgencyID: '6',
              schemeVersionID: 'D08B'
            },
            Percent: {
              value: 0
            },
            TaxScheme: {
              ID: {
                value: 'VAT',
                schemeID: 'UN/ECE 5153 Subset',
                schemeAgencyID: '6',
                schemeVersionID: 'D08B'
              },
              Name: {
                value: 'JP 免税 0%'
              }
            }
          }
        }
      ]
    }
  ],
  LegalMonetaryTotal: {
    LineExtensionAmount: {
      value: 1100,
      currencyID: 'JPY'
    },
    TaxExclusiveAmount: {
      value: 0,
      currencyID: 'JPY'
    },
    TaxInclusiveAmount: {
      value: 1100,
      currencyID: 'JPY'
    },
    PayableAmount: {
      value: 1100,
      currencyID: 'JPY'
    }
  },
  InvoiceLine: [
    {
      ID: {
        value: '1'
      },
      InvoicedQuantity: {
        value: 10,
        unitCode: 'EA'
      },
      LineExtensionAmount: {
        value: 1100,
        currencyID: 'JPY'
      },
      TaxTotal: [
        {
          TaxAmount: {
            value: 0,
            currencyID: 'JPY'
          },
          TaxSubtotal: [
            {
              TaxableAmount: {
                value: 1100,
                currencyID: 'JPY'
              },
              TaxAmount: {
                value: 0,
                currencyID: 'JPY'
              },
              CalculationSequenceNumeric: {
                value: 1
              },
              TaxCategory: {
                ID: {
                  value: 'O',
                  schemeID: 'UN/ECE 5305',
                  schemeAgencyID: '6',
                  schemeVersionID: 'D08B'
                },
                Percent: {
                  value: 0
                },
                TaxScheme: {
                  ID: {
                    value: 'VAT',
                    schemeID: 'UN/ECE 5153 Subset',
                    schemeAgencyID: '6',
                    schemeVersionID: 'D08B'
                  },
                  Name: {
                    value: 'JP 免税 0%'
                  }
                }
              }
            }
          ]
        }
      ],
      Item: {
        Description: [
          {
            value: 'test'
          }
        ],
        Name: {
          value: 'test'
        }
      },
      Price: {
        PriceAmount: {
          value: 110.0,
          currencyID: 'JPY'
        },
        BaseQuantity: {
          value: 1,
          unitCode: 'EA'
        },
        OrderableUnitFactorRate: {
          value: 1
        }
      }
    }
  ]
}
