'use strict'

const { Message } = require('../../models')

/**
 * Messages テーブルから全てのメッセージ定義を読み込む
 */
const load = async () => {
  const messages = {}
  for (let entry of await Message.findAll()) {
    messages[entry.code] = entry.message
  }
  return messages
}

module.exports = load()
