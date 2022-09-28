'use strict'

const libValidate = require('../../Application/lib/validate')
describe('validateのテスト', () => {
  describe('isValidEmailTsUser', () => {
    test('チェックOK', async () => {
      const testdata = 'aaa@bbb.ccc'
      const ret = libValidate.isValidEmailTsUser(testdata)
      expect(ret).toBe(true)
    })
    test('チェックNG：256文字以上', async () => {
      const testdata =
        '1234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456'
      const ret = libValidate.isValidEmailTsUser(testdata)
      expect(ret).toBe(false)
    })
    test('チェックNG：@の前が65文字以上', async () => {
      const testdata = 'abcdefghijabcdefghijabcdefghijabcdefghijabcdefghijabcdefghij12345@bbb.ccc'
      const ret = libValidate.isValidEmailTsUser(testdata)
      expect(ret).toBe(false)
    })
    test('チェックNG：@の後ろが191文字以上', async () => {
      const testdata =
        'a@abcdefhhijabcdefhhijabcdefhhijabcdefhhijabcdefhhijabcdefhhijabcdefhhijabcdefhhijabcdefhhijabcdefhhijabcdefhhijabcdefhhijabcdefhhijabcdefhhijabcdefhhijabcdefhhijabcdefhhijabcdefhhijabcdefhhi.a'
      const ret = libValidate.isValidEmailTsUser(testdata)
      expect(ret).toBe(false)
    })
    test('チェックNG：@の前に全角', async () => {
      const testdata = 'あ@bbb.ccc'
      const ret = libValidate.isValidEmailTsUser(testdata)
      expect(ret).toBe(false)
    })
    test('チェックNG：@の前に<', async () => {
      const testdata = 'a<b@bbb.ccc'
      const ret = libValidate.isValidEmailTsUser(testdata)
      expect(ret).toBe(false)
    })
    test('チェックNG：@の前に>', async () => {
      const testdata = 'a>b@bbb.ccc'
      const ret = libValidate.isValidEmailTsUser(testdata)
      expect(ret).toBe(false)
    })
    test('チェックNG：@の前に"', async () => {
      const testdata = 'a"b@bbb.ccc'
      const ret = libValidate.isValidEmailTsUser(testdata)
      expect(ret).toBe(false)
    })
    test('チェックNG：@の前に(', async () => {
      const testdata = 'a(b@bbb.ccc'
      const ret = libValidate.isValidEmailTsUser(testdata)
      expect(ret).toBe(false)
    })
    test('チェックNG：@の前に)', async () => {
      const testdata = 'a)b@bbb.ccc'
      const ret = libValidate.isValidEmailTsUser(testdata)
      expect(ret).toBe(false)
    })
    test('チェックNG：@の前に:', async () => {
      const testdata = 'a:b@bbb.ccc'
      const ret = libValidate.isValidEmailTsUser(testdata)
      expect(ret).toBe(false)
    })
    test('チェックNG：@の前に,', async () => {
      const testdata = 'a,b@bbb.ccc'
      const ret = libValidate.isValidEmailTsUser(testdata)
      expect(ret).toBe(false)
    })
    test('チェックNG：@の前に@', async () => {
      const testdata = 'a@b@bbb.ccc'
      const ret = libValidate.isValidEmailTsUser(testdata)
      expect(ret).toBe(false)
    })
    test('チェックNG：@の前に;', async () => {
      const testdata = 'a;b@bbb.ccc'
      const ret = libValidate.isValidEmailTsUser(testdata)
      expect(ret).toBe(false)
    })
    test('チェックNG：@の後ろに「.」が存在しない', async () => {
      const testdata = 'aaa@bbbccc'
      const ret = libValidate.isValidEmailTsUser(testdata)
      expect(ret).toBe(false)
    })
    test('チェックNG：@の後ろに全角', async () => {
      const testdata = 'aaa@bあbb.ccc'
      const ret = libValidate.isValidEmailTsUser(testdata)
      expect(ret).toBe(false)
    })
    test('チェックNG：@の後ろに<', async () => {
      const testdata = 'aaa@b<bb.ccc'
      const ret = libValidate.isValidEmailTsUser(testdata)
      expect(ret).toBe(false)
    })
    test('チェックNG：@の後ろに>', async () => {
      const testdata = 'aaa@b>bb.ccc'
      const ret = libValidate.isValidEmailTsUser(testdata)
      expect(ret).toBe(false)
    })
    test('チェックNG：@の後ろに{', async () => {
      const testdata = 'aaa@b{bb.ccc'
      const ret = libValidate.isValidEmailTsUser(testdata)
      expect(ret).toBe(false)
    })
    test('チェックNG：@の後ろに}', async () => {
      const testdata = 'aaa@b}bb.ccc'
      const ret = libValidate.isValidEmailTsUser(testdata)
      expect(ret).toBe(false)
    })
    test('チェックNG：@の後ろに!', async () => {
      const testdata = 'aaa@b!bb.ccc'
      const ret = libValidate.isValidEmailTsUser(testdata)
      expect(ret).toBe(false)
    })
    test('チェックNG：@の後ろに"', async () => {
      const testdata = 'aaa@b"bb.ccc'
      const ret = libValidate.isValidEmailTsUser(testdata)
      expect(ret).toBe(false)
    })
    test('チェックNG：@の後ろに$', async () => {
      const testdata = 'aaa@b$bb.ccc'
      const ret = libValidate.isValidEmailTsUser(testdata)
      expect(ret).toBe(false)
    })
    test('チェックNG：@の後ろにシングルクォーテーション', async () => {
      const testdata = "aaa@b'bb.ccc"
      const ret = libValidate.isValidEmailTsUser(testdata)
      expect(ret).toBe(false)
    })
    test('チェックNG：@の後ろに(', async () => {
      const testdata = 'aaa@b(bb.ccc'
      const ret = libValidate.isValidEmailTsUser(testdata)
      expect(ret).toBe(false)
    })
    test('チェックNG：@の後ろに)', async () => {
      const testdata = 'aaa@b)bb.ccc'
      const ret = libValidate.isValidEmailTsUser(testdata)
      expect(ret).toBe(false)
    })
    test('チェックNG：@の後ろに-', async () => {
      const testdata = 'aaa@b-bb.ccc'
      const ret = libValidate.isValidEmailTsUser(testdata)
      expect(ret).toBe(false)
    })
    test('チェックNG：@の後ろに=', async () => {
      const testdata = 'aaa@b=bb.ccc'
      const ret = libValidate.isValidEmailTsUser(testdata)
      expect(ret).toBe(false)
    })
    test('チェックNG：@の後ろに~', async () => {
      const testdata = 'aaa@b~bb.ccc'
      const ret = libValidate.isValidEmailTsUser(testdata)
      expect(ret).toBe(false)
    })
    test('チェックNG：@の後ろに@', async () => {
      const testdata = 'aaa@b@bb.ccc'
      const ret = libValidate.isValidEmailTsUser(testdata)
      expect(ret).toBe(false)
    })
    test('チェックNG：@の後ろに:', async () => {
      const testdata = 'aaa@b@bb.ccc'
      const ret = libValidate.isValidEmailTsUser(testdata)
      expect(ret).toBe(false)
    })
    test('チェックNG：@の後ろに+', async () => {
      const testdata = 'aaa@b+bb.ccc'
      const ret = libValidate.isValidEmailTsUser(testdata)
      expect(ret).toBe(false)
    })
    test('チェックNG：@の後ろに*', async () => {
      const testdata = 'aaa@b*bb.ccc'
      const ret = libValidate.isValidEmailTsUser(testdata)
      expect(ret).toBe(false)
    })
    test('チェックNG：@の後ろに,', async () => {
      const testdata = 'aaa@b,bb.ccc'
      const ret = libValidate.isValidEmailTsUser(testdata)
      expect(ret).toBe(false)
    })
    test('チェックNG：@の前の先頭に「.」', async () => {
      const testdata = '.aaa@bbb.ccc'
      const ret = libValidate.isValidEmailTsUser(testdata)
      expect(ret).toBe(false)
    })
    test('チェックNG：@の前の末尾に「.」', async () => {
      const testdata = 'aaa.@bbb.ccc'
      const ret = libValidate.isValidEmailTsUser(testdata)
      expect(ret).toBe(false)
    })
    test('チェックNG：@の後ろの先頭に「.」', async () => {
      const testdata = 'aaa@.bbb.ccc'
      const ret = libValidate.isValidEmailTsUser(testdata)
      expect(ret).toBe(false)
    })
    test('チェックNG：@の後ろの末尾に「.」', async () => {
      const testdata = 'aaa@bbb.ccc.'
      const ret = libValidate.isValidEmailTsUser(testdata)
      expect(ret).toBe(false)
    })
  })
})
