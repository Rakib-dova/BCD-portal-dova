'use strict'

const logger = require('../lib/logger')
const db = require('../models')
const Op = db.Sequelize.Op
const RequestApproval = db.RequestApproval
const DbApproval = db.Approval

const getRequestApproval = async (accessToken, refreshToken, contract, invoiceId, tenant) => {
  try {
    const tradeshiftDTO = new (require('../DTO/TradeshiftDTO'))(accessToken, refreshToken, tenant)
    tradeshiftDTO.setUserAccounts(require('../DTO/VO/UserAccounts'))

    // 検索のため、依頼中ステータス作成
    const requestStatus = []
    for (let id = 10; id < 21; id++) {
      requestStatus.push({ status: `${id}` })
    }
    const requestApproval = await RequestApproval.findOne({
      where: {
        contractId: contract,
        invoiceId: invoiceId,
        [Op.or]: requestStatus
      }
    })
    if (requestApproval instanceof RequestApproval === false) return null

    const approval = await DbApproval.findOne({
      where: {
        requestId: requestApproval.requestId
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
              userAccounts.approvedAt = approvalData[`approvalAt${no}`]
            } else {
              const status = ~~approvalData.approveStatus - 9
              if (no === 'Last' && status === approvalData.approveUserCount) {
                userAccounts.status = '処理中'
                userAccounts.approvedAt = ''
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

    const requester = await tradeshiftDTO.findUser(requestApproval.requester)

    const request = {
      requestId: requestApproval.requestId,
      contractId: requestApproval.contractId,
      invoiceId: requestApproval.invoiceId,
      message: requestApproval.message,
      status: requestApproval.status,
      approveRoute: { name: approval.approveRouteName, users: userList },
      approvals: [],
      prevUser: {
        name: null,
        message: null
      },
      requester: {
        no: '支払依頼',
        name: requester.getName(),
        status: '依頼済み',
        requestedAt: `${requestApproval.create.getFullYear()}-${
          requestApproval.create.getMonth() + 1
        }-${requestApproval.create.getDate()} ${requestApproval.create.getHours()}:${requestApproval.create.getMinutes()}:${requestApproval.create.getSeconds()}`
      }
    }

    const userNo = ~~request.status - 10
    switch (userNo) {
      case 0: {
        request.prevUser.name = requester.getName()
        request.prevUser.message = request.message
        break
      }
      case 1:
      case 2:
      case 3:
      case 4:
      case 5:
      case 6:
      case 7:
      case 8:
      case 9:
      case 10:
        request.prevUser.name = request.approveRoute.users[userNo - 1].getName()
        request.prevUser.message = request.approveRoute.users[userNo - 1].message
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

    console.log('approval', approval)
    console.log('requestApproval', requestApproval)
    if (idx === approveUserCount) {
      console.log(`approval[${approver[10]}]`, approval[approver[10]])
      console.log('userId', userId)
      if (approval[approver[10]] === userId) {
        return true
      }
    } else {
      console.log(`approval[${approver[idx - 1]}]`, approval[approver[idx - 1]])
      console.log('userId', userId)

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

module.exports = {
  getRequestApproval: getRequestApproval,
  hasPowerOfEditing: hasPowerOfEditing,
  insertAndUpdateJournalizeInvoice: insertAndUpdateJournalizeInvoice
}
