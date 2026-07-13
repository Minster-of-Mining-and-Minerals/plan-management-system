"use strict";

const {
  tableExists,
  columnExists,
  safeAddColumn,
} = require("./_helpers/migrationUtils");

module.exports = {
  async up(queryInterface, Sequelize) {
    if (!(await tableExists(queryInterface, "appointment_billing_accounts"))) {
      return;
    }

    await safeAddColumn(
      queryInterface,
      "appointment_billing_accounts",
      "serving_by",
      {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: "users", key: "user_id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      }
    );

    await safeAddColumn(
      queryInterface,
      "appointment_billing_accounts",
      "serving_claimed_at",
      { type: Sequelize.DATE, allowNull: true }
    );

    await safeAddColumn(
      queryInterface,
      "appointment_billing_accounts",
      "serving_expires_at",
      { type: Sequelize.DATE, allowNull: true }
    );
  },

  async down(queryInterface) {
    if (!(await tableExists(queryInterface, "appointment_billing_accounts"))) {
      return;
    }
    if (await columnExists(queryInterface, "appointment_billing_accounts", "serving_expires_at")) {
      await queryInterface.removeColumn(
        "appointment_billing_accounts",
        "serving_expires_at"
      );
    }
    if (await columnExists(queryInterface, "appointment_billing_accounts", "serving_claimed_at")) {
      await queryInterface.removeColumn(
        "appointment_billing_accounts",
        "serving_claimed_at"
      );
    }
    if (await columnExists(queryInterface, "appointment_billing_accounts", "serving_by")) {
      await queryInterface.removeColumn(
        "appointment_billing_accounts",
        "serving_by"
      );
    }
  },
};
