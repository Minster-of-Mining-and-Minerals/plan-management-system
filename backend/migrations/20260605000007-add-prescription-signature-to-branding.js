"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn(
      "system_branding",
      "prescription_signature_file",
      {
        type: Sequelize.STRING(500),
        allowNull: true,
      }
    );
  },

  async down(queryInterface) {
    await queryInterface.removeColumn(
      "system_branding",
      "prescription_signature_file"
    );
  },
};
