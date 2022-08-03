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
const containerClient = blobServiceClient.getContainerClient('imprint')

const upload = (tenantId, data) => {
  logger.info(constantsDefine.logMessage.INF000 + 'storageCommon upload')

  // Get a block blob client
  const blockBlobClient = containerClient.getBlockBlobClient(tenantId)

  console.log('\nUploading to Azure storage as blob:\n\t', tenantId)

  const result = blockBlobClient.upload(data, data.length)

  logger.info(constantsDefine.logMessage.INF001 + 'storageCommon upload')
  return result
}

const getImprint = (tenantId) => {
  logger.info(constantsDefine.logMessage.INF000 + 'storageCommon getImprint')
  // Get a block blob client
  const blockBlobClient = containerClient.getBlockBlobClient(tenantId)
  const downloadBlockBlobResponse = blockBlobClient.download(0)
  const result = streamToText(downloadBlockBlobResponse.readableStreamBody)

  console.log('\nDownloaded blob content...')
  console.log('\t', streamToText(downloadBlockBlobResponse.readableStreamBody))

  logger.info(constantsDefine.logMessage.INF001 + 'storageCommon getClient')
  return result
}

async function streamToText(readable) {
  readable.setEncoding('utf8')
  let data = ''
  for await (const chunk of readable) {
    data += chunk
  }
  return data
}

exports.upload = upload
exports.getImprint = getImprint
