"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("plan_versions", "planning_start_date", {
      type: Sequelize.DATEONLY,
      allowNull: true,
    });
    await queryInterface.addColumn("plan_versions", "planning_end_date", {
      type: Sequelize.DATEONLY,
      allowNull: true,
    });
    await queryInterface.addColumn("plan_versions", "start_month", {
      type: Sequelize.INTEGER,
      allowNull: true,
    });
    await queryInterface.addColumn("plan_versions", "end_month", {
      type: Sequelize.INTEGER,
      allowNull: true,
    });

    await queryInterface.sequelize.query(`
      UPDATE plan_versions
      SET
        planning_start_date = MAKE_DATE(start_year, 1, 1),
        planning_end_date = MAKE_DATE(end_year, 12, 31),
        start_month = 1,
        end_month = 12
    `);

    await queryInterface.changeColumn("plan_versions", "planning_start_date", {
      type: Sequelize.DATEONLY,
      allowNull: false,
    });
    await queryInterface.changeColumn("plan_versions", "planning_end_date", {
      type: Sequelize.DATEONLY,
      allowNull: false,
    });
    await queryInterface.changeColumn("plan_versions", "start_month", {
      type: Sequelize.INTEGER,
      allowNull: false,
    });
    await queryInterface.changeColumn("plan_versions", "end_month", {
      type: Sequelize.INTEGER,
      allowNull: false,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("plan_versions", "end_month");
    await queryInterface.removeColumn("plan_versions", "start_month");
    await queryInterface.removeColumn("plan_versions", "planning_end_date");
    await queryInterface.removeColumn("plan_versions", "planning_start_date");
  },
};
