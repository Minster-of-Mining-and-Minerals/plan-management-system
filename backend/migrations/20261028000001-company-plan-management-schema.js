"use strict";

const { v4: uuidv4 } = require("uuid");
const { QueryTypes } = require("sequelize");

const SUPER_ADMIN_ROLE_ID = "00000000-0000-4000-8000-000000000002";
const COMPANY_ADMIN_ROLE_ID = "30000000-0000-4000-8000-000000000001";
const COMPANY_OFFICER_ROLE_ID = "30000000-0000-4000-8000-000000000002";
const COMPANY_VIEWER_ROLE_ID = "30000000-0000-4000-8000-000000000003";

const COMPANY_PLAN_PERMISSIONS = [
  // Plan Lifecycle & CRUD
  { resource: "company_plans", action: "create" },
  { resource: "company_plans", action: "read" },
  { resource: "company_plans", action: "update" },
  { resource: "company_plans", action: "delete" },
  { resource: "company_plans", action: "finalize" },
  { resource: "company_plans", action: "reopen" },
  { resource: "company_plans", action: "start_process" },
  { resource: "company_plans", action: "manage" },

  // Execution & Reporting
  { resource: "company_plans", action: "execute_achievement" },
  { resource: "company_plans", action: "approve_achievement" },
  { resource: "company_plans", action: "validate_achievement" },

  // Configuration & Rules
  { resource: "company_plan_rules", action: "read" },
  { resource: "company_plan_rules", action: "create" },
  { resource: "company_plan_rules", action: "update" },
  { resource: "company_plan_rules", action: "delete" },
  { resource: "company_planning_config", action: "read" },
  { resource: "company_planning_config", action: "update" },
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

  // Grant to Company Admin
  const existingCompAdminAssign = await queryInterface.sequelize.query(
    `SELECT role_permission_id FROM role_permissions WHERE role_id = :roleId AND permission_id = :permId LIMIT 1`,
    {
      replacements: { roleId: COMPANY_ADMIN_ROLE_ID, permId },
      type: QueryTypes.SELECT,
    }
  );

  if (!existingCompAdminAssign || existingCompAdminAssign.length === 0) {
    await queryInterface.bulkInsert("role_permissions", [
      {
        role_permission_id: uuidv4(),
        role_id: COMPANY_ADMIN_ROLE_ID,
        permission_id: permId,
        created_at: now,
        updated_at: now,
      },
    ]);
  }

  // Grant appropriate subset to Company Officer
  if (
    perm.action === "read" ||
    perm.action === "execute_achievement" ||
    perm.action === "approve_achievement"
  ) {
    const existingCompOfficerAssign = await queryInterface.sequelize.query(
      `SELECT role_permission_id FROM role_permissions WHERE role_id = :roleId AND permission_id = :permId LIMIT 1`,
      {
        replacements: { roleId: COMPANY_OFFICER_ROLE_ID, permId },
        type: QueryTypes.SELECT,
      }
    );

    if (!existingCompOfficerAssign || existingCompOfficerAssign.length === 0) {
      await queryInterface.bulkInsert("role_permissions", [
        {
          role_permission_id: uuidv4(),
          role_id: COMPANY_OFFICER_ROLE_ID,
          permission_id: permId,
          created_at: now,
          updated_at: now,
        },
      ]);
    }
  }

  // Grant read to Company Viewer
  if (perm.action === "read") {
    const existingCompViewerAssign = await queryInterface.sequelize.query(
      `SELECT role_permission_id FROM role_permissions WHERE role_id = :roleId AND permission_id = :permId LIMIT 1`,
      {
        replacements: { roleId: COMPANY_VIEWER_ROLE_ID, permId },
        type: QueryTypes.SELECT,
      }
    );

    if (!existingCompViewerAssign || existingCompViewerAssign.length === 0) {
      await queryInterface.bulkInsert("role_permissions", [
        {
          role_permission_id: uuidv4(),
          role_id: COMPANY_VIEWER_ROLE_ID,
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

    // 1. Company Planning Configurations
    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS public.company_planning_configurations (
        company_planning_config_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID NOT NULL REFERENCES public.companies(company_id) ON DELETE CASCADE,
        min_duration_years INTEGER NOT NULL DEFAULT 1,
        max_duration_years INTEGER NOT NULL DEFAULT 10,
        draft_entity_label_singular VARCHAR(100) NOT NULL DEFAULT 'Company Strategic Plan Draft',
        draft_entity_label_plural VARCHAR(100) NOT NULL DEFAULT 'Company Strategic Plan Drafts',
        create_action_label VARCHAR(120) NOT NULL DEFAULT 'Create Company Plan',
        planning_period_label VARCHAR(100) NOT NULL DEFAULT 'Company Planning Cycle',
        duration_label VARCHAR(100) NOT NULL DEFAULT 'Cycle Duration',
        start_year_label VARCHAR(100) NOT NULL DEFAULT 'Start Date',
        end_year_label VARCHAR(100) NOT NULL DEFAULT 'End Date',
        target_units JSONB NOT NULL DEFAULT '[]',
        breakdown_mode VARCHAR(50) NOT NULL DEFAULT 'quarterly',
        custom_periods JSONB NOT NULL DEFAULT '[]',
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_company_planning_config_company UNIQUE (company_id)
      );
      CREATE INDEX IF NOT EXISTS idx_comp_plan_config_company ON public.company_planning_configurations(company_id);
    `);

    // 2. Company Plan Rules
    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS public.company_plan_rules (
        company_plan_rule_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID NOT NULL REFERENCES public.companies(company_id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT true,
        performance_scoring_policy VARCHAR(50) NOT NULL DEFAULT 'CAP_100',
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_comp_rules_company ON public.company_plan_rules(company_id, is_active);
    `);

    // 3. Company Plan Rule Steps
    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS public.company_plan_rule_steps (
        company_plan_rule_step_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_plan_rule_id UUID NOT NULL REFERENCES public.company_plan_rules(company_plan_rule_id) ON DELETE CASCADE,
        level INTEGER NOT NULL,
        name VARCHAR(255) NOT NULL,
        requires_weight BOOLEAN NOT NULL DEFAULT false,
        requires_contribution_weight BOOLEAN NOT NULL DEFAULT false,
        allow_kpi BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_comp_rule_steps_level UNIQUE (company_plan_rule_id, level)
      );
      CREATE INDEX IF NOT EXISTS idx_comp_rule_steps_rule ON public.company_plan_rule_steps(company_plan_rule_id, level);
    `);

    // 4. Company Plan Versions
    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS public.company_plan_versions (
        company_plan_version_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID NOT NULL REFERENCES public.companies(company_id) ON DELETE CASCADE,
        parent_plan_version_id UUID REFERENCES public.company_plan_versions(company_plan_version_id) ON DELETE CASCADE,
        based_on_version_id UUID REFERENCES public.company_plan_versions(company_plan_version_id) ON DELETE SET NULL,
        company_plan_rule_id UUID REFERENCES public.company_plan_rules(company_plan_rule_id) ON DELETE SET NULL,
        company_planning_config_id UUID REFERENCES public.company_planning_configurations(company_planning_config_id) ON DELETE SET NULL,
        draft_name VARCHAR(255) NOT NULL,
        version_kind VARCHAR(50) NOT NULL DEFAULT 'master',
        status VARCHAR(50) NOT NULL DEFAULT 'draft',
        version_number INTEGER NOT NULL DEFAULT 1,
        planning_year INTEGER,
        sequence_index INTEGER,
        period_label VARCHAR(50),
        period_subdivision_mode VARCHAR(50),
        start_year INTEGER NOT NULL,
        end_year INTEGER NOT NULL,
        start_month INTEGER NOT NULL DEFAULT 1,
        end_month INTEGER NOT NULL DEFAULT 12,
        planning_duration_years INTEGER NOT NULL DEFAULT 1,
        planning_start_date DATE,
        planning_end_date DATE,
        is_locked BOOLEAN NOT NULL DEFAULT false,
        finalized_at TIMESTAMP WITH TIME ZONE,
        annual_targets_finalized_at TIMESTAMP WITH TIME ZONE,
        period_targets_finalized_at TIMESTAMP WITH TIME ZONE,
        process_started_at TIMESTAMP WITH TIME ZONE,
        execution_status VARCHAR(50) DEFAULT 'open',
        review_status VARCHAR(50) DEFAULT 'draft',
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        deleted_at TIMESTAMP WITH TIME ZONE
      );
      CREATE INDEX IF NOT EXISTS idx_comp_plan_ver_company ON public.company_plan_versions(company_id, version_kind, status);
      CREATE INDEX IF NOT EXISTS idx_comp_plan_ver_parent ON public.company_plan_versions(parent_plan_version_id);
    `);

    // 5. Company Plan Nodes
    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS public.company_plan_nodes (
        company_plan_node_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_plan_version_id UUID NOT NULL REFERENCES public.company_plan_versions(company_plan_version_id) ON DELETE CASCADE,
        parent_id UUID REFERENCES public.company_plan_nodes(company_plan_node_id) ON DELETE CASCADE,
        source_company_plan_node_id UUID REFERENCES public.company_plan_nodes(company_plan_node_id) ON DELETE SET NULL,
        type VARCHAR(100) NOT NULL DEFAULT 'strategic',
        title VARCHAR(500) NOT NULL,
        description TEXT,
        weight NUMERIC(10, 4),
        weight_mode VARCHAR(50) DEFAULT 'percentage',
        contribution_weight NUMERIC(10, 4),
        target_unit VARCHAR(100),
        target_allocation_mode VARCHAR(50) DEFAULT 'divisible',
        achievement_mode VARCHAR(50) DEFAULT 'period',
        level INTEGER NOT NULL DEFAULT 1,
        "order" INTEGER NOT NULL DEFAULT 0,
        is_active BOOLEAN NOT NULL DEFAULT true,
        assignment_sharing_mode VARCHAR(50) DEFAULT 'isolated',
        annual_target NUMERIC(15, 4),
        annual_actual NUMERIC(15, 4),
        annual_actual_status VARCHAR(50) DEFAULT 'empty',
        period_target NUMERIC(15, 4),
        period_actual NUMERIC(15, 4),
        period_actual_status VARCHAR(50) DEFAULT 'empty',
        period_actual_submitted_at TIMESTAMP WITH TIME ZONE,
        period_actual_submitted_by UUID REFERENCES public.users(user_id) ON DELETE SET NULL,
        period_actual_approved_at TIMESTAMP WITH TIME ZONE,
        period_actual_approved_by UUID REFERENCES public.users(user_id) ON DELETE SET NULL,
        period_actual_validated_at TIMESTAMP WITH TIME ZONE,
        period_actual_validated_by UUID REFERENCES public.users(user_id) ON DELETE SET NULL,
        period_actual_rejection_comment TEXT,
        annual_actual_submitted_at TIMESTAMP WITH TIME ZONE,
        annual_actual_submitted_by UUID REFERENCES public.users(user_id) ON DELETE SET NULL,
        annual_actual_approved_at TIMESTAMP WITH TIME ZONE,
        annual_actual_approved_by UUID REFERENCES public.users(user_id) ON DELETE SET NULL,
        annual_actual_validated_at TIMESTAMP WITH TIME ZONE,
        annual_actual_validated_by UUID REFERENCES public.users(user_id) ON DELETE SET NULL,
        annual_actual_rejection_comment TEXT,
        narration TEXT,
        evidence_attachment_ids JSONB DEFAULT '[]',
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        deleted_at TIMESTAMP WITH TIME ZONE
      );
      CREATE INDEX IF NOT EXISTS idx_comp_plan_node_version ON public.company_plan_nodes(company_plan_version_id, is_active, "order");
      CREATE INDEX IF NOT EXISTS idx_comp_plan_node_parent ON public.company_plan_nodes(parent_id);
      CREATE INDEX IF NOT EXISTS idx_comp_plan_node_source ON public.company_plan_nodes(source_company_plan_node_id);
    `);

    // 6. Company Internal Assignments
    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS public.company_internal_assignments (
        company_internal_assignment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_plan_node_id UUID NOT NULL REFERENCES public.company_plan_nodes(company_plan_node_id) ON DELETE CASCADE,
        company_structure_id UUID REFERENCES public.company_structures(company_structure_id) ON DELETE CASCADE,
        assigned_user_id UUID REFERENCES public.users(user_id) ON DELETE SET NULL,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_comp_assign_node ON public.company_internal_assignments(company_plan_node_id, is_active);
      CREATE INDEX IF NOT EXISTS idx_comp_assign_struct ON public.company_internal_assignments(company_structure_id);
    `);

    // 7. Company Plan Node Action Logs
    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS public.company_plan_node_action_logs (
        action_log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_plan_node_id UUID NOT NULL REFERENCES public.company_plan_nodes(company_plan_node_id) ON DELETE CASCADE,
        user_id UUID REFERENCES public.users(user_id) ON DELETE SET NULL,
        action VARCHAR(100) NOT NULL,
        previous_values JSONB,
        new_values JSONB,
        comment TEXT,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_comp_action_log_node ON public.company_plan_node_action_logs(company_plan_node_id, created_at);
    `);

    // 8. Seed permissions
    for (const perm of COMPANY_PLAN_PERMISSIONS) {
      await ensurePermission(queryInterface, perm, now);
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`
      DROP TABLE IF EXISTS public.company_plan_node_action_logs CASCADE;
      DROP TABLE IF EXISTS public.company_internal_assignments CASCADE;
      DROP TABLE IF EXISTS public.company_plan_nodes CASCADE;
      DROP TABLE IF EXISTS public.company_plan_versions CASCADE;
      DROP TABLE IF EXISTS public.company_plan_rule_steps CASCADE;
      DROP TABLE IF EXISTS public.company_plan_rules CASCADE;
      DROP TABLE IF EXISTS public.company_planning_configurations CASCADE;
    `);

    for (const perm of COMPANY_PLAN_PERMISSIONS) {
      await queryInterface.sequelize.query(
        `DELETE FROM role_permissions WHERE permission_id IN (
          SELECT permission_id FROM permissions WHERE LOWER(resource) = LOWER(:resource) AND LOWER(action) = LOWER(:action)
        );
        DELETE FROM permissions WHERE LOWER(resource) = LOWER(:resource) AND LOWER(action) = LOWER(:action);`,
        {
          replacements: { resource: perm.resource, action: perm.action },
        }
      );
    }
  },
};
