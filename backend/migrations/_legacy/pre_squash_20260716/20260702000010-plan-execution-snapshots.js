"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("plan_versions", "execution_snapshot_of_version_id", {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: "plan_versions", key: "plan_version_id" },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    });

    await queryInterface.addColumn("plan_versions", "execution_snapshot_root_id", {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: "plan_versions", key: "plan_version_id" },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    });

    await queryInterface.addColumn("plan_versions", "active_execution_snapshot_id", {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: "plan_versions", key: "plan_version_id" },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    });

    await queryInterface.addColumn("plan_versions", "execution_version_number", {
      type: Sequelize.INTEGER,
      allowNull: true,
    });

    await queryInterface.addColumn("plan_versions", "execution_status", {
      type: Sequelize.ENUM("locked", "open", "completed"),
      allowNull: true,
    });

    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_plan_versions_execution_snapshot_root
      ON plan_versions (execution_snapshot_root_id)
      WHERE execution_snapshot_root_id IS NOT NULL
    `);

    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_plan_versions_active_execution_snapshot
      ON plan_versions (active_execution_snapshot_id)
      WHERE active_execution_snapshot_id IS NOT NULL
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS idx_plan_versions_active_execution_snapshot
    `);
    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS idx_plan_versions_execution_snapshot_root
    `);

    await queryInterface.removeColumn("plan_versions", "execution_status");
    await queryInterface.sequelize.query(
      `DROP TYPE IF EXISTS "enum_plan_versions_execution_status"`
    );
    await queryInterface.removeColumn("plan_versions", "execution_version_number");
    await queryInterface.removeColumn("plan_versions", "active_execution_snapshot_id");
    await queryInterface.removeColumn("plan_versions", "execution_snapshot_root_id");
    await queryInterface.removeColumn("plan_versions", "execution_snapshot_of_version_id");
  },
};
