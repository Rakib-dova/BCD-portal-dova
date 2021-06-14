'use strict'

const fs = require('fs')
const apiManager = require('../controllers/apiManager')
const { v4: uuidv4 } = require('uuid')
const logger = require('./logger')
const axios = require('axios')

class bconCsv {
    DocumentId = []
    issuedateValue = null
    ID = null
    AccountingCustomerParty = {
        Party:{
            PartyIdentification: [
                {
                    ID: {
                        value: null,
                        schemeID: 'TS:ID',
                        schemeName: "Tradeshift identifier"
                    }
                }
            ],
            PartyName: [
                {
                    Name:{
                        value:null
                    }
                }
            ],
            PostalAddress: {
                StreetName: {
                    value: null
                },
                BuildingNumber: {
                    value: null
                },
                CityName: {
                    value: null
                },
                PostalZone: {
                    value: null
                },
                Country: {
                    IdentificationCode: {
                        value: 'JP'
                    }
                }
            },
            Contact: {
                ElectronicMail: {
                    value: null
                }
            }
        }
    }

    InvoiceLine = [{
        ID: {
            value: '1'
        },
        InvoicedQuantity: {
            value: null,
            unitCode: null
        },
        LineExtensionAmount: {
            value: null,
            currencyID: 'JPY'
        },
        TaxTotal: [
            {
                TaxSubtotal: [
                    {
                        TaxCategory:{
                            ID: {
                                value: 'S',
                                schemeID: "UN/ECE 5305",
                                schemeAgencyID: '6',
                                schemeVersionID: 'D08B'
                            },
                            Percent: {
                                value: 10
                            },
                            TaxScheme: {
                                ID: {
                                    value: 'VAT',
                                    schemeID: "UN/ECE 5153 Subset",
                                    schemeAgencyID: '6',
                                    schemeVersionID: 'D08B'
                                },
                                Name: {
                                    value: "JP 消費税 10%"
                                }
                            }
                        }
                    }
                ]
            }
        ],
        Item: {
            Name: {
                value: null
            },
            SellersItemIdentification:{
                ID: {
                    value: null
                }
            }
        },
        Price: {
            PriceAmount: {
                value: null,
                currencyID: null
            },
            BaseQuantity: {
                value: null,
                unitCode: null
            },
            OrderableUnitFactorRate:{
                value: null
            }
        },
    }]

    body = {
        DocumentType: 'InvoiceType',
        UBLVersionID: {
            value: '2.0'
        },
        CustomizationID: {
            value: 'urn:tradeshift.com:ubl-2.0-customizations:2010-06'
        },
        ProfileID:{
            value: "urn:www.cenbii.eu:profile:bii04:ver1.0",
            schemeID: "CWA 16073:2010",
            schemeAgencyID: "CEN/ISSS WS/BII",
            schemeVersionID: '1'
        },
        ID: {
            value: this.ID
        },
        IssueDate:{
            value: this.issuedateValue
        },
        InvoiceTypeCode: {
            value: '380',
            listID: "UN/ECE 1001 Subset",
            listAgencyID: '6',
            listVersionID: 'D08B'
        },
        DocumentCurrencyCode:{
            value: 'JPY'
        },
        AccountingCustomerParty: this.AccountingCustomerParty,
        InvoiceLine: this.InvoiceLine

    }
    constructor (fullPathFile) {
        this.csvFile = fullPathFile
        this.csvData
        this.csvData = fs.readFileSync(this.csvFile, 'utf8')
        this.rows = this.csvData.split(/\r?\n|\r/)
        this.length = this.rows.length - 1
        this.invoice = []
        this.setInvoice()  
    }

    setInvoice() {
        let col = null
        for (let idx = 1; idx < this.length; idx++) {
          col = this.rows[idx].split(',')
          this.DocumentId.push(uuidv4())
          this.body.IssueDate.value = col[0]
          this.body.ID.value = col[1]
          this.AccountingCustomerParty.Party.PartyName[0].Name.value = col[2]
          this.AccountingCustomerParty.Party.PostalAddress.PostalZone.value = col[3]
          this.AccountingCustomerParty.Party.PostalAddress.CityName.value = col[4]
          this.AccountingCustomerParty.Party.PostalAddress.StreetName.value = col[5]
          this.AccountingCustomerParty.Party.PostalAddress.BuildingNumber.value = col[6]
          this.AccountingCustomerParty.Party.Contact.ElectronicMail.value =  col[7]
          this.AccountingCustomerParty.Party.PartyIdentification[0].ID.value =  col[8]
          this.body.AccountingCustomerParty = this.AccountingCustomerParty
          this.InvoiceLine[0].Item.SellersItemIdentification.ID.value = col[19]
          this.InvoiceLine[0].Item.Name.value = col[20]
          this.InvoiceLine[0].InvoicedQuantity.value = parseInt(col[21], 10)
          this.InvoiceLine[0].InvoicedQuantity.unitCode = col[22]
          this.InvoiceLine[0].LineExtensionAmount.value= parseInt(col[23],10)
          this.InvoiceLine[0].Price.PriceAmount.value = parseInt(col[23], 10)
          this.InvoiceLine[0].Price.PriceAmount.currencyID = col[24]
          this.InvoiceLine[0].Price.BaseQuantity.value = parseInt(col[25], 10)
          this.InvoiceLine[0].Price.BaseQuantity.unitCode = col[26]
          this.InvoiceLine[0].Price.OrderableUnitFactorRate.value = parseInt(col[27], 10)
          this.InvoiceLine[0].TaxTotal[0].TaxSubtotal[0].TaxCategory.Percent.value = parseInt(col[28], 10)
          this.body.InvoiceLine[0] = this.InvoiceLine[0]
          this.invoice.push(JSON.stringify(this.body))
        }
    }

    sendInvoice(user) {
        for (let idx = 0; idx < this.length; idx++) {
            this.putInvoice(user.accessToken, this.DocumentId[idx], this.invoice[idx]).then((response) => {
            console.log(response)
            return response
        })
        }
    }
    
    putInvoice (accessToken, _documentId, _body){
        let queryStr = '?draft=true&documentProfileId=tradeshift.invoice.1.0'
        let setHeaders = {}
        setHeaders['Accepts'] = '*/*'
        setHeaders['Authorization'] = `Bearer ${accessToken}`
        setHeaders['Content-Type'] = 'application/json'
        const res = axios.put(
             `https://${process.env.TS_API_HOST}/tradeshift/rest/external/documents/${_documentId}${queryStr}`,
             _body,
             {
                 headers:setHeaders
             }
        )
        return res
    }


}
module.exports = bconCsv
