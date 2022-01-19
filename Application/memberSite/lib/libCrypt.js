'use strict'
/********************************************************************************
 * 暗号化機能ライブラリ
 *
 * @author K.Yamamoto
 ********************************************************************************/
const crypto = require('crypto')
const jwt = require('jwt-simple')

/**
 * 暗号化文字列生成(SHA-256)
 *
 * @description
 * IVに"userId"、アルゴリズム「AES-256-CBC」を使用し"data"文字列を暗号化し\
 * base64形式文字列を返す。\
 * ※鍵パスワード、ソルトはOS環境変数(下記)を使用。\
 * ・TOKEN_ENC_PASS : 鍵パスワード\
 * ・TOKEN_ENC_SALT : ソルト
 *
 * @param {string} userId ユーザID
 * @param {string} data 暗号化対象文字列
 * @returns {string} 暗号化文字列
 */
exports.encrypt = function (userId, data) {
  let encString = null
  const algorithm = 'aes-256-cbc' // アルゴリズム
  const password = process.env.TOKEN_ENC_PASS // 鍵長 32byte 次で生成したもの: console.log(crypto.randomBytes(32).toString('base64'))
  const salt = process.env.TOKEN_ENC_SALT // ソルト 16byte 次で生成したもの: console.log(crypto.randomBytes(16).toString('base64'))

  // パラメータチェック
  if (userId == null || data == null || !password || !salt) return encString

  try {
    // userIdはUUIDで16byteなのでこれを初期ベクトルとする
    const iv = Buffer.from(userId.replace(/-/g, ''), 'hex')
    // 鍵を生成
    const key = crypto.scryptSync(password, salt, 32)
    // 暗号器を生成
    const cipher = crypto.createCipheriv(algorithm, key, iv)
    // data を暗号化
    encString = cipher.update(data, 'utf8', 'base64')
    encString += cipher.final('base64')
  } catch (err) {
    encString = null
  }
  return encString
}

/**
 * 暗号化文字列の復号化
 *
 * @description
 * encrypt()で暗号化された文字列を復号化し返す。"userId"はencrypt()で指定した\
 * 同文字列を指定する。\
 * ※鍵パスワード、ソルトはOS環境変数(下記)を使用。\
 * ・TOKEN_ENC_PASS : 鍵パスワード\
 * ・TOKEN_ENC_SALT : ソルト
 *
 * @param {string} userId　ユーザID
 * @param {string} data 暗号化文字列
 * @returns {string} 復号化文字列
 */
exports.decrypt = function (userId, data) {
  let decString = null
  const algorithm = 'aes-256-cbc' // アルゴリズム
  const password = process.env.TOKEN_ENC_PASS // 鍵長 32byte 次で生成したもの: console.log(crypto.randomBytes(32).toString('base64'))
  const salt = process.env.TOKEN_ENC_SALT // ソルト 16byte 次で生成したもの: console.log(crypto.randomBytes(16).toString('base64'))

  // パラメータチェック
  if (userId == null || data == null || !password || !salt) return decString

  try {
    // userIdはUUIDで16byteなのでこれを初期ベクトルとする
    const iv = Buffer.from(userId.replace(/-/g, ''), 'hex')
    // 鍵を生成
    const key = crypto.scryptSync(password, salt, 32)
    // 暗号器を生成
    const decipher = crypto.createDecipheriv(algorithm, key, iv)
    // data を復号化
    decString = decipher.update(data, 'base64', 'utf8')
    decString += decipher.final('utf8')
  } catch (err) {
    decString = null
  }
  return decString
}

/**
 * パスワード文字列ハッシュ化
 *
 * @description
 * パスワード文字列を「パスワード＋ユーザID」文字列でSHA-256でハッシュ化する。\
 * パラメータ不備、ハッシュ化に失敗した際はnullを返す。
 *
 * @param   {string} userId ユーザID
 * @param   {string} password パスワード(平文)
 * @returns {string | null } ハッシュ化したパスワード文字列
 */
exports.hashPassword = function (userId, password) {
  const hashStr = null
  const str = null
  if (userId == null || password == null) return hashStr
  try {
    str = password + userId
    hashStr = crypto.createHash('sha512').update(str, 'utf8').digest('hex')
  } catch (err) {
    hashStr = null
  }
  return hashStr
}

/**
 * JWT暗号化トークン作成
 *
 * @description
 * JSON形式ペイロードをパラメータにSHAR-256、Base64形式で暗号化したトークン文字列を\
 * 生成し返す。\
 * パラメータ不備(JSON形式でない)やOS環境変数取得に失敗した場合はnullを返す。\
 * 尚、暗号化する際の秘密鍵はOS環境変数「BCA_JWT_HMAC_KEY」定義値を使用する。
 *
 * @param {json} payload ペイロード
 * @returns {string | null} JWT暗号化文字列、またはnull
 */
exports.encodeJwtToken = function (payload) {
  let token = null
  const secret = process.env.BCA_JWT_HMAC_KEY
  const algorithm = 'HS256'

  // 秘密鍵チェック
  if (!secret) return token

  // JSON形式チェック
  try {
    JSON.parse(payload)
  } catch (err) {
    console.debug('JSONエラー')
    return token
  }

  // JWT暗号化
  return jwt.encode(payload, secret, algorithm)
}

/**
 * JWT暗号化トークン復号化
 *
 * @description
 * dencodeJwtToken()で暗号化されたJWTを復号化し返す。\
 * 復号化に失敗した際はnullを返す。\
 * 尚、暗号化する際の秘密鍵はOS環境変数「BCA_JWT_HMAC_KEY」定義値を使用する。
 *
 * @param {string} token JWT暗号化トークン文字列
 * @returns {string | null } 復号化JWTトークン文字列、またはnull
 */
exports.decodeJwtToken = function (token) {
  let jwtToken = null
  const secret = process.env.BCA_JWT_HMAC_KEY
  const algorithm = 'HS256'

  // 秘密鍵チェック
  if (!secret) return jwtToken

  // JWTトークン復号化
  try {
    jwtToken = jwt.decode(token, secret, false, algorithm)
  } catch (err) {
    return jwtToken
  }
  return jwtToken
}
