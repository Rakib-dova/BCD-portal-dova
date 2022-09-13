'use strict'

const fs = require('fs')
const path = require('path')
const Sequelize = require('sequelize')
const basename = path.basename(__filename)
const db = {}

// Sequelize設定
const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASS, {
  host: process.env.DB_HOST,
  dialect: 'mssql',
  logging: false,
  dialectOptions: {
    options: {
      validateBulkLoadParameters: true,
      encrypt: true
    }
  },
  pool: {
    max: 20 // R40419 仕訳情報に貸方追加され保存データ容量にが増加の対応で40個増量する / 仕訳情報の最大件数（2000件）の保存の時、poolが足りないのため、基本5個から変更
  }
})
fs.readdirSync(__dirname)
  .filter((file) => {
    return file.indexOf('.') !== 0 && file !== basename && file.slice(-3) === '.js'
  })
  .forEach((file) => {
    const model = require(path.join(__dirname, file))(sequelize, Sequelize.DataTypes)
    db[model.name] = model
  })

Object.keys(db).forEach((modelName) => {
  if (db[modelName].associate) {
    db[modelName].associate(db)
  }
})

db.sequelize = sequelize
db.Sequelize = Sequelize

module.exports = db
