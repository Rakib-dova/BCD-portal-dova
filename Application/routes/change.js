'use strict'

const express = require('express')
const router = express.Router()
const helper = require('./helpers/middleware')
const validate = require('../lib/validate')

const errorHelper = require('./helpers/error')
const noticeHelper = require('./helpers/notice')
const userController = require('../controllers/userController.js')
const contractController = require('../controllers/contractController.js')
const changeOrderController = require('../controllers/changeOrderController.js')
const logger = require('../lib/logger')
const contractBasicInfoTemplate = require('../orderTemplate/contractInformationchangeOrder_contractBasicInfo.json')
const contractAccountInfoTemplate = require('../orderTemplate/contractInformationchangeOrder_contractAccountInfo.json')
const contractContactListTemplate = require('../orderTemplate/contractInformationchangeOrder_contactList.json')
const constantsDefine = require('../constants')

const csrf = require('csurf')
const csrfProtection = csrf({ cookie: false })

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
  const deleteFlag = contract.dataValues.deleteFlag
  const contractStatus = contract.dataValues.contractStatus
  const checkContractStatus = await helper.checkContractStatus(req.user.tenantId)

  if (checkContractStatus === null || checkContractStatus === 999) {
    return next(errorHelper.create(500))
  }

  if (!validate.isStatusForCancel(contractStatus, deleteFlag)) {
    return next(noticeHelper.create('cancelprocedure'))
  }

  if (!validate.isTenantManager(user.dataValues?.userRole, deleteFlag)) {
    return next(noticeHelper.create('generaluser'))
  }

  if (!validate.isStatusForRegister(contractStatus, deleteFlag)) {
    return next(noticeHelper.create('registerprocedure'))
  }

  if (!validate.isStatusForSimpleChange(contractStatus, deleteFlag)) {
    return next(noticeHelper.create('changeprocedure'))
  }

  // ユーザ権限も画面に送る
  res.render('change', {
    tenantId: req.user.tenantId,
    userRole: req.session.userRole,
    numberN: contract.dataValues?.numberN,
    TS_HOST: process.env.TS_HOST,
    csrfToken: req.csrfToken()
  })
  logger.info(constantsDefine.logMessage.INF001 + 'cbGetChangeIndex')
}

const cbPostChangeIndex = async (req, res, next) => {
  logger.info(constantsDefine.logMessage.INF000 + 'cbPostChangeIndex')

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

  const deleteFlag = contract.dataValues.deleteFlag
  const contractStatus = contract.dataValues.contractStatus
  const checkContractStatus = await helper.checkContractStatus(req.user.tenantId)

  if (checkContractStatus === null || checkContractStatus === 999) {
    return next(errorHelper.create(500))
  }

  if (!validate.isStatusForCancel(contractStatus, deleteFlag)) {
    return next(noticeHelper.create('cancelprocedure'))
  }

  if (!validate.isTenantManager(user.dataValues?.userRole, deleteFlag)) {
    return next(noticeHelper.create('generaluser'))
  }
  if (!validate.isStatusForRegister(contractStatus, deleteFlag)) {
    return next(noticeHelper.create('registerprocedure'))
  }

  if (!validate.isStatusForSimpleChange(contractStatus, deleteFlag)) {
    return next(noticeHelper.create('changeprocedure'))
  }

  const contractInformationchangeOrderContractBasicInfo = JSON.parse(JSON.stringify(contractBasicInfoTemplate))
  const contractInformationchangeOrderContractAccountInfo = JSON.parse(JSON.stringify(contractAccountInfoTemplate))
  const contractInformationchangeOrderContactList = JSON.parse(JSON.stringify(contractContactListTemplate))

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

  // ContractContactデータ設定
  const makeContractContactJson = (contactPersonName, contactPhoneNumber, contactMail) => {
    // contractBasicInfo 設定
    contractInformationchangeOrderContractBasicInfo.contractBasicInfo.contractChangeContact =
      constantsDefine.statusConstants.contractChange

    // contactList設定
    contractInformationchangeOrderContactList.contactList[0].contactPersonName = contactPersonName
    contractInformationchangeOrderContactList.contactList[0].contactPhoneNumber = contactPhoneNumber
    contractInformationchangeOrderContactList.contactList[0].contactMail = contactMail
  }

  if (
    req.body.chkContractorName === 'on' ||
    req.body.chkContractAddress === 'on' ||
    req.body.chkContractContact === 'on'
  ) {
    // 修正内容をDBに反映
    // contractBasicInfo 基本情報設定
    contractInformationchangeOrderContractBasicInfo.contractBasicInfo.tradeshiftId = userTenantId
    contractInformationchangeOrderContractBasicInfo.contractBasicInfo.orderType =
      constantsDefine.statusConstants.orderTypeSimpleChangeOrder
    contractInformationchangeOrderContractBasicInfo.contractBasicInfo.contractNumber = contract.dataValues?.numberN

    // 「契約者名変更」、「契約者住所変更」、「契約者連絡先変更」
    // 「契約者名変更、契約者住所変更」「契約者名変更、契約者連絡先変更」「契約者住所変更、契約者連絡先変更」
    // 「契約者名変更、契約者住所変更、契約者連絡先変更」がチェックされている場合
    if (
      req.body.chkContractorName === 'on' &&
      req.body.chkContractAddress === undefined &&
      req.body.chkContractContact === undefined
    ) {
      makeContractorNameJson(req.body.contractorName, req.body.contractorKanaName)
    } else if (
      req.body.chkContractAddress === 'on' &&
      req.body.chkContractorName === undefined &&
      req.body.chkContractContact === undefined
    ) {
      makeContractAddressJson(req.body.postalNumber, req.body.contractAddressVal, req.body.banch1, req.body.tatemono1)
    } else if (
      req.body.chkContractContact === 'on' &&
      req.body.chkContractorName === undefined &&
      req.body.chkContractAddress === undefined
    ) {
      makeContractContactJson(req.body.contactPersonName, req.body.contactPhoneNumber, req.body.contactMail)
    } else if (
      req.body.chkContractorName === 'on' &&
      req.body.chkContractAddress === 'on' &&
      req.body.chkContractContact === undefined
    ) {
      makeContractorNameJson(req.body.contractorName, req.body.contractorKanaName)
      makeContractAddressJson(req.body.postalNumber, req.body.contractAddressVal, req.body.banch1, req.body.tatemono1)
    } else if (
      req.body.chkContractorName === 'on' &&
      req.body.chkContractAddress === undefined &&
      req.body.chkContractContact === 'on'
    ) {
      makeContractorNameJson(req.body.contractorName, req.body.contractorKanaName)
      makeContractContactJson(req.body.contactPersonName, req.body.contactPhoneNumber, req.body.contactMail)
    } else if (
      req.body.chkContractorName === undefined &&
      req.body.chkContractAddress === 'on' &&
      req.body.chkContractContact === 'on'
    ) {
      makeContractAddressJson(req.body.postalNumber, req.body.contractAddressVal, req.body.banch1, req.body.tatemono1)
      makeContractContactJson(req.body.contactPersonName, req.body.contactPhoneNumber, req.body.contactMail)
    } else if (
      req.body.chkContractorName === 'on' &&
      req.body.chkContractAddress === 'on' &&
      req.body.chkContractContact === 'on'
    ) {
      makeContractorNameJson(req.body.contractorName, req.body.contractorKanaName)
      makeContractAddressJson(req.body.postalNumber, req.body.contractAddressVal, req.body.banch1, req.body.tatemono1)
      makeContractContactJson(req.body.contactPersonName, req.body.contactPhoneNumber, req.body.contactMail)
    }

    if (
      (req.body.chkContractorName === 'on' || req.body.chkContractAddress === 'on') &&
      req.body.chkContractContact === undefined
    ) {
      contractInformationchangeOrder = Object.assign(
        JSON.parse(JSON.stringify(contractInformationchangeOrderContractBasicInfo)),
        JSON.parse(JSON.stringify(contractInformationchangeOrderContractAccountInfo))
      )
    } else if (
      (req.body.chkContractorName === 'on' || req.body.chkContractAddress === 'on') &&
      req.body.chkContractContact === 'on'
    ) {
      contractInformationchangeOrder = Object.assign(
        JSON.parse(JSON.stringify(contractInformationchangeOrderContractBasicInfo)),
        JSON.parse(JSON.stringify(contractInformationchangeOrderContractAccountInfo)),
        JSON.parse(JSON.stringify(contractInformationchangeOrderContactList))
      )
    } else if (
      req.body.chkContractorName === undefined &&
      req.body.chkContractAddress === undefined &&
      req.body.chkContractContact === 'on'
    ) {
      contractInformationchangeOrder = Object.assign(
        JSON.parse(JSON.stringify(contractInformationchangeOrderContractBasicInfo)),
        JSON.parse(JSON.stringify(contractInformationchangeOrderContactList))
      )
    }

    // 契約者情報変更の受付を行う
    const changeOrder = await changeOrderController.create(req.user.tenantId, contractInformationchangeOrder)

    if (changeOrder instanceof Error || changeOrder === null) return next(errorHelper.create(500))
  } else {
    return next(errorHelper.create(400))
  }

  logger.info(constantsDefine.logMessage.INF001 + 'cbPostChangeIndex')
  req.flash('info', '契約者情報変更を受け付けました。')
  return res.redirect('/portal')
}

router.get('/', helper.isAuthenticated, csrfProtection, cbGetChangeIndex)
router.post('/', helper.isAuthenticated, csrfProtection, cbPostChangeIndex)

module.exports = {
  router: router,
  cbGetChangeIndex: cbGetChangeIndex,
  cbPostChangeIndex: cbPostChangeIndex
}
