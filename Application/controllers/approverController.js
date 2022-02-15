'use stric'
const apiManager = require('./apiManager')
const qs = require('qs')
const Approver = require('../lib/approver/Approver')
const logger = require('../lib/logger')
const getApprover = async (accTk, refreshTk, tenantId, keyword) => {
  const userAccountsArr = []
  const queryObj = {
    limit: 1,
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
  userAccountsArr.forEach((account) => {
    if (account.FirstName.search(keyword.firstName) !== -1 && keyword.firstName.length > 0) {
      searchUsers.push({
        id: account.Id,
        name: `${account.FirstName} ${account.LastName}`,
        email: `${account.Username}`
      })
    }
    if (account.LastName.search(keyword.lastName) !== -1 && keyword.lastName.length > 0) {
      searchUsers.push({
        id: account.Id,
        name: `${account.FirstName} ${account.LastName}`,
        email: `${account.Username}`
      })
    }
    if (account.Username.search(keyword.email) !== -1 && keyword.email.length > 0) {
      searchUsers.push({
        id: account.Id,
        name: `${account.FirstName} ${account.LastName}`,
        email: `${account.Username}`
      })
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

module.exports = {
  getApprover: getApprover
}
