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
    value: '20211007'
  },
  IssueDate: {
    value: '2021-10-07'
  },
  InvoiceTypeCode: {
    value: '380',
    listID: 'UN/ECE 1001 Subset',
    listAgencyID: '6',
    listVersionID: 'D08B'
  },
  Note: [
    {
      value: '請求書一括作成_1.csv'
    }
  ],
  DocumentCurrencyCode: {
    value: 'JPY'
  },
  AdditionalDocumentReference: [
    {
      ID: {
        value: 'PBI1242_手動試験'
      },
      DocumentTypeCode: {
        value: 'File ID',
        listID: 'urn:tradeshift.com:api:1.0:documenttypecode'
      }
    },
    {
      ID: {
        value: 'DOWN'
      },
      DocumentTypeCode: {
        value: 'RoundingRule',
        listID: 'urn:tradeshift.com:api:1.0:documenttypecode'
      }
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
      PartyName: [
        {
          Name: {
            value: '株式会社送信企業'
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
      Contact: {
        ID: {
          value: '53607702-b94b-4a94-9459-6cf3acd65603',
          schemeURI: 'http://tradeshift.com/api/1.0/userId'
        },
        Name: {
          value: 'インテグレーション 管理者'
        },
        ElectronicMail: {
          value: 'inte.kanri.user@gmail.com'
        }
      },
      Person: {
        FirstName: {
          value: 'インテグレーション'
        },
        FamilyName: {
          value: '管理者'
        }
      }
    }
  },
  AccountingCustomerParty: {
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
            value: '株式会社受信企業'
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
          value: '渋谷区渋谷'
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
      Contact: {}
    }
  },
  Delivery: [
    {
      ActualDeliveryDate: {
        value: '2021-11-02'
      }
    }
  ],
  PaymentMeans: [
    {
      ID: {
        value: '01afd4d7-f3c5-4dc9-9216-2875c160e7a7'
      },
      PaymentMeansCode: {
        value: '42',
        listID: 'urn:tradeshift.com:api:1.0:paymentmeanscode'
      },
      PaymentChannelCode: {
        value: 'JP:BANK',
        listID: 'urn:tradeshift.com:api:1.0:paymentchannelcode'
      },
      PayeeFinancialAccount: {
        ID: {
          value: '1234567'
        },
        Name: {
          value: '手動'
        },
        AccountTypeCode: {
          value: 'General'
        },
        FinancialInstitutionBranch: {
          Name: {
            value: '手動支店'
          },
          FinancialInstitution: {
            Name: {
              value: '手動銀行'
            }
          }
        }
      }
    }
  ],
  TaxTotal: [
    {
      TaxAmount: {
        value: 62,
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
        },
        {
          TaxableAmount: {
            value: 200,
            currencyID: 'JPY'
          },
          TaxAmount: {
            value: 0,
            currencyID: 'JPY'
          },
          TaxCategory: {
            ID: {
              value: 'E',
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
        },
        {
          TaxableAmount: {
            value: 300,
            currencyID: 'JPY'
          },
          TaxAmount: {
            value: 30,
            currencyID: 'JPY'
          },
          TaxCategory: {
            ID: {
              value: 'S',
              schemeID: 'UN/ECE 5305',
              schemeAgencyID: '6',
              schemeVersionID: 'D08B'
            },
            Percent: {
              value: 10
            },
            TaxScheme: {
              ID: {
                value: 'VAT',
                schemeID: 'UN/ECE 5153 Subset',
                schemeAgencyID: '6',
                schemeVersionID: 'D08B'
              },
              Name: {
                value: 'JP 消費税 10%'
              }
            }
          }
        },
        {
          TaxableAmount: {
            value: 400,
            currencyID: 'JPY'
          },
          TaxAmount: {
            value: 32,
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
              value: 8
            },
            TaxScheme: {
              ID: {
                value: 'VAT',
                schemeID: 'UN/ECE 5153 Subset',
                schemeAgencyID: '6',
                schemeVersionID: 'D08B'
              },
              Name: {
                value: 'JP 消費税(軽減税率) 8%'
              }
            }
          }
        },
        {
          TaxableAmount: {
            value: 500,
            currencyID: 'JPY'
          },
          TaxAmount: {
            value: 0,
            currencyID: 'JPY'
          },
          TaxCategory: {
            ID: {
              value: 'Z',
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
                value: 'JP 非課税 0%'
              }
            }
          }
        }
      ]
    }
  ],
  LegalMonetaryTotal: {
    LineExtensionAmount: {
      value: 1500,
      currencyID: 'JPY'
    },
    TaxExclusiveAmount: {
      value: 62,
      currencyID: 'JPY'
    },
    TaxInclusiveAmount: {
      value: 1562,
      currencyID: 'JPY'
    },
    PayableAmount: {
      value: 1562,
      currencyID: 'JPY'
    }
  },
  InvoiceLine: [
    {
      ID: {
        value: '1'
      },
      InvoicedQuantity: {
        value: 1,
        unitCode: 'EA'
      },
      LineExtensionAmount: {
        value: 100,
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
                value: 100,
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
                    value: 'JP 不課税 0%'
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
            value: 'aaa'
          }
        ],
        Name: {
          value: 'aaa'
        },
        SellersItemIdentification: {
          ID: {
            value: '1'
          }
        }
      },
      Price: {
        PriceAmount: {
          value: 100,
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
    },
    {
      ID: {
        value: '2'
      },
      InvoicedQuantity: {
        value: 2,
        unitCode: 'EA'
      },
      LineExtensionAmount: {
        value: 200,
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
                value: 200,
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
                  value: 'E',
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
            value: 'bbb'
          }
        ],
        Name: {
          value: 'bbb'
        },
        SellersItemIdentification: {
          ID: {
            value: '2'
          }
        }
      },
      Price: {
        PriceAmount: {
          value: 100,
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
    },
    {
      ID: {
        value: '3'
      },
      InvoicedQuantity: {
        value: 3,
        unitCode: 'EA'
      },
      LineExtensionAmount: {
        value: 300,
        currencyID: 'JPY'
      },
      TaxTotal: [
        {
          TaxAmount: {
            value: 30,
            currencyID: 'JPY'
          },
          TaxSubtotal: [
            {
              TaxableAmount: {
                value: 300,
                currencyID: 'JPY'
              },
              TaxAmount: {
                value: 30,
                currencyID: 'JPY'
              },
              CalculationSequenceNumeric: {
                value: 1
              },
              TaxCategory: {
                ID: {
                  value: 'S',
                  schemeID: 'UN/ECE 5305',
                  schemeAgencyID: '6',
                  schemeVersionID: 'D08B'
                },
                Percent: {
                  value: 10
                },
                TaxScheme: {
                  ID: {
                    value: 'VAT',
                    schemeID: 'UN/ECE 5153 Subset',
                    schemeAgencyID: '6',
                    schemeVersionID: 'D08B'
                  },
                  Name: {
                    value: 'JP 消費税 10%'
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
            value: 'ccc'
          }
        ],
        Name: {
          value: 'ccc'
        },
        SellersItemIdentification: {
          ID: {
            value: '3'
          }
        }
      },
      Price: {
        PriceAmount: {
          value: 100,
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
    },
    {
      ID: {
        value: '4'
      },
      InvoicedQuantity: {
        value: 4,
        unitCode: 'EA'
      },
      LineExtensionAmount: {
        value: 400,
        currencyID: 'JPY'
      },
      TaxTotal: [
        {
          TaxAmount: {
            value: 32,
            currencyID: 'JPY'
          },
          TaxSubtotal: [
            {
              TaxableAmount: {
                value: 400,
                currencyID: 'JPY'
              },
              TaxAmount: {
                value: 32,
                currencyID: 'JPY'
              },
              CalculationSequenceNumeric: {
                value: 1
              },
              TaxCategory: {
                ID: {
                  value: 'AA',
                  schemeID: 'UN/ECE 5305',
                  schemeAgencyID: '6',
                  schemeVersionID: 'D08B'
                },
                Percent: {
                  value: 8
                },
                TaxScheme: {
                  ID: {
                    value: 'VAT',
                    schemeID: 'UN/ECE 5153 Subset',
                    schemeAgencyID: '6',
                    schemeVersionID: 'D08B'
                  },
                  Name: {
                    value: 'JP 消費税(軽減税率) 8%'
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
            value: 'ddd'
          }
        ],
        Name: {
          value: 'ddd'
        },
        SellersItemIdentification: {
          ID: {
            value: '4'
          }
        }
      },
      Price: {
        PriceAmount: {
          value: 100,
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
    },
    {
      ID: {
        value: '5'
      },
      InvoicedQuantity: {
        value: 5,
        unitCode: 'EA'
      },
      LineExtensionAmount: {
        value: 500,
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
                value: 500,
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
                  value: 'Z',
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
                    value: 'JP 非課税 0%'
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
            value: 'fff'
          }
        ],
        Name: {
          value: 'fff'
        },
        SellersItemIdentification: {
          ID: {
            value: '5'
          }
        }
      },
      Price: {
        PriceAmount: {
          value: 100,
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
