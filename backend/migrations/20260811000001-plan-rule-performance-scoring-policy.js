"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("plan_rules", "performance_scoring_policy", {
      type: Sequelize.ENUM("CAP_100", "ALLOW_OVER_ACHIEVEMENT"),
      allowNull: false,
      defaultValue: "CAP_100",
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("plan_rules", "performance_scoring_policy");
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_plan_rules_performance_scoring_policy";'
    );
  },
};
