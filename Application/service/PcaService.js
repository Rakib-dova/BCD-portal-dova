const Pca = require('../DTO/VO/Invoice/Pca')
const InvoiceFactory = require('../DTO/VO/Invoice/InvoiceFactory')
const logger = require('../lib/logger')

class PcaService {
  constructor(passport, contract) {
    this.invoiceFactory = new InvoiceFactory(passport, contract)
    this.contract = contract
    this.format = this.readFormatFile()
  }

  async convertToKaikei(sentBy, businessId, minIssuedate, maxIssuedate, isCloedApproval) {
    const invoices = await this.invoiceFactory.getInvoices(
      sentBy,
      businessId,
      minIssuedate,
      maxIssuedate,
      isCloedApproval
    )
    const pcas = []
    if (invoices === null) return null

    for (const invoice of invoices) {
      const invoiceLine = invoice.invoiceLine
      for (let idx = 0; idx < invoiceLine.length; idx++) {
        for (let j = 0; j < invoiceLine[idx].coding.length; j++) {
          if (idx === 0 && j === 0) {
            if (invoiceLine.length === 1 && invoiceLine[idx].coding.length === 1) {
              pcas.push(
                new Pca('*', invoiceLine[idx].coding[j], this.convertDebitTaxCategory, this.convertCreditTaxCategory)
              )
            } else {
              pcas.push(
                new Pca('*', invoiceLine[idx].coding[j], this.convertDebitTaxCategory, this.convertCreditTaxCategory)
              )
            }
          } else if (idx === invoiceLine.length - 1 && j === invoiceLine[idx].coding.length - 1) {
            pcas.push(
              new Pca('', invoiceLine[idx].coding[j], this.convertDebitTaxCategory, this.convertCreditTaxCategory)
            )
          } else {
            pcas.push(
              new Pca('', invoiceLine[idx].coding[j], this.convertDebitTaxCategory, this.convertCreditTaxCategory)
            )
          }
        }
      }
    }

    let pcaFormat = ''
    const linefeed = '\r\n'
    pcaFormat += `${this.arrayToString(this.getHeader())}${linefeed}`
    for (const pca of pcas) {
      pcaFormat += `${this.covertFormatFile(pca)}${linefeed}`
    }

    return pcaFormat
  }

  readFormatFile() {
    const fs = require('fs')
    const path = require('path')
    const formatName = 'PcaFormat.csv'
    const obcFormatPath = path.resolve('./service', formatName)
    try {
      const format = fs.readFileSync(obcFormatPath, { encoding: 'utf-8' })
      return format
    } catch (error) {
      logger.error({ contractId: this.contract.contractId, stack: error.stack, status: 0 })
      return null
    }
  }

  getHeader() {
    const formatFile = this.readFormatFile()
    const header = formatFile.split(/\r?\n|\r/)[0].split(',')

    return header
  }

  covertFormatFile(pca) {
    const header = this.getHeader()
    const dataList = Array(17)
    const mappedUkeirikigouToDatalist = this.getMappingUkeirikigouToDatalist()
    const mappedObcobjectToHeader = this.getMappingObcobjectToHeader()

    for (const column of header) {
      dataList[mappedUkeirikigouToDatalist[column]] = pca[mappedObcobjectToHeader[column]]
    }

    return this.arrayToString(dataList)
  }

  arrayToString(array) {
    return JSON.stringify(array).replace(/\[|\]/g, '')
  }

  getMappingUkeirikigouToDatalist() {
    const mappedUkeirikigouToDatalist = {
      伝票日付: 0,
      伝票番号: 1,
      仕訳区分: 2,
      管理仕訳区分: 3,
      借方税計算モード: 4,
      借方部門コード: 5,
      借方科目コード: 6,
      借方補助コード: 7,
      借方税区分コード: 8,
      借方金額: 9,
      借方消費税額: 10,
      貸方部門コード: 11,
      貸方科目コード: 12,
      貸方補助コード: 13,
      貸方税区分コード: 14,
      貸方金額: 15,
      貸方消費税額: 16
    }
    return mappedUkeirikigouToDatalist
  }

  getMappingObcobjectToHeader() {
    const mappedObctoHeader = {
      // ヘッダー情報
      伝票日付: 'date',
      伝票番号: 'no',
      仕訳区分: 'voucherType',
      管理仕訳区分: 'codingType',
      // 明細情報・借方
      借方税計算モード: 'debitTaxAutomaticCalc',
      借方部門コード: 'debitDepartmentCode',
      借方科目コード: 'debitAccountCode',
      借方補助コード: 'debitSubAccountCode',
      借方税区分コード: 'debitTaxCode',
      借方金額: 'debitAmount',
      借方消費税額: 'debitTaxAmount',
      // 明細情報・貸方
      貸方税計算モード: 'creditTaxAutomaticCalc',
      貸方部門コード: 'creditDepartmentCode',
      貸方科目コード: 'creditAccountCode',
      貸方補助コード: 'creditSubAccountCode',
      貸方税区分コード: 'creditTaxCode',
      貸方金額: 'creditAmount',
      貸方消費税額: 'creditTaxAmount'
    }
    return mappedObctoHeader
  }

  convertDebitTaxCategory(_taxCategory, amount) {
    let debitCategory
    const calcTax = (amount, percent) => {
      return (Number(amount) * percent).toFixed(3)
    }

    switch (_taxCategory) {
      case 'JP 消費税 10%':
        {
          const taxAmount = calcTax(amount, 0.1)
          debitCategory = ['Q5', `${taxAmount}`]
        }
        break
      case 'JP 消費税(軽減税率) 8%':
        {
          const taxAmount = calcTax(amount, 0.08)
          debitCategory = ['Q6', `${taxAmount}`]
        }
        break
      case 'JP 不課税 0%':
      case 'JP 免税 0%':
        debitCategory = ['00', '0']
        break
      case 'JP 非課税 0%':
        debitCategory = ['A0', '0']
        break
      default:
        debitCategory = ['99', '0']
    }

    return debitCategory
  }

  convertCreditTaxCategory(_taxCategory, amount) {
    let creditCategory
    const calcTax = (amount, percent) => {
      return (Number(amount) * percent).toFixed(3)
    }

    switch (_taxCategory) {
      case 'JP 消費税 10%':
        {
          const taxAmount = calcTax(amount, 0.1)
          creditCategory = ['B5', `${taxAmount}`]
        }
        break
      case 'JP 消費税(軽減税率) 8%':
        {
          const taxAmount = calcTax(amount, 0.08)
          creditCategory = ['B6', `${taxAmount}`]
        }
        break
      case 'JP 不課税 0%':
      case 'JP 免税 0%':
        creditCategory = ['00', '0']
        break
      case 'JP 非課税 0%':
        creditCategory = ['A0', '0']
        break
      default:
        creditCategory = ['99', '0']
    }

    return creditCategory
  }
}

module.exports = PcaService
