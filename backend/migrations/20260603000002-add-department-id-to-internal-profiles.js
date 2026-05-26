"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("internal_user_profiles", "department_id", {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: "departments", key: "department_id" },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    });

    await queryInterface.addIndex("internal_user_profiles", ["department_id"]);
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("internal_user_profiles", "department_id");
  },
};
