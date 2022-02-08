/**
 * 会員サイト機能コントローラーDAO
 *
 * @author tommorisawa
 */
'use strict'

// const db = require('../models')
// サービス連携ID管理テーブル
const serviceLinkageModel = require('../models').ServiceLinkageIdManagement

// デジタルトレードトークンテーブル
const digitaltradeTokenModel = require('../models').DigitaltradeToken

// 認証履歴テーブル
const authHistoryModel = require('../models').AuthenticationHistory

const logger = require('../../lib/logger')
const db = require('../models')
const { Op } = require('sequelize')

const logMessageDefine = require('../../constants').logMessage

module.exports = {
  /**
   * デジタルトレードトークン取得処理
   * デジタルトレードトークンにより、デジタルトレードトークン情報を取得する。
   *
   * @param {string} digitaltradeToken degitalTradeToken
   * @returns {object} デジタルトレードトークン情報
   */
  getDigitaltradeTokenBydtToken: async (dtToken) => {
    logger.info(logMessageDefine.INF000 + 'getDigitaltradeTokenBydtToken')

    try {
      // システム日付を取得
      const nowDate = new Date()
      logger.debug({ dtToken: dtToken, nowDate: nowDate }, 'getDigitaltradeTokenBydtToken')

      // DBよりデジトレートークン取得
      const digitaltradeTokenInfo = await digitaltradeTokenModel.findOne({
        where: {
          dtToken: dtToken,
          tokenCategory: 'TRS',
          expireDate: { [Op.gt]: nowDate },
          tokenflg: false
        }
      })
      logger.info(logMessageDefine.INF001 + 'getDigitaltradeTokenBydtToken')
      return digitaltradeTokenInfo
    } catch (error) {
      // エラー内容をログ出力
      logger.error({ error: error.message }, 'ERR-MB999 getDigitaltradeTokenBydtToken:runtime Error')
      return error
    }
  },

  /**
   * fingerprintを取得するため、デジタルトレードIDをKEYにデジタルトレードトークンを取得
   *
   * @param {*} digitaltradeId
   * @returns
   */
  getFingerprintBydigitaltradeId: async (digitaltradeId, digitaltradeToken) => {
    // TODO:イベントコードを定義
    logger.info(logMessageDefine.INF000 + 'getFingerprintBydigitaltradeId')

    try {
      logger.debug({ digitaltradeId: digitaltradeId }, 'getFingerprintBydigitaltradeId')

      // DBよりデジトレートークン取得
      const digitaltradeTokenInfo = await digitaltradeTokenModel.findOne({
        where: {
          dtToken: digitaltradeToken,
          digitaltradeId: digitaltradeId,
          tokenCategory: 'TRS',
          tokenflg: true
        }
      })
      // TODO:イベントコードを定義
      logger.info(logMessageDefine.INF001 + 'getFingerprintBydigitaltradeId')
      return digitaltradeTokenInfo
    } catch (error) {
      // エラー内容をログ出力
      // TODO:イベントコードを定義
      logger.error({ error: error.message }, 'ERR-MB999 getFingerprintBydigitaltradeId:runtime Error')
      return error
    }
  },

  /**
   * デジタルトレードトークン TokenFlg更新
   * デジタルトレードトークンをトークン受領済みに更新する。
   *
   * @param {string} digitaltradeToken degitalTradeToken
   * @returns {object} デジタルトレードトークン
   */
  updateDtTokenFlg: async (dtToken) => {
    // TODO:イベントコードを定義
    logger.info(logMessageDefine.INF000 + 'updateDtTokenFlg')

    try {
      logger.debug({ dtToken: dtToken }, 'updateDtTokenFlg')
      const updated = await db.sequelize.transaction(async (t) => {
        return await digitaltradeTokenModel.update(
          { tokenFlg: true },
          {
            where: {
              dtToken: dtToken,
              tokenCategory: 'TRS',
              tokenFlg: false
            }
          },
          { transaction: t }
        )
      })
      // TODO:イベントコードを定義
      logger.info(logMessageDefine.INF001 + 'updateDtTokenFlg')
      return updated
    } catch (error) {
      // エラー内容をログ出力
      // TODO:イベントコードを定義
      logger.error({ error: error.message }, 'ERR-MB999 updateDtTokenFlg:runtime Error')
      return error
    }
  },

  /**
   * ID紐づけ情報取得
   * @param {*} digitaltradeId
   * @returns
   */
  getServiceLinkageIdBydigitaltradeId: async (digitaltradeId) => {
    // TODO:イベントコードを定義
    logger.info(logMessageDefine.INF000 + 'getServiceLinkageIdBydigitaltradeId')
    try {
      logger.debug({ digitaltradeId: digitaltradeId }, 'getServiceLinkageIdBydigitaltradeId')

      // DBよりデジトレートークン取得
      const serviceLinkageInfo = await serviceLinkageModel.findOne({
        where: {
          digitaltradeId: digitaltradeId,
          serviceCategory: 'TRS',
          deleteFlag: false
        }
      })
      // TODO:イベントコードを定義
      logger.info(logMessageDefine.INF001 + 'getServiceLinkageIdBydigitaltradeId')
      return serviceLinkageInfo
    } catch (error) {
      // エラー内容をログ出力
      logger.error({ error: error.message }, 'ERR-MB999 getServiceLinkageIdBydigitaltradeId:runtime Error')
      return error
    }
  },

  /**
   * ID紐づけ情報更新
   * @param {*} mSiteSessionDto
   * @returns
   */
  updateServiceLinkageId: async (mSiteSessionDto) => {
    // TODO:イベントコードを定義
    logger.info(logMessageDefine.INF000 + 'updateServiceLinkageId')
    logger.debug({ mSiteSessionDto: mSiteSessionDto }, 'updateServiceLinkageId')
    try {
      // JSON部作成
      const userInfoValue = {
        digitaltradeId: mSiteSessionDto.digitaltradeId,
        tradeshiftUserId: mSiteSessionDto.tradeshiftUserId,
        tradeshiftTenantId: mSiteSessionDto.tradeshiftTenantId
      }
      // Transaction発行
      const updated = await db.sequelize.transaction(async (t) => {
        // サービス連携ID更新
        await serviceLinkageModel.update(
          {
            serviceUserId: mSiteSessionDto.tradeshiftUserId,
            serviceSubId: mSiteSessionDto.tradeshiftTenantId,
            serviceUserInfo: JSON.stringify(userInfoValue)
          },
          {
            where: {
              digitaltradeId: mSiteSessionDto.digitaltradeId,
              serviceCategory: 'TRS'
            }
          },
          { transaction: t }
        )

        // 認証履歴登録
        await authHistoryModel.create(
          {
            digitaltradeId: mSiteSessionDto.digitaltradeId,
            authenticationLinkageId: null,
            authenticationLoginId: null,
            authenticationServiceCategory: null,
            serviceLinkageId: mSiteSessionDto.tradeshiftUserId,
            serviceLinkageSubId: mSiteSessionDto.tradeshiftTenantId,
            serviceLinkageCategory: 'TRS',
            historyCategory: 'IDLINK'
          },
          { transaction: t }
        )
      })
      // TODO:イベントコードを定義
      logger.info(logMessageDefine.INF001 + 'updateServiceLinkageId')
      return updated
    } catch (error) {
      // エラー内容をログ出力
      logger.error({ error: error.message }, 'ERR-MB999 updateServiceLinkageId:runtime Error')
      return error
    }
  },

  /**
   *
   * @param {*} mSiteSessionDto
   * @returns
   */
  createServiceLinkageId: async (mSiteSessionDto) => {
    // TODO:イベントコードを定義
    logger.info(logMessageDefine.INF000 + 'createServiceLinkageId')

    try {
      logger.debug({ mSiteSessionDto: mSiteSessionDto }, 'createServiceLinkageId')
      const userInfoValue = {
        digitaltradeId: mSiteSessionDto.digitaltradeId,
        tradeshiftUserId: mSiteSessionDto.tradeshiftUserId,
        tradeshiftTenantId: mSiteSessionDto.tradeshiftTenantId
      }
      const created = await db.sequelize.transaction(async (t) => {
        // サービス連携ID情報登録
        await serviceLinkageModel.create(
          {
            digitaltradeId: mSiteSessionDto.digitaltradeId,
            serviceCategory: 'TRS',
            serviceUserId: mSiteSessionDto.tradeshiftUserId,
            serviceSubId: mSiteSessionDto.tradeshiftTenantId,
            serviceUserInfo: JSON.stringify(userInfoValue),
            deleteFlag: false
          },
          { transaction: t }
        )

        // 認証履歴登録
        await authHistoryModel.create(
          {
            digitaltradeId: mSiteSessionDto.digitaltradeId,
            authenticationLinkageId: null,
            authenticationLoginId: null,
            authenticationServiceCategory: null,
            serviceLinkageId: mSiteSessionDto.tradeshiftUserId,
            serviceLinkageSubId: mSiteSessionDto.tradeshiftTenantId,
            serviceLinkageCategory: 'TRS',
            historyCategory: 'IDLINK'
          },
          { transaction: t }
        )
      })
      // TODO:イベントコードを定義
      logger.info(logMessageDefine.INF001 + 'createServiceLinkageId')
      return created
    } catch (error) {
      // エラー内容をログ出力
      // TODO:イベントコードを定義
      logger.error({ error: error.message }, 'ERR-MB999 createServiceLinkageId:runtime Error')
      return error
    }
  },

  /**
   *
   * @param {*} mSiteSessionDto
   * @returns
   */
  deleteDigitaltradeToken: async (mSiteSessionDto) => {
    // TODO:イベントコードを定義
    logger.info(logMessageDefine.INF000 + 'deleteDigitaltradeToken')

    try {
      logger.debug({ mSiteSessionDto: mSiteSessionDto }, 'deleteDigitaltradeToken')
      const deleted = await db.sequelize.transaction(async (t) => {
        // デジトレトークン削除
        await digitaltradeTokenModel.destroy(
          {
            where: {
              dtToken: mSiteSessionDto.digitaltradeToken,
              digitaltradeId: mSiteSessionDto.digitaltradeId,
              tokenCategory: 'TRS'
            }
          },
          { transaction: t }
        )
      })
      // TODO:イベントコードを定義
      logger.info(logMessageDefine.INF001 + 'deleteDigitaltradeToken')
      return deleted
    } catch (error) {
      // TODO:イベントコードを定義
      logger.error({ error: error.message }, 'ERR-MB999 deleteDigitaltradeToken:runtime Error')
      return error
    }
  }
}
