'use stric'
const Approver = require('../lib/approver/Approver')
const logger = require('../lib/logger')
const constantsDefine = require('../constants')
const db = require('../models')
const ApproveRoute = db.ApproveRoute
const ApproveUser = db.ApproveUser
const Request = db.RequestApproval
const Status = db.ApproveStatus
const Approval = db.Approval
const Op = db.Sequelize.Op
const userController = require('./userController')
const validate = require('../lib/validate')
const approveStatusDAO = require('../DAO/ApproveStatusDAO')
const RequestApprovalDAO = require('../DAO/RequestApprovalDAO')
const approvalInboxController = require('./approvalInboxController')
/**
 *
 * @param {string} accTk アクセストークン
 * @param {string} refreshTk リフレッシュトークン
 * @param {uuid} tenantId テナント
 * @param {object} keyword 氏名やメールアドレス
 * @returns {Array} ユーザー情報
 */
const getApprover = async (accTk, refreshTk, tenantId, keyword) => {
  let userAccountsArr = []
  const tradeshiftDTO = new (require('../DTO/TradeshiftDTO'))(accTk, refreshTk, tenantId)
  tradeshiftDTO.setUserAccounts(require('../DTO/VO/UserAccounts'))

  // トレードシフトからユーザー情報を取得する。
  try {
    const findUserAll = await tradeshiftDTO.findUserAll()
    if (findUserAll === -1) return -1
    userAccountsArr = findUserAll.map((userAccount) => {
      return new Approver(userAccount)
    })
  } catch (error) {
    logger.error({ user: tenantId, stack: error.stack, status: 0 }, error.name)
    return -2
  }

  const searchUsers = []
  const keywordName = `${keyword.firstName} ${keyword.lastName}`.trim()
  userAccountsArr.forEach((account) => {
    const name = `${account.FirstName} ${account.LastName}`.trim()
    if (keywordName.length > 0 && keyword.email.trim().length > 0) {
      if (name.search(keywordName) !== -1 && account.Username.search(keyword.email) !== -1) {
        searchUsers.push({
          id: account.Id,
          name: `${account.FirstName} ${account.LastName}`,
          email: `${account.Username}`
        })
      }
    } else if (keywordName.length > 0 && keyword.email.trim().length === 0) {
      if (name.search(keywordName) !== -1) {
        searchUsers.push({
          id: account.Id,
          name: `${account.FirstName} ${account.LastName}`,
          email: `${account.Username}`
        })
      }
    } else if (keywordName.length === 0 && keyword.email.trim().length > 0) {
      if (account.Username.search(keyword.email) !== -1) {
        searchUsers.push({
          id: account.Id,
          name: `${account.FirstName} ${account.LastName}`,
          email: `${account.Username}`
        })
      }
    }
    if (keyword.firstName.length === 0 && keyword.lastName.length === 0 && keyword.email.length === 0) {
      searchUsers.push({
        id: account.Id,
        name: `${account.FirstName} ${account.LastName}`,
        email: `${account.Username}`
      })
    }
  })

  return searchUsers
}

const insertApprover = async (contract, values) => {
  const functionName = 'approverController.insertApprover'
  // 関数開始表示
  logger.info(`${constantsDefine.logMessage.INF000}${functionName}`)

  let resultToInsertUser = null
  const uuids = values.uuid

  try {
    let duplicatedFlag = false

    // 重複の承認ルート名検索
    const resultSearchRoute = await ApproveRoute.findAll({
      where: {
        approveRouteName: values.setApproveRouteNameInputId,
        contractId: contract
      }
    })

    // 重複の承認ルート名検索（sequelize大小文字区別しないため）
    resultSearchRoute.forEach((item) => {
      if (item.approveRouteName === values.setApproveRouteNameInputId) {
        duplicatedFlag = true
      }
    })

    // 重複の承認ルート名がある場合、登録拒否処理
    if (duplicatedFlag) {
      return 1
    }

    // 重複の承認ルート名ない場合DBに保存する。（ApproveRoute）
    const resultToInsertRoute = await ApproveRoute.create({
      contractId: contract,
      approveRouteName: values.setApproveRouteNameInputId
    })

    // DB保存失敗したらモデルApproveRouteインスタンスではない
    if (resultToInsertRoute instanceof ApproveRoute === false) {
      return -1
    }

    // 重複の承認ルート名がない場合DBに保存する。（ApproveUser）
    // 承認者が一人の場合
    if (uuids instanceof Array === false) {
      resultToInsertUser = await ApproveUser.create({
        approveRouteId: resultToInsertRoute.approveRouteId,
        approveUser: values.uuid,
        prevApproveUser: null,
        nextApproveUser: null,
        isLastApproveUser: false
      })
    } else {
      let prev = null
      let header = null
      for (let i = 0; i < uuids.length; i++) {
        let isLastApproveUser = false

        if (i === uuids.length - 1) {
          isLastApproveUser = true
        }

        let currentUser = null
        resultToInsertUser = await ApproveUser.create({
          approveRouteId: resultToInsertRoute.approveRouteId,
          approveUser: uuids[i],
          prevApproveUser: null,
          nextApproveUser: null,
          isLastApproveUser: isLastApproveUser
        })
        currentUser = resultToInsertUser
        if (header === null) {
          header = currentUser
          prev = header
        } else {
          prev.nextApproveUser = currentUser.approveUserId
          currentUser.prevApproveUser = prev.approveUserId
          await prev.save()
          await currentUser.save()
          prev = currentUser
        }
      }
    }

    // 関数終了表示
    logger.info(`${constantsDefine.logMessage.INF001}${functionName}`)

    // DB保存失敗したらモデルApproveRouteインスタンスではない
    if (resultToInsertUser instanceof ApproveUser === false) {
      return -1
    }

    return 0
  } catch (error) {
    // DBエラー発生したら処理
    logger.error({ contractId: contract, stack: error.stack, status: 0 })
    return error
  }
}

const editApprover = async (accTk, refreshTk, contract, values, prevApproveRouteId) => {
  const functionName = 'approverController.editApprover'
  // 関数開始表示
  logger.info(`${constantsDefine.logMessage.INF000}${functionName}`)

  let resultToInsertUser = null
  const uuids = values.uuid

  try {
    let duplicatedFlag = false

    // 重複の承認ルート名をチェックのため、DBから変更対象以外の承認ルートを取得
    const resultSearchRoute = await ApproveRoute.findAll({
      where: {
        approveRouteName: values.setApproveRouteNameInputId,
        contractId: contract,
        approveRouteId: {
          [Op.ne]: prevApproveRouteId
        },
        updateFlag: false
      }
    })

    // 重複の承認ルート名検索（sequelize大小文字区別しないため）
    resultSearchRoute.forEach((item) => {
      if (item.approveRouteName === values.setApproveRouteNameInputId) {
        duplicatedFlag = true
      }
    })

    // 重複の承認ルート名がある場合、登録拒否処理
    if (duplicatedFlag) {
      return 1
    }

    // 重複の承認ルート名がない場合データを更新する。（ApproveRoute）
    const updateApproveRoute = await ApproveRoute.update(
      {
        approveRouteName: values.setApproveRouteNameInputId
      },
      {
        where: {
          contractId: contract,
          approveRouteId: prevApproveRouteId
        }
      }
    )

    // 更新失敗したらモデルApproveRouteインスタンスではない
    if (updateApproveRoute[0] !== 1) {
      return -1
    }

    // 変更した承認ルート取得
    const searchApproveRoute = await ApproveRoute.findOne({
      where: {
        contractId: contract,
        approveRouteId: prevApproveRouteId
      }
    })

    if (searchApproveRoute instanceof ApproveRoute === false) {
      return -1
    }

    // 変更前の承認ルートに紐づいてる承認者取得
    const searchApproveUser = await ApproveUser.findAll({
      where: {
        approveRouteId: searchApproveRoute.approveRouteId
      }
    })

    if (searchApproveUser instanceof Array === false) {
      return -1
    }

    // 変更前の承認ルートに紐づいてる承認者削除
    searchApproveUser.forEach((approverUser) => {
      approverUser.destroy()
    })

    // 重複の承認ルート名がない場合DBに保存する。（ApproveUser）
    // 承認者が一人の場合
    if (uuids instanceof Array === false) {
      resultToInsertUser = await ApproveUser.create({
        approveRouteId: searchApproveRoute.approveRouteId,
        approveUser: values.uuid,
        prevApproveUser: null,
        nextApproveUser: null,
        isLastApproveUser: false
      })
    } else {
      let prev = null
      let header = null
      for (let i = 0; i < uuids.length; i++) {
        let isLastApproveUser = false

        if (i === uuids.length - 1) {
          isLastApproveUser = true
        }

        let currentUser = null
        resultToInsertUser = await ApproveUser.create({
          approveRouteId: searchApproveRoute.approveRouteId,
          approveUser: uuids[i],
          prevApproveUser: null,
          nextApproveUser: null,
          isLastApproveUser: isLastApproveUser
        })
        currentUser = resultToInsertUser
        if (header === null) {
          header = currentUser
          prev = header
        } else {
          prev.nextApproveUser = currentUser.approveUserId
          currentUser.prevApproveUser = prev.approveUserId
          await prev.save()
          await currentUser.save()
          prev = currentUser
        }
      }
    }

    const approveRouteAndApprover = await getApproveRoute(accTk, refreshTk, contract, prevApproveRouteId)

    // DB保存失敗したらモデルApproveRouteインスタンスではない
    if (approveRouteAndApprover === -1) {
      return -1
    }

    // 関数終了表示
    logger.info(`${constantsDefine.logMessage.INF001}${functionName}`)

    // DB保存失敗したらモデルApproveRouteインスタンスではない
    if (resultToInsertUser instanceof ApproveUser === false) {
      return -1
    }

    return 0
  } catch (error) {
    // DBエラー発生したら処理
    logger.error({ contractId: contract, stack: error.stack, status: 0 })
    return error
  }
}
/**
 * 登録した承認ルートを検索する。
 * @param {uuid} contractId デジトレの利用の契約者の識別番号
 * @returns {object} {No：通番, approveRouteName：承認ルート名, approverCount：承認者の数}
 */
const getApproveRouteList = async (contractId) => {
  logger.info(constantsDefine.logMessage.INF000 + 'approverController.getApproveRouteList')
  try {
    const approveRoutes = await ApproveRoute.findAll({
      include: [
        {
          model: ApproveUser
        }
      ],
      where: {
        contractId: contractId,
        deleteFlag: false,
        updateFlag: false
      },
      order: [['approveRouteName', 'ASC']]
    })
    // 承認ルートの名を昇順ソード
    approveRoutes.sort((a, b) => {
      if (a.approveRouteName > b.approveRouteName) return 1
      else return -1
    })
    logger.info(constantsDefine.logMessage.INF001 + 'approverController.getApproveRouteList')
    return approveRoutes.map((approveRoute, idx) => {
      return {
        No: idx + 1,
        approveRouteName: approveRoute.approveRouteName,
        approverCount: approveRoute.ApproveUsers.length,
        uuid: approveRoute.approveRouteId
      }
    })
  } catch (error) {
    logger.error({ contractId: contractId, stack: error.stack, status: 0 })
    logger.info(constantsDefine.logMessage.INF001 + 'approverController.getApproveRouteList')
    return error
  }
}

/**
 * 登録した承認ルートを検索する。
 * @param {string} accessToken トレードシフトのAPIアクセストークン
 * @param {string} refreshToken トレードシフトのAPIアクセストークン
 * @param {uuid} contract デジトレの利用の契約者の識別番号
 * @param {uuid} approveRouteId 登録した承認ルートの識別番号
 * @returns {object}
 */
const getApproveRoute = async (accessToken, refreshToken, contract, approveRouteId) => {
  logger.info(constantsDefine.logMessage.INF000 + 'approverController.getApproveRoute')
  try {
    const approveRouteApprovers = await ApproveRoute.getApproveRoute(contract, approveRouteId)
    if (approveRouteApprovers.length === 0) {
      return -1
    }
    const approveRoute = {
      approveRouteId: approveRouteApprovers[0].approveRouteId,
      contractId: approveRouteApprovers[0].contractId,
      name: approveRouteApprovers[0].approveRouteName
    }

    // header検索
    let header = null
    let idx = 0
    while (approveRouteApprovers[idx]) {
      if (approveRouteApprovers[idx]['ApproveUsers.prevApproveUser'] === null) {
        header = approveRouteApprovers[idx]
      }
      idx++
    }

    const users = []
    const headerId = header['ApproveUsers.approveUserId']
    let currUser = await ApproveUser.findOne({
      where: {
        approveUserId: headerId
      }
    })
    let next = null
    while (currUser) {
      const userId = currUser.approveUser
      next = currUser.nextApproveUser
      const tradeshiftDTO = new (require('../DTO/TradeshiftDTO'))(accessToken, refreshToken, null)
      tradeshiftDTO.setUserAccounts(require('../DTO/VO/UserAccounts'))
      users.push(new Approver(await tradeshiftDTO.getUserById(userId)))
      if (next) {
        currUser = await ApproveUser.findOne({
          where: {
            approveUserId: next
          }
        })
      } else {
        currUser = null
      }
    }
    logger.info(constantsDefine.logMessage.INF001 + 'approverController.getApproveRoute')
    return {
      ...approveRoute,
      users: users
    }
  } catch (error) {
    logger.error({ contractId: contract, stack: error.stack, status: 0 })
    logger.info(constantsDefine.logMessage.INF001 + 'approverController.getApproveRoute')
    return error
  }
}

/**
 * 重複した承認ルートの内容を再表示のため、データ加工する
 * @param {object} approveRoute
 * setApproveRouteNameInputId: 承認ルート名
 * userName：画面から指定した承認者名（一つの場合String、複数の場合Array)
 * mailAddres：画面からしてした承認者のメールアドレス（一つの場合String、複数の場合Array)
 * uuid：承認者のトレードシフトのId(uuid識別番号)
 * @returns {object}
 * approveRouteName 承認ルート名
 * approveUsers 一次から十次Approverオブジェクト
 * lastApprover 最終Approverオブジェクト
 */
const duplicateApproveRoute = async (approveRoute) => {
  const approveRouteName = approveRoute.setApproveRouteNameInputId
  const approverUsers = []
  let lastApprover = null
  const nameSep = / |\u3000/
  if (approveRoute.userName instanceof Array === false) {
    approverUsers.push(
      new Approver({
        tenantId: null,
        firstName: approveRoute.userName.split(nameSep)[0],
        lastName: approveRoute.userName.split(nameSep)[1],
        email: approveRoute.mailAddress,
        memberships: [{ GroupId: null }],
        id: approveRoute.uuid
      })
    )
  } else {
    const userNames = approveRoute.userName
    userNames.forEach((approver, idx) => {
      approverUsers.push(
        new Approver({
          tenantId: null,
          firstName: approver.split(nameSep)[0],
          lastName: approver.split(nameSep)[1],
          email: approveRoute.mailAddress[idx],
          memberships: [{ GroupId: null }],
          id: approveRoute.uuid[idx]
        })
      )
    })
  }
  lastApprover = approverUsers.pop()

  return { approveRouteName, approverUsers, lastApprover }
}

/**
 * 承認ルートと紐づいているレコードを削除する。
 * @param {uuid} approveRouteId デジトレの利用の契約者の識別番号
 * @returns {int} 1：正常_削除成功, -1：削除対象のがない場合, 0：エラー
 */
const deleteApproveRoute = async (approveRouteId) => {
  logger.info(constantsDefine.logMessage.INF000 + 'approverController.deleteApproveRoute')

  try {
    // 承認ルートを検索
    const deleteTargetApproveRoute = await ApproveRoute.findOne({
      where: {
        approveRouteId: approveRouteId
      }
    })

    // null：既に削除されたレコード
    if (deleteTargetApproveRoute === null) return -1

    // 承認ルート削除
    logger.info(`${deleteTargetApproveRoute.approveRouteId}の承認ルートの削除処理を開始します。`)
    await deleteTargetApproveRoute.destroy()
    logger.info(`${deleteTargetApproveRoute.approveRouteId}の承認ルートの削除処理を終了します。`)

    logger.info(constantsDefine.logMessage.INF001 + 'approverController.deleteApproveRoute')
    return 1
  } catch (error) {
    logger.error(error)
    logger.info(constantsDefine.logMessage.INF001 + 'approverController.deleteApproveRoute')
    return 0
  }
}

/**
 * 承認依頼の承認ルート検索関数。
 * @param {uuid} _contractId  // 契約者の識別番号
 * @param {string} _approveRouteName // 承認ルート名
 * @returns {object} // 承認ルート検索結果
 * No：順番
 * approveRouteName: 承認ルート名
 * approverCount: 承認者の数
 * uuid: 承認ルートの固有番号
 */
const searchApproveRouteList = async (_contractId, _approveRouteName) => {
  logger.info(constantsDefine.logMessage.INF000 + 'searchApproveRouteList')
  const contractId = _contractId
  const approveRouteName = _approveRouteName ?? ''

  try {
    const where = {
      contractId: contractId,
      updateFlag: false,
      deleteFlag: false
    }
    if (approveRouteName.length !== 0) {
      where.approveRouteName = {
        [Op.like]: `%${approveRouteName}%`
      }
    }
    const approveRoutes = (
      await ApproveRoute.findAll({
        include: [
          {
            model: ApproveUser
          }
        ],
        where: {
          ...where
        }
      })
    ).map((approveRoute, idx) => {
      return {
        No: idx + 1,
        approveRouteName: approveRoute.approveRouteName,
        approverCount: approveRoute.ApproveUsers.length,
        uuid: approveRoute.approveRouteId
      }
    })

    logger.info(constantsDefine.logMessage.INF001 + 'searchApproveRouteList')
    return { status: 0, searchResult: approveRoutes }
  } catch (error) {
    logger.error({ contractId: contractId, stack: error.stack, status: 0 })
    logger.info(constantsDefine.logMessage.INF001 + 'searchApproveRouteList')
    return { status: -1, searchResult: error }
  }
}

/**
 *
 * @param {uuid} contractId
 * @param {uuid} approveRouteId
 * @param {uuid} invoiceId
 * @param {uuid} requesterId
 * @param {string} message
 * @returns
 */
const requestApproval = async (contractId, approveRouteId, invoiceId, requesterId, message) => {
  try {
    const requestApprovalDAO = new RequestApprovalDAO(contractId)
    const requester = await userController.findOne(requesterId)
    const noneWorkflowStatusCode = await approveStatusDAO.getStautsCode('未処理')
    const rejectWorkflowStatusCode = await approveStatusDAO.getStautsCode('差し戻し')
    const waitingWorkflowStatusCode = await approveStatusDAO.getStautsCode('支払依頼中')

    // 該当請求書の情報取得
    const requestApprovalFind = await requestApprovalDAO.getRequestApprovalFromInvoice(invoiceId)

    // 該当請求書の情報が１つもない場合のみ
    if (!requestApprovalFind) {
      // レコード作成（ステータス：支払依頼中）
      const newRequest = await requestApprovalDAO.createRequestApproval(
        requester.userId,
        invoiceId,
        approveRouteId,
        waitingWorkflowStatusCode,
        message
      )
      if (newRequest instanceof Request === false) return -1
      await newRequest.save()
      return newRequest
    }

    // 該当請求書のステータスが未処理、差し戻しの場合、更新（ステータス：支払依頼中）
    if (
      requestApprovalFind.status === noneWorkflowStatusCode ||
      requestApprovalFind.status === rejectWorkflowStatusCode
    ) {
      await requestApprovalDAO.updateRequestApproval(
        requestApprovalFind,
        requester.userId,
        approveRouteId,
        waitingWorkflowStatusCode,
        message
      )
    } else {
      return 1
    }

    if ((await requestApprovalDAO.saveRequestApproval(requestApprovalFind)) instanceof Request === false) {
      throw Error('request approval fail')
    }
    return requestApprovalFind
  } catch (error) {
    logger.error({ contractId: contractId, stack: error.stack, status: 0 })
    logger.info(constantsDefine.logMessage.INF001 + 'requestApproval')
    return error
  }
}

/**
 *
 * @param {uuid} contractId
 * @param {uuid} approveRouteId
 * @param {uuid} requesterId
 * @param {string} message
 * @param {string} accessToken
 * @param {string} refreshToken
 * @param {uuid} request
 * @returns
 */
const saveApproval = async (contractId, approveRouteId, requesterId, message, accessToken, refreshToken, request) => {
  try {
    // approvalテーブルに承認者情報を保存
    const approveStatusDAO = require('../DAO/ApproveStatusDAO')
    const requester = await userController.findOne(requesterId)
    const waitWorkflowStatusCode = await approveStatusDAO.getStautsCode('支払依頼中')
    const rejectStatusCode = await approveStatusDAO.getStautsCode('差し戻し')
    const approveRoute = await ApproveRoute.findOne({
      where: {
        approveRouteId: approveRouteId,
        contractId: contractId
      }
    })
    const approveRouteApprovers = await ApproveRoute.getApproveRoute(contractId, approveRouteId)

    // header検索
    let header = null
    let idx = 0
    while (approveRouteApprovers[idx]) {
      if (approveRouteApprovers[idx]['ApproveUsers.prevApproveUser'] === null) {
        header = approveRouteApprovers[idx]
      }
      idx++
    }

    const users = []
    const headerId = header['ApproveUsers.approveUserId']
    let currUser = await ApproveUser.findOne({
      where: {
        approveUserId: headerId
      }
    })
    let next = null
    while (currUser) {
      const userId = currUser.approveUser
      next = currUser.nextApproveUser
      const tradeshiftDTO = new (require('../DTO/TradeshiftDTO'))(accessToken, refreshToken, null)
      tradeshiftDTO.setUserAccounts(require('../DTO/VO/UserAccounts'))
      users.push(new Approver(await tradeshiftDTO.getUserById(userId)))
      if (next) {
        currUser = await ApproveUser.findOne({
          where: {
            approveUserId: next
          }
        })
      } else {
        currUser = null
      }
    }

    let approval
    approval = await Approval.findOne({
      where: {
        requestId: request.requestId,
        approveStatus: rejectStatusCode
      }
    })

    // ステータスが未処理の場合
    if (!approval) {
      approval = await Approval.build({
        requestId: request.requestId,
        requestUserId: requester.userId,
        approveRouteId: approveRouteId,
        approveStatus: waitWorkflowStatusCode,
        approveRouteName: approveRoute.approveRouteName
      })
      // ステータスが差し戻しの場合
    } else {
      approval.requestUserId = requester.userId
      approval.approveRouteId = approveRouteId
      approval.approveStatus = waitWorkflowStatusCode
      approval.approveRouteName = approveRoute.approveRouteName
      approval.rejectedUser = null
      approval.rejectedAt = null
      approval.rejectedMessage = null
    }

    for (let i = 0; i < 10; i++) {
      if (users[i] && i < users.length - 1) {
        approval[`approveUser${i + 1}`] = users[i].Id
      } else {
        approval[`approveUser${i + 1}`] = null
      }
      approval[`approvalAt${i + 1}`] = null
      approval[`message${i + 1}`] = null
    }
    approval.approveUserLast = users[users.length - 1].Id
    approval.approvalAtLast = null
    approval.messageLast = null
    approval.approveUserCount = users.length
    await approval.save()
    return 0
  } catch (error) {
    logger.error({ contractId: contractId, stack: error.stack, status: 0 })
    logger.info(constantsDefine.logMessage.INF001 + 'saveApproval')
    return error
  }
}

const readApproval = async (contractId, invoiceId) => {
  try {
    const request = await Request.findOne({
      where: {
        contractId: contractId,
        invoiceId: invoiceId
      },
      order: [['create', 'DESC']]
    })

    if (request === null) return null

    return request
  } catch (error) {
    logger.error({ contractId: contractId, stack: error.stack, status: 0 })
    return error
  }
}

/**
 * 承認ルート存在確認。
 * @param {uuid} contractId 承認ルートの識別番号
 * @param {uuid} approveRouteId 承認ルートの識別番号
 * @returns {Boolean} 承認ルートが存在する場合true、ない場合fasle
 */
const checkApproveRoute = async (contractId, approveRouteId) => {
  try {
    if (!validate.isUUID(approveRouteId)) return false
    const approveRoute = await ApproveRoute.findOne({
      where: {
        approveRouteId: approveRouteId,
        contractId: contractId
      }
    })
    if (approveRoute instanceof ApproveRoute === false) return false
    return true
  } catch (error) {
    logger.error({ contractId: contractId, stack: error.stack, status: 0 })
    return error
  }
}

const updateApprove = async (contractId, requestId, message, userId) => {
  try {
    let userNo
    const userData = {}
    const selectApproval = await Approval.findOne({
      where: {
        requestId: requestId
      }
    })

    if (selectApproval instanceof Approval === false) return false

    let code = null
    const approveStatus = ~~selectApproval.approveStatus
    const approveUserCount = selectApproval.approveUserCount
    const activeApproverNo = approveStatus - 9
    if (approveUserCount === activeApproverNo) {
      code = '00'
      userNo = 'Last'
    } else if (activeApproverNo >= 1 && activeApproverNo <= 10) {
      code = `${approveStatus + 1}`
      userNo = `${activeApproverNo}`
    }
    const status = await Status.findOne({
      where: {
        code: code
      }
    })

    if (status === null) throw new Error(`${code} is not found in approveStatus table`)

    userData[`approvalAt${userNo}`] = new Date()
    userData.approveStatus = status.code
    if (message !== '' && message !== undefined) {
      userData[`message${userNo}`] = message
    }

    const hasPowerOfEditing = await approvalInboxController.hasPowerOfEditing(contractId, userId, requestId)

    if (hasPowerOfEditing) {
      const updateApproval = await Approval.update(userData, {
        where: {
          approvalId: selectApproval.approvalId
        }
      })

      if (!updateApproval) return false

      const updateReqeust = await Request.update(
        { status: status.code },
        {
          where: {
            requestId: requestId
          }
        }
      )

      if (!updateReqeust) return false
    } else {
      return -1
    }

    return true
  } catch (error) {
    logger.error({ contractId: contractId, stack: error.stack, status: 0 })
    logger.info(constantsDefine.logMessage.INF001 + 'updateApprove')
    return error
  }
}

/**
 * 差し戻しされた承認データ取得。
 * @param {uuid} contractId 承認ルートの識別番号
 * @param {uuid} requestId 支払依頼ID
 * @returns {approval} 差し戻しされた承認データ
 */
const getApprovalFromRejected = async (accessToken, refreshToken, tenant, contractId, requestId) => {
  try {
    if (!validate.isUUID(requestId)) return false
    const approval = await Approval.findOne({
      where: {
        requestId: requestId,
        approveStatus: '90'
      },
      order: [['rejectedMessage', 'DESC']]
    })

    if (approval instanceof Approval === false) return false

    const users = await getApprover(accessToken, refreshToken, tenant, {
      firstName: '',
      lastName: '',
      email: ''
    })

    const requester = users.find((user) => {
      if (user.id === approval.rejectedUser) {
        return true
      }
      return false
    })

    const rejectedUser = {
      name: requester.name,
      message: approval.rejectedMessage
    }

    return rejectedUser
  } catch (error) {
    logger.error({ contractId: contractId, stack: error.stack, status: 0 })
    return error
  }
}

module.exports = {
  getApprover: getApprover,
  insertApprover: insertApprover,
  editApprover: editApprover,
  getApproveRouteList: getApproveRouteList,
  getApproveRoute: getApproveRoute,
  deleteApproveRoute: deleteApproveRoute,
  duplicateApproveRoute: duplicateApproveRoute,
  searchApproveRouteList: searchApproveRouteList,
  requestApproval: requestApproval,
  readApproval: readApproval,
  checkApproveRoute: checkApproveRoute,
  saveApproval: saveApproval,
  updateApprove: updateApprove,
  getApprovalFromRejected: getApprovalFromRejected
}
