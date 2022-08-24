const { v4: uuidv4 } = require('uuid')
const { getType } = require('./utils')

// CSVアップロードファイルヘッダー (PDF請求書)
const invoiceHeaderArray = [
  '登録番号',
  '請求書番号',
  '支払期日',
  '請求日',
  '納品日',
  '宛先企業名',
  '宛先郵便番号',
  '宛先都道府県',
  '宛先住所',
  '宛先ビル名/フロア等',
  '銀行名',
  '支店名',
  '科目',
  '口座番号',
  '口座名義',
  '備考',
  '請求書割引内容1',
  '請求書割引数値1',
  '請求書割引種別1',
  '請求書割引内容2',
  '請求書割引数値2',
  '請求書割引種別2',
  '請求書割引内容3',
  '請求書割引数値3',
  '請求書割引種別3',
  '明細-項目ID',
  '明細-内容',
  '明細-数量',
  '明細-単位',
  '明細-単価',
  '明細-税（消費税／軽減税率／不課税／免税／非課税／その他の消費税）',
  '明細-その他税ラベル',
  '明細-その他税額',
  '明細-割引内容1',
  '明細-割引数値1',
  '明細-割引種別1',
  '明細-割引内容2',
  '明細-割引数値2',
  '明細-割引種別2',
  '明細-割引内容3',
  '明細-割引数値3',
  '明細-割引種別3'
]

// CSVアップロードファイルヘッダーとCSV行データオブジェクトの対応表
const pdfInvoiceMapper = [
  { col: '登録番号', prop: 'sendRegistrationNo', modifier: null },
  { col: '請求書番号', prop: 'invoiceNo', modifier: null },
  { col: '支払期日', prop: 'paymentDate', modifier: null },
  { col: '請求日', prop: 'billingDate', modifier: null },
  { col: '納品日', prop: 'deliveryDate', modifier: null },
  { col: '宛先企業名', prop: 'recCompany', modifier: null },
  { col: '宛先郵便番号', prop: 'recPost', modifier: null },
  { col: '宛先都道府県', prop: 'recAddr1', modifier: null },
  { col: '宛先住所', prop: 'recAddr2', modifier: null },
  { col: '宛先ビル名/フロア等', prop: 'recAddr3', modifier: null },
  { col: '銀行名', prop: 'bankName', modifier: null },
  { col: '支店名', prop: 'branchName', modifier: null },
  { col: '科目', prop: 'accountType', modifier: null },
  { col: '口座番号', prop: 'accountNumber', modifier: null },
  { col: '口座名義', prop: 'accountName', modifier: null },
  { col: '備考', prop: 'note', modifier: null },
  { col: '請求書割引内容1', prop: 'inv-discountDescription1', modifier: (value, _) => convertEmptyStringToNull(value) },
  { col: '請求書割引数値1', prop: 'inv-discountAmount1', modifier: (value, _) => convertEmptyStringToNull(value) },
  { col: '請求書割引種別1', prop: 'inv-discountUnit1', modifier: (value, _) => convertEmptyStringToNull(value) },
  { col: '請求書割引内容2', prop: 'inv-discountDescription2', modifier: (value, _) => convertEmptyStringToNull(value) },
  { col: '請求書割引数値2', prop: 'inv-discountAmount2', modifier: (value, _) => convertEmptyStringToNull(value) },
  { col: '請求書割引種別2', prop: 'inv-discountUnit2', modifier: (value, _) => convertEmptyStringToNull(value) },
  { col: '請求書割引内容3', prop: 'inv-discountDescription3', modifier: (value, _) => convertEmptyStringToNull(value) },
  { col: '請求書割引数値3', prop: 'inv-discountAmount3', modifier: (value, _) => convertEmptyStringToNull(value) },
  { col: '請求書割引種別3', prop: 'inv-discountUnit3', modifier: (value, _) => convertEmptyStringToNull(value) },
  { col: '明細-項目ID', prop: 'lineId', modifier: null },
  { col: '明細-内容', prop: 'lineDescription', modifier: null },
  { col: '明細-数量', prop: 'quantity', modifier: null },
  { col: '明細-単位', prop: 'unit', modifier: null },
  { col: '明細-単価', prop: 'unitPrice', modifier: null },
  { col: '明細-税（消費税／軽減税率／不課税／免税／非課税／その他の消費税）', prop: 'taxType', modifier: null },
  { col: '明細-その他税ラベル', prop: 'line-taxLabel', modifier: (value, _) => convertEmptyStringToNull(value) },
  { col: '明細-その他税額', prop: 'line-taxAmount', modifier: (value, _) => convertEmptyStringToNull(value) },
  { col: '明細-割引内容1', prop: 'line-discountDescription1', modifier: (value, _) => convertEmptyStringToNull(value) },
  { col: '明細-割引数値1', prop: 'line-discountAmount1', modifier: (value, _) => convertEmptyStringToNull(value) },
  { col: '明細-割引種別1', prop: 'line-discountUnit1', modifier: (value, _) => convertEmptyStringToNull(value) },
  { col: '明細-割引内容2', prop: 'line-discountDescription2', modifier: (value, _) => convertEmptyStringToNull(value) },
  { col: '明細-割引数値2', prop: 'line-discountAmount2', modifier: (value, _) => convertEmptyStringToNull(value) },
  { col: '明細-割引種別2', prop: 'line-discountUnit2', modifier: (value, _) => convertEmptyStringToNull(value) },
  { col: '明細-割引内容3', prop: 'line-discountDescription3', modifier: (value, _) => convertEmptyStringToNull(value) },
  { col: '明細-割引数値3', prop: 'line-discountAmount3', modifier: (value, _) => convertEmptyStringToNull(value) },
  { col: '明細-割引種別3', prop: 'line-discountUnit3', modifier: (value, _) => convertEmptyStringToNull(value) }
]

/**
 * CSV文字列データを多次元配列データに変換する
 *
 * @param {string} csvString CSV文字列データ
 * @return {array[] | []} 多次元配列データ
 */
const convertCsvStringToMultiArray = (csvString) => {
  if (typeof csvString !== 'string') return null

  let rowArray = csvString.split(/\r?\n|\r/)

  for (let i = 0; i < rowArray.length; i++) {
    rowArray[i] = removeBOM(rowArray[i])
    rowArray[i] = rowArray[i].split(',')
  }

  // 空行を削除
  rowArray = rowArray.filter((row) => {
    let allEmpty = true
    row.forEach((col) => {
      if (col !== '') allEmpty = false
    })
    return !allEmpty
  })

  return rowArray
}

/**
 * 文字列データ(配列)をデータオブジェクトに変換する
 *
 * @param {string[]} csvStringArray CSV行文字列データ(配列)
 * @param {string[]} headerArray ヘッダーデータ(配列)
 * @param {object[]} stringMapper 変換対応表
 * @return {object | null} CSV行データオブジェクト
 */
const convertToDataObject = (csvStringArray, headerArray, stringMapper) => {
  if (!Array.isArray(csvStringArray) || !Array.isArray(headerArray) || !Array.isArray(stringMapper)) return null

  const dataObject = {}
  headerArray.forEach((col, index) => {
    stringMapper.forEach((mapper) => {
      if (col === mapper.col) {
        if (mapper.modifier) {
          const modifiedValue = mapper.modifier(csvStringArray[index], csvStringArray)
          dataObject[mapper.prop] = typeof modifiedValue === 'string' ? modifiedValue.trim() : modifiedValue
        } else {
          dataObject[mapper.prop] = csvStringArray[index].trim()
        }
      }
    })
  })

  return dataObject
}

const removeBOM = (str) => {
  return str.replace(/\ufeff/, '')
}

const convertEmptyStringToNull = (str) => {
  if (str === '') return null
  else return str
}

/**
 * データオブジェクト(配列)を請求書&明細データモデルに変換する
 * @param {*} csvArray データオブジェクトの配列
 * @param {*} senderInfo
 * @param {*} tenantId
 * @returns
 */
const convertCsvDataArrayToPdfInvoiceModels = (csvArray, senderInfo, tenantId) => {
  if (
    !Array.isArray(csvArray) ||
    csvArray.filter((row) => getType(row) === 'Object').length === 0 ||
    getType(senderInfo) !== 'Object' ||
    typeof tenantId !== 'string'
  ) {
    return { pdfInvoices: null, pdfInvoiceLines: null }
  }

  const pdfInvoices = [] // 変換済み請求書
  const pdfInvoiceLines = []
  let curInvoiceIdx = 0

  try {
    csvArray.forEach((row) => {
      const foundInvoices = pdfInvoices.filter((invoice) => invoice.invoiceNo === row.invoiceNo)
      let pdfInvoice = foundInvoices.length ? foundInvoices[foundInvoices.length - 1] : null
      if (!pdfInvoice || (pdfInvoice && pdfInvoice.index !== curInvoiceIdx - 1)) {
        pdfInvoice = {
          index: curInvoiceIdx, // 連続する請求書番号だけで同じ請求書扱いする為に一時的にプロパティを設ける
          sendTenantId: tenantId,
          invoiceId: uuidv4(),
          invoiceNo: row.invoiceNo,
          billingDate: new Date(row.billingDate),
          paymentDate: new Date(row.paymentDate),
          deliveryDate: new Date(row.deliveryDate),
          currency: 'JPY',
          recCompany: row.recCompany,
          recPost: row.recPost,
          recAddr1: row.recAddr1,
          recAddr2: row.recAddr2,
          recAddr3: row.recAddr3,
          sendCompany: senderInfo.sendCompany,
          sendPost: senderInfo.sendPost,
          sendAddr1: senderInfo.sendAddr1,
          sendAddr2: senderInfo.sendAddr2,
          sendAddr3: senderInfo.sendAddr3,
          sendRegistrationNo: row.sendRegistrationNo,
          bankName: row.bankName,
          branchName: row.branchName,
          accountType: row.accountType,
          accountName: row.accountName,
          accountNumber: row.accountNumber,
          note: row.note,
          discounts: getDiscountLength(row, 'invoice'),
          discountDescription1: row['inv-discountDescription1'],
          discountAmount1: row['inv-discountAmount1'],
          discountUnit1: row['inv-discountUnit1'],
          discountDescription2: row['inv-discountDescription2'],
          discountAmount2: row['inv-discountAmount2'],
          discountUnit2: row['inv-discountUnit2'],
          discountDescription3: row['inv-discountDescription3'],
          discountAmount3: row['inv-discountAmount3'],
          discountUnit3: row['inv-discountUnit3']
        }

        curInvoiceIdx++
        pdfInvoices.push(pdfInvoice)
      }
      const invoiceId = pdfInvoice.invoiceId
      const lineIndex = pdfInvoiceLines.filter((line) => line.invoiceId === invoiceId).length

      const line = {
        invoiceId,
        lineIndex,
        lineId: row.lineId,
        lineDescription: row.lineDescription,
        unit: row.unit,
        unitPrice: row.unitPrice,
        quantity: row.quantity,
        taxType: row.taxType,
        taxLabel: row.taxType === 'その他の消費税' ? row['line-taxLabel'] : null, // taxTypeが'その他'以外の場合は設定しない
        taxAmount: row.taxType === 'その他の消費税' ? row['line-taxAmount'] : null, // taxTypeが'その他'以外の場合は設定しない
        discounts: getDiscountLength(row, 'line'),
        discountDescription1: row['line-discountDescription1'],
        discountAmount1: row['line-discountAmount1'],
        discountUnit1: row['line-discountUnit1'],
        discountDescription2: row['line-discountDescription2'],
        discountAmount2: row['line-discountAmount2'],
        discountUnit2: row['line-discountUnit2'],
        discountDescription3: row['line-discountDescription3'],
        discountAmount3: row['line-discountAmount3'],
        discountUnit3: row['line-discountUnit3'],
        invoiceNo: row.invoiceNo // CSV行テーブルレコード作成の為、一時的に設けるプロパティ
      }

      pdfInvoiceLines.push(line)
    })
  } catch (error) {
    console.error(error)
    return { pdfInvoices: null, pdfInvoiceLines: null }
  }

  // 不要なプロパティを削除
  pdfInvoices.forEach((invoice) => {
    delete invoice.index
  })

  return { pdfInvoices, pdfInvoiceLines }
}

// CSV行情報から 請求書割引 or 明細割引数 を求める
const getDiscountLength = (row, discountType) => {
  let count = 0

  if (discountType === 'invoice') {
    if (row['inv-discountDescription1'] && row['inv-discountAmount1'] && row['inv-discountUnit1']) count++ // 請求書割引1の情報が全部入力されている場合
    if (row['inv-discountDescription2'] && row['inv-discountAmount2'] && row['inv-discountUnit2']) count++ // 請求書割引2の情報が全部入力されている場合
    if (row['inv-discountDescription3'] && row['inv-discountAmount3'] && row['inv-discountUnit3']) count++ // 請求書割引3の情報が全部入力されている場合
  } else if (discountType === 'line') {
    if (row['line-discountDescription1'] && row['line-discountAmount1'] && row['line-discountUnit1']) count++ // 明細割引1の情報が全部入力されている場合
    if (row['line-discountDescription2'] && row['line-discountAmount2'] && row['line-discountUnit2']) count++ // 明細割引2の情報が全部入力されている場合
    if (row['line-discountDescription3'] && row['line-discountAmount3'] && row['line-discountUnit3']) count++ // 明細割引3の情報が全部入力されている場合
  }

  return count
}

module.exports = {
  convertCsvStringToMultiArray,
  removeBOM,
  pdfInvoiceMapper,
  invoiceHeaderArray,
  convertToDataObject,
  convertCsvDataArrayToPdfInvoiceModels,
  getDiscountLength
}
