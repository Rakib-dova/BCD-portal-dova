const apiManager = require('./apiManager')
const db = require('../models')
const AccountCode = db.AccountCode
const SubAccountCode = db.SubAccountCode
const DepartmentCode = db.DepartmentCode
const JournalizeInvoice = db.JournalizeInvoice
const logger = require('../lib/logger')
const Op = db.Sequelize.Op
const department = db.DepartmentCode
const RequestApproval = db.RequestApproval
const constantsDefine = require('../constants')
const validate = require('../lib/validate')
const processStatus = {
  PAID_CONFIRMED: 0, // 入金確認済み
  PAID_UNCONFIRMED: 1, // 送金済み
  ACCEPTED: 2, // 受理済み
  DELIVERED: 3 // 受信済み
}

/**
 *
 * @param {string} accessToken アクセストークン
 * @param {string} refreshToken リフレッシュトークン
 * @param {int} pageId 出力するページ番号
 * @param {uuid} tenantId テナントID
 * @param {string} presentation スタンダードプランの有無確認
 * @returns {document} トレードシフトのドキュメント
 */

const getInbox = async function (accessToken, refreshToken, pageId, tenantId, presentation) {
  const withouttag = ['archived', 'AP_DOCUMENT_Draft', 'PARTNER_DOCUMENT_DRAFT', 'tsgo-document']
  const state = ['DELIVERED', 'ACCEPTED', 'PAID_UNCONFIRMED', 'PAID_CONFIRMED']
  const type = ['invoice']
  const sentTo = tenantId
  const stag = ['purchases']
  const onePagePerItemCount = 20 // １ページあたり表示する項目の数
  const page = pageId - 1 // 現在ページ

  const tradeshiftDTO = new (require('../DTO/TradeshiftDTO'))(accessToken, refreshToken, tenantId)
  const documents = await tradeshiftDTO.getDocuments(
    '',
    withouttag,
    type,
    page,
    onePagePerItemCount,
    '',
    '',
    '',
    sentTo,
    '',
    '',
    state,
    '',
    '',
    stag
  )

  // アクセストークンの有効期限が終わるの場合
  if (documents.Document === undefined) {
    return {
      previous: 0,
      next: 1,
      list: []
    }
  }

  // 請求書情報取得
  const document = []
  for (let i = 0; i < documents.Document.length; i++) {
    const result = await tradeshiftDTO.getDocument(documents.Document[i].DocumentId, '')
    document.push(result)
  }

  // // 請求書情報取得
  // let document = []
  // await Promise.all(
  //   documents.Document.map(async (key) => {
  //     return tradeshiftDTO.getDocument(key.DocumentId)
  //   })
  // ).then(function (result) {
  //   document = result
  // })

  // 社内に担当者ユーザーの有無確認
  let contactor = []
  if (presentation === 'inboxList_light_plan') {
    // 社内に担当者ユーザーの有無確認
    contactor = await getCompanyUserInfo(document, accessToken, refreshToken)
  } else {
    // スタンダードプランではない場合
    // await Promise.allSettled(
    const result = document.map((key) => {
      let managerAddress = ''
      if (!(key instanceof Error)) {
        managerAddress = key.AccountingCustomerParty.Party.Contact?.ID?.value
      }
      if (
        typeof managerAddress !== 'undefined' &&
        managerAddress.trim().length !== 0 &&
        validate.isValidEmail(managerAddress)
      ) {
        managerAddress = key.AccountingCustomerParty.Party.Contact?.ID?.value
      }

      return { managerAddress: managerAddress, documentId: key.documentId }
    })
    // ).then(function (result) {
    contactor = result.filter(
      (element) =>
        element.managerAddress !== '' &&
        element.managerAddress !== undefined &&
        validate.isValidEmail(element.managerAddress)
    )
    // })
  }

  // 文書をリスト化する
  const documentList = documents.Document.map((item, idx) => {
    const ammount = function () {
      if (item.ItemInfos[1] === undefined) return '-'
      return Math.floor(item.ItemInfos[1].value).toLocaleString('ja-JP')
    }

    const managerInfo = { managerAddress: '-', managerName: '（ユーザー登録なし）' }
    for (let i = 0; i < contactor.length; i++) {
      if (contactor[i].documentId === item.DocumentId) {
        managerInfo.managerAddress = contactor[i].managerAddress
        if (contactor[i].userInfo && !(contactor[i].userInfo instanceof Error)) {
          if (
            contactor[i].userInfo.Person.LastName.trim().length !== 0 ||
            contactor[i].userInfo.Person.FirstName.trim().length !== 0
          ) {
            managerInfo.managerName = `${contactor[i].userInfo.Person.LastName} ${contactor[i].userInfo.Person.FirstName}`
          } else {
            managerInfo.managerName = '-'
          }

          break
        }
      }
    }

    return {
      no: idx + 1 + page * onePagePerItemCount,
      invoiceNo: item.ID,
      status: processStatus[`${item.UnifiedState}`] ?? '-',
      currency: item.ItemInfos[0].value ?? '-',
      ammount: ammount(),
      sentTo: item.SenderCompanyName ?? '-',
      sentBy: item.ReceiverCompanyName ?? '-',
      updated: item.LastEdit !== undefined ? item.LastEdit.substring(0, 10) : '-',
      expire: item.DueDate ?? '-',
      documentId: item.DocumentId,
      managerInfo: managerInfo
    }
  })

  const numPage = documents.numPages
  const currPage = documents.pageId

  // 更新日で整列(更新日がない場合、期限日で整列)
  const updated = documentList.sort((next, prev) => {
    let nextDate = null
    let prevDate = null
    if (next.udated === '-' || prev.updated === '-') {
      nextDate = new Date(next.expire)
      prevDate = new Date(prev.expire)
    }

    return nextDate > prevDate ? 1 : nextDate < prevDate ? -1 : 0
  })

  // 結果返却
  return {
    list: updated,
    numPages: numPage,
    currPage: currPage + 1
  }
}

const getInvoiceDetail = async function (accessTk, refreshTk, invoiceId, contractId) {
  const InvoiceDetail = require('../lib/invoiceDetail')
  const invoice = await apiManager.accessTradeshift(accessTk, refreshTk, 'get', `/documents/${invoiceId}`)
  const journalizeInvoice = await JournalizeInvoice.findAll({
    where: {
      invoiceId: invoiceId,
      contractId: contractId
    },
    order: [
      ['lineNo', 'ASC'],
      ['journalNo', 'ASC']
    ]
  })

  journalizeInvoice.sort((next, prev) => {
    const nextJournalNo = next.journalNo.split('lineAccountCode')[1]
    const prevJournalNo = prev.journalNo.split('lineAccountCode')[1]

    return nextJournalNo - prevJournalNo
  })

  const displayInvoice = new InvoiceDetail(invoice, journalizeInvoice)

  return displayInvoice
}

const getCode = async (contractId, accountCode, accountCodeName, subAccountCode, subAccountCodeName) => {
  const whereIsAccountCode = { contractId: contractId }
  const whereIsSubAccountCode = {}

  accountCode = accountCode ?? ''
  accountCodeName = accountCodeName ?? ''
  subAccountCode = subAccountCode ?? ''
  subAccountCodeName = subAccountCodeName ?? ''

  if (accountCode.length !== 0) {
    whereIsAccountCode.accountCode = {
      [Op.like]: `%${accountCode}%`
    }
  }
  if (accountCodeName.length !== 0) {
    whereIsAccountCode.accountCodeName = {
      [Op.like]: `%${accountCodeName}%`
    }
  }
  if (subAccountCode.length !== 0) {
    whereIsSubAccountCode.subjectCode = {
      [Op.like]: `%${subAccountCode}%`
    }
  }
  if (subAccountCodeName.length !== 0) {
    whereIsSubAccountCode.subjectName = {
      [Op.like]: `%${subAccountCodeName}%`
    }
  }

  try {
    // 契約番号と補助科目IDでデータを取得（OUTER JOIN）

    const targetAccountCodeSubAccountCodeJoin = await AccountCode.findAll({
      raw: true,
      include: [
        {
          model: SubAccountCode,
          attributes: ['subAccountCodeId', 'accountCodeId', 'subjectCode', 'subjectName'],
          where: {
            ...whereIsSubAccountCode
          }
        }
      ],
      where: {
        ...whereIsAccountCode
      }
    })

    let result
    if (subAccountCode !== '' || subAccountCodeName !== '') {
      result = targetAccountCodeSubAccountCodeJoin
    } else {
      const targetAccountCode = await AccountCode.findAll({
        where: {
          ...whereIsAccountCode
        }
      })

      result = targetAccountCode.concat(targetAccountCodeSubAccountCodeJoin)
    }

    result.sort((a, b) => {
      if (a.accountCode > b.accountCode) return 1
      else if (a.accountCode < b.accountCode) return -1
      else {
        if (a['SubAccountCodes.subjectCode'] > b['SubAccountCodes.subjectCode']) return 1
        else if (a['SubAccountCodes.subjectCode'] < b['SubAccountCodes.subjectCode']) return -1
        else return 0
      }
    })

    // 検索結果出力
    return result
  } catch (error) {
    logger.error({ contractId: contractId, stack: error.stack, status: 0 })
    return error
  }
}

// 仕訳情報設定（登録、変更、削除）
const insertAndUpdateJournalizeInvoice = async (contractId, invoiceId, data) => {
  // 明細ID取得
  let lines = []
  if (Object.prototype.toString.call(data.lineNo) === '[object Array]') {
    lines = data.lineNo
  } else {
    lines.push(data.lineNo)
  }

  let lineId = []
  if (Object.prototype.toString.call(data.lineId) === '[object Array]') {
    lineId = data.lineId
  } else {
    lineId.push(data.lineId)
  }

  delete data.lineNo
  const lineJournals = []
  let accountLines = 1
  const result = {
    status: 0
  }

  const lineAccountCodeKey = Object.keys(data)

  // 明細の仕訳設定情報を配列に作成
  try {
    lines.forEach((idx) => {
      // lineNoのlineAccountCode番号取得
      const lineCount = []
      lineAccountCodeKey.forEach((value) => {
        const valueRelace = value.replace(`lineNo${idx}_lineAccountCode`, '')
        const number = valueRelace.substring(0, valueRelace.indexOf('_'))
        if (!isNaN(number) && number !== '') {
          lineCount.push(number)
        }
      })
      const lineAccountCodeNumber = [...new Set(lineCount)]

      lineJournals.push([])

      while (accountLines < 11) {
        let accountLineNumber = 0
        if (lineAccountCodeNumber[accountLines - 1] !== undefined) {
          accountLineNumber = lineAccountCodeNumber[accountLines - 1]
        }

        if (
          (data[`lineNo${idx}_lineAccountCode${accountLineNumber}_accountCode`] !== undefined &&
            data[`lineNo${idx}_lineAccountCode${accountLineNumber}_subAccountCode`] !== undefined &&
            data[`lineNo${idx}_lineAccountCode${accountLineNumber}_departmentCode`] !== undefined &&
            data[`lineNo${idx}_lineAccountCode${accountLineNumber}_input_amount`] !== undefined &&
            data[`lineNo${idx}_lineAccountCode${accountLineNumber}_accountCode`].length !== 0 &&
            data[`lineNo${idx}_lineAccountCode${accountLineNumber}_input_amount`].length !== 0) ||
          (data[`lineNo${idx}_lineCreditAccountCode${accountLineNumber}_creditAccountCode`] !== undefined &&
            data[`lineNo${idx}_lineCreditAccountCode${accountLineNumber}_creditSubAccountCode`] !== undefined &&
            data[`lineNo${idx}_lineCreditAccountCode${accountLineNumber}_creditDepartmentCode`] !== undefined &&
            data[`lineNo${idx}_lineAccountCode${accountLineNumber}_input_amount`] !== undefined &&
            data[`lineNo${idx}_lineCreditAccountCode${accountLineNumber}_creditAccountCode`].length !== 0 &&
            data[`lineNo${idx}_lineAccountCode${accountLineNumber}_input_amount`].length !== 0)
        ) {
          // 借方,貸方の仕訳情報設定がある場合
          if (
            data[`lineNo${idx}_lineAccountCode${accountLineNumber}_accountCode`].length !== 0 &&
            data[`lineNo${idx}_lineCreditAccountCode${accountLineNumber}_creditAccountCode`].length !== 0
          ) {
            lineJournals[idx - 1].push({
              data: {
                invoiceId: invoiceId,
                contractId: contractId,
                lineNo: ~~idx,
                lineId: lineId[~~idx - 1],
                journalNo: `lineAccountCode${accountLineNumber}`,
                accountCode: data[`lineNo${idx}_lineAccountCode${accountLineNumber}_accountCode`],
                subAccountCode: data[`lineNo${idx}_lineAccountCode${accountLineNumber}_subAccountCode`],
                departmentCode: data[`lineNo${idx}_lineAccountCode${accountLineNumber}_departmentCode`],
                creditAccountCode: data[`lineNo${idx}_lineCreditAccountCode${accountLineNumber}_creditAccountCode`],
                creditSubAccountCode:
                  data[`lineNo${idx}_lineCreditAccountCode${accountLineNumber}_creditSubAccountCode`],
                creditDepartmentCode:
                  data[`lineNo${idx}_lineCreditAccountCode${accountLineNumber}_creditDepartmentCode`],
                installmentAmount: BigInt(
                  data[`lineNo${idx}_lineAccountCode${accountLineNumber}_input_amount`].replace(/,/g, '')
                )
              }
            })
          } else if (data[`lineNo${idx}_lineAccountCode${accountLineNumber}_accountCode`].length !== 0) {
            // 借方の仕訳情報設定がある場合
            lineJournals[idx - 1].push({
              data: {
                invoiceId: invoiceId,
                contractId: contractId,
                lineNo: ~~idx,
                lineId: lineId[~~idx - 1],
                journalNo: `lineAccountCode${accountLineNumber}`,
                accountCode: data[`lineNo${idx}_lineAccountCode${accountLineNumber}_accountCode`],
                subAccountCode: data[`lineNo${idx}_lineAccountCode${accountLineNumber}_subAccountCode`],
                departmentCode: data[`lineNo${idx}_lineAccountCode${accountLineNumber}_departmentCode`],
                creditAccountCode: '',
                creditSubAccountCode: '',
                creditDepartmentCode: '',
                installmentAmount: BigInt(
                  data[`lineNo${idx}_lineAccountCode${accountLineNumber}_input_amount`].replace(/,/g, '')
                )
              }
            })
          } else if (data[`lineNo${idx}_lineCreditAccountCode${accountLineNumber}_creditAccountCode`].length !== 0) {
            // 貸方の仕訳情報設定がある場合
            lineJournals[idx - 1].push({
              data: {
                invoiceId: invoiceId,
                contractId: contractId,
                lineNo: ~~idx,
                lineId: lineId[~~idx - 1],
                journalNo: `lineAccountCode${accountLineNumber}`,
                accountCode: '',
                subAccountCode: '',
                departmentCode: '',
                creditAccountCode: data[`lineNo${idx}_lineCreditAccountCode${accountLineNumber}_creditAccountCode`],
                creditSubAccountCode:
                  data[`lineNo${idx}_lineCreditAccountCode${accountLineNumber}_creditSubAccountCode`],
                creditDepartmentCode:
                  data[`lineNo${idx}_lineCreditAccountCode${accountLineNumber}_creditDepartmentCode`],
                installmentAmount: BigInt(
                  data[`lineNo${idx}_lineAccountCode${accountLineNumber}_input_amount`].replace(/,/g, '')
                )
              }
            })
          }

          // 仕訳情報名初期化
          lineJournals[idx - 1][accountLines - 1].data.accountName = ''
          lineJournals[idx - 1][accountLines - 1].data.subAccountName = ''
          lineJournals[idx - 1][accountLines - 1].data.departmentName = ''
          lineJournals[idx - 1][accountLines - 1].data.creditAccountName = ''
          lineJournals[idx - 1][accountLines - 1].data.creditSubAccountName = ''
          lineJournals[idx - 1][accountLines - 1].data.creditDepartmentName = ''
        } else {
          lineJournals[idx - 1].push({
            data: null
          })
        }
        accountLines++
      }
      accountLines = 1
    })

    // DBから仕訳情報設定確認
    const resultSearchJournals = await JournalizeInvoice.findAll({
      where: {
        contractId: contractId,
        invoiceId: invoiceId
      },
      order: [
        ['lineNo', 'ASC'],
        ['lineId', 'ASC']
      ]
    })

    // 登録前、勘定科目コード検証
    for (let lines = 0; lines < lineJournals.length; lines++) {
      for (let idx = 0; idx < 10; idx++) {
        const item = lineJournals[lines][idx]
        if (item.data === null) continue

        result.lineId = item.data.lineId
        // 借方の勘定科目コード検証
        if (item.data.accountCode !== '') {
          result.accountCode = item.data.accountCode
          const accInstance = await AccountCode.findOne({
            where: {
              contractId: contractId,
              accountCode: item.data.accountCode
            }
          })

          if (accInstance instanceof AccountCode === false) {
            result.status = -1
            return result
          } else {
            lineJournals[lines][idx].data.accountName = accInstance.accountCodeName
          }
        }

        // 貸方の勘定科目コード検証
        if (item.data.creditAccountCode !== '') {
          result.accountCode = item.data.creditAccountCode
          const accInstance = await AccountCode.findOne({
            where: {
              contractId: contractId,
              accountCode: item.data.creditAccountCode
            }
          })
          if (accInstance instanceof AccountCode === false) {
            result.status = -1
            return result
          } else {
            lineJournals[lines][idx].data.creditAccountName = accInstance.accountCodeName
          }
        }
      }
    }

    // 登録前、補助科目コード検証
    for (let lines = 0; lines < lineJournals.length; lines++) {
      for (let idx = 0; idx < 10; idx++) {
        const item = lineJournals[lines][idx]
        delete result.accountCode
        if (item.data === null) continue
        if (item.data.subAccountCode.length === 0 && item.data.creditSubAccountCode.length === 0) continue
        let checkSubAccount = null
        let checkCreditSubAccount = null
        result.lineId = item.data.lineId

        // 借方の補助科目コード検証
        if (item.data.accountCode.length !== 0 && item.data.subAccountCode.length !== 0) {
          result.subAccountCode = item.data.subAccountCode
          checkSubAccount = await AccountCode.findAll({
            raw: true,
            include: [
              {
                model: SubAccountCode,
                attributes: ['subAccountCodeId', 'accountCodeId', 'subjectCode', 'subjectName'],
                where: {
                  subjectCode: item.data.subAccountCode
                }
              }
            ],
            where: {
              contractId: contractId,
              accountCode: item.data.accountCode
            }
          })

          if (checkSubAccount.length === 0) {
            result.status = -2
            return result
          } else {
            lineJournals[lines][idx].data.subAccountName = checkSubAccount[0]['SubAccountCodes.subjectName']
          }
        }

        // 貸方の補助科目コード検証
        if (item.data.creditAccountCode.length !== 0 && item.data.creditSubAccountCode.length !== 0) {
          result.subAccountCode = item.data.creditSubAccountCode
          checkCreditSubAccount = await AccountCode.findAll({
            raw: true,
            include: [
              {
                model: SubAccountCode,
                attributes: ['subAccountCodeId', 'accountCodeId', 'subjectCode', 'subjectName'],
                where: {
                  subjectCode: item.data.creditSubAccountCode
                }
              }
            ],
            where: {
              contractId: contractId,
              accountCode: item.data.creditAccountCode
            }
          })

          if (checkCreditSubAccount.length === 0) {
            result.status = -2
            return result
          } else {
            lineJournals[lines][idx].data.creditSubAccountName = checkCreditSubAccount[0]['SubAccountCodes.subjectName']
          }
        }
      }
    }

    // 登録前、部門データ検証
    for (let lines = 0; lines < lineJournals.length; lines++) {
      for (let idx = 0; idx < 10; idx++) {
        const item = lineJournals[lines][idx]
        delete result.subAccountCode
        if (item.data === null) continue
        if (item.data.departmentCode.length === 0 && item.data.creditDepartmentCode.length === 0) continue
        result.lineId = item.data.lineId

        // 借方の補助科目コード検証
        if (item.data.accountCode.length !== 0 && item.data.departmentCode.length !== 0) {
          result.departmentCode = item.data.departmentCode
          const departmentInstance = await DepartmentCode.findOne({
            where: {
              contractId: contractId,
              departmentCode: item.data.departmentCode
            }
          })
          if (departmentInstance instanceof DepartmentCode === false) {
            result.status = -3
            return result
          } else {
            lineJournals[lines][idx].data.departmentName = departmentInstance.departmentCodeName
          }
        }

        // 貸方の補助科目コード検証
        if (item.data.creditAccountCode.length !== 0 && item.data.creditDepartmentCode.length !== 0) {
          result.departmentCode = item.data.creditDepartmentCode
          const departmentInstance = await DepartmentCode.findOne({
            where: {
              contractId: contractId,
              departmentCode: item.data.creditDepartmentCode
            }
          })
          if (departmentInstance instanceof DepartmentCode === false) {
            result.status = -3
            return result
          } else {
            lineJournals[lines][idx].data.creditDepartmentName = departmentInstance.departmentCodeName
          }
        }
      }
    }
    delete result.departmentCode

    // DBに保存データがない場合
    if (resultSearchJournals.length === 0) {
      lineJournals.forEach(async (accountLines) => {
        accountLines.forEach(async (item) => {
          if (item.data === null) return null
          const savedJournalItem = JournalizeInvoice.build({
            ...item.data
          })
          await savedJournalItem.save()
        })
      })
      return result
    }

    // DBにデータが保存している場合
    for (let idx = 0; idx < lines.length; idx++) {
      for (let journalNo = 0; journalNo < 10; journalNo++) {
        const target = lineJournals[idx][journalNo]
        if (target.data !== null) {
          resultSearchJournals.forEach((item) => {
            if (~~target.data.lineNo === ~~item.lineNo && target.data.journalNo === item.journalNo) {
              target.dbInstance = item
              item.set({
                ...target.data
              })
            }
          })
          if (target.dbInstance === undefined) {
            target.dbInstance = JournalizeInvoice.build({
              ...target.data
            })
          }
        } else {
          resultSearchJournals.forEach((item) => {
            if (~~item.lineNo === idx + 1 && item.journalNo === `lineAccountCode${journalNo + 1}`) {
              target.dbInstance = item
            }
          })
        }
      }
    }
    // 変更内容DBに保存
    lineJournals.forEach(async (accountLines) => {
      accountLines.forEach(async (item) => {
        if (item.data !== null && item.dbInstance instanceof JournalizeInvoice) {
          await item.dbInstance.save()
        } else if (item.data == null && item.dbInstance instanceof JournalizeInvoice) {
          await item.dbInstance.destroy()
        }
      })
    })
    return result
  } catch (error) {
    logger.error({ contractId: contractId, stack: error.stack, status: 0 })
    return { error }
  }
}

const getDepartment = async (_contractId, _departmentCode, _departmentName) => {
  logger.info(constantsDefine.logMessage.INF000 + 'getDepartment')
  const contractId = _contractId
  const departmentCode = _departmentCode ?? ''
  const departmentName = _departmentName ?? ''

  try {
    const where = {
      contractId: contractId
    }
    if (departmentCode.length !== 0) {
      where.departmentCode = {
        [Op.like]: `%${departmentCode}%`
      }
    }
    if (departmentName.length !== 0) {
      where.departmentCodeName = {
        [Op.like]: `%${departmentName}%`
      }
    }
    const departments = (
      await department.findAll({
        where: {
          ...where
        }
      })
    ).map((department) => {
      return {
        code: department.departmentCode,
        name: department.departmentCodeName
      }
    })

    departments.sort((a, b) => {
      if (a.code > b.code) return 1
      else {
        return -1
      }
    })

    logger.info(constantsDefine.logMessage.INF001 + 'getDepartment')
    return { status: 0, searchResult: departments }
  } catch (error) {
    logger.error({ contractId: contractId, stack: error.stack, status: 0 })
    logger.info(constantsDefine.logMessage.INF001 + 'getDepartment')
    return { status: -1, searchResult: error }
  }
}

/**
 * 支払依頼の情報（承認タブに表示する情報）を取得する。
 * @param {uuid} contractId コントラクター識別番号
 * @param {uuid} invoiceId 請求書uuid番号
 * @returns 支払依頼の場合true、ない場合false
 */
const getRequestApproval = async (contractId, invoiceId) => {
  try {
    // 検索のため、依頼中ステータス作成
    const requestStatus = []
    for (let id = 10; id < 21; id++) {
      requestStatus.push({ status: `${id}` })
    }
    // 最終承認済みステータス追加
    requestStatus.push({ status: '00' })
    const requestApproval = await RequestApproval.findOne({
      where: {
        contractId: contractId,
        invoiceId: invoiceId,
        [Op.or]: requestStatus
      }
    })
    if (requestApproval instanceof RequestApproval === false) return false
    return true
  } catch (error) {
    return error
  }
}

/**
 * 承認待ちのリストを取得
 * @param {uuid} userId ユーザーの識別番号
 * @param {uuid} contractId コントラクター識別番号
 * @param {object} tradeshiftDTO トレードシフトのdata transfer
 * @param {string} presentation スタンダードプランの有無確認
 * @returns {array<WaitingWorkflow>} 承認待ちのリスト
 */
const getWorkflow = async (userId, contractId, tradeshiftDTO, presentation) => {
  const requestApprovalDTO = new (require('../DTO/RequestApprovalDTO'))(contractId)
  requestApprovalDTO.setTradeshiftDTO(tradeshiftDTO)
  const getWaitingWorkflow = await requestApprovalDTO.getWaitingWorkflowisMine(userId)

  // 請求書情報取得
  const document = []
  for (let i = 0; i < getWaitingWorkflow.length; i++) {
    const result = await tradeshiftDTO.getDocument(getWaitingWorkflow[i].documentId, '')
    document.push(result)
  }

  // // 請求書情報取得
  // let document = []
  // await Promise.all(
  //   getWaitingWorkflow.map(async (key) => {
  //     return tradeshiftDTO.getDocument(key.documentId)
  //   })
  // ).then(function (result) {
  //   document = result
  // })

  // 社内に担当者ユーザーの有無確認
  let contactor = []
  if (presentation === 'inboxList_light_plan') {
    contactor = await getCompanyUserInfo(document, tradeshiftDTO.accessToken, tradeshiftDTO.refreshToken)
  } else {
    // スタンダードプランではない場合
    // await Promise.all(
    const result = document.map((key) => {
      let managerAddress = ''
      if (!(key instanceof Error)) {
        managerAddress = key.AccountingCustomerParty.Party.Contact?.ID?.value
      }
      if (
        typeof managerAddress !== 'undefined' &&
        managerAddress.trim().length !== 0 &&
        validate.isValidEmail(managerAddress)
      ) {
        managerAddress = key.AccountingCustomerParty.Party.Contact?.ID?.value
      }

      return { managerAddress: managerAddress, documentId: key.documentId }
    })
    // ).then(function (result) {
    contactor = result.filter(
      (element) =>
        element.managerAddress !== '' &&
        element.managerAddress !== undefined &&
        validate.isValidEmail(element.managerAddress)
    )
    // })
  }

  // リストに担当者アドレス、ユーザー情報入力
  for (let i = 0; i < getWaitingWorkflow.length; i++) {
    const managerInfo = { managerAddress: '-', managerName: '（ユーザー登録なし）' }
    for (let j = 0; j < contactor.length; j++) {
      if (contactor[j].documentId === getWaitingWorkflow[i].documentId) {
        managerInfo.managerAddress = contactor[j].managerAddress
        if (contactor[j].userInfo && !(contactor[j].userInfo instanceof Error)) {
          if (
            contactor[j].userInfo.Person.LastName.trim().length !== 0 ||
            contactor[j].userInfo.Person.FirstName.trim().length !== 0
          ) {
            managerInfo.managerName = `${contactor[j].userInfo.Person.LastName} ${contactor[j].userInfo.Person.FirstName}`
          } else {
            managerInfo.managerName = '-'
          }
          break
        }
      }
    }
    getWaitingWorkflow[i].managerInfo = managerInfo
  }

  return getWaitingWorkflow
}

/**
 *
 * @param {object} tradeshiftDTO トレードシフト
 * @param {object} keyword
 * @returns {Array<object>} 検索結果
 */
const getSearchResult = async (tradeshiftDTO, keyword, contractId, tenantId) => {
  try {
    const sentByCompanies = keyword.sentBy
    const invoiceId = keyword.invoiceNumber
    const issueDate = keyword.issueDate
    const status = keyword.status
    const contactEmail = keyword.contactEmail
    const unKnownManager = keyword.unKnownManager
    let result = null

    // 請求書のタグ付け有無確認
    const checkTagDocumentList = []
    const withouttag = ['tag_checked_portal']
    const type = ['invoice']
    const state = ['DELIVERED', 'ACCEPTED', 'PAID_UNCONFIRMED', 'PAID_CONFIRMED']
    const stag = ['purchases']
    const invoiceList = await tradeshiftDTO.getDocuments(
      '',
      withouttag,
      type,
      0,
      10000,
      '',
      '',
      '',
      tenantId,
      '',
      '',
      state,
      '',
      '',
      stag
    )

    if (invoiceList instanceof Error) return invoiceList

    for (const document of invoiceList.Document) {
      if (document.TenantId === tenantId) {
        checkTagDocumentList.push(document)
      }
    }

    if (checkTagDocumentList.length !== 0) {
      for (const data of checkTagDocumentList) {
        const invoice = await tradeshiftDTO.getDocument(data.DocumentId)
        if (invoice instanceof Error) return invoice

        // 担当者メールアドレス確認、ある場合はタグ追加
        if (invoice.AccountingCustomerParty.Party.Contact.ID) {
          if (validate.isContactEmail(invoice.AccountingCustomerParty.Party.Contact.ID.value) !== 0) {
            logger.warn(
              `contractId:${contractId}, DocumentId:${data.DocumentId}, msg: ${constantsDefine.statusConstants.FAILED_TO_CREATE_TAG}(${constantsDefine.statusConstants.INVOICE_CONTACT_EMAIL_NOT_VERIFY})`
            )
            await tradeshiftDTO.createTags(data.DocumentId, encodeURIComponent('unKnownManager'))
          } else {
            await tradeshiftDTO.createTags(data.DocumentId, invoice.AccountingCustomerParty.Party.Contact.ID.value)

            // 企業にユーザー有無確認
            const userInfo = await apiManager.accessTradeshift(
              tradeshiftDTO.accessToken,
              tradeshiftDTO.refreshToken,
              'get',
              `/account/users/byemail/${invoice.AccountingCustomerParty.Party.Contact.ID.value}?searchlocked=false`
            )
            // ユーザー情報がない場合
            if (userInfo instanceof Error) {
              await tradeshiftDTO.createTags(data.DocumentId, encodeURIComponent('unKnownManager'))
            }
          }
        } else {
          await tradeshiftDTO.createTags(data.DocumentId, encodeURIComponent('unKnownManager'))
        }
        // 確認請求書にタグを追加
        await tradeshiftDTO.createTags(data.DocumentId, 'tag_checked_portal')
      }
    }

    // 送信会社、請求書番号、発行日、取引先担当者(アドレス)で検索
    if (sentByCompanies.length > 0) {
      const response = []
      for (const company of sentByCompanies) {
        const result = await tradeshiftDTO.getDocumentSearch(
          company,
          invoiceId,
          issueDate,
          contactEmail,
          unKnownManager
        )
        response.push(...result)
      }
      result = response
    } else {
      result = await tradeshiftDTO.getDocumentSearch('', invoiceId, issueDate, contactEmail, unKnownManager)
    }

    if (result instanceof Error) return result

    // 請求書情報取得
    const document = []
    for (let i = 0; i < result.length; i++) {
      const documentInfo = await tradeshiftDTO.getDocument(result[i].DocumentId, '')
      document.push(documentInfo)
    }

    // 社内に担当者ユーザーの有無確認
    const contactor = await getCompanyUserInfo(document, tradeshiftDTO.accessToken, tradeshiftDTO.refreshToken)

    // 請求書の承認依頼検索
    for (let i = 0; i < result.length; i++) {
      const requestApproval = await RequestApproval.findOne({
        where: {
          contractId: contractId,
          invoiceId: result[i].DocumentId
        },
        order: [['create', 'DESC']]
      })
      if (requestApproval !== null) {
        result[i].approveStatus = requestApproval.status
      }
    }

    // 承認ステータスで検索
    if (status.length > 0) {
      const statusSearchResult = []
      for (let i = 0; i < result.length; i++) {
        for (let j = 0; j < status.length; j++) {
          if (status[j] === '80') {
            if (!result[i].approveStatus || result[i].approveStatus === status[j]) statusSearchResult.push(result[i])
          } else {
            if (result[i].approveStatus === status[j]) statusSearchResult.push(result[i])
          }
        }
      }
      result = statusSearchResult
    }

    const documentList = result.map((document, idx) => {
      const ammount = function () {
        if (document.ItemInfos[1] === undefined) return '-'
        return Math.floor(document.ItemInfos[1].value).toLocaleString('ja-JP')
      }

      const managerInfo = { managerAddress: '-', managerName: '（ユーザー登録なし）' }
      for (let i = 0; i < contactor.length; i++) {
        if (contactor[i].documentId === document.DocumentId) {
          managerInfo.managerAddress = contactor[i].managerAddress
          if (contactor[i].userInfo && !(contactor[i].userInfo instanceof Error)) {
            if (
              contactor[i].userInfo.Person.LastName.trim().length !== 0 ||
              contactor[i].userInfo.Person.FirstName.trim().length !== 0
            ) {
              managerInfo.managerName = `${contactor[i].userInfo.Person.LastName} ${contactor[i].userInfo.Person.FirstName}`
            } else {
              managerInfo.managerName = '-'
            }

            break
          }
        }
      }

      return {
        no: idx + 1,
        invoiceNo: document.ID,
        status: processStatus[`${document.UnifiedState}`] ?? '-',
        currency: document.ItemInfos[0].value ?? '-',
        ammount: ammount(),
        sentTo: document.SenderCompanyName ?? '-',
        sentBy: document.ReceiverCompanyName ?? '-',
        updated: document.LastEdit !== undefined ? document.LastEdit.substring(0, 10) : '-',
        expire: document.DueDate ?? '-',
        documentId: document.DocumentId,
        approveStatus: document.approveStatus ?? '',
        managerInfo: managerInfo
      }
    })

    return documentList
  } catch (error) {
    return error
  }
}

/**
 * 社内の取引先担当者の情報取得
 * @param {array} document 請求書情報
 * @param {string} accessToken アクセストークン
 * @param {string} refreshToken リフレッシュトークン
 * @returns {contactor} 社内の取引先担当者の情報取得
 */
const getCompanyUserInfo = async (document, accessToken, refreshToken) => {
  let contactor = []
  // 社内に担当者ユーザーの有無確認
  const result = []
  for (let i = 0; i < document.length; i++) {
    let managerAddress
    if (!(document[i] instanceof Error)) {
      managerAddress = document[i].AccountingCustomerParty.Party.Contact?.ID?.value
      if (
        typeof managerAddress !== 'undefined' &&
        managerAddress.trim().length !== 0 &&
        validate.isValidEmail(managerAddress)
      ) {
        const userInfo = await apiManager.accessTradeshift(
          accessToken,
          refreshToken,
          'get',
          `/account/users/byemail/${managerAddress}?searchlocked=false`
        )
        result.push({ userInfo, managerAddress: managerAddress, documentId: document[i].documentId })
      }
    }
    result.push({ managerAddress: managerAddress, documentId: document[i].documentId })
  }

  contactor = result.filter(
    (element) =>
      element.managerAddress !== '' &&
      element.managerAddress !== undefined &&
      validate.isValidEmail(element.managerAddress)
  )

  return contactor
}

module.exports = {
  getInbox: getInbox,
  getInvoiceDetail: getInvoiceDetail,
  getCode: getCode,
  insertAndUpdateJournalizeInvoice: insertAndUpdateJournalizeInvoice,
  getDepartment: getDepartment,
  getRequestApproval: getRequestApproval,
  getWorkflow: getWorkflow,
  getSearchResult: getSearchResult,
  getCompanyUserInfo: getCompanyUserInfo
}
