const Yayoi = require('../DTO/VO/Invoice/Yayoi')
const InvoiceFactory = require('../DTO/VO/Invoice/InvoiceFactory')

class YayoiService {
  constructor(passport, contract) {
    this.invoiceFactory = new InvoiceFactory(passport, contract)
    this.contract = contract
  }

  async convertToKaikei(sentBy, businessId, minIssuedate, maxIssuedate, isCloedApproval) {
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
        for (let j = 0; j < invoiceLine[idx].coding.length; j++) {
          if (idx === 0 && j === 0) {
            if (invoiceLine.length === 1 && invoiceLine[idx].coding.length === 1) {
              yayois.push(
                new Yayoi(
                  '2111',
                  invoiceLine[idx].coding[j],
                  this.convertDebitTaxCategory,
                  this.convertCreditTaxCategory
                )
              )
            } else {
              yayois.push(
                new Yayoi(
                  '2110',
                  invoiceLine[idx].coding[j],
                  this.convertDebitTaxCategory,
                  this.convertCreditTaxCategory
                )
              )
            }
          } else if (idx === invoiceLine.length - 1 && j === invoiceLine[idx].coding.length - 1) {
            yayois.push(
              new Yayoi('2101', invoiceLine[idx].coding[j], this.convertDebitTaxCategory, this.convertCreditTaxCategory)
            )
          } else {
            yayois.push(
              new Yayoi('2100', invoiceLine[idx].coding[j], this.convertDebitTaxCategory, this.convertCreditTaxCategory)
            )
          }
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

  convertDebitTaxCategory(_taxCategory) {
    let debitCategory

    switch (_taxCategory) {
      case 'JP ????????? 10%':
        debitCategory = '???????????????10%'
        break
      case 'JP ?????????(????????????) 8%':
        debitCategory = '?????????????????????8%'
        break
      default:
        debitCategory = '?????????'
    }

    return debitCategory
  }

  convertCreditTaxCategory(_taxCategory) {
    let creditCategory

    switch (_taxCategory) {
      case 'JP ????????? 10%':
        creditCategory = '???????????????10%'
        break
      case 'JP ?????????(????????????) 8%':
        creditCategory = '?????????????????????8%'
        break
      default:
        creditCategory = '?????????'
    }

    return creditCategory
  }
}

module.exports = YayoiService
