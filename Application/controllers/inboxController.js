const getInbox = async function (accessToken, refreshToken, pageId, tenantId) {
  const qs = require('qs')
  const processStatus = {
    PAID_CONFIRMED: 0, // 入金確認済み
    PAID_UNCONFIRMED: 1, // 送金済み
    ACCEPTED: 2, // 受理済み
    DELIVERED: 3 // 受信済み
  }
  const apiManager = require('./apiManager')
  const findDocuments = '/documents'
  const withouttag = ['archived', 'AP_DOCUMENT_Draft', 'PARTNER_DOCUMENT_DRAFT', 'tsgo-document']
  const state = ['DELIVERED', 'ACCEPTED', 'PAID_UNCONFIRMED', 'PAID_CONFIRMED']
  const type = 'invoice'
  const _onlyIndex = true
  const ascending = false
  const onlydeleted = false
  const onlydrafts = false
  const sentTo = tenantId
  const stag = ['sales', 'purchases', 'draft']
  const onePagePerItemCount = 20 // １ページあたり表示する項目の数
  const page = pageId - 1 // 現在ページ
  const query = qs
    .stringify({
      withouttag: withouttag,
      state: state,
      type: type,
      _onlyIndex: _onlyIndex,
      ascending: ascending,
      onlydeleted: onlydeleted,
      onlydrafts: onlydrafts,
      sentTo: sentTo,
      stag: stag,
      limit: onePagePerItemCount,
      page: page
    })
    .replace(/%26/g, '&')
    .replace(/%3D/g, '=')
    .replace(/%5B0%5D/g, '')
    .replace(/%5B1%5D/g, '')
    .replace(/%5B2%5D/g, '')
    .replace(/%5B3%5D/g, '')

  const documents = await apiManager.accessTradeshift(accessToken, refreshToken, 'get', `${findDocuments}?${query}`)

  // アクセストークンの有効期限が終わるの場合
  if (documents.Document === undefined) {
    return {
      previous: 0,
      next: 1,
      list: []
    }
  }

  // 文書をリスト化する
  const documentList = documents.Document.map((item, idx) => {
    const ammount = function () {
      if (item.ItemInfos[1] === undefined) return '-'
      return Math.floor(item.ItemInfos[1].value).toLocaleString('ja-JP')
    }

    return {
      no: idx + 1 + page * onePagePerItemCount,
      invoiceNo: item.ID,
      status: processStatus[`${item.UnifiedState}`] ?? '-',
      currency: item.ItemInfos[0].value ?? '-',
      ammount: ammount(),
      sentTo: item.SenderCompanyName ?? '-',
      sentBy: item.ReceiverCompanyName ?? '-',
      updated: item.LastEdit !== undefined ? item.LastEdit.substring(0, 10) : '-',
      expire: item.DueDate ?? '-',
      documentId: item.DocumentId
    }
  })

  const numPage = documents.numPages
  const currPage = documents.pageId

  // 更新日で整列(更新日がない場合、期限日で整列)
  const updated = documentList.sort((next, prev) => {
    let nextDate = null
    let prevDate = null
    if (next.udated === '-' || prev.updated === '-') {
      nextDate = new Date(next.expire)
      prevDate = new Date(prev.expire)
    }

    return nextDate > prevDate ? 1 : nextDate < prevDate ? -1 : 0
  })

  // 結果返却
  return {
    list: updated,
    numPages: numPage,
    currPage: currPage + 1
  }
}

const getInvoiceDetail = async function (accessTk, refreshTk, invoiceId) {
  return dummyData
}
module.exports = {
  getInbox: getInbox,
  getInvoiceDetail: getInvoiceDetail
}

const dummyData = {
  invoiceId: 'TEST202111212',
  AccountingSupplierParty: {
    Party: {
      PartyIdentification: [
        {
          ID: {
            value: '99999999-9999-9999-9999-9999999999999',
            schemeID: 'TS:ID',
            schemeName: 'Tradeshift identifier'
          }
        },
        {
          ID: {
            value: '12345678',
            schemeID: 'TS:REGNO',
            schemeName: 'ACN'
          }
        }
      ],
      PartyName: [
        {
          Name: {
            value: '(株)ABCDEFGHIJKLMNOPQRSTUあいうえお'
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
          value: '太田'
        },
        AdditionalStreetName: {
          value: '太田'
        },
        BuildingNumber: {
          value: ''
        },
        CityName: {
          value: '東京度'
        },
        PostalZone: {
          value: '123-4567'
        },
        Country: {
          IdentificationCode: {
            value: 'JP'
          }
        }
      },
      PartyLeagalEntyty: [
        {
          RegistrationAddress: {
            AddressFormatCode: {
              value: '5',
              listID: 'UN/ECE 3477',
              listAgencyID: '6'
            },
            Postbox: {
              value: 100
            },
            StreetName: {
              value: '春日部市、A１－２－３'
            },
            AdditionalStreetName: {
              value: 'テストヴィレッジ/９９９号'
            },
            CityName: {
              value: 'テスト県'
            },
            PostalZone: {
              value: '114-0014'
            },
            CorporateRegistrationScheme: {
              ID: {
                value: 'SOLE'
              }
            }
          }
        }
      ],
      Contact: {
        ID: {
          value: 'db9be280-c77b-4e9e-b138-ef96bdba5288',
          schemeURI: 'http://tradeshift.com/api/1.0/userId'
        },
        Name: {
          value: 'ExampleInc'
        },
        Telephone: {
          value: '000-0000-0000'
        },
        ElectronicMail: {
          value: 'ceomail@testdata'
        }
      },
      Person: {
        FirtName: {
          value: '名'
        },
        FamilyName: {
          value: '苗字'
        }
      }
    }
  },
  AccountingCustomerParty: {
    Party: {
      PartyIdentification: [
        {
          ID: {
            value: 'aa99999-aa99-aa99-aa99-9999999999999',
            schemeID: 'TS:REGNO',
            schemeName: 'company id'
          }
        },
        {
          ID: {
            value: 'GLNコード',
            schemeID: 'GLN'
          }
        },
        {
          ID: {
            value: '法人番号12345678',
            schemeID: 'JP:CT'
          }
        }
      ],
      PartyName: [
        {
          Name: {
            value: '(株)宛先会社'
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
        PostBox: {
          value: '私書箱番号'
        },
        StreetName: {
          value: '丁目番地'
        },
        AddtionalStreetName: {
          value: 'ビル名'
        },
        BuildingNumber: {
          value: ''
        },
        CityName: {
          value: '東京都'
        },
        PostalZone: {
          value: '郵便番号123-4567'
        },
        Country: {
          IdentificationCode: {
            value: 'JP'
          }
        }
      },
      PartyLegalEntity: [
        {
          RegistrationName: {
            value: '(株)宛先会社'
          }
        },
        {
          CompanyId: {
            value: 'aa99999-aa99-aa99-aa99-9999999999999',
            schemeID: 'TS:REGNO'
          }
        }
      ],
      Contact: {}
    }
  }
}
