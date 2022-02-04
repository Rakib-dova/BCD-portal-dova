'use strict'

const { Message } = require('../../models')

const messages = {}

/**
 * Messages テーブルから全てのメッセージ定義を読み込み messages オブジェクトに格納する
 */
const load = async () => {
  for (let entry of await Message.findAll()) {
    messages[entry.code] = entry.message
  }
}

load()

module.exports = messages
