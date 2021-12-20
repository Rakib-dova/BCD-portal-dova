'use stric'

const qs = require('qs')
const logger = require('../../Application/lib/logger')

module.exports = async (accessToken, refreshToken, method, query, body = {}, config = {}) => {
  let retryCount = 0
  if (config.headers === undefined) {
    config = {
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${accessToken}`
      }
    }
  }
  const access = async (_accessToken, _method, _query, _body = {}, _config) => {
    try {
      if (_method === 'get') {
        const res = await axios.get(`${_query}`, _config)
        return res.data
      }
    } catch (error) {
      retryCount++
      if (error.response?.status === '401' && Number(retryCount) === 1) {
        const TS_CLIENT_ID = 'tmp1234'
        const TS_CLIENT_SECRET = 'abc1234'
        const TS_APP_VERSION = 1
        const appToken = Buffer.from(`${TS_CLIENT_ID}:${TS_CLIENT_SECRET}`).toString('base64')

        try {
          const refreshed = await axios.post(
            '/tradeshift/auth/token',
            qs.stringify({
              grant_type: 'refresh_token',
              refresh_token: refreshToken,
              scope: `${TS_CLIENT_ID}.${TS_APP_VERSION}`
            }),
            {
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                Authorization: `Basic ${appToken}`
              }
            }
          )

          return access(refreshed.data.access_token, _method, _query, _body)
        } catch (error) {
          logger.error({ stack: error.stack, status: 1 }, 'Tradeshift API Access: refresh failure')
          return error
        }
      } else {
        logger.error({ stack: error.stack, status: 1 }, 'Tradeshift API Access: access failure')
        return error
      }
    }
  }
  return await access(accessToken, method, query, body, config)
}

const axios = {
  result: {
    response: {
      status: null
    }
  },
  get: async function (url, config) {
    url = url
      .replace('/documents?', '')
      .replace('withouttag=archived', '')
      .replace('&withouttag=AP_DOCUMENT_DRAFT', '')
      .replace('&withouttag=PARTNER_DOCUMENT_DRAFT', '')
      .replace('&withouttag=tsgo-document', '')
      .replace('&_onlyIndex=true', '')
      .replace('&ascending=false', '')
      .replace('&onlydeleted=false', '')
      .replace('&onlydrafts=false', '')
      .replace('&stag=sales', '')
      .replace('&stag=purchases', '')
      .replace('&stag=draft', '')
      .replace('&type=invoice', '')
      .replace('&', '')

    const paramateter = {}
    url.split('&').forEach((item) => {
      const keyValue = item.split('=')
      if (keyValue[0] === 'state' && paramateter[`${keyValue[0]}`] === undefined) {
        paramateter[`${keyValue[0]}`] = []
        paramateter[`${keyValue[0]}`].push(keyValue[1])
      } else if (keyValue[0] === 'state' && paramateter[`${keyValue[0]}`] !== undefined) {
        paramateter[`${keyValue[0]}`].push(keyValue[1])
      } else {
        paramateter[`${keyValue[0]}`] = keyValue[1]
      }
    })

    const businessId = paramateter.businessId || null
    url = businessId !== null ? 'bussinessId' : url
    // console.log(url)
    switch (url) {
      case 'bussinessId': {
        switch (businessId) {
          case 'A01000': {
            this.result.data = {
              itemPerPage: 25,
              itemCount: 0,
              indexing: false,
              numPages: 0,
              pageId: 0,
              Document: []
            }
            break
          }
          case 'A01010': {
            this.result.data = new Error('Request failed with status code 404')
            this.result.data.response = {
              status: 400
            }
            break
          }
          default: {
            const invoiceId = {
              A01001: 0,
              A01002: 1,
              A01003: 2,
              A01004: 3,
              A01005: 4,
              A01006: 5,
              A01007: 6,
              A: 7,
              A01009: 8,
              A01011: 9,
              A01012: 10,
              A01013: 11,
              A01014: 12,
              A01015: 13,
              A01016: 14,
              A01017: 15,
              A01018: 16,
              A01019: 17,
              A01020: 18,
              A01021: 19,
              A01022: 20,
              A01023: 21,
              A01024: 22,
              A01025: 23,
              A01026: 24,
              A01027: 25,
              A01028: 26,
              A01029: 27,
              A01030: 28,
              A01031: 29,
              A01032: 30,
              A01033: 31,
              A01034: 32
            }
            this.result.data = {
              itemPerPage: 25,
              itemCount: 1,
              indexing: false,
              numPages: 2,
              pageId: 0,
              Document: [dcouments.Document[invoiceId[businessId]]]
            }
          }
        }
        return this.result
      }
      case '/documents/1f3ce3dc-4dbb-548a-a090-d39dc604a6e1': {
        const invoice = require('../mockInvoice/invoice1')
        return { data: invoice }
      }
      case '/documents/79b516e2-9d51-57fb-95cc-9581abe715bb': {
        const invoice = require('../mockInvoice/invoice2')
        return { data: invoice }
      }
      case '/documents/c7288ecd-48bf-5254-abfc-17b7207e83e5': {
        const invoice = require('../mockInvoice/invoice3')
        return { data: invoice }
      }
      case '/documents/5d7f0fb0-b873-4b64-acfe-a01533b3476c': {
        const invoice = require('../mockInvoice/invoice4')
        return { data: invoice }
      }
      case '/documents/46538d1b-9036-457d-bd4f-d3d0e167d430': {
        const invoice = require('../mockInvoice/invoice5')
        return { data: invoice }
      }
      case '/documents/c08d3bb7-9807-4180-9ceb-b842c482300e': {
        const invoice = require('../mockInvoice/invoice6')
        return { data: invoice }
      }
      case '/documents/c1aa94c2-f6c9-465a-911f-a2cd4beed0b0': {
        const invoice = require('../mockInvoice/invoice7')
        return { data: invoice }
      }
      case '/documents/c1aa94c2-f6c9-465a-911f-a2cd4b123456': {
        const invoice = require('../mockInvoice/invoice8')
        return { data: invoice }
      }
      case '/documents/c1aa94c2-f6c9-465a-911f-a2cd4babcd12': {
        const invoice = require('../mockInvoice/invoice9')
        return { data: invoice }
      }
      case '/documents/c1aa94c2-f6c9-465a-911f-a2cd4b654321': {
        this.result.data = new Error('Request failed with status code 404')
        this.result.data.response = {
          status: 404
        }
        return this.result
      }
      case '/documents/c1aa94c2-f6c9-465a-911f-a2cd4babcd13': {
        const invoice = require('../mockInvoice/invoice10')
        return { data: invoice }
      }
      case '/documents/c1aa94c2-f6c9-465a-911f-a2cd4babcd14': {
        const invoice = require('../mockInvoice/invoice11')
        return { data: invoice }
      }
      case '/documents/c1aa94c2-f6c9-465a-911f-a2cd4babcd15': {
        const invoice = require('../mockInvoice/invoice12')
        return { data: invoice }
      }
      case '/documents/c1aa94c2-f6c9-465a-911f-a2cd4babcd16': {
        const invoice = require('../mockInvoice/invoice13')
        return { data: invoice }
      }
      case '/documents/c1aa94c2-f6c9-465a-911f-a2cd4babcd17': {
        const invoice = require('../mockInvoice/invoice14')
        return { data: invoice }
      }
      case '/documents/c1aa94c2-f6c9-465a-911f-a2cd4babcd18': {
        const invoice = require('../mockInvoice/invoice15')
        return { data: invoice }
      }
      case '/documents/c1aa94c2-f6c9-465a-911f-a2cd4babcd19': {
        const invoice = require('../mockInvoice/invoice16')
        return { data: invoice }
      }
      case '/documents/c1aa94c2-f6c9-465a-911f-a2cd4babcd20': {
        const invoice = require('../mockInvoice/invoice17')
        return { data: invoice }
      }
      case '/documents/c1aa94c2-f6c9-465a-911f-a2cd4babcd21': {
        const invoice = require('../mockInvoice/invoice18')
        return { data: invoice }
      }
      case '/documents/c1aa94c2-f6c9-465a-911f-a2cd4babcd22': {
        const invoice = require('../mockInvoice/invoice19')
        return { data: invoice }
      }
      case '/documents/c1aa94c2-f6c9-465a-911f-a2cd4babcd23': {
        const invoice = require('../mockInvoice/invoice20')
        return { data: invoice }
      }
      case '/documents/c1aa94c2-f6c9-465a-911f-a2cd4babcd24': {
        const invoice = require('../mockInvoice/invoice21')
        return { data: invoice }
      }
      case '/documents/c1aa94c2-f6c9-465a-911f-a2cd4babcd25': {
        const invoice = require('../mockInvoice/invoice22')
        return { data: invoice }
      }
      case '/documents/c1aa94c2-f6c9-465a-911f-a2cd4babcd26': {
        const invoice = require('../mockInvoice/invoice23')
        return { data: invoice }
      }
      case '/documents/c1aa94c2-f6c9-465a-911f-a2cd4babcd27': {
        const invoice = require('../mockInvoice/invoice24')
        return { data: invoice }
      }
      case '/documents/c1aa94c2-f6c9-465a-911f-a2cd4babcd28': {
        const invoice = require('../mockInvoice/invoice25')
        return { data: invoice }
      }
      case '/documents/c1aa94c2-f6c9-465a-911f-a2cd4babcd29': {
        const invoice = require('../mockInvoice/invoice26')
        return { data: invoice }
      }
      case '/documents/c1aa94c2-f6c9-465a-911f-a2cd4babcd30': {
        const invoice = require('../mockInvoice/invoice27')
        return { data: invoice }
      }
      case '/documents/c1aa94c2-f6c9-465a-911f-a2cd4babcd31': {
        const invoice = require('../mockInvoice/invoice28')
        return { data: invoice }
      }
      case '/documents/c1aa94c2-f6c9-465a-911f-a2cd4babcd32': {
        const invoice = require('../mockInvoice/invoice29')
        return { data: invoice }
      }
      case '/documents/c1aa94c2-f6c9-465a-911f-a2cd4babcd33': {
        const invoice = require('../mockInvoice/invoice30')
        return { data: invoice }
      }
      case '/documents/c1aa94c2-f6c9-465a-911f-a2cd4babcd34': {
        const invoice = require('../mockInvoice/invoice31')
        return { data: invoice }
      }
      case '/documents/c1aa94c2-f6c9-465a-911f-a2cd4babcd35': {
        const error = new Error('csv download error')
        error.response = {
          status: 401
        }
        return {
          data: error
        }
      }
      default: {
        if (paramateter.minIssuedate === '1990-01-01') {
          console.log('default 1')
          this.result.data = {
            itemPerPage: 25,
            itemCount: 1,
            indexing: false,
            numPages: 2,
            pageId: 0,
            Document: [dcouments.Document[0], dcouments.Document[8]]
          }
        } else if (
          paramateter.state.join('') === 'DELIVEREDACCEPTEDPAID_UNCONFIRMEDPAID_CONFIRMED' &&
          paramateter.minissuedate === '9999-99-99' &&
          paramateter.maxissuedate === '9999-99-99'
        ) {
          this.result.data = {
            itemPerPage: 25,
            itemCount: 1,
            indexing: false,
            numPages: 1,
            pageId: 0,
            Document: [dcouments.Document[32]]
          }
        } else {
          this.result.data = {
            itemPerPage: 25,
            itemCount: 1,
            indexing: false,
            numPages: 2,
            pageId: 0,
            Document: [dcouments.Document[0], dcouments.Document[1]]
          }
        }
        return this.result
      }
    }
  },
  post: async function (url, queryString, config) {
    switch (url) {
      case '/tradeshift/auth/token': {
        axios.result.data.access_token = 'success'
        return axios.result
      }
    }
  }
}

const dcouments = {
  itemsPerPage: 25,
  itemCount: 6,
  indexing: false,
  numPages: 1,
  pageId: 0,
  Document: [
    {
      DocumentId: '1f3ce3dc-4dbb-548a-a090-d39dc604a6e1',
      ID: 'A01001',
      URI: 'https://api-sandbox.tradeshift.com/tradeshift/rest/external/documents/1f3ce3dc-4dbb-548a-a090-d39dc604a6e1',
      DocumentType: {
        mimeType: 'text/xml',
        documentProfileId: 'ubl.invoice.2.1.jp',
        type: 'invoice'
      },
      State: 'LOCKED',
      CreatedDateTime: '2021-08-23T08:58:42.799Z',
      LastEdit: '2021-08-23T08:58:42.799Z',
      SenderCompanyName: 'Test',
      Actor: {
        Created: '2021-05-17T08:12:48.291Z',
        Modified: '2021-08-03T02:14:08.401Z',
        FirstName: 'インテグレーション',
        LastName: '管理者',
        Email: 'inte.kanri.user@gmail.com',
        MobileNumberVerified: false
      },
      ConversationId: 'baf6b262-b94e-408f-8163-71a7ef255de5',
      ReceivedToCompanyAccountId: '221559d0-53aa-44a2-ab29-0c4a6cb02bde',
      Tags: {
        Tag: []
      },
      ItemInfos: [
        {
          type: 'document.description',
          value: 'テスト'
        },
        {
          type: 'document.total',
          value: '100.00'
        },
        {
          type: 'document.currency',
          value: 'JPY'
        },
        {
          type: 'document.issuedate',
          value: '2021-08-23'
        }
      ],
      LatestDispatch: {
        DispatchId: 'c2f54bf5-8a0e-49aa-876f-51b04cea26df',
        ObjectId: '1f3ce3dc-4dbb-548a-a090-d39dc604a6e1',
        Created: '2021-08-23T08:58:43.901Z',
        SenderUserId: '53607702-b94b-4a94-9459-6cf3acd65603',
        DispatchState: 'COMPLETED',
        LastStateChange: '2021-08-23T08:58:43.901Z'
      },
      SentReceivedTimestamp: '2021-08-23T08:58:42.799Z',
      ProcessState: 'PENDING',
      ConversationStates: [
        {
          Axis: 'PROCESS',
          State: 'PENDING',
          Timestamp: '2021-08-23T08:58:42.799Z'
        },
        {
          Axis: 'OTHERPART',
          State: 'OTHER_PENDING',
          Timestamp: '2021-08-23T08:58:44.179Z'
        },
        {
          Axis: 'DELIVERY',
          State: 'RECEIVED',
          Timestamp: '2021-08-23T08:58:42.799Z'
        }
      ],
      UnifiedState: 'DELIVERED',
      CopyIndicator: false,
      Deleted: false,
      TenantId: '221559d0-53aa-44a2-ab29-0c4a6cb02bde',
      Properties: []
    },
    {
      DocumentId: '79b516e2-9d51-57fb-95cc-9581abe715bb',
      ID: 'A01002',
      URI: 'https://api-sandbox.tradeshift.com/tradeshift/rest/external/documents/79b516e2-9d51-57fb-95cc-9581abe715bb',
      DocumentType: {
        mimeType: 'text/xml',
        documentProfileId: 'ubl.invoice.2.1.jp',
        type: 'invoice'
      },
      State: 'LOCKED',
      CreatedDateTime: '2021-08-20T06:12:22.706Z',
      LastEdit: '2021-08-20T06:12:22.706Z',
      SenderCompanyName: 'test',
      Actor: {
        Created: '2021-05-17T08:12:48.291Z',
        Modified: '2021-08-03T02:14:08.401Z',
        FirstName: 'インテグレーション',
        LastName: '管理者',
        Email: 'inte.kanri.user@gmail.com',
        MobileNumberVerified: false
      },
      ConversationId: '55cf7774-2946-44d7-b6a2-8623f9fd32b4',
      ReceivedToCompanyAccountId: '221559d0-53aa-44a2-ab29-0c4a6cb02bde',
      Tags: {
        Tag: []
      },
      ItemInfos: [
        {
          type: 'document.description',
          value: 'test'
        },
        {
          type: 'document.total',
          value: '1100.00'
        },
        {
          type: 'document.currency',
          value: 'JPY'
        },
        {
          type: 'document.issuedate',
          value: '2021-08-20'
        },
        {
          type: 'invoice.due',
          value: '2021-08-22'
        }
      ],
      LatestDispatch: {
        DispatchId: '5f70565a-a445-4310-8ff6-e4d5e9848ef6',
        ObjectId: '79b516e2-9d51-57fb-95cc-9581abe715bb',
        Created: '2021-08-20T06:12:24.089Z',
        SenderUserId: '53607702-b94b-4a94-9459-6cf3acd65603',
        DispatchState: 'COMPLETED',
        LastStateChange: '2021-08-20T06:12:24.089Z'
      },
      SentReceivedTimestamp: '2021-08-20T06:12:22.706Z',
      ProcessState: 'PENDING',
      ConversationStates: [
        {
          Axis: 'PROCESS',
          State: 'PENDING',
          Timestamp: '2021-08-20T06:12:22.706Z'
        },
        {
          Axis: 'OTHERPART',
          State: 'OTHER_OVERDUE',
          Timestamp: '2021-08-23T13:51:36.556Z'
        },
        {
          Axis: 'DELIVERY',
          State: 'RECEIVED',
          Timestamp: '2021-08-20T06:12:22.706Z'
        }
      ],
      UnifiedState: 'OVERDUE',
      CopyIndicator: false,
      Deleted: false,
      DueDate: '2021-08-22',
      TenantId: '221559d0-53aa-44a2-ab29-0c4a6cb02bde',
      Properties: []
    },
    {
      DocumentId: 'c7288ecd-48bf-5254-abfc-17b7207e83e5',
      ID: 'A01003',
      URI: 'https://api-sandbox.tradeshift.com/tradeshift/rest/external/documents/c7288ecd-48bf-5254-abfc-17b7207e83e5',
      DocumentType: {
        mimeType: 'text/xml',
        documentProfileId: 'ubl.invoice.2.1.jp',
        type: 'invoice'
      },
      State: 'LOCKED',
      CreatedDateTime: '2021-08-13T10:07:08.674Z',
      LastEdit: '2021-08-13T10:07:08.674Z',
      SenderCompanyName: 'test',
      Actor: {
        Created: '2021-05-17T08:12:48.291Z',
        Modified: '2021-08-03T02:14:08.401Z',
        FirstName: 'インテグレーション',
        LastName: '管理者',
        Email: 'inte.kanri.user@gmail.com',
        MobileNumberVerified: false
      },
      ConversationId: '74244ab9-eb0d-463a-9b81-382f0d38fa7d',
      ReceivedToCompanyAccountId: '221559d0-53aa-44a2-ab29-0c4a6cb02bde',
      Tags: {
        Tag: []
      },
      ItemInfos: [
        {
          type: 'document.description',
          value: 'PC'
        },
        {
          type: 'document.total',
          value: '11000000.00'
        },
        {
          type: 'document.currency',
          value: 'JPY'
        },
        {
          type: 'document.issuedate',
          value: '2021-06-22'
        },
        {
          type: 'invoice.due',
          value: '2021-05-31'
        }
      ],
      LatestDispatch: {
        DispatchId: 'd32eeb4b-bc88-483f-884f-d1a9eba9e4cc',
        ObjectId: 'c7288ecd-48bf-5254-abfc-17b7207e83e5',
        Created: '2021-08-13T10:07:10.043Z',
        SenderUserId: '53607702-b94b-4a94-9459-6cf3acd65603',
        DispatchState: 'COMPLETED',
        LastStateChange: '2021-08-13T10:07:10.043Z'
      },
      SentReceivedTimestamp: '2021-08-13T10:07:08.674Z',
      ProcessState: 'PENDING',
      ConversationStates: [
        {
          Axis: 'PROCESS',
          State: 'PENDING',
          Timestamp: '2021-08-13T10:07:08.674Z'
        },
        {
          Axis: 'OTHERPART',
          State: 'OTHER_OVERDUE',
          Timestamp: '2021-08-13T10:07:38.130Z'
        },
        {
          Axis: 'DELIVERY',
          State: 'RECEIVED',
          Timestamp: '2021-08-13T10:07:08.674Z'
        }
      ],
      UnifiedState: 'OVERDUE',
      CopyIndicator: false,
      Deleted: false,
      DueDate: '2021-05-31',
      TenantId: '221559d0-53aa-44a2-ab29-0c4a6cb02bde',
      Properties: []
    },
    {
      DocumentId: '5d7f0fb0-b873-4b64-acfe-a01533b3476c',
      ID: 'A01004',
      URI: 'https://api-sandbox.tradeshift.com/tradeshift/rest/external/documents/5d7f0fb0-b873-4b64-acfe-a01533b3476c',
      DocumentType: {
        mimeType: 'text/xml',
        documentProfileId: 'ubl.invoice.2.1.jp',
        type: 'invoice'
      },
      State: 'LOCKED',
      CreatedDateTime: '2021-05-18T01:50:49.742Z',
      LastEdit: '2021-05-18T01:55:58.175Z',
      Actor: {
        Created: '2021-05-17T08:12:48.291Z',
        Modified: '2021-08-03T02:14:08.401Z',
        FirstName: 'インテグレーション',
        LastName: '管理者',
        Email: 'inte.kanri.user@gmail.com',
        MobileNumberVerified: false
      },
      ApplicationResponse: {
        ResponseDate: '2021-06-02'
      },
      ConversationId: '14ec4be1-4988-4dd8-9f3c-75f414988c36',
      ReceiverCompanyName: 'cseTest1',
      Tags: {
        Tag: []
      },
      ItemInfos: [
        {
          type: 'document.description',
          value: '内容'
        },
        {
          type: 'document.total',
          value: '100.00'
        },
        {
          type: 'document.currency',
          value: 'JPY'
        },
        {
          type: 'document.issuedate',
          value: '2021-05-18'
        }
      ],
      LatestDispatch: {
        DispatchId: 'ce4f453f-575f-4c05-ab2a-423cbe7895d9',
        ObjectId: '5d7f0fb0-b873-4b64-acfe-a01533b3476c',
        Created: '2021-05-18T01:56:09.730Z',
        SenderUserId: '53607702-b94b-4a94-9459-6cf3acd65603',
        DispatchState: 'COMPLETED',
        LastStateChange: '2021-05-18T01:56:09.730Z',
        ReceiverConnectionId: '0880c91f-d98c-436a-88dc-97a44ee6b9fa',
        DispatchChannel: 'TRADESHIFT'
      },
      SentReceivedTimestamp: '2021-05-18T01:56:04.339Z',
      ProcessState: 'PENDING',
      ConversationStates: [
        {
          Axis: 'PROCESS',
          State: 'PENDING',
          Timestamp: '2021-06-02T07:44:10.215Z'
        },
        {
          Axis: 'OTHERPART',
          State: 'OTHER_PENDING',
          Timestamp: '2021-05-18T01:56:06.964Z'
        },
        {
          Axis: 'DELIVERY',
          State: 'SENT',
          Timestamp: '2021-05-18T01:56:06.965Z'
        }
      ],
      UnifiedState: 'DELIVERED',
      CopyIndicator: false,
      Deleted: false,
      TenantId: '221559d0-53aa-44a2-ab29-0c4a6cb02bde',
      Properties: []
    },
    {
      DocumentId: '46538d1b-9036-457d-bd4f-d3d0e167d430',
      ID: 'A01005',
      URI: 'https://api-sandbox.tradeshift.com/tradeshift/rest/external/documents/46538d1b-9036-457d-bd4f-d3d0e167d430',
      DocumentType: {
        mimeType: 'text/xml',
        documentProfileId: 'ubl.invoice.2.1.jp',
        type: 'invoice'
      },
      State: 'LOCKED',
      CreatedDateTime: '2021-05-18T01:23:31.568Z',
      LastEdit: '2021-05-18T01:23:39.656Z',
      Actor: {
        Created: '2021-05-17T08:12:48.291Z',
        Modified: '2021-08-03T02:14:08.401Z',
        FirstName: 'インテグレーション',
        LastName: '管理者',
        Email: 'inte.kanri.user@gmail.com',
        MobileNumberVerified: false
      },
      ConversationId: 'c7ef801b-9bbb-4fd0-a3b0-97832ae0bc90',
      ReceiverCompanyName: 'cseTest1',
      Tags: {
        Tag: []
      },
      ItemInfos: [
        {
          type: 'document.description',
          value: 'test内容2'
        },
        {
          type: 'document.total',
          value: '0.00'
        },
        {
          type: 'document.currency',
          value: 'JPY'
        },
        {
          type: 'document.issuedate',
          value: '2021-05-18'
        },
        {
          type: 'invoice.due',
          value: '2021-05-20'
        }
      ],
      LatestDispatch: {
        DispatchId: '1e1b0108-e249-42a1-9bfd-3bdf5dcdcb0a',
        ObjectId: '46538d1b-9036-457d-bd4f-d3d0e167d430',
        Created: '2021-05-18T01:24:12.984Z',
        SenderUserId: '53607702-b94b-4a94-9459-6cf3acd65603',
        DispatchState: 'COMPLETED',
        LastStateChange: '2021-05-18T01:24:12.984Z',
        ReceiverConnectionId: '0880c91f-d98c-436a-88dc-97a44ee6b9fa',
        DispatchChannel: 'TRADESHIFT'
      },
      SentReceivedTimestamp: '2021-05-18T01:24:06.320Z',
      ProcessState: 'OVERDUE',
      ConversationStates: [
        {
          Axis: 'PROCESS',
          State: 'OVERDUE',
          Timestamp: '2021-05-21T00:01:02.194Z'
        },
        {
          Axis: 'OTHERPART',
          State: 'OTHER_PENDING',
          Timestamp: '2021-05-18T01:24:11.721Z'
        },
        {
          Axis: 'DELIVERY',
          State: 'SENT',
          Timestamp: '2021-05-18T01:24:11.720Z'
        }
      ],
      UnifiedState: 'OVERDUE',
      CopyIndicator: false,
      Deleted: false,
      DueDate: '2021-05-20',
      TenantId: '221559d0-53aa-44a2-ab29-0c4a6cb02bde',
      Properties: []
    },
    {
      DocumentId: 'c08d3bb7-9807-4180-9ceb-b842c482300e',
      ID: 'A01006',
      URI: 'https://api-sandbox.tradeshift.com/tradeshift/rest/external/documents/c08d3bb7-9807-4180-9ceb-b842c482300e',
      DocumentType: {
        mimeType: 'text/xml',
        documentProfileId: 'ubl.invoice.2.1.jp',
        type: 'invoice'
      },
      State: 'LOCKED',
      CreatedDateTime: '2021-05-18T00:28:38.126Z',
      LastEdit: '2021-05-18T00:41:01.622Z',
      Actor: {
        Created: '2021-05-17T08:12:48.291Z',
        Modified: '2021-08-03T02:14:08.401Z',
        FirstName: 'インテグレーション',
        LastName: '管理者',
        Email: 'inte.kanri.user@gmail.com',
        MobileNumberVerified: false
      },
      ApplicationResponse: {
        ResponseDate: '2021-05-18'
      },
      ConversationId: '107b6714-6bb6-4c2d-a09f-2c4e6127e08d',
      ReceiverCompanyName: 'cseTest1',
      Tags: {
        Tag: []
      },
      ItemInfos: [
        {
          type: 'document.description',
          value: 'test内容'
        },
        {
          type: 'document.total',
          value: '0.00'
        },
        {
          type: 'document.currency',
          value: 'JPY'
        },
        {
          type: 'document.issuedate',
          value: '2021-05-18'
        },
        {
          type: 'invoice.due',
          value: '2021-05-20'
        }
      ],
      LatestDispatch: {
        DispatchId: '6416eec8-c904-42e8-98d1-68bb2da825f3',
        ObjectId: 'c08d3bb7-9807-4180-9ceb-b842c482300e',
        Created: '2021-05-18T00:41:10.527Z',
        SenderUserId: '53607702-b94b-4a94-9459-6cf3acd65603',
        DispatchState: 'COMPLETED',
        LastStateChange: '2021-05-18T00:41:10.527Z',
        ReceiverConnectionId: '0880c91f-d98c-436a-88dc-97a44ee6b9fa',
        DispatchChannel: 'TRADESHIFT'
      },
      SentReceivedTimestamp: '2021-05-18T00:41:07.166Z',
      ProcessState: 'OVERDUE',
      ConversationStates: [
        {
          Axis: 'PROCESS',
          State: 'OVERDUE',
          Timestamp: '2021-06-02T07:43:14.369Z'
        },
        {
          Axis: 'OTHERPART',
          State: 'OTHER_PENDING',
          Timestamp: '2021-05-18T00:41:09.835Z'
        },
        {
          Axis: 'DELIVERY',
          State: 'SENT',
          Timestamp: '2021-05-18T00:41:09.833Z'
        }
      ],
      UnifiedState: 'OVERDUE',
      CopyIndicator: false,
      Deleted: false,
      DueDate: '2021-05-20',
      TenantId: '221559d0-53aa-44a2-ab29-0c4a6cb02bde',
      Properties: []
    },
    {
      DocumentId: 'c1aa94c2-f6c9-465a-911f-a2cd4beed0b0',
      ID: 'A01007'
    },
    {
      DocumentId: 'c1aa94c2-f6c9-465a-911f-a2cd4b123456',
      ID: 'a'
    },
    {
      DocumentId: 'c1aa94c2-f6c9-465a-911f-a2cd4b654321',
      ID: 'A01009'
    },
    {
      DocumentId: 'c1aa94c2-f6c9-465a-911f-a2cd4babcd12',
      ID: 'A01011'
    },
    {
      DocumentId: 'c1aa94c2-f6c9-465a-911f-a2cd4babcd13',
      ID: 'A01012'
    },
    {
      DocumentId: 'c1aa94c2-f6c9-465a-911f-a2cd4babcd14',
      ID: 'A01013'
    },
    {
      DocumentId: 'c1aa94c2-f6c9-465a-911f-a2cd4babcd15',
      ID: 'A01014'
    },
    {
      DocumentId: 'c1aa94c2-f6c9-465a-911f-a2cd4babcd16',
      ID: 'A01015'
    },
    {
      DocumentId: 'c1aa94c2-f6c9-465a-911f-a2cd4babcd17',
      ID: 'A01016'
    },
    {
      DocumentId: 'c1aa94c2-f6c9-465a-911f-a2cd4babcd18',
      ID: 'A01017'
    },
    {
      DocumentId: 'c1aa94c2-f6c9-465a-911f-a2cd4babcd19',
      ID: 'A01018'
    },
    {
      DocumentId: 'c1aa94c2-f6c9-465a-911f-a2cd4babcd20',
      ID: 'A01019'
    },
    {
      DocumentId: 'c1aa94c2-f6c9-465a-911f-a2cd4babcd21',
      ID: 'A01020'
    },
    {
      DocumentId: 'c1aa94c2-f6c9-465a-911f-a2cd4babcd22',
      ID: 'A01021'
    },
    {
      DocumentId: 'c1aa94c2-f6c9-465a-911f-a2cd4babcd23',
      ID: 'A01022'
    },
    {
      DocumentId: 'c1aa94c2-f6c9-465a-911f-a2cd4babcd24',
      ID: 'A01023'
    },
    {
      DocumentId: 'c1aa94c2-f6c9-465a-911f-a2cd4babcd25',
      ID: 'A01024'
    },
    {
      DocumentId: 'c1aa94c2-f6c9-465a-911f-a2cd4babcd26',
      ID: 'A01025'
    },
    {
      DocumentId: 'c1aa94c2-f6c9-465a-911f-a2cd4babcd27',
      ID: 'A01026'
    },
    {
      DocumentId: 'c1aa94c2-f6c9-465a-911f-a2cd4babcd28',
      ID: 'A01027'
    },
    {
      DocumentId: 'c1aa94c2-f6c9-465a-911f-a2cd4babcd29',
      ID: 'A01028'
    },
    {
      DocumentId: 'c1aa94c2-f6c9-465a-911f-a2cd4babcd30',
      ID: 'A01029'
    },
    {
      DocumentId: 'c1aa94c2-f6c9-465a-911f-a2cd4babcd31',
      ID: 'A01030'
    },
    {
      DocumentId: 'c1aa94c2-f6c9-465a-911f-a2cd4babcd32',
      ID: 'A01031'
    },
    {
      DocumentId: 'c1aa94c2-f6c9-465a-911f-a2cd4babcd33',
      ID: 'A01032'
    },
    {
      DocumentId: 'c1aa94c2-f6c9-465a-911f-a2cd4babcd34',
      ID: 'A01033'
    },
    {
      DocumentId: 'c1aa94c2-f6c9-465a-911f-a2cd4babcd35',
      ID: 'A01034'
    }
  ]
}
