// リフレッシュトークン暗号化メソッド
const crypto = require('crypto')
// AES-256-CBCで暗号化
const password = process.env.TOKEN_ENC_PASS // 鍵長 32byte 次で生成したもの: console.log(crypto.randomBytes(32).toString('base64'))
const salt = process.env.TOKEN_ENC_SALT // ソルト 16byte 次で生成したもの: console.log(crypto.randomBytes(16).toString('base64'))

exports.encrypt = (algorithm, userId, data) => {
  // _userIdはUUIDで16byteなのでこれを初期ベクトルとする
  const iv = Buffer.from(userId.replace(/-/g, ''), 'hex')
  // 鍵を生成
  const key = crypto.scryptSync(password, salt, 32)
  // 暗号器を生成
  const cipher = crypto.createCipheriv(algorithm, key, iv)
  // data を暗号化
  let encryptedData = cipher.update(data, 'utf8', 'base64')
  encryptedData += cipher.final('base64')

  return encryptedData
}
