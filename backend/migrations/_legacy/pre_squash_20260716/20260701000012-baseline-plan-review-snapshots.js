"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("plan_versions", "review_snapshot_of_version_id", {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: "plan_versions", key: "plan_version_id" },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    });

    await queryInterface.addColumn("plan_versions", "review_snapshot_root_id", {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: "plan_versions", key: "plan_version_id" },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    });

    await queryInterface.addColumn("plan_versions", "active_review_snapshot_id", {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: "plan_versions", key: "plan_version_id" },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    });

    await queryInterface.addColumn("issues", "review_snapshot_id", {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: "plan_versions", key: "plan_version_id" },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    });

    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_plan_versions_review_snapshot_root
      ON plan_versions (review_snapshot_root_id)
      WHERE review_snapshot_root_id IS NOT NULL
    `);

    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_plan_versions_active_review_snapshot
      ON plan_versions (active_review_snapshot_id)
      WHERE active_review_snapshot_id IS NOT NULL
    `);

    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_issues_review_snapshot_id
      ON issues (review_snapshot_id)
      WHERE review_snapshot_id IS NOT NULL
    `);
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("issues", "review_snapshot_id");
    await queryInterface.removeColumn("plan_versions", "active_review_snapshot_id");
    await queryInterface.removeColumn("plan_versions", "review_snapshot_root_id");
    await queryInterface.removeColumn("plan_versions", "review_snapshot_of_version_id");
  },
};
