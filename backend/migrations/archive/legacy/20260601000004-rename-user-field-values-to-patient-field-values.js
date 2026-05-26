"use strict";

module.exports = {
  async up(queryInterface) {
    await queryInterface.renameTable(
      "user_field_values",
      "patient_field_values"
    );
  },

  async down(queryInterface) {
    await queryInterface.renameTable(
      "patient_field_values",
      "user_field_values"
    );
  },
};
