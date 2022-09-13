'use strict'

const fs = require('fs')
const { v4: uuidv4 } = require('uuid')
const validate = require('./validate')
const constants = require('../constants')
const { exit } = require('process')
const bconCsvTaxDefault = require('./bconCsvTax')
const bconCsvUnitDefault = require('./bconCsvUnitcode')
const tmpHeader =
  '発行日,請求書番号,テナントID,支払期日,納品日,備考,取引先メールアドレス,銀行名,支店名,科目,口座番号,口座名義,その他特記事項,明細-項目ID,明細-内容,明細-数量,明細-単位,明細-単価,明細-税（消費税／軽減税率／不課税／免税／非課税）,明細-備考'
const dataNumber = 'データ番号'

// tradeshiftにアップロードするファイル内容を整理するクラス（ヘッダがない場合）
class Invoice {
  #DocumentId = null
  constructor() {
    this.#DocumentId = uuidv4()
  }

  // 請求書UUID取得
  getDocumentId() {
    return this.#DocumentId
  }

  #Document = {
    DocumentType: 'InvoiceType',
    UBLVersionID: { value: '2.0' },
    CustomizationID: { value: 'urn:tradeshift.com:ubl-2.0-customizations:2010-06' },
    ProfileID: {
      value: 'urn:www.cenbii.eu:profile:bii04:ver1.0',
      schemeID: 'CWA 16073:2010',
      schemeAgencyID: 'CEN/ISSS WS/BII',
      schemeVersionID: '1'
    },
    ID: { value: null },
    IssueDate: { value: null },
    InvoiceTypeCode: { value: '380', listID: 'UN/ECE 1001 Subset', listAgencyID: '6', listVersionID: 'D08B' },
    DocumentCurrencyCode: { value: 'JPY' },
    Note: [],
    AdditionalDocumentReference: [],
    AccountingCustomerParty: null,
    Delivery: [],
    PaymentMeans: [],
    InvoiceLine: []
  }
  // 請求書番号設定
  setInvoiceNumber(_invoiceNumber) {
    this.#Document.ID.value = _invoiceNumber
  }
  // 請求書番号取得
  getInvoiceNumber() {
    return this.#Document.ID
  }
  // 請求書情報取得
  getDocument() {
    return this.#Document
  }
  // 請求書明細設定
  appendDocumentInvoice(_invoiceLine) {
    this.#Document.InvoiceLine.push(_invoiceLine)
  }
  // 請求書発行日設定
  setIssueDate(_issuDate) {
    this.#Document.IssueDate.value = _issuDate
  }
  // 請求書発行日取得
  getIssueDate() {
    return this.#Document.IssueDate.value
  }

  #AccountingCustomerParty = {
    Party: {
      PartyIdentification: [{ ID: { value: null, schemeID: 'TS:ID', schemeName: 'Tradeshift identifier' } }],
      PartyName: [
        {
          Name: { value: null }
        }
      ],
      PostalAddress: {
        StreetName: { value: null },
        BuildingNumber: { value: null },
        CityName: { value: null },
        PostalZone: { value: null },
        Country: { IdentificationCode: { value: 'JP' } }
      },
      Contact: {
        ID: { value: null },
        ElectronicMail: { value: null }
      }
    }
  }
  // 請求書差出人メールアドレス設定
  setMailaddress(_mailaddress) {
    this.#AccountingCustomerParty.Party.Contact.ID.value = _mailaddress
  }
  // CustomerTennant情報設定
  setCustomerTennant(_tennantId) {
    this.#AccountingCustomerParty.Party.PartyIdentification[0].ID.value = _tennantId
    this.#Document.AccountingCustomerParty = this.#AccountingCustomerParty
  }
  // CustomerTennant情報取得
  getCustomerTennat() {
    return this.#AccountingCustomerParty.Party.PartyName[0].Name.value
  }

  #InvoiceLine = {
    ID: { value: '1' },
    InvoicedQuantity: { value: null, unitCode: null },
    LineExtensionAmount: { value: null, currencyID: 'JPY' },
    TaxTotal: [
      {
        TaxSubtotal: [
          {
            TaxCategory: {
              ID: { value: 'S', schemeID: 'UN/ECE 5305', schemeAgencyID: '6', schemeVersionID: 'D08B' },
              Percent: { value: null },
              TaxScheme: {
                ID: { value: 'VAT', schemeID: 'UN/ECE 5153 Subset', schemeAgencyID: '6', schemeVersionID: 'D08B' },
                Name: { value: null }
              }
            }
          }
        ]
      }
    ],
    Item: { Name: { value: null }, SellersItemIdentification: { ID: { value: null } }, Description: [{ value: null }] },
    Price: {
      PriceAmount: { value: null, currencyID: 'JPY' }
    },
    DocumentReference: [
      {
        ID: { value: null },
        DocumentTypeCode: { value: 'File ID', listID: 'urn:tradeshift.com:api:1.0:documenttypecode' }
      }
    ]
  }
  // 請求書明細情報設定
  setInvoiceLine(_sellersItemNum, _itemName, _quantityValue, _quantityUnitCode, _priceValue, _taxRate, _description) {
    this.#InvoiceLine.Item.SellersItemIdentification.ID.value = _sellersItemNum
    this.#InvoiceLine.Item.Name.value = _itemName
    this.#InvoiceLine.InvoicedQuantity.value = parseInt(_quantityValue, 10)
    this.#InvoiceLine.InvoicedQuantity.unitCode = _quantityUnitCode
    this.#InvoiceLine.Price.PriceAmount.value = _priceValue
    this.#InvoiceLine.TaxTotal[0].TaxSubtotal[0].TaxCategory.Percent.value = ~~_taxRate.replace(/[^0-9]/g, '')
    this.#InvoiceLine.TaxTotal[0].TaxSubtotal[0].TaxCategory.TaxScheme.Name.value = _taxRate
    this.#InvoiceLine.DocumentReference[0].ID.value = _description
    this.appendDocumentInvoice(JSON.parse(JSON.stringify(this.#InvoiceLine)))
  }

  #PaymentMeans = {
    PaymentMeansCode: { value: 42, listID: 'urn:tradeshift.com:api:1.0:paymentmeanscode' },
    PaymentDueDate: { value: null },
    PayeeFinancialAccount: {
      FinancialInstitutionBranch: {
        FinancialInstitution: { Name: { value: null } },
        Name: { value: null }
      },
      AccountTypeCode: { value: null },
      ID: { value: null },
      Name: { value: null }
    }
  }
  // 請求書支払い情報設定
  setPaymentMeans(_paymentDate, _financialInstitution, _financialName, _accountType, _accountId, _accountName) {
    if (_paymentDate !== '') {
      this.#PaymentMeans.PaymentDueDate.value = _paymentDate
    } else {
      delete this.#PaymentMeans.PaymentDueDate
    }

    if (
      _financialInstitution !== '' &&
      _financialName !== '' &&
      _accountType !== '' &&
      _accountId !== '' &&
      _accountName !== ''
    ) {
      this.#PaymentMeans.PayeeFinancialAccount.FinancialInstitutionBranch.FinancialInstitution.Name.value =
        _financialInstitution
      this.#PaymentMeans.PayeeFinancialAccount.FinancialInstitutionBranch.Name.value = _financialName
      this.#PaymentMeans.PayeeFinancialAccount.AccountTypeCode.value = _accountType
      this.#PaymentMeans.PayeeFinancialAccount.ID.value = _accountId
      this.#PaymentMeans.PayeeFinancialAccount.Name.value = _accountName
    } else {
      this.#PaymentMeans.PaymentMeansCode.value = 1
      delete this.#PaymentMeans.PayeeFinancialAccount
    }

    this.#Document.PaymentMeans.push(JSON.parse(JSON.stringify(this.#PaymentMeans)))
  }

  #Delivery = { ActualDeliveryDate: { value: null } }
  // 納品日設定
  setDelivery(_deliveryDate) {
    if (_deliveryDate !== '') {
      this.#Delivery.ActualDeliveryDate.value = _deliveryDate
    } else {
      delete this.#Delivery.ActualDeliveryDate
    }
    this.#Document.Delivery.push(JSON.parse(JSON.stringify(this.#Delivery)))
  }

  #AdditionalDocumentReference = {
    ID: { value: null },
    DocumentTypeCode: { value: 'File ID', listID: 'urn:tradeshift.com:api:1.0:documenttypecode' }
  }
  // AdditionalDocumentReference設定
  setAdditionalDocumentReference(_documentDescription) {
    this.#AdditionalDocumentReference.ID.value = _documentDescription
    this.#Document.AdditionalDocumentReference.push(JSON.parse(JSON.stringify(this.#AdditionalDocumentReference)))
  }

  #Note = { value: null }
  // その他特記事項設定
  setNote(_value) {
    this.#Note.value = _value
    this.#Document.Note.push(JSON.parse(JSON.stringify(this.#Note)))
  }
}

class bconCsvNoHeader {
  #csvFile = {
    fileStatusEnum: {
      SUCCESS: 0,
      LOADING: 1,
      FAILED: -1
    },
    path: null,
    fd: null,
    status: null,
    formatFlag: false,
    data: null,
    rows: [],
    invoiceCnt: null,
    setData(_data) {
      this.data = _data
    },

    getData() {
      return this.data
    },
    setRows(_data, _formatFlag, _uploadFormatDetail, itemRowNumber) {
      let tmpRowsCover = []
      const tmpRows = _data.split(/\r?\n|\r/)
      tmpRowsCover.push(tmpHeader, ...tmpRows)
      for (let idx = 0; idx < tmpRowsCover.length; idx++) {
        if (tmpRowsCover[idx].trim()) {
          let docIndex = _uploadFormatDetail[1].uploadFormatNumber
          this.rows.push({
            idx: itemRowNumber + idx,
            invoiceGroup: null,
            docNo: tmpRowsCover[idx].split(',')[docIndex],
            rows: tmpRowsCover[idx]
          })
        }
      }
      this.invoiceCnt = this.rows.length
      this.rows.sort((a, b) => {
        if (a.idx > b.idx) {
          return 1
        } else {
          return -1
        }
      })

      let groupNumber = 0
      this.rows.reduce((docNo, cur, idx) => {
        if (docNo !== cur.docNo) {
          cur.invoiceGroup = groupNumber++
        } else {
          cur.invoiceGroup = groupNumber
        }
        return cur.docNo
      })
    },

    setFile(_filePath, formatFlag, uploadFormatDetail, itemRowNumber) {
      this.setStatus(this.fileStatusEnum.LOADING)
      this.setFormatFlag(formatFlag)
      this.setItemRowNumber(itemRowNumber)
      this.fd = fs.openSync(_filePath, 'r')
      this.setData(fs.readFileSync(_filePath, 'utf8'))
      this.setStatus(this.fileStatusEnum.SUCCESS)
      fs.close(this.fd, (err) => {
        if (err) {
        }
      })
      this.setRows(this.getData(), formatFlag, uploadFormatDetail, itemRowNumber)
    },

    setItemRowNumber(itemRowNumber) {
      this.itemRowNumber = itemRowNumber
    },

    getsetItemRowNumber() {
      return this.itemRowNumber
    },

    setFormatFlag(formatFlag) {
      this.formatFlag = formatFlag
    },

    getFormatFlag() {
      return this.formatFlag
    },

    setStatus(_statuscode) {
      this.status = _statuscode
    },

    getRow(idx) {
      if (idx > this.invoiceCnt) {
        return null
      }
      return this.rows[idx]
    },

    getRows() {
      return this.rows
    }
  }

  // アップロードファイル取得
  getCSVFile() {
    return this.#csvFile
  }

  #invoiceDocumentList = []

  constructor(fullFilePath, formatFlag, uploadFormatDetail, uploadFormatIdentifier, itemRowNumber) {
    this.#csvFile.setFile(fullFilePath, formatFlag, uploadFormatDetail, itemRowNumber)
    this.convertTradeshiftInvoice(uploadFormatDetail, uploadFormatIdentifier, itemRowNumber)
  }
  // アップロードするデータをアップロードできる形に変更及びバリデーションチェック
  convertTradeshiftInvoice(uploadFormatDetail, uploadFormatIdentifier, itemRowNumber) {
    // CSVカーラム
    const resultConvert = {
      invoiceDetailId: null, // invoiceDetailテーブルのinvoiceDetailIdカーラム
      invoicesId: null, // invoicesテーブルとinvoiceDetailテーブルの紐づくため、invoicesのinvoicesId
      invoiceId: null, // 請求書番号
      lines: null,
      status: null,
      INVOICE: null,
      successCount: 0,
      failCount: 0,
      skipCount: 0,
      error: []
    }
    const invoiceData = this.#csvFile.getRows()
    let formatFlag = this.#csvFile.getFormatFlag()
    let parentInvoice = null
    let parentInvoiceStatus = 0
    let indexObj = null
    let headerchk = true
    let headerFlag = true
    let userHeaderColumns = 0
    let setInvoiceLineCnt = 0
    let errorData = ''
    let bconCsvTaxUser = null
    let bconCsvUnitUser = null

    invoiceData.some((element) => {
      let csvColumn = element.rows.split(',')
      csvColumn = this.convertUserCsvFormat(uploadFormatDetail, csvColumn)
      userHeaderColumns = uploadFormatDetail.length
      // taxsetting
      if (uploadFormatIdentifier.length !== 0) {
        bconCsvTaxUser = this.convertUserTaxidentifier(uploadFormatIdentifier)
        bconCsvUnitUser = this.convertUserUnitidentifier(uploadFormatIdentifier)
      }
      resultConvert.invoiceDetailId = uuidv4()
      resultConvert.invoiceId = csvColumn[1]
      resultConvert.lines = element.idx
      resultConvert.status = 0
      errorData = ''
      if (parentInvoice?.getInvoiceNumber().value !== element.docNo) {
        headerFlag = true
        setInvoiceLineCnt = 0
        parentInvoice = new Invoice()
        parentInvoiceStatus = 0

        // 合計金額の判定
        const isValidTotalPrice = validate.isValidTotalPrice(element.docNo, invoiceData)

        // 合計金額が上限超えた場合
        if (!isValidTotalPrice) {
          errorData += errorData
            ? `,${constants.invoiceErrMsg['TOTALPRICEVALUEERR000']}`
            : `${constants.invoiceErrMsg['TOTALPRICEVALUEERR000']}`
          resultConvert.status = -1
        }

        // ユーザが設定したアップロードフォーマットと項目数が間違い場合
        if (formatFlag) {
          let result = csvColumn.filter((col) => {
            if (col) return col
          })
          if (result.length < userHeaderColumns && headerchk) {
            errorData += `${constants.invoiceErrMsg['HEADERERR000']}`
            resultConvert.status = -1
            headerchk = false

            resultConvert.error.push({
              errorData: errorData
            })

            parentInvoice.setInvoiceLine('', '', '', '', '', '')

            indexObj = {
              ...resultConvert,
              INVOICE: parentInvoice
            }

            this.#invoiceDocumentList.push(indexObj)
            return true
          }
        }

        if (csvColumn.length !== constants.invoiceValidDefine.COLUMN_VALUE && headerchk && !formatFlag) {
          errorData += `${constants.invoiceErrMsg['HEADERERR000']}`
          resultConvert.status = -1
          headerchk = false

          resultConvert.error.push({
            errorData: errorData
          })

          parentInvoice.setInvoiceLine('', '', '', '', '', '')

          indexObj = {
            ...resultConvert,
            INVOICE: parentInvoice
          }

          this.#invoiceDocumentList.push(indexObj)
          return true
        } else if (csvColumn.length === constants.invoiceValidDefine.COLUMN_VALUE && headerchk) {
          headerchk = false
          return
        } else if (formatFlag && headerchk) {
          headerchk = false
          return
        }

        if (!formatFlag) {
          if (csvColumn.length !== constants.invoiceValidDefine.COLUMN_VALUE) {
            errorData += errorData
              ? `,${constants.invoiceErrMsg['COLUMNERR000']}`
              : `${constants.invoiceErrMsg['COLUMNERR000']}`

            resultConvert.status = -1

            resultConvert.error.push({
              errorData: errorData
            })

            parentInvoice.setInvoiceLine('', '', '', '', '', '')

            indexObj = {
              ...resultConvert,
              INVOICE: parentInvoice
            }

            this.#invoiceDocumentList.push(indexObj)
            this.#invoiceDocumentList[this.#invoiceDocumentList.lastIndexOf(indexObj)].failCount += 1
            return
          }
        }

        let dateBan = 0
        let invoiceBan = 1
        let tenantIdBan = 2
        let paymentDateBan = 3
        let deliveryDateBan = 4
        let etcBan = 5
        let mailaddressBan = 6
        let bankNameBan = 7
        let bankLocalNameBan = 8
        let subjectBan = 9
        let accountNumberBan = 10
        let accountNameBan = 11
        let etcWriteBan = 12

        uploadFormatDetail.forEach((detail) => {
          if (detail.defaultNumber === 0) {
            dateBan = detail.uploadFormatNumber + 1
          }
          if (detail.defaultNumber === 1) {
            invoiceBan = detail.uploadFormatNumber + 1
          }
          if (detail.defaultNumber === 2) {
            tenantIdBan = detail.uploadFormatNumber + 1
          }
          if (detail.defaultNumber === 3) {
            paymentDateBan = detail.uploadFormatNumber + 1
          }
          if (detail.defaultNumber === 4) {
            deliveryDateBan = detail.uploadFormatNumber + 1
          }
          if (detail.defaultNumber === 5) {
            etcBan = detail.uploadFormatNumber + 1
          }
          if (detail.defaultNumber === 6) {
            mailaddressBan = detail.uploadFormatNumber + 1
          }
          if (detail.defaultNumber === 7) {
            bankNameBan = detail.uploadFormatNumber + 1
          }
          if (detail.defaultNumber === 8) {
            bankLocalNameBan = detail.uploadFormatNumber + 1
          }
          if (detail.defaultNumber === 9) {
            subjectBan = detail.uploadFormatNumber + 1
          }
          if (detail.defaultNumber === 10) {
            accountNumberBan = detail.uploadFormatNumber + 1
          }
          if (detail.defaultNumber === 11) {
            accountNameBan = detail.uploadFormatNumber + 1
          }
          if (detail.defaultNumber === 12) {
            etcWriteBan = detail.uploadFormatNumber + 1
          }
        })
        // 発行日
        if (csvColumn[0] !== '') {
          csvColumn[0] = csvColumn[0].replace(/\//g, '-')
          let issueDateArray = csvColumn[0].split('-')
          csvColumn[0] = `${issueDateArray[0]}-${'0'.concat(issueDateArray[1]).slice(-2)}-${'0'
            .concat(issueDateArray[2])
            .slice(-2)}`

          switch (validate.isDate(csvColumn[0])) {
            // 形式の間違い
            case 1:
              errorData += errorData
                ? `,${dataNumber}${dateBan}${constants.invoiceErrMsgForUploadFormat['ISSUEDATEERR001']}`
                : `${dataNumber}${dateBan}${constants.invoiceErrMsgForUploadFormat['ISSUEDATEERR001']}`

              resultConvert.status = -1
              break
            // 無効な日付
            case 2:
              errorData += errorData
                ? `,${dataNumber}${dateBan}${constants.invoiceErrMsgForUploadFormat['ISSUEDATEERR000']}`
                : `${dataNumber}${dateBan}${constants.invoiceErrMsgForUploadFormat['ISSUEDATEERR000']}`

              resultConvert.status = -1
              break
            default:
              break
          }
        } else {
          // 未入力
          errorData += errorData
            ? `,${dataNumber}${dateBan}${constants.invoiceErrMsgForUploadFormat['ISSUEDATEERR002']}`
            : `${dataNumber}${dateBan}${constants.invoiceErrMsgForUploadFormat['ISSUEDATEERR002']}`

          resultConvert.status = -1
        }

        parentInvoice.setIssueDate(csvColumn[0])

        // 請求書番号
        switch (validate.isInvoiceId(csvColumn[1])) {
          case '':
            break
          default:
            errorData += errorData
              ? `,${dataNumber}${invoiceBan}${
                  constants.invoiceErrMsgForUploadFormat[validate.isInvoiceId(csvColumn[1])]
                }`
              : `${dataNumber}${invoiceBan}${
                  constants.invoiceErrMsgForUploadFormat[validate.isInvoiceId(csvColumn[1])]
                }`

            resultConvert.status = -1
            break
        }
        resultConvert.invoicesId = element.docNo

        parentInvoice.setInvoiceNumber(csvColumn[1])

        // テナントID
        if (csvColumn[2] !== '') {
          if (!validate.isUUID(csvColumn[2])) {
            errorData += errorData
              ? `,${dataNumber}${tenantIdBan}${constants.invoiceErrMsgForUploadFormat['TENANTERR000']}`
              : `${dataNumber}${tenantIdBan}${constants.invoiceErrMsgForUploadFormat['TENANTERR000']}`

            resultConvert.status = -1
          }

          const resultcheckNetworkConnection = validate.checkNetworkConnection(
            bconCsvNoHeader.prototype.companyNetworkConnectionList,
            csvColumn[2]
          )

          switch (resultcheckNetworkConnection) {
            case '':
              break
            case 'INTERNALERR000':
              resultConvert.status = -1
              break
            default:
              errorData += errorData
                ? `,${constants.invoiceErrMsgForUploadFormat[resultcheckNetworkConnection]}`
                : `${constants.invoiceErrMsgForUploadFormat[resultcheckNetworkConnection]}`

              resultConvert.status = -1
              break
          }
        } else {
          // テナントID未入力
          errorData += errorData
            ? `,${dataNumber}${tenantIdBan}${constants.invoiceErrMsgForUploadFormat['TENANTERR001']}`
            : `${dataNumber}${tenantIdBan}${constants.invoiceErrMsgForUploadFormat['TENANTERR001']}`

          resultConvert.status = -1
        }
        parentInvoice.setCustomerTennant(csvColumn[2])

        // 支払期日
        if (csvColumn[3] !== '') {
          csvColumn[3] = csvColumn[3].replace(/\//g, '-')
          let paymentDateArray = csvColumn[3].split('-')
          csvColumn[3] = `${paymentDateArray[0]}-${'0'.concat(paymentDateArray[1]).slice(-2)}-${'0'
            .concat(paymentDateArray[2])
            .slice(-2)}`
          switch (validate.isDate(csvColumn[3])) {
            case 1:
              errorData += errorData
                ? `,${dataNumber}${paymentDateBan}${constants.invoiceErrMsgForUploadFormat['PAYMENTDATEERR001']}`
                : `${dataNumber}${paymentDateBan}${constants.invoiceErrMsgForUploadFormat['PAYMENTDATEERR001']}`

              resultConvert.status = -1
              break
            case 2:
              errorData += errorData
                ? `,${dataNumber}${paymentDateBan}${constants.invoiceErrMsgForUploadFormat['PAYMENTDATEERR000']}`
                : `${dataNumber}${paymentDateBan}${constants.invoiceErrMsgForUploadFormat['PAYMENTDATEERR000']}`

              resultConvert.status = -1
              break
            default:
              break
          }
        }

        // 納品日
        if (csvColumn[4] !== '') {
          csvColumn[4] = csvColumn[4].replace(/\//g, '-')
          let deliveryDateArray = csvColumn[4].split('-')
          csvColumn[4] = `${deliveryDateArray[0]}-${'0'.concat(deliveryDateArray[1]).slice(-2)}-${'0'
            .concat(deliveryDateArray[2])
            .slice(-2)}`
          switch (validate.isDate(csvColumn[4])) {
            case 1:
              errorData += errorData
                ? `,${dataNumber}${deliveryDateBan}${constants.invoiceErrMsgForUploadFormat['DELIVERYDATEERR001']}`
                : `${dataNumber}${deliveryDateBan}${constants.invoiceErrMsgForUploadFormat['DELIVERYDATEERR001']}`

              resultConvert.status = -1
              break
            case 2:
              errorData += errorData
                ? `,${dataNumber}${deliveryDateBan}${constants.invoiceErrMsgForUploadFormat['DELIVERYDATEERR000']}`
                : `${dataNumber}${deliveryDateBan}${constants.invoiceErrMsgForUploadFormat['DELIVERYDATEERR000']}`

              resultConvert.status = -1
              break
            default:
              break
          }
        }
        parentInvoice.setDelivery(csvColumn[4])

        // 備考
        if (csvColumn[5] !== '') {
          switch (validate.isFinancialInstitution(csvColumn[5])) {
            case '':
              break
            default:
              errorData += errorData
                ? `,${dataNumber}${etcBan}${
                    constants.invoiceErrMsgForUploadFormat[validate.isFinancialInstitution(csvColumn[5])]
                  }`
                : `${dataNumber}${etcBan}${
                    constants.invoiceErrMsgForUploadFormat[validate.isFinancialInstitution(csvColumn[5])]
                  }`

              resultConvert.status = -1
              break
          }
        }
        parentInvoice.setAdditionalDocumentReference(csvColumn[5])

        // 取引先メールアドレス チェック
        if (csvColumn[6] !== '') {
          if (!validate.isValidEmailTsUser(csvColumn[6])) {
            errorData += errorData
              ? `,${constants.invoiceErrMsg['MAILADDRESSERR001']}`
              : `${constants.invoiceErrMsg['MAILADDRESSERR001']}`
            resultConvert.status = -1
          }
        } else {
          errorData += errorData
            ? `,${constants.invoiceErrMsg['MAILADDRESSERR002']}`
            : `${constants.invoiceErrMsg['MAILADDRESSERR002']}`
          resultConvert.status = -1
        }
        parentInvoice.setMailaddress(csvColumn[6])

        // PayeeFinancialAccountチェック
        if (
          csvColumn[7] !== '' ||
          csvColumn[8] !== '' ||
          csvColumn[9] !== '' ||
          csvColumn[10] !== '' ||
          csvColumn[11] !== ''
        ) {
          // 銀行名
          switch (validate.isBankName(csvColumn[7])) {
            case '':
              break
            default:
              errorData += errorData
                ? `,${dataNumber}${bankNameBan}${
                    constants.invoiceErrMsgForUploadFormat[validate.isBankName(csvColumn[7])]
                  }`
                : `${dataNumber}${bankNameBan}${
                    constants.invoiceErrMsgForUploadFormat[validate.isBankName(csvColumn[7])]
                  }`

              resultConvert.status = -1
              break
          }

          // 支店名
          switch (validate.isFinancialName(csvColumn[8])) {
            case '':
              break
            default:
              errorData += errorData
                ? `,${dataNumber}${bankLocalNameBan}${
                    constants.invoiceErrMsgForUploadFormat[validate.isFinancialName(csvColumn[8])]
                  }`
                : `${dataNumber}${bankLocalNameBan}${
                    constants.invoiceErrMsgForUploadFormat[validate.isFinancialName(csvColumn[8])]
                  }`

              resultConvert.status = -1
              break
          }

          // 科目
          switch (validate.isAccountType(csvColumn[9])) {
            case 1:
              errorData += errorData
                ? `,${dataNumber}${subjectBan}${constants.invoiceErrMsgForUploadFormat['ACCOUNTTYPEERR000']}`
                : `${dataNumber}${subjectBan}${constants.invoiceErrMsgForUploadFormat['ACCOUNTTYPEERR000']}`

              resultConvert.status = -1
              break
            case 2:
              errorData += errorData
                ? `,${dataNumber}${subjectBan}${constants.invoiceErrMsgForUploadFormat['ACCOUNTTYPEERR001']}`
                : `${dataNumber}${subjectBan}${constants.invoiceErrMsgForUploadFormat['ACCOUNTTYPEERR001']}`

              resultConvert.status = -1
              break
            default:
              csvColumn[9] = validate.isAccountType(csvColumn[9])
              break
          }

          // 口座番号
          switch (validate.isAccountId(csvColumn[10])) {
            case '':
              break
            default:
              errorData += errorData
                ? `,${dataNumber}${accountNumberBan}${
                    constants.invoiceErrMsgForUploadFormat[validate.isAccountId(csvColumn[10])]
                  }`
                : `${dataNumber}${accountNumberBan}${
                    constants.invoiceErrMsgForUploadFormat[validate.isAccountId(csvColumn[10])]
                  }`

              resultConvert.status = -1
              break
          }

          // 口座名義
          switch (validate.isAccountName(csvColumn[11])) {
            case '':
              break
            default:
              errorData += errorData
                ? `,${dataNumber}${accountNameBan}${
                    constants.invoiceErrMsgForUploadFormat[validate.isAccountName(csvColumn[11])]
                  }`
                : `${dataNumber}${accountNameBan}${
                    constants.invoiceErrMsgForUploadFormat[validate.isAccountName(csvColumn[11])]
                  }`

              resultConvert.status = -1
              break
          }
        }

        parentInvoice.setPaymentMeans(
          csvColumn[3],
          csvColumn[7],
          csvColumn[8],
          csvColumn[9],
          csvColumn[10],
          csvColumn[11]
        )

        // その他特記事項
        if (csvColumn[12] !== '') {
          switch (validate.isNote(csvColumn[12])) {
            case '':
              break
            default:
              errorData += errorData
                ? `,${dataNumber}${etcWriteBan}${
                    constants.invoiceErrMsgForUploadFormat[validate.isNote(csvColumn[12])]
                  }`
                : `${dataNumber}${etcWriteBan}${constants.invoiceErrMsgForUploadFormat[validate.isNote(csvColumn[12])]}`

              resultConvert.status = -1
              break
          }
        }
        parentInvoice.setNote(csvColumn[12])

        this.#invoiceDocumentList.forEach((ele) => {
          if (ele.INVOICE.getDocument().ID.value === element.docNo) {
            resultConvert.status = 1
            parentInvoiceStatus = 1
          }
        })
        indexObj = {
          ...resultConvert,
          INVOICE: parentInvoice
        }
        this.#invoiceDocumentList.push(indexObj)

        // errorData = ''
        if (resultConvert.status === -1) headerFlag = false
      }

      setInvoiceLineCnt++

      let meiItemBan = 13
      let meiContentBan = 14
      let meiQuantityBan = 15
      let meiUnitBan = 16
      let meiUnitPriceBan = 17
      let meiTaxBan = 18
      let meiEtcBan = 19

      uploadFormatDetail.forEach((detail) => {
        if (detail.defaultNumber === 13) {
          meiItemBan = detail.uploadFormatNumber + 1
        }
        if (detail.defaultNumber === 14) {
          meiContentBan = detail.uploadFormatNumber + 1
        }
        if (detail.defaultNumber === 15) {
          meiQuantityBan = detail.uploadFormatNumber + 1
        }
        if (detail.defaultNumber === 16) {
          meiUnitBan = detail.uploadFormatNumber + 1
        }
        if (detail.defaultNumber === 17) {
          meiUnitPriceBan = detail.uploadFormatNumber + 1
        }
        if (detail.defaultNumber === 18) {
          meiTaxBan = detail.uploadFormatNumber + 1
        }
        if (detail.defaultNumber === 19) {
          meiEtcBan = detail.uploadFormatNumber + 1
        }
      })

      // 明細-項目ID
      switch (validate.isSellersItemNum(csvColumn[13])) {
        case '':
          break
        default:
          errorData += errorData
            ? `,${dataNumber}${meiItemBan}${
                constants.invoiceErrMsgForUploadFormat[validate.isSellersItemNum(csvColumn[13])]
              }`
            : `${dataNumber}${meiItemBan}${
                constants.invoiceErrMsgForUploadFormat[validate.isSellersItemNum(csvColumn[13])]
              }`

          resultConvert.status = -1
          break
      }

      // 明細-内容
      switch (validate.isItemName(csvColumn[14])) {
        case '':
          break
        default:
          errorData += errorData
            ? `,${dataNumber}${meiContentBan}${
                constants.invoiceErrMsgForUploadFormat[validate.isItemName(csvColumn[14])]
              }`
            : `${dataNumber}${meiContentBan}${
                constants.invoiceErrMsgForUploadFormat[validate.isItemName(csvColumn[14])]
              }`

          resultConvert.status = -1
          break
      }

      // 明細-数量
      switch (validate.isQuantityValue(csvColumn[15])) {
        case '':
          break
        default:
          errorData += errorData
            ? `,${dataNumber}${meiQuantityBan}${
                constants.invoiceErrMsgForUploadFormat[validate.isQuantityValue(csvColumn[15])]
              }`
            : `${dataNumber}${meiQuantityBan}${
                constants.invoiceErrMsgForUploadFormat[validate.isQuantityValue(csvColumn[15])]
              }`

          resultConvert.status = -1
          break
      }

      // 明細-単位
      if (!bconCsvUnitUser) {
        switch (validate.isUnitcode(csvColumn[16])) {
          case 'UNITERR000':
            errorData += errorData
              ? `,${dataNumber}${meiUnitBan}${
                  constants.invoiceErrMsgForUploadFormat[validate.isUnitcode(csvColumn[16])]
                }`
              : `${dataNumber}${meiUnitBan}${
                  constants.invoiceErrMsgForUploadFormat[validate.isUnitcode(csvColumn[16])]
                }`

            resultConvert.status = -1
            break
          case 'UNITERR001':
            errorData += errorData
              ? `,${dataNumber}${meiUnitBan}${
                  constants.invoiceErrMsgForUploadFormat[validate.isUnitcode(csvColumn[16])]
                }`
              : `${dataNumber}${meiUnitBan}${
                  constants.invoiceErrMsgForUploadFormat[validate.isUnitcode(csvColumn[16])]
                }`

            resultConvert.status = -1
            break
          default:
            csvColumn[16] = validate.isUnitcode(csvColumn[16])
            break
        }
      } else {
        switch (validate.isUserUnitcode(csvColumn[16], bconCsvUnitUser)) {
          case 'UNITERR000':
            errorData += errorData
              ? `,${dataNumber}${meiUnitBan}${
                  constants.invoiceErrMsgForUploadFormat[validate.isUserUnitcode(csvColumn[16], bconCsvUnitUser)]
                }`
              : `${dataNumber}${meiUnitBan}${
                  constants.invoiceErrMsgForUploadFormat[validate.isUserUnitcode(csvColumn[16], bconCsvUnitUser)]
                }`

            resultConvert.status = -1
            break
          case 'UNITERR002':
            errorData += errorData
              ? `,${dataNumber}${meiUnitBan}${
                  constants.invoiceErrMsgForUploadFormat[validate.isUserUnitcode(csvColumn[16], bconCsvUnitUser)]
                }`
              : `${dataNumber}${meiUnitBan}${
                  constants.invoiceErrMsgForUploadFormat[validate.isUserUnitcode(csvColumn[16], bconCsvUnitUser)]
                }`

            resultConvert.status = -1
            break
          default:
            csvColumn[16] = validate.isUserUnitcode(csvColumn[16], bconCsvUnitUser)
            break
        }
      }

      // 明細-単価
      switch (validate.isPriceValue(csvColumn[17])) {
        case '':
          break
        default:
          errorData += errorData
            ? `,${dataNumber}${meiUnitPriceBan}${
                constants.invoiceErrMsgForUploadFormat[validate.isPriceValue(csvColumn[17])]
              }`
            : `${dataNumber}${meiUnitPriceBan}${
                constants.invoiceErrMsgForUploadFormat[validate.isPriceValue(csvColumn[17])]
              }`

          resultConvert.status = -1
          break
      }

      // 明細-税（消費税／軽減税率／不課税／免税／非課税）
      if (!bconCsvTaxUser) {
        switch (validate.isTaxCategori(csvColumn[18])) {
          case 'TAXERR000':
            errorData += errorData
              ? `,${dataNumber}${meiTaxBan}${
                  constants.invoiceErrMsgForUploadFormat[validate.isTaxCategori(csvColumn[18])]
                }`
              : `${dataNumber}${meiTaxBan}${
                  constants.invoiceErrMsgForUploadFormat[validate.isTaxCategori(csvColumn[18])]
                }`

            resultConvert.status = -1
            break
          case 'TAXERR001':
            errorData += errorData
              ? `,${dataNumber}${meiTaxBan}${
                  constants.invoiceErrMsgForUploadFormat[validate.isTaxCategori(csvColumn[18])]
                }`
              : `${dataNumber}${meiTaxBan}${
                  constants.invoiceErrMsgForUploadFormat[validate.isTaxCategori(csvColumn[18])]
                }`

            resultConvert.status = -1
            break
          default:
            csvColumn[18] = validate.isTaxCategori(csvColumn[18])
            break
        }
      } else {
        switch (validate.isUserTaxCategori(csvColumn[18], bconCsvTaxUser)) {
          case 'TAXERR000':
            errorData += errorData
              ? `,${dataNumber}${meiTaxBan}${
                  constants.invoiceErrMsgForUploadFormat[validate.isUserTaxCategori(csvColumn[18], bconCsvTaxUser)]
                }`
              : `${dataNumber}${meiTaxBan}${
                  constants.invoiceErrMsgForUploadFormat[validate.isUserTaxCategori(csvColumn[18], bconCsvTaxUser)]
                }`

            resultConvert.status = -1
            break
          case 'TAXERR002':
            errorData += errorData
              ? `,${dataNumber}${meiTaxBan}${
                  constants.invoiceErrMsgForUploadFormat[validate.isUserTaxCategori(csvColumn[18], bconCsvTaxUser)]
                }`
              : `${dataNumber}${meiTaxBan}${
                  constants.invoiceErrMsgForUploadFormat[validate.isUserTaxCategori(csvColumn[18], bconCsvTaxUser)]
                }`

            resultConvert.status = -1
            break
          default:
            csvColumn[18] = validate.isUserTaxCategori(csvColumn[18], bconCsvTaxUser)
            break
        }
      }

      // 明細-備考
      if (csvColumn[19] !== '') {
        switch (validate.isDescription(csvColumn[19])) {
          case '':
            break
          default:
            errorData += errorData
              ? `,${dataNumber}${meiEtcBan}${
                  constants.invoiceErrMsgForUploadFormat[validate.isDescription(csvColumn[19])]
                }`
              : `${dataNumber}${meiEtcBan}${
                  constants.invoiceErrMsgForUploadFormat[validate.isDescription(csvColumn[19])]
                }`

            resultConvert.status = -1
            break
        }
      }

      parentInvoice.setInvoiceLine(
        csvColumn[13],
        csvColumn[14],
        csvColumn[15],
        csvColumn[16],
        csvColumn[17],
        csvColumn[18],
        csvColumn[19]
      )

      if (resultConvert.status !== -1 && headerFlag) {
        if (parentInvoiceStatus !== 1) {
          errorData = constants.invoiceErrMsg['SUCCESS']
        } else {
          resultConvert.status = 1
          this.#invoiceDocumentList[this.#invoiceDocumentList.lastIndexOf(indexObj)].status = resultConvert.status
        }
      } else {
        if (setInvoiceLineCnt > 1 && !headerFlag) {
          resultConvert.status = -1
          this.#invoiceDocumentList[this.#invoiceDocumentList.lastIndexOf(indexObj)].status = resultConvert.status
          errorData += errorData
            ? `,${csvColumn[1] + constants.invoiceErrMsg['HEADERBEFORERR']}`
            : `${csvColumn[1] + constants.invoiceErrMsg['HEADERBEFORERR']}`
        }
      }

      if (
        resultConvert.status === -1 ||
        this.#invoiceDocumentList[this.#invoiceDocumentList.lastIndexOf(indexObj)].failCount !== 0
      ) {
        resultConvert.status = -1
        this.#invoiceDocumentList[this.#invoiceDocumentList.lastIndexOf(indexObj)].status = resultConvert.status
        if (this.#invoiceDocumentList[this.#invoiceDocumentList.lastIndexOf(indexObj)].successCount !== 0) {
          this.#invoiceDocumentList[this.#invoiceDocumentList.lastIndexOf(indexObj)].failCount +=
            1 + this.#invoiceDocumentList[this.#invoiceDocumentList.lastIndexOf(indexObj)].successCount
          this.#invoiceDocumentList[this.#invoiceDocumentList.lastIndexOf(indexObj)].successCount = 0
        } else {
          this.#invoiceDocumentList[this.#invoiceDocumentList.lastIndexOf(indexObj)].failCount += 1
        }
      } else if (resultConvert.status === 0 && parentInvoiceStatus === 0) {
        this.#invoiceDocumentList[this.#invoiceDocumentList.lastIndexOf(indexObj)].status = resultConvert.status
        this.#invoiceDocumentList[this.#invoiceDocumentList.lastIndexOf(indexObj)].successCount += 1
      } else if (parentInvoiceStatus === 1) {
        this.#invoiceDocumentList[this.#invoiceDocumentList.lastIndexOf(indexObj)].status = resultConvert.status
        this.#invoiceDocumentList[this.#invoiceDocumentList.lastIndexOf(indexObj)].skipCount += 1
      }

      resultConvert.error.push({
        errorData: errorData
      })
    })
  }
  // アップロードする明細情報取得（選択）
  getInvoice(idx) {
    return this.#invoiceDocumentList[idx]
  }
  // アップロードする明細情報取得（全体）
  getInvoiceList() {
    return this.#invoiceDocumentList
  }

  // デフォルトフォーマットをユーザーが登録したアップロードフォーマットに合わせる
  convertUserCsvFormat(uploadFormatDetail, csvColumn) {
    let result = ['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '']
    uploadFormatDetail.forEach((detail) => {
      if (csvColumn[detail.uploadFormatNumber]) {
        result[detail.defaultNumber] = csvColumn[detail.uploadFormatNumber].trim()
      } else {
        result[detail.defaultNumber] = ''
      }
    })
    return result
  }

  // ユーザーが指定した税の識別子に合わせる
  convertUserTaxidentifier(uploadFormatIdentifier) {
    let bconCsvTaxUser = { ...bconCsvTaxDefault }
    const taxidentifier = Object.keys(bconCsvTaxUser)
    uploadFormatIdentifier.map((identifier) => {
      if (identifier.extensionType === '0') {
        taxidentifier.map((tax) => {
          if (tax === identifier.defaultExtension) {
            const taxValue = bconCsvTaxUser[tax]
            delete bconCsvTaxUser[tax]
            bconCsvTaxUser[identifier.uploadFormatExtension] = taxValue
          }
        })
      }
    })
    return bconCsvTaxUser
  }

  // ユーザーが指定した単位の識別子に合わせる
  convertUserUnitidentifier(uploadFormatIdentifier) {
    let bconCsvUnitUser = { ...bconCsvUnitDefault }
    const unitidentifier = Object.keys(bconCsvUnitUser)
    uploadFormatIdentifier.map((identifier) => {
      if (identifier.extensionType === '1') {
        unitidentifier.map((unit) => {
          if (unit === identifier.defaultExtension) {
            const unitValue = bconCsvUnitUser[unit]
            delete bconCsvUnitUser[unit]
            bconCsvUnitUser[identifier.uploadFormatExtension] = unitValue
          }
        })
      }
    })
    return bconCsvUnitUser
  }
}
module.exports = bconCsvNoHeader
