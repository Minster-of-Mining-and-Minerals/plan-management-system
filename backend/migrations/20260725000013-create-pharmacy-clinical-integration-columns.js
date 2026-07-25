"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tableInfo = await queryInterface.describeTable("clinical_orders");

    if (!tableInfo.prescription_id) {
      await queryInterface.addColumn("clinical_orders", "prescription_id", {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: "prescriptions",
          key: "prescription_id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      });
    }

    if (!tableInfo.pharmacy_status) {
      await queryInterface.addColumn("clinical_orders", "pharmacy_status", {
        type: Sequelize.STRING(64),
        allowNull: true,
        defaultValue: "PENDING_FORWARD",
      });
    }
  },

  down: async (queryInterface) => {
    const tableInfo = await queryInterface.describeTable("clinical_orders");

    if (tableInfo.prescription_id) {
      await queryInterface.removeColumn("clinical_orders", "prescription_id");
    }
    if (tableInfo.pharmacy_status) {
      await queryInterface.removeColumn("clinical_orders", "pharmacy_status");
    }
  },
};
