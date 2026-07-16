"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("plan_nodes", "period_actual_narration", {
      type: Sequelize.TEXT,
      allowNull: true,
    });
    await queryInterface.addColumn("plan_nodes", "annual_actual_narration", {
      type: Sequelize.TEXT,
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("plan_nodes", "annual_actual_narration");
    await queryInterface.removeColumn("plan_nodes", "period_actual_narration");
  },
};
