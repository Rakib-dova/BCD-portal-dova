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
  '明細-税（消費税／軽減税率／不課税／免税／非課税）',
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
  { col: '請求書割引内容1', prop: 'inv-discountDescription1', modifier: null },
  { col: '請求書割引数値1', prop: 'inv-discountAmount1', modifier: null },
  { col: '請求書割引種別1', prop: 'inv-discountUnit1', modifier: null },
  { col: '請求書割引内容2', prop: 'inv-discountDescription2', modifier: null },
  { col: '請求書割引数値2', prop: 'inv-discountAmount2', modifier: null },
  { col: '請求書割引種別2', prop: 'inv-discountUnit2', modifier: null },
  { col: '請求書割引内容3', prop: 'inv-discountDescription3', modifier: null },
  { col: '請求書割引数値3', prop: 'inv-discountAmount3', modifier: null },
  { col: '請求書割引種別3', prop: 'inv-discountUnit3', modifier: null },
  { col: '明細-項目ID', prop: 'lineId', modifier: null },
  { col: '明細-内容', prop: 'lineDescription', modifier: null },
  { col: '明細-数量', prop: 'quantity', modifier: null },
  { col: '明細-単位', prop: 'unit', modifier: null },
  { col: '明細-単価', prop: 'unitPrice', modifier: null },
  { col: '明細-税（消費税／軽減税率／不課税／免税／非課税）', prop: 'taxType', modifier: null },
  { col: '明細-割引内容1', prop: 'line-discountDescription1', modifier: null },
  { col: '明細-割引数値1', prop: 'line-discountAmount1', modifier: null },
  { col: '明細-割引種別1', prop: 'line-discountUnit1', modifier: null },
  { col: '明細-割引内容2', prop: 'line-discountDescription2', modifier: null },
  { col: '明細-割引数値2', prop: 'line-discountAmount2', modifier: null },
  { col: '明細-割引種別2', prop: 'line-discountUnit2', modifier: null },
  { col: '明細-割引内容3', prop: 'line-discountDescription3', modifier: null },
  { col: '明細-割引数値3', prop: 'line-discountAmount3', modifier: null },
  { col: '明細-割引種別3', prop: 'line-discountUnit3', modifier: null }
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
    row.forEach((col) => { if (col !== '') allEmpty = false })
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

module.exports = {
  convertCsvStringToMultiArray,
  removeBOM,
  pdfInvoiceMapper,
  invoiceHeaderArray,
  convertToDataObject
}
