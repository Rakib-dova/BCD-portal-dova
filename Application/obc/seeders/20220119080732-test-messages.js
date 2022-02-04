'use strict'

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
    await queryInterface.bulkInsert('Messages', [
      {
        code: 'N00001',
        message: `<div class="content">
  <ul>
    <li>本機能では、商奉行にて<span class="has-text-weight-bold">未発行の</span>請求書を一覧表示・発行を行います。</li>
    <li>初回利用時には最も小さな請求書番号から順番に表示します。次回以降は本機能で発行した請求書番号の続きから表示します。</li>
    <li>「抽出範囲」の入力欄から請求書番号の範囲を指定し、一覧を更新することも可能です。</li>
    <li>本機能では、請求書番号で請求書を区別します。そのため、商奉行の請求書番号設定を以下のリンク先を参考にご確認ください。<br/><a href="https://support.ntt.com/bconnection/faq/">FAQリンク：商奉行の請求書番号設定方法​</a></li>
  </ul>
</div>
<div class="content">
  <ul>
    <li>上記の説明は画面上の<span class="has-text-weight-bold">?マーク</span>からいつでもご確認いただけます。​</li>
  </ul>
</div>`
      }
    ])
  },

  down: async (queryInterface, Sequelize) => {
    /**
     * Add commands to revert seed here.
     *
     * Example:
     * await queryInterface.bulkDelete('People', null, {});
     */
    await queryInterface.bulkDelete('Messages', null, {})
  }
}
