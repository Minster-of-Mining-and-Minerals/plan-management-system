"use strict";

const { v4: uuidv4 } = require("uuid");
const { QueryTypes } = require("sequelize");
const {
  addColumnIfNotExists,
  removeColumnIfExists,
  createTableIfNotExists,
  dropTableIfExists,
  createIndexIfNotExists,
  dropIndexIfExists,
} = require("./helpers/schemaHelpers");

const SUPER_ADMIN_ROLE_ID = "00000000-0000-4000-8000-000000000002";

const SPECIAL_PERMISSION_SPECS = [
  { resource: "plans", action: "edit_finalized" },
  { resource: "plan", action: "override_parent_achievement" },
  { resource: "plan", action: "view_sector_plan_hierarchy" },
];

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await addColumnIfNotExists(queryInterface, "permission_groups", "group_kind", {
      type: Sequelize.STRING(20),
      allowNull: false,
      defaultValue: "standard",
    });

    await addColumnIfNotExists(queryInterface, "permissions", "permission_tier", {
      type: Sequelize.STRING(20),
      allowNull: false,
      defaultValue: "standard",
    });

    await createTableIfNotExists(
      queryInterface,
      "internal_structure_permission_groups",
      {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        internal_structure_id: {
          type: Sequelize.UUID,
          allowNull: false,
          references: { model: "internal_structures", key: "internal_structure_id" },
          onUpdate: "CASCADE",
          onDelete: "CASCADE",
        },
        permission_group_id: {
          type: Sequelize.UUID,
          allowNull: false,
          references: { model: "permission_groups", key: "permission_group_id" },
          onUpdate: "CASCADE",
          onDelete: "CASCADE",
        },
      }
    );

    await createIndexIfNotExists(
      queryInterface,
      "idx_internal_structure_permission_groups_internal_structure_id",
      `CREATE INDEX IF NOT EXISTS idx_internal_structure_permission_groups_internal_structure_id
       ON internal_structure_permission_groups (internal_structure_id)`
    );

    await createIndexIfNotExists(
      queryInterface,
      "idx_internal_structure_permission_groups_permission_group_id",
      `CREATE INDEX IF NOT EXISTS idx_internal_structure_permission_groups_permission_group_id
       ON internal_structure_permission_groups (permission_group_id)`
    );

    await createIndexIfNotExists(
      queryInterface,
      "uq_internal_structure_permission_groups_pair",
      `CREATE UNIQUE INDEX IF NOT EXISTS uq_internal_structure_permission_groups_pair
       ON internal_structure_permission_groups (internal_structure_id, permission_group_id)`
    );

    const now = new Date();

    for (const perm of SPECIAL_PERMISSION_SPECS) {
      if (perm.action === "view_sector_plan_hierarchy") {
        try {
          await queryInterface.bulkInsert(
            "permissions",
            [
              {
                permission_id: uuidv4(),
                resource: perm.resource,
                action: perm.action,
                permission_tier: "special",
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
      }

      await queryInterface.sequelize.query(
        `UPDATE permissions
         SET permission_tier = 'special', updated_at = :now
         WHERE resource = :resource AND action = :action`,
        {
          replacements: {
            resource: perm.resource,
            action: perm.action,
            now,
          },
        }
      );
    }

    const seeded = await queryInterface.sequelize.query(
      `SELECT permission_id FROM permissions
       WHERE resource = 'plan' AND action = 'view_sector_plan_hierarchy'`,
      { type: QueryTypes.SELECT }
    );

    for (const perm of seeded) {
      const existing = await queryInterface.sequelize.query(
        `SELECT role_permission_id FROM role_permissions
         WHERE role_id = :roleId AND permission_id = :permId LIMIT 1`,
        {
          replacements: { roleId: SUPER_ADMIN_ROLE_ID, permId: perm.permission_id },
          type: QueryTypes.SELECT,
        }
      );

      if (existing.length > 0) continue;

      await queryInterface.bulkInsert("role_permissions", [
        {
          role_permission_id: uuidv4(),
          role_id: SUPER_ADMIN_ROLE_ID,
          permission_id: perm.permission_id,
          is_active: true,
          created_at: now,
          updated_at: now,
        },
      ]);
    }
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(
      `DELETE FROM role_permissions
       WHERE permission_id IN (
         SELECT permission_id FROM permissions
         WHERE resource = 'plan' AND action = 'view_sector_plan_hierarchy'
       )`
    );

    await queryInterface.bulkDelete("permissions", {
      resource: "plan",
      action: "view_sector_plan_hierarchy",
    });

    await queryInterface.sequelize.query(
      `UPDATE permissions SET permission_tier = 'standard'
       WHERE (resource = 'plans' AND action = 'edit_finalized')
          OR (resource = 'plan' AND action = 'override_parent_achievement')`
    );

    await dropIndexIfExists(
      queryInterface,
      null,
      "uq_internal_structure_permission_groups_pair"
    );
    await dropIndexIfExists(
      queryInterface,
      null,
      "idx_internal_structure_permission_groups_permission_group_id"
    );
    await dropIndexIfExists(
      queryInterface,
      null,
      "idx_internal_structure_permission_groups_internal_structure_id"
    );
    await dropTableIfExists(queryInterface, "internal_structure_permission_groups");
    await removeColumnIfExists(queryInterface, "permissions", "permission_tier");
    await removeColumnIfExists(queryInterface, "permission_groups", "group_kind");
  },
};
