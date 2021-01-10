const User = require('../models').User
const Tenant = require('../models').Tenant

const db = require('../models')
const apiManager = require('./apiManager')
const logger = require('../lib/logger')

// リフレッシュトークン暗号化メソッド
const crypto = require('crypto')
// AES-256-CBCで暗号化
const password = process.env.TOKEN_ENC_PASS // 鍵長 32byte 次で生成したもの: console.log(crypto.randomBytes(32).toString('base64'))
const salt = process.env.TOKEN_ENC_SALT // ソルト 16byte 次で生成したもの: console.log(crypto.randomBytes(16).toString('base64'))

const encrypt = (algorithm, password, salt, iv, data) => {
  // 鍵を生成
  const key = crypto.scryptSync(password, salt, 32)
  // 暗号器を生成
  const cipher = crypto.createCipheriv(algorithm, key, iv)
  // data を暗号化
  let encryptedData = cipher.update(data, 'utf8', 'base64')
  encryptedData += cipher.final('base64')

  return encryptedData
}

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

        const iv = Buffer.from(userId.replace(/-/g, ''), 'hex') // _userIdはUUIDで16byteなのでこれを初期ベクトルとする
        // リフレッシュトークンは暗号化してDB保管
        const encryptedRefreshToken = encrypt('aes-256-cbc', password, salt, iv, newRefreshToken)
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
  create: async (accessToken, refreshToken) => {
    const userdata = await apiManager.accessTradeshift(accessToken, refreshToken, 'get', '/account/info/user')
    // Tradeshift APIへのアクセスエラーでは、エラーオブジェクトが返る
    if (userdata instanceof Error) {
      // userdataにはエラーオブジェクトが入っている
      return userdata
    }

    const _tenantId = userdata.CompanyAccountId
    const _userId = userdata.Memberships[0].UserId
    const _userRole = userdata.Memberships[0].Role
    // データベース接続回りはtry-catchしておく

    try {
      /* リフレッシュトークンは暗号化して保管 */
      const iv = Buffer.from(_userId.replace(/-/g, ''), 'hex') // _userIdはUUIDで16byteなのでこれを初期ベクトルとする
      const encryptedRefreshToken = encrypt('aes-256-cbc', password, salt, iv, refreshToken)

      /* トランザクション */
      const created = await db.sequelize.transaction(async (t) => {
        // 外部キー制約によりテナントがなくユーザのみ登録されている状態はない
        await Tenant.findOrCreate({
          where: { tenantId: _tenantId },
          defaults: {
            tenantId: _tenantId,
            registeredBy: _userId
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
