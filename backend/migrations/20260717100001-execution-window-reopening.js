"use strict";

const { v4: uuidv4 } = require("uuid");
const { QueryTypes } = require("sequelize");

const SUPER_ADMIN_ROLE_ID = "00000000-0000-4000-8000-000000000002";

const NEW_PERMISSIONS = [
  {
    resource: "plan",
    action: "request_execution_reopening",
    permission_tier: "standard",
  },
  {
    resource: "plan",
    action: "approve_execution_reopening",
    permission_tier: "standard",
  },
];

async function addEnumValue(queryInterface, enumName, value) {
  await queryInterface.sequelize.query(`
    DO $$ BEGIN
      ALTER TYPE "${enumName}" ADD VALUE IF NOT EXISTS '${value}';
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);
}

async function ensurePermission(queryInterface, perm, now) {
  try {
    await queryInterface.bulkInsert(
      "permissions",
      [
        {
          permission_id: uuidv4(),
          resource: perm.resource,
          action: perm.action,
          permission_tier: perm.permission_tier,
          is_active: true,
          created_at: now,
          updated_at: now,
        },
      ],
      { ignoreDuplicates: true }
    );
  } catch (error) {
    if (error.name !== "SequelizeUniqueConstraintError") {
      throw error;
    }
  }

  await queryInterface.sequelize.query(
    `UPDATE permissions
     SET permission_tier = :tier, is_active = true, updated_at = :now
     WHERE resource = :resource AND action = :action`,
    {
      replacements: {
        tier: perm.permission_tier,
        now,
        resource: perm.resource,
        action: perm.action,
      },
    }
  );

  const [row] = await queryInterface.sequelize.query(
    `SELECT permission_id FROM permissions
     WHERE resource = :resource AND action = :action LIMIT 1`,
    {
      replacements: { resource: perm.resource, action: perm.action },
      type: QueryTypes.SELECT,
    }
  );

  return row?.permission_id ?? null;
}

async function grantSuperAdmin(queryInterface, permissionId, now) {
  if (!permissionId) return;

  const existing = await queryInterface.sequelize.query(
    `SELECT role_permission_id FROM role_permissions
     WHERE role_id = :roleId AND permission_id = :permId LIMIT 1`,
    {
      replacements: { roleId: SUPER_ADMIN_ROLE_ID, permId: permissionId },
      type: QueryTypes.SELECT,
    }
  );

  if (existing.length > 0) return;

  await queryInterface.bulkInsert("role_permissions", [
    {
      role_permission_id: uuidv4(),
      role_id: SUPER_ADMIN_ROLE_ID,
      permission_id: permissionId,
      is_active: true,
      created_at: now,
      updated_at: now,
    },
  ]);
}

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await addEnumValue(
      queryInterface,
      "enum_plan_amendments_amendment_type",
      "execution_window_reopening"
    );
    await addEnumValue(
      queryInterface,
      "enum_plan_amendment_actions_action_type",
      "execution_window_reopening"
    );

    await queryInterface.createTable("plan_execution_window_overrides", {
      plan_execution_window_override_id: {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
      },
      plan_amendment_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "plan_amendments", key: "plan_amendment_id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      plan_amendment_action_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: "plan_amendment_actions",
          key: "plan_amendment_action_id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      master_plan_version_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "plan_versions", key: "plan_version_id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      live_period_version_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "plan_versions", key: "plan_version_id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      snapshot_period_version_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "plan_versions", key: "plan_version_id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      previous_execution_status: {
        type: Sequelize.STRING(32),
        allowNull: true,
      },
      reopen_start: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      reopen_end: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      status: {
        type: Sequelize.STRING(32),
        allowNull: false,
        defaultValue: "active",
      },
      reason: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      kpi_plan_node_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: "plan_nodes", key: "plan_node_id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      goal_plan_node_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: "plan_nodes", key: "plan_node_id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      government_structure_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: "government_structures", key: "government_structure_id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      created_by: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: "users", key: "user_id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      expired_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      revoked_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });

    await queryInterface.addIndex("plan_execution_window_overrides", {
      fields: ["snapshot_period_version_id", "status"],
      name: "plan_execution_window_overrides_snapshot_status_idx",
    });
    await queryInterface.addIndex("plan_execution_window_overrides", {
      fields: ["reopen_end"],
      name: "plan_execution_window_overrides_reopen_end_idx",
    });
    await queryInterface.addIndex("plan_execution_window_overrides", {
      fields: ["plan_amendment_id"],
      name: "plan_execution_window_overrides_amendment_idx",
    });

    const now = new Date();
    for (const perm of NEW_PERMISSIONS) {
      const permissionId = await ensurePermission(queryInterface, perm, now);
      await grantSuperAdmin(queryInterface, permissionId, now);
    }
  },

  async down(queryInterface) {
    await queryInterface.dropTable("plan_execution_window_overrides");

    const actions = ["request_execution_reopening", "approve_execution_reopening"];
    for (const action of actions) {
      await queryInterface.sequelize.query(
        `DELETE FROM role_permissions
         WHERE permission_id IN (
           SELECT permission_id FROM permissions
           WHERE resource = 'plan' AND action = :action
         )`,
        { replacements: { action } }
      );

      await queryInterface.sequelize.query(
        `DELETE FROM permission_group_permissions
         WHERE permission_id IN (
           SELECT permission_id FROM permissions
           WHERE resource = 'plan' AND action = :action
         )`,
        { replacements: { action } }
      );

      await queryInterface.bulkDelete("permissions", {
        resource: "plan",
        action,
      });
    }
  },
};
