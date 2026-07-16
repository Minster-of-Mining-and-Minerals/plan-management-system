"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const internalTable = await queryInterface.describeTable("internal_assignments");

    if (!internalTable.permission_group_id) {
      await queryInterface.addColumn("internal_assignments", "permission_group_id", {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: "permission_groups",
          key: "permission_group_id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      });
    }

    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_internal_assignments_permission_group_id
      ON internal_assignments (permission_group_id)
    `);

    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_internal_assignments_active_node_permission_group
      ON internal_assignments (plan_node_id, permission_group_id)
      WHERE is_active = true AND permission_group_id IS NOT NULL
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS uq_internal_assignments_active_node_permission_group
    `);
    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS idx_internal_assignments_permission_group_id
    `);

    const internalTable = await queryInterface.describeTable("internal_assignments");
    if (internalTable.permission_group_id) {
      await queryInterface.removeColumn("internal_assignments", "permission_group_id");
    }
  },
};
