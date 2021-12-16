'use strict'

const ExcelJS = require('../../Application/node_modules/exceljs')
const { getTenantColumn, getCurrentRow } = require('../../Application/lib/countupUser')

jest.mock('../../Application/node_modules/@azure/storage-blob', () => ({
  BlobServiceClient: {
    fromConnectionString
  }
}))
const fromConnectionString = () => ({
  getContainerClient: () => {
    return {
      getBlockBlobClient: () => {
        return {
          exists: (flag) => flag,
          downloadToFile: () => {},
          uploadStream: () => {}
        }
      }
    }
  }
})

const { BlobServiceClient } = require('../../Application/node_modules/@azure/storage-blob')
const blobServiceClient = BlobServiceClient.fromConnectionString()
const containerClient = blobServiceClient.getContainerClient()
const blockBlobClient = containerClient.getBlockBlobClient()
const tenant = 'dxstore'

describe('ユーザーカウントアップ機能の単体テスト', () => {
  let workbook, worksheet

  test('ファイルが存在しない場合、ファイル生成', async () => {
    workbook = new ExcelJS.Workbook()
    const isExist = await blockBlobClient.exists(false)

    if (!isExist) {
      worksheet = workbook.addWorksheet('user_count')
      const dateCell = worksheet.getCell('A1')
      dateCell.value = 'date'
      const dxstoreCell = worksheet.getCell('B1')
      dxstoreCell.value = 'dxstore'
      const headerRow = worksheet.getRow(1)

      expect(worksheet.name).toEqual('user_count')
      expect(headerRow.getCell('A').value).toEqual('date')
      expect(headerRow.getCell('B').value).toEqual('dxstore')
    }
  })

  test('ファイルが存在する場合、ファイルを開きuser_countシートを取得する', async () => {
    const isExist = await blockBlobClient.exists(true)

    if (isExist) {
      worksheet = workbook.getWorksheet('user_count')

      // カラムにキーを設定
      const dateCol = worksheet.getColumn('A')
      dateCol.key = 'date'
      const dxstoreCol = worksheet.getColumn('B')
      dxstoreCol.key = 'dxstore'

      expect(worksheet.name).toEqual('user_count')
    }
  })

  test('新規レコード挿入の場合、新規の行が挿入され、カウントアップ後の値が1', async () => {
    const currentRow = getCurrentRow(worksheet)
    const tenantColumn = getTenantColumn(tenant)
    const userCountCell = currentRow.getCell(tenantColumn)
    userCountCell.value = ++userCountCell.value

    expect(userCountCell.value).toEqual(1)
  })

  test('最終行の日付が今日より前の場合、新規の行が挿入され、カウントアップ後の値が1', async () => {
    // 最終号の日付を今日より前にする
    let currentRow = getCurrentRow(worksheet)
    const currentDateCell = currentRow.getCell('date')
    currentDateCell.value = new Date('2021-01-01')

    currentRow = getCurrentRow(worksheet)
    const currentRowDate = currentRow.getCell('date')
    const today = new Date()
    const todayString = new Date(`${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`).toString()

    expect(currentRowDate.value.toString()).toEqual(todayString)

    const tenantColumn = getTenantColumn(tenant)
    const userCountCell = currentRow.getCell(tenantColumn)
    userCountCell.value = ++userCountCell.value

    expect(userCountCell.value).toEqual(1)
  })

  test('最終行の日付が今日の場合、最終行がカウントアップされ、値が2', async () => {
    const currentRow = getCurrentRow(worksheet)
    const tenantColumn = getTenantColumn(tenant)
    const userCountCell = currentRow.getCell(tenantColumn)
    userCountCell.value = ++userCountCell.value

    expect(userCountCell.value).toEqual(2)
  })
})
