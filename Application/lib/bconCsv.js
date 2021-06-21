'use strict'

const fs = require('fs')
const apiManager = require('../controllers/apiManager')
const { v4: uuidv4 } = require('uuid')
const logger = require('./logger')
const axios = require('axios')
const { col } = require('sequelize')
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
              Percent: { value: 10 },
              TaxScheme: {
                ID: { value: 'VAT', schemeID: 'UN/ECE 5153 Subset', schemeAgencyID: '6', schemeVersionID: 'D08B' },
                Name: { value: 'JP 消費税 10%' }
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
  setInvoiceLine(
    _sellersItemNum,
    _itemName,
    _quantityValue,
    _quantityUnitCode,
    _priceValue,
    _taxRate,
    _description
  ) {
    this.#InvoiceLine.Item.SellersItemIdentification.ID.value = _sellersItemNum
    this.#InvoiceLine.Item.Name.value = _itemName
    this.#InvoiceLine.InvoicedQuantity.value = parseInt(_quantityValue, 10)
    this.#InvoiceLine.InvoicedQuantity.unitCode = _quantityUnitCode
    this.#InvoiceLine.Price.PriceAmount.value = _priceValue
    this.#InvoiceLine.TaxTotal[0].TaxSubtotal[0].TaxCategory.Percent.value = _taxRate
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
    this.#PaymentMeans.PaymentDueDate.value = _paymentDate
    this.#PaymentMeans.PayeeFinancialAccount.FinancialInstitutionBranch.FinancialInstitution.Name.value =
      _financialInstitution
    this.#PaymentMeans.PayeeFinancialAccount.FinancialInstitutionBranch.Name.value = _financialName
    this.#PaymentMeans.PayeeFinancialAccount.AccountTypeCode.value = _accountType
    this.#PaymentMeans.PayeeFinancialAccount.ID.value = _accountId
    this.#PaymentMeans.PayeeFinancialAccount.Name.value = _accountName
    this.#Document.PaymentMeans.push(JSON.parse(JSON.stringify(this.#PaymentMeans)))
  }

  #Delivery = { ActualDeliveryDate: { value: null } }
  setDelivery(_delveryDate) {
    this.#Delivery.ActualDeliveryDate.value = _delveryDate
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
      const tmpRows = _data.split(/\r?\n|\r/).slice(1)
      for (let idx = 0; idx < tmpRows.length; idx++) {
        if (tmpRows[idx].trim()) {
          this.rows.push({
            idx: idx,
            docNo: tmpRows[idx].split(',')[1],
            rows: tmpRows[idx]
          })
        }
      }
      this.invoiceCnt = this.rows.length
      this.rows.sort((a, b) => {
        if (a.docNo > b.docNo) {
          return 1
        } else if (a.docNo < b.docNo) {
          return -1
        } else {
          if (a.idx > b.idx) {
            return 1
          } else if (a.idx < b.idx) {
            return -1
          } else {
            return 0
          }
        }
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
  #failedInvoiceList = []

  constructor(fullFilePath) {
    this.#csvFile.setFile(fullFilePath)
    this.convertTradeshiftInvoice()
  }

  convertTradeshiftInvoice() {
    const invoiceData = this.#csvFile.getRows()
    let listIdx = 0
    for (let idx = 0; invoiceData[idx] !== undefined; listIdx++) {
      const parentInvoiceDocNo = invoiceData[idx].docNo
      const rows = invoiceData[idx].rows
      const column = rows.split(',')
      this.#invoiceDocumentList.push(new Invoice())
      this.#invoiceDocumentList[listIdx].setIssueDate(column[0])
      this.#invoiceDocumentList[listIdx].setInvoiceNumber(column[1])
      this.#invoiceDocumentList[listIdx].setCustomerTennant(column[2])
      this.#invoiceDocumentList[listIdx].setDelivery(column[4])
      this.#invoiceDocumentList[listIdx].setAdditionalDocumentReference(column[5])
      this.#invoiceDocumentList[listIdx].setPaymentMeans(
        column[3],
        column[6],
        column[7],
        column[8],
        column[9],
        column[10]
      )
      this.#invoiceDocumentList[listIdx].setNote(column[11])
      this.#invoiceDocumentList[listIdx].setInvoiceLine(
        column[12],
        column[13],
        column[14],
        column[15],
        column[16],
        column[17],
        column[18]
      )
      let checkedIdx = invoiceData[idx].idx
      let checkedSubIdx = null
      for (
        let subIdx = idx + 1;
        invoiceData[subIdx] !== undefined && parentInvoiceDocNo === invoiceData[subIdx].docNo;
        subIdx++, checkedSubIdx = subIdx
      ) {
        const subColumn = invoiceData[subIdx].rows.split(',')
        if (invoiceData[subIdx].idx - checkedIdx === 1) {
          this.#invoiceDocumentList[listIdx].setInvoiceLine(
            subColumn[12],
            subColumn[13],
            subColumn[14],
            subColumn[15],
            subColumn[16],
            subColumn[17],
            subColumn[18]
          )
          checkedIdx++
        } else {
          this.#failedInvoiceList.push(invoiceData[subIdx])
        }
      }
      idx = checkedSubIdx
    }
  }

  getInvoice(idx) {
    return this.#invoiceDocumentList[idx]
  }

  getInvoiceList() {
    return this.#invoiceDocumentList
  }
}
module.exports = bconCsv
