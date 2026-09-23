"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("plan_rules", "owned_by_plan_version_id", {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: "plan_versions", key: "plan_version_id" },
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    });

    await queryInterface.addColumn("plan_rules", "source_plan_rule_id", {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: "plan_rules", key: "plan_rule_id" },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    });

    await queryInterface.addColumn("planning_configurations", "owned_by_plan_version_id", {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: "plan_versions", key: "plan_version_id" },
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    });

    await queryInterface.addColumn("planning_configurations", "source_planning_configuration_id", {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: "planning_configurations",
        key: "planning_configuration_id",
      },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    });

    await queryInterface.addColumn("plan_versions", "planning_configuration_id", {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: "planning_configurations",
        key: "planning_configuration_id",
      },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    });

    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_plan_rules_owned_by_plan_version
      ON plan_rules (owned_by_plan_version_id)
      WHERE owned_by_plan_version_id IS NOT NULL
    `);

    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_planning_configurations_owned_by_plan_version
      ON planning_configurations (owned_by_plan_version_id)
      WHERE owned_by_plan_version_id IS NOT NULL
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(
      "DROP INDEX IF EXISTS uq_planning_configurations_owned_by_plan_version"
    );
    await queryInterface.sequelize.query(
      "DROP INDEX IF EXISTS uq_plan_rules_owned_by_plan_version"
    );

    await queryInterface.removeColumn("plan_versions", "planning_configuration_id");
    await queryInterface.removeColumn(
      "planning_configurations",
      "source_planning_configuration_id"
    );
    await queryInterface.removeColumn(
      "planning_configurations",
      "owned_by_plan_version_id"
    );
    await queryInterface.removeColumn("plan_rules", "source_plan_rule_id");
    await queryInterface.removeColumn("plan_rules", "owned_by_plan_version_id");
  },
};
