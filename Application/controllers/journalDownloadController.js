'use stric'
const apiManager = require('./apiManager')
const db = require('../models')
const logger = require('../lib/logger')
const JournalizeInvoice = db.JournalizeInvoice
const requestApproval = require('./requestApprovalController')
const YayoiService = require('../service/YayoiService')
const ObcService = require('../service/ObcService')
const PcaService = require('../service/PcaService')

// 複数の請求書を1つのCSVファイルにまとめる関数
const createInvoiceDataForDownload = async (
  accessToken,
  refreshToken,
  documents,
  contractId,
  chkFinalapproval,
  userId
) => {
  const invoices = []
  const finalapproval = 'finalapproval'
  const finalapprovalStatus = '00'
  // 検索した複数の請求書の文書データを取得
  const invoice = await apiManager.accessTradeshift(
    accessToken,
    refreshToken,
    'get',
    `/documents/${documents.DocumentId}`
  )

  try {
    const journalizeInvoice = await JournalizeInvoice.findAll({
      where: {
        invoiceId: documents.DocumentId,
        contractId: contractId
      },
      order: [
        ['lineNo', 'ASC'],
        ['journalNo', 'ASC']
      ]
    })

    if (journalizeInvoice.length !== 0) {
      journalizeInvoice.sort((next, prev) => {
        const nextJournalNo = next.journalNo.split('lineAccountCode')[1]
        const prevJournalNo = prev.journalNo.split('lineAccountCode')[1]

        return nextJournalNo - prevJournalNo
      })
      const journalizeInvoiceFinal = []

      for (let i = 0; i < journalizeInvoice.length; ++i) {
        const result = await requestApproval.findOneRequestApproval(
          journalizeInvoice[i].contractId,
          journalizeInvoice[i].invoiceId
        )

        if (result !== null) {
          // 最終承認済みの請求書の場合
          if (chkFinalapproval === finalapproval) {
            if (result.status === finalapprovalStatus) {
              journalizeInvoiceFinal.push(journalizeInvoice[i])
            }
          } else {
            // 仕訳済みの請求書(最終承認済みではない)
            if (result.status !== finalapprovalStatus) {
              journalizeInvoiceFinal.push(journalizeInvoice[i])
            }
          }
        } else {
          // 未処理の場合
          if (chkFinalapproval !== finalapproval) {
            journalizeInvoiceFinal.push(journalizeInvoice[i])
          }
        }
      }

      // エラーを確認する
      if (invoice instanceof Error) {
        return invoice
      } else {
        if (journalizeInvoiceFinal.length !== 0) invoices.push({ invoice, journalizeInvoiceFinal })
      }
    }
  } catch (error) {
    logger.error({ DocumentId: documents.DocumentId, stack: error.stack, status: 0 })
    return error
  }

  // 複数の請求書の文書をCSVファイルに作成して、返却
  return invoices
}

// 自分自身の企業をaccountAPIで取得
const getSentToCompany = async (accessToken, refreshToken) => {
  const result = await apiManager.accessTradeshift(accessToken, refreshToken, 'get', '/account')

  return [result.CompanyAccountId]
}

/**
 *
 * @param {object} passport トレードシフトのAPIアクセス用データ
 * @param {object} contract 契約情報
 * @param {string} businessId 請求書番号
 * @param {string} minIssuedate 発行日（最小）
 * @param {string} maxIssuedate 発行日（最大）
 * @param {uuid} sentBy 送信企業
 * @param {string} isCloedApproval 差し戻しメッセージ
 * @param {int} serviceDataFormat 出力フォーマット（0:デフォルト,1:弥生会計,2:勘定奉行）
 * @returns {string} ダウンロードデータ
 */

const dowonloadKaikei = async (
  passport,
  contract,
  businessId,
  minIssuedate,
  maxIssuedate,
  sentBy,
  isCloedApproval,
  serviceDataFormat
) => {
  const result = []

  // 弥生会計の場合
  let service = null
  switch (serviceDataFormat) {
    case 1:
      service = new YayoiService(passport, contract)
      break
    case 2:
      service = new ObcService(passport, contract)
      break
    case 3:
      service = new PcaService(passport, contract)
      break
    default:
      return null
  }

  if (sentBy.length === 0) {
    const kaikei = await service.convertToKaikei(null, businessId, minIssuedate, maxIssuedate, isCloedApproval)
    if (kaikei) {
      result.push(kaikei)
    }
  } else {
    for (const sentByCompany of sentBy) {
      const kaikei = await service.convertToKaikei(
        sentByCompany,
        businessId,
        minIssuedate,
        maxIssuedate,
        isCloedApproval
      )
      if (kaikei) {
        result.push(kaikei)
      }
    }
  }

  if (result.length === 0) return null

  return result
}

module.exports = {
  createInvoiceDataForDownload: createInvoiceDataForDownload,
  getSentToCompany: getSentToCompany,
  dowonloadKaikei: dowonloadKaikei
}
