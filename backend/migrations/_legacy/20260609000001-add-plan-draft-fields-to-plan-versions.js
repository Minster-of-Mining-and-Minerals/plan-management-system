"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("plan_versions", "draft_name", {
      type: Sequelize.STRING(255),
      allowNull: true,
    });
    await queryInterface.addColumn("plan_versions", "start_year", {
      type: Sequelize.INTEGER,
      allowNull: true,
    });
    await queryInterface.addColumn("plan_versions", "end_year", {
      type: Sequelize.INTEGER,
      allowNull: true,
    });
    await queryInterface.addColumn("plan_versions", "planning_duration_years", {
      type: Sequelize.INTEGER,
      allowNull: true,
    });

    await queryInterface.sequelize.query(`
      UPDATE plan_versions
      SET
        start_year = year,
        end_year = year,
        planning_duration_years = 1,
        draft_name = CONCAT('Plan ', year::text, ' v', version_number::text)
    `);

    await queryInterface.changeColumn("plan_versions", "draft_name", {
      type: Sequelize.STRING(255),
      allowNull: false,
    });
    await queryInterface.changeColumn("plan_versions", "start_year", {
      type: Sequelize.INTEGER,
      allowNull: false,
    });
    await queryInterface.changeColumn("plan_versions", "end_year", {
      type: Sequelize.INTEGER,
      allowNull: false,
    });
    await queryInterface.changeColumn("plan_versions", "planning_duration_years", {
      type: Sequelize.INTEGER,
      allowNull: false,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("plan_versions", "planning_duration_years");
    await queryInterface.removeColumn("plan_versions", "end_year");
    await queryInterface.removeColumn("plan_versions", "start_year");
    await queryInterface.removeColumn("plan_versions", "draft_name");
  },
};
