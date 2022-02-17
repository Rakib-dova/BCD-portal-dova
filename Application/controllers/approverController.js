'use stric'
const apiManager = require('./apiManager')
const qs = require('qs')
const Approver = require('../lib/approver/Approver')
const logger = require('../lib/logger')
const constantsDefine = require('../constants')
const db = require('../models')
const ApproveRoute = db.ApproveRoute
const ApproveUser = db.ApproveUser

const getApprover = async (accTk, refreshTk, tenantId, keyword) => {
  const userAccountsArr = []
  const queryObj = {
    limit: 25,
    page: 0,
    numPages: 1
  }

  do {
    // トレードシフトからユーザー情報を取得する。
    const queryString = `/account/${tenantId}/users?${qs.stringify(queryObj)}`
    try {
      const findUsers = await apiManager.accessTradeshift(accTk, refreshTk, 'get', queryString)
      if (findUsers instanceof Error) {
        if (findUsers.response.status === 401) {
          return -1
        }
      }
      findUsers.UserAccounts.forEach((account) => {
        userAccountsArr.push(new Approver(account))
      })
      queryObj.page++
      queryObj.numPages = findUsers.numPages
    } catch (error) {
      logger.error({ user: tenantId, stack: error.stack, status: 0 }, error.name)
      return -2
    }
  } while (queryObj.page < queryObj.numPages)

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

    // 重複コード検索
    const resultSearchRoute = await ApproveRoute.findAll({
      where: {
        approveRouteName: values.setApproveRouteNameInputId,
        contractId: contract
      }
    })

    // 重複コード検索（sequelize大小文字区別しないため）
    resultSearchRoute.forEach((item) => {
      if (item.approveRouteName === values.setApproveRouteNameInputId) {
        duplicatedFlag = true
      }
    })

    // 重複コードある場合、登録拒否処理
    if (duplicatedFlag) {
      return 1
    }

    // 重複コードない場合DBに保存する。（ApproveRoute）
    const resultToInsertRoute = await ApproveRoute.create({
      contractId: contract,
      approveRouteName: values.setApproveRouteNameInputId
    })

    // DB保存失敗したらモデルApproveRouteインスタンスではない
    if (resultToInsertRoute instanceof ApproveRoute === false) {
      return -1
    }

    // 重複コードない場合DBに保存する。（ApproveUser）
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
      for (let i = 0; i < uuids.length; i++) {
        let isLastApproveUser = false

        if (i === uuids.length - 1) {
          isLastApproveUser = true
        }

        resultToInsertUser = await ApproveUser.create({
          approveRouteId: resultToInsertRoute.approveRouteId,
          approveUser: uuids[i],
          prevApproveUser: uuids[i - 1] ?? null,
          nextApproveUser: uuids[i + 1] ?? null,
          isLastApproveUser: isLastApproveUser
        })
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
        deleteFlag: false
      },
      order: [['approveRouteName', 'ASC']]
    })
    // 承認ルートの名を昇順ソード
    approveRoutes.sort((a, b) => {
      if (a.approveRouteName > b.approveRouteName) return 1
      else if (a.approveRouteName < b.approveRouteName) return -1
      else {
        if (a.ApproveUsers.length - b.ApproveUsers.length > 0) return 1
        else if (a.ApproveUsers.length - b.ApproveUsers.length < 0) return -1
        else return 0
      }
    })
    logger.info(constantsDefine.logMessage.INF001 + 'approverController.getApproveRouteList')
    return approveRoutes.map((approveRoute, idx) => {
      return {
        No: idx + 1,
        approveRouteName: approveRoute.approveRouteName,
        approverCount: approveRoute.ApproveUsers.length
      }
    })
  } catch (error) {
    logger.error({ contractId: contractId, stack: error.stack, status: 0 })
    logger.info(constantsDefine.logMessage.INF001 + 'approverController.getApproveRouteList')
    return error
  }
}
module.exports = {
  getApprover: getApprover,
  insertApprover: insertApprover,
  getApproveRouteList: getApproveRouteList
}
