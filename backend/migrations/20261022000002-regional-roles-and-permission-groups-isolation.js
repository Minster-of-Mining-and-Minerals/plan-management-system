"use strict";

const { v4: uuidv4 } = require("uuid");
const { QueryTypes } = require("sequelize");

const SUPER_ADMIN_ROLE_ID = "00000000-0000-4000-8000-000000000002";
const REGIONAL_ADMIN_ROLE_ID = "20000000-0000-4000-8000-000000000001";

const NEW_REGIONAL_PERMISSIONS = [
  { resource: "regional_roles", action: "create" },
  { resource: "regional_roles", action: "read" },
  { resource: "regional_roles", action: "update" },
  { resource: "regional_roles", action: "delete" },
  { resource: "regional_roles", action: "manage" },
  { resource: "regional_permission_groups", action: "create" },
  { resource: "regional_permission_groups", action: "read" },
  { resource: "regional_permission_groups", action: "update" },
  { resource: "regional_permission_groups", action: "delete" },
  { resource: "regional_permission_groups", action: "manage" },
];

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const now = new Date();

    // 1. Add region_id to roles
    await queryInterface.sequelize.query(`
      ALTER TABLE public.roles 
      ADD COLUMN IF NOT EXISTS region_id UUID NULL REFERENCES public.regions(region_id) ON DELETE CASCADE;

      CREATE INDEX IF NOT EXISTS idx_roles_region_id ON public.roles(region_id);
    `);

    // 2. Adjust unique index for regional roles to allow duplicate names across DIFFERENT regions
    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS roles_regional_name_unique;

      CREATE UNIQUE INDEX IF NOT EXISTS roles_regional_system_name_unique
      ON public.roles (LOWER(name))
      WHERE scope = 'regional' AND region_id IS NULL;

      CREATE UNIQUE INDEX IF NOT EXISTS roles_regional_custom_name_unique
      ON public.roles (LOWER(name), region_id)
      WHERE scope = 'regional' AND region_id IS NOT NULL;
    `);

    // 3. Add region_id to permission_groups
    await queryInterface.sequelize.query(`
      ALTER TABLE public.permission_groups 
      ADD COLUMN IF NOT EXISTS region_id UUID NULL REFERENCES public.regions(region_id) ON DELETE CASCADE;

      CREATE INDEX IF NOT EXISTS idx_permission_groups_region_id ON public.permission_groups(region_id);

      CREATE UNIQUE INDEX IF NOT EXISTS permission_groups_regional_name_unique
      ON public.permission_groups (LOWER(name), region_id)
      WHERE region_id IS NOT NULL;
    `);

    // 4. Seed regional_roles and regional_permission_groups permissions
    for (const perm of NEW_REGIONAL_PERMISSIONS) {
      const existing = await queryInterface.sequelize.query(
        `SELECT permission_id FROM permissions WHERE LOWER(resource) = LOWER(:resource) AND LOWER(action) = LOWER(:action) LIMIT 1`,
        {
          replacements: { resource: perm.resource, action: perm.action },
          type: QueryTypes.SELECT,
        }
      );

      let permId;
      if (!existing || existing.length === 0) {
        permId = uuidv4();
        await queryInterface.bulkInsert("permissions", [
          {
            permission_id: permId,
            resource: perm.resource,
            action: perm.action,
            permission_tier: "standard",
            is_active: true,
            created_at: now,
            updated_at: now,
          },
        ]);
      } else {
        permId = existing[0].permission_id;
      }

      // Assign to Super Admin
      const existingSuperAdminAssign = await queryInterface.sequelize.query(
        `SELECT role_permission_id FROM role_permissions WHERE role_id = :roleId AND permission_id = :permId LIMIT 1`,
        {
          replacements: { roleId: SUPER_ADMIN_ROLE_ID, permId },
          type: QueryTypes.SELECT,
        }
      );

      if (!existingSuperAdminAssign || existingSuperAdminAssign.length === 0) {
        await queryInterface.bulkInsert("role_permissions", [
          {
            role_permission_id: uuidv4(),
            role_id: SUPER_ADMIN_ROLE_ID,
            permission_id: permId,
            created_at: now,
            updated_at: now,
          },
        ]);
      }

      // Assign to Regional Admin role
      const existingRegionalAdminAssign = await queryInterface.sequelize.query(
        `SELECT role_permission_id FROM role_permissions WHERE role_id = :roleId AND permission_id = :permId LIMIT 1`,
        {
          replacements: { roleId: REGIONAL_ADMIN_ROLE_ID, permId },
          type: QueryTypes.SELECT,
        }
      );

      if (!existingRegionalAdminAssign || existingRegionalAdminAssign.length === 0) {
        await queryInterface.bulkInsert("role_permissions", [
          {
            role_permission_id: uuidv4(),
            role_id: REGIONAL_ADMIN_ROLE_ID,
            permission_id: permId,
            created_at: now,
            updated_at: now,
          },
        ]);
      }
    }
  },

  async down(queryInterface, Sequelize) {
    // Drop columns and indexes
    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS permission_groups_regional_name_unique;
      DROP INDEX IF EXISTS idx_permission_groups_region_id;
      ALTER TABLE public.permission_groups DROP COLUMN IF EXISTS region_id;

      DROP INDEX IF EXISTS roles_regional_custom_name_unique;
      DROP INDEX IF EXISTS roles_regional_system_name_unique;
      DROP INDEX IF EXISTS idx_roles_region_id;
      ALTER TABLE public.roles DROP COLUMN IF EXISTS region_id;

      CREATE UNIQUE INDEX IF NOT EXISTS roles_regional_name_unique
      ON public.roles (LOWER(name))
      WHERE scope = 'regional';
    `);
  },
};
