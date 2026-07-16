"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      ALTER TABLE internal_assignments
      ALTER COLUMN action_id DROP NOT NULL
    `);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.changeColumn("internal_assignments", "action_id", {
      type: Sequelize.UUID,
      allowNull: false,
      references: {
        model: "plan_assignment_actions",
        key: "assignment_action_id",
      },
      onUpdate: "CASCADE",
      onDelete: "RESTRICT",
    });
  },
};
