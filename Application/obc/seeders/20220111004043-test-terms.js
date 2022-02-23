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
    await queryInterface.bulkInsert('Terms', [
      {
        content: `<div class="content">
<h1>サービス利用規約</h1>
<p>規約の文言つらつら</p>
<ul>
  <li>A
  <li>B
  <li>C
  <li>D
  <li>E
  <li>F
  <li>G
  <li>H
  <li>I
  <li>J
  <li>K
  <li>L
  <li>M
  <li>N
  <li>O
  <li>P
  <li>Q
  <li>R
  <li>S
  <li>T
  <li>U
  <li>V
  <li>W
  <li>X
  <li>Y
  <li>Z
</ul>
</div>
`,
        effectiveAt: '2022-01-01'
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
    await queryInterface.bulkDelete('Terms', null, {})
  }
}
