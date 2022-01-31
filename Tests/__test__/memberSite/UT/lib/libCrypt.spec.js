/**
 * 暗号化機能ライブラリ・カバレッジテスト
 *
 * @author K.Yamamoto
 */

'use strict'
// const { throws } = require('assert')

const target = require('../../../../../Application/memberSite/lib/libCrypt')

describe('libCrypt.jsのテスト', () => {
  /**
   * encrypt() のテスト
   */
  describe('encrypt() のテスト', () => {
    test('encrypt() ノーマル', () => {
      process.env.BCA_TOKEN_ENC_PASS = '12345678901234567890123456789012'
      process.env.BCA_TOKEN_ENC_SALT = '1234567890123456'
      const userId = '8d7d1015-533a-430f-a40a-421539f3909d'
      const data = 'hoge'
      const result = target.encrypt(userId, data)
      expect(result).toBe('DxTcLVofS2vr6e/mgQOCRA==')
    })
    test('encrypt() ノーマル data=(全半角記号))', () => {
      process.env.BCA_TOKEN_ENC_PASS = '12345678901234567890123456789012'
      process.env.BCA_TOKEN_ENC_SALT = '1234567890123456'
      const userId = '8d7d1015-533a-430f-a40a-421539f3909d'
      const data = '1 aA!"#$%&\'()=~|`{+*}<>?_-^@[;:],./\\　漢字①'
      const result = target.encrypt(userId, data)
      expect(result).not.toBeNull()
    })
    test('encrypt() ノーマル data=(半角スペースのみ))', () => {
      process.env.BCA_TOKEN_ENC_PASS = '12345678901234567890123456789012'
      process.env.BCA_TOKEN_ENC_SALT = '1234567890123456'
      const userId = '8d7d1015-533a-430f-a40a-421539f3909d'
      const data = '  '
      const result = target.encrypt(userId, data)
      expect(result).not.toBeNull()
    })
    test('encrypt() ノーマル data=(全角スペースのみ))', () => {
      process.env.BCA_TOKEN_ENC_PASS = '12345678901234567890123456789012'
      process.env.BCA_TOKEN_ENC_SALT = '1234567890123456'
      const userId = '8d7d1015-533a-430f-a40a-421539f3909d'
      const data = '　'
      const result = target.encrypt(userId, data)
      expect(result).not.toBeNull()
    })
    test('encrypt() パラメータチェック userId=null', () => {
      process.env.BCA_TOKEN_ENC_PASS = '12345678901234567890123456789012'
      process.env.BCA_TOKEN_ENC_SALT = '1234567890123456'
      const userId = null
      const data = 'hoge'
      const result = target.encrypt(userId, data)
      expect(result).toBeNull()
    })
    test('encrypt() パラメータチェック userId=(空)', () => {
      process.env.BCA_TOKEN_ENC_PASS = '12345678901234567890123456789012'
      process.env.BCA_TOKEN_ENC_SALT = '1234567890123456'
      const userId = ''
      const data = 'hoge'
      const result = target.encrypt(userId, data)
      expect(result).toBeNull()
    })
    test('encrypt() パラメータチェック userId=(UUID.V4でない)', () => {
      process.env.BCA_TOKEN_ENC_PASS = '12345678901234567890123456789012'
      process.env.BCA_TOKEN_ENC_SALT = '1234567890123456'
      const userId = 'UUUID-V4-123'
      const data = 'hoge'
      const result = target.encrypt(userId, data)
      expect(result).toBeNull()
    })
    test('encrypt() パラメータチェック userId=(16桁未満16進文字列)', () => {
      process.env.BCA_TOKEN_ENC_PASS = '12345678901234567890123456789012'
      process.env.BCA_TOKEN_ENC_SALT = '1234567890123456'
      const userId = '0102030405060708090A'
      const data = 'hoge'
      const result = target.encrypt(userId, data)
      expect(result).toBeNull()
    })
    test('encrypt() パラメータチェック data=null', () => {
      process.env.BCA_TOKEN_ENC_PASS = '12345678901234567890123456789012'
      process.env.BCA_TOKEN_ENC_SALT = '1234567890123456'
      const userId = '8d7d1015-533a-430f-a40a-421539f3909d'
      const data = null
      const result = target.encrypt(userId, data)
      expect(result).toBeNull()
    })
    test('encrypt() パラメータチェック data=(空)', () => {
      process.env.BCA_TOKEN_ENC_PASS = '12345678901234567890123456789012'
      process.env.BCA_TOKEN_ENC_SALT = '1234567890123456'
      const userId = '8d7d1015-533a-430f-a40a-421539f3909d'
      const data = ''
      const result = target.encrypt(userId, data)
      expect(result).not.toBeNull()
    })
    test('encrypt() 環境変数チェック BCA_TOKEN_ENC_PASS=(空)', () => {
      process.env.BCA_TOKEN_ENC_PASS = ''
      process.env.BCA_TOKEN_ENC_SALT = '1234567890123456'
      const userId = '8d7d1015-533a-430f-a40a-421539f3909d'
      const data = 'hoge'
      const result = target.encrypt(userId, data)
      expect(result).toBeNull()
    })
    test('encrypt() 環境変数チェック BCA_TOKEN_ENC_SALT=(空)', () => {
      process.env.BCA_TOKEN_ENC_PASS = '12345678901234567890123456789012'
      process.env.BCA_TOKEN_ENC_SALT = ''
      const userId = '8d7d1015-533a-430f-a40a-421539f3909d'
      const data = 'hoge'
      const result = target.encrypt(userId, data)
      expect(result).toBeNull()
    })
    test('encrypt() 暗号化例外エラー発生', () => {
      process.env.BCA_TOKEN_ENC_PASS = '12345678901234567890123456789012'
      process.env.BCA_TOKEN_ENC_SALT = '1234567890123456'
      // const userId = '8d7d1015-533a-430f-a40a-421539f3909d'
      const userId = '8d7d1015-533a-430f-a40a' // IV文字列長を短くして内部で例外エラーを発生
      const data = 'hoge'
      const result = target.encrypt(userId, data)
      expect(result).toBeNull()
    })
    test('encrypt() 暗号化文字列->復号化', () => {
      process.env.BCA_TOKEN_ENC_PASS = '12345678901234567890123456789012'
      process.env.BCA_TOKEN_ENC_SALT = '1234567890123456'
      const userId = '8d7d1015-533a-430f-a40a-421539f3909d'
      const data = 'hoge'
      const encStr = 'DxTcLVofS2vr6e/mgQOCRA=='
      // 暗号化
      expect(target.encrypt(userId, data)).toBe(encStr)
      // 復号化
      expect(target.decrypt(userId, encStr)).toBe(data)
    })
  })
  /**
   * decrypt() のテスト
   */
  describe('decrypt() のテスト', () => {
    test('decrypt() ノーマル', () => {
      process.env.BCA_TOKEN_ENC_PASS = '12345678901234567890123456789012'
      process.env.BCA_TOKEN_ENC_SALT = '1234567890123456'
      const userId = '8d7d1015-533a-430f-a40a-421539f3909d'
      const data = 'DxTcLVofS2vr6e/mgQOCRA=='
      const result = target.decrypt(userId, data)
      expect(result).toBe('hoge')
    })
    test('decrypt() パラメータチェック userId=null', () => {
      process.env.BCA_TOKEN_ENC_PASS = '12345678901234567890123456789012'
      process.env.BCA_TOKEN_ENC_SALT = '1234567890123456'
      const userId = null
      const data = 'DxTcLVofS2vr6e/mgQOCRA=='
      const result = target.decrypt(userId, data)
      expect(result).toBeNull()
    })
    test('decrypt() パラメータチェック userId=(空)', () => {
      process.env.BCA_TOKEN_ENC_PASS = '12345678901234567890123456789012'
      process.env.BCA_TOKEN_ENC_SALT = '1234567890123456'
      const userId = ''
      const data = 'DxTcLVofS2vr6e/mgQOCRA=='
      const result = target.decrypt(userId, data)
      expect(result).toBeNull()
    })
    test('decrypt() パラメータチェック userId=(UUID.V4でない)', () => {
      process.env.BCA_TOKEN_ENC_PASS = '12345678901234567890123456789012'
      process.env.BCA_TOKEN_ENC_SALT = '1234567890123456'
      const userId = 'UUUID-V4-123'
      const data = 'DxTcLVofS2vr6e/mgQOCRA=='
      const result = target.decrypt(userId, data)
      expect(result).toBeNull()
    })
    test('decrypt() パラメータチェック userId=(16桁未満16進文字列)', () => {
      process.env.BCA_TOKEN_ENC_PASS = '12345678901234567890123456789012'
      process.env.BCA_TOKEN_ENC_SALT = '1234567890123456'
      const userId = '0102030405060708090A'
      const data = 'DxTcLVofS2vr6e/mgQOCRA=='
      const result = target.decrypt(userId, data)
      expect(result).toBeNull()
    })
    test('decrypt() パラメータチェック data=null', () => {
      process.env.BCA_TOKEN_ENC_PASS = '12345678901234567890123456789012'
      process.env.BCA_TOKEN_ENC_SALT = '1234567890123456'
      const userId = '8d7d1015-533a-430f-a40a-421539f3909d'
      const data = null
      const result = target.decrypt(userId, data)
      expect(result).toBeNull()
    })
    test('decrypt() パラメータチェック data=(空)', () => {
      process.env.BCA_TOKEN_ENC_PASS = '12345678901234567890123456789012'
      process.env.BCA_TOKEN_ENC_SALT = '1234567890123456'
      const userId = '8d7d1015-533a-430f-a40a-421539f3909d'
      const data = ''
      const result = target.decrypt(userId, data)
      expect(result).toBeNull()
    })
    test('decrypt() 環境変数チェック BCA_TOKEN_ENC_PASS=(空)', () => {
      process.env.BCA_TOKEN_ENC_PASS = ''
      process.env.BCA_TOKEN_ENC_SALT = '1234567890123456'
      const userId = '8d7d1015-533a-430f-a40a-421539f3909d'
      const data = 'DxTcLVofS2vr6e/mgQOCRA=='
      const result = target.decrypt(userId, data)
      expect(result).toBeNull()
    })
    test('decrypt() 環境変数チェック BCA_TOKEN_ENC_SALT=(空)', () => {
      process.env.BCA_TOKEN_ENC_PASS = '12345678901234567890123456789012'
      process.env.BCA_TOKEN_ENC_SALT = ''
      const userId = '8d7d1015-533a-430f-a40a-421539f3909d'
      const data = 'DxTcLVofS2vr6e/mgQOCRA=='
      const result = target.decrypt(userId, data)
      expect(result).toBeNull()
    })
    test('decrypt() 復号化例外エラー発生', () => {
      process.env.BCA_TOKEN_ENC_PASS = '12345678901234567890123456789012'
      process.env.BCA_TOKEN_ENC_SALT = '1234567890123456'
      //   const userId = '8d7d1015-533a-430f-a40a-421539f3909d'
      const userId = '8d7d1015-533a-430f-a40a' // IV文字列長を短くして内部で例外エラーを発生
      const data = 'DxTcLVofS2vr6e/mgQOCRA=='
      const result = target.decrypt(userId, data)
      expect(result).toBeNull()
    })
  })
  /**
   * hashPassword() のテスト
   */
  describe('hashPassword', () => {
    test('hashPassword() ノーマルその１(SHA512-UTF8-HEX)', () => {
      const userId = 'hoge'
      const password = 'pass'
      const result = target.hashPassword(userId, password)
      expect(result).toBe(
        'f4ec632876bd65555b7eb69f92ff4e9bc382ad814ee845ef1be03548a0fef21e59fe31c4f54abfb360450a0623e02823010a63f6030ff0f1195029cb90a675ce'
      )
    })
    test('hashPassword() ノーマルその２(SHA512-UTF8-HEX)', () => {
      const userId = 'userId'
      const password = 'password'
      const result = target.hashPassword(userId, password)
      expect(result).toBe(
        '3ce4f1e9ead159f29d2d5bd4cef843f35219c6f32ab81dda55fae4742c271048957b0387a9691c0020b0b28a2b04f27e5f3c6ff6cc72a3573444dfa19512b86a'
      )
    })
    test('hashPassword() ノーマル userId=(空)', () => {
      const userId = ''
      const password = 'pass'
      const result = target.hashPassword(userId, password)
      expect(result).toBe(
        '5b722b307fce6c944905d132691d5e4a2214b7fe92b738920eb3fce3a90420a19511c3010a0e7712b054daef5b57bad59ecbd93b3280f210578f547f4aed4d25'
      )
    })
    test('hashPassword() ノーマル password=(空)', () => {
      const userId = 'hoge'
      const password = ''
      const result = target.hashPassword(userId, password)
      expect(result).toBe(
        'dbb50237ad3fa5b818b8eeca9ca25a047e0f29517db2b25f4a8db5f717ff90bf0b7e94ef4f5c4e313dfb06e48fbd9a2e40795906a75c470cdb619cf9c2d4f6d9'
      )
    })
    test('hashPassword() ノーマル userId=(空)かつ、password=(空)', () => {
      const userId = ''
      const password = ''
      const result = target.hashPassword(userId, password)
      // console.log(
      //   '【%s】hashPassword() userId[%s] password[%s] -> [%s]',
      //   expect.getState().currentTestName,
      //   userId,
      //   password,
      //   result
      // )
      expect(result).toBe(
        'cf83e1357eefb8bdf1542850d66d8007d620e4050b5715dc83f4a921d36ce9ce47d0d13c5d85f2b0ff8318d2877eec2f63b931bd47417a81a538327af927da3e'
      )
    })
    test('hashPassword() パラメータチェック userId=null', () => {
      const userId = null
      const password = 'pass'
      const result = target.hashPassword(userId, password)
      expect(result).toBeNull()
    })
    test('hashPassword() パラメータチェック password=null', () => {
      const userId = 'hoge'
      const password = null
      const result = target.hashPassword(userId, password)
      expect(result).toBeNull()
    })
    test('hashPassword() パラメータチェック userId=null かつ、password=null', () => {
      const userId = 'hoge'
      const password = null
      const result = target.hashPassword(userId, password)
      expect(result).toBeNull()
    })
  })

  /**
   * encodeJwtToken() のテスト
   */
  describe('encodeJwtToken() のテスト', () => {
    test('encodeJwtToken() ノーマル', () => {
      process.env.BCA_JWT_HMAC_KEY = 'pajamas-crouch-repackage'
      const payload = '{"iss":"jwtToken.js","sub":"1234-JWT-TOKEN-6789"}'
      const encode =
        'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.IntcImlzc1wiOlwiand0VG9rZW4uanNcIixcInN1YlwiOlwiMTIzNC1KV1QtVE9LRU4tNjc4OVwifSI.0IYBNElkoq8ZCs-llEKgcNcs5e1x6bT8QPYUPDPzUfU'
      const result = target.encodeJwtToken(payload)
      expect(result).toBe(encode)
    })
    test('encodeJwtToken() パラメータチェック payload=(空)', () => {
      process.env.BCA_JWT_HMAC_KEY = 'pajamas-crouch-repackage'
      // const payload = '{"iss":"jwtToken.js","sub":"1234-JWT-TOKEN-6789"}'
      const payload = ''
      const encode = null
      const result = target.encodeJwtToken(payload)
      expect(result).toBe(encode)
    })
    test('encodeJwtToken() パラメータチェック payload=null', () => {
      process.env.BCA_JWT_HMAC_KEY = 'pajamas-crouch-repackage'
      // const payload = '{"iss":"jwtToken.js","sub":"1234-JWT-TOKEN-6789"}'
      const payload = null
      const encode = null
      const result = target.encodeJwtToken(payload)
      expect(result).toBe(encode)
    })
    test('encodeJwtToken() JSONパースエラー payload=(JSON形式異常)', () => {
      process.env.BCA_JWT_HMAC_KEY = 'pajamas-crouch-repackage'
      // const payload = '{"iss":"jwtToken.js","sub":"1234-JWT-TOKEN-6789"}'
      const payload = '{"iss":"jwtToken.js",sub":"1234-JWT-TOKEN-6789"}'
      const encode = null
      const result = target.encodeJwtToken(payload)
      expect(result).toBe(encode)
    })
    test('encodeJwtToken() 環境変数チェック BCA_JWT_HMAC_KEY=(空)', () => {
      // process.env.BCA_JWT_HMAC_KEY = 'pajamas-crouch-repackage'
      process.env.BCA_JWT_HMAC_KEY = ''
      const payload = '{"iss":"jwtToken.js","sub":"1234-JWT-TOKEN-6789"}'
      const encode = null
      const result = target.encodeJwtToken(payload)
      expect(result).toBe(encode)
    })
    test('encodeJwtToken() 暗号化文字列->復号化', () => {
      process.env.BCA_JWT_HMAC_KEY = 'pajamas-crouch-repackage'
      const payload = '{"iss":"jwtToken.js","sub":"1234-JWT-TOKEN-6789"}'
      const encode =
        'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.IntcImlzc1wiOlwiand0VG9rZW4uanNcIixcInN1YlwiOlwiMTIzNC1KV1QtVE9LRU4tNjc4OVwifSI.0IYBNElkoq8ZCs-llEKgcNcs5e1x6bT8QPYUPDPzUfU'
      // 暗号化
      expect(target.encodeJwtToken(payload)).toBe(encode)
      // 復号化
      expect(target.decodeJwtToken(encode)).toBe(payload)
    })
  })

  /**
   * decodeJwtToken() のテスト
   */
  describe('decodeJwtToken() のテスト', () => {
    test('decodeJwtToken() ノーマル', () => {
      process.env.BCA_JWT_HMAC_KEY = 'pajamas-crouch-repackage'
      const token =
        'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.IntcImlzc1wiOlwiand0VG9rZW4uanNcIixcInN1YlwiOlwiMTIzNC1KV1QtVE9LRU4tNjc4OVwifSI.0IYBNElkoq8ZCs-llEKgcNcs5e1x6bT8QPYUPDPzUfU'
      const payload = '{"iss":"jwtToken.js","sub":"1234-JWT-TOKEN-6789"}'
      const result = target.decodeJwtToken(token)
      expect(result).toBe(payload)
    })
    test('decodeJwtToken() パラメータチェック token=null', () => {
      process.env.BCA_JWT_HMAC_KEY = 'pajamas-crouch-repackage'
      // const token =
      //   'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.IntcImlzc1wiOlwiand0VG9rZW4uanNcIixcInN1YlwiOlwiMTIzNC1KV1QtVE9LRU4tNjc4OVwifSI.0IYBNElkoq8ZCs-llEKgcNcs5e1x6bT8QPYUPDPzUfU'
      const token = null
      const payload = null
      const result = target.decodeJwtToken(token)
      expect(result).toBe(payload)
    })
    test('decodeJwtToken() パラメータチェック token=(空)', () => {
      process.env.BCA_JWT_HMAC_KEY = 'pajamas-crouch-repackage'
      // const token =
      //   'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.IntcImlzc1wiOlwiand0VG9rZW4uanNcIixcInN1YlwiOlwiMTIzNC1KV1QtVE9LRU4tNjc4OVwifSI.0IYBNElkoq8ZCs-llEKgcNcs5e1x6bT8QPYUPDPzUfU'
      const token = ''
      const payload = null
      const result = target.decodeJwtToken(token)
      expect(result).toBe(payload)
    })
    test('decodeJwtToken() パラメータチェック token=壊れている', () => {
      process.env.BCA_JWT_HMAC_KEY = 'pajamas-crouch-repackage'
      // const token =
      //   'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.IntcImlzc1wiOlwiand0VG9rZW4uanNcIixcInN1YlwiOlwiMTIzNC1KV1QtVE9LRU4tNjc4OVwifSI.0IYBNElkoq8ZCs-llEKgcNcs5e1x6bT8QPYUPDPzUfU'
      const token =
        '壊れているeyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.IntcImlzc1wiOlwiand0VG9rZW4uanNcIixcInN1YlwiOlwiMTIzNC1KV1QtVE9LRU4tNjc4OVwifSI.0IYBNElkoq8ZCs-llEKgcNcs5e1x6bT8QPYUPDPzUfU'
      const payload = null
      const result = target.decodeJwtToken(token)
      expect(result).toBe(payload)
    })
    test('decodeJwtToken() 環境変数チェック BCA_JWT_HMAC_KEY=(空)', () => {
      // process.env.BCA_JWT_HMAC_KEY = 'pajamas-crouch-repackage'
      process.env.BCA_JWT_HMAC_KEY = ''
      const token =
        'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.IntcImlzc1wiOlwiand0VG9rZW4uanNcIixcInN1YlwiOlwiMTIzNC1KV1QtVE9LRU4tNjc4OVwifSI.0IYBNElkoq8ZCs-llEKgcNcs5e1x6bT8QPYUPDPzUfU'
      const payload = null
      const result = target.decodeJwtToken(token)
      expect(result).toBe(payload)
    })
    test('decodeJwtToken() シークレットキー誤り BCA_JWT_HMAC_KEY=(暗号化時と相違するシークレットキー)', () => {
      // process.env.BCA_JWT_HMAC_KEY = 'pajamas-crouch-repackage'
      process.env.BCA_JWT_HMAC_KEY = 'hoge'
      const token =
        'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.IntcImlzc1wiOlwiand0VG9rZW4uanNcIixcInN1YlwiOlwiMTIzNC1KV1QtVE9LRU4tNjc4OVwifSI.0IYBNElkoq8ZCs-llEKgcNcs5e1x6bT8QPYUPDPzUfU'
      const payload = null
      const result = target.decodeJwtToken(token)
      expect(result).toBe(payload)
    })
  })
})
