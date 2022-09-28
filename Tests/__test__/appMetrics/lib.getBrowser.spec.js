'use strict'
const { getBrowser } = require('../../../Application/lib/utils')

describe('アプリ効果測定UT_デジトレ', () => {
  describe('ブラウザ情報取得関数: getBrowser()', () => {
    test('ブラウザが chrome の場合', async () => {
      const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/102.0.0.0 Safari/537.36'

      const browser = getBrowser(userAgent)

      expect(browser).toBe('chrome')
    })

    test('ブラウザが Edge の場合', async () => {
      const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/102.0.5005.63 Safari/537.36 Edg/102.0.1245.33'

      const browser = getBrowser(userAgent)

      expect(browser).toBe('edge')
    })

    test('ブラウザが Firefox の場合', async () => {
      const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:101.0) Gecko/20100101 Firefox/101.0'

      const browser = getBrowser(userAgent)

      expect(browser).toBe('firefox')
    })

    test('ブラウザが Opera の場合', async () => {
      const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/101.0.4951.67 Safari/537.36 OPR/87.0.4390.36'

      const browser = getBrowser(userAgent)

      expect(browser).toBe('others')
    })

    test('ブラウザが Safari の場合', async () => {
      const userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/69.0.3497.100 Safari/537.36'

      const browser = getBrowser(userAgent)

      expect(browser).toBe('others')
    })
  })
})
