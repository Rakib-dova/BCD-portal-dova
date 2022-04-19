'use strict'

const fs = require('fs')
const path = require('path')
const Sequelize = require('sequelize')
const basename = path.basename(__filename)
// const env = process.env.NODE_ENV || 'development';
// const config = require(__dirname + '/../config/config.json')[env];
const db = {}

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
    max: 20, // R40419 仕訳情報に貸方追加され保存データ容量にが増加の対応で40個増量する / 仕訳情報の最大件数（2000件）の保存の時、poolが足りないのため、基本5個から変更
    acquire: 540000, // プールが失敗したらトライまで有効名時間、プールが一度失敗して、トライまでこの時間を起こしたらエラーが発生。
    idle: 600000 // プールの待ち時間の期限、待っているプールがこの時間を起こしたらエラーが発生。
  }
})
/*
if (config.use_env_variable) {
  sequelize = new Sequelize(process.env[config.use_env_variable], config);
} else {
  sequelize = new Sequelize(config.database, config.username, config.password, config);
}
*/
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
