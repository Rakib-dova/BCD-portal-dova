'use strict'
const express = require('express')
const router = express.Router()
const helper = require('./helpers/middleware')
const errorHelper = require('./helpers/error')
const noticeHelper = require('./helpers/notice')
const userController = require('../controllers/userController.js')
const contractController = require('../controllers/contractController.js')
const logger = require('../lib/logger')
const validate = require('../lib/validate')
const constantsDefine = require('../constants')

const cbGetIndex = async (req, res, next) => {
  logger.info(constantsDefine.logMessage.INF000 + 'cbGetIndex')
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

  // DBから契約情報取得
  const contract = await contractController.findOne(req.user.tenantId)
  // データベースエラーは、エラーオブジェクトが返る
  // 契約情報未登録の場合もエラーを上げる
  if (contract instanceof Error || contract === null) return next(errorHelper.create(500))

  req.session.userContext = 'LoggedIn'

  // ユーザ権限を取得
  req.session.userRole = user.dataValues?.userRole
  const deleteFlag = contract.dataValues.deleteFlag
  const contractStatus = contract.dataValues.contractStatus
  const checkContractStatus = await helper.checkContractStatus(req, res, next)

  if (checkContractStatus === null || checkContractStatus === 999) {
    return next(errorHelper.create(500))
  }

  if (!validate.isStatusForCancel(contractStatus, deleteFlag)) {
    return next(noticeHelper.create('cancelprocedure'))
  }

  // 勘定科目
  const accountCodeListArr = await tmpAccountCodeListController(contract.contractId)

  if (accountCodeListArr instanceof Error) return next(errorHelper.create(500))

  // アップロードフォーマットデータを画面に渡す。
  res.render('accountCodeList', {
    title: '勘定科目一覧',
    engTitle: 'ACCOUNT CODE LIST',
    btnNameForRegister: '新規登録する',
    accountCodeListArr: accountCodeListArr,
    messageForNotItem: '現在、勘定科目はありません。勘定科目を登録お願いします。',
    // リスト表示カラム
    nameListNo: 'No',
    nameSubjectCode: '勘定科目コード',
    nameSubjectName: '勘定科目名',
    nameUpdateAt: '最新更新日',
    setClassChangeBtn: 'checkChangeAccountCodeBtn',
    setClassDeleteBtn: 'deleteAccountCodeBtn'
  })
  logger.info(constantsDefine.logMessage.INF001 + 'cbGetIndex')
}

// ダミーデータ関数
const tmpAccountCodeListController = async (contractId) => {
  const { v4: uuid } = require('uuid')
  const dummyContractId = uuid()
  const now = new Date().toISOString().replace('T', ' ').replace('Z', '')
  const dummyData1 = {
    no: 1,
    codeAccountId: uuid(),
    contractId: dummyContractId,
    subjectName: '現金',
    subjectCode: 'AB001',
    createdAt: now,
    updatedAt: now
  }
  const dummyData2 = {
    no: 2,
    codeAccountId: uuid(),
    contractId: dummyContractId,
    subjectName: '小口現金',
    subjectCode: 'AB002',
    createdAt: now,
    updatedAt: now
  }
  const dummyData3 = {
    no: 3,
    codeAccountId: uuid(),
    contractId: dummyContractId,
    subjectName: '当座預金',
    subjectCode: 'AB003',
    createdAt: now,
    updatedAt: now
  }
  const dummyData4 = {
    no: 4,
    codeAccountId: uuid(),
    contractId: dummyContractId,
    subjectName: '普通預金',
    subjectCode: 'AB004',
    createdAt: now,
    updatedAt: now
  }
  const dummyData5 = {
    no: 5,
    codeAccountId: uuid(),
    contractId: dummyContractId,
    subjectName: '売掛金',
    subjectCode: 'AB005',
    createdAt: now,
    updatedAt: now
  }
  const dummyData6 = {
    no: 6,
    codeAccountId: uuid(),
    contractId: dummyContractId,
    subjectName: '商品',
    subjectCode: 'AB006',
    createdAt: now,
    updatedAt: now
  }
  const dummyData7 = {
    no: 7,
    codeAccountId: uuid(),
    contractId: dummyContractId,
    subjectName: '貯蔵品',
    subjectCode: 'AB007',
    createdAt: now,
    updatedAt: now
  }
  const dummyData8 = {
    no: 8,
    codeAccountId: uuid(),
    contractId: dummyContractId,
    subjectName: '前払費用',
    subjectCode: 'AB008',
    createdAt: now,
    updatedAt: now
  }
  const dummyData9 = {
    no: 9,
    codeAccountId: uuid(),
    contractId: dummyContractId,
    subjectName: '前払金',
    subjectCode: 'AB009',
    createdAt: now,
    updatedAt: now
  }
  const dummyData10 = {
    no: 10,
    codeAccountId: uuid(),
    contractId: dummyContractId,
    subjectName: '短期貸付金',
    subjectCode: 'AB010',
    createdAt: now,
    updatedAt: now
  }

  const dummyDataList = []
  dummyDataList.push(dummyData1)
  dummyDataList.push(dummyData2)
  dummyDataList.push(dummyData3)
  dummyDataList.push(dummyData4)
  dummyDataList.push(dummyData5)
  dummyDataList.push(dummyData6)
  dummyDataList.push(dummyData7)
  dummyDataList.push(dummyData8)
  dummyDataList.push(dummyData9)
  dummyDataList.push(dummyData10)

  return dummyDataList
}

router.get('/', helper.isAuthenticated, cbGetIndex)

module.exports = {
  router: router,
  cbGetIndex: cbGetIndex
}
