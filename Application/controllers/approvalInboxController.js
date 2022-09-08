'use strict'

const logger = require('../lib/logger')
const db = require('../models')
const Op = db.Sequelize.Op
const RequestApproval = db.RequestApproval
const DbApproval = db.Approval

const getRequestApproval = async (accessToken, refreshToken, contract, invoiceId, tenant, isFinalApproval = false) => {
  try {
    const tradeshiftDTO = new (require('../DTO/TradeshiftDTO'))(accessToken, refreshToken, tenant)
    tradeshiftDTO.setUserAccounts(require('../DTO/VO/UserAccounts'))

    // 検索のため、依頼中ステータス作成
    const requestStatus = []
    for (let id = 10; id < 21; id++) {
      requestStatus.push({ status: `${id}` })
    }

    requestStatus.push({ status: '90' })
    if (isFinalApproval) requestStatus.push({ status: '00' })

    const requestApproval = await RequestApproval.findAll({
      where: {
        contractId: contract,
        invoiceId: invoiceId,
        [Op.or]: requestStatus
      },
      order: [['version', 'ASC']]
    })

    if (requestApproval instanceof Array === false) return null

    const request = []

    for (let i = 0; i < requestApproval.length; i++) {
      let updatedAt
      const approval = await DbApproval.findOne({
        where: {
          requestId: requestApproval[i].requestId
        }
      })

      const approvalData = approval.dataValues
      const approveUserCount = approval.dataValues.approveUserCount

      const userList = []
      const keys = Object.keys(approvalData)

      for (let i = 0; i < keys.length; i++) {
        const approveUser = {}
        let userAccounts
        if (keys[i].includes('approveUser') && !keys[i].includes('approveUserCount')) {
          const no = keys[i].replace('approveUser', '')
          switch (approvalData[keys[i]]) {
            case null:
              break

            default:
              approveUser[`${keys[i]}`] = approvalData[keys[i]]
              userAccounts = await tradeshiftDTO.findUser(approvalData[keys[i]])
              userAccounts.message = approvalData[`message${no}`]
              if (approvalData[`approvalAt${no}`] !== null) {
                userAccounts.status = '承認済み'
                userAccounts.approvedAt = await setDate(approvalData[`approvalAt${no}`])
                updatedAt = userAccounts.approvedAt
              } else if (approvalData.rejectedUser && approvalData.rejectedUser === approvalData[`approveUser${no}`]) {
                userAccounts.status = '差し戻し'
                userAccounts.approvedAt = await setDate(approvalData.rejectedAt)
                userAccounts.message = approvalData.rejectedMessage
                updatedAt = userAccounts.approvedAt
              } else {
                const status = ~~approvalData.approveStatus - 9
                if (no === 'Last' && status === approvalData.approveUserCount) {
                  userAccounts.status = '処理中'
                  userAccounts.approvedAt = ''
                } else if (approvalData.rejectedUser && approvalData.rejectedUser === approvalData.approveUserLast) {
                  userAccounts.status = '差し戻し'
                  userAccounts.approvedAt = await setDate(approvalData.rejectedAt)
                  userAccounts.message = approvalData.rejectedMessage
                  updatedAt = userAccounts.approvedAt
                } else {
                  if (status === ~~no) {
                    userAccounts.status = '処理中'
                    userAccounts.approvedAt = ' '
                  } else {
                    userAccounts.status = ' '
                    userAccounts.approvedAt = ' '
                  }
                }
              }
              userList.push(userAccounts)
              break
          }
        }
      }

      if (userList.length !== approveUserCount) {
        return null
      }

      const requester = await tradeshiftDTO.findUser(requestApproval[i].requester)

      request.push({
        requestId: requestApproval[i].requestId,
        contractId: requestApproval[i].contractId,
        invoiceId: requestApproval[i].invoiceId,
        status: requestApproval[i].status,
        approveRoute: { name: approval.approveRouteName, users: userList },
        requester: {
          no: '支払依頼',
          name: requester.getName(),
          status: '依頼済み',
          message: requestApproval[i].message,
          requestedAt: await setDate(requestApproval[i].create),
          updatedAt: updatedAt ?? (await setDate(requestApproval[i].create))
        }
      })
    }
    return request
  } catch (error) {
    logger.error({ contractId: contract, stack: error.stack, status: 0 })
    return null
  }
}

const hasPowerOfEditing = async (contractId, userId, requestId) => {
  try {
    if (requestId === null) return -1

    const target = { where: { requestId: requestId } }
    const requestApproval = await RequestApproval.findOne(target)
    const approval = await DbApproval.findOne(target)

    if (approval === null || requestApproval === null) return -1

    const approver = [
      'approveUser1',
      'approveUser2',
      'approveUser3',
      'approveUser4',
      'approveUser5',
      'approveUser6',
      'approveUser7',
      'approveUser8',
      'approveUser9',
      'approveUser10',
      'approveUserLast'
    ]
    const approveUserCount = approval.approveUserCount
    const status = requestApproval.status
    const idx = ~~status - 9

    if (idx === approveUserCount) {
      if (approval[approver[10]] === userId) {
        return true
      }
    } else {
      if (approval[approver[idx - 1]] === userId) {
        return true
      }
    }

    return false
  } catch (error) {
    logger.error({ contractId: contractId, stack: error.stack, status: 0 })
    return -1
  }
}

/**
 * 仕訳情報保存
 * @param {uuid} contractId
 * @param {uuid} invoiceId
 * @param {object} data
 */
const insertAndUpdateJournalizeInvoice = async (contractId, invoiceId, data) => {
  const inboxController = require('./inboxController')
  return await inboxController.insertAndUpdateJournalizeInvoice(contractId, invoiceId, data)
}

const setDate = async (date) => {
  const setDate = `${date.getFullYear()}.${('0' + (date.getMonth() + 1)).slice(-2)}.${('0' + date.getDate()).slice(
    -2
  )} - ${('0' + date.getHours()).slice(-2)}:${('0' + date.getMinutes()).slice(-2)}:${('0' + date.getSeconds()).slice(
    -2
  )}`

  return setDate
}

module.exports = {
  getRequestApproval: getRequestApproval,
  hasPowerOfEditing: hasPowerOfEditing,
  insertAndUpdateJournalizeInvoice: insertAndUpdateJournalizeInvoice
}
