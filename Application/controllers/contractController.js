const Contract = require('../models').Contract
const logger = require('../lib/logger')
const db = require('../models')
const Op = db.Sequelize.Op
const constantsDefine = require('../constants')
const contractStatuses = constantsDefine.statusConstants.contractStatuses
const serviceTypes = constantsDefine.statusConstants.serviceTypes

module.exports = {
  /**
   * 契約情報の全件取得
   * @param {uuid} tenantId テナントID
   * @param {string} order ソート順
   * @returns {Contract} 契約情報（正常）、Error（DBエラー、システムエラーなど）
   */
  findContractsBytenantId: async (tenantId, order) => {
    try {
      const contracts = await Contract.findAll({
        raw: true,
        where: { tenantId: tenantId },
        order
      })

      return contracts
    } catch (error) {
      logger.error({ user: tenantId, stack: error.stack, status: 0 }, error.name)
      return null
    }
  },
  /**
   * 契約情報の1件取得（serviceType: '010'）
   * @param {uuid} tenantId テナントID
   * @returns {Contract} 契約情報（正常）、Error（DBエラー、システムエラーなど）
   */
  findOne: async (tenantId) => {
    try {
      const contract = await Contract.findOne({
        where: {
          tenantId: tenantId,
          serviceType: '010',
          deleteFlag: false
        }
      })

      return contract
    } catch (error) {
      // status 0はDBエラー
      logger.error({ user: tenantId, stack: error.stack, status: 0 }, error.name)
      return error
    }
  },
  /**
   * 契約情報の1件取得（検索条件）
   * @param {string} _where 検索条件
   * @param {string} _orders ソート順
   * @returns {Contract} 契約情報（正常）、Error（DBエラー、システムエラーなど）
   */
  findContract: async (_where, _orders) => {
    try {
      const contract = await Contract.findOne(
        {
          where: _where
        },
        {
          order: _orders
        }
      )
      return contract
    } catch (error) {
      logger.error({ SQL: `SELECT * FROM WHERE ${_where} ORDER BY ${_orders} / Error : ${error}` })
      return error
    }
  },
  /**
   * 契約情報の全件取得（検索条件）
   * @param {string} _where 検索条件
   * @param {string} _orders ソート順
   * @returns {Contract} 契約情報（正常）、Error（DBエラー、システムエラーなど）
   */
  findContracts: async (where, order) => {
    try {
      const contract = await Contract.findAll({
        raw: true,
        where: where,
        order
      })

      return contract
    } catch (error) {
      // status 0はDBエラー
      logger.error({ where: where, stack: error.stack, status: 0 }, error.name)
      return error
    }
  },
  /**
   * 契約情報の更新
   * @param {string} _contractId デジトレの利用の契約者の識別番号
   * @param {string} _orderType 契約ステータス
   * @returns {Contract} 契約情報（正常）、Error（DBエラー、システムエラーなど）
   */
  updateStatus: async (_contractId, _orderType) => {
    try {
      const contract = await Contract.update(
        {
          contractStatus: _orderType
        },
        {
          where: {
            contractId: _contractId
          }
        }
      )
      return contract
    } catch (error) {
      logger.error({ user: _contractId, stack: error.stack, status: 0 }, error.name)
      return error
    }
  },
  /**
   * スタンダードプランの契約情報取得（contractStatus: '00'、'12'）
   * @param {uuid}  tenantId テナントID
   * @returns {Contract} 契約情報（正常）、Error（DBエラー、システムエラーなど）
   */
  findLightPlan: async (tenantId) => {
    try {
      const contract = await Contract.findOne({
        where: {
          tenantId: tenantId,
          contractStatus: {
            [Op.or]: [contractStatuses.onContract, contractStatuses.newContractBeforeCompletion]
          },
          serviceType: serviceTypes.lightPlan,
          deleteFlag: false
        }
      })
      return contract
    } catch (error) {
      // status 0はDBエラー
      logger.error({ user: tenantId, stack: error.stack, status: 0 }, error.name)
      return error
    }
  },
  /**
   * 導入支援サービスの契約情報取得（contractStatus: '00'）
   * @param {uuid}  tenantId テナントID
   * @returns {Contract} 契約情報（正常）、Error（DBエラー、システムエラーなど）
   */
  findIntroductionSupportPlan: async (tenantId) => {
    try {
      const contract = await Contract.findOne({
        where: {
          tenantId: tenantId,
          contractStatus: {
            [Op.or]: [contractStatuses.onContract]
          },
          serviceType: serviceTypes.introductionSupport,
          deleteFlag: false
        }
      })
      return contract
    } catch (error) {
      // status 0はDBエラー
      logger.error({ user: tenantId, stack: error.stack, status: 0 }, error.name)
      return error
    }
  },
  /**
   * スタンダードプランの契約情報取得（contractStatus: '10'、'11'）
   * @param {uuid}  tenantId テナントID
   * @returns {Contract} 契約情報（正常）、Error（DBエラー、システムエラーなど）
   */
  findLightPlanForEntry: async (tenantId) => {
    try {
      const contract = await Contract.findOne({
        where: {
          tenantId: tenantId,
          contractStatus: {
            [Op.or]: [contractStatuses.newContractOrder, contractStatuses.newContractReceive]
          },
          serviceType: serviceTypes.lightPlan,
          deleteFlag: false
        }
      })
      return contract
    } catch (error) {
      // status 0はDBエラー
      logger.error({ user: tenantId, stack: error.stack, status: 0 }, error.name)
      return error
    }
  },
  /**
   * 導入支援サービスの契約情報取得（contractStatus: '10'、'11'、'12'）
   * @param {uuid}  tenantId テナントID
   * @returns {Contract} 契約情報（正常）、Error（DBエラー、システムエラーなど）
   */
  findIntroductionSupportPlanForEntry: async (tenantId) => {
    try {
      const contract = await Contract.findOne({
        where: {
          tenantId: tenantId,
          contractStatus: {
            [Op.or]: [
              contractStatuses.newContractOrder,
              contractStatuses.newContractReceive,
              contractStatuses.newContractBeforeCompletion
            ]
          },
          serviceType: serviceTypes.introductionSupport,
          deleteFlag: false
        }
      })
      return contract
    } catch (error) {
      // status 0はDBエラー
      logger.error({ user: tenantId, stack: error.stack, status: 0 }, error.name)
      return error
    }
  }
}
