'use strict'

const fs = require('fs')
const { v4: uuidv4 } = require('uuid')
const validate = require('./validate')
const constants = require('../constants')
const { exit } = require('process')
const bconCsvTaxDefault = require('./bconCsvTax')
const bconCsvUnitDefault = require('./bconCsvUnitcode')

class Invoice {
  #DocumentId = null
  constructor() {
    this.#DocumentId = uuidv4()
  }

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
  setMailaddress(_mailaddress) {
    this.#AccountingCustomerParty.Party.Contact.ID.value = _mailaddress
  }

  setInvoiceNumber(_invoiceNumber) {
    this.#Document.ID.value = _invoiceNumber
  }
  getInvoiceNumber() {
    return this.#Document.ID
  }
  getDocument() {
    return this.#Document
  }
  appendDocumentInvoice(_invoiceLine) {
    this.#Document.InvoiceLine.push(_invoiceLine)
  }

  setIssueDate(_issuDate) {
    this.#Document.IssueDate.value = _issuDate
  }
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

  setCustomerTennant(_tennantId) {
    this.#AccountingCustomerParty.Party.PartyIdentification[0].ID.value = _tennantId
    this.#Document.AccountingCustomerParty = this.#AccountingCustomerParty
  }
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

  #Delivery = {
    DeliveryParty: {
      Contact: {
        ElectronicMail: { value: null }
      }
    },
    ActualDeliveryDate: { value: null }
  }
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
  setAdditionalDocumentReference(_documentDescription) {
    this.#AdditionalDocumentReference.ID.value = _documentDescription
    this.#Document.AdditionalDocumentReference.push(JSON.parse(JSON.stringify(this.#AdditionalDocumentReference)))
  }

  #Note = { value: null }
  setNote(_value) {
    this.#Note.value = _value
    this.#Document.Note.push(JSON.parse(JSON.stringify(this.#Note)))
  }
}

class bconCsv {
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
    setRows(_data, _formatFlag, _uploadFormatDetail) {
      const tmpRows = _data.split(/\r?\n|\r/)
      for (let idx = 0; idx < tmpRows.length; idx++) {
        if (tmpRows[idx].trim()) {
          let docIndex
          if (_formatFlag) {
            docIndex = _uploadFormatDetail[1].uploadFormatNumber
          } else {
            docIndex = 1
          }
          this.rows.push({
            idx: idx,
            invoiceGroup: null,
            docNo: tmpRows[idx].split(',')[docIndex],
            rows: tmpRows[idx]
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

    setFile(_filePath, formatFlag, uploadFormatDetail) {
      this.setStatus(this.fileStatusEnum.LOADING)
      this.setFormatFlag(formatFlag)
      this.fd = fs.openSync(_filePath, 'r')
      this.setData(fs.readFileSync(_filePath, 'utf8'))
      this.setStatus(this.fileStatusEnum.SUCCESS)
      fs.close(this.fd, (err) => {
        if (err) {
        }
      })
      this.setRows(this.getData(), formatFlag, uploadFormatDetail)
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

  getCSVFile() {
    return this.#csvFile
  }

  // Insert instance variable the UserCostomHeaderData from DB uploadData
  setUserCustomerHeader(userCostomerHeader) {
    this.userCostomerHeader =
      userCostomerHeader
        .toString('utf-8')
        .split(/\r?\n|\r/)[0]
        .split(',') || []
  }

  #invoiceDocumentList = []

  constructor(fullFilePath, formatFlag, uploadFormatDetail, uploadFormatIdentifier, uploadData) {
    this.#csvFile.setFile(fullFilePath, formatFlag, uploadFormatDetail)
    this.setUserCustomerHeader(uploadData)
    this.convertTradeshiftInvoice(uploadFormatDetail, uploadFormatIdentifier)
  }

  convertTradeshiftInvoice(uploadFormatDetail, uploadFormatIdentifier) {
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
    let isCheckedHeader = true
    let headerFlag = true
    let userHeaderColumns = 0
    let setInvoiceLineCnt = 0
    let errorData = ''
    let bconCsvTaxUser = null
    let bconCsvUnitUser = null

    invoiceData.some((element) => {
      let csvColumn = element.rows.split(',')

      if (formatFlag && !isCheckedHeader) {
        csvColumn = this.convertUserCsvFormat(uploadFormatDetail, csvColumn)
        // Tax,Unit setting
        if (uploadFormatIdentifier.length !== 0) {
          bconCsvTaxUser = this.convertUserTaxidentifier(uploadFormatIdentifier)
          bconCsvUnitUser = this.convertUserUnitidentifier(uploadFormatIdentifier)
        }
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

        // formatFlag-ユーザが設定したフォーマットを使う場合、true
        // isCheckedHeader-カラムを１回チェックする（trueだとヘッダ行のチェックを行う。一度チェックするとfalseになる）
        // ユーザが設定したアップロードフォーマットと項目数が間違い場合
        if (isCheckedHeader) {
          isCheckedHeader = false
          switch (formatFlag) {
            case true: {
              // ファイルのカラム数格納
              userHeaderColumns = this.userCostomerHeader.length

              // カラム数確認
              let result = csvColumn.filter((col) => {
                if (col) return col
              })

              // ヘッダに取引先メールアドレスが含まれない場合、エラーにする
              if (result.indexOf('取引先メールアドレス') === -1) {
                errorData += errorData
                  ? `,${constants.invoiceErrMsg['MAILADDRESSERR003']}`
                  : `${constants.invoiceErrMsg['MAILADDRESSERR003']}`
                resultConvert.status = -1
              }

              switch (result.length) {
                case userHeaderColumns: {
                  const fileHeader = csvColumn
                  const userCostomerHeader = this.userCostomerHeader

                  const resultToCheckHeader = userCostomerHeader.filter((header, idx) => {
                    if (header !== fileHeader[idx]) {
                      return header
                    }
                  })

                  // 間違えているカラム名があった場合、エラーメッセージ格納
                  resultToCheckHeader.forEach((item) => {
                    if (item) {
                      errorData += errorData
                        ? `,${item}の${constants.invoiceErrMsg['HEADERERR000']}`
                        : `${item}の${constants.invoiceErrMsg['HEADERERR000']}`

                      resultConvert.status = -1
                    }
                  })

                  // 間違えているカラム名があった場合、終了
                  if (errorData) {
                    return this.setHeaderErrorMsg(errorData, resultConvert, parentInvoice, indexObj)
                  } else {
                    return
                  }
                }
                default: {
                  errorData += `${constants.invoiceErrMsg['HEADERERR000']}`
                  resultConvert.status = -1
                  return this.setHeaderErrorMsg(errorData, resultConvert, parentInvoice, indexObj)
                }
              }
            }
            case false: {
              switch (csvColumn.length !== constants.invoiceValidDefine.COLUMN_VALUE) {
                case true:
                  errorData += `${constants.invoiceErrMsg['HEADERERR000']}`
                  resultConvert.status = -1

                  return this.setHeaderErrorMsg(errorData, resultConvert, parentInvoice, indexObj)
                case false:
                  {
                    // ファイルのカラム名とディフォルトカラム名を比較
                    const fileHeader = csvColumn
                    const resultToCheckHeader = this.userCostomerHeader.filter((header, idx) => {
                      if (header !== fileHeader[idx]) {
                        return header
                      }
                    })

                    // 間違えているカラム名があった場合、エラーメッセージ格納
                    resultToCheckHeader.forEach((item) => {
                      if (item) {
                        errorData += errorData
                          ? `,${item}の${constants.invoiceErrMsg['HEADERERR000']}`
                          : `${item}の${constants.invoiceErrMsg['HEADERERR000']}`

                        resultConvert.status = -1
                      }
                    })
                  }

                  // 間違えているカラム名があった場合、終了
                  if (errorData) {
                    return this.setHeaderErrorMsg(errorData, resultConvert, parentInvoice, indexObj)
                  } else {
                    return
                  }
              }
            }
          }
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
        if (csvColumn[0] !== '') {
          csvColumn[0] = csvColumn[0].replace(/\//g, '-')
          let issueDateArray = csvColumn[0].split('-')
          csvColumn[0] = `${issueDateArray[0]}-${'0'.concat(issueDateArray[1]).slice(-2)}-${'0'
            .concat(issueDateArray[2])
            .slice(-2)}`

          switch (validate.isDate(csvColumn[0])) {
            case 1:
              errorData += errorData
                ? `,${constants.invoiceErrMsg['ISSUEDATEERR001']}`
                : `${constants.invoiceErrMsg['ISSUEDATEERR001']}`

              resultConvert.status = -1
              break
            case 2:
              errorData += errorData
                ? `,${constants.invoiceErrMsg['ISSUEDATEERR000']}`
                : `${constants.invoiceErrMsg['ISSUEDATEERR000']}`

              resultConvert.status = -1
              break
            default:
              break
          }
        } else {
          errorData += errorData
            ? `,${constants.invoiceErrMsg['ISSUEDATEERR002']}`
            : `${constants.invoiceErrMsg['ISSUEDATEERR002']}`

          resultConvert.status = -1
        }

        parentInvoice.setIssueDate(csvColumn[0])

        switch (validate.isInvoiceId(csvColumn[1])) {
          case '':
            break
          default:
            errorData += errorData
              ? `,${constants.invoiceErrMsg[validate.isInvoiceId(csvColumn[1])]}`
              : `${constants.invoiceErrMsg[validate.isInvoiceId(csvColumn[1])]}`

            resultConvert.status = -1
            break
        }
        resultConvert.invoicesId = element.docNo

        parentInvoice.setInvoiceNumber(csvColumn[1])

        if (csvColumn[2] !== '') {
          if (!validate.isUUID(csvColumn[2])) {
            errorData += errorData
              ? `,${constants.invoiceErrMsg['TENANTERR000']}`
              : `${constants.invoiceErrMsg['TENANTERR000']}`

            resultConvert.status = -1
          }

          const resultcheckNetworkConnection = validate.checkNetworkConnection(
            bconCsv.prototype.companyNetworkConnectionList,
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
                ? `,${constants.invoiceErrMsg[resultcheckNetworkConnection]}`
                : `${constants.invoiceErrMsg[resultcheckNetworkConnection]}`

              resultConvert.status = -1
              break
          }
        } else {
          errorData += errorData
            ? `,${constants.invoiceErrMsg['TENANTERR001']}`
            : `${constants.invoiceErrMsg['TENANTERR001']}`

          resultConvert.status = -1
        }
        parentInvoice.setCustomerTennant(csvColumn[2])

        if (csvColumn[3] !== '') {
          csvColumn[3] = csvColumn[3].replace(/\//g, '-')
          let paymentDateArray = csvColumn[3].split('-')
          csvColumn[3] = `${paymentDateArray[0]}-${'0'.concat(paymentDateArray[1]).slice(-2)}-${'0'
            .concat(paymentDateArray[2])
            .slice(-2)}`
          switch (validate.isDate(csvColumn[3])) {
            case 1:
              errorData += errorData
                ? `,${constants.invoiceErrMsg['PAYMENTDATEERR001']}`
                : `${constants.invoiceErrMsg['PAYMENTDATEERR001']}`

              resultConvert.status = -1
              break
            case 2:
              errorData += errorData
                ? `,${constants.invoiceErrMsg['PAYMENTDATEERR000']}`
                : `${constants.invoiceErrMsg['PAYMENTDATEERR000']}`

              resultConvert.status = -1
              break
            default:
              break
          }
        }

        if (csvColumn[4] !== '') {
          csvColumn[4] = csvColumn[4].replace(/\//g, '-')
          let deliveryDateArray = csvColumn[4].split('-')
          csvColumn[4] = `${deliveryDateArray[0]}-${'0'.concat(deliveryDateArray[1]).slice(-2)}-${'0'
            .concat(deliveryDateArray[2])
            .slice(-2)}`
          switch (validate.isDate(csvColumn[4])) {
            case 1:
              errorData += errorData
                ? `,${constants.invoiceErrMsg['DELIVERYDATEERR001']}`
                : `${constants.invoiceErrMsg['DELIVERYDATEERR001']}`

              resultConvert.status = -1
              break
            case 2:
              errorData += errorData
                ? `,${constants.invoiceErrMsg['DELIVERYDATEERR000']}`
                : `${constants.invoiceErrMsg['DELIVERYDATEERR000']}`

              resultConvert.status = -1
              break
            default:
              break
          }
        }
        parentInvoice.setDelivery(csvColumn[4])

        if (csvColumn[5] !== '') {
          switch (validate.isFinancialInstitution(csvColumn[5])) {
            case '':
              break
            default:
              errorData += errorData
                ? `,${constants.invoiceErrMsg[validate.isFinancialInstitution(csvColumn[5])]}`
                : `${constants.invoiceErrMsg[validate.isFinancialInstitution(csvColumn[5])]}`

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
          switch (validate.isBankName(csvColumn[7])) {
            case '':
              break
            default:
              errorData += errorData
                ? `,${constants.invoiceErrMsg[validate.isBankName(csvColumn[7])]}`
                : `${constants.invoiceErrMsg[validate.isBankName(csvColumn[7])]}`

              resultConvert.status = -1
              break
          }

          switch (validate.isFinancialName(csvColumn[8])) {
            case '':
              break
            default:
              errorData += errorData
                ? `,${constants.invoiceErrMsg[validate.isFinancialName(csvColumn[8])]}`
                : `${constants.invoiceErrMsg[validate.isFinancialName(csvColumn[8])]}`

              resultConvert.status = -1
              break
          }

          switch (validate.isAccountType(csvColumn[9])) {
            case 1:
              errorData += errorData
                ? `,${constants.invoiceErrMsg['ACCOUNTTYPEERR000']}`
                : `${constants.invoiceErrMsg['ACCOUNTTYPEERR000']}`

              resultConvert.status = -1
              break
            case 2:
              errorData += errorData
                ? `,${constants.invoiceErrMsg['ACCOUNTTYPEERR001']}`
                : `${constants.invoiceErrMsg['ACCOUNTTYPEERR001']}`

              resultConvert.status = -1
              break
            default:
              csvColumn[9] = validate.isAccountType(csvColumn[9])
              break
          }

          switch (validate.isAccountId(csvColumn[10])) {
            case '':
              break
            default:
              errorData += errorData
                ? `,${constants.invoiceErrMsg[validate.isAccountId(csvColumn[10])]}`
                : `${constants.invoiceErrMsg[validate.isAccountId(csvColumn[10])]}`

              resultConvert.status = -1
              break
          }

          switch (validate.isAccountName(csvColumn[11])) {
            case '':
              break
            default:
              errorData += errorData
                ? `,${constants.invoiceErrMsg[validate.isAccountName(csvColumn[11])]}`
                : `${constants.invoiceErrMsg[validate.isAccountName(csvColumn[11])]}`

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

        if (csvColumn[12] !== '') {
          switch (validate.isNote(csvColumn[12])) {
            case '':
              break
            default:
              errorData += errorData
                ? `,${constants.invoiceErrMsg[validate.isNote(csvColumn[12])]}`
                : `${constants.invoiceErrMsg[validate.isNote(csvColumn[12])]}`

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

      switch (validate.isSellersItemNum(csvColumn[13])) {
        case '':
          break
        default:
          errorData += errorData
            ? `,${constants.invoiceErrMsg[validate.isSellersItemNum(csvColumn[13])]}`
            : `${constants.invoiceErrMsg[validate.isSellersItemNum(csvColumn[13])]}`

          resultConvert.status = -1
          break
      }

      switch (validate.isItemName(csvColumn[14])) {
        case '':
          break
        default:
          errorData += errorData
            ? `,${constants.invoiceErrMsg[validate.isItemName(csvColumn[14])]}`
            : `${constants.invoiceErrMsg[validate.isItemName(csvColumn[14])]}`

          resultConvert.status = -1
          break
      }

      switch (validate.isQuantityValue(csvColumn[15])) {
        case '':
          break
        default:
          errorData += errorData
            ? `,${constants.invoiceErrMsg[validate.isQuantityValue(csvColumn[15])]}`
            : `${constants.invoiceErrMsg[validate.isQuantityValue(csvColumn[15])]}`

          resultConvert.status = -1
          break
      }

      // unitValidation
      if (!bconCsvUnitUser) {
        switch (validate.isUnitcode(csvColumn[16])) {
          case 'UNITERR000':
            errorData += errorData
              ? `,${constants.invoiceErrMsg[validate.isUnitcode(csvColumn[16])]}`
              : `${constants.invoiceErrMsg[validate.isUnitcode(csvColumn[16])]}`

            resultConvert.status = -1
            break
          case 'UNITERR001':
            errorData += errorData
              ? `,${constants.invoiceErrMsg[validate.isUnitcode(csvColumn[16])]}`
              : `${constants.invoiceErrMsg[validate.isUnitcode(csvColumn[16])]}`

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
              ? `,${constants.invoiceErrMsg[validate.isUserUnitcode(csvColumn[16], bconCsvUnitUser)]}`
              : `${constants.invoiceErrMsg[validate.isUserUnitcode(csvColumn[16], bconCsvUnitUser)]}`

            resultConvert.status = -1
            break
          case 'UNITERR002':
            errorData += errorData
              ? `,${constants.invoiceErrMsg[validate.isUserUnitcode(csvColumn[16], bconCsvUnitUser)]}`
              : `${constants.invoiceErrMsg[validate.isUserUnitcode(csvColumn[16], bconCsvUnitUser)]}`

            resultConvert.status = -1
            break
          default:
            csvColumn[16] = validate.isUserUnitcode(csvColumn[16], bconCsvUnitUser)
            break
        }
      }

      switch (validate.isPriceValue(csvColumn[17])) {
        case '':
          break
        default:
          errorData += errorData
            ? `,${constants.invoiceErrMsg[validate.isPriceValue(csvColumn[17])]}`
            : `${constants.invoiceErrMsg[validate.isPriceValue(csvColumn[17])]}`

          resultConvert.status = -1
          break
      }

      // taxValidation
      if (!bconCsvTaxUser) {
        switch (validate.isTaxCategori(csvColumn[18])) {
          case 'TAXERR000':
            errorData += errorData
              ? `,${constants.invoiceErrMsg[validate.isTaxCategori(csvColumn[18])]}`
              : `${constants.invoiceErrMsg[validate.isTaxCategori(csvColumn[18])]}`

            resultConvert.status = -1
            break
          case 'TAXERR001':
            errorData += errorData
              ? `,${constants.invoiceErrMsg[validate.isTaxCategori(csvColumn[18])]}`
              : `${constants.invoiceErrMsg[validate.isTaxCategori(csvColumn[18])]}`

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
              ? `,${constants.invoiceErrMsg[validate.isUserTaxCategori(csvColumn[18], bconCsvTaxUser)]}`
              : `${constants.invoiceErrMsg[validate.isUserTaxCategori(csvColumn[18], bconCsvTaxUser)]}`

            resultConvert.status = -1
            break
          case 'TAXERR002':
            errorData += errorData
              ? `,${constants.invoiceErrMsg[validate.isUserTaxCategori(csvColumn[18], bconCsvTaxUser)]}`
              : `${constants.invoiceErrMsg[validate.isUserTaxCategori(csvColumn[18], bconCsvTaxUser)]}`

            resultConvert.status = -1
            break
          default:
            csvColumn[18] = validate.isUserTaxCategori(csvColumn[18], bconCsvTaxUser)
            break
        }
      }

      if (csvColumn[19] !== '') {
        switch (validate.isDescription(csvColumn[19])) {
          case '':
            break
          default:
            errorData += errorData
              ? `,${constants.invoiceErrMsg[validate.isDescription(csvColumn[19])]}`
              : `${constants.invoiceErrMsg[validate.isDescription(csvColumn[19])]}`

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

  getInvoice(idx) {
    return this.#invoiceDocumentList[idx]
  }

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

  // ヘッダエラーチェック結果をプッシュする
  setHeaderErrorMsg(errorData, resultConvert, parentInvoice, indexObj) {
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
module.exports = bconCsv
