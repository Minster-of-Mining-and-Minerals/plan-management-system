"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("target_reallocation_requests", "plan_amendment_id", {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: "plan_amendments", key: "plan_amendment_id" },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    });

    await queryInterface.addIndex("target_reallocation_requests", ["plan_amendment_id"], {
      unique: true,
      name: "target_reallocation_requests_amendment_unique",
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex(
      "target_reallocation_requests",
      "target_reallocation_requests_amendment_unique"
    );
    await queryInterface.removeColumn("target_reallocation_requests", "plan_amendment_id");
  },
};
