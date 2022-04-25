const SupplierParty = require('./SupplierParty')
const CustomerParty = require('./CustomerParty')
const Delivery = require('./Delivery')
const LegalMonetaryTotal = require('./LegalMonetaryTotal')
const PaymentMeans = require('./PaymentMeans')
const TaxTotal = require('./TaxTotal')
const InvoiceLine = require('./InvoiceLine')

class Invoice {
  constructor(document, coding) {
    this.documentId = document.documentId
    this.invoiceId = document.ID.value
    this.issueDate = document.IssueDate.value
    this.currencyCode = document.DocumentCurrencyCode.value
    this.supplierParty = new SupplierParty(document.AccountingSupplierParty)
    this.customerParty = new CustomerParty(document.AccountingCustomerParty)

    this.delivery = null
    if (document.Delivery) {
      this.delivery = new Delivery(document.Delivery)
    }
    this.legalMonetaryTotal = new LegalMonetaryTotal(document.LegalMonetaryTotal)

    this.paymentMeans = []
    if (document.PaymentMeans) {
      for (const paymentMeans of document.PaymentMeans) {
        this.paymentMeans.push(new PaymentMeans(paymentMeans))
      }
    }

    this.taxTotal = []
    for (const taxTotal of document.TaxTotal) {
      this.taxTotal.push(new TaxTotal(taxTotal))
    }

    this.invoiceLine = []
    for (const invoiceLine of document.InvoiceLine) {
      this.invoiceLine.push(new InvoiceLine(invoiceLine, coding))
    }

    const keys = Object.keys(this)
    keys.forEach((property) => {
      Object.defineProperty(this, property, { writable: false })
    })
  }
}

module.exports = Invoice
