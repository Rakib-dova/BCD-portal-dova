const { v4: uuidv4 } = require('uuid')

const Contract = require('../models').Contract
const Order = require('../models').Order
const db = require('../models')
const contractController = require('../controllers/contractController')
const constants = require('../constants').statusConstants
const logger = require('../lib/logger')
const validate = require('../lib/validate')
const apiManager = require('./apiManager')

// 契約ステータス
const contractStatuses = constants.contractStatuses
// オーダー種別
const orderTypes = constants.orderTypes

/**
 * 有料サービスの契約(複数可能)
 * @param {string} tenantId テナントID
 * @param {object[]} orderDataList オーダーデータリスト
 * @returns {object[]} コントラクトリスト
 */
const applyNewOrders = async (tenantId, orderDataList) => {
  try {
    const contractList = []
    await db.sequelize.transaction(async (t) => {
      // 現在の日時
      const date = new Date()

      const orderList = []

      for (const orderData of orderDataList) {
        // contractIdの生成（uuid）
        const contractId = uuidv4()

        contractList.push({
          contractId: contractId,
          tenantId: tenantId,
          serviceType: orderData.contractBasicInfo.serviceType,
          numberN: '',
          contractStatus: contractStatuses.newContractOrder,
          deleteFlag: false,
          createdAt: date,
          updatedAt: date
        })

        orderList.push({
          contractId: contractId,
          tenantId: tenantId,
          orderType: orderTypes.newOrder,
          orderData: JSON.stringify(orderData)
        })
      }
      // Contractデータの登録
      await Contract.bulkCreate(contractList, {
        transaction: t
      })

      // Orderデータの登録
      await Order.bulkCreate(orderList, { transaction: t })
    })
    return contractList
  } catch (error) {
    // status 0はDBエラー
    logger.error({ tenant: tenantId, stack: error.stack, status: 0 }, error.name)
    return error
  }
}

/**
 * 解約
 * @param {string} tenantId テナントID
 * @param {object} orderData オーダーデータ
 * @returns
 */
const cancelOrder = async (tenantId, orderData) => {
  try {
    await db.sequelize.transaction(async (t) => {
      const contract = await contractController.findContract(
        {
          tenantId: tenantId,
          serviceType: orderData.contractBasicInfo.serviceType,
          contractStatus: contractStatuses.onContract
        },
        null
      )

      // 契約が存在しない場合
      if (!contract?.contractId) throw new Error('Not Founded ContractId')

      // 現在の日時
      const date = new Date()

      // Contractデータの更新
      await Contract.update(
        {
          contractStatus: contractStatuses.cancellationOrder,
          updatedAt: date
        },
        {
          where: {
            contractId: contract.contractId
          },
          transaction: t
        }
      )

      // Orderデータの登録
      await Order.create(
        {
          contractId: contract.contractId,
          tenantId: tenantId,
          orderType: orderTypes.cancelOrder,
          orderData: JSON.stringify(orderData)
        },
        { transaction: t }
      )
    })
  } catch (error) {
    // status 0はDBエラー
    logger.error({ tenant: tenantId, stack: error.stack, status: 0 }, error.name)
    return error
  }
}

/**
 * タグ付け処理
 * @param {object} user ユーザ情報
 * @param {date} createdAt 登録日
 * @returns
 */
const tagCreate = async (user, createdAt) => {
  const tradeshiftDTO = new (require('../DTO/TradeshiftDTO'))(user.accessToken, user.refreshToken, user.tenantId)

  // 請求書のタグ付け有無確認
  const checkTagDocumentList = []
  const withouttag = ['tag_checked']
  const type = ['invoice']
  const state = ['DELIVERED', 'ACCEPTED', 'PAID_UNCONFIRMED', 'PAID_CONFIRMED']
  const stag = ['purchases']
  // スタンダードプラン申し込み日の1日前
  const createdDate = `${createdAt.getFullYear()}-${createdAt.getMonth() + 1}-${createdAt.getDate() - 1}`
  const invoiceList = []
  let errorInvoice = ''
  let page = 0
  let numPages = 1
  let getInvoiceErrorFlag = false
  do {
    const result = await tradeshiftDTO.getDocuments(
      '',
      withouttag,
      type,
      page,
      1,
      '',
      '',
      '',
      user.tenantId,
      '',
      createdDate,
      state,
      '',
      '',
      stag
    )
    if (result instanceof Error) {
      getInvoiceErrorFlag = true
      errorInvoice = result
      break
    }
    numPages = result.numPages
    page++
    invoiceList.push(result)
  } while (page < numPages)

  if (getInvoiceErrorFlag) return errorInvoice

  for (const invoice of invoiceList) {
    const documents = invoice.Document
    for (const document of documents) {
      if (document.TenantId === user.tenantId) {
        checkTagDocumentList.push(document)
      }
    }
  }

  if (checkTagDocumentList.length !== 0) {
    for (const data of checkTagDocumentList) {
      const invoice = await tradeshiftDTO.getDocument(data.DocumentId)
      if (invoice instanceof Error) return invoice

      // 担当者メールアドレス確認、ある場合はタグ追加
      if (invoice.AccountingCustomerParty.Party.Contact.ID) {
        if (validate.isContactEmail(invoice.AccountingCustomerParty.Party.Contact.ID.value) !== 0) {
          logger.warn(
            `tenantId:${user.tenantId}, DocumentId:${data.DocumentId}, msg: ${constants.FAILED_TO_CREATE_TAG}(${constants.INVOICE_CONTACT_EMAIL_NOT_VERIFY})`
          )
          await tradeshiftDTO.createTags(data.DocumentId, encodeURIComponent('unKnownManager'))
        } else {
          await tradeshiftDTO.createTags(data.DocumentId, invoice.AccountingCustomerParty.Party.Contact.ID.value)

          // 企業にユーザー有無確認
          const userInfo = await apiManager.accessTradeshift(
            tradeshiftDTO.accessToken,
            tradeshiftDTO.refreshToken,
            'get',
            `/account/users/byemail/${invoice.AccountingCustomerParty.Party.Contact.ID.value}?searchlocked=false`
          )
          // ユーザー情報がない場合
          if (userInfo instanceof Error) {
            await tradeshiftDTO.createTags(data.DocumentId, encodeURIComponent('unKnownManager'))
          }
        }
      } else {
        await tradeshiftDTO.createTags(data.DocumentId, encodeURIComponent('unKnownManager'))
      }

      // 確認請求書にタグを追加
      await tradeshiftDTO.createTags(data.DocumentId, 'tag_checked')
    }
  }
}

module.exports = {
  applyNewOrders: applyNewOrders,
  cancelOrder: cancelOrder,
  tagCreate: tagCreate
}
