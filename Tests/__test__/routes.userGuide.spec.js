'use strict'

jest.mock('../../Application/node_modules/express', () => {
  return require('jest-express')
})

const userGuide = require('../../Application/routes/userGuide.js')
const Request = require('jest-express').Request
const Response = require('jest-express').Response
const next = require('jest-express').Next
const logger = require('../../Application/lib/logger.js')

let request, response, infoSpy

const contracts = {
  numberN: [
    {
      contractId: '034d9315-46e3-4032-8258-8e30b417f1b1',
      tenantId: '3ca50e1a-d3ab-431a-b526-14fd65a3cda8',
      numberN: 'dummyNumberN',
      contractStatus: '10',
      deleteFlag: false,
      createdAt: '2021-07-15 17:41:38',
      updatedAt: '2021-07-15 17:41:38',
      contractedAt: '',
      canceledAt: ''
    }
  ],
  none_numberN: [
    {
      contractId: '034d9315-46e3-4032-8258-8e30b417f1b1',
      tenantId: '3ca50e1a-d3ab-431a-b526-14fd65a3cda8',
      numberN: '',
      contractStatus: '10',
      deleteFlag: false,
      createdAt: '2021-07-15 17:41:38',
      updatedAt: '2021-07-15 17:41:38',
      contractedAt: '',
      canceledAt: ''
    }
  ]
}

describe('pdfInvoiceのテスト', () => {
  beforeEach(() => {
    request = new Request()
    request.csrfToken = () => 'dummyCsrfToken'
    request.session = {
      userContext: 'LoggedIn',
      userRole: 'dummyUserRole'
    }
    response = new Response()
    infoSpy = jest.spyOn(logger, 'info')
    request.flash = jest.fn()
  })
  afterEach(() => {
    request.resetMocked()
    response.resetMocked()
    next.mockReset()
    infoSpy.mockRestore()
  })

  test('正常: 管理者-NumberNあり', async () => {
    request.contracts = contracts.numberN

    await userGuide.dispUserGuide(request, response, next)

    expect(response.render).toHaveBeenCalledWith('userGuide', {
      title: 'ご利用ガイド',
      engTitle: 'USER GUIDE',
      userRole: 'dummyUserRole',
      numberN: 'dummyNumberN'
    })
  })
  test('正常: NumberNなし', async () => {
    request.contracts = contracts.none_numberN

    await userGuide.dispUserGuide(request, response, next)

    expect(response.render).toHaveBeenCalledWith('userGuide', {
      title: 'ご利用ガイド',
      engTitle: 'USER GUIDE',
      userRole: 'dummyUserRole',
      numberN: ''
    })
  })
})
