const { BlobServiceClient } = require('@azure/storage-blob')
require('dotenv').config()
const logger = require('./logger')
const constantsDefine = require('../constants')

// const AZURE_STORAGE_CONNECTION_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING
const AZURE_STORAGE_CONNECTION_STRING =
  'DefaultEndpointsProtocol=https;AccountName=bcdappsstoragedev;AccountKey=+FcB8p0pXG9i4glq4iWTOZYU5+sOR590fSqFl7NkrZCb1eQehuxxAwl1w8hIyAW1xs1R7N/6OuwU+AStPv+oFQ==;EndpointSuffix=core.windows.net'

// 環境変数取得
if (!AZURE_STORAGE_CONNECTION_STRING) {
  throw Error('Azure Storage Connection string not found')
}
// BlobServiceClientクラスのインスタンス生成
const blobServiceClient = BlobServiceClient.fromConnectionString(AZURE_STORAGE_CONNECTION_STRING)
// コンテナ接続
const containerClient = blobServiceClient.getContainerClient('sealimp')

async function getSealImp(tenantId) {
  logger.info(constantsDefine.logMessage.INF000 + 'storageCommon getSealImp')

  let sealImp = null
  try {
    const blockBlobClient = containerClient.getBlockBlobClient(tenantId)
    const download = await blockBlobClient.download(0)
    if (download.readableStreamBody) {
      sealImp = await streamToBuffer(download.readableStreamBody)
    }
  } catch (error) {
    // 取得できない場合、nullを返却
    console.log(error)
  }

  logger.info(constantsDefine.logMessage.INF001 + 'storageCommon getSealImp')
  return sealImp
}

async function upload(tenantId, data) {
  logger.info(constantsDefine.logMessage.INF000 + 'storageCommon upload')

  // テナントIDをキーにデータ登録する
  let result = null
  try {
    const blockBlobClient = containerClient.getBlockBlobClient(tenantId)
    result = await blockBlobClient.upload(data, data.length)
  } catch (error) {
    console.log(error)
  }

  logger.info(constantsDefine.logMessage.INF001 + 'storageCommon upload')
  return result
}

async function deleteSealImp(tenantId) {
  logger.info(constantsDefine.logMessage.INF000 + 'storageCommon deleteSealImp')

  let result = null
  try {
    const blockBlobClient = containerClient.getBlockBlobClient(tenantId)
    result = await blockBlobClient.delete()
  } catch (error) {
    console.log(error)
  }

  logger.info(constantsDefine.logMessage.INF001 + 'storageCommon deleteSealImp')
  return result
}

async function streamToBuffer(readableStream) {
  return new Promise((resolve, reject) => {
    const chunks = []
    readableStream.on('data', (data) => {
      chunks.push(data instanceof Buffer ? data : Buffer.from(data))
    })
    readableStream.on('end', () => {
      resolve(Buffer.concat(chunks))
    })
    readableStream.on('error', reject)
  })
}

exports.upload = upload
exports.getSealImp = getSealImp
exports.deleteSealImp = deleteSealImp
