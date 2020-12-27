const User = require('../models').User
const Tenant = require('../models').Tenant

const db = require('../models')
const apihelper = require('../lib/apihelper')

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
    const user = await User.findOne({
      where: {
        userId: userId
      }
    })

    return user
  },
  findByTenantId: async (companyId) => {
    const user = await User.findOne({
      where: {
        tenantId: companyId
      }
    })

    return user
  },
  findAndUpdate: async (userId, accessToken, newRefreshToken) => {
    const user = await User.findOne({
      where: {
        userId: userId
      }
    })
    if (user !== null) {
      user.subRefreshToken = user.refreshToken
      const userdata = await apihelper.accessTradeshift(accessToken, newRefreshToken, 'get', '/account/info/user')

      const iv = Buffer.from(userId.replace(/-/g, ''), 'hex') // _userIdはUUIDで16byteなのでこれを初期ベクトルとする
      // リフレッシュトークンは暗号化してDB保管
      const encryptedRefreshToken = encrypt('aes-256-cbc', password, salt, iv, newRefreshToken)
      user.refreshToken = encryptedRefreshToken
      // UserRoleは最新化する
      user.userRole = userdata.Memberships[0].Role
      user.save()
      return user
    } else {
      return null
    }
  },
  create: async (accessToken, refreshToken) => {
    const userdata = await apihelper.accessTradeshift(accessToken, refreshToken, 'get', '/account/info/user')

    if (userdata !== null) {
      const _tenantId = userdata.CompanyAccountId
      const _userId = userdata.Memberships[0].UserId
      const _userRole = userdata.Memberships[0].Role

      const iv = Buffer.from(_userId.replace(/-/g, ''), 'hex') // _userIdはUUIDで16byteなのでこれを初期ベクトルとする
      // リフレッシュトークンは暗号化してDB保管
      const encryptedRefreshToken = encrypt('aes-256-cbc', password, salt, iv, refreshToken)
      let created
      // TODO:データベース接続回りはtry-catchしておく
      try {
        created = await db.sequelize.transaction(async (t) => {
          await Tenant.findOrCreate({
            where: { tenantId: _tenantId },
            defaults: {
              tenantId: _tenantId,
              registeredBy: _userId
            },
            transaction: t
          })

          const user = await User.create(
            {
              userId: _userId,
              tenantId: _tenantId,
              userRole: _userRole,
              appVersion: process.env.TS_APP_VERSION,
              refreshToken: encryptedRefreshToken,
              userStatus: 0
            },
            { transaction: t }
          )

          return user
        })
      } catch (error) {
        // TODO:エラー内容はログに吐く
        console.log(error)
        created = null
      }

      if (created == null) {
        // TODO: ユーザ作成が失敗したときのエラーハンドリング
      }

      return created
    } else {
      // TODO: APIからユーザデータが取れなかったときのエラーハンドリング
    }

    return null
  },
  delete: async (userId) => {
    let deleted
    // TODO:データベース接続回りはtry-catchしておく
    try {
      deleted = await db.sequelize.transaction(async (t) => {
        const user = await User.findOne({
          where: { userId: userId }
        })

        const deleted = await User.destroy({
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
        return deleted
      })
    } catch (error) {
      // TODO:ログにエラー吐く
      console.log(error)
      deleted = null
    }
    return deleted
  }
}
