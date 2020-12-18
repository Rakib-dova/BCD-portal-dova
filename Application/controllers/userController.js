
const express = require('express');
const Views = '../views/'
const User = require('../models').User;

const apihelper = require('../lib/apihelper')

//リフレッシュトークン暗号化メソッド
const crypto = require('crypto')
//AES-256-CBCで暗号化
const password = process.env.TOKEN_ENC_PASS //鍵長 32byte 次で生成したもの: console.log(crypto.randomBytes(32).toString('base64'))
const salt = process.env.TOKEN_ENC_SALT //ソルト 16byte 次で生成したもの: console.log(crypto.randomBytes(16).toString('base64'))

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
    let user = await User.findOne({
      where: {
        userId: userId
      }
    })
    if(user !== null){
      user.subRefreshToken = user.refreshToken
      const userdata = await apihelper.accessTradeshift(accessToken, newRefreshToken, "get", "/account/info/user")

      const iv = Buffer.from(userId.replace(/-/g, ''), 'hex') //user_idはUUIDで16byteなのでこれを初期ベクトルとする
      //リフレッシュトークンは暗号化してDB保管
      const encrypted_refresh_token = encrypt('aes-256-cbc', password, salt, iv, newRefreshToken)
      user.refreshToken = encrypted_refresh_token
      //UserRoleは最新化する
      user.userRole = userdata.Memberships[0].Role;
      user.save()
      return user
    } else {
      
      return null
    }
  },
  create: async (accessToken, refreshToken) => {

    const userdata = await apihelper.accessTradeshift(accessToken, refreshToken, "get", "/account/info/user")

    if(userdata !== null) {
        const tenant_id = userdata.CompanyAccountId;
        const user_id = userdata.Memberships[0].UserId;
        const role = userdata.Memberships[0].Role;

        const iv = Buffer.from(user_id.replace(/-/g, ''), 'hex') //user_idはUUIDで16byteなのでこれを初期ベクトルとする
        //リフレッシュトークンは暗号化してDB保管
        const encrypted_refresh_token = encrypt('aes-256-cbc', password, salt, iv, refreshToken)

        const created = await User.create({
          userId: user_id,
          tenantId: tenant_id,
          userRole: role,
          appVersion: process.env.TS_APP_VERSION,
          refreshToken: encrypted_refresh_token,
          userStatus: 0,
        })
        if(created == null) {
          //TODO: ユーザ作成が失敗したときのエラーハンドリング
        }
        return created

    } else {
        //TODO: APIからユーザデータが取れなかったときのエラーハンドリング
    }

    return null
  },
  delete: async (userId) => {
    const deleted = await User.destroy({
      where: { userId: userId }
    })
    
    return deleted
  }
}