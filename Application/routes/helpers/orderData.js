const constants = require('../../constants')

class OrderData {
  /**
   * 導入支援・スタンダードプラン用オーダー情報コンストラクタ
   * @param {string} tenantId テナントID
   * @param {object} inputData 画面入力データ
   * @param {string} orderType オーダー種別
   * @param {string} serviceType サービス種別
   * @param {string} prdtCode 商品コード
   * @param {string} appType 申込区分
   * @param {string} salesChannelDeptType 組織区分
   */
  constructor(tenantId, inputData, orderType, serviceType, prdtCode, appType, salesChannelDeptType) {
    // 基本情報の設定
    this.contractBasicInfo = {
      // トレシフテナントID
      tradeshiftId: tenantId,
      // オーダーID
      orderId: '',
      // オーダー種別
      orderType: orderType,
      // サービス種別
      serviceType: serviceType,
      // 契約者名変更フラッグ
      contractChangeName: '',
      // 契約者住所変更フラッグ
      contractChangeAddress: '',
      // 契約者連絡先変更フラッグ
      contractChangeContact: '',
      // 申込年月日
      appDate: '',
      // 開通希望年月日
      OpeningDate: inputData.openingDate?.replace(/-/g, '') ?? '',
      // 契約番号
      contractNumber: '',
      // 販売チャネルコード
      salesChannelCode: inputData.salesChannelCode || '79100100',
      // 販売チャネル名
      salesChannelName: inputData.salesChannelName || 'ＰＳ本部＿ＡＰＳ部＿第二ＳＣ部門一Ｇ四Ｔ',
      // 部課名
      salesChannelDeptName: inputData.salesChannelDeptName || '第二ＳＣ部門　第一グループ',
      // 社員コード
      salesChannelEmplyeeCode: inputData.salesChannelEmplyeeCode ?? '',
      // 担当者名
      salesChannelPersonName: inputData.salesChannelPersonName || 'デジトレアプリ担当',
      // 組織区分
      salesChannelDeptType: salesChannelDeptType || 'アプリケーションサービス部',
      // 電話番号
      salesChannelPhoneNumber: inputData.salesChannelPhoneNumber || '050-3383-9608',
      // メールアドレス
      salesChannelMailAddress: inputData.salesChannelMailAddress || 'digitaltrade-ap-ops@ntt.com',
      // 開通案内パスワード
      kaianPassword: inputData.password ?? ''
    }

    // 新設の場合
    if (orderType === constants.statusConstants.orderTypes.newOrder) {
      // 販売店コード
      this.contractBasicInfo.campaignCode = ''
      // 販売担当者名
      this.contractBasicInfo.salesPersonName = ''

      // 契約者情報の設定
      this.contractAccountInfo = {
        // 契約アカウントID(SOPFで補填のため空)
        contractAccountId: '',
        // 顧客区分ダミー番号とする(SOPFで補填のため空)
        customerType: '',
        // 共通顧客ID
        commonCustomerId: inputData.commonCustomerId || 'C9999999999',
        // 契約者名
        contractorName: inputData.contractorName ?? '',
        // 契約者カナ名
        contractorKanaName: inputData.contractorKanaName ?? '',
        // 契約者郵便番号
        postalNumber: inputData.postalNumber ?? '',
        // 契約者住所（丁目まで）
        contractAddress: inputData.contractAddressVal ?? '',
        // 契約者番地等1番地以下を入力
        banch1: inputData.banch1 ?? '',
        // 契約者建物等1
        tatemono1: inputData.tatemono1 ?? ''
      }

      // 契約情報リストの設定
      this.contactList = [
        {
          // 連絡先種別(SOPFで補填のため空)
          contactType: '',
          // 連絡先担当者名
          contactPersonName: inputData.contactPersonName ?? '',
          // 連絡先電話番号
          contactPhoneNumber: inputData.contactPhoneNumber ?? '',
          // 連絡先メールアドレス
          contactMail: inputData.contactMail ?? '',
          // 請求書送付先郵便番号
          billMailingPostalNumber: inputData.billMailingPostalNumber ?? '',
          // 請求書送付先住所（丁目まで）
          billMailingAddress: inputData.billMailingAddress ?? '',
          // 請求書送付先番地等1
          billMailingAddressBanchi1: inputData.billMailingAddressBanchi1 ?? '',
          // 請求書送付先建物等1
          billMailingAddressBuilding1: inputData.billMailingAddressBuilding1 ?? '',
          // 請求書送付先宛名（会社名+部課名）カナ名
          billMailingKanaName: inputData.billMailingKanaName ?? '',
          // 請求書送付先宛名（会社名+部課名）
          billMailingName: inputData.billMailingName ?? '',
          // 請求に関する連絡先お名前
          billMailingPersonName: inputData.billMailingPersonName ?? '',
          // 請求に関する連絡先電話番号
          billMailingPhoneNumber: inputData.billMailingPhoneNumber ?? '',
          // 請求に関する連絡先メールアドレス
          billMailingMailAddress: inputData.billMailingMailAddress ?? ''
        }
      ]

      // 商品情報リストの設定
      this.prdtList = [
        {
          // 商品コード
          prdtCode: prdtCode,
          // 利用ID数
          idnumber: '',
          // 申込区分
          appType: appType
        }
      ]
    }
  }

  /**
   * 基本情報のバリデーション
   * @returns 基本情報のバリデーション結果
   */
  validateContractBasicInfo() {
    return this.contractBasicInfo.kaianPassword
  }

  /**
   * 契約者情報のバリデーション
   * @returns 契約者情報のバリデーション結果
   */
  validateContractAccountInfo() {
    const contractAccountInfo = this.contractAccountInfo
    return (
      contractAccountInfo.contractorName &&
      contractAccountInfo.contractorKanaName &&
      contractAccountInfo.postalNumber &&
      contractAccountInfo.contractAddress &&
      contractAccountInfo.banch1
    )
  }

  /**
   * 契約者連絡情報のバリデーション
   * @returns 契約者連絡情報のバリデーション結果
   */
  validateContractInfo() {
    const contractInfo = this.contactList[0]
    return contractInfo.contactPersonName && contractInfo.contactPhoneNumber && contractInfo.contactMail
  }

  /**
   * 請求情報のバリデーション
   * @returns 請求情報のバリデーション結果
   */
  validateBillMailingInfo() {
    const billMailingInfo = this.contactList[0]
    return (
      billMailingInfo.billMailingPostalNumber &&
      billMailingInfo.billMailingAddress &&
      billMailingInfo.billMailingAddressBanchi1 &&
      billMailingInfo.billMailingKanaName &&
      billMailingInfo.billMailingName &&
      billMailingInfo.billMailingPersonName &&
      billMailingInfo.billMailingPhoneNumber &&
      billMailingInfo.billMailingMailAddress
    )
  }
}

module.exports = OrderData
