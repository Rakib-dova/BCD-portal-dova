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
        for (const coding of invoiceLine[idx].coding) {
          yayois.push(new Yayoi('2000', coding))
        }
      }
    }

    let yayoiFormat = ''
    for (const yayoi of yayois) {
      yayoiFormat = `${yayoiFormat}${JSON.stringify([
        yayoi.header,
        yayoi.voucherNo,
        yayoi.isClosing,
        yayoi.actualDeliveryDate,
        yayoi.debitAccountName,
        yayoi.debitSubAccountName,
        yayoi.debitDepartMent,
        yayoi.debitTax,
        `${yayoi.debitAmount}`,
        `${yayoi.debitTaxAmount}`,
        yayoi.creditAccountName,
        yayoi.creditSubAccountName,
        yayoi.creditDepartMent,
        yayoi.creditTax,
        `${yayoi.creditAmount}`,
        `${yayoi.creditTaxAmount}`,
        yayoi.scrip,
        yayoi.checkNo,
        yayoi.paymentDueDate,
        yayoi.type,
        yayoi.resource,
        yayoi.codingMemo,
        yayoi.note1,
        yayoi.note2,
        yayoi.coordinate
      ])}\r\n`
    }
    return yayoiFormat.replace(/\[|\]/g, '')
  }
}

module.exports = YayoiService
