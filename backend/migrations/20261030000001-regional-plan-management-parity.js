"use strict";

const { v4: uuidv4 } = require("uuid");
const { QueryTypes } = require("sequelize");

const SUPER_ADMIN_ROLE_ID = "00000000-0000-4000-8000-000000000002";
const REGIONAL_ADMIN_ROLE_ID = "20000000-0000-4000-8000-000000000001";
const REGIONAL_OFFICER_ROLE_ID = "20000000-0000-4000-8000-000000000002";
const REGIONAL_VIEWER_ROLE_ID = "20000000-0000-4000-8000-000000000003";

const NEW_REGIONAL_PERMISSIONS = [
  { resource: "regional_performance_colors", action: "read" },
  { resource: "regional_performance_colors", action: "create" },
  { resource: "regional_performance_colors", action: "update" },
  { resource: "regional_performance_colors", action: "delete" },
  { resource: "regional_plans", action: "publish_review" },
  { resource: "regional_plans", action: "review" },
  { resource: "regional_plans", action: "complete_review" },
];

async function ensurePermission(queryInterface, perm, now) {
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

  // Grant to Super Admin
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

  // Grant to Regional Admin
  const existingRegAdminAssign = await queryInterface.sequelize.query(
    `SELECT role_permission_id FROM role_permissions WHERE role_id = :roleId AND permission_id = :permId LIMIT 1`,
    {
      replacements: { roleId: REGIONAL_ADMIN_ROLE_ID, permId },
      type: QueryTypes.SELECT,
    }
  );

  if (!existingRegAdminAssign || existingRegAdminAssign.length === 0) {
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

  // Grant to Regional Officer if read or review
  if (perm.action === "read" || perm.action === "review") {
    const existingRegOfficerAssign = await queryInterface.sequelize.query(
      `SELECT role_permission_id FROM role_permissions WHERE role_id = :roleId AND permission_id = :permId LIMIT 1`,
      {
        replacements: { roleId: REGIONAL_OFFICER_ROLE_ID, permId },
        type: QueryTypes.SELECT,
      }
    );

    if (!existingRegOfficerAssign || existingRegOfficerAssign.length === 0) {
      await queryInterface.bulkInsert("role_permissions", [
        {
          role_permission_id: uuidv4(),
          role_id: REGIONAL_OFFICER_ROLE_ID,
          permission_id: permId,
          created_at: now,
          updated_at: now,
        },
      ]);
    }
  }

  // Grant to Regional Viewer if read
  if (perm.action === "read") {
    const existingRegViewerAssign = await queryInterface.sequelize.query(
      `SELECT role_permission_id FROM role_permissions WHERE role_id = :roleId AND permission_id = :permId LIMIT 1`,
      {
        replacements: { roleId: REGIONAL_VIEWER_ROLE_ID, permId },
        type: QueryTypes.SELECT,
      }
    );

    if (!existingRegViewerAssign || existingRegViewerAssign.length === 0) {
      await queryInterface.bulkInsert("role_permissions", [
        {
          role_permission_id: uuidv4(),
          role_id: REGIONAL_VIEWER_ROLE_ID,
          permission_id: permId,
          created_at: now,
          updated_at: now,
        },
      ]);
    }
  }

  return permId;
}

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const now = new Date();

    // 1. Regional Performance Color Thresholds Table
    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS public.regional_performance_color_thresholds (
        regional_performance_color_threshold_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        region_id UUID NOT NULL REFERENCES public.regions(region_id) ON DELETE CASCADE,
        label VARCHAR(100) NOT NULL,
        min_percentage INTEGER NOT NULL,
        max_percentage INTEGER NOT NULL,
        color_hex VARCHAR(7) NOT NULL,
        sort_order INTEGER NOT NULL DEFAULT 0,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_reg_perf_colors_region ON public.regional_performance_color_thresholds(region_id, sort_order);
    `);

    // 2. Add color_hex to regional_plan_rule_steps if not present
    await queryInterface.sequelize.query(`
      ALTER TABLE public.regional_plan_rule_steps
      ADD COLUMN IF NOT EXISTS color_hex VARCHAR(7) DEFAULT '#6B7280';
    `);

    // 3. Remove redundant regional prefixes from planning configuration defaults
    await queryInterface.sequelize.query(`
      UPDATE public.regional_planning_configurations
      SET draft_entity_label_singular = 'Plan Draft'
      WHERE draft_entity_label_singular IN ('Regional Plan Draft', 'Regional Strategic Plan Draft');

      UPDATE public.regional_planning_configurations
      SET draft_entity_label_plural = 'Plan Drafts'
      WHERE draft_entity_label_plural IN ('Regional Plan Drafts', 'Regional Strategic Plan Drafts');

      UPDATE public.regional_planning_configurations
      SET create_action_label = 'Create Plan Draft'
      WHERE create_action_label IN ('Create Regional Plan', 'Create Plan');

      UPDATE public.regional_planning_configurations
      SET planning_period_label = 'Planning Period'
      WHERE planning_period_label IN ('Regional Planning Period', 'Regional Planning Cycle');
    `);

    // 4. Register new regional permissions and assign to roles
    for (const perm of NEW_REGIONAL_PERMISSIONS) {
      await ensurePermission(queryInterface, perm, now);
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`
      DROP TABLE IF EXISTS public.regional_performance_color_thresholds CASCADE;
    `);
  },
};
