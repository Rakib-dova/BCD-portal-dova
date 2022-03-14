'use strict'

class memberSiteCoopSessionDto {
  constructor() {
    /* デジタルトレード利用者情報 */
    /**  デジタルトレードトークン */
    this.digitaltradeToken = null
    /**  デジタルトレードID */
    this.digitaltradeId = null

    /* 利用状況判定情報 */
    /** 会員サイト連携FLG */
    this.memberSiteFlg = false
    /** アプリ有効化済FLG */
    this.bcdAppValidFlg = false

    /* デジタルトレードアプリ動作制御 */
    /** トレードシフトリダイレクト実施FLG */
    this.tradeshiftRedirectExecutionFlg = false
    /** fingerprint検証済FLG */
    // デフォルト値は検証済とする。
    this.fingerprintVerifyFlg = true

    /* トレードシフトID情報 */
    this.tradeshiftUserId = null
    this.tradeshiftTenantId = null
  }
}

module.exports = memberSiteCoopSessionDto
