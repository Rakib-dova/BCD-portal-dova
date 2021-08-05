'use strict'

const express = require('express')
const router = express.Router()
const helper = require('./helpers/middleware')

const errorHelper = require('./helpers/error')
const noticeHelper = require('./helpers/notice')
const userController = require('../controllers/userController.js')
const contractController = require('../controllers/contractController.js')
const changeOrderController = require('../controllers/changeOrderController.js')
const logger = require('../lib/logger')
const contractBasicInfoTemplate = require('../orderTemplate/contractInformationchangeOrder_contractBasicInfo.json')
const contractAccountInfoTemplate = require('../orderTemplate/contractInformationchangeOrder_contractAccountInfo.json')
const constantsDefine = require('../constants')

const cbGetChangeIndex = async (req, res, next) => {
  logger.info(constantsDefine.logMessage.INF000 + 'cbGetChangeIndex')

  // 認証情報取得処理
  if (!req.session || !req.user?.userId) {
    return next(errorHelper.create(500))
  }

  // DBからuserデータ取得
  const user = await userController.findOne(req.user.userId)
  // データベースエラーは、エラーオブジェクトが返る
  // user未登録の場合もエラーを上げる
  if (user instanceof Error || user === null) return next(errorHelper.create(500))

  // TX依頼後に改修、ユーザステイタスが0以外の場合、「404」エラーとする not 403
  if (user.dataValues?.userStatus !== 0) return next(errorHelper.create(404))
  if (req.session?.userContext !== 'LoggedIn') {
    return next(errorHelper.create(400))
  }

  // DBから契約情報取得
  const contract = await contractController.findOne(req.user.tenantId)
  // データベースエラーは、エラーオブジェクトが返る
  // 契約情報未登録の場合もエラーを上げる
  if (contract instanceof Error || contract === null) return next(errorHelper.create(500))

  // ユーザ権限を取得
  req.session.userRole = user.dataValues?.userRole

  if (
    (contract.dataValues.contractStatus === constantsDefine.statusConstants.contractStatusCancellationOrder ||
      contract.dataValues.contractStatus === constantsDefine.statusConstants.contractStatusCancellationReceive) &&
    !contract.dataValues.deleteFlag
  ) {
    return next(noticeHelper.create('cancelprocedure'))
  } else if (
    (contract.dataValues.contractStatus === constantsDefine.statusConstants.contractStatusNewContractOrder ||
      contract.dataValues.contractStatus === constantsDefine.statusConstants.contractStatusNewContractReceive) &&
    !contract.dataValues.deleteFlag
  ) {
    return next(noticeHelper.create('registerprocedure'))
  } else if (
    (contract.dataValues.contractStatus === constantsDefine.statusConstants.contractStatusChangeContractOrder ||
      contract.dataValues.contractStatus === constantsDefine.statusConstants.contractStatusChangeContractReceive) &&
    !contract.dataValues.deleteFlag
  ) {
    return next(noticeHelper.create('changeprocedure'))
  } else if (user.dataValues?.userRole !== 'a6a3edcd-00d9-427c-bf03-4ef0112ba16d' && !contract.dataValues.deleteFlag) {
    return next(noticeHelper.create('generaluser'))
  }

  // ユーザ権限も画面に送る
  res.render('change', {
    tenantId: req.user.tenantId,
    userRole: req.session.userRole,
    numberN: contract.dataValues?.numberN,
    TS_HOST: process.env.TS_HOST
  })
  logger.info(constantsDefine.logMessage.INF001 + 'cbGetChangeIndex')
}

const cbPostChangeIndex = async (req, res, next) => {
  logger.info(constantsDefine.logMessage.INF000 + 'cbPostChangeIndex')

  const contractInformationchangeOrderContractBasicInfo = JSON.parse(JSON.stringify(contractBasicInfoTemplate))
  const contractInformationchangeOrderContractAccountInfo = JSON.parse(JSON.stringify(contractAccountInfoTemplate))

  let contractInformationchangeOrder

  // contractorNameデータ設定
  const makeContractorNameJson = (contractorName, contractorKanaName) => {
    // contractBasicInfo 設定
    contractInformationchangeOrderContractBasicInfo.contractBasicInfo.contractChangeName =
      constantsDefine.statusConstants.contractChange

    // contractAccountInfo 設定
    contractInformationchangeOrderContractAccountInfo.contractAccountInfo.contractorName = contractorName
    contractInformationchangeOrderContractAccountInfo.contractAccountInfo.contractorKanaName = contractorKanaName
  }

  // ContractAddressデータ設定
  const makeContractAddressJson = (postalNumber, contractAddressVal, banch1, tatemono1) => {
    // contractBasicInfo 設定
    contractInformationchangeOrderContractBasicInfo.contractBasicInfo.contractChangeAddress =
      constantsDefine.statusConstants.contractChange

    // contractAccountInfo 設定
    contractInformationchangeOrderContractAccountInfo.contractAccountInfo.postalNumber = postalNumber
    contractInformationchangeOrderContractAccountInfo.contractAccountInfo.contractAddress = contractAddressVal
    contractInformationchangeOrderContractAccountInfo.contractAccountInfo.banch1 = banch1
    contractInformationchangeOrderContractAccountInfo.contractAccountInfo.tatemono1 = tatemono1
  }

  const userTenantId = req.user.tenantId
  const userId = req.user.userId

  // DBから契約情報取得
  const contract = await contractController.findOne(userTenantId)
  // データベースエラーは、エラーオブジェクトが返る
  // 契約情報未登録の場合もエラーを上げる
  if (contract instanceof Error || contract === null) return next(errorHelper.create(500))

  const user = await userController.findOne(userId)
  // データベースエラーは、エラーオブジェクトが返る
  // ユーザ未登録の場合もエラーを上げる
  if (user instanceof Error || user === null) return next(errorHelper.create(500))

  if (user.dataValues.userRole !== 'a6a3edcd-00d9-427c-bf03-4ef0112ba16d') {
    return next(errorHelper.create(403))
  }

  // 修正内容をDBに反映
  // contractBasicInfo 基本情報設定
  contractInformationchangeOrderContractBasicInfo.contractBasicInfo.tradeshiftId = userTenantId
  contractInformationchangeOrderContractBasicInfo.contractBasicInfo.orderType =
    constantsDefine.statusConstants.orderTypeChangeOrder
  contractInformationchangeOrderContractBasicInfo.contractBasicInfo.contractNumber = contract.dataValues?.numberN

  // 「契約者名変更」、「契約者住所変更」、「契約者名変更、契約者住所変更」がチェックされている場合
  if (req.body.chkContractorName === 'on' && req.body.chkContractAddress === undefined) {
    makeContractorNameJson(req.body.contractorName, req.body.contractorKanaName)
  } else if (req.body.chkContractAddress === 'on' && req.body.chkContractorName === undefined) {
    makeContractAddressJson(req.body.postalNumber, req.body.contractAddressVal, req.body.banch1, req.body.tatemono1)
  } else if (req.body.chkContractorName === 'on' && req.body.chkContractAddress === 'on') {
    makeContractorNameJson(req.body.contractorName, req.body.contractorKanaName)
    makeContractAddressJson(req.body.postalNumber, req.body.contractAddressVal, req.body.banch1, req.body.tatemono1)
  }

  if (req.body.chkContractorName === 'on' || req.body.chkContractAddress === 'on') {
    contractInformationchangeOrder = Object.assign(
      JSON.parse(JSON.stringify(contractInformationchangeOrderContractBasicInfo)),
      JSON.parse(JSON.stringify(contractInformationchangeOrderContractAccountInfo))
    )
  }

  // 契約者情報変更の受付を行う
  const changeOrder = await changeOrderController.create(req.user.tenantId, contractInformationchangeOrder)

  if (changeOrder instanceof Error || changeOrder === null) return next(errorHelper.create(500))

  logger.info(constantsDefine.logMessage.INF001 + 'cbPostChangeIndex')
  req.flash('info', '契約者情報変更を受け付けました。')
  return res.redirect('/portal')
}

router.get('/', helper.isAuthenticated, helper.isTenantRegistered, helper.isUserRegistered, cbGetChangeIndex)
router.post('/', helper.isAuthenticated, helper.isTenantRegistered, helper.isUserRegistered, cbPostChangeIndex)

module.exports = {
  router: router,
  cbGetChangeIndex: cbGetChangeIndex,
  cbPostChangeIndex: cbPostChangeIndex
}
