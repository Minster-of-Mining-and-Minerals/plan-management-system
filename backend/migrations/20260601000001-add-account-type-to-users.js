"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("users", "account_type", {
      type: Sequelize.ENUM("INTERNAL", "PATIENT"),
      allowNull: false,
      defaultValue: "INTERNAL",
    });
    await queryInterface.addIndex("users", ["account_type"]);
  },

  async down(queryInterface) {
    await queryInterface.removeIndex("users", ["account_type"]);
    await queryInterface.removeColumn("users", "account_type");
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_users_account_type";'
    );
  },
};
