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
  const InvoiceDetail = require('../lib/invoiceDetail')
  const displayInvoice = new InvoiceDetail(dummyData)
  return displayInvoice
}
module.exports = {
  getInbox: getInbox,
  getInvoiceDetail: getInvoiceDetail
}

const dummyData = {
  DocumentType: 'InvoiceType',
  UBLExtensions: {
    UBLExtension: [
      {
        ExtensionURI: {
          value: 'http://tradeshift.com/api/public/1.0/TaxExchangeRate'
        },
        ExtensionContent: {
          value:
            '<?xml version="1.0" encoding="UTF-16"?><ts:TaxExchangeRate xmlns:ts="http://tradeshift.com/api/public/1.0" xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2" xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2" xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2" xmlns:ccts="urn:oasis:names:specification:ubl:schema:xsd:CoreComponentParameters-2" xmlns:ext="urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2" xmlns:ns7="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2" xmlns:sdt="urn:oasis:names:specification:ubl:schema:xsd:SpecializedDatatypes-2" xmlns:udt="urn:un:unece:uncefact:data:specification:UnqualifiedDataTypesSchemaModule:2"><ts:PayableAlternativeAmount>15555</ts:PayableAlternativeAmount>\n        </ts:TaxExchangeRate>'
        }
      },
      {
        ExtensionURI: {
          value: 'urn:oasis:names:specification:ubl:dsig:enveloped'
        },
        ExtensionContent: {
          value:
            '<?xml version="1.0" encoding="UTF-16"?><sig:UBLDocumentSignatures xmlns:sig="urn:oasis:names:specification:ubl:schema:xsd:CommonSignatureComponents-2" xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2" xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2" xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2" xmlns:ccts="urn:oasis:names:specification:ubl:schema:xsd:CoreComponentParameters-2" xmlns:ext="urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2" xmlns:extension="urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2" xmlns:ns7="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2" xmlns:sdt="urn:oasis:names:specification:ubl:schema:xsd:SpecializedDatatypes-2" xmlns:udt="urn:un:unece:uncefact:data:specification:UnqualifiedDataTypesSchemaModule:2"><sac:SignatureInformation xmlns:sac="urn:oasis:names:specification:ubl:schema:xsd:SignatureAggregateComponents-2"><cbc:ID>urn:oasis:names:specification:ubl:signatures:1</cbc:ID><Signature xmlns="http://www.w3.org/2000/09/xmldsig#"><SignedInfo><CanonicalizationMethod Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/><SignatureMethod Algorithm="http://www.w3.org/2000/09/xmldsig#rsa-sha1"/><Reference URI=""><Transforms><Transform Algorithm="http://www.w3.org/2002/06/xmldsig-filter2"><XPath xmlns="http://www.w3.org/2002/06/xmldsig-filter2" Filter="subtract">//sig:UBLDocumentSignatures</XPath></Transform></Transforms><DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha512"/><DigestValue>VJOwmcVi1GwYKrEm3fF9nnzitRQz5IBpuNxBsehuoFpFoXKvxi5GKohXT+mxeFzNygc8B8T40ZJB\neL57018xgQ==</DigestValue></Reference></SignedInfo><SignatureValue>ZWZV9Fxl2Gni3TBVslDic3WIpTLk68dlIxwI53LUVDLYgalHDljZXil88W5hgu84wG9fw/TYXJRL\nN5xf0ZWvqsTposSvtVm6+tapQHM9BoS3sr/JjwXjnlcoInUlQeasfKwTDJE6WhnPQ3f80vTjIR5n\nK0gVETfPGtc0H+36fcw=</SignatureValue><KeyInfo><KeyValue><RSAKeyValue><Modulus>qjPnoh/BgvN22UWUVcwVYr9xWj49ffp2obvmR5WttIJssS5ZbCYOxjIjO3gIcNAu6NLFn5gpsp95\nFPNY1JDGII1qPnp9zyI6HKyA3yb5Vq9ONm2cLRfOz2zrvPdG+38ZLMzHe1rLALXEoIqfJWWt3u2B\nUvWP+h5ZYzm8px1gmJM=</Modulus><Exponent>AQAB</Exponent></RSAKeyValue></KeyValue><X509Data><X509Certificate>MIICATCCAWoCCQCo1AOqHHrvcDANBgkqhkiG9w0BAQUFADBFMQswCQYDVQQGEwJBVTETMBEGA1UE\nCBMKU29tZS1TdGF0ZTEhMB8GA1UEChMYSW50ZXJuZXQgV2lkZ2l0cyBQdHkgTHRkMB4XDTEwMDQw\nOTA5MTkyN1oXDTI5MTIyNTA5MTkyN1owRTELMAkGA1UEBhMCQVUxEzARBgNVBAgTClNvbWUtU3Rh\ndGUxITAfBgNVBAoTGEludGVybmV0IFdpZGdpdHMgUHR5IEx0ZDCBnzANBgkqhkiG9w0BAQEFAAOB\njQAwgYkCgYEAqjPnoh/BgvN22UWUVcwVYr9xWj49ffp2obvmR5WttIJssS5ZbCYOxjIjO3gIcNAu\n6NLFn5gpsp95FPNY1JDGII1qPnp9zyI6HKyA3yb5Vq9ONm2cLRfOz2zrvPdG+38ZLMzHe1rLALXE\noIqfJWWt3u2BUvWP+h5ZYzm8px1gmJMCAwEAATANBgkqhkiG9w0BAQUFAAOBgQARLOs0egYgj7q7\nmN0uthdbzAEg75Ssgh4JuOJ3iXI/sbqAIQ9uwsLodo+Fkpb5AiLlNFu7mCZXG/SzAAO3ZBLAWy4S\nKsXANu2/s6U5ClYd93HoZwzXobKb+2+aMf7KiAg1wHPUcyKx2c5nplgqQ7Hwldk9S9yzaRsYEGWT\n+xpSUA==</X509Certificate></X509Data></KeyInfo></Signature></sac:SignatureInformation></sig:UBLDocumentSignatures>'
        }
      }
    ]
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
    value: 'PBI2331Invoice1'
  },
  IssueDate: {
    value: '2021-12-07'
  },
  InvoiceTypeCode: {
    value: '380',
    listID: 'UN/ECE 1001 Subset',
    listAgencyID: '6',
    listVersionID: 'D08B'
  },
  Note: [
    {
      value: 'その他特記事項（オプション）'
    }
  ],
  TaxPointDate: {
    value: '2021-12-24'
  },
  DocumentCurrencyCode: {
    value: 'JPY'
  },
  AccountingCost: {
    value: '部門'
  },
  OrderReference: {
    ID: {
      value: '注文書番号'
    },
    IssueDate: {
      value: '2021-12-16'
    }
  },
  BillingReference: [
    {
      InvoiceDocumentReference: {
        ID: {
          value: '参考情報'
        }
      }
    }
  ],
  ContractDocumentReference: [
    {
      ID: {
        value: '契約書番号'
      }
    }
  ],
  AdditionalDocumentReference: [
    {
      ID: {
        value: '輸送情報'
      },
      DocumentTypeCode: {
        value: 'BOL ID',
        listID: 'urn:tradeshift.com:api:1.0:documenttypecode'
      }
    },
    {
      ID: {
        value: '暫定時間'
      },
      DocumentTypeCode: {
        value: 'Interim Hours',
        listID: 'urn:tradeshift.com:api:1.0:documenttypecode'
      }
    },
    {
      ID: {
        value: '通関識別情報'
      },
      DocumentTypeCode: {
        value: 'Clearance Clave',
        listID: 'urn:tradeshift.com:api:1.0:documenttypecode'
      }
    },
    {
      ID: {
        value: 'Tradeshiftクリアランス'
      },
      DocumentTypeCode: {
        value: 'TS Clearance',
        listID: 'urn:tradeshift.com:api:1.0:documenttypecode'
      }
    },
    {
      ID: {
        value: '備考'
      },
      DocumentTypeCode: {
        value: 'File ID',
        listID: 'urn:tradeshift.com:api:1.0:documenttypecode'
      }
    },
    {
      ID: {
        value: '予約番号'
      },
      DocumentTypeCode: {
        value: 'BookingNumber',
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
    },
    {
      ID: {
        value: '1'
      },
      DocumentTypeCode: {
        value: 'humanreadableversion',
        listID: 'urn:tradeshift.com:api:1.0:documenttypecode'
      },
      Attachment: {
        EmbeddedDocumentBinaryObject: {
          value:
            'JVBERi0xLjQKJfbk/N8KMSAwIG9iago8PAovVHlwZSAvQ2F0YWxvZwovVmVyc2lvbiAvMS40Ci9QYWdlcyAyIDAgUgovT3V0bGluZXMgMyAwIFIKPj4KZW5kb2JqCjQgMCBvYmoKPDwKL0NyZWF0b3IgKFRyYWRlc2hpZnQpCi9Qcm9kdWNlciAoVHJhZGVzaGlmdCkKL01vZERhdGUgKEQ6MjAyMTEyMDYxMjI5MjErMDAnMDAnKQovU3ViamVjdCA8RkVGRjAwNTAwMDQyMDAzMjAwMzMwMDMzMDAzMTY2MEU3RDMwRkYxMT4KL0NyZWF0aW9uRGF0ZSAoRDoyMDIxMTIwNjExNDIxNiswMCcwMCcpCi9LZXl3b3JkcyAoKQovVGl0bGUgKGNvbS50cmFkZXNoaWZ0LnNlcnZpY2UuZG9jdW1lbnQuRG9jdW1lbnRUeXBlU2VydmljZSRfY2xvc3VyZTEkX2Nsb3N1cmUxM0A2YjJhYTI1MCB8IFRyYWRlc2hpZnQpCj4+CmVuZG9iagoyIDAgb2JqCjw8Ci9UeXBlIC9QYWdlcwovS2lkcyBbNSAwIFIgNiAwIFIgNyAwIFJdCi9Db3VudCAzCj4+CmVuZG9iagozIDAgb2JqCjw8Ci9UeXBlIC9PdXRsaW5lcwovQ291bnQgNDMKL0ZpcnN0IDggMCBSCi9MYXN0IDkgMCBSCj4+CmVuZG9iago1IDAgb2JqCjw8Ci9Db250ZW50cyAxMCAwIFIKL1R5cGUgL1BhZ2UKL1Jlc291cmNlcyAxMSAwIFIKL1BhcmVudCAyIDAgUgovTWVkaWFCb3ggWzAuMCAwLjAgNTk1LjUgODQyLjBdCi9Dcm9wQm94IFswLjAgMC4wIDU5NS41IDg0Mi4wXQovUm90YXRlIDAKPj4KZW5kb2JqCjYgMCBvYmoKPDwKL0NvbnRlbnRzIDEyIDAgUgovVHlwZSAvUGFnZQovUmVzb3VyY2VzIDEzIDAgUgovUGFyZW50IDIgMCBSCi9NZWRpYUJveCBbMC4wIDAuMCA1OTUuNSA4NDIuMF0KL0Nyb3BCb3ggWzAuMCAwLjAgNTk1LjUgODQyLjBdCi9Sb3RhdGUgMAo+PgplbmRvYmoKNyAwIG9iago8PAovQ29udGVudHMgMTQgMCBSCi9UeXBlIC9QYWdlCi9SZXNv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b2NTZXQgWy9QREYgL1RleHQgL0ltYWdlQiAvSW1hZ2VDIC9JbWFnZUldCi9Gb250IDIyIDAgUgo+PgplbmRvYmoKMTYgMCBvYmoKPDwKL0Rlc3QgWzUgMCBSIC9GaXRIIDg0Ml0KL05leHQgMjMgMCBSCi9UaXRsZSA8RkVGRjhBQ0I2QzQyNjZGODc1NkE1M0Y3PgovUGFyZW50IDggMCBSCj4+CmVuZG9iagoxNyAwIG9iago8PAovRGVzdCBbNSAwIFIgL0ZpdEggODQyXQovVGl0bGUgPEZFRkY1NDA4OEEwODAwMjAwMDRBMDA1MDAwNTk+Ci9QYXJlbnQgOCAwIFIKL1ByZXYgMjMgMCBSCj4+CmVuZG9iagoxOCAwIG9iago8PAovRGVzdCBbNSAwIFIgL0ZpdEggODQyXQovTmV4dCAyNCAwIFIKL1RpdGxlIDxGRUZGNUI5QjUxNDg+Ci9QYXJlbnQgOSAwIFIKPj4KZW5kb2JqCjE5IDAgb2JqCjw8Ci9EZXN0IFs1IDAgUiAvRml0SCA4NDJdCi9Db3VudCA5Ci9UaXRsZSA8RkVGRjY1MkY2MjU1MzA0NDY3NjE0RUY2MzA2ODYyNEI2QkI1PgovUGFyZW50IDkgMCBSCi9GaXJzdCAyNSAwIFIKL1ByZXYgMjYgMCBSCi9MYXN0IDI3IDAgUgo+PgplbmRvYmoKMjAgMCBvYmoKPDwKL0YxIDI4IDAgUgo+PgplbmRvYmoKMjEgMCBvYmoKPDwKL0YxIDI4IDAgUgo+PgplbmRvYmoKMjIgMCBvYmoKPDwKL0YxIDI4IDAgUgo+PgplbmRvYmoKMjMgMCBvYmoKPDwKL0Rlc3QgWzUgMCBSIC9GaXRIIDg0Ml0KL05leHQgMTcgMCBSCi9UaXRsZSA8RkVGRjhBQ0I2QzQyNjVFNT4KL1BhcmVudCA4IDAgUgovUHJldiAxNiAwIFIKPj4KZW5kb2JqCjI0IDAgb2JqCjw8Ci9EZXN0IFs1IDAgUiAvRml0SCA4NDJdCi9Db3VudCAxCi9OZXh0IDI2IDAgUgovVGl0bGUgPEZFRkYzMEI1MzBENzMwRTkzMEE0MzBFNDMwRkMwMDMxPgovUGFyZW50IDkgMCBSCi9GaXJzdCAyOSAwIFIKL1ByZXYgMTggMCBSCi9MYXN0IDI5IDAgUgo+PgplbmRvYmoKMjUgMCBvYmoKPDwKL0Rlc3QgWzUgMCBSIC9GaXRIIDg0Ml0KL05leHQgMzAgMCBSCi9UaXRsZSA8RkVGRjY1MkY2MjU1MzA0NDY3NjE0RUY2PgovUGFyZW50IDE5IDAgUgo+PgplbmRvYmoKMjYgMCBvYmoKPDwKL0Rlc3QgWzUgMCBSIC9GaXRIIDg0Ml0KL0NvdW50IDI0Ci9OZXh0IDE5IDAgUgovVGl0bGUgPEZFRkYzMEQwMzBBNDMwRTQzMEZDMDAzMT4KL1BhcmVudCA5IDAgUgovRmlyc3QgMzEgMCBSCi9QcmV2IDI0IDAgUgovTGFzdCAzMiAwIFIKPj4KZW5kb2JqCjI3IDAgb2JqCjw8Ci9EZXN0IFs1IDAgUiAvRml0SCA4NDJdCi9Db3VudCAxCi9UaXRsZSA8RkVGRjU2RkQ5NjlCOTZGQjRGRTE5MDAxOTFEMTMwNjc2NTJGNjI1NTMwNDY+Ci9QYXJlbnQgMTkgMCBSCi9GaXJzdCAzMyAwIFIKL1ByZXYgMzQgMCBSCi9MYXN0IDMzIDAgUgo+PgplbmRvYmoKMjggMCBvYmoKPDwKL1N1YnR5cGUgL1R5cGUwCi9UeXBlIC9Gb250Ci9CYXNlRm9udCAvRFhDU0ZMK0Ryb2lkU2Fuc0ZhbGxiYWNrCi9FbmNvZGluZyAvSWRlbnRpdHktSAovRGVzY2VuZGFudEZvbnRzIFszNSAwIFJdCi9Ub1VuaWNvZGUgMzYgMCBSCj4+CmVuZG9iagoyOSAwIG9iago8PAovRGVzdCBbNSAwIFIgL0ZpdEggODQyXQovVGl0bGUgPEZFRkY1REVFNTFGQTRFQkE+Ci9QYXJlbnQgMjQgMCBSCj4+CmVuZG9iagozMCAwIG9iago8PAovRGVzdCBbNSAwIFIgL0ZpdEggODQyXQovTmV4dCAzNyAwIFIKL1RpdGxlIDxGRUZGNzNGRTkxRDE2MjU1MzA0ND4KL1BhcmVudCAxOSAwIFIKL1ByZXYgMjUgMCBSCj4+CmVuZG9iagozMSAwIG9iago8PAovRGVzdCBbNSAwIFIgL0ZpdEggODQyXQovTmV4dCAzOCAwIFIKL1RpdGxlIDxGRUZGOEFDQjZDNDI2NkY4NzU2QTUzRjc+Ci9QYXJlbnQgMjYgMCBSCj4+CmVuZG9iagozMiAwIG9iago8PAovRGVzdCBbNSAwIFIgL0ZpdEggODQyXQovVGl0bGUgKEJvb2tpbmdOdW1iZXIpCi9QYXJlbnQgMjYgMCBSCi9QcmV2IDM5IDAgUgo+PgplbmRvYmoKMzMgMCBvYmoKPDwKL0Rlc3QgWzUgMCBSIC9GaXRIIDg0Ml0KL1RpdGxlIDxGRUZGMzA1RDMwNkU0RUQ2NzI3OThBMTg0RThCOTgwNT4KL1BhcmVudCAyNyAwIFIKPj4KZW5kb2JqCjM0IDAgb2JqCjw8Ci9EZXN0IFs1IDAgUiAvRml0SCA4NDJdCi9OZXh0IDI3IDAgUgovVGl0bGUgPEZFRkYwMDQ5MDA0MjAwNDEwMDRFMzA2NzY1MkY2MjU1MzA0Nj4KL1BhcmVudCAxOSAwIFIKL1ByZXYgNDAgMCBSCj4+CmVuZG9iagozNSAwIG9iago8PAovRFcgMTAwMAovU3VidHlwZSAvQ0lERm9udFR5cGUyCi9DSURTeXN0ZW1JbmZvIDQxIDAgUgovVHlwZSAvRm9udAovQmFzZUZvbnQgL0RYQ1NGTCtEcm9pZFNhbnNGYWxsYmFjawovRm9udERlc2NyaXB0b3IgNDIgMCBSCi9XIFszIFsyNjFdCiA4IFs4MjRdCiAxMSBbMzAwIDMwMF0KIDE0IFs1NTAgMjUwIDMyMCAyNjkgMzc1IDU1MCA1NTAgNTUwIDU1MCA1NTAKNTUwIDU1MCA1NTAgNTUwIDU1MCAyNjldCiAzNSBbODY3IDYwOSA2MjEgNjAxIDY4MyA1MjcgNDkyIDY5MSA3MDMgMzM5CjI2OSA1NzggNDkyIDg3MSA3MzAgNzQyIDU3OF0KNTMgWzU4OSA1MTkgNTE5IDY5OSA1NjYgODgyIDU0NiA1MjddCiA2OCBbNTMxIDU4NSA0NjQgNTg1IDUzNSAzMjggNTE5IDU4OSAyNTddCiA3OSBbMjU3IDg5NCA1ODkgNTc4IDU4NV0KIDg1IFszOTggNDUzIDMzOSA1ODkgNDgwIDc0NiA1MDAgNDg4XQpdCi9DSURUb0dJRE1hcCAvSWRlbnRpdHkKPj4KZW5kb2JqCjM2IDAgb2JqCjw8Ci9MZW5ndGggMjA5OQovRmlsdGVyIC9GbGF0ZURlY29kZQo+PgpzdHJlYW0NCnicbZhLix+7EcX38ylm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1nmNSf4CaGgf8eBP/3Tv+/p/2xvbDub73r13b7J338tnb8kPNA7ku9Kmnz2TiazdqPRjKRJLfla/mRnFz7705H33dY72/za1c79AvjSrNqvp//gTH5q/e/vd85fWt/txP91o1WVZIr8nPvYJ+b7CWNJfJfNOFn5xQc8JYmxL3h1deT21key7sXtwT23/Benk7omK625K6kd3teeq7dZ3Kll2bF9aa87OzogTJPuW497l2OJXl/XuuJ+SFuKX8q7L06PL7tBbspvPZ4/VL3n44MHagf1PP3xtuivZlWxt1Gvd8dpErVOf6PvIcmZLzgHu8yuiC7w9P2Yjf8VB8bdCTVe8FQLuB6QkcXf/O6i3dPd1jh27bVPayFub21l10yWdazuH05nWjtZltzy8r7P3igObJqYrm3dV/oH8KvzhbDbf1NgkHyZqtKq1I6n87c8q/i+DTj7b97cQI1tShKyxq7Nnz86du3Z1du/esWNXr9HY0bxQ/vnlXq/bfbzXPXCg23u8e9XU1NRxD2NvnVd4aQU093use/bs29e/7J9qt/e0L5N/PM1ODzR7/S97Kc1NYx9589/6Mfqbfk2xEIXphd4usEcOXntuOu9ubcxNzswnW3udvJl1usm97lD38OFLPnH5od9sbL4gy+Xlrm696xd6U+lUq7vlI3Nz3QPd7oEFug96fZL3IRa+JlSc069MUuDET090Uv/v9ar53qtvvtXt29GY39m8KLusds317thd+RVZtVPNvlPxkt3T3bRper69dWqXX0zu7Vb82ngmb6bNvL/H4K2L/E7f4PctKtXp4BuHl1LrB9Zrj35xdtv4ZXmWNMY79crh3sHudXm7lSW95gvdgwevOXz4mv6/v93o5uMfStJN7U017+8f/r56LatWa8kt3qO5YuEopryT6SX/5/0zGNj1oK8HIVYjvHC85rvS2q56ZapSO3j7xHWfPjpxw75KtXam//d7cr6n4r3K1ic+0erUaw91L/f/Laz9vtGPWf1Gf008WR38VcD9/SH2b7Zsk09ijjfTSnX71gt6v9G9fvv85NT45ESWbtt68//0j/p4frz/PZIyPH85O9tsVrPxRn1iYuuWw53f6N44P9/ryWSZbNty62/976rv/2bs6/216BF9J3Qwzrlo3U9vduNosFPl//5kZtuVcjbyyvmZzVfeMn75Fa3JydYVvenK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/wdZo8atDQplbmRzdHJlYW0KZW5kb2JqCjQ4IDAgb2JqCjw8Ci9EZXN0IFs1IDAgUiAvRml0SCA4NDJdCi9OZXh0IDUwIDAgUgovVGl0bGUgPEZFRkY5MDFBOENBOD4KL1BhcmVudCAyNiAwIFIKL1ByZXYgNDQgMCBSCj4+CmVuZG9iago0OSAwIG9iago8PAovRGVzdCBbNSAwIFIgL0ZpdEggODQyXQovTmV4dCA0NSAwIFIKL1RpdGxlIChDbGVhcmFuY2UgQ2xhdmUpCi9QYXJlbnQgMjYgMCBSCi9QcmV2IDUxIDAgUgo+PgplbmRvYmoKNTAgMCBvYmoKPDwKL0Rlc3QgWzUgMCBSIC9GaXRIIDg0Ml0KL05leHQgNTIgMCBSCi9UaXRsZSA8RkVGRjY1MkY2MjU1NjcxRjY1RTU+Ci9QYXJlbnQgMjYgMCBSCi9QcmV2IDQ4IDAgUgo+PgplbmRvYmoKNTEgMCBvYmoKPDwKL0Rlc3QgWzUgMCBSIC9GaXRIIDg0Ml0KL05leHQgNDkgMCBSCi9UaXRsZSAoSW50ZXJpbSBIb3VycykKL1BhcmVudCAyNiAwIFIKL1ByZXYgNTMgMCBSCj4+CmVuZG9iago1MiAwIG9iago8PAovRGVzdCBbNSAwIFIgL0ZpdEggODQyXQovTmV4dCA1NCAwIFIKL1RpdGxlIDxGRUZGNkNFODY1ODc2NkY4NzU2QTUzRjc+Ci9QYXJlbnQgMjYgMCBSCi9QcmV2IDUwIDAgUgo+PgplbmRvYmoKNTMgMCBvYmoKPDwKL0Rlc3QgWzUgMCBSIC9GaXRIIDg0Ml0KL05leHQgNTEgMCBSCi9UaXRsZSAoQk9MIElEKQovUGFyZW50IDI2IDAgUgovUHJldiA1NSAwIFIKPj4KZW5kb2JqCjU0IDAgb2JqCjw8Ci9EZXN0IFs1IDAgUiAvRml0SCA4NDJdCi9OZXh0IDU2IDAgUgovVGl0bGUgPEZFRkY2Q0U4NjU4NzY2Rjg3NjdBODg0QzY1RTU+Ci9QYXJlbnQgMjYgMCBSCi9QcmV2IDUyIDAgUgo+PgplbmRvYmoKNTUgMCBvYmoKPDwKL0Rlc3QgWzUgMCBSIC9GaXRIIDg0Ml0KL05leHQgNTMgMCBSCi9UaXRsZSA8RkVGRjdEMEQ2NzFGPgovUGFyZW50IDI2IDAgUgovUHJldiA1NyAwIFIKPj4KZW5kb2JqCjU2IDAgb2JqCjw8Ci9EZXN0IFs1IDAgUiAvRml0SCA4NDJdCi9OZXh0IDU4IDAgUgovVGl0bGUgPEZFRkY1M0MyODAwMzYwQzU1ODMxPgovUGFyZW50IDI2IDAgUgovUHJldiA1NCAwIFIKPj4KZW5kb2JqCjU3IDAgb2JqCjw8Ci9EZXN0IFs1IDAgUiAvRml0SCA4NDJdCi9OZXh0IDU1IDAgUgovVGl0bGUgPEZFRkYwMDQ0MDA1NTAwNEUwMDUzMzBDQTMwRjMzMEQwMzBGQz4KL1BhcmVudCAyNiAwIFIKL1ByZXYgNTkgMCBSCj4+CmVuZG9iago1OCAwIG9iago8PAovRGVzdCBbNSAwIFIgL0ZpdEggODQyXQovTmV4dCA2MCAwIFIKL1RpdGxlIDxGRUZGNTk1MTdEMDQ2NkY4NzU2QTUzRjc+Ci9QYXJlbnQgMjYgMCBSCi9QcmV2IDU2IDAgUgo+PgplbmRvYmoKNTkgMCBvYmoKPDwKL0Rlc3QgWzUgMCBSIC9GaXRIIDg0Ml0KL05leHQgNTcgMCBSCi9UaXRsZSA8RkVGRjhDQTk1OEYyODAwNTMwNkU2MjRCNjU3MDY1OTk3NTZBNTNGNz4KL1BhcmVudCAyNiAwIFIKL1ByZXYgNjEgMCBSCj4+CmVuZG9iago2MCAwIG9iago8PAovRGVzdCBbNSAwIFIgL0ZpdEggODQyXQovTmV4dCA2MiAwIFIKL1RpdGxlIDxGRUZGOTBFODk1ODA+Ci9QYXJlbnQgMjYgMCBSCi9QcmV2IDU4IDAgUgo+PgplbmRvYmoKNjEgMCBvYmoKPDwKL0Rlc3QgWzUgMCBSIC9GaXRIIDg0Ml0KL05leHQgNTkgMCBSCi9UaXRsZSAoSUQpCi9QYXJlbnQgMjYgMCBSCi9QcmV2IDYzIDAgUgo+PgplbmRvYmoKNjIgMCBvYmoKPDwKL0Rlc3QgWzUgMCBSIC9GaXRIIDg0Ml0KL05leHQgNjQgMCBSCi9UaXRsZSA8RkVGRjdEMEQ1NEMxNjVFNT4KL1BhcmVudCAyNiAwIFIKL1ByZXYgNjAgMCBSCj4+CmVuZG9iago2MyAwIG9iago8PAovRGVzdCBbNSAwIFIgL0ZpdEggODQyXQovTmV4dCA2MSAwIFIKL1RpdGxlIDxGRUZGNTNENjVGMTU1MTQ4NjJDNTVGNTM4MDA1MDAyODMwQTIzMEM5MzBFQzMwQjkwMDI5PgovUGFyZW50IDI2IDAgUgovUHJldiA2NSAwIFIKPj4KZW5kb2JqCjY0IDAgb2JqCjw8Ci9EZXN0IFs1IDAgUiAvRml0SCA4NDJdCi9OZXh0IDY1IDAgUgovVGl0bGUgPEZFRkY3RDBENTRDMTk1OEI1OUNCNjVFNT4KL1BhcmVudCAyNiAwIFIKL1ByZXYgNjIgMCBSCj4+CmVuZG9iago2NSAwIG9iago8PAovRGVzdCBbNSAwIFIgL0ZpdEggODQyXQovTmV4dCA2MyAwIFIKL1RpdGxlIDxGRUZGN0QwRDU0QzE3RDQyNEU4NjY1RTU+Ci9QYXJlbnQgMjYgMCBSCi9QcmV2IDY0IDAgUgo+PgplbmRvYmoKeHJlZgowIDY2CjAwMDAwMDAwMDAgNjU1MzUgZg0KMDAwMDAwMDAxNSAwMDAwMCBuDQowMDAwMDAwNDA0IDAwMDAwIG4NCjAwMDAwMDA0NzMgMDAwMDAgbg0KMDAwMDAwMDA5NCAwMDAwMCBuDQowMDAwMDAwNTQ1IDAwMDAwIG4NCjAwMDAwMDA3MDAgMDAwMDAgbg0KMDAwMDAwMDg1NSAwMDAwMCBuDQowMDAwMDAxMDEwIDAwMDAwIG4NCjAwMDAwMDExNTEgMDAwMDAgbg0KMDAwMDAwMTI4NSAwMDAwMCBuDQowMDAwMDAzMjQwIDAwMDAwIG4NCjAwMDAwMDMzMjEgMDAwMDAgbg0KMDAwMDAwNjM5NSAwMDAwMCBuDQowMDAwMDA2NDc2IDAwMDAwIG4NCjAwMDAwMDgwODUgMDAwMDAgbg0KMDAwMDAwODE2NiAwMDAwMCBuDQowMDAwMDA4MjczIDAwMDAwIG4NCjAwMDAwMDgzODQgMDAwMDAgbg0KMDAwMDAwODQ3OSAwMDAwMCBuDQowMDAwMDA4NjM0IDAwMDAwIG4NCjAwMDAwMDg2NjcgMDAwMDAgbg0KMDAwMDAwODcwMCAwMDAwMCBuDQowMDAwMDA4NzMzIDAwMDAwIG4NCjAwMDAwMDg4NDUgMDAwMDAgbg0KMDAwMDAwOTAwOSAwMDAwMCBuDQowMDAwMDA5MTE3IDAwMDAwIG4NCjAwMDAwMDkyNzQgMDAwMDAgbg0KMDAwMDAwOTQzOCAwMDAwMCBuDQowMDAwMDA5NTkwIDAwMDAwIG4NCjAwMDAwMDk2NzcgMDAwMDAgbg0KMDAwMDAwOTc5NCAwMDAwMCBuDQowMDAwMDA5OTAyIDAwMDAwIG4NCjAwMDAwMDk5OTkgMDAwMDAgbg0KMDAwMDAxMDEwMiAwMDAwMCBuDQowMDAwMDEwMjM1IDAwMDAwIG4NCjAwMDAwMTA3MjkgMDAwMDAgbg0KMDAwMDAxMjkwNCAwMDAwMCBuDQowMDAwMDEzMDI1IDAwMDAwIG4NCjAwMDAwMTMxMzggMDAwMDAgbg0KMDAwMDAxMzI0MiAwMDAwMCBuDQowMDAwMDEzMzYyIDAwMDAwIG4NCjAwMDAwMTM0MzcgMDAwMDAgbg0KMDAwMDAxMzY0NCAwMDAwMCBuDQowMDAwMDEzNzg1IDAwMDAwIG4NCjAwMDAwMTM4OTggMDAwMDAgbg0KMDAwMDAxNDAwNyAwMDAwMCBuDQowMDAwMDE0MTI0IDAwMDAwIG4NCjAwMDAwNzc0MjUgMDAwMDAgbg0KMDAwMDA3NzUzNCAwMDAwMCBuDQowMDAwMDc3NjQ2IDAwMDAwIG4NCjAwMDAwNzc3NjMgMDAwMDAgbg0KMDAwMDA3Nzg3MyAwMDAwMCBuDQowMDAwMDc3OTk0IDAwMDAwIG4NCjAwMDAwNzgwOTcgMDAwMDAgbg0KMDAwMDA3ODIyMiAwMDAwMCBuDQowMDAwMDc4MzMxIDAwMDAwIG4NCjAwMDAwNzg0NDggMDAwMDAgbg0KMDAwMDA3ODU4MSAwMDAwMCBuDQowMDAwMDc4NzAyIDAwMDAwIG4NCjAwMDAwNzg4MzkgMDAwMDAgbg0KMDAwMDA3ODk0OCAwMDAwMCBuDQowMDAwMDc5MDQ3IDAwMDAwIG4NCjAwMDAwNzkxNjAgMDAwMDAgbg0KMDAwMDA3OTMwOSAwMDAwMCBuDQowMDAwMDc5NDMwIDAwMDAwIG4NCnRyYWlsZXIKPDwKL1Jvb3QgMSAwIFIKL0luZm8gNCAwIFIKL0lEIFs8NUE5NzY3MDhDMEE3ODgzNEYxMjI4NURDREI5NDY1QkI+IDw1QTk3NjcwOEMwQTc4ODM0RjEyMjg1RENEQjk0NjVCQj5dCi9TaXplIDY2Cj4+CnN0YXJ0eHJlZgo3OTU1MQolJUVPRgo=',
          mimeCode: 'application/pdf',
          encodingCode: 'Base64',
          filename: 'originaldocument.pdf'
        }
      }
    }
  ],
  AccountingSupplierParty: {
    Party: {
      PartyIdentification: [
        {
          ID: {
            value: '011c0e85-aabb-437b-9dcd-5b941dd4e1aa',
            schemeID: 'TS:ID'
          }
        }
      ],
      PartyName: [
        {
          Name: {
            value: 'バイヤー1'
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
        Postbox: {
          value: '101号 トレシフテスト2 宛'
        },
        StreetName: {
          value: '大手町'
        },
        AdditionalStreetName: {
          value: '大手町フレイスウエスト'
        },
        BuildingNumber: {
          value: ''
        },
        CityName: {
          value: '東京'
        },
        PostalZone: {
          value: '100-8019'
        },
        Country: {
          IdentificationCode: {
            value: 'JP'
          }
        }
      },
      PhysicalLocation: {
        ID: {
          value: 'DUNSナンバー',
          schemeID: 'DUNS'
        }
      },
      Contact: {
        ID: {
          value: '6e45c7fa-e686-440b-8697-87da6c8ab41c',
          schemeURI: 'http://tradeshift.com/api/1.0/userId'
        },
        Name: {
          value: '管理者1 バイヤー1'
        },
        ElectronicMail: {
          value: 'dev.master.bconnection+buyer1.001@gmail.com'
        }
      },
      Person: {
        FirstName: {
          value: '管理者1'
        },
        FamilyName: {
          value: 'バイヤー1'
        }
      }
    }
  },
  AccountingCustomerParty: {
    CustomerAssignedAccountID: {
      value: 'ID'
    },
    Party: {
      PartyIdentification: [
        {
          ID: {
            value: '9bd4923d-1b65-43b9-9b8d-34dbd1c9ac40',
            schemeID: 'TS:ID'
          }
        }
      ],
      PartyName: [
        {
          Name: {
            value: 'サプライヤー1'
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
          value: '大手町'
        },
        AdditionalStreetName: {
          value: '大手町プレイスウエストタワー'
        },
        BuildingNumber: {
          value: ''
        },
        CityName: {
          value: '東京都'
        },
        PostalZone: {
          value: '100-8019'
        },
        Country: {
          IdentificationCode: {
            value: 'JP'
          }
        }
      },
      Contact: {
        ID: {
          value: '取引先担当者(アドレス)'
        }
      }
    }
  },
  Delivery: [
    {
      ActualDeliveryDate: {
        value: '2021-12-17'
      },
      PromisedDeliveryPeriod: {
        StartDate: {
          value: '2021-12-19'
        },
        EndDate: {
          value: '2021-12-24'
        }
      },
      Despatch: {
        ID: {
          value: '販売者の手数料番号'
        }
      }
    }
  ],
  DeliveryTerms: {
    ID: {
      value: '納期',
      schemeID: 'Incoterms',
      schemeVersionID: '2010'
    }
  },
  PaymentMeans: [
    {
      ID: {
        value: '4f77304f-b8ae-4b6d-bb0e-21159ae4b193'
      },
      PaymentMeansCode: {
        value: '10',
        listID: 'urn:tradeshift.com:api:1.0:paymentmeanscode'
      },
      PaymentDueDate: {
        value: '2021-12-17'
      }
    },
    {
      ID: {
        value: '3a6ec6fe-bb39-437e-8fa7-fa3aa1d4450f'
      },
      PaymentMeansCode: {
        value: '20',
        listID: 'urn:tradeshift.com:api:1.0:paymentmeanscode'
      },
      PaymentDueDate: {
        value: '2021-12-17'
      }
    },
    {
      ID: {
        value: '1b994805-cae7-42e6-bf8d-73a9d443d1fb'
      },
      PaymentMeansCode: {
        value: '42',
        listID: 'urn:tradeshift.com:api:1.0:paymentmeanscode'
      },
      PaymentDueDate: {
        value: '2021-12-17'
      },
      PaymentChannelCode: {
        value: 'JP:BANK',
        listID: 'urn:tradeshift.com:api:1.0:paymentchannelcode'
      },
      PayeeFinancialAccount: {
        ID: {
          value: '1110008'
        },
        Name: {
          value: '口座名義'
        },
        AccountTypeCode: {
          value: 'Current'
        },
        FinancialInstitutionBranch: {
          Name: {
            value: '上野'
          },
          FinancialInstitution: {
            Name: {
              value: '三菱'
            }
          },
          Address: {
            AddressFormatCode: {
              value: '5',
              listID: 'UN/ECE 3477',
              listAgencyID: '6'
            },
            StreetName: {
              value: '所在地１（任意）'
            },
            AdditionalStreetName: {
              value: '所在地２（任意）'
            },
            BuildingNumber: {
              value: 'ビル名（任意）'
            },
            CityName: {
              value: '市区町村（任意）'
            },
            PostalZone: {
              value: '郵便番号（任意）'
            },
            CountrySubentity: {
              value: '都道府県（任意）'
            },
            AddressLine: [
              {
                Line: {
                  value: '所在地（任意）'
                }
              }
            ],
            Country: {
              IdentificationCode: {
                value: '国名（任意）'
              }
            }
          }
        }
      }
    },
    {
      ID: {
        value: 'f57087fc-0040-46d3-b50f-53b370d6fac7'
      },
      PaymentMeansCode: {
        value: '48',
        listID: 'urn:tradeshift.com:api:1.0:paymentmeanscode'
      },
      PaymentDueDate: {
        value: '2021-12-17'
      }
    },
    {
      ID: {
        value: '541ed74c-f2b0-458c-bc36-05ee4cc874ac'
      },
      PaymentMeansCode: {
        value: '49',
        listID: 'urn:tradeshift.com:api:1.0:paymentmeanscode'
      },
      PaymentDueDate: {
        value: '2021-12-17'
      },
      PaymentChannelCode: {
        value: 'JP:BANK',
        listID: 'urn:tradeshift.com:api:1.0:paymentchannelcode'
      },
      PayeeFinancialAccount: {
        ID: {
          value: '1130008'
        },
        Name: {
          value: '口座名義'
        },
        AccountTypeCode: {
          value: 'Current'
        },
        FinancialInstitutionBranch: {
          Name: {
            value: '上野'
          },
          FinancialInstitution: {
            Name: {
              value: '三菱'
            }
          },
          Address: {
            AddressFormatCode: {
              value: '5',
              listID: 'UN/ECE 3477',
              listAgencyID: '6'
            },
            StreetName: {
              value: '所在地１（任意）'
            },
            AdditionalStreetName: {
              value: '所在地２（任意）'
            },
            BuildingNumber: {
              value: 'ビル名（任意）'
            },
            CityName: {
              value: '市区町村（任意）'
            },
            PostalZone: {
              value: '100-0000'
            },
            CountrySubentity: {
              value: '都道府県（任意）'
            },
            AddressLine: [
              {
                Line: {
                  value: '所在地（任意）'
                }
              }
            ],
            Country: {
              IdentificationCode: {
                value: '国名（任意）'
              }
            }
          }
        }
      }
    },
    {
      ID: {
        value: '48602397-fbae-43eb-b492-bf192ccb4112'
      },
      PaymentMeansCode: {
        value: '31',
        listID: 'urn:tradeshift.com:api:1.0:paymentmeanscode'
      },
      PaymentDueDate: {
        value: '2021-12-17'
      },
      PaymentChannelCode: {
        value: 'IBAN',
        listID: 'urn:tradeshift.com:api:1.0:paymentchannelcode'
      },
      PayeeFinancialAccount: {
        ID: {
          value: 'SWiftcodedesusu'
        },
        PaymentNote: [
          {
            value: '国際電信送金で送金する'
          }
        ],
        FinancialInstitutionBranch: {
          FinancialInstitution: {
            ID: {
              value: 'ABCDJPJSXXX'
            }
          }
        }
      }
    },
    {
      ID: {
        value: '0723f6d6-7d15-4dcb-8ab3-9b5d64e61e4c'
      },
      PaymentMeansCode: {
        value: '31',
        listID: 'urn:tradeshift.com:api:1.0:paymentmeanscode'
      },
      PaymentDueDate: {
        value: '2021-12-17'
      },
      PaymentChannelCode: {
        value: 'SWIFTUS',
        listID: 'urn:tradeshift.com:api:1.0:paymentchannelcode'
      },
      PayeeFinancialAccount: {
        ID: {
          value: '11515115'
        },
        Name: {
          value: '口座'
        },
        PaymentNote: [
          {
            value: '支払いメモ - 支払いオプションがIBANの場合'
          }
        ],
        FinancialInstitutionBranch: {
          ID: {
            value: '123123123'
          },
          FinancialInstitution: {
            ID: {
              value: 'swiftcod'
            }
          },
          Address: {
            AddressFormatCode: {
              value: '5',
              listID: 'UN/ECE 3477',
              listAgencyID: '6'
            },
            StreetName: {
              value: '所在地１（任意）'
            },
            AdditionalStreetName: {
              value: '所在地２（任意）'
            },
            BuildingNumber: {
              value: 'ビル名（任意）'
            },
            CityName: {
              value: '市区町村（任意）'
            },
            PostalZone: {
              value: '100-0000'
            },
            CountrySubentity: {
              value: '都道府県（任意）'
            },
            AddressLine: [
              {
                Line: {
                  value: '所在地（任意）'
                }
              }
            ],
            Country: {
              IdentificationCode: {
                value: '国名（任意）'
              }
            }
          }
        }
      }
    }
  ],
  PaymentTerms: [
    {
      ID: {
        value: 'bd067e19-e7c4-4562-b511-56dbaa17aa37'
      },
      Note: [
        {
          value: '説明'
        }
      ],
      SettlementDiscountPercent: {
        value: 10
      },
      PenaltySurchargePercent: {
        value: 12
      },
      SettlementPeriod: {
        StartDate: {
          value: '2021-12-10'
        },
        EndDate: {
          value: '2021-12-16'
        }
      },
      PenaltyPeriod: {
        StartDate: {
          value: '2021-12-10'
        },
        EndDate: {
          value: '2021-12-17'
        }
      }
    }
  ],
  AllowanceCharge: [
    {
      ID: {
        value: '1'
      },
      ChargeIndicator: {
        value: false
      },
      AllowanceChargeReason: {
        value: '割引'
      },
      MultiplierFactorNumeric: {
        value: 1
      },
      SequenceNumeric: {
        value: 2
      },
      Amount: {
        value: 11,
        currencyID: 'JPY'
      },
      TaxCategory: [
        {
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
      ],
      TaxTotal: {
        TaxAmount: {
          value: -1,
          currencyID: 'JPY'
        }
      }
    },
    {
      ID: {
        value: '2'
      },
      ChargeIndicator: {
        value: true
      },
      AllowanceChargeReason: {
        value: '追加料金'
      },
      MultiplierFactorNumeric: {
        value: 0.22
      },
      SequenceNumeric: {
        value: 3
      },
      Amount: {
        value: 59031879,
        currencyID: 'JPY'
      },
      TaxCategory: [
        {
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
      ],
      TaxTotal: {
        TaxAmount: {
          value: 4722550,
          currencyID: 'JPY'
        }
      }
    }
  ],
  TaxExchangeRate: {
    SourceCurrencyCode: {
      value: 'JPY'
    },
    TargetCurrencyCode: {
      value: 'JPY'
    },
    CalculationRate: {
      value: 15
    },
    MathematicOperatorCode: {
      value: 'multiply'
    },
    Date: {
      value: '2021-12-19'
    }
  },
  TaxTotal: [
    {
      TaxAmount: {
        value: 26188687,
        currencyID: 'JPY'
      },
      TaxSubtotal: [
        {
          TaxableAmount: {
            value: 268275000,
            currencyID: 'JPY'
          },
          TaxAmount: {
            value: 21462000,
            currencyID: 'JPY'
          },
          TransactionCurrencyTaxAmount: {
            value: 10000,
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
            TaxExemptionReason: {
              value: '非課税/免税の理由'
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
            value: 59083605,
            currencyID: 'JPY'
          },
          TaxAmount: {
            value: 4726688,
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
            value: -11,
            currencyID: 'JPY'
          },
          TaxAmount: {
            value: -1,
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
        }
      ]
    }
  ],
  LegalMonetaryTotal: {
    LineExtensionAmount: {
      value: 268326726,
      currencyID: 'JPY'
    },
    TaxExclusiveAmount: {
      value: 26188687,
      currencyID: 'JPY'
    },
    TaxInclusiveAmount: {
      value: 353547281,
      currencyID: 'JPY'
    },
    AllowanceTotalAmount: {
      value: 11,
      currencyID: 'JPY'
    },
    ChargeTotalAmount: {
      value: 59031879,
      currencyID: 'JPY'
    },
    PayableAmount: {
      value: 353547281,
      currencyID: 'JPY'
    }
  },
  InvoiceLine: [
    {
      ID: {
        value: '1'
      },
      InvoicedQuantity: {
        value: 2555,
        unitCode: 'EA'
      },
      LineExtensionAmount: {
        value: 268275000,
        currencyID: 'JPY'
      },
      AccountingCost: {
        value: '部門'
      },
      OrderLineReference: [
        {
          LineID: {
            value: '注文明細番号'
          },
          OrderReference: {
            ID: {
              value: '注文書番号'
            }
          }
        }
      ],
      DocumentReference: [
        {
          ID: {
            value: '輸送情報'
          },
          DocumentTypeCode: {
            value: 'BOL ID',
            listID: 'urn:tradeshift.com:api:1.0:documenttypecode'
          }
        },
        {
          ID: {
            value: '備考'
          },
          DocumentTypeCode: {
            value: 'File ID',
            listID: 'urn:tradeshift.com:api:1.0:documenttypecode'
          }
        },
        {
          ID: {
            value: '100000.00'
          },
          DocumentTypeCode: {
            value: 'LinePrice',
            listID: 'urn:tradeshift.com:api:1.0:documenttypecode'
          }
        }
      ],
      Delivery: [
        {
          ActualDeliveryDate: {
            value: '2021-12-23'
          },
          TrackingID: {
            value: '貨物注文番号'
          },
          DeliveryLocation: {
            ID: {
              value: 'ロケーションID',
              schemeID: 'Undefined'
            },
            Address: {
              AddressFormatCode: {
                value: '5',
                listID: 'UN/ECE 3477',
                listAgencyID: '6',
                listVersionID: 'D08B'
              },
              Postbox: {
                value: '私書箱'
              },
              StreetName: {
                value: '市区町村・番地'
              },
              AdditionalStreetName: {
                value: 'ビル、マンション名'
              },
              CityName: {
                value: '都道府県'
              },
              PostalZone: {
                value: '100-0000'
              },
              Country: {
                IdentificationCode: {
                  value: 'JP'
                }
              }
            }
          }
        }
      ],
      AllowanceCharge: [
        {
          ID: {
            value: '1'
          },
          ChargeIndicator: {
            value: false
          },
          AllowanceChargeReason: {
            value: '割引１'
          },
          MultiplierFactorNumeric: {
            value: 0.1
          },
          SequenceNumeric: {
            value: 2
          },
          Amount: {
            value: 25550000,
            currencyID: 'JPY'
          },
          TaxCategory: [
            {
              ID: {
                value: 'AA',
                schemeID: 'UN/ECE 5305',
                schemeAgencyID: '6',
                schemeVersionID: 'D08B'
              },
              Percent: {
                value: 8
              },
              TaxExemptionReason: {
                value: '非課税/免税の理由'
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
          ]
        },
        {
          ID: {
            value: '2'
          },
          ChargeIndicator: {
            value: true
          },
          AllowanceChargeReason: {
            value: '追加料金１'
          },
          MultiplierFactorNumeric: {
            value: 0.15
          },
          SequenceNumeric: {
            value: 3
          },
          Amount: {
            value: 38325000,
            currencyID: 'JPY'
          },
          TaxCategory: [
            {
              ID: {
                value: 'AA',
                schemeID: 'UN/ECE 5305',
                schemeAgencyID: '6',
                schemeVersionID: 'D08B'
              },
              Percent: {
                value: 8
              },
              TaxExemptionReason: {
                value: '非課税/免税の理由'
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
          ]
        }
      ],
      TaxTotal: [
        {
          TaxAmount: {
            value: 21462000,
            currencyID: 'JPY'
          },
          TaxSubtotal: [
            {
              TaxableAmount: {
                value: 268275000,
                currencyID: 'JPY'
              },
              TaxAmount: {
                value: 21462000,
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
                TaxExemptionReason: {
                  value: '非課税/免税の理由'
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
            value: 'PB2331明細１'
          }
        ],
        Name: {
          value: 'PB2331明細１'
        },
        ModelName: [
          {
            value: '詳細'
          }
        ],
        BuyersItemIdentification: {
          ID: {
            value: '発注者品番'
          }
        },
        SellersItemIdentification: {
          ID: {
            value: '1'
          }
        },
        StandardItemIdentification: {
          ID: {
            value: 'EAN/GTIN',
            schemeID: 'GTIN',
            schemeAgencyID: '9'
          }
        },
        AdditionalItemIdentification: [
          {
            ID: {
              value: 'HSN/SAC',
              schemeID: 'HSN'
            }
          }
        ],
        OriginCountry: {
          Name: {
            value: 'CN'
          }
        },
        CommodityClassification: [
          {
            ItemClassificationCode: {
              value: '商品分類コード: ECCN',
              listID: 'ECCN'
            }
          }
        ],
        ManufacturerParty: [
          {
            PartyName: [
              {
                Name: {
                  value: 'メーカー名'
                }
              }
            ]
          }
        ],
        ItemInstance: [
          {
            SerialID: {
              value: 'シリアルナンバー'
            }
          }
        ]
      },
      Price: {
        PriceAmount: {
          value: 105000,
          currencyID: 'JPY'
        },
        BaseQuantity: {
          value: 1,
          unitCode: 'EA'
        },
        OrderableUnitFactorRate: {
          value: 1
        }
      },
      DeliveryTerms: {
        ID: {
          value: '納期',
          schemeID: 'Incoterms',
          schemeVersionID: '2010'
        }
      }
    },
    {
      ID: {
        value: '2'
      },
      InvoicedQuantity: {
        value: 233,
        unitCode: 'EA'
      },
      LineExtensionAmount: {
        value: 51726,
        currencyID: 'JPY'
      },
      TaxTotal: [
        {
          TaxAmount: {
            value: 4138,
            currencyID: 'JPY'
          },
          TaxSubtotal: [
            {
              TaxableAmount: {
                value: 51726,
                currencyID: 'JPY'
              },
              TaxAmount: {
                value: 4138,
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
            value: 'PB2331明細２'
          }
        ],
        Name: {
          value: 'PB2331明細２'
        },
        SellersItemIdentification: {
          ID: {
            value: '2'
          }
        }
      },
      Price: {
        PriceAmount: {
          value: 222.0,
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
