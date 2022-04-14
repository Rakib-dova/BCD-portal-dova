'use strict'
const mapping = require('./mapping')
const { User, Tenant, Format, Item } = require('../../models')
const { currentTenantId } = require('./util')

const defaultFormat = {
  id: 0,
  name: 'デフォルト',
  Items: []
}

const selector = (format) => {
  return format ? (item) => format.Items.some((it) => it.key == item.key) : (item) => item.selected
}

/**
 * 現在のログインアカウントに登録されたフォーマットを返す
 */
const list = async (req, eager) => {
  const option = {
    where: {
      userUuid: currentTenantId(req)
    },
    order: [['id']]
  }
  if (eager) {
    option['include'] = Item
  }
  const formats = await Format.findAll(option)
  return [defaultFormat, ...formats]
}

/**
 * 指定されたidのフォーマットを返す
 */
const get = async (req, id) => {
  if (id == defaultFormat.id) {
    return defaultFormat
  }
  return await Format.findByPk(id, { include: Item })
}

/**
 * オプションの請求書項目を返す
 */
const items = (format) => {
  const selected = selector(format)
  return mapping
    .filter((item) => item.label)
    .map((item) => {
      return {
        key: item.key,
        name: item.label,
        selected: selected(item)
      }
    })
}

/**
 * 指定されたフォーマットを削除する
 */
const destroy = async (req, id) => {
  await Item.destroy({ where: { formatId: id } })
  return await Format.destroy({ where: { id: id } })
}

/**
 * フォーマットを保存する
 */
const save = async (req, values) => {
  const format =
    (await Format.findByPk(values.id)) ??
    Format.build({
      createdUser: values.user
    })
  format.userUuid = currentTenantId(req)
  format.name = values.name
  format.updatedUser = values.user
  format.updatedAt = new Date()
  format.changed('updatedAt', true)
  await format.save()

  await Item.destroy({
    where: {
      formatId: format.id
    }
  })
  await Promise.all(
    values.items.map(async (key) => {
      return Item.create({
        formatId: format.id,
        key: key
      })
    })
  )

  return format.id
}

/**
 * プレビュー用宛先を取得する
 */
const recipient = async (req) => {
  const user = await User.findByPk(currentTenantId(req))
  return user?.previewRecipientUuid
}

/**
 * プレビュー用宛先を保存する
 */
const saveRecipient = async (req, recipient) => {
  await User.update(
    {
      previewRecipientUuid: recipient
    },
    {
      where: { uuid: currentTenantId(req) }
    }
  )
}

/**
 * 宛先別フォーマット割り当てを取得する
 */
const assignMap = async (req) => {
  const tenants = await Tenant.findAll({
    where: {
      userUuid: currentTenantId(req)
    }
  })

  let map = {}
  tenants.forEach((tenant) => (map[tenant.tenantUuid] = tenant.formatId))
  return map
}

/**
 * 宛先別フォーマット割り当てを保存する
 */
const assign = async (req, map) => {
  await Tenant.destroy({
    where: {
      userUuid: currentTenantId(req)
    }
  })
  const userUuid = currentTenantId(req)
  await Promise.all(
    Object.entries(map).map(async ([tenantUuid, formatId]) => {
      return Tenant.create({
        userUuid: userUuid,
        tenantUuid: tenantUuid,
        formatId: formatId
      })
    })
  )
}

module.exports = {
  list,
  get,
  items,
  destroy,
  save,
  recipient,
  saveRecipient,
  assignMap,
  assign
}
