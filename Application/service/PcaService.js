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
    const dataList = new Array(17).fill('')
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
      // ヘッダー情報
      伝票日付: 0,
      伝票番号: 1,
      仕訳区分: 2,
      管理仕訳区分: 3,
      // 明細情報・借方
      借方税計算モード: 4,
      借方部門コード: 5,
      借方部門名: 6,
      借方科目コード: 7,
      借方科目名: 8,
      借方補助コード: 9,
      借方補助名: 10,
      借方税区分コード: 11,
      借方税区分名: 12,
      借方金額: 13,
      借方消費税額: 14,
      // 明細情報・貸方
      貸方税計算モード: 15,
      貸方部門コード: 16,
      貸方部門名: 17,
      貸方科目コード: 18,
      貸方科目名: 19,
      貸方補助コード: 20,
      貸方補助名: 21,
      貸方税区分コード: 22,
      貸方税区分名: 23,
      貸方金額: 24,
      貸方消費税額: 25,
      // Etc
      摘要文: 26,
      数字１: 27,
      数字２: 28,
      入力プログラム区分: 29,
      配賦元税計算: 30,
      配賦元集計方法: 31,
      配賦元集計開始日付: 32,
      配賦元集計終了日付: 33,
      配賦元管理仕訳区分: 34,
      配賦元部門コード: 35,
      配賦元部門名: 36,
      配賦元科目コード: 37,
      配賦元科目名: 38,
      配賦元補助コード: 39,
      配賦元補助名: 40,
      配賦元金額: 41,
      数字３: 42,
      数字４: 43,
      数字５: 44,
      金額１: 45,
      金額２: 46,
      金額３: 47,
      金額４: 48,
      金額５: 49,
      文字列１: 50,
      文字列２: 51,
      文字列３: 52,
      文字列４: 53,
      文字列５: 54,
      入力日付時間: 55,
      借方取引先コード: 56,
      借方取引先名: 57,
      借方セグメント１コード: 58,
      借方セグメント１名: 59,
      借方セグメント２コード: 60,
      借方セグメント２名: 61,
      借方セグメント３コード: 62,
      借方セグメント３名: 63,
      貸方取引先コード: 64,
      貸方取引先名: 65,
      貸方セグメント１コード: 66,
      貸方セグメント１名: 67,
      貸方セグメント２コード: 68,
      貸方セグメント２名: 69,
      貸方セグメント３コード: 70,
      貸方セグメント３名: 71,
      配賦選択: 72,
      配賦元取引先コード: 73,
      配賦元取引先名: 74,
      配賦元セグメント１コード: 75,
      配賦元セグメント１名: 76,
      配賦元セグメント２コード: 77,
      配賦元セグメント２名: 78,
      配賦元セグメント３コード: 79,
      配賦元セグメント３名: 80
    }
    return mappedUkeirikigouToDatalist
  }

  getMappingPcaobjectToHeader() {
    const mappedPcatoHeader = {
      // ヘッダー情報
      伝票日付: 'date',
      伝票番号: 'no',
      仕訳区分: 'voucherType',
      管理仕訳区分: 'codingType',
      // 明細情報・借方
      借方税計算モード: 'debitTaxAutomaticCalc',
      借方部門コード: 'debitDepartmentCode',
      借方部門名: 'none',
      借方科目コード: 'debitAccountCode',
      借方科目名: 'none',
      借方補助コード: 'debitSubAccountCode',
      借方補助名: 'none',
      借方税区分コード: 'debitTaxCode',
      借方税区分名: 'none',
      借方金額: 'debitAmount',
      借方消費税額: 'debitTaxAmount',
      // 明細情報・貸方
      貸方税計算モード: 'creditTaxAutomaticCalc',
      貸方部門コード: 'creditDepartmentCode',
      貸方部門名: 'none',
      貸方科目コード: 'creditAccountCode',
      貸方科目名: 'none',
      貸方補助コード: 'creditSubAccountCode',
      貸方補助名: 'none',
      貸方税区分コード: 'creditTaxCode',
      貸方税区分名: 'none',
      貸方金額: 'creditAmount',
      貸方消費税額: 'creditTaxAmount',
      // Etc
      摘要文: 'none',
      数字１: 'none',
      数字２: 'none',
      入力プログラム区分: 'inputProgType',
      配賦元税計算: 'none',
      配賦元集計方法: 'none',
      配賦元集計開始日付: 'none',
      配賦元集計終了日付: 'none',
      配賦元管理仕訳区分: 'none',
      配賦元部門コード: 'none',
      配賦元部門名: 'none',
      配賦元科目コード: 'none',
      配賦元科目名: 'none',
      配賦元補助コード: 'none',
      配賦元補助名: 'none',
      配賦元金額: 'none',
      数字３: 'none',
      数字４: 'none',
      数字５: 'none',
      金額１: 'none',
      金額２: 'none',
      金額３: 'none',
      金額４: 'none',
      金額５: 'none',
      文字列１: 'none',
      文字列２: 'none',
      文字列３: 'none',
      文字列４: 'none',
      文字列５: 'none',
      入力日付時間: 'none',
      借方取引先コード: 'none',
      借方取引先名: 'none',
      借方セグメント１コード: 'none',
      借方セグメント１名: 'none',
      借方セグメント２コード: 'none',
      借方セグメント２名: 'none',
      借方セグメント３コード: 'none',
      借方セグメント３名: 'none',
      貸方取引先コード: 'none',
      貸方取引先名: 'none',
      貸方セグメント１コード: 'none',
      貸方セグメント１名: 'none',
      貸方セグメント２コード: 'none',
      貸方セグメント２名: 'none',
      貸方セグメント３コード: 'none',
      貸方セグメント３名: 'none',
      配賦選択: 'none',
      配賦元取引先コード: 'none',
      配賦元取引先名: 'none',
      配賦元セグメント１コード: 'none',
      配賦元セグメント１名: 'none',
      配賦元セグメント２コード: 'none',
      配賦元セグメント２名: 'none',
      配賦元セグメント３コード: 'none',
      配賦元セグメント３名: 'none'
    }
    return mappedPcatoHeader
  }

  convertDebitTaxCategory(_taxCategory, amount) {
    let debitCategory

    switch (_taxCategory) {
      case 'JP 消費税 10%':
        {
          const taxAmount = ''
          debitCategory = ['Q5', `${taxAmount}`]
        }
        break
      case 'JP 消費税(軽減税率) 8%':
        {
          const taxAmount = ''
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

    switch (_taxCategory) {
      case 'JP 消費税 10%':
        {
          const taxAmount = ''
          creditCategory = ['B5', `${taxAmount}`]
        }
        break
      case 'JP 消費税(軽減税率) 8%':
        {
          const taxAmount = ''
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
