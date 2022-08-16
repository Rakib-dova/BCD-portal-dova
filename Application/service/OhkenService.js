const Ohken = require('../DTO/VO/Invoice/Ohken')
const InvoiceFactory = require('../DTO/VO/Invoice/InvoiceFactory')

class OhkenService {
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
    const ohkens = []

    if (invoices === null) return null

    let invoiceNo = 1
    for (const invoice of invoices) {
      const invoiceLine = invoice.invoiceLine
      for (let idx = 0; idx < invoiceLine.length; idx++) {
        for (let j = 0; j < invoiceLine[idx].coding.length; j++) {
          ohkens.push(
            new Ohken(
              invoiceNo,
              invoiceLine[idx].coding[j],
              this.convertDebitTaxCategory,
              this.convertCreditTaxCategory
            )
          )
        }
      }
      invoiceNo++
    }

    let ohkenFormat = ''
    for (const ohken of ohkens) {
      ohkenFormat = `${ohkenFormat}${JSON.stringify([
        `${ohken.dateYear}`,
        `${ohken.dateMonth}`,
        `${ohken.dateDay}`,
        `${ohken.periodFlag}`,
        `${ohken.voucherNo}`,
        `${ohken.voucherDepartmentCode}`,
        '',
        `${ohken.debitAccountCode}`,
        `${ohken.debitSubAccountCode}`,
        '',
        `${ohken.debitDepartmentCode}`,
        '',
        `${ohken.debitTaxCode}`,
        '',
        '',
        `${ohken.debitAmount}`,
        '',
        '',
        '',
        '',
        `${ohken.creditAccountCode}`,
        `${ohken.creditSubAccountCode}`,
        '',
        `${ohken.creditDepartmentCode}`,
        '',
        `${ohken.creditTaxCode}`,
        '',
        '',
        `${ohken.creditAmount}`,
        '',
        '',
        '',
        '',
        `${ohken.note}`,
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        ''
      ])}\r\n`
    }
    return ohkenFormat.replace(/\[|\]/g, '')
  }

  convertDebitTaxCategory(_taxCategory, amount) {
    let debitTaxCode

    switch (_taxCategory) {
      case 'JP 消費税 10%':
        debitTaxCode = ['115', '']
        break
      case 'JP 消費税(軽減税率) 8%':
        debitTaxCode = ['114', '']
        break
      case 'JP 不課税 0%':
        debitTaxCode = ['000', '']
        break
      case 'JP 免税 0%':
        debitTaxCode = ['211', '']
        break
      case 'JP 非課税 0%':
        debitTaxCode = ['311', '']
        break
      default:
        debitTaxCode = ['999', '']
    }

    return debitTaxCode
  }

  convertCreditTaxCategory(_taxCategory, amount) {
    let creditTaxCode

    switch (_taxCategory) {
      case 'JP 消費税 10%':
        creditTaxCode = ['115', '']
        break
      case 'JP 消費税(軽減税率) 8%':
        creditTaxCode = ['114', '']
        break
      case 'JP 不課税 0%':
        creditTaxCode = ['000', '']
        break
      case 'JP 免税 0%':
        creditTaxCode = ['211', '']
        break
      case 'JP 非課税 0%':
        creditTaxCode = ['811', '']
        break
      default:
        creditTaxCode = ['999', '']
    }

    return creditTaxCode
  }
}

module.exports = OhkenService
