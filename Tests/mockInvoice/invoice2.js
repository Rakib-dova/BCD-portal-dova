'use stric'
module.exports = {
  DocumentType: 'InvoiceType',
  UBLExtensions: {
    UBLExtension: [
      {
        ExtensionURI: {
          value: 'urn:oasis:names:specification:ubl:dsig:enveloped'
        },
        ExtensionContent: {
          value:
            '<?xml version="1.0" encoding="UTF-16"?><sig:UBLDocumentSignatures xmlns:sig="urn:oasis:names:specification:ubl:schema:xsd:CommonSignatureComponents-2" xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2" xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2" xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2" xmlns:ccts="urn:oasis:names:specification:ubl:schema:xsd:CoreComponentParameters-2" xmlns:ext="urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2" xmlns:extension="urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2" xmlns:ns7="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2" xmlns:sdt="urn:oasis:names:specification:ubl:schema:xsd:SpecializedDatatypes-2" xmlns:udt="urn:un:unece:uncefact:data:specification:UnqualifiedDataTypesSchemaModule:2"><sac:SignatureInformation xmlns:sac="urn:oasis:names:specification:ubl:schema:xsd:SignatureAggregateComponents-2"><cbc:ID>urn:oasis:names:specification:ubl:signatures:1</cbc:ID><Signature xmlns="http://www.w3.org/2000/09/xmldsig#"><SignedInfo><CanonicalizationMethod Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/><SignatureMethod Algorithm="http://www.w3.org/2000/09/xmldsig#rsa-sha1"/><Reference URI=""><Transforms><Transform Algorithm="http://www.w3.org/2002/06/xmldsig-filter2"><XPath xmlns="http://www.w3.org/2002/06/xmldsig-filter2" Filter="subtract">//sig:UBLDocumentSignatures</XPath></Transform></Transforms><DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha512"/><DigestValue>9BUCXoQlurdWXnIx80vYEph84boTXj5Eb5vzRSOBjT934S89BBV1OPXOFPPW1aivBqIGjwVGjcQX\ncW6lBB+Fag==</DigestValue></Reference></SignedInfo><SignatureValue>eFgSl4UZs8lc09wVTTLwvRWVUq3PidtqPU/kApfHxsUG9sgWh6B0ZbIBo34s3kpKQOXCGoJnD4SI\nsjFXJmfSsVzzPpca2+ivMuLi/JHpYu1xRTWSx8fklE7VUEDH+TtAJdZzsOlA4181838bB+XSUbHL\nQV/r85ow+7j4jx9Doek=</SignatureValue><KeyInfo><KeyValue><RSAKeyValue><Modulus>qjPnoh/BgvN22UWUVcwVYr9xWj49ffp2obvmR5WttIJssS5ZbCYOxjIjO3gIcNAu6NLFn5gpsp95\nFPNY1JDGII1qPnp9zyI6HKyA3yb5Vq9ONm2cLRfOz2zrvPdG+38ZLMzHe1rLALXEoIqfJWWt3u2B\nUvWP+h5ZYzm8px1gmJM=</Modulus><Exponent>AQAB</Exponent></RSAKeyValue></KeyValue><X509Data><X509Certificate>MIICATCCAWoCCQCo1AOqHHrvcDANBgkqhkiG9w0BAQUFADBFMQswCQYDVQQGEwJBVTETMBEGA1UE\nCBMKU29tZS1TdGF0ZTEhMB8GA1UEChMYSW50ZXJuZXQgV2lkZ2l0cyBQdHkgTHRkMB4XDTEwMDQw\nOTA5MTkyN1oXDTI5MTIyNTA5MTkyN1owRTELMAkGA1UEBhMCQVUxEzARBgNVBAgTClNvbWUtU3Rh\ndGUxITAfBgNVBAoTGEludGVybmV0IFdpZGdpdHMgUHR5IEx0ZDCBnzANBgkqhkiG9w0BAQEFAAOB\njQAwgYkCgYEAqjPnoh/BgvN22UWUVcwVYr9xWj49ffp2obvmR5WttIJssS5ZbCYOxjIjO3gIcNAu\n6NLFn5gpsp95FPNY1JDGII1qPnp9zyI6HKyA3yb5Vq9ONm2cLRfOz2zrvPdG+38ZLMzHe1rLALXE\noIqfJWWt3u2BUvWP+h5ZYzm8px1gmJMCAwEAATANBgkqhkiG9w0BAQUFAAOBgQARLOs0egYgj7q7\nmN0uthdbzAEg75Ssgh4JuOJ3iXI/sbqAIQ9uwsLodo+Fkpb5AiLlNFu7mCZXG/SzAAO3ZBLAWy4S\nKsXANu2/s6U5ClYd93HoZwzXobKb+2+aMf7KiAg1wHPUcyKx2c5nplgqQ7Hwldk9S9yzaRsYEGWT\n+xpSUA==</X509Certificate></X509Data></KeyInfo></Signature></sac:SignatureInformation></sig:UBLDocumentSignatures>'
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
    value: 'A01002'
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
            value: 'f783be0e-e716-4eab-a7ec-5ce36b3c7b31',
            schemeID: 'TS:ID'
          }
        }
      ],
      PartyName: [
        {
          Name: {
            value: '株式会社シー・エス・イー'
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
      PartyName: [
        {
          Name: {
            value: '(株)シナブロ'
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
      Contact: { ID: { value: 'abc' } }
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
