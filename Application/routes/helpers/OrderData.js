const statusConstants = require('../../constants').statusConstants

class OrderData {
  /**
   * 導入支援・ライトプラン用オーダー情報コンストラクタ
   * @param {string} tenantId テナントID
   * @param {object} inputData 画面入力データ
   * @param {string} orderType オーダー種別
   * @param {string} serviceType サービス種別
   * @param {string} prdtCode 商品コード
   * @param {string} appType 申込区分
   */
  constructor(tenantId, inputData, orderType, serviceType, prdtCode, appType) {
    // 基本情報の設定
    this.contractBasicInfo = {}
    // トレシフテナントID
    this.contractBasicInfo.tradeshiftId = tenantId
    // オーダーID
    this.contractBasicInfo.orderId = ''
    // オーダー種別
    this.contractBasicInfo.orderType = orderType
    // サービス種別
    this.contractBasicInfo.serviceType = serviceType
    // 契約者名変更フラッグ
    this.contractChangeName = ''
    // 契約者住所変更フラッグ
    this.contractChangeAddress = ''
    // 契約者連絡先変更フラッグ
    this.contractChangeContact = ''
    // 申込年月日
    this.appDate = ''
    // 開通希望年月日
    this.contractBasicInfo.OpeningDate = inputData.openingDate.replace(/-/g, '') ?? ''
    // 契約番号
    this.contractBasicInfo.contractNumber = inputData.contractNumber ?? ''
    // 販売チャネルコード
    this.contractBasicInfo.salesChannelCode = inputData.salesChannelCode ?? ''
    // 販売チャネル名
    this.contractBasicInfo.salesChannelName = inputData.salesChannelName ?? ''
    // 部課名
    this.contractBasicInfo.salesChannelDeptName = inputData.salesChannelDeptName ?? ''
    // 社員コード
    this.contractBasicInfo.salesChannelEmplyeeCode = inputData.salesChannelEmplyeeCode ?? ''
    // 担当者名
    this.contractBasicInfo.salesChannelPersonName = inputData.salesChannelPersonName ?? ''
    // 組織区分
    this.contractBasicInfo.salesChannelDeptType = inputData.salesChannelDeptType ?? ''
    // 電話番号
    this.contractBasicInfo.salesChannelPhoneNumber = inputData.salesChannelPhoneNumber ?? ''
    // メールアドレス
    this.contractBasicInfo.salesChannelMailAddress = inputData.salesChannelMailAddress ?? ''
    // 開通案内パスワード
    this.contractBasicInfo.kaianPassword = inputData.passworddd ?? ''

    // 新設の場合
    if (orderType === statusConstants.orderTypeNewOrder) {
      // 販売店コード
      this.contractBasicInfo.campaignCode = inputData.campaignCode ?? ''
      // 販売担当者名
      this.contractBasicInfo.salesPersonName = inputData.salesPersonName.replace(/\s+/g, '') ?? ''

      // 契約情報の設定
      this.contractAccountInfo = {}
      // 契約アカウントID(SOPFで補填のため空)
      this.contractAccountId = ''
      // 顧客区分ダミー番号とする(SOPFで補填のため空)
      this.customerType = ''
      // 共通顧客ID
      this.contractAccountInfo.commonCustomerId = inputData.commonCustomerId ?? ''
      // 契約者名
      this.contractAccountInfo.contractorName = inputData.contractorName ?? ''
      // 契約者カナ名
      this.contractAccountInfo.contractorKanaName = inputData.contractorKanaName ?? ''
      // 契約者郵便番号
      this.contractAccountInfo.postalNumber = inputData.postalNumber ?? ''
      // 契約者住所（丁目まで）
      this.contractAccountInfo.contractAddress = inputData.contractAddressVal ?? ''
      // 契約者番地等1番地以下を入力
      this.contractAccountInfo.banch1 = inputData.banch1 ?? ''
      // 契約者建物等1
      this.contractAccountInfo.tatemono1 = inputData.tatemono1 ?? ''

      // 契約情報リストの設定
      this.contactList = [{}]
      // 連絡先種別(SOPFで補填のため空)
      this.contactList[0].contactType = ''
      // 連絡先担当者名
      this.contactList[0].contactPersonName = inputData.contactPersonName ?? ''
      // 連絡先電話番号
      this.contactList[0].contactPhoneNumber = inputData.contactPhoneNumber ?? ''
      // 連絡先メールアドレス
      this.contactList[0].contactMail = inputData.contactMail ?? ''
      // 請求書送付先郵便番号
      this.contactList[0].billMailingPostalNumber = inputData.billMailingPostalNumber ?? ''
      // 請求書送付先住所（丁目まで）
      this.contactList[0].billMailingAddress = inputData.billMailingAddress ?? ''
      // 請求書送付先番地等1
      this.contactList[0].billMailingAddressBanchi1 = inputData.billMailingAddressBanchi1 ?? ''
      // 請求書送付先建物等1
      this.contactList[0].billMailingAddressBuilding1 = inputData.billMailingAddressBuilding1 ?? ''
      // 請求書送付先宛名（会社名+部課名）カナ名
      this.contactList[0].billMailingKanaName = inputData.billMailingKanaName ?? ''
      // 請求書送付先宛名（会社名+部課名）
      this.contactList[0].billMailingName = inputData.billMailingName ?? ''
      // 請求に関する連絡先お名前
      this.contactList[0].billMailingPersonName = inputData.billMailingPersonName ?? ''
      // 請求に関する連絡先電話番号
      this.contactList[0].billMailingPhoneNumber = inputData.billMailingPhoneNumber ?? ''
      // 請求に関する連絡先メールアドレス
      this.contactList[0].billMailingMailAddress = inputData.billMailingMailAddress ?? ''

      // 商品情報の設定
      this.prdtList = [{}]
      // 商品コード
      this.prdtList[0].prdtCode = prdtCode
      // 利用ID数
      this.prdtList[0].idnumber = ''
      // 申込区分
      this.prdtList[0].appType = appType
    }
  }
}

module.exports = OrderData
