"use strict";

const { v4: uuidv4 } = require("uuid");
const { QueryTypes } = require("sequelize");

const SUPER_ADMIN_ROLE_ID = "00000000-0000-4000-8000-000000000002";
const PURCHASING_CENTER_ADMIN_ROLE_ID = "40000000-0000-4000-8000-000000000001";
const PURCHASING_CENTER_OFFICER_ROLE_ID = "40000000-0000-4000-8000-000000000002";
const PURCHASING_CENTER_VIEWER_ROLE_ID = "40000000-0000-4000-8000-000000000003";

const NEW_PERMISSIONS = [
  // Gold Purchases
  { resource: "gold_purchases", action: "read", permission_tier: "standard" },
  { resource: "gold_purchases", action: "create", permission_tier: "standard" },
  { resource: "gold_purchases", action: "update", permission_tier: "standard" },
  { resource: "gold_purchases", action: "cancel", permission_tier: "standard" },
  { resource: "gold_purchases", action: "manage", permission_tier: "standard" },

  // Gold Reports
  { resource: "gold_reports", action: "read", permission_tier: "standard" },
  { resource: "gold_reports", action: "generate", permission_tier: "standard" },
  { resource: "gold_reports", action: "submit", permission_tier: "standard" },
  { resource: "gold_reports", action: "export", permission_tier: "standard" },
  { resource: "gold_reports", action: "manage", permission_tier: "standard" },

  // ASM Miners Registry
  { resource: "asm", action: "read", permission_tier: "standard" },
  { resource: "asm", action: "create", permission_tier: "standard" },
  { resource: "asm", action: "update", permission_tier: "standard" },
  { resource: "asm", action: "deactivate", permission_tier: "standard" },
  { resource: "asm", action: "manage", permission_tier: "standard" },

  // Gold Measurement Units (Federal administration & center read)
  { resource: "gold_units", action: "read", permission_tier: "standard" },
  { resource: "gold_units", action: "create", permission_tier: "standard" },
  { resource: "gold_units", action: "update", permission_tier: "standard" },
  { resource: "gold_units", action: "deactivate", permission_tier: "standard" },
  { resource: "gold_units", action: "manage", permission_tier: "standard" },

  // Federal Oversight
  { resource: "gold_oversight", action: "read", permission_tier: "standard" },
  { resource: "gold_oversight", action: "manage", permission_tier: "standard" },
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

async function grantPermissionToRole(queryInterface, roleId, permId, now) {
  const existing = await queryInterface.sequelize.query(
    `SELECT role_permission_id FROM role_permissions WHERE role_id = :roleId AND permission_id = :permId LIMIT 1`,
    {
      replacements: { roleId, permId },
      type: QueryTypes.SELECT,
    }
  );

  if (!existing || existing.length === 0) {
    await queryInterface.bulkInsert("role_permissions", [
      {
        role_permission_id: uuidv4(),
        role_id: roleId,
        permission_id: permId,
        is_active: true,
        created_at: now,
        updated_at: now,
      },
    ]);
  }
}

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const now = new Date();

    // 1. Create gold_measurement_units table
    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS public.gold_measurement_units (
        unit_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) NOT NULL UNIQUE,
        code VARCHAR(50) NOT NULL UNIQUE,
        symbol VARCHAR(20) NOT NULL,
        description TEXT NULL,
        conversion_factor NUMERIC(18, 6) NOT NULL DEFAULT 1.000000,
        is_canonical_base BOOLEAN NOT NULL DEFAULT false,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        deleted_at TIMESTAMPTZ NULL
      );

      CREATE INDEX IF NOT EXISTS idx_gold_units_code ON public.gold_measurement_units (code);
      CREATE INDEX IF NOT EXISTS idx_gold_units_active ON public.gold_measurement_units (is_active) WHERE is_active = true;
    `);

    // Seed default approved measurement units
    const defaultUnits = [
      {
        name: "Gram",
        code: "g",
        symbol: "g",
        description: "Official canonical metric base unit for gold weighing and treasury accounting (1.0g)",
        conversion_factor: 1.0,
        is_canonical_base: true,
      },
      {
        name: "Kilogram",
        code: "kg",
        symbol: "kg",
        description: "Bulk metric measurement unit (1,000 grams)",
        conversion_factor: 1000.0,
        is_canonical_base: false,
      },
      {
        name: "Tola",
        code: "tola",
        symbol: "tola",
        description: "Traditional regional and Middle Eastern precious metal unit (11.663804 grams)",
        conversion_factor: 11.663804,
        is_canonical_base: false,
      },
      {
        name: "Troy Ounce",
        code: "oz_t",
        symbol: "oz t",
        description: "International bullion and market trading standard unit (31.103477 grams)",
        conversion_factor: 31.103477,
        is_canonical_base: false,
      },
    ];

    for (const u of defaultUnits) {
      await queryInterface.sequelize.query(
        `INSERT INTO public.gold_measurement_units (unit_id, name, code, symbol, description, conversion_factor, is_canonical_base, is_active, created_at, updated_at)
         VALUES (gen_random_uuid(), :name, :code, :symbol, :description, :conversion_factor, :is_canonical_base, true, NOW(), NOW())
         ON CONFLICT (code) DO UPDATE SET
           name = EXCLUDED.name,
           symbol = EXCLUDED.symbol,
           description = EXCLUDED.description,
           conversion_factor = EXCLUDED.conversion_factor,
           is_canonical_base = EXCLUDED.is_canonical_base,
           updated_at = NOW();`,
        { replacements: u }
      );
    }

    // 2. Create asm_miners table (Shared Artisanal and Small-Scale Miner Registry)
    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS public.asm_miners (
        asm_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        full_name VARCHAR(255) NOT NULL,
        national_id_number VARCHAR(100) NULL,
        mining_license_number VARCHAR(100) NULL,
        phone_number VARCHAR(50) NULL,
        region VARCHAR(100) NULL,
        zone_or_woreda VARCHAR(100) NULL,
        kebele VARCHAR(100) NULL,
        is_active BOOLEAN NOT NULL DEFAULT true,
        registered_center_id UUID NULL REFERENCES public.purchasing_centers(purchasing_center_id) ON DELETE SET NULL,
        registered_by_id UUID NULL REFERENCES public.users(user_id) ON DELETE SET NULL,
        notes TEXT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        deleted_at TIMESTAMPTZ NULL
      );

      CREATE INDEX IF NOT EXISTS idx_asm_miners_name ON public.asm_miners (full_name);
      CREATE INDEX IF NOT EXISTS idx_asm_miners_phone ON public.asm_miners (phone_number) WHERE phone_number IS NOT NULL;
      CREATE INDEX IF NOT EXISTS idx_asm_miners_active ON public.asm_miners (is_active) WHERE is_active = true;
      CREATE UNIQUE INDEX IF NOT EXISTS uq_asm_national_id ON public.asm_miners (national_id_number) 
        WHERE deleted_at IS NULL AND national_id_number IS NOT NULL AND national_id_number <> '';
      CREATE UNIQUE INDEX IF NOT EXISTS uq_asm_mining_license ON public.asm_miners (mining_license_number) 
        WHERE deleted_at IS NULL AND mining_license_number IS NOT NULL AND mining_license_number <> '';
    `);

    // 3. Create gold_purchases table
    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS public.gold_purchases (
        purchase_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        purchase_reference VARCHAR(100) NOT NULL UNIQUE,
        purchasing_center_id UUID NOT NULL REFERENCES public.purchasing_centers(purchasing_center_id) ON DELETE RESTRICT,
        seller_type VARCHAR(20) NOT NULL CHECK (seller_type IN ('company', 'asm')),
        company_id UUID NULL REFERENCES public.companies(company_id) ON DELETE RESTRICT,
        asm_id UUID NULL REFERENCES public.asm_miners(asm_id) ON DELETE RESTRICT,
        seller_name_snapshot VARCHAR(255) NOT NULL,
        seller_identifier_snapshot VARCHAR(100) NULL,
        purchase_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        business_date DATE NOT NULL DEFAULT CURRENT_DATE,
        quantity NUMERIC(18, 4) NOT NULL CHECK (quantity > 0),
        measurement_unit_id UUID NOT NULL REFERENCES public.gold_measurement_units(unit_id) ON DELETE RESTRICT,
        unit_code_snapshot VARCHAR(50) NOT NULL,
        conversion_factor_snapshot NUMERIC(18, 6) NOT NULL DEFAULT 1.000000,
        quantity_in_canonical_unit NUMERIC(18, 4) NOT NULL CHECK (quantity_in_canonical_unit > 0),
        unit_price NUMERIC(18, 2) NOT NULL CHECK (unit_price >= 0),
        total_amount NUMERIC(18, 2) NOT NULL CHECK (total_amount >= 0),
        currency VARCHAR(10) NOT NULL DEFAULT 'ETB',
        notes TEXT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'cancelled')),
        cancelled_reason TEXT NULL,
        cancelled_at TIMESTAMPTZ NULL,
        cancelled_by_id UUID NULL REFERENCES public.users(user_id) ON DELETE SET NULL,
        created_by_id UUID NOT NULL REFERENCES public.users(user_id) ON DELETE RESTRICT,
        updated_by_id UUID NULL REFERENCES public.users(user_id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        deleted_at TIMESTAMPTZ NULL,
        CONSTRAINT chk_gold_purchase_seller_exclusivity CHECK (
          (seller_type = 'company' AND company_id IS NOT NULL AND asm_id IS NULL) OR
          (seller_type = 'asm' AND asm_id IS NOT NULL AND company_id IS NULL)
        )
      );

      CREATE INDEX IF NOT EXISTS idx_gold_purchases_center_bdate ON public.gold_purchases (purchasing_center_id, business_date);
      CREATE INDEX IF NOT EXISTS idx_gold_purchases_bdate ON public.gold_purchases (business_date);
      CREATE INDEX IF NOT EXISTS idx_gold_purchases_company ON public.gold_purchases (company_id) WHERE company_id IS NOT NULL;
      CREATE INDEX IF NOT EXISTS idx_gold_purchases_asm ON public.gold_purchases (asm_id) WHERE asm_id IS NOT NULL;
      CREATE INDEX IF NOT EXISTS idx_gold_purchases_status ON public.gold_purchases (status);
    `);

    // 4. Create gold_daily_reports table
    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS public.gold_daily_reports (
        report_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        purchasing_center_id UUID NOT NULL REFERENCES public.purchasing_centers(purchasing_center_id) ON DELETE RESTRICT,
        business_date DATE NOT NULL,
        total_purchases INTEGER NOT NULL DEFAULT 0,
        total_quantity_canonical NUMERIC(18, 4) NOT NULL DEFAULT 0,
        total_amount NUMERIC(18, 2) NOT NULL DEFAULT 0,
        unit_breakdown JSONB NOT NULL DEFAULT '[]'::jsonb,
        seller_breakdown JSONB NOT NULL DEFAULT '{}'::jsonb,
        status VARCHAR(50) NOT NULL DEFAULT 'submitted' CHECK (status IN ('draft', 'submitted', 'reviewed')),
        submitted_by_id UUID NULL REFERENCES public.users(user_id) ON DELETE SET NULL,
        submitted_at TIMESTAMPTZ NULL,
        reviewed_by_id UUID NULL REFERENCES public.users(user_id) ON DELETE SET NULL,
        reviewed_at TIMESTAMPTZ NULL,
        notes TEXT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        deleted_at TIMESTAMPTZ NULL,
        CONSTRAINT uq_gold_daily_report_center_bdate UNIQUE (purchasing_center_id, business_date)
      );

      CREATE INDEX IF NOT EXISTS idx_gold_daily_reports_center_date ON public.gold_daily_reports (purchasing_center_id, business_date);
      CREATE INDEX IF NOT EXISTS idx_gold_daily_reports_date ON public.gold_daily_reports (business_date);
      CREATE INDEX IF NOT EXISTS idx_gold_daily_reports_status ON public.gold_daily_reports (status);
    `);

    // 5. Seed Permissions
    const permMap = new Map();
    for (const perm of NEW_PERMISSIONS) {
      const pid = await ensurePermission(queryInterface, perm, now);
      permMap.set(`${perm.resource}:${perm.action}`, pid);
    }

    // 6. Grant appropriate permissions to Purchasing Center Roles
    // Purchasing Center Administrator
    const adminPerms = [
      "gold_purchases:read",
      "gold_purchases:create",
      "gold_purchases:update",
      "gold_purchases:cancel",
      "gold_reports:read",
      "gold_reports:generate",
      "gold_reports:submit",
      "gold_reports:export",
      "asm:read",
      "asm:create",
      "asm:update",
      "gold_units:read",
    ];
    for (const key of adminPerms) {
      const pid = permMap.get(key);
      if (pid) {
        await grantPermissionToRole(queryInterface, PURCHASING_CENTER_ADMIN_ROLE_ID, pid, now);
      }
    }

    // Purchasing Center Officer
    const officerPerms = [
      "gold_purchases:read",
      "gold_purchases:create",
      "gold_reports:read",
      "gold_reports:generate",
      "gold_reports:submit",
      "gold_reports:export",
      "asm:read",
      "asm:create",
      "gold_units:read",
    ];
    for (const key of officerPerms) {
      const pid = permMap.get(key);
      if (pid) {
        await grantPermissionToRole(queryInterface, PURCHASING_CENTER_OFFICER_ROLE_ID, pid, now);
      }
    }

    // Purchasing Center Viewer
    const viewerPerms = [
      "gold_purchases:read",
      "gold_reports:read",
      "gold_reports:export",
      "asm:read",
      "gold_units:read",
    ];
    for (const key of viewerPerms) {
      const pid = permMap.get(key);
      if (pid) {
        await grantPermissionToRole(queryInterface, PURCHASING_CENTER_VIEWER_ROLE_ID, pid, now);
      }
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.query(`
      DROP TABLE IF EXISTS public.gold_daily_reports CASCADE;
      DROP TABLE IF EXISTS public.gold_purchases CASCADE;
      DROP TABLE IF EXISTS public.asm_miners CASCADE;
      DROP TABLE IF EXISTS public.gold_measurement_units CASCADE;
    `);
  },
};
