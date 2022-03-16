'use strict'

const sendMail = require('../../Application/lib/sendMail')
const logger = require('../../Application/lib/logger')
const nodemailer = require('../../Application/node_modules/nodemailer')
const logMessageDefine = require('../../Application/constants').logMessage

if (process.env.LOCALLY_HOSTED === 'true') {
  require('dotenv').config({ path: './config/.env' })
}
let infoSpy, warnSpy, createTransportSpy
const to = 'test@to.com'
const subject = 'test subject'
const text = 'test text'

describe('sendMailのテスト', () => {
  beforeEach(() => {
    infoSpy = jest.spyOn(logger, 'info')
    warnSpy = jest.spyOn(logger, 'warn')
    createTransportSpy = jest.spyOn(nodemailer, 'createTransport')
  })
  afterEach(() => {
    infoSpy.mockRestore()
    warnSpy.mockRestore()
    createTransportSpy.mockRestore()
  })

  describe('メール送信機能', () => {
    test('正常-成功', async () => {
      createTransportSpy.mockReturnValue({
        sendMail: (_) => {
          const res = { response: '200:OK' }
          return res
        }
      })

      const result = await sendMail.mail(to, subject, text)
      expect(result).toBe(0)
      expect(infoSpy).toHaveBeenNthCalledWith(1, logMessageDefine.MAILINF000)
      expect(infoSpy).toHaveBeenNthCalledWith(2, logMessageDefine.MAILINF002 + '200:OK')
      expect(infoSpy).toHaveBeenNthCalledWith(3, logMessageDefine.MAILINF001)
    })

    test('エラー-送信エラー', async () => {
      createTransportSpy.mockReturnValue(null)

      createTransportSpy.mockReturnValue({
        sendMail: (_) => {
          throw new Error('送信失敗')
        }
      })

      const result = await sendMail.mail(to, subject, text)
      expect(result).toBe(1)
      expect(infoSpy).toHaveBeenNthCalledWith(1, logMessageDefine.MAILINF000)
      expect(warnSpy).toHaveBeenNthCalledWith(1, logMessageDefine.MAILWAN000 + 'Error: 送信失敗')
      expect(infoSpy).toHaveBeenNthCalledWith(2, logMessageDefine.MAILINF001)
    })

    test('エラー-システムエラー', async () => {
      createTransportSpy.mockReturnValue(null)

      const result = await sendMail.mail(to, subject, text)
      expect(result).toBe(1)
      expect(infoSpy).toHaveBeenNthCalledWith(1, logMessageDefine.MAILINF000)
      expect(warnSpy).toHaveBeenNthCalledWith(
        1,
        logMessageDefine.MAILWAN000 + "TypeError: Cannot read property 'sendMail' of null"
      )
      expect(infoSpy).toHaveBeenNthCalledWith(2, logMessageDefine.MAILINF001)
    })
  })
})
