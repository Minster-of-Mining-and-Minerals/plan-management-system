"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tableInfo = await queryInterface.describeTable("national_reporting_assignments");

    if (!tableInfo.delegated_user_id) {
      await queryInterface.addColumn("national_reporting_assignments", "delegated_user_id", {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: "users",
          key: "user_id",
        },
        onDelete: "SET NULL",
        onUpdate: "CASCADE",
      });
    }

    if (!tableInfo.regional_structure_id) {
      await queryInterface.addColumn("national_reporting_assignments", "regional_structure_id", {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: "regional_structures",
          key: "regional_structure_id",
        },
        onDelete: "SET NULL",
        onUpdate: "CASCADE",
      });
    }

    if (!tableInfo.delegated_at) {
      await queryInterface.addColumn("national_reporting_assignments", "delegated_at", {
        type: Sequelize.DATE,
        allowNull: true,
      });
    }

    if (!tableInfo.delegation_notes) {
      await queryInterface.addColumn("national_reporting_assignments", "delegation_notes", {
        type: Sequelize.TEXT,
        allowNull: true,
      });
    }
  },

  down: async (queryInterface, Sequelize) => {
    const tableInfo = await queryInterface.describeTable("national_reporting_assignments");

    if (tableInfo.delegation_notes) {
      await queryInterface.removeColumn("national_reporting_assignments", "delegation_notes");
    }
    if (tableInfo.delegated_at) {
      await queryInterface.removeColumn("national_reporting_assignments", "delegated_at");
    }
    if (tableInfo.regional_structure_id) {
      await queryInterface.removeColumn("national_reporting_assignments", "regional_structure_id");
    }
    if (tableInfo.delegated_user_id) {
      await queryInterface.removeColumn("national_reporting_assignments", "delegated_user_id");
    }
  },
};
