'use strict'

const tableName = 'ChannelDepartment'
module.exports = {
  up: async (queryInterface, Sequelize) => {
    /**
     * Add seed commands here.
     *
     * Example:
     * await queryInterface.bulkInsert('People', [{
     *   name: 'John Doe',
     *   isBetaMember: false
     * }], {});
     */

    const channelDepartments = [
      'Com第一営業本部',
      'Com第二営業本部',
      'Com第三営業本部',
      'Com第四営業本部',
      'Com第五営業本部',
      'Com西日本営業本部',
      'ComICTコンサルティング本部',
      'Comグローバル事業推進部',
      'Com一般',
      'CMK（VA東日本エリア）',
      'CMK（VA西日本エリア）',
      'CMK（VA以外）',
      'NTT東日本',
      'NTT西日本',
      '金沢OCNSC',
      '名古屋OCNSC',
      '幕張DSC',
      'その他',
      '第一ビジネスソリューション部',
      '第二ビジネスソリューション部',
      '第三ビジネスソリューション部',
      '第四ビジネスソリューション部',
      '第五ビジネスソリューション部',
      'ソリューションサービス部',
      '西日本営業本部',
      '西日本営業本部（代理店）',
      'セールス＆マーケティング部',
      'データプラットフォームサービス部',
      'アプリケーションサービス部',
      'マネージド＆セキュリティサービス部',
      'インフラデザイン部',
      'PS本部事業推進部',
      'BS本部事業推進部',
      'その他代理店',
      'S&M部',
      'オンライン申込',
      '事業推進部',
      'VA担当者',
      '一営　エンタメ移行用',
      'VA担当者　エンタメ移行用',
      'S&M部　法人コンタクトセンター',
      'S&M部　お客様SC',
      'S&M部　コンタクトセンタ　鹿児島',
      'S&M部　コムストア',
      'S&M部　コンタクトセンタ　横浜',
      'S&M部　コンタクトセンタ　代々木',
      'S&M部　コンタクトセンタ　名古屋',
      'S&M部　コンタクトセンタ　牧野',
      'S&M部　コンタクトセンタ　広島',
      'S&M部　コンタクトセンタ　大阪',
      'オンサイ',
      'GIGAスクール施策',
      'ドコモビジネスブラス（月額）',
      'ドコモビジネスプラス（年払）'
    ]

    const datas = []
    const startCode = 1

    for (let idx = 0; idx < channelDepartments.length; idx++) {
      datas.push({
        code: ('00' + (idx + startCode)).slice(-2),
        name: channelDepartments[idx]
      })
    }
    return await queryInterface.bulkInsert(tableName, datas, {})
  },

  down: async (queryInterface, Sequelize) => {
    /**
     * Add commands to revert seed here.
     *
     * Example:
     * await queryInterface.bulkDelete('People', null, {});
     */
    return await queryInterface.bulkDelete(tableName, null, {})
  }
}
