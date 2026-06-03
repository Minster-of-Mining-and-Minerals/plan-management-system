"use strict";

const { safeAddIndex } = require("./_helpers/migrationUtils");

async function safeRemoveIndex(queryInterface, table, name) {
  try {
    await queryInterface.removeIndex(table, name);
  } catch {
    // index may not exist
  }
}

module.exports = {
  async up(queryInterface, Sequelize) {
    await safeRemoveIndex(
      queryInterface,
      "diagnosis_form_configs",
      "diagnosis_form_configs_staff_unique"
    );

    await queryInterface.addColumn("diagnosis_form_configs", "sort_order", {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
    });

    await safeAddIndex(queryInterface, "diagnosis_form_configs", [
      "assigned_staff_id",
      "is_active",
    ]);
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("diagnosis_form_configs", "sort_order");
    await safeAddIndex(
      queryInterface,
      "diagnosis_form_configs",
      ["assigned_staff_id"],
      { unique: true, name: "diagnosis_form_configs_staff_unique" }
    );
  },
};
