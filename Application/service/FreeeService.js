const Freee = require('../DTO/VO/Invoice/Freee')
const InvoiceFactory = require('../DTO/VO/Invoice/InvoiceFactory')
const logger = require('../lib/logger')

class FreeeService {
  constructor(passport, contract) {
    this.invoiceFactory = new InvoiceFactory(passport, contract)
    this.contract = contract
    this.format = this.readFormatFile()
  }

  /**
   * 請求書変換処理
   * @param {uuid} sentBy 送信企業
   * @param {string} businessId 請求書番号
   * @param {string} minIssuedate 発行日（初日）
   * @param {string} maxIssuedate 発行日（最終日）
   * @param {string} isCloedApproval 最終承認済みフラグ
   * @returns {string} ダウンロードデータ
   */
  async convertToKaikei(sentBy, businessId, minIssuedate, maxIssuedate, isCloedApproval) {
    const invoices = await this.invoiceFactory.getInvoices(
      sentBy,
      businessId,
      minIssuedate,
      maxIssuedate,
      isCloedApproval
    )
    const freees = []
    if (invoices === null) return null

    let no = 1
    for (const invoice of invoices) {
      const voucherNo = no > 100 ? `0${no}` : no > 10 ? `00${no}` : `000${no}`
      const invoiceLine = invoice.invoiceLine
      for (let idx = 0; idx < invoiceLine.length; idx++) {
        for (let j = 0; j < invoiceLine[idx].coding.length; j++) {
          if (idx === 0 && j === 0) {
            if (invoiceLine.length === 1 && invoiceLine[idx].coding.length === 1) {
              freees.push(
                new Freee(
                  '*',
                  voucherNo,
                  invoice,
                  invoiceLine[idx].coding[j],
                  this.convertDebitTaxCategory,
                  this.convertCreditTaxCategory
                )
              )
            } else {
              freees.push(
                new Freee(
                  '*',
                  voucherNo,
                  invoice,
                  invoiceLine[idx].coding[j],
                  this.convertDebitTaxCategory,
                  this.convertCreditTaxCategory
                )
              )
            }
          } else if (idx === invoiceLine.length - 1 && j === invoiceLine[idx].coding.length - 1) {
            freees.push(
              new Freee(
                '',
                voucherNo,
                invoice,
                invoiceLine[idx].coding[j],
                this.convertDebitTaxCategory,
                this.convertCreditTaxCategory
              )
            )
          } else {
            freees.push(
              new Freee(
                '',
                voucherNo,
                invoice,
                invoiceLine[idx].coding[j],
                this.convertDebitTaxCategory,
                this.convertCreditTaxCategory
              )
            )
          }
        }
      }
      no++
    }

    let freeeFormat = ''
    const linefeed = '\r\n'
    freeeFormat += `${this.arrayToString(this.getHeader())}${linefeed}`
    for (const freee of freees) {
      freeeFormat += `${this.covertFormatFile(freee)}${linefeed}`
    }

    return freeeFormat
  }

  readFormatFile() {
    const fs = require('fs')
    const path = require('path')
    const formatName = 'FreeeFormat.csv'
    const freeeFormatPath = path.resolve('./service', formatName)
    try {
      const format = fs.readFileSync(freeeFormatPath, { encoding: 'utf-8' })
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

  covertFormatFile(freee) {
    const header = this.getHeader()
    const dataList = Array(33)
    const mappedUkeirikigouToDatalist = this.getMappingUkeirikigouToDatalist()
    const mappedFreeeobjectToHeader = this.getMappingFreeeobjectToHeader()

    for (const column of header) {
      dataList[mappedUkeirikigouToDatalist[column]] = freee[mappedFreeeobjectToHeader[column]]
    }

    return this.arrayToString(dataList)
  }

  arrayToString(array) {
    return JSON.stringify(array).replace(/\[|\]/, '').slice(0, -1)
  }

  getMappingUkeirikigouToDatalist() {
    const mappedUkeirikigouToDatalist = {
      '[表題行]': 0,
      日付: 1,
      伝票番号: 2,
      決算整理仕訳: 3,
      借方勘定科目: 4,
      借方科目コード: 5,
      借方補助科目: 6,
      借方取引先: 7,
      借方取引先コード: 8,
      借方部門: 9,
      借方品目: 10,
      借方メモタグ: 11,
      借方セグメント1: 12,
      借方セグメント2: 13,
      借方セグメント3: 14,
      借方金額: 15,
      借方税区分: 16,
      借方税額: 17,
      貸方勘定科目: 18,
      貸方科目コード: 19,
      貸方補助科目: 20,
      貸方取引先: 21,
      貸方取引先コード: 22,
      貸方部門: 23,
      貸方品目: 24,
      貸方メモタグ: 25,
      貸方セグメント1: 26,
      貸方セグメント2: 27,
      貸方セグメント3: 28,
      貸方金額: 29,
      貸方税区分: 30,
      貸方税額: 31,
      摘要: 32
    }
    return mappedUkeirikigouToDatalist
  }

  getMappingFreeeobjectToHeader() {
    const mappedFreeetoHeader = {
      // ヘッダー情報
      '[表題行]': 'header',
      日付: 'date',
      伝票番号: 'no',
      決算整理仕訳: 'settlementJournal',
      // 明細情報・借方
      借方勘定科目: 'debitAccount',
      借方科目コード: 'debitAccountCode',
      借方補助科目: 'debitSubAccount',
      借方取引先: 'none',
      借方取引先コード: 'none',
      借方部門: 'debitDepartment',
      借方品目: 'none',
      借方メモタグ: 'none',
      借方セグメント1: 'none',
      借方セグメント2: 'none',
      借方セグメント3: 'none',
      借方金額: 'debitAmount',
      借方税区分: 'debitTaxCode',
      借方税額: 'debitTaxAmount',
      // 明細情報・貸方
      貸方勘定科目: 'creditAccount',
      貸方科目コード: 'creditAccountCode',
      貸方補助科目: 'creditSubAccount',
      貸方取引先: 'none',
      貸方取引先コード: 'none',
      貸方部門: 'creditDepartment',
      貸方品目: 'none',
      貸方メモタグ: 'none',
      貸方セグメント1: 'none',
      貸方セグメント2: 'none',
      貸方セグメント3: 'none',
      貸方金額: 'creditAmount',
      貸方税区分: 'creditTaxCode',
      貸方税額: 'creditTaxAmount',
      // Etc
      摘要: 'none'
    }
    return mappedFreeetoHeader
  }

  convertDebitTaxCategory(_taxCategory, amount) {
    let debitCategory

    switch (_taxCategory) {
      case 'JP 消費税 10%':
        {
          const taxAmount = ''
          debitCategory = ['課対仕入10%', `${taxAmount}`]
        }
        break
      case 'JP 消費税(軽減税率) 8%':
        {
          const taxAmount = ''
          debitCategory = ['課対仕入8%（軽）', `${taxAmount}`]
        }
        break
      case 'JP 免税 0%':
        debitCategory = ['対象外', '0']
        break
      case 'JP 非課税 0%':
        debitCategory = ['不課税', '0']
        break
      default:
        debitCategory = ['対象外', '0']
    }

    return debitCategory
  }

  convertCreditTaxCategory(_taxCategory, amount) {
    let creditCategory

    switch (_taxCategory) {
      case 'JP 消費税 10%':
        {
          const taxAmount = ''
          creditCategory = ['課税売上10%', `${taxAmount}`]
        }
        break
      case 'JP 消費税(軽減税率) 8%':
        {
          const taxAmount = ''
          creditCategory = ['課税売上8%（軽）', `${taxAmount}`]
        }
        break
      case 'JP 免税 0%':
        creditCategory = ['対象外', '0']
        break
      case 'JP 非課税 0%':
        creditCategory = ['不課税', '0']
        break
      default:
        creditCategory = ['対象外', '0']
    }

    return creditCategory
  }
}

module.exports = FreeeService
