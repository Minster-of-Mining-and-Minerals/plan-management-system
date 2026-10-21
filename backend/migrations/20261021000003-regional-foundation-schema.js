"use strict";

const { v4: uuidv4 } = require("uuid");
const { QueryTypes } = require("sequelize");

const SUPER_ADMIN_ROLE_ID = "00000000-0000-4000-8000-000000000002";

const NEW_PERMISSIONS = [
  { resource: "regions", action: "create", permission_tier: "standard" },
  { resource: "regions", action: "read", permission_tier: "standard" },
  { resource: "regions", action: "update", permission_tier: "standard" },
  { resource: "regions", action: "delete", permission_tier: "standard" },
  { resource: "regions", action: "manage", permission_tier: "standard" },
  { resource: "regional_structures", action: "create", permission_tier: "standard" },
  { resource: "regional_structures", action: "read", permission_tier: "standard" },
  { resource: "regional_structures", action: "update", permission_tier: "standard" },
  { resource: "regional_structures", action: "delete", permission_tier: "standard" },
  { resource: "regional_branding", action: "read", permission_tier: "standard" },
  { resource: "regional_branding", action: "update", permission_tier: "standard" },
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
}

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const now = new Date();

    // 1. Create table regions
    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS public.regions (
        region_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        code VARCHAR(50) NOT NULL,
        description TEXT,
        logo_path VARCHAR(500),
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        deleted_at TIMESTAMP WITH TIME ZONE,
        CONSTRAINT uq_regions_name UNIQUE (name),
        CONSTRAINT uq_regions_code UNIQUE (code)
      );
      CREATE INDEX IF NOT EXISTS idx_regions_is_active ON public.regions (is_active);
      CREATE INDEX IF NOT EXISTS idx_regions_code ON public.regions (code);
    `);

    // 2. Create table regional_structures
    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS public.regional_structures (
        regional_structure_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        region_id UUID NOT NULL REFERENCES public.regions(region_id) ON DELETE CASCADE,
        parent_id UUID REFERENCES public.regional_structures(regional_structure_id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        level INTEGER NOT NULL DEFAULT 1,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        deleted_at TIMESTAMP WITH TIME ZONE
      );
      CREATE INDEX IF NOT EXISTS idx_regional_structures_region_active ON public.regional_structures (region_id, is_active);
      CREATE INDEX IF NOT EXISTS idx_regional_structures_parent ON public.regional_structures (parent_id);
    `);

    // 3. Create table regional_branding_settings
    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS public.regional_branding_settings (
        regional_branding_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        region_id UUID NOT NULL REFERENCES public.regions(region_id) ON DELETE CASCADE,
        system_name_full VARCHAR(255) NOT NULL,
        system_name_short VARCHAR(50) NOT NULL,
        system_tagline VARCHAR(255),
        logo_primary_path VARCHAR(500),
        logo_secondary_path VARCHAR(500),
        favicon_path VARCHAR(500),
        primary_color VARCHAR(7) NOT NULL DEFAULT '#0C4A6E',
        secondary_color VARCHAR(7) NOT NULL DEFAULT '#64748B',
        accent_color VARCHAR(7) NOT NULL DEFAULT '#CA8A04',
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
        sidebar_nav_hover_color VARCHAR(7) NOT NULL DEFAULT '#F5E6C8',
        sidebar_nav_active_color VARCHAR(7) NOT NULL DEFAULT '#CA8A04',
        sidebar_nav_active_text_color VARCHAR(7) NOT NULL DEFAULT '#FFFFFF',
        sidebar_subnav_active_color VARCHAR(7) NOT NULL DEFAULT '#F5E6C8',
        sidebar_subnav_active_text_color VARCHAR(7) NOT NULL DEFAULT '#0C4A6E',
        sidebar_header_text_color VARCHAR(7) NOT NULL DEFAULT '#CA8A04',
        toolbar_button_color VARCHAR(7) NOT NULL DEFAULT '#CA8A04',
        toolbar_button_hover_color VARCHAR(7) NOT NULL DEFAULT '#A16207',
        toolbar_button_text_color VARCHAR(7) NOT NULL DEFAULT '#FFFFFF',
        table_header_color VARCHAR(7) NOT NULL DEFAULT '#CA8A04',
        table_header_hover_color VARCHAR(7) NOT NULL DEFAULT '#A16207',
        table_header_text_color VARCHAR(7) NOT NULL DEFAULT '#FFFFFF',
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_regional_branding_region UNIQUE (region_id)
      );
    `);

    // 4. Alter users table: add region_id, regional_structure_id, and domain exclusivity check constraint
    await queryInterface.sequelize.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'region_id'
        ) THEN
          ALTER TABLE public.users 
          ADD COLUMN region_id UUID NULL REFERENCES public.regions(region_id) ON DELETE RESTRICT;
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'regional_structure_id'
        ) THEN
          ALTER TABLE public.users 
          ADD COLUMN regional_structure_id UUID NULL REFERENCES public.regional_structures(regional_structure_id) ON DELETE SET NULL;
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'chk_user_domain_exclusive'
        ) THEN
          ALTER TABLE public.users 
          ADD CONSTRAINT chk_user_domain_exclusive 
          CHECK ((government_structure_id IS NULL) OR (region_id IS NULL));
        END IF;
      END $$;

      CREATE INDEX IF NOT EXISTS idx_users_region_active 
      ON public.users (region_id, is_active) WHERE is_active = true;

      CREATE INDEX IF NOT EXISTS idx_users_regional_struct_active 
      ON public.users (regional_structure_id, is_active) WHERE is_active = true;
    `);

    // 5. Seed regional permissions for Super Admin
    for (const perm of NEW_PERMISSIONS) {
      await ensurePermission(queryInterface, perm, now);
    }
  },

  async down(queryInterface) {
    // 1. Remove constraint and columns from users
    await queryInterface.sequelize.query(`
      ALTER TABLE public.users DROP CONSTRAINT IF EXISTS chk_user_domain_exclusive;
      DROP INDEX IF EXISTS idx_users_region_active;
      DROP INDEX IF EXISTS idx_users_regional_struct_active;
      ALTER TABLE public.users DROP COLUMN IF EXISTS regional_structure_id;
      ALTER TABLE public.users DROP COLUMN IF EXISTS region_id;
    `);

    // 2. Drop regional tables
    await queryInterface.sequelize.query(`
      DROP TABLE IF EXISTS public.regional_branding_settings CASCADE;
      DROP TABLE IF EXISTS public.regional_structures CASCADE;
      DROP TABLE IF EXISTS public.regions CASCADE;
    `);

    // 3. Remove permissions
    for (const perm of NEW_PERMISSIONS) {
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
