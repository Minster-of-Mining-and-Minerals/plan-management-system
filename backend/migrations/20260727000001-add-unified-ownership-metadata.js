"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const ordersDesc = await queryInterface.describeTable("clinical_orders");
    if (!ordersDesc.intent_data) {
      await queryInterface.addColumn("clinical_orders", "intent_data", {
        type: Sequelize.JSONB,
        allowNull: true,
      });
    }
    if (!ordersDesc.originating_form_config_id) {
      await queryInterface.addColumn("clinical_orders", "originating_form_config_id", {
        type: Sequelize.UUID,
        allowNull: true,
      });
    }

    const defsDesc = await queryInterface.describeTable("clinical_order_definitions");
    if (!defsDesc.closure_policy) {
      await queryInterface.addColumn("clinical_order_definitions", "closure_policy", {
        type: Sequelize.STRING(16),
        allowNull: false,
        defaultValue: "STRICT",
      });
    }
  },

  async down(queryInterface) {
    const ordersDesc = await queryInterface.describeTable("clinical_orders");
    if (ordersDesc.intent_data) {
      await queryInterface.removeColumn("clinical_orders", "intent_data");
    }
    if (ordersDesc.originating_form_config_id) {
      await queryInterface.removeColumn("clinical_orders", "originating_form_config_id");
    }

    const defsDesc = await queryInterface.describeTable("clinical_order_definitions");
    if (defsDesc.closure_policy) {
      await queryInterface.removeColumn("clinical_order_definitions", "closure_policy");
    }
  },
};
