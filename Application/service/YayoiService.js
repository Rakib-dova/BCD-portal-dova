const Yayoi = require('../DTO/VO/Invoice/Yayoi')
const InvoiceFactory = require('../DTO/VO/Invoice/InvoiceFactory')

class YayoiService {
  constructor(passport, contract) {
    this.invoiceFactory = new InvoiceFactory(passport, contract)
    this.contract = contract
  }

  async convertToYayoi(sentBy, businessId, minIssuedate, maxIssuedate, isCloedApproval) {
    const invoices = await this.invoiceFactory.getInvoices(
      sentBy,
      businessId,
      minIssuedate,
      maxIssuedate,
      isCloedApproval
    )
    const yayois = []

    if (invoices === null) return null

    for (const invoice of invoices) {
      const invoiceLine = invoice.invoiceLine
      for (let idx = 0; idx < invoiceLine.length; idx++) {
        if (invoiceLine.length === 1 && invoiceLine[idx].coding.length === 1) {
          for (const coding of invoiceLine[idx].coding) {
            yayois.push(new Yayoi('2111', invoiceLine[idx], coding))
          }
        } else {
          for (const coding of invoiceLine[idx].coding) {
            if (idx === 0 && coding.id === 1) {
              yayois.push(new Yayoi('2110', invoiceLine[idx], coding))
            } else if (idx === invoiceLine.length && coding.id === invoiceLine[idx].coding.length) {
              yayois.push(new Yayoi('2100', invoiceLine[idx], coding))
            } else {
              yayois.push(new Yayoi('2101', invoiceLine[idx], coding))
            }
          }
        }
      }
    }

    return await yayois
  }
}

module.exports = YayoiService
