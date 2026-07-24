"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableDescription = await queryInterface.describeTable("clinical_orders");
    if (!tableDescription.cancellation_reason) {
      await queryInterface.addColumn("clinical_orders", "cancellation_reason", {
        type: Sequelize.TEXT,
        allowNull: true,
      });
    }
  },

  async down(queryInterface) {
    const tableDescription = await queryInterface.describeTable("clinical_orders");
    if (tableDescription.cancellation_reason) {
      await queryInterface.removeColumn("clinical_orders", "cancellation_reason");
    }
  },
};
