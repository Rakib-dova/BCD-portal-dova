exports.config = (env) => {
  const { TS_HOST, TS_API_HOST, TS_CLIENT_ID, TS_CLIENT_SECRET } = JSON.parse(env.TS_CONNECTION.replace(/'/g, '"'))
  process.env.TS_HOST = TS_HOST
  process.env.TS_API_HOST = TS_API_HOST
  process.env.TS_CLIENT_ID = TS_CLIENT_ID
  process.env.TS_CLIENT_SECRET = TS_CLIENT_SECRET
  // process.env.TS_APP_VERSION
  // TS_APP_VERSIONはアプリのバージョンアップに従い変更頻度が高いためKey Vault管理しない

  const { DB_HOST, DB_NAME, DB_USER, DB_PASS } = JSON.parse(env.DB_CONNECTION.replace(/'/g, '"'))
  process.env.DB_HOST = DB_HOST
  process.env.DB_NAME = DB_NAME
  process.env.DB_USER = DB_USER
  process.env.DB_PASS = DB_PASS

  const { REDIS_HOST, REDIS_PORT, REDIS_PASS } = JSON.parse(env.REDIS_CONNECTION.replace(/'/g, '"'))
  process.env.REDIS_HOST = REDIS_HOST
  process.env.REDIS_PORT = REDIS_PORT
  process.env.REDIS_PASS = REDIS_PASS
  // process.env.REDIS_TTL
  // REDIS_TTLは変更の可能性があるためKey Vault管理しない

  const { TOKEN_ENC_PASS, TOKEN_ENC_SALT } = JSON.parse(env.TOKEN_ENC.replace(/'/g, '"'))
  process.env.TOKEN_ENC_PASS = TOKEN_ENC_PASS
  process.env.TOKEN_ENC_SALT = TOKEN_ENC_SALT

  const { INVOICE_UPLOAD_PATH } = JSON.parse(env.INVOICE_UPLOAD_PATH.replace(/'/g, '"'))
  process.env.INVOICE_UPLOAD_PATH = INVOICE_UPLOAD_PATH

  // 会員サイト連携開発により追加
  const {
    BCA_BC_COOKIE_NAME,
    BCA_BC_COOKIE_DOMAIN,
    BCA_BC_COOKIE_PATH,
    BCA_BC_COOKIE_HTTP_ONLY,
    BCA_BC_COOKIE_SAME_SITE,
    BCA_BC_COOKIE_SECURE
  } = JSON.parse(env.BCA_BC_COOKIE.replace(/'/g, '"'))
  process.env.BCA_BC_COOKIE_NAME = BCA_BC_COOKIE_NAME
  process.env.BCA_BC_COOKIE_DOMAIN = BCA_BC_COOKIE_DOMAIN
  process.env.BCA_BC_COOKIE_PATH = BCA_BC_COOKIE_PATH
  if (BCA_BC_COOKIE_HTTP_ONLY === 'true') {
    process.env.BCA_BC_COOKIE_HTTP_ONLY = true
  } else {
    process.env.BCA_BC_COOKIE_HTTP_ONLY = false
  }
  process.env.BCA_BC_COOKIE_SAME_SITE = BCA_BC_COOKIE_SAME_SITE
  if (BCA_BC_COOKIE_SECURE === 'true') {
    process.env.BCA_BC_COOKIE_SECURE = true
  } else {
    process.env.BCA_BC_COOKIE_SECURE = false
  }

  // メール設定情報
  const { MAIL_HOST, MAIL_PORT, MAIL_SECURE, MAIL_CIPHERS, MAIL_USER, MAIL_PASS } = JSON.parse(
    env.MAIL_CONNECTION.replace(/'/g, '"')
  )
  process.env.MAIL_HOST = MAIL_HOST
  process.env.MAIL_PORT = MAIL_PORT
  process.env.MAIL_SECURE = MAIL_SECURE
  process.env.MAIL_CIPHERS = MAIL_CIPHERS
  process.env.MAIL_USER = MAIL_USER
  process.env.MAIL_PASS = MAIL_PASS
}
