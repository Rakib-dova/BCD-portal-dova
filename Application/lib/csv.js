// CSVアップロードファイルヘッダー (PDF請求書)
const invoiceHeaderArray = [
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
  '明細-項目ID',
  '明細-内容',
  '明細-数量',
  '明細-単位',
  '明細-単価',
  '明細-税（消費税／軽減税率／不課税／免税／非課税）'
]

// CSVアップロードファイルヘッダーとCSV行データオブジェクトの対応表
const pdfInvoiceMapper = [
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
  { col: '明細-項目ID', prop: 'lineId', modifier: null },
  { col: '明細-内容', prop: 'lineDiscription', modifier: null },
  { col: '明細-数量', prop: 'quantity', modifier: null },
  { col: '明細-単位', prop: 'unit', modifier: null },
  { col: '明細-単価', prop: 'unitPrice', modifier: null },
  { col: '明細-税（消費税／軽減税率／不課税／免税／非課税）', prop: 'taxType', modifier: null }
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

  // 末尾に付く空配列を取り除く処理
  rowArray = rowArray.filter((row) => row[0] !== '')

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
