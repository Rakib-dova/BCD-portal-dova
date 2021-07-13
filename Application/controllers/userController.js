const User = require('../models').User
const Tenant = require('../models').Tenant
const Contract = require('../models').Contract
const Order = require('../models').Order

const db = require('../models')
const apiManager = require('./apiManager')
const logger = require('../lib/logger')

const tokenenc = require('../lib/tokenenc')
const { v4: uuidv4 } = require('uuid')

const constantsDefine = require('../constants')

module.exports = {
  findOne: async (userId) => {
    // データベース接続回りはtry-catch
    try {
      const user = await User.findOne({
        where: {
          userId: userId
        }
      })

      return user
    } catch (error) {
      // status 0はDBエラー
      logger.error({ user: userId, stack: error.stack, status: 0 }, error.name)
      return error
    }
  },
  findAndUpdate: async (userId, accessToken, newRefreshToken) => {
    // 暗号化回りはtry-catch
    let encryptedRefreshToken
    try {
      /* リフレッシュトークン暗号化 */
      encryptedRefreshToken = tokenenc.encrypt('aes-256-cbc', userId, newRefreshToken)
    } catch (error) {
      // status 2は暗号化エラー
      logger.error({ user: userId, stack: error.stack, status: 2 }, error.name)
      return error
    }

    // データベース接続回りはtry-catch
    try {
      const user = await User.findOne({
        where: {
          userId: userId
        }
      })

      if (user !== null) {
        user.subRefreshToken = user.refreshToken

        const userdata = await apiManager.accessTradeshift(accessToken, newRefreshToken, 'get', '/account/info/user')
        // Tradeshift APIへのアクセスエラーでは、エラーオブジェクトが返る
        if (userdata instanceof Error) {
          // userdataにはエラーオブジェクトが入っている
          return userdata
        }

        // 暗号化したリフレッシュトークンをDB保管
        user.refreshToken = encryptedRefreshToken
        // UserRoleは最新化する
        user.userRole = userdata.Memberships[0].Role
        user.save()
        return user
      } else {
        // ユーザが見つからない場合nullが返る
        return null
      }
    } catch (error) {
      // status 0はDBエラー
      logger.error({ user: userId, stack: error.stack, status: 0 }, error.name)
      return error
    }
  },
  create: async (accessToken, refreshToken, contractInformationnewOrder) => {
    const userdata = await apiManager.accessTradeshift(accessToken, refreshToken, 'get', '/account/info/user')
    // Tradeshift APIへのアクセスエラーでは、エラーオブジェクトが返る
    if (userdata instanceof Error) {
      // userdataにはエラーオブジェクトが入っている
      return userdata
    }

    const _tenantId = userdata.CompanyAccountId
    const _userId = userdata.Memberships[0].UserId
    const _userRole = userdata.Memberships[0].Role

    // 暗号化回りはtry-catchしておく
    let encryptedRefreshToken
    try {
      /* リフレッシュトークンを暗号化 */
      encryptedRefreshToken = tokenenc.encrypt('aes-256-cbc', _userId, refreshToken)
    } catch (error) {
      // status 2は暗号化エラー
      logger.error({ tenant: _tenantId, user: _userId, stack: error.stack, status: 2 }, error.name)
      return error
    }
    // データベース接続回りはtry-catchしておく
    try {
      /* トランザクション */
      const created = await db.sequelize.transaction(async (t) => {
        // 外部キー制約によりテナントがなくユーザのみ登録されている状態はない
        await Tenant.findOrCreate({
          where: { tenantId: _tenantId },
          defaults: {
            tenantId: _tenantId,
            registeredBy: _userId,
            deleteFlag: false
          },
          transaction: t
        })

        const user = await User.findOrCreate({
          where: { userId: _userId },
          defaults: {
            userId: _userId,
            tenantId: _tenantId,
            userRole: _userRole,
            appVersion: process.env.TS_APP_VERSION,
            refreshToken: encryptedRefreshToken,
            userStatus: 0
          },
          transaction: t
        })

        // contractId uuidで生成
        const _contractId = uuidv4()
        // contractテーブルのdate
        const _date = new Date()

        // Contractテーブルに入力
        await Contract.findOrCreate({
          where: { contractId: _contractId },
          defaults: {
            contractId: _contractId,
            tenantId: _tenantId,
            numberN: '',
            contractStatus: constantsDefine.statusConstants.contractStatusNewContractOrder,
            deleteFlag: false,
            createdAt: _date,
            updatedAt: _date
          },
          transaction: t
        })

        // Orderテーブルに入力
        await Order.findOrCreate({
          where: { contractId: _contractId },
          defaults: {
            contractId: _contractId,
            tenantId: _tenantId,
            orderType: constantsDefine.statusConstants.orderTypeNewOrder,
            orderData: JSON.stringify(contractInformationnewOrder)
          },
          transaction: t
        })
        return user
      })

      return created
    } catch (error) {
      // status 0はDBエラー
      logger.error({ tenant: _tenantId, user: _userId, stack: error.stack, status: 0 }, error.name)
      return error
    }
  },
  delete: async (userId) => {
    // データベース接続回りはtry-catch
    try {
      const deleted = await db.sequelize.transaction(async (t) => {
        const user = await User.findOne({
          where: { userId: userId }
        })

        const destroy = await User.destroy({
          where: { userId: userId }
        })

        const count = await User.count({
          where: { tenantId: user.tenantId }
        })

        if (Number(count) === 0) {
          await Tenant.destroy({
            where: { tenantId: user.tenantId }
          })
        }
        return destroy
      })

      return deleted
    } catch (error) {
      // status 0はDBエラー
      logger.error({ user: userId, stack: error.stack, status: 0 }, error.name)
      return error
    }
  }
}
