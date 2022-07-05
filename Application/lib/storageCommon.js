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

const upload = (blobName) => {
  logger.info(constantsDefine.logMessage.INF000 + 'storageCommon getClient')

  // Get a block blob client
  const blockBlobClient = containerClient.getBlockBlobClient(blobName)

  console.log('\nUploading to Azure storage as blob:\n\t', blobName)

  // Upload data to the blob
  const data = 'Hello, World!'
  const result = blockBlobClient.upload(data, data.length)

  logger.info(constantsDefine.logMessage.INF001 + 'storageCommon getClient')
  return result
}

const getImprint = (tenantId) => {
  logger.info(constantsDefine.logMessage.INF000 + 'storageCommon getClient')
  const downloadBlockBlobResponse = blockBlobClient.download(0)
  console.log('\nDownloaded blob content...')
  console.log('\t', streamToText(downloadBlockBlobResponse.readableStreamBody))

  // Convert stream to text
  async function streamToText(readable) {
    readable.setEncoding('utf8')
    let data = ''
    for await (const chunk of readable) {
      data += chunk
    }
    return data
  }
  logger.info(constantsDefine.logMessage.INF001 + 'storageCommon getClient')
  return result
}
exports.upload = upload
exports.getImprint = getImprint
