"use strict";

const { v4: uuidv4 } = require("uuid");
const { QueryTypes } = require("sequelize");

const SUPER_ADMIN_ROLE_ID = "00000000-0000-4000-8000-000000000002";

const PURCHASING_CENTER_ADMIN_ROLE_ID = "40000000-0000-4000-8000-000000000001";
const PURCHASING_CENTER_OFFICER_ROLE_ID = "40000000-0000-4000-8000-000000000002";
const PURCHASING_CENTER_VIEWER_ROLE_ID = "40000000-0000-4000-8000-000000000003";

const PURCHASING_CENTER_PERMISSIONS = [
  // Federal administration of Purchasing Centers
  { resource: "purchasing_centers", action: "create", permission_tier: "standard" },
  { resource: "purchasing_centers", action: "read", permission_tier: "standard" },
  { resource: "purchasing_centers", action: "update", permission_tier: "standard" },
  { resource: "purchasing_centers", action: "delete", permission_tier: "standard" },
  { resource: "purchasing_centers", action: "manage", permission_tier: "standard" },

  // Purchasing Center Users (No department assignments)
  { resource: "purchasing_center_users", action: "create", permission_tier: "standard" },
  { resource: "purchasing_center_users", action: "read", permission_tier: "standard" },
  { resource: "purchasing_center_users", action: "update", permission_tier: "standard" },
  { resource: "purchasing_center_users", action: "delete", permission_tier: "standard" },
  { resource: "purchasing_center_users", action: "assign_role", permission_tier: "standard" },
  { resource: "purchasing_center_users", action: "manage", permission_tier: "standard" },

  // Purchasing Center Roles
  { resource: "purchasing_center_roles", action: "create", permission_tier: "standard" },
  { resource: "purchasing_center_roles", action: "read", permission_tier: "standard" },
  { resource: "purchasing_center_roles", action: "update", permission_tier: "standard" },
  { resource: "purchasing_center_roles", action: "delete", permission_tier: "standard" },
  { resource: "purchasing_center_roles", action: "manage", permission_tier: "standard" },

  // Purchasing Center Permission Groups
  { resource: "purchasing_center_permission_groups", action: "create", permission_tier: "standard" },
  { resource: "purchasing_center_permission_groups", action: "read", permission_tier: "standard" },
  { resource: "purchasing_center_permission_groups", action: "update", permission_tier: "standard" },
  { resource: "purchasing_center_permission_groups", action: "delete", permission_tier: "standard" },
  { resource: "purchasing_center_permission_groups", action: "manage", permission_tier: "standard" },

  // Purchasing Center Permissions catalog read/manage
  { resource: "purchasing_center_permissions", action: "read", permission_tier: "standard" },
  { resource: "purchasing_center_permissions", action: "update", permission_tier: "standard" },
  { resource: "purchasing_center_permissions", action: "manage", permission_tier: "standard" },

  // Purchasing Center Branding & Settings
  { resource: "purchasing_center_branding", action: "read", permission_tier: "standard" },
  { resource: "purchasing_center_branding", action: "update", permission_tier: "standard" },
  { resource: "purchasing_center_branding", action: "manage", permission_tier: "standard" },

  // Purchasing Center Dashboard
  { resource: "purchasing_center_dashboard", action: "view", permission_tier: "standard" },
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
        is_active: true,
        created_at: now,
        updated_at: now,
      },
    ]);
  }

  return permId;
}

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const now = new Date();

    // 1. Create purchasing_centers table
    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS public.purchasing_centers (
        purchasing_center_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL UNIQUE,
        code VARCHAR(50) NOT NULL UNIQUE,
        description TEXT NULL,
        logo_path VARCHAR(500) NULL,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        deleted_at TIMESTAMPTZ NULL
      );

      CREATE INDEX IF NOT EXISTS idx_purchasing_centers_is_active 
      ON public.purchasing_centers (is_active) WHERE is_active = true;
    `);

    // 2. Create purchasing_center_branding_settings table
    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS public.purchasing_center_branding_settings (
        setting_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        purchasing_center_id UUID NOT NULL REFERENCES public.purchasing_centers(purchasing_center_id) ON DELETE CASCADE,
        system_name_full VARCHAR(255) NULL,
        system_name_short VARCHAR(100) NULL,
        system_tagline VARCHAR(255) NULL,
        logo_primary_path VARCHAR(500) NULL,
        logo_secondary_path VARCHAR(500) NULL,
        logo_dark_path VARCHAR(500) NULL,
        favicon_path VARCHAR(500) NULL,
        primary_color VARCHAR(50) NULL DEFAULT '#1e40af',
        secondary_color VARCHAR(50) NULL DEFAULT '#3b82f6',
        accent_color VARCHAR(50) NULL DEFAULT '#60a5fa',
        success_color VARCHAR(50) NULL DEFAULT '#10b981',
        warning_color VARCHAR(50) NULL DEFAULT '#f59e0b',
        error_color VARCHAR(50) NULL DEFAULT '#ef4444',
        info_color VARCHAR(50) NULL DEFAULT '#3b82f6',
        background_color VARCHAR(50) NULL DEFAULT '#f8fafc',
        surface_color VARCHAR(50) NULL DEFAULT '#ffffff',
        sidebar_color VARCHAR(50) NULL DEFAULT '#0f172a',
        header_color VARCHAR(50) NULL DEFAULT '#ffffff',
        text_primary_color VARCHAR(50) NULL DEFAULT '#0f172a',
        text_secondary_color VARCHAR(50) NULL DEFAULT '#64748b',
        border_color VARCHAR(50) NULL DEFAULT '#e2e8f0',
        sidebar_nav_hover_color VARCHAR(50) NULL,
        sidebar_nav_active_color VARCHAR(50) NULL,
        sidebar_nav_active_text_color VARCHAR(50) NULL,
        sidebar_subnav_active_color VARCHAR(50) NULL,
        sidebar_subnav_active_text_color VARCHAR(50) NULL,
        sidebar_header_text_color VARCHAR(50) NULL,
        toolbar_button_color VARCHAR(50) NULL,
        toolbar_button_hover_color VARCHAR(50) NULL,
        toolbar_button_text_color VARCHAR(50) NULL,
        table_header_color VARCHAR(50) NULL,
        table_header_hover_color VARCHAR(50) NULL,
        table_header_text_color VARCHAR(50) NULL,
        theme_preference VARCHAR(20) NULL DEFAULT 'system',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_purchasing_center_branding_setting UNIQUE (purchasing_center_id)
      );

      CREATE INDEX IF NOT EXISTS idx_pc_branding_center 
      ON public.purchasing_center_branding_settings (purchasing_center_id);
    `);

    // 3. Add purchasing_center_id to users, roles, and permission_groups
    await queryInterface.sequelize.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'purchasing_center_id'
        ) THEN
          ALTER TABLE public.users 
          ADD COLUMN purchasing_center_id UUID NULL REFERENCES public.purchasing_centers(purchasing_center_id) ON DELETE SET NULL;
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_schema = 'public' AND table_name = 'roles' AND column_name = 'purchasing_center_id'
        ) THEN
          ALTER TABLE public.roles 
          ADD COLUMN purchasing_center_id UUID NULL REFERENCES public.purchasing_centers(purchasing_center_id) ON DELETE CASCADE;
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_schema = 'public' AND table_name = 'permission_groups' AND column_name = 'purchasing_center_id'
        ) THEN
          ALTER TABLE public.permission_groups 
          ADD COLUMN purchasing_center_id UUID NULL REFERENCES public.purchasing_centers(purchasing_center_id) ON DELETE CASCADE;
        END IF;

        -- Drop old domain check constraint if exists
        ALTER TABLE public.users DROP CONSTRAINT IF EXISTS chk_user_domain_exclusive;
        ALTER TABLE public.users DROP CONSTRAINT IF EXISTS chk_user_purchasing_center_no_dept;

        -- Add updated 4-way mutual exclusivity constraint across federal, regional, company, and purchasing center
        ALTER TABLE public.users 
        ADD CONSTRAINT chk_user_domain_exclusive 
        CHECK (
          (CASE WHEN government_structure_id IS NOT NULL THEN 1 ELSE 0 END +
           CASE WHEN region_id IS NOT NULL THEN 1 ELSE 0 END +
           CASE WHEN company_id IS NOT NULL THEN 1 ELSE 0 END +
           CASE WHEN purchasing_center_id IS NOT NULL THEN 1 ELSE 0 END) <= 1
        );

        -- Crucial requirement: Purchasing center users must NEVER have department assignments
        ALTER TABLE public.users
        ADD CONSTRAINT chk_user_purchasing_center_no_dept
        CHECK (
          (purchasing_center_id IS NULL) OR (
            government_structure_id IS NULL AND
            internal_structure_id IS NULL AND
            regional_structure_id IS NULL AND
            company_structure_id IS NULL
          )
        );
      END $$;

      CREATE INDEX IF NOT EXISTS idx_users_purchasing_center_active 
      ON public.users (purchasing_center_id, is_active) WHERE is_active = true;
    `);

    // 4. Seed Purchasing Center permissions
    const permMap = new Map();
    for (const perm of PURCHASING_CENTER_PERMISSIONS) {
      const pid = await ensurePermission(queryInterface, perm, now);
      permMap.set(`${perm.resource}:${perm.action}`, pid);
    }

    // 5. Seed default Purchasing Center Roles
    const rolesToCreate = [
      {
        role_id: PURCHASING_CENTER_ADMIN_ROLE_ID,
        name: "Purchasing Center Administrator",
        description: "Full administrative authority within an assigned purchasing center",
        scope: "purchasing_center",
        is_active: true,
        permissions: [
          "purchasing_center_users:create",
          "purchasing_center_users:read",
          "purchasing_center_users:update",
          "purchasing_center_users:delete",
          "purchasing_center_users:assign_role",
          "purchasing_center_users:manage",
          "purchasing_center_roles:create",
          "purchasing_center_roles:read",
          "purchasing_center_roles:update",
          "purchasing_center_roles:delete",
          "purchasing_center_roles:manage",
          "purchasing_center_permission_groups:create",
          "purchasing_center_permission_groups:read",
          "purchasing_center_permission_groups:update",
          "purchasing_center_permission_groups:delete",
          "purchasing_center_permission_groups:manage",
          "purchasing_center_permissions:read",
          "purchasing_center_permissions:update",
          "purchasing_center_permissions:manage",
          "purchasing_center_branding:read",
          "purchasing_center_branding:update",
          "purchasing_center_branding:manage",
          "purchasing_center_dashboard:view",
        ],
      },
      {
        role_id: PURCHASING_CENTER_OFFICER_ROLE_ID,
        name: "Purchasing Center Officer",
        description: "Operational officer for assigned purchasing center resources",
        scope: "purchasing_center",
        is_active: true,
        permissions: [
          "purchasing_center_users:read",
          "purchasing_center_roles:read",
          "purchasing_center_permission_groups:read",
          "purchasing_center_permissions:read",
          "purchasing_center_branding:read",
          "purchasing_center_dashboard:view",
        ],
      },
      {
        role_id: PURCHASING_CENTER_VIEWER_ROLE_ID,
        name: "Purchasing Center Viewer",
        description: "Read-only access to assigned purchasing center dashboard and settings",
        scope: "purchasing_center",
        is_active: true,
        permissions: [
          "purchasing_center_branding:read",
          "purchasing_center_dashboard:view",
        ],
      },
    ];

    for (const r of rolesToCreate) {
      const existing = await queryInterface.sequelize.query(
        `SELECT role_id FROM roles WHERE role_id = :roleId LIMIT 1`,
        { replacements: { roleId: r.role_id }, type: QueryTypes.SELECT }
      );

      if (!existing || existing.length === 0) {
        await queryInterface.bulkInsert("roles", [
          {
            role_id: r.role_id,
            name: r.name,
            description: r.description,
            scope: r.scope,
            is_active: r.is_active,
            created_at: now,
            updated_at: now,
          },
        ]);
      }

      // Assign permissions to role
      for (const permKey of r.permissions) {
        const pid = permMap.get(permKey);
        if (pid) {
          const existingRp = await queryInterface.sequelize.query(
            `SELECT role_permission_id FROM role_permissions WHERE role_id = :roleId AND permission_id = :permId LIMIT 1`,
            { replacements: { roleId: r.role_id, permId: pid }, type: QueryTypes.SELECT }
          );
          if (!existingRp || existingRp.length === 0) {
            await queryInterface.bulkInsert("role_permissions", [
              {
                role_permission_id: uuidv4(),
                role_id: r.role_id,
                permission_id: pid,
                is_active: true,
                created_at: now,
                updated_at: now,
              },
            ]);
          }
        }
      }
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.query(`
      ALTER TABLE public.users DROP CONSTRAINT IF EXISTS chk_user_purchasing_center_no_dept;
      ALTER TABLE public.users DROP CONSTRAINT IF EXISTS chk_user_domain_exclusive;
      
      ALTER TABLE public.users 
      ADD CONSTRAINT chk_user_domain_exclusive 
      CHECK (
        (CASE WHEN government_structure_id IS NOT NULL THEN 1 ELSE 0 END +
         CASE WHEN region_id IS NOT NULL THEN 1 ELSE 0 END +
         CASE WHEN company_id IS NOT NULL THEN 1 ELSE 0 END) <= 1
      );

      DROP TABLE IF EXISTS public.purchasing_center_branding_settings CASCADE;
      DROP TABLE IF EXISTS public.purchasing_centers CASCADE;
    `);
  },
};
