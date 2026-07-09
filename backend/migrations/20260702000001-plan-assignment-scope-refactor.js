"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const internalTable = await queryInterface.describeTable("internal_assignments");
    const planNodesTable = await queryInterface.describeTable("plan_nodes");

    if (internalTable.action_id?.allowNull === false) {
      await queryInterface.sequelize.query(`
        ALTER TABLE internal_assignments
        ALTER COLUMN action_id DROP NOT NULL
      `);
    }

    if (!internalTable.role_id) {
      await queryInterface.addColumn("internal_assignments", "role_id", {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: "roles",
          key: "role_id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      });
    }

    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_internal_assignments_role_id
      ON internal_assignments (role_id)
    `);

    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_internal_assignments_active_node_role
      ON internal_assignments (plan_node_id, role_id)
      WHERE is_active = true AND role_id IS NOT NULL
    `);

    if (!planNodesTable.assignment_context) {
      await queryInterface.addColumn("plan_nodes", "assignment_context", {
        type: Sequelize.JSONB,
        allowNull: true,
      });
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS uq_internal_assignments_active_node_role
    `);
    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS idx_internal_assignments_role_id
    `);

    const internalTable = await queryInterface.describeTable("internal_assignments");
    if (internalTable.role_id) {
      await queryInterface.removeColumn("internal_assignments", "role_id");
    }

    const planNodesTable = await queryInterface.describeTable("plan_nodes");
    if (planNodesTable.assignment_context) {
      await queryInterface.removeColumn("plan_nodes", "assignment_context");
    }

    await queryInterface.changeColumn("internal_assignments", "action_id", {
      type: Sequelize.UUID,
      allowNull: false,
      references: {
        model: "plan_assignment_actions",
        key: "assignment_action_id",
      },
      onUpdate: "CASCADE",
      onDelete: "RESTRICT",
    });
  },
};
