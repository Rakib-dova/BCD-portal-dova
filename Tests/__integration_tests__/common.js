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

/**
 * ライトプラン申込
 * @param {object} acCookie Cookie
 */
const lightPlanRegister = async (acCookie) => {
  const postData = {
    commonCustomerId: '11111111111',
    contractorName: '契約者名',
    contractorKanaName: 'カナ',
    postalNumber: '1000004',
    contractAddressVal: '東京都千代田区大手町一丁目',
    banch1: '１番',
    tatemono1: '建物',
    contactPersonName: '連絡先担当者名',
    contactPhoneNumber: '000-0000-0000',
    contactMail: 'aaaaaa@aaa.com',
    campaignCode: '00000',
    salesPersonName: '販売担当者名',
    password: 'Aa11111111',
    passwordConfirm: 'Aa11111111',
    billMailingPostalNumber: '1000004',
    billMailingAddress: '東京都千代田区大手町一丁目',
    billMailingAddressBanchi1: '請求書送付先番地等',
    billMailingAddressBuilding1: '請求書送付先建物等',
    billMailingKanaName: '請求書送付先宛名',
    billMailingName: 'カナ',
    billMailingPersonName: '請求に関する連絡先',
    billMailingPhoneNumber: '000-0000-0000',
    billMailingMailAddress: 'aaa@aaa.com',
    openingDate: '2222-06-16',
    salesChannelCode: '000000',
    salesChannelName: '販売チャネル名',
    salesChannelDeptName: '部課名',
    salesChannelEmplyeeCode: '11111111',
    salesChannelPersonName: '担当者名',
    salesChannelDeptType: '{"code":"01","name":"Com第一営業本部"}',
    salesChannelPhoneNumber: '000-0000-0000',
    salesChannelMailAddress: 'aaa@aaa.com'
  }

  // ライトプラン申込画面の表示
  const res = await request(app)
    .get('/applyLightPlan')
    .set('Cookie', acCookie.name + '=' + acCookie.value)
    .expect(200)
  // CSRFのワンタイムトークン取得
  const dom = new JSDOM(res.text)
  const tenantCsrf = dom.window.document.getElementsByName('_csrf')[0]?.value

  // ライトプラン申込実施
  await request(app)
    .post('/applyLightPlan/register')
    .type('form')
    .send({ _csrf: tenantCsrf, ...postData })
    .set('Cookie', acCookie.name + '=' + acCookie.value)
    .expect(303)
}

module.exports = {
  bcdRegister: bcdRegister,
  lightPlanRegister: lightPlanRegister
}
