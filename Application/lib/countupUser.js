const fs = require('fs')
const { BlobServiceClient } = require('@azure/storage-blob')
const ExcelJS = require('exceljs')
const logger = require('./logger')

const blobServiceClient = BlobServiceClient.fromConnectionString(process.env.AZURE_STORAGE_CONNECTION_STRING)
const containerName = process.env.STORAGE_CONTAINER_NAME
const containerClient = blobServiceClient.getContainerClient(containerName)
const blobName = process.env.BLOB_NAME
const blockBlobClient = containerClient.getBlockBlobClient(blobName)

const countupUser = async (tenant) => {
  try {
    // ファイルが存在するか確認する
    const isExist = await blockBlobClient.exists()

    const workbook = new ExcelJS.Workbook()
    let worksheet

    if (isExist) {
      // ダウンロード
      await blockBlobClient.downloadToFile(blobName, 0, undefined)
      await workbook.xlsx.readFile(blobName)
      worksheet = workbook.getWorksheet('user_count')
    } else {
      // ファイル新規作成
      worksheet = workbook.addWorksheet('user_count')
      const dateCell = worksheet.getCell('A1')
      dateCell.value = 'date'
      const dxstoreCell = worksheet.getCell('B1')
      dxstoreCell.value = 'dxstore'
    }

    // カラムにキーを設定
    const dateCol = worksheet.getColumn('A')
    dateCol.key = 'date'
    const dxstoreCol = worksheet.getColumn('B')
    dxstoreCol.key = 'dxstore'

    // カウントアップするカラムを取得
    const currentRow = getCurrentRow(worksheet)

    // カウントアップするセルを取得し、カウントアップ
    const tenantColumn = getTenantColumn(tenant)
    if (!tenantColumn) return
    const userCountCell = currentRow.getCell(tenantColumn)
    userCountCell.value = ++userCountCell.value

    // エクセルを保存
    await workbook.xlsx.writeFile(blobName)

    // アップロード
    const fileStream = fs.createReadStream(blobName)
    const blobOptions = {
      blobHTTPHeaders: { blobContentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }
    }
    await blockBlobClient.uploadStream(fileStream, undefined, undefined, blobOptions)

    // 一時ファイルの削除
    fs.unlink(blobName, (err) => {
      if (err) {
        logger.error(err)
      }
    })
  } catch (err) {
    logger.error(err)
  }
}

const getTenantColumn = (tenant) => {
  if (tenant === 'dxstore') {
    return 'B'
  } else {
    return null
  }
}

const getCurrentRow = (worksheet) => {
  const nowDate = new Date()
  const lastDate = getLastDate(worksheet)

  if (
    lastDate &&
    typeof lastDate !== 'string' &&
    nowDate.getFullYear() === lastDate.getFullYear() &&
    nowDate.getDate() === lastDate.getDate()
  ) {
    return worksheet.getRow(worksheet.rowCount)
  } else {
    const year = nowDate.getFullYear()
    const month = nowDate.getMonth() + 1
    const day = nowDate.getDate()

    return worksheet.addRow({ date: new Date(`${year}-${month}-${day}`) })
  }
}

const getLastDate = (worksheet) => {
  const lastDateCellAdress = `A${worksheet.rowCount}`
  const lastDateCell = worksheet.getCell(lastDateCellAdress)

  return lastDateCell.value
}

module.exports = {
  countupUser,
  getTenantColumn,
  getCurrentRow,
  getLastDate
}
