const ChannelDepartment = require('../models').ChannelDepartment
const logger = require('../lib/logger')

/**
 * すべてチャネル組織情報の取得
 * @returns チャネル組織情報リスト
 */
const findAll = async () => {
  try {
    const channelDepartments = await ChannelDepartment.findAll({
      raw: true,
      order: [['code', 'ASC']]
    })

    return channelDepartments
  } catch (error) {
    logger.error({ stack: error.stack, status: 0 }, error.name)
    return error
  }
}

/**
 * チャネル組織コードでチャネル組織情報の取得
 * @param {string} code チャネル組織コード
 * @returns チャネル組織情報
 */
const findOne = async (code) => {
  try {
    const channelDepartment = await ChannelDepartment.findOne({
      where: {
        code: code
      }
    })

    return channelDepartment
  } catch (error) {
    // status 0はDBエラー
    logger.error({ code: code, stack: error.stack, status: 0 }, error.name)
    return error
  }
}

module.exports = {
  findAll: findAll,
  findOne: findOne
}
