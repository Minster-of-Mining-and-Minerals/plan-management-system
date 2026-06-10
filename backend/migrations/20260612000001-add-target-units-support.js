"use strict";

const DEFAULT_TARGET_UNITS = [
  { id: "person", label: "Person", symbol: "persons" },
  { id: "km", label: "Kilometer", symbol: "km" },
  { id: "birr", label: "Birr", symbol: "ETB" },
  { id: "ton", label: "Ton", symbol: "t" },
  { id: "unit", label: "Unit", symbol: "units" },
];

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("planning_configurations", "target_units", {
      type: Sequelize.JSON,
      allowNull: true,
    });

    await queryInterface.sequelize.query(
      `UPDATE planning_configurations SET target_units = :units`,
      {
        replacements: { units: JSON.stringify(DEFAULT_TARGET_UNITS) },
      }
    );

    await queryInterface.changeColumn("planning_configurations", "target_units", {
      type: Sequelize.JSON,
      allowNull: false,
    });

    await queryInterface.addColumn("plan_nodes", "target_unit", {
      type: Sequelize.STRING(50),
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("plan_nodes", "target_unit");
    await queryInterface.removeColumn("planning_configurations", "target_units");
  },
};
