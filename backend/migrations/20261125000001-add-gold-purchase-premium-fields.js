"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tableInfo = await queryInterface.describeTable("gold_purchases").catch(() => ({}));

    if (!tableInfo.amount_before_premium) {
      await queryInterface.addColumn("gold_purchases", "amount_before_premium", {
        type: Sequelize.DECIMAL(18, 2),
        allowNull: true,
        defaultValue: 0.0,
      });
    }

    if (!tableInfo.premium_percentage) {
      await queryInterface.addColumn("gold_purchases", "premium_percentage", {
        type: Sequelize.DECIMAL(6, 2),
        allowNull: true,
        defaultValue: 0.0,
      });
    }

    if (!tableInfo.premium_amount) {
      await queryInterface.addColumn("gold_purchases", "premium_amount", {
        type: Sequelize.DECIMAL(18, 2),
        allowNull: true,
        defaultValue: 0.0,
      });
    }
  },

  down: async (queryInterface) => {
    const tableInfo = await queryInterface.describeTable("gold_purchases").catch(() => ({}));

    if (tableInfo.premium_amount) {
      await queryInterface.removeColumn("gold_purchases", "premium_amount");
    }
    if (tableInfo.premium_percentage) {
      await queryInterface.removeColumn("gold_purchases", "premium_percentage");
    }
    if (tableInfo.amount_before_premium) {
      await queryInterface.removeColumn("gold_purchases", "amount_before_premium");
    }
  },
};
