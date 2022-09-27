'use strict'

// SubAccountCodeテーブルaccountCodeIdカラムforeign key指定・解除
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const addConstraint =
      'ALTER TABLE SubAccountCode WITH NOCHECK ADD CONSTRAINT fk_SubAccountCode_AccountCode FOREIGN KEY(accountCodeId) REFERENCES AccountCode(accountCodeId) ON UPDATE CASCADE ON DELETE CASCADE'
    return [await queryInterface.sequelize.query(addConstraint, {})]
  },

  down: async (queryInterface, Sequelize) => {
    return [await queryInterface.removeConstraint('SubAccountCode', 'fk_SubAccountCode_AccountCode')]
  }
}
