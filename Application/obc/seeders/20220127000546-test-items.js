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
    await queryInterface.bulkInsert(
      'Items',
      [
        { id: 1, formatId: 1002, key: 'PaymentMeans/PaymentDueDate' },
        { id: 2, formatId: 1003, key: 'InvoiceLine/OrderLineReference.[0].OrderReference.ID' },
        { id: 3, formatId: 1003, key: 'InvoiceLine/Item.ModelName.[0]' }
      ],
      {},
      {
        id: {
          autoIncrement: true
        }
      }
    )
  },

  down: async (queryInterface, Sequelize) => {
    /**
     * Add commands to revert seed here.
     *
     * Example:
     * await queryInterface.bulkDelete('People', null, {});
     */
    await queryInterface.bulkDelete('Items', null, {})
  }
}
