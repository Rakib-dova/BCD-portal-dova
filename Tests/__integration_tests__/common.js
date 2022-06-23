'use strict'
const request = require('supertest')
const { JSDOM } = require('jsdom')
const app = require('../../Application/app')

/**
 * BCD無償契約の利用登録
 * @param {object} acCookie Cookie
 */
const bcdRegister = async (acCookie) => {
  // 利用登録画面の表示
  const res = await request(app)
    .get('/tenant/register')
    .set('Cookie', acCookie.name + '=' + acCookie.value)
    .expect(200)

  // CSRFのワンタイムトークン取得
  const dom = new JSDOM(res.text)
  const tenantCsrf = dom.window.document.getElementsByName('_csrf')[0]?.value

  // 利用登録実施
  await request(app)
    .post('/tenant/register')
    .type('form')
    .send({ _csrf: tenantCsrf, termsCheck: 'on', salesPersonName: 'any' })
    .set('Cookie', acCookie.name + '=' + acCookie.value)
    .expect(303)
}

module.exports = {
  bcdRegister: bcdRegister
}
