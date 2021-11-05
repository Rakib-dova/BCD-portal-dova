'use stric'
module.exports = {
  DocumentType: 'InvoiceType',
  UBLExtensions: {
    UBLExtension: [
      {
        ExtensionURI: {
          value: 'urn:oasis:names:specification:ubl:dsig:enveloped'
        }
      }
    ]
  },
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
    value: 'A01001'
  },
  IssueDate: {
    value: '2021-08-23'
  },
  InvoiceTypeCode: {
    value: '380',
    listID: 'UN/ECE 1001 Subset',
    listAgencyID: '6',
    listVersionID: 'D08B'
  },
  DocumentCurrencyCode: {
    value: 'JPY'
  },
  AdditionalDocumentReference: [
    {
      ID: {
        value: 'DOWN'
      },
      DocumentTypeCode: {
        value: 'RoundingRule',
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
      }
    }
  ],
  AccountingSupplierParty: {
    Party: {
      PartyIdentification: [
        {
          ID: {
            value: 'f783be0e-e716-4eab-a7ec-5ce36b3c7b31',
            schemeID: 'TS:ID'
          }
        }
      ],
      PartyName: [
        {
          Name: {
            value: '株式会社TEST'
          }
        }
      ],
      PostalAddress: {
        AddressFormatCode: {
          value: '5',
          listID: 'UN/ECE 3477',
          listAgencyID: '6',
          listVersionID: 'D08B'
        },
        StreetName: {
          value: ''
        },
        BuildingNumber: {
          value: ''
        },
        CityName: {
          value: '東京都'
        },
        PostalZone: {
          value: '150-0002'
        },
        Country: {
          IdentificationCode: {
            value: 'JP'
          }
        }
      },
      Contact: {
        ID: {
          value: '27f7188b-f6c7-4b5e-9826-96052bba495e',
          schemeURI: 'http://tradeshift.com/api/1.0/userId'
        },
        Name: {
          value: 'TESTER'
        },
        ElectronicMail: {
          value: 'AAA@TEST'
        }
      },
      Person: {
        FirstName: {
          value: 'TE'
        },
        FamilyName: {
          value: 'STER'
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
      PartyName: [
        {
          Name: {
            value: 'test1'
          }
        }
      ],
      PostalAddress: {
        AddressFormatCode: {
          value: '5',
          listID: 'UN/ECE 3477',
          listAgencyID: '6',
          listVersionID: 'D08B'
        },
        StreetName: {
          value: '豊島5丁目'
        },
        BuildingNumber: {
          value: ''
        },
        CityName: {
          value: '東京都'
        },
        PostalZone: {
          value: '114-0003'
        },
        Country: {
          IdentificationCode: {
            value: 'JP'
          }
        }
      },
      Contact: {}
    }
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
            value: 100,
            currencyID: 'JPY'
          },
          TaxAmount: {
            value: 0,
            currencyID: 'JPY'
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
                value: 'JP 不課税 0%'
              }
            }
          }
        }
      ]
    }
  ],
  LegalMonetaryTotal: {
    LineExtensionAmount: {
      value: 100,
      currencyID: 'JPY'
    },
    TaxExclusiveAmount: {
      value: 0,
      currencyID: 'JPY'
    },
    TaxInclusiveAmount: {
      value: 100,
      currencyID: 'JPY'
    },
    PayableAmount: {
      value: 100,
      currencyID: 'JPY'
    }
  },
  InvoiceLine: []
}
