'use strict'
const Parser = require('./parser')
const { condition } = require('./util')

/**
 * 得意先取得のパラメタ設定
 */
const searchBody = (option = {}) => {
  let filter = condition('AR2010001', 'ne', '0') // 得意先コード="0" (その他) を除外
  if (option.linkingOnly) {
    filter = {
      and: [
        filter,
        condition('AR2010113', 'ne', '') // メモ３ (紐付け先テナント) が空でない
      ]
    }
  }
  return {
    filter: filter,
    sort: [
      'AR2010001' // 得意先コード
    ],
    itemList: [
      'AR2010001', // 得意先コード
      'AR2010003', // 得意先名
      'AR2010007', // 得意先略称
      'AR2010014', // 最終更新日時
      'AR2010111', // メモ１
      'AR2010112', // メモ２
      'AR2010113', // メモ３
      'SD2010701' // 請求先コード
    ]
  }
}

/**
 * 得意先データを変換
 */
const convertFrom = (response) => {
  if (!response.map) {
    return []
  }
  return response.map((item) => {
    return {
      customerId: item.AR2010001, // 得意先コード
      billingId: item.AR2010001 === item.SD2010701 ? '' : item.SD2010701, // 請求先コード
      customerName: item.AR2010007, // 得意先略称
      companyId: item.AR2010113, // 紐付いた企業アカウントID
      lastUpdated: Parser.forDate([item.AR2010014]) // 最終更新日時
    }
  })
}

/**
 * 紐付け情報を登録用得意先データに変換
 */
const convertTo = (map) => {
  return {
    dataList: Object.entries(map).map(([customerId, tenantId]) => {
      return {
        AR2010001: customerId,
        AR2010113: tenantId
      }
    })
  }
}

module.exports = {
  searchBody,
  convertFrom,
  convertTo
}
