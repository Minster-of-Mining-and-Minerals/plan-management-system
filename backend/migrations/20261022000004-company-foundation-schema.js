"use strict";

const { v4: uuidv4 } = require("uuid");
const { QueryTypes } = require("sequelize");

const SUPER_ADMIN_ROLE_ID = "00000000-0000-4000-8000-000000000002";

const COMPANY_ADMIN_ROLE_ID = "30000000-0000-4000-8000-000000000001";
const COMPANY_OFFICER_ROLE_ID = "30000000-0000-4000-8000-000000000002";
const COMPANY_VIEWER_ROLE_ID = "30000000-0000-4000-8000-000000000003";

const NEW_COMPANY_PERMISSIONS = [
  // Federal administration of Companies
  { resource: "companies", action: "create", permission_tier: "standard" },
  { resource: "companies", action: "read", permission_tier: "standard" },
  { resource: "companies", action: "update", permission_tier: "standard" },
  { resource: "companies", action: "delete", permission_tier: "standard" },
  { resource: "companies", action: "manage", permission_tier: "standard" },

  // Company Organizational Structures / Departments
  { resource: "company_structures", action: "create", permission_tier: "standard" },
  { resource: "company_structures", action: "read", permission_tier: "standard" },
  { resource: "company_structures", action: "update", permission_tier: "standard" },
  { resource: "company_structures", action: "delete", permission_tier: "standard" },
  { resource: "company_structures", action: "manage", permission_tier: "standard" },

  // Company Users
  { resource: "company_users", action: "create", permission_tier: "standard" },
  { resource: "company_users", action: "read", permission_tier: "standard" },
  { resource: "company_users", action: "update", permission_tier: "standard" },
  { resource: "company_users", action: "delete", permission_tier: "standard" },
  { resource: "company_users", action: "assign_role", permission_tier: "standard" },
  { resource: "company_users", action: "manage", permission_tier: "standard" },

  // Company Roles
  { resource: "company_roles", action: "create", permission_tier: "standard" },
  { resource: "company_roles", action: "read", permission_tier: "standard" },
  { resource: "company_roles", action: "update", permission_tier: "standard" },
  { resource: "company_roles", action: "delete", permission_tier: "standard" },
  { resource: "company_roles", action: "manage", permission_tier: "standard" },

  // Company Permission Groups
  { resource: "company_permission_groups", action: "create", permission_tier: "standard" },
  { resource: "company_permission_groups", action: "read", permission_tier: "standard" },
  { resource: "company_permission_groups", action: "update", permission_tier: "standard" },
  { resource: "company_permission_groups", action: "delete", permission_tier: "standard" },
  { resource: "company_permission_groups", action: "manage", permission_tier: "standard" },

  // Company Permissions catalog read/manage
  { resource: "company_permissions", action: "read", permission_tier: "standard" },
  { resource: "company_permissions", action: "update", permission_tier: "standard" },
  { resource: "company_permissions", action: "manage", permission_tier: "standard" },

  // Company Branding & Settings
  { resource: "company_branding", action: "read", permission_tier: "standard" },
  { resource: "company_branding", action: "update", permission_tier: "standard" },
  { resource: "company_branding", action: "manage", permission_tier: "standard" },

  // Company Dashboard
  { resource: "company_dashboard", action: "view", permission_tier: "standard" },
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
        permission_tier: perm.permission_tier,
        is_active: true,
        created_at: now,
        updated_at: now,
      },
    ]);
  } else {
    permId = existing[0].permission_id;
  }

  // Ensure granted to Super Admin
  const existingRolePerm = await queryInterface.sequelize.query(
    `SELECT role_permission_id FROM role_permissions WHERE role_id = :roleId AND permission_id = :permId LIMIT 1`,
    {
      replacements: { roleId: SUPER_ADMIN_ROLE_ID, permId },
      type: QueryTypes.SELECT,
    }
  );

  if (!existingRolePerm || existingRolePerm.length === 0) {
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

  return permId;
}

async function ensureRoleWithPermissions(queryInterface, roleId, roleName, description, scope, permissionKeys, now) {
  const existingRole = await queryInterface.sequelize.query(
    `SELECT role_id FROM roles WHERE role_id = :roleId OR (LOWER(name) = LOWER(:name) AND scope = :scope) LIMIT 1`,
    {
      replacements: { roleId, name: roleName, scope },
      type: QueryTypes.SELECT,
    }
  );

  let actualRoleId = roleId;
  if (!existingRole || existingRole.length === 0) {
    await queryInterface.bulkInsert("roles", [
      {
        role_id: roleId,
        name: roleName,
        description,
        scope,
        is_active: true,
        created_at: now,
        updated_at: now,
      },
    ]);
  } else {
    actualRoleId = existingRole[0].role_id;
  }

  for (const [resource, action] of permissionKeys) {
    const permRow = await queryInterface.sequelize.query(
      `SELECT permission_id FROM permissions WHERE LOWER(resource) = LOWER(:resource) AND LOWER(action) = LOWER(:action) LIMIT 1`,
      {
        replacements: { resource, action },
        type: QueryTypes.SELECT,
      }
    );

    if (permRow && permRow.length > 0) {
      const permId = permRow[0].permission_id;
      const existingAssign = await queryInterface.sequelize.query(
        `SELECT role_permission_id FROM role_permissions WHERE role_id = :roleId AND permission_id = :permId LIMIT 1`,
        {
          replacements: { roleId: actualRoleId, permId },
          type: QueryTypes.SELECT,
        }
      );

      if (!existingAssign || existingAssign.length === 0) {
        await queryInterface.bulkInsert("role_permissions", [
          {
            role_permission_id: uuidv4(),
            role_id: actualRoleId,
            permission_id: permId,
            created_at: now,
            updated_at: now,
          },
        ]);
      }
    }
  }
}

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const now = new Date();

    // 1. Create table companies
    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS public.companies (
        company_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        code VARCHAR(50) NOT NULL,
        description TEXT,
        logo_path VARCHAR(500),
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        deleted_at TIMESTAMP WITH TIME ZONE,
        CONSTRAINT uq_companies_name UNIQUE (name),
        CONSTRAINT uq_companies_code UNIQUE (code)
      );
      CREATE INDEX IF NOT EXISTS idx_companies_is_active ON public.companies (is_active);
      CREATE INDEX IF NOT EXISTS idx_companies_code ON public.companies (code);
    `);

    // 2. Create table company_structures
    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS public.company_structures (
        company_structure_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID NOT NULL REFERENCES public.companies(company_id) ON DELETE CASCADE,
        parent_id UUID REFERENCES public.company_structures(company_structure_id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        level INTEGER NOT NULL DEFAULT 1,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        deleted_at TIMESTAMP WITH TIME ZONE
      );
      CREATE INDEX IF NOT EXISTS idx_company_structures_company_active ON public.company_structures (company_id, is_active);
      CREATE INDEX IF NOT EXISTS idx_company_structures_parent ON public.company_structures (parent_id);
    `);

    // 3. Create table company_branding_settings
    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS public.company_branding_settings (
        company_branding_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID NOT NULL REFERENCES public.companies(company_id) ON DELETE CASCADE,
        system_name_full VARCHAR(255) NOT NULL,
        system_name_short VARCHAR(50) NOT NULL,
        system_tagline VARCHAR(255),
        logo_primary_path VARCHAR(500),
        logo_secondary_path VARCHAR(500),
        favicon_path VARCHAR(500),
        primary_color VARCHAR(7) NOT NULL DEFAULT '#0F766E',
        secondary_color VARCHAR(7) NOT NULL DEFAULT '#64748B',
        accent_color VARCHAR(7) NOT NULL DEFAULT '#D97706',
        success_color VARCHAR(7) NOT NULL DEFAULT '#16A34A',
        warning_color VARCHAR(7) NOT NULL DEFAULT '#D97706',
        error_color VARCHAR(7) NOT NULL DEFAULT '#DC2626',
        info_color VARCHAR(7) NOT NULL DEFAULT '#0284C7',
        background_color VARCHAR(7) NOT NULL DEFAULT '#FFFFFF',
        surface_color VARCHAR(7) NOT NULL DEFAULT '#FFFFFF',
        sidebar_color VARCHAR(7) NOT NULL DEFAULT '#FFFFFF',
        header_color VARCHAR(7) NOT NULL DEFAULT '#FFFFFF',
        text_primary_color VARCHAR(7) NOT NULL DEFAULT '#0F172A',
        text_secondary_color VARCHAR(7) NOT NULL DEFAULT '#64748B',
        border_color VARCHAR(7) NOT NULL DEFAULT '#E2E8F0',
        sidebar_nav_hover_color VARCHAR(7) NOT NULL DEFAULT '#CCFBF1',
        sidebar_nav_active_color VARCHAR(7) NOT NULL DEFAULT '#0F766E',
        sidebar_nav_active_text_color VARCHAR(7) NOT NULL DEFAULT '#FFFFFF',
        sidebar_subnav_active_color VARCHAR(7) NOT NULL DEFAULT '#CCFBF1',
        sidebar_subnav_active_text_color VARCHAR(7) NOT NULL DEFAULT '#0F766E',
        sidebar_header_text_color VARCHAR(7) NOT NULL DEFAULT '#0F766E',
        toolbar_button_color VARCHAR(7) NOT NULL DEFAULT '#0F766E',
        toolbar_button_hover_color VARCHAR(7) NOT NULL DEFAULT '#115E59',
        toolbar_button_text_color VARCHAR(7) NOT NULL DEFAULT '#FFFFFF',
        table_header_color VARCHAR(7) NOT NULL DEFAULT '#0F766E',
        table_header_hover_color VARCHAR(7) NOT NULL DEFAULT '#115E59',
        table_header_text_color VARCHAR(7) NOT NULL DEFAULT '#FFFFFF',
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_company_branding_company UNIQUE (company_id)
      );
    `);

    // 4. Alter users table: add company_id, company_structure_id, and 3-way domain exclusivity check constraint
    await queryInterface.sequelize.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'company_id'
        ) THEN
          ALTER TABLE public.users 
          ADD COLUMN company_id UUID NULL REFERENCES public.companies(company_id) ON DELETE RESTRICT;
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'company_structure_id'
        ) THEN
          ALTER TABLE public.users 
          ADD COLUMN company_structure_id UUID NULL REFERENCES public.company_structures(company_structure_id) ON DELETE SET NULL;
        END IF;

        -- Drop old constraint if exists
        ALTER TABLE public.users DROP CONSTRAINT IF EXISTS chk_user_domain_exclusive;
        ALTER TABLE public.users DROP CONSTRAINT IF EXISTS chk_user_company_structure;

        -- Add updated 3-way mutual exclusivity constraint
        ALTER TABLE public.users 
        ADD CONSTRAINT chk_user_domain_exclusive 
        CHECK (
          (CASE WHEN government_structure_id IS NOT NULL THEN 1 ELSE 0 END +
           CASE WHEN region_id IS NOT NULL THEN 1 ELSE 0 END +
           CASE WHEN company_id IS NOT NULL THEN 1 ELSE 0 END) <= 1
        );

        -- Add company structure check
        ALTER TABLE public.users
        ADD CONSTRAINT chk_user_company_structure
        CHECK (
          (company_structure_id IS NULL) OR (company_id IS NOT NULL)
        );
      END $$;

      CREATE INDEX IF NOT EXISTS idx_users_company_active 
      ON public.users (company_id, is_active) WHERE is_active = true;

      CREATE INDEX IF NOT EXISTS idx_users_company_struct_active 
      ON public.users (company_structure_id, is_active) WHERE is_active = true;
    `);

    // 5. Alter roles table: add company_id and company scoped unique indexes
    await queryInterface.sequelize.query(`
      ALTER TABLE public.roles 
      ADD COLUMN IF NOT EXISTS company_id UUID NULL REFERENCES public.companies(company_id) ON DELETE CASCADE;

      CREATE INDEX IF NOT EXISTS idx_roles_company_id ON public.roles(company_id);

      CREATE UNIQUE INDEX IF NOT EXISTS roles_company_system_name_unique
      ON public.roles (LOWER(name))
      WHERE scope = 'company' AND company_id IS NULL;

      CREATE UNIQUE INDEX IF NOT EXISTS roles_company_custom_name_unique
      ON public.roles (LOWER(name), company_id)
      WHERE scope = 'company' AND company_id IS NOT NULL;
    `);

    // 6. Alter permission_groups table: add company_id and company scoped unique index
    await queryInterface.sequelize.query(`
      ALTER TABLE public.permission_groups 
      ADD COLUMN IF NOT EXISTS company_id UUID NULL REFERENCES public.companies(company_id) ON DELETE CASCADE;

      CREATE INDEX IF NOT EXISTS idx_permission_groups_company_id ON public.permission_groups(company_id);

      CREATE UNIQUE INDEX IF NOT EXISTS permission_groups_company_name_unique
      ON public.permission_groups (LOWER(name), company_id)
      WHERE company_id IS NOT NULL;
    `);

    // 7. Seed company catalog permissions and grant to Super Admin
    for (const perm of NEW_COMPANY_PERMISSIONS) {
      await ensurePermission(queryInterface, perm, now);
    }

    // 8. Seed default Company Roles:
    // Company Administrator
    await ensureRoleWithPermissions(
      queryInterface,
      COMPANY_ADMIN_ROLE_ID,
      "Company Administrator",
      "Full administrative authority within the assigned company operational workspace.",
      "company",
      [
        ["company_dashboard", "view"],
        ["company_structures", "read"],
        ["company_structures", "create"],
        ["company_structures", "update"],
        ["company_structures", "delete"],
        ["company_structures", "manage"],
        ["company_users", "read"],
        ["company_users", "create"],
        ["company_users", "update"],
        ["company_users", "delete"],
        ["company_users", "manage"],
        ["company_users", "assign_role"],
        ["company_roles", "read"],
        ["company_roles", "create"],
        ["company_roles", "update"],
        ["company_roles", "delete"],
        ["company_roles", "manage"],
        ["company_permission_groups", "read"],
        ["company_permission_groups", "create"],
        ["company_permission_groups", "update"],
        ["company_permission_groups", "delete"],
        ["company_permission_groups", "manage"],
        ["company_permissions", "read"],
        ["company_branding", "read"],
        ["company_branding", "update"],
        ["company_branding", "manage"],
      ],
      now
    );

    // Company Officer
    await ensureRoleWithPermissions(
      queryInterface,
      COMPANY_OFFICER_ROLE_ID,
      "Company Officer",
      "Operational access to company departments, users, and dashboard.",
      "company",
      [
        ["company_dashboard", "view"],
        ["company_structures", "read"],
        ["company_users", "read"],
        ["company_roles", "read"],
        ["company_permission_groups", "read"],
        ["company_permissions", "read"],
        ["company_branding", "read"],
      ],
      now
    );

    // Company Viewer
    await ensureRoleWithPermissions(
      queryInterface,
      COMPANY_VIEWER_ROLE_ID,
      "Company Viewer",
      "Read-only access to company workspace and dashboard metrics.",
      "company",
      [
        ["company_dashboard", "view"],
        ["company_structures", "read"],
        ["company_users", "read"],
        ["company_branding", "read"],
      ],
      now
    );
  },

  async down(queryInterface) {
    // 1. Drop role permissions and roles
    await queryInterface.sequelize.query(`
      DELETE FROM role_permissions WHERE role_id IN ('${COMPANY_ADMIN_ROLE_ID}', '${COMPANY_OFFICER_ROLE_ID}', '${COMPANY_VIEWER_ROLE_ID}');
      DELETE FROM roles WHERE role_id IN ('${COMPANY_ADMIN_ROLE_ID}', '${COMPANY_OFFICER_ROLE_ID}', '${COMPANY_VIEWER_ROLE_ID}');
    `);

    // 2. Drop company permissions
    for (const perm of NEW_COMPANY_PERMISSIONS) {
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

    // 3. Drop columns and constraints from permission_groups and roles
    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS permission_groups_company_name_unique;
      DROP INDEX IF EXISTS idx_permission_groups_company_id;
      ALTER TABLE public.permission_groups DROP COLUMN IF EXISTS company_id;

      DROP INDEX IF EXISTS roles_company_custom_name_unique;
      DROP INDEX IF EXISTS roles_company_system_name_unique;
      DROP INDEX IF EXISTS idx_roles_company_id;
      ALTER TABLE public.roles DROP COLUMN IF EXISTS company_id;
    `);

    // 4. Drop users columns and rollback exclusivity constraint
    await queryInterface.sequelize.query(`
      ALTER TABLE public.users DROP CONSTRAINT IF EXISTS chk_user_company_structure;
      ALTER TABLE public.users DROP CONSTRAINT IF EXISTS chk_user_domain_exclusive;
      DROP INDEX IF EXISTS idx_users_company_struct_active;
      DROP INDEX IF EXISTS idx_users_company_active;
      ALTER TABLE public.users DROP COLUMN IF EXISTS company_structure_id;
      ALTER TABLE public.users DROP COLUMN IF EXISTS company_id;

      ALTER TABLE public.users 
      ADD CONSTRAINT chk_user_domain_exclusive 
      CHECK ((government_structure_id IS NULL) OR (region_id IS NULL));
    `);

    // 5. Drop company tables
    await queryInterface.sequelize.query(`
      DROP TABLE IF EXISTS public.company_branding_settings CASCADE;
      DROP TABLE IF EXISTS public.company_structures CASCADE;
      DROP TABLE IF EXISTS public.companies CASCADE;
    `);
  },
};
