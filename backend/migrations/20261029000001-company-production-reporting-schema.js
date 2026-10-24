"use strict";

const { v4: uuidv4 } = require("uuid");
const { QueryTypes } = require("sequelize");

const SUPER_ADMIN_ROLE_ID = "00000000-0000-4000-8000-000000000002";
const COMPANY_ADMIN_ROLE_ID = "30000000-0000-4000-8000-000000000001";
const COMPANY_OFFICER_ROLE_ID = "30000000-0000-4000-8000-000000000002";
const COMPANY_VIEWER_ROLE_ID = "30000000-0000-4000-8000-000000000003";

const PRODUCTION_PERMISSIONS = [
  // Federal Configuration
  { resource: "production_items", action: "create" },
  { resource: "production_items", action: "read" },
  { resource: "production_items", action: "update" },
  { resource: "production_items", action: "delete" },
  { resource: "production_items", action: "manage" },
  { resource: "production_frequencies", action: "read" },
  { resource: "production_frequencies", action: "manage" },
  { resource: "production_dashboard", action: "read" },

  // Company Production Assignments & Targets (Federal Admin & Company Read)
  { resource: "company_production", action: "assign" },
  { resource: "company_production", action: "read" },
  { resource: "company_production", action: "manage" },
  { resource: "company_production_targets", action: "create" },
  { resource: "company_production_targets", action: "read" },
  { resource: "company_production_targets", action: "update" },
  { resource: "company_production_targets", action: "manage" },

  // Company Reporting (Company Scope & Federal Oversight)
  { resource: "company_production_reports", action: "create" },
  { resource: "company_production_reports", action: "read" },
  { resource: "company_production_reports", action: "update" },
  { resource: "company_production_reports", action: "approve" },
  { resource: "company_production_reports", action: "export" },
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
  return permId;
}

async function linkPermissionToRole(queryInterface, roleId, permissionId, now) {
  const existing = await queryInterface.sequelize.query(
    `SELECT role_permission_id FROM role_permissions WHERE role_id = :roleId AND permission_id = :permissionId LIMIT 1`,
    {
      replacements: { roleId, permissionId },
      type: QueryTypes.SELECT,
    }
  );

  if (!existing || existing.length === 0) {
    await queryInterface.bulkInsert("role_permissions", [
      {
        role_permission_id: uuidv4(),
        role_id: roleId,
        permission_id: permissionId,
        created_at: now,
        updated_at: now,
      },
    ]);
  }
}

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const { DataTypes } = Sequelize;
    const now = new Date();

    // 0. Ensure "Tonne" is present in gold_measurement_units for bulk mineral production
    await queryInterface.sequelize.query(
      `INSERT INTO public.gold_measurement_units (unit_id, name, code, symbol, description, conversion_factor, is_canonical_base, is_active, created_at, updated_at)
       VALUES (gen_random_uuid(), 'Metric Tonne', 'tonne', 't', 'Metric ton measurement unit (1,000,000 grams or 1,000 kg)', 1000000.000000, false, true, NOW(), NOW())
       ON CONFLICT (code) DO NOTHING;`
    );

    // 1. production_items
    await queryInterface.createTable("production_items", {
      production_item_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      name: {
        type: DataTypes.STRING(150),
        allowNull: false,
        unique: true,
      },
      code: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      category: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      base_unit_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: "gold_measurement_units",
          key: "unit_id",
        },
        onDelete: "RESTRICT",
        onUpdate: "CASCADE",
      },
      default_reporting_unit_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: "gold_measurement_units",
          key: "unit_id",
        },
        onDelete: "SET NULL",
        onUpdate: "CASCADE",
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn("NOW"),
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn("NOW"),
      },
      deleted_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    });

    await queryInterface.addIndex("production_items", ["code"], {
      name: "idx_prod_items_code",
    });
    await queryInterface.addIndex("production_items", ["is_active"], {
      name: "idx_prod_items_active",
    });

    // 2. production_item_units
    await queryInterface.createTable("production_item_units", {
      item_unit_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      production_item_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: "production_items",
          key: "production_item_id",
        },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      },
      unit_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: "gold_measurement_units",
          key: "unit_id",
        },
        onDelete: "RESTRICT",
        onUpdate: "CASCADE",
      },
      conversion_factor_to_base: {
        type: DataTypes.DECIMAL(18, 6),
        allowNull: false,
        defaultValue: 1.0,
      },
      is_default: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn("NOW"),
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn("NOW"),
      },
    });

    await queryInterface.addIndex("production_item_units", ["production_item_id", "unit_id"], {
      name: "idx_prod_item_units_unique",
      unique: true,
    });

    // 3. production_reporting_frequencies
    await queryInterface.createTable("production_reporting_frequencies", {
      frequency_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      code: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true,
      },
      name: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      interval_days: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      calendar_basis: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: "gregorian",
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn("NOW"),
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn("NOW"),
      },
    });

    // Seed default frequencies
    const defaultFrequencies = [
      { code: "daily", name: "Daily", interval_days: 1, description: "Daily production reporting" },
      { code: "weekly", name: "Weekly", interval_days: 7, description: "Weekly production reporting" },
      { code: "monthly", name: "Monthly", interval_days: 30, description: "Monthly production reporting" },
      { code: "quarterly", name: "Quarterly", interval_days: 90, description: "Quarterly production reporting" },
      { code: "semi_annual", name: "Semiannual", interval_days: 180, description: "Six-month production reporting" },
      { code: "annual", name: "Annual", interval_days: 365, description: "Annual production reporting" },
    ];

    for (const freq of defaultFrequencies) {
      await queryInterface.sequelize.query(
        `INSERT INTO public.production_reporting_frequencies (frequency_id, code, name, interval_days, description, calendar_basis, is_active, created_at, updated_at)
         VALUES (gen_random_uuid(), :code, :name, :interval_days, :description, 'gregorian', true, NOW(), NOW())
         ON CONFLICT (code) DO NOTHING;`,
        { replacements: freq }
      );
    }

    // 4. company_production_assignments
    await queryInterface.createTable("company_production_assignments", {
      assignment_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      company_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: "companies",
          key: "company_id",
        },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      },
      production_item_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: "production_items",
          key: "production_item_id",
        },
        onDelete: "RESTRICT",
        onUpdate: "CASCADE",
      },
      reporting_frequency_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: "production_reporting_frequencies",
          key: "frequency_id",
        },
        onDelete: "RESTRICT",
        onUpdate: "CASCADE",
      },
      target_allocation_depth: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: "quarterly", // 'annual', 'semi_annual', 'quarterly', 'monthly', 'daily'
      },
      default_reporting_unit_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: "gold_measurement_units",
          key: "unit_id",
        },
        onDelete: "SET NULL",
        onUpdate: "CASCADE",
      },
      effective_from: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      effective_to: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      requires_review: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      created_by: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: "users",
          key: "user_id",
        },
        onDelete: "SET NULL",
        onUpdate: "CASCADE",
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn("NOW"),
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn("NOW"),
      },
      deleted_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    });

    await queryInterface.addIndex("company_production_assignments", ["company_id", "production_item_id"], {
      name: "idx_comp_prod_assign_comp_item",
    });
    await queryInterface.addIndex("company_production_assignments", ["is_active"], {
      name: "idx_comp_prod_assign_active",
    });

    // 5. company_production_targets
    await queryInterface.createTable("company_production_targets", {
      target_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      assignment_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: "company_production_assignments",
          key: "assignment_id",
        },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      },
      parent_target_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: "company_production_targets",
          key: "target_id",
        },
        onDelete: "SET NULL",
        onUpdate: "CASCADE",
      },
      version_number: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },
      target_period_type: {
        type: DataTypes.STRING(50),
        allowNull: false, // 'year', 'half_year', 'quarter', 'month', 'day'
      },
      period_label: {
        type: DataTypes.STRING(100),
        allowNull: false, // '2026', '2026-Q1', '2026-01'
      },
      period_start_date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      period_end_date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      target_quantity: {
        type: DataTypes.DECIMAL(18, 4),
        allowNull: false,
      },
      unit_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: "gold_measurement_units",
          key: "unit_id",
        },
        onDelete: "RESTRICT",
        onUpdate: "CASCADE",
      },
      target_quantity_base: {
        type: DataTypes.DECIMAL(18, 4),
        allowNull: false,
      },
      status: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: "published", // 'draft', 'published', 'superseded'
      },
      revision_reason: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      created_by: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: "users",
          key: "user_id",
        },
        onDelete: "SET NULL",
        onUpdate: "CASCADE",
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn("NOW"),
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn("NOW"),
      },
      deleted_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    });

    await queryInterface.addIndex("company_production_targets", ["assignment_id", "version_number", "status"], {
      name: "idx_comp_prod_targets_assign_ver",
    });
    await queryInterface.addIndex("company_production_targets", ["period_start_date", "period_end_date"], {
      name: "idx_comp_prod_targets_dates",
    });
    await queryInterface.addIndex("company_production_targets", ["parent_target_id"], {
      name: "idx_comp_prod_targets_parent",
    });

    // 6. company_production_reports
    await queryInterface.createTable("company_production_reports", {
      report_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      company_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: "companies",
          key: "company_id",
        },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      },
      assignment_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: "company_production_assignments",
          key: "assignment_id",
        },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      },
      production_item_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: "production_items",
          key: "production_item_id",
        },
        onDelete: "RESTRICT",
        onUpdate: "CASCADE",
      },
      report_date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      period_label: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      quantity_reported: {
        type: DataTypes.DECIMAL(18, 4),
        allowNull: false,
      },
      reported_unit_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: "gold_measurement_units",
          key: "unit_id",
        },
        onDelete: "RESTRICT",
        onUpdate: "CASCADE",
      },
      normalized_quantity: {
        type: DataTypes.DECIMAL(18, 4),
        allowNull: false,
      },
      status: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: "submitted", // 'draft', 'submitted', 'approved', 'rejected'
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      submitted_by: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: "users",
          key: "user_id",
        },
        onDelete: "SET NULL",
        onUpdate: "CASCADE",
      },
      reviewed_by: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: "users",
          key: "user_id",
        },
        onDelete: "SET NULL",
        onUpdate: "CASCADE",
      },
      reviewed_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      review_comments: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn("NOW"),
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn("NOW"),
      },
      deleted_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    });

    await queryInterface.addIndex("company_production_reports", ["company_id", "production_item_id", "report_date"], {
      name: "idx_comp_prod_rep_lookup",
    });
    await queryInterface.addIndex("company_production_reports", ["assignment_id", "report_date"], {
      name: "idx_comp_prod_rep_assign_date",
    });

    // Partial unique index to prevent duplicate reports for the same company, production item, and date
    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_comp_prod_rep_date 
      ON public.company_production_reports (company_id, production_item_id, report_date) 
      WHERE deleted_at IS NULL;
    `);

    // 7. Register & Link Permissions
    for (const perm of PRODUCTION_PERMISSIONS) {
      const permId = await ensurePermission(queryInterface, perm, now);

      // Super Admin gets all production permissions
      await linkPermissionToRole(queryInterface, SUPER_ADMIN_ROLE_ID, permId, now);

      // Company Admin gets company production reads, reports CRUD & export
      if (
        (perm.resource === "company_production" && perm.action === "read") ||
        (perm.resource === "company_production_targets" && perm.action === "read") ||
        (perm.resource === "company_production_reports" && ["create", "read", "update", "approve", "export"].includes(perm.action))
      ) {
        await linkPermissionToRole(queryInterface, COMPANY_ADMIN_ROLE_ID, permId, now);
      }

      // Company Officer gets company production reads, reports create, read, update
      if (
        (perm.resource === "company_production" && perm.action === "read") ||
        (perm.resource === "company_production_targets" && perm.action === "read") ||
        (perm.resource === "company_production_reports" && ["create", "read", "update"].includes(perm.action))
      ) {
        await linkPermissionToRole(queryInterface, COMPANY_OFFICER_ROLE_ID, permId, now);
      }

      // Company Viewer gets read-only access
      if (
        (perm.resource === "company_production" && perm.action === "read") ||
        (perm.resource === "company_production_targets" && perm.action === "read") ||
        (perm.resource === "company_production_reports" && perm.action === "read")
      ) {
        await linkPermissionToRole(queryInterface, COMPANY_VIEWER_ROLE_ID, permId, now);
      }
    }
  },

  down: async (queryInterface) => {
    // Drop tables in reverse dependency order
    await queryInterface.dropTable("company_production_reports");
    await queryInterface.dropTable("company_production_targets");
    await queryInterface.dropTable("company_production_assignments");
    await queryInterface.dropTable("production_reporting_frequencies");
    await queryInterface.dropTable("production_item_units");
    await queryInterface.dropTable("production_items");

    // Remove permissions
    for (const perm of PRODUCTION_PERMISSIONS) {
      await queryInterface.sequelize.query(
        `DELETE FROM permissions WHERE LOWER(resource) = LOWER(:resource) AND LOWER(action) = LOWER(:action)`,
        { replacements: { resource: perm.resource, action: perm.action } }
      );
    }
  },
};
