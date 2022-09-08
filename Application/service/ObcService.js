const Obc = require('../DTO/VO/Invoice/Obc')
const InvoiceFactory = require('../DTO/VO/Invoice/InvoiceFactory')
const logger = require('../lib/logger')

class ObcService {
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
    const obcs = []
    if (invoices === null) return null

    for (const invoice of invoices) {
      const invoiceLine = invoice.invoiceLine
      for (let idx = 0; idx < invoiceLine.length; idx++) {
        for (let j = 0; j < invoiceLine[idx].coding.length; j++) {
          if (idx === 0 && j === 0) {
            if (invoiceLine.length === 1 && invoiceLine[idx].coding.length === 1) {
              obcs.push(
                new Obc('*', invoiceLine[idx].coding[j], this.convertDebitTaxCategory, this.convertCreditTaxCategory)
              )
            } else {
              obcs.push(
                new Obc('*', invoiceLine[idx].coding[j], this.convertDebitTaxCategory, this.convertCreditTaxCategory)
              )
            }
          } else if (idx === invoiceLine.length - 1 && j === invoiceLine[idx].coding.length - 1) {
            obcs.push(
              new Obc('', invoiceLine[idx].coding[j], this.convertDebitTaxCategory, this.convertCreditTaxCategory)
            )
          } else {
            obcs.push(
              new Obc('', invoiceLine[idx].coding[j], this.convertDebitTaxCategory, this.convertCreditTaxCategory)
            )
          }
        }
      }
    }

    let obcFormat = ''
    const linefeed = '\r\n'
    obcFormat += `${this.arrayToString(this.getHeader())}${linefeed}`
    for (const obc of obcs) {
      obcFormat += `${this.covertFormatFile(obc)}${linefeed}`
    }

    return obcFormat
  }

  readFormatFile() {
    const fs = require('fs')
    const path = require('path')
    const formatName = 'ObcFormat.csv'
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

  covertFormatFile(obc) {
    const header = this.getHeader()
    const dataList = Array(33)
    const mappedUkeirikigouToDatalist = this.getMappingUkeirikigouToDatalist()
    const mappedObcobjectToHeader = this.getMappingObcobjectToHeader()

    for (const column of header) {
      dataList[mappedUkeirikigouToDatalist[column]] = obc[mappedObcobjectToHeader[column]]
    }

    return this.arrayToString(dataList)
  }

  arrayToString(array) {
    return JSON.stringify(array).replace(/\[|\]/g, '')
  }

  getMappingUkeirikigouToDatalist() {
    const mappedUkeirikigouToDatalist = {
      GL0010000: 0,
      GL0010001: 1,
      GL0010002: 2,
      GL0010003: 3,
      GL0010007: 4,
      GL0010008: 5,
      GL0010005: 6,
      GL0010006: 7,
      GL0010004: 8,
      GL0012001: 9,
      GL0012002: 10,
      GL0012003: 11,
      GL0012004: 12,
      GL0012015: 13,
      GL0012005: 14,
      GL0012006: 15,
      GL0012007: 16,
      GL0012008: 17,
      GL0012009: 18,
      GL0012101: 19,
      GL0012102: 20,
      GL0013001: 21,
      GL0013002: 22,
      GL0013003: 23,
      GL0013004: 24,
      GL0013015: 25,
      GL0013005: 26,
      GL0013006: 27,
      GL0013007: 28,
      GL0013008: 29,
      GL0013009: 30,
      GL0013101: 31,
      GL0013102: 32,
      GL0011001: 33,
      GL0011002: 34,
      GL0011003: 35
    }
    return mappedUkeirikigouToDatalist
  }

  getMappingObcobjectToHeader() {
    const mappedObctoHeader = {
      // 区切
      GL0010000: 'header',
      // ヘッダー情報
      GL0010001: 'date',
      GL0010002: 'codingType',
      GL0010003: 'no',
      GL0010007: 'voucherType',
      GL0010008: 'voucherRecord',
      GL0010005: 'departmentSelectorType',
      GL0010006: 'voucherDeparment',
      GL0010004: 'voucherInputType',
      // 明細情報・借方
      GL0012001: 'debitDepartmentCode',
      GL0012002: 'debitAccountCode',
      GL0012003: 'debitSubAccountCode',
      GL0012004: 'debitTaxCode',
      GL0012015: 'debitTaxPercentType',
      GL0012005: 'debitTaxPercent',
      GL0012006: 'debitIndustrialClass',
      GL0012007: 'debitTaxAutomaticCalc',
      GL0012008: 'debitRouding',
      GL0012009: 'debitContact',
      GL0012101: 'debitAmount',
      GL0012102: 'debitTaxAmount',
      // 明細情報・貸方
      GL0013001: 'creditDepartmentCode',
      GL0013002: 'creditAccountCode',
      GL0013003: 'creditSubAccountCode',
      GL0013004: 'creditTaxCode',
      GL0013015: 'creditTaxPercentType',
      GL0013005: 'creditTaxPercent',
      GL0013006: 'creditIndustrialClass',
      GL0013007: 'creditTaxAutomaticCalc',
      GL0013008: 'creditRouding',
      GL0013009: 'creditContact',
      GL0013101: 'creditAmount',
      GL0013102: 'creditTaxAmount',
      // 摘要など
      GL0011001: 'detail',
      GL0011002: 'stickyNoteColor',
      GL0011003: 'stickyNote'
    }
    return mappedObctoHeader
  }

  // 借方
  convertDebitTaxCategory(_taxCategory) {
    let debitCategory

    switch (_taxCategory) {
      case 'JP 消費税 10%':
        debitCategory = ['0010', '10', '0']
        break
      case 'JP 消費税(軽減税率) 8%':
        debitCategory = ['0010', '8', '1']
        break
      case 'JP 不課税 0%':
      case 'JP 免税 0%':
      case 'JP 非課税 0%':
        debitCategory = ['0000', '', '']
        break
      default:
        debitCategory = ['9999', '', '']
    }

    return debitCategory
  }

  // 貸方
  convertCreditTaxCategory(_taxCategory) {
    let creditCategory

    switch (_taxCategory) {
      case 'JP 消費税 10%':
        creditCategory = ['0060', '10', '0']
        break
      case 'JP 消費税(軽減税率) 8%':
        creditCategory = ['0060', '8', '1']
        break
      case 'JP 不課税 0%':
        creditCategory = ['0000', '', '']
        break
      case 'JP 免税 0%':
        creditCategory = ['0090', '', '']
        break
      case 'JP 非課税 0%':
        creditCategory = ['0080', '', '']
        break
      default:
        creditCategory = ['9999', '', '']
    }

    return creditCategory
  }
}

module.exports = ObcService
