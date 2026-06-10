"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`
      ALTER TYPE "enum_plan_versions_status" ADD VALUE IF NOT EXISTS 'finalized';
    `);
    await queryInterface.sequelize.query(`
      ALTER TYPE "enum_plan_versions_status" ADD VALUE IF NOT EXISTS 'locked';
    `);

    await queryInterface.addColumn("plan_versions", "version_kind", {
      type: Sequelize.ENUM("master", "annual"),
      allowNull: false,
      defaultValue: "master",
    });

    await queryInterface.addColumn("plan_versions", "parent_plan_version_id", {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: "plan_versions",
        key: "plan_version_id",
      },
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    });

    await queryInterface.addColumn("plan_versions", "planning_year", {
      type: Sequelize.INTEGER,
      allowNull: true,
    });

    await queryInterface.addColumn("plan_versions", "sequence_index", {
      type: Sequelize.INTEGER,
      allowNull: true,
    });

    await queryInterface.addColumn("plan_versions", "is_locked", {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });

    await queryInterface.addColumn("plan_versions", "finalized_at", {
      type: Sequelize.DATE,
      allowNull: true,
    });

    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS plan_versions_parent_sequence_unique
      ON plan_versions (parent_plan_version_id, sequence_index)
      WHERE parent_plan_version_id IS NOT NULL;
    `);

    await queryInterface.addColumn("plan_nodes", "source_plan_node_id", {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: "plan_nodes",
        key: "plan_node_id",
      },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    });

    await queryInterface.addColumn("plan_nodes", "annual_target", {
      type: Sequelize.FLOAT,
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("plan_nodes", "annual_target");
    await queryInterface.removeColumn("plan_nodes", "source_plan_node_id");
    await queryInterface.removeColumn("plan_versions", "finalized_at");
    await queryInterface.removeColumn("plan_versions", "is_locked");
    await queryInterface.removeColumn("plan_versions", "sequence_index");
    await queryInterface.removeColumn("plan_versions", "planning_year");
    await queryInterface.removeColumn("plan_versions", "parent_plan_version_id");
    await queryInterface.removeColumn("plan_versions", "version_kind");
  },
};
