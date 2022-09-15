'use strict'
const tradeshiftFindDocumentUri = 'https://api-sandbox.tradeshift.com/tradeshift/rest/external/documents/'
const documentTemplate = {
  DocumentId: '',
  ID: '',
  URI: '',
  DocumentType: {
    mimeType: 'text/xml',
    documentProfileId: 'ubl.invoice.2.1.jp',
    type: 'invoice'
  },
  State: '',
  CreatedDateTime: '',
  LastEdit: '',
  SenderCompanyName: '',
  Actor: {
    Created: '',
    Modified: '',
    FirstName: '',
    LastName: '',
    Email: '',
    MobileNumberVerified: false
  },
  ConversationId: '',
  ReceivedToCompanyAccountId: '',
  Tags: {
    Tag: []
  },
  ItemInfos: [
    {
      type: 'document.description',
      value: ''
    },
    {
      type: 'document.total',
      value: ''
    },
    {
      type: 'document.currency',
      value: 'JPY'
    },
    {
      type: 'document.issuedate',
      value: ''
    },
    {
      type: 'invoice.due',
      value: ''
    }
  ],
  LatestDispatch: {
    DispatchId: '',
    ObjectId: '',
    Created: '',
    SenderUserId: '',
    DispatchState: '',
    LastStateChange: ''
  },
  SentReceivedTimestamp: '',
  ProcessState: '',
  ConversationStates: [
    {
      Axis: '',
      State: '',
      Timestamp: ''
    },
    {
      Axis: '',
      State: '',
      Timestamp: ''
    }
  ],
  UnifiedState: '',
  CopyIndicator: false,
  Deleted: false,
  DueDate: '',
  TenantId: '',
  Properties: []
}

const document1 = {
  ...documentTemplate,
  DocumentId: 'e04e6f3a-f688-5074-bab1-f7be5d173104',
  ID: 'R30329001',
  URI: `${tradeshiftFindDocumentUri}/${this.DocumentId}`,
  State: 'LOCKED',
  CreatedDateTime: '2022-03-29T06:51:11.977Z',
  LastEdit: '2022-03-29T06:51:11.977Z',
  SenderCompanyName: 'ヨホンインダストリー支社',
  Actor: {
    Created: '2021-05-17T08:12:48.291Z',
    Modified: '2021-08-03T02:14:08.401Z',
    FirstName: 'インテグレーション',
    LastName: '管理者',
    Email: 'inte.kanri.user@gmail.com',
    MobileNumberVerified: false
  },
  ConversationId: 'f81f7003-2a6c-490f-ad5c-dbf17d73c5c0',
  ReceivedToCompanyAccountId: '221559d0-53aa-44a2-ab29-0c4a6cb02bde',
  Tags: {
    Tag: []
  },
  ItemInfos: [
    {
      type: 'document.description',
      value: '土地'
    },
    {
      type: 'document.total',
      value: '10000000.00'
    },
    {
      type: 'document.currency',
      value: 'JPY'
    },
    {
      type: 'document.issuedate',
      value: '2022-03-29'
    },
    {
      type: 'invoice.due',
      value: '2022-03-30'
    }
  ],
  LatestDispatch: {
    DispatchId: 'c0c4eedc-0565-45e5-bfbf-62a1e9eb946c',
    ObjectId: 'e04e6f3a-f688-5074-bab1-f7be5d173104',
    Created: '2022-03-29T06:51:13.028Z',
    SenderUserId: '53607702-b94b-4a94-9459-6cf3acd65603',
    DispatchState: 'COMPLETED',
    LastStateChange: '2022-03-29T06:51:13.028Z'
  },
  SentReceivedTimestamp: '2022-03-29T06:51:11.977Z',
  ProcessState: 'PENDING',
  ConversationStates: [
    {
      Axis: 'PROCESS',
      State: 'PENDING',
      Timestamp: '2022-03-29T06:51:11.977Z'
    },
    {
      Axis: 'DELIVERY',
      State: 'RECEIVED',
      Timestamp: '2022-03-29T06:51:11.977Z'
    }
  ],
  UnifiedState: 'DELIVERED',
  CopyIndicator: false,
  Deleted: false,
  DueDate: '2022-03-30',
  TenantId: '221559d0-53aa-44a2-ab29-0c4a6cb02bde',
  Properties: []
}

const document2 = {
  ...documentTemplate,
  DocumentId: '21f334d3-cb8e-42d3-b27d-6a9da6371bad',
  ID: 'R30328-001',
  URI: `${tradeshiftFindDocumentUri}/${this.DocumentId}`,
  State: 'LOCKED',
  CreatedDateTime: '2022-03-27T15:26:35.716Z',
  LastEdit: '2022-03-27T15:26:35.716Z',
  SenderCompanyName: 'ヨホンインダストリー本社',
  Actor: {
    Created: '2021-05-21T08:46:41.645Z',
    Modified: '2022-02-24T07:10:30.722Z',
    FirstName: '本社',
    LastName: '取引担当者',
    Email: 'inte.kanri.user@gmail.com',
    MobileNumberVerified: false,
    Title: ''
  },
  ConversationId: '6a313060-caeb-4661-b0ef-c989b9d8cfc0',
  ReceivedToCompanyAccountId: '11367bd9-9710-4772-bdf7-10be2085976c',
  Tags: {
    Tag: []
  },
  ItemInfos: [
    {
      type: 'document.description',
      value: '土地'
    },
    {
      type: 'document.total',
      value: '21400.00'
    },
    {
      type: 'document.currency',
      value: 'JPY'
    },
    {
      type: 'document.issuedate',
      value: '2022-03-27'
    },
    {
      type: 'invoice.due',
      value: '2022-04-08'
    }
  ],
  LatestDispatch: {
    DispatchId: 'a19a20b5-440e-4db7-b24d-530c43056f84',
    ObjectId: '3ffe281b-20c4-5022-bd8e-2d82533bb592',
    Created: '2022-03-27T15:26:37.063Z',
    SenderUserId: 'db9be280-c77b-4e9e-b138-ef96bdba5288',
    DispatchState: 'COMPLETED',
    LastStateChange: '2022-03-27T15:26:37.063Z'
  },
  SentReceivedTimestamp: '2022-03-27T15:26:35.716Z',
  ProcessState: 'PAID',
  ConversationStates: [
    {
      Axis: 'PROCESS',
      State: 'PAID',
      Timestamp: '2022-03-29T06:46:57.966Z'
    },
    {
      Axis: 'OTHERPART',
      State: 'OTHER_PENDING',
      Timestamp: '2022-03-27T15:26:37.452Z'
    },
    {
      Axis: 'DELIVERY',
      State: 'RECEIVED',
      Timestamp: '2022-03-27T15:26:35.716Z'
    }
  ],
  UnifiedState: 'PAID_UNCONFIRMED',
  CopyIndicator: false,
  Deleted: false,
  DueDate: '2022-04-08',
  TenantId: '11367bd9-9710-4772-bdf7-10be2085976c',
  Properties: []
}

const document3 = {
  ...documentTemplate,
  DocumentId: '596f5420-6a6a-5d31-b00a-16da89958647',
  ID: 'R30110001',
  URI: `${tradeshiftFindDocumentUri}/${this.DocumentId}`,
  State: 'LOCKED',
  CreatedDateTime: '2022-01-26T01:08:26.369Z',
  LastEdit: '2022-01-26T01:08:26.369Z',
  SenderCompanyName: 'サプライヤー1',
  Actor: {
    Created: '2021-05-17T08:12:48.291Z',
    Modified: '2021-08-03T02:14:08.401Z',
    FirstName: 'インテグレーション',
    LastName: '管理者',
    Email: 'inte.kanri.user@gmail.com',
    MobileNumberVerified: false
  },
  ApplicationResponse: {
    Description: '',
    ResponseDate: '2022-03-24'
  },
  ConversationId: 'e7c6e7e1-8440-4b4f-8dd4-452abab5af6b',
  ReceivedToCompanyAccountId: '221559d0-53aa-44a2-ab29-0c4a6cb02bde',
  Tags: {
    Tag: []
  },
  ItemInfos: [
    {
      type: 'document.description',
      value: '1000ml コーラ 20ea'
    },
    {
      type: 'document.total',
      value: '2000.00'
    },
    {
      type: 'document.currency',
      value: 'JPY'
    },
    {
      type: 'document.issuedate',
      value: '2022-01-26'
    }
  ],
  LatestDispatch: {
    DispatchId: 'cdf21b86-f1b8-4454-80f6-a82820ae4d07',
    ObjectId: '596f5420-6a6a-5d31-b00a-16da89958647',
    Created: '2022-01-26T01:08:27.771Z',
    SenderUserId: '53607702-b94b-4a94-9459-6cf3acd65603',
    DispatchState: 'COMPLETED',
    LastStateChange: '2022-01-26T01:08:27.771Z'
  },
  SentReceivedTimestamp: '2022-01-26T01:08:26.369Z',
  ProcessState: 'REJECTED',
  ConversationStates: [
    {
      Axis: 'PROCESS',
      State: 'PAID',
      Timestamp: '2022-01-29T06:46:57.966Z'
    },
    {
      Axis: 'OTHERPART',
      State: 'OTHER_PENDING',
      Timestamp: '2022-01-27T15:26:37.452Z'
    },
    {
      Axis: 'DELIVERY',
      State: 'RECEIVED',
      Timestamp: '2022-01-27T15:26:35.716Z'
    }
  ],
  UnifiedState: 'PAID_UNCONFIRMED',
  CopyIndicator: false,
  Deleted: false,
  TenantId: '221559d0-53aa-44a2-ab29-0c4a6cb02bde',
  Properties: []
}
module.exports = {
  numPages: 1,
  itemCount: 3,
  pageId: 0,
  Document: [document1, document2, document3]
}
