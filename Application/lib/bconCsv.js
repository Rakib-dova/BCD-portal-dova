'use strict'

const fs = require('fs')
const { v4: uuidv4 } = require('uuid')
const logger = require('./logger')
const validate = require('./validate')
const constants = require('../constants')
const { exit } = require('process')

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
      Contact: { ElectronicMail: { value: null } }
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
    this.#PaymentMeans.PayeeFinancialAccount.FinancialInstitutionBranch.FinancialInstitution.Name.value =
      _financialInstitution
    this.#PaymentMeans.PayeeFinancialAccount.FinancialInstitutionBranch.Name.value = _financialName
    this.#PaymentMeans.PayeeFinancialAccount.AccountTypeCode.value = _accountType
    this.#PaymentMeans.PayeeFinancialAccount.ID.value = _accountId
    this.#PaymentMeans.PayeeFinancialAccount.Name.value = _accountName
    this.#Document.PaymentMeans.push(JSON.parse(JSON.stringify(this.#PaymentMeans)))
  }

  #Delivery = { ActualDeliveryDate: { value: null } }
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
    data: null,
    rows: [],
    invoiceCnt: null,
    setData(_data) {
      this.data = _data
    },

    getData() {
      return this.data
    },
    setRows(_data) {
      const tmpRows = _data.split(/\r?\n|\r/)
      for (let idx = 0; idx < tmpRows.length; idx++) {
        if (tmpRows[idx].trim()) {
          this.rows.push({
            idx: idx,
            invoiceGroup: null,
            docNo: tmpRows[idx].split(',')[1],
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

    setFile(_filePath) {
      this.setStatus(this.fileStatusEnum.LOADING)
      this.fd = fs.openSync(_filePath, 'r')
      this.setData(fs.readFileSync(_filePath, 'utf8'))
      this.setStatus(this.fileStatusEnum.SUCCESS)
      fs.close(this.fd, (err) => {
        if (err) {
        }
      })
      this.setRows(this.getData())
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

  #invoiceDocumentList = []

  constructor(fullFilePath) {
    this.#csvFile.setFile(fullFilePath)
    this.convertTradeshiftInvoice()
  }

  convertTradeshiftInvoice() {
    // CSVカーラム
    //   発行日, 請求書番号, テナントID, 支払期日, 納品日, 備考, 銀行名, 支店名, 科目, 口座番号, 口座名義, その他特記事項
    //   明細-項目ID, 明細-内容, 明細-数量, 明細-単位, 明細-単価, 明細-税, 明細-備考
    const resultConvert = {
      invoiceDetailId: null, // invoiceDetailテーブルのinvoiceDetailIdカーラム
      invoicesId: null, // invoicesテーブルとinvoiceDetailテーブルの紐づくため、invoicesのinvoicesId
      invoiceId: null, // 請求書番号
      lines: null,
      status: null,
      errorData: null,
      INVOICE: null
    }
    const invoiceData = this.#csvFile.getRows()
    let parentInvoice = null
    let indexObj = null
    let headerchk = true
    let headerFlag = true
    let setInvoiceLineErrCnt = 0
    let setInvoiceLineCnt = 0
    invoiceData.some((element) => {
      const csvColumn = element.rows.split(',')
      resultConvert.invoiceDetailId = uuidv4()
      resultConvert.invoiceId = csvColumn[1]
      resultConvert.lines = element.idx + 1
      resultConvert.status = 0
      resultConvert.errorData = ''
      if (parentInvoice?.getInvoiceNumber().value !== element.docNo) {
        headerFlag = true
        setInvoiceLineErrCnt = 0
        setInvoiceLineCnt = 0
        parentInvoice = new Invoice()

        if (csvColumn.length !== constants.invoiceValidDefine.COLUMN_VALUE && headerchk) {
          resultConvert.errorData += `${constants.invoiceErrMsg['HEADERERR000']}`
          resultConvert.status = -1
          headerchk = false
          indexObj = {
            ...resultConvert,
            INVOICE: parentInvoice
          }
          this.#invoiceDocumentList.push(indexObj)
          return true
        } else if (csvColumn.length === constants.invoiceValidDefine.COLUMN_VALUE && headerchk) {
          headerchk = false
          return
        }

        if (csvColumn.length !== constants.invoiceValidDefine.COLUMN_VALUE) {
          resultConvert.errorData += `${constants.invoiceErrMsg['COLUMNERR000']}`
          resultConvert.status = -1
        }

        csvColumn[0] = csvColumn[0].replace(/\//g, '-')
        let issueDateArray = csvColumn[0].split('-')
        csvColumn[0] =
          issueDateArray[0] + '-' + `0${issueDateArray[1]}`.slice(-2) + '-' + `0${issueDateArray[2]}`.slice(-2)
        switch (validate.isDate(csvColumn[0])) {
          case 1:
            resultConvert.errorData += resultConvert.errorData
              ? `,${constants.invoiceErrMsg['ISSUEDATEERR001']}`
              : `${constants.invoiceErrMsg['ISSUEDATEERR001']}`

            resultConvert.status = -1
            break
          case 2:
            resultConvert.errorData += resultConvert.errorData
              ? `,${constants.invoiceErrMsg['ISSUEDATEERR000']}`
              : `${constants.invoiceErrMsg['ISSUEDATEERR000']}`

            resultConvert.status = -1
            break
          default:
            break
        }

        parentInvoice.setIssueDate(csvColumn[0])

        switch (validate.isInvoiceId(csvColumn[1])) {
          case '':
            break
          default:
            resultConvert.errorData += resultConvert.errorData
              ? `,${constants.invoiceErrMsg[validate.isInvoiceId(csvColumn[1])]}`
              : `${constants.invoiceErrMsg[validate.isInvoiceId(csvColumn[1])]}`

            resultConvert.status = -1
            break
        }
        resultConvert.invoicesId = element.docNo
        parentInvoice.setInvoiceNumber(csvColumn[1])

        if (!validate.isUUID(csvColumn[2])) {
          resultConvert.errorData += resultConvert.errorData
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
            resultConvert.errorData += resultConvert.errorData
              ? `,${constants.invoiceErrMsg[resultcheckNetworkConnection]}`
              : `${constants.invoiceErrMsg[resultcheckNetworkConnection]}`

            resultConvert.status = -1
            break
        }

        parentInvoice.setCustomerTennant(csvColumn[2])

        if (csvColumn[3] !== '') {
          csvColumn[3] = csvColumn[3].replace(/\//g, '-')
          let paymentDateArray = csvColumn[3].split('-')
          csvColumn[3] =
            paymentDateArray[0] + '-' + `0${paymentDateArray[1]}`.slice(-2) + '-' + `0${paymentDateArray[2]}`.slice(-2)
          switch (validate.isDate(csvColumn[3])) {
            case 1:
              resultConvert.errorData += resultConvert.errorData
                ? `,${constants.invoiceErrMsg['PAYMENTDATEERR001']}`
                : `${constants.invoiceErrMsg['PAYMENTDATEERR001']}`

              resultConvert.status = -1
              break
            case 2:
              resultConvert.errorData += resultConvert.errorData
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
          csvColumn[4] =
            deliveryDateArray[0] +
            '-' +
            `0${deliveryDateArray[1]}`.slice(-2) +
            '-' +
            `0${deliveryDateArray[2]}`.slice(-2)
          switch (validate.isDate(csvColumn[4])) {
            case 1:
              resultConvert.errorData += resultConvert.errorData
                ? `,${constants.invoiceErrMsg['DELIVERYDATEERR001']}`
                : `${constants.invoiceErrMsg['DELIVERYDATEERR001']}`

              resultConvert.status = -1
              break
            case 2:
              resultConvert.errorData += resultConvert.errorData
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
              resultConvert.errorData += resultConvert.errorData
                ? `,${constants.invoiceErrMsg[validate.isFinancialInstitution(csvColumn[5])]}`
                : `${constants.invoiceErrMsg[validate.isFinancialInstitution(csvColumn[5])]}`

              resultConvert.status = -1
              break
          }
        }
        parentInvoice.setAdditionalDocumentReference(csvColumn[5])

        if (csvColumn[6] !== '') {
          switch (validate.isBankName(csvColumn[6])) {
            case '':
              break
            default:
              resultConvert.errorData += resultConvert.errorData
                ? `,${constants.invoiceErrMsg[validate.isBankName(csvColumn[6])]}`
                : `${constants.invoiceErrMsg[validate.isBankName(csvColumn[6])]}`

              resultConvert.status = -1
              break
          }
        }

        if (csvColumn[7] !== '') {
          switch (validate.isFinancialName(csvColumn[7])) {
            case '':
              break
            default:
              resultConvert.errorData += resultConvert.errorData
                ? `,${constants.invoiceErrMsg[validate.isFinancialName(csvColumn[7])]}`
                : `${constants.invoiceErrMsg[validate.isFinancialName(csvColumn[7])]}`

              resultConvert.status = -1

              console.log(resultConvert.errorData)
              break
          }
        }

        if (csvColumn[8] !== '') {
          switch (validate.isAccountType(csvColumn[8])) {
            case 1:
              resultConvert.errorData += resultConvert.errorData
                ? `,${constants.invoiceErrMsg['ACCOUNTTYPEERR000']}`
                : `${constants.invoiceErrMsg['ACCOUNTTYPEERR000']}`

              resultConvert.status = -1
              break
            default:
              csvColumn[8] = validate.isAccountType(csvColumn[8])
              break
          }
        }

        if (csvColumn[9] !== '') {
          switch (validate.isAccountId(csvColumn[9])) {
            case '':
              break
            default:
              resultConvert.errorData += resultConvert.errorData
                ? `,${constants.invoiceErrMsg[validate.isAccountId(csvColumn[9])]}`
                : `${constants.invoiceErrMsg[validate.isAccountId(csvColumn[9])]}`

              resultConvert.status = -1
              break
          }
        }

        if (csvColumn[10] !== '') {
          switch (validate.isAccountName(csvColumn[10])) {
            case '':
              break
            default:
              resultConvert.errorData += resultConvert.errorData
                ? `,${constants.invoiceErrMsg[validate.isAccountName(csvColumn[10])]}`
                : `${constants.invoiceErrMsg[validate.isAccountName(csvColumn[10])]}`

              resultConvert.status = -1
              break
          }
        }

        parentInvoice.setPaymentMeans(
          csvColumn[3],
          csvColumn[6],
          csvColumn[7],
          csvColumn[8],
          csvColumn[9],
          csvColumn[10]
        )

        if (csvColumn[11] !== '') {
          switch (validate.isNote(csvColumn[11])) {
            case '':
              break
            default:
              resultConvert.errorData += resultConvert.errorData
                ? `,${constants.invoiceErrMsg[validate.isNote(csvColumn[11])]}`
                : `${constants.invoiceErrMsg[validate.isNote(csvColumn[11])]}`

              resultConvert.status = -1
              break
          }
        }
        parentInvoice.setNote(csvColumn[11])

        this.#invoiceDocumentList.forEach((ele) => {
          if (ele.INVOICE.getDocument().ID.value === element.docNo) {
            resultConvert.status = 1
          }
        })
        indexObj = {
          ...resultConvert,
          INVOICE: parentInvoice
        }
        this.#invoiceDocumentList.push(indexObj)

        resultConvert.errorData = ''
        if (resultConvert.status === -1) headerFlag = false
      }

      setInvoiceLineCnt++

      switch (validate.isSellersItemNum(csvColumn[12])) {
        case '':
          break
        default:
          resultConvert.errorData += resultConvert.errorData
            ? `,${constants.invoiceErrMsg[validate.isSellersItemNum(csvColumn[12])]}`
            : `${constants.invoiceErrMsg[validate.isSellersItemNum(csvColumn[12])]}`

          resultConvert.status = -1
          setInvoiceLineErrCnt++
          break
      }

      switch (validate.isItemName(csvColumn[13])) {
        case '':
          break
        default:
          resultConvert.errorData += resultConvert.errorData
            ? `,${constants.invoiceErrMsg[validate.isItemName(csvColumn[13])]}`
            : `${constants.invoiceErrMsg[validate.isItemName(csvColumn[13])]}`

          resultConvert.status = -1
          setInvoiceLineErrCnt++
          break
      }

      switch (validate.isQuantityValue(csvColumn[14])) {
        case '':
          break
        default:
          resultConvert.errorData += resultConvert.errorData
            ? `,${constants.invoiceErrMsg[validate.isQuantityValue(csvColumn[14])]}`
            : `${constants.invoiceErrMsg[validate.isQuantityValue(csvColumn[14])]}`

          resultConvert.status = -1
          setInvoiceLineErrCnt++
          break
      }

      switch (validate.isUnitcode(csvColumn[15])) {
        case 'UNITERR000':
          resultConvert.errorData += resultConvert.errorData
            ? `,${constants.invoiceErrMsg[validate.isUnitcode(csvColumn[15])]}`
            : `${constants.invoiceErrMsg[validate.isUnitcode(csvColumn[15])]}`

          resultConvert.status = -1
          setInvoiceLineErrCnt++
          break
        default:
          csvColumn[15] = validate.isUnitcode(csvColumn[15])
          break
      }

      switch (validate.isPriceValue(csvColumn[16])) {
        case '':
          break
        default:
          resultConvert.errorData += resultConvert.errorData
            ? `,${constants.invoiceErrMsg[validate.isPriceValue(csvColumn[16])]}`
            : `${constants.invoiceErrMsg[validate.isPriceValue(csvColumn[16])]}`

          resultConvert.status = -1
          setInvoiceLineErrCnt++
          break
      }

      switch (validate.isTaxCategori(csvColumn[17])) {
        case 'TAXERR000':
          resultConvert.errorData += resultConvert.errorData
            ? `,${constants.invoiceErrMsg[validate.isTaxCategori(csvColumn[17])]}`
            : `${constants.invoiceErrMsg[validate.isTaxCategori(csvColumn[17])]}`

          resultConvert.status = -1
          setInvoiceLineErrCnt++
          break
        default:
          csvColumn[17] = validate.isTaxCategori(csvColumn[17])
          break
      }

      if (csvColumn[18] !== '') {
        switch (validate.isDescription(csvColumn[18])) {
          case '':
            break
          default:
            resultConvert.errorData += resultConvert.errorData
              ? `,${constants.invoiceErrMsg[validate.isDescription(csvColumn[18])]}`
              : `${constants.invoiceErrMsg[validate.isDescription(csvColumn[18])]}`

            resultConvert.status = -1
            setInvoiceLineErrCnt++
            break
        }
      }

      if (resultConvert.status !== -1 && headerFlag) {
        parentInvoice.setInvoiceLine(
          csvColumn[12],
          csvColumn[13],
          csvColumn[14],
          csvColumn[15],
          csvColumn[16],
          csvColumn[17],
          csvColumn[18]
        )
        this.#invoiceDocumentList[this.#invoiceDocumentList.lastIndexOf(indexObj)].status = resultConvert.status
      } else {
        if (setInvoiceLineCnt === 1 && headerFlag) {
          this.#invoiceDocumentList[this.#invoiceDocumentList.lastIndexOf(indexObj)].status = resultConvert.status
          this.#invoiceDocumentList[this.#invoiceDocumentList.lastIndexOf(indexObj)].errorData +=
            resultConvert.errorData
        } else if (
          this.#invoiceDocumentList[this.#invoiceDocumentList.lastIndexOf(indexObj)].errorData === '' &&
          setInvoiceLineErrCnt > 0
        ) {
          this.#invoiceDocumentList[this.#invoiceDocumentList.lastIndexOf(indexObj)].errorData +=
            resultConvert.errorData
        } else if (
          this.#invoiceDocumentList[this.#invoiceDocumentList.lastIndexOf(indexObj)].errorData !== '' &&
          setInvoiceLineErrCnt > 0
        ) {
          this.#invoiceDocumentList[this.#invoiceDocumentList.lastIndexOf(indexObj)].errorData +=
            ',' + resultConvert.errorData
        }
      }
    })
  }

  getInvoice(idx) {
    return this.#invoiceDocumentList[idx]
  }

  getInvoiceList() {
    return this.#invoiceDocumentList
  }
}
module.exports = bconCsv
