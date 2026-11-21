"use strict";

const { v4: uuidv4 } = require("uuid");
const { QueryTypes } = require("sequelize");

const ADMIN_USER_ID = "00000000-0000-4000-8000-000000000001";
const SUPER_ADMIN_ROLE_ID = "00000000-0000-4000-8000-000000000002";

const LICENSE_PERMISSIONS = [
  { resource: "company_licenses", action: "create", permission_tier: "special" },
  { resource: "company_licenses", action: "read", permission_tier: "special" },
  { resource: "company_licenses", action: "update", permission_tier: "special" },
  { resource: "company_licenses", action: "delete", permission_tier: "special" },
  { resource: "company_licenses", action: "manage", permission_tier: "special" },
  { resource: "license_types", action: "read", permission_tier: "special" },
  { resource: "license_types", action: "manage", permission_tier: "special" },
];

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const now = new Date();

    // 1. Create license_types table
    const tableExists = await queryInterface.sequelize.query(
      `SELECT to_regclass('public.license_types') as exists;`,
      { type: QueryTypes.SELECT }
    );

    if (!tableExists[0]?.exists) {
      await queryInterface.createTable("license_types", {
        license_type_id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        name: {
          type: Sequelize.STRING(100),
          allowNull: false,
          unique: true,
        },
        code: {
          type: Sequelize.STRING(50),
          allowNull: false,
          unique: true,
        },
        description: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        is_active: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: true,
        },
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal("NOW()"),
        },
        updated_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal("NOW()"),
        },
        deleted_at: {
          type: Sequelize.DATE,
          allowNull: true,
        },
      });

      // Seed initial license types: Exploration & Mining
      await queryInterface.bulkInsert("license_types", [
        {
          license_type_id: uuidv4(),
          name: "Exploration",
          code: "EXPLORATION",
          description: "Exploration mining license for surveying and sampling",
          is_active: true,
          created_at: now,
          updated_at: now,
        },
        {
          license_type_id: uuidv4(),
          name: "Mining",
          code: "MINING",
          description: "Commercial mining and extraction license",
          is_active: true,
          created_at: now,
          updated_at: now,
        },
      ]);
    }

    // 2. Add enhancement columns to companies table if not present
    const companyCols = await queryInterface.describeTable("companies");
    if (!companyCols.abbreviation) {
      await queryInterface.addColumn("companies", "abbreviation", {
        type: Sequelize.STRING(100),
        allowNull: true,
      });
    }
    if (!companyCols.registration_number) {
      await queryInterface.addColumn("companies", "registration_number", {
        type: Sequelize.STRING(100),
        allowNull: true,
      });
    }
    if (!companyCols.contact_person) {
      await queryInterface.addColumn("companies", "contact_person", {
        type: Sequelize.STRING(150),
        allowNull: true,
      });
    }
    if (!companyCols.email) {
      await queryInterface.addColumn("companies", "email", {
        type: Sequelize.STRING(150),
        allowNull: true,
      });
    }
    if (!companyCols.phone) {
      await queryInterface.addColumn("companies", "phone", {
        type: Sequelize.STRING(50),
        allowNull: true,
      });
    }
    if (!companyCols.address) {
      await queryInterface.addColumn("companies", "address", {
        type: Sequelize.TEXT,
        allowNull: true,
      });
    }
    if (!companyCols.company_status) {
      await queryInterface.addColumn("companies", "company_status", {
        type: Sequelize.STRING(50),
        allowNull: true,
        defaultValue: "active",
      });
    }

    // 3. Create company_licenses table
    const licenseTableExists = await queryInterface.sequelize.query(
      `SELECT to_regclass('public.company_licenses') as exists;`,
      { type: QueryTypes.SELECT }
    );

    if (!licenseTableExists[0]?.exists) {
      await queryInterface.createTable("company_licenses", {
        license_id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        company_id: {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: "companies",
            key: "company_id",
          },
          onUpdate: "CASCADE",
          onDelete: "RESTRICT",
        },
        license_type_id: {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: "license_types",
            key: "license_type_id",
          },
          onUpdate: "CASCADE",
          onDelete: "RESTRICT",
        },
        license_number: {
          type: Sequelize.STRING(150),
          allowNull: false,
          unique: true,
        },
        license_name: {
          type: Sequelize.STRING(255),
          allowNull: true,
        },
        status: {
          type: Sequelize.STRING(50),
          allowNull: false,
          defaultValue: "active",
        },
        issued_date: {
          type: Sequelize.DATEONLY,
          allowNull: true,
        },
        effective_start_date: {
          type: Sequelize.DATEONLY,
          allowNull: true,
        },
        effective_end_date: {
          type: Sequelize.DATEONLY,
          allowNull: true,
        },
        effective_year_from: {
          type: Sequelize.INTEGER,
          allowNull: true,
        },
        effective_year_to: {
          type: Sequelize.INTEGER,
          allowNull: true,
        },
        mineral_type: {
          type: Sequelize.STRING(255),
          allowNull: true,
        },
        region: {
          type: Sequelize.STRING(100),
          allowNull: true,
        },
        zone: {
          type: Sequelize.STRING(100),
          allowNull: true,
        },
        woreda: {
          type: Sequelize.STRING(100),
          allowNull: true,
        },
        location_details: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        latitude: {
          type: Sequelize.DECIMAL(11, 8),
          allowNull: true,
        },
        longitude: {
          type: Sequelize.DECIMAL(11, 8),
          allowNull: true,
        },
        boundary_geojson: {
          type: Sequelize.JSONB,
          allowNull: true,
        },
        spatial_reference: {
          type: Sequelize.STRING(50),
          allowNull: true,
          defaultValue: "GCS Adindan",
        },
        description: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        supporting_document_ids: {
          type: Sequelize.JSONB,
          allowNull: true,
          defaultValue: [],
        },
        is_active: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: true,
        },
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal("NOW()"),
        },
        updated_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal("NOW()"),
        },
        deleted_at: {
          type: Sequelize.DATE,
          allowNull: true,
        },
      });

      // Indexes
      await queryInterface.addIndex("company_licenses", ["company_id"], {
        name: "idx_company_licenses_company_id",
      });
      await queryInterface.addIndex("company_licenses", ["license_number"], {
        name: "idx_company_licenses_license_number",
      });
      await queryInterface.addIndex("company_licenses", ["region", "status"], {
        name: "idx_company_licenses_region_status",
      });
    }

    // 4. Add license_id to company_production_assignments
    const assignCols = await queryInterface.describeTable("company_production_assignments");
    if (!assignCols.license_id) {
      await queryInterface.addColumn("company_production_assignments", "license_id", {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: "company_licenses",
          key: "license_id",
        },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      });

      await queryInterface.addIndex("company_production_assignments", ["license_id"], {
        name: "idx_production_assignments_license_id",
      });
    }

    // 5. Seed Permissions & Assign to Super Admin / Federal Admin Roles
    const createdPermIds = [];
    for (const perm of LICENSE_PERMISSIONS) {
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
      createdPermIds.push(permId);
    }

    // Assign to SUPER_ADMIN_ROLE_ID
    for (const permId of createdPermIds) {
      const exists = await queryInterface.sequelize.query(
        `SELECT role_permission_id FROM role_permissions WHERE role_id = :roleId AND permission_id = :permId LIMIT 1`,
        {
          replacements: { roleId: SUPER_ADMIN_ROLE_ID, permId },
          type: QueryTypes.SELECT,
        }
      );
      if (!exists || exists.length === 0) {
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
    }

    // Also assign to Federal Administrator roles if found
    const fedRoles = await queryInterface.sequelize.query(
      `SELECT role_id FROM roles WHERE LOWER(name) LIKE '%federal%' OR LOWER(name) LIKE '%admin%'`,
      { type: QueryTypes.SELECT }
    );

    for (const r of fedRoles) {
      for (const permId of createdPermIds) {
        const exists = await queryInterface.sequelize.query(
          `SELECT role_permission_id FROM role_permissions WHERE role_id = :roleId AND permission_id = :permId LIMIT 1`,
          {
            replacements: { roleId: r.role_id, permId },
            type: QueryTypes.SELECT,
          }
        );
        if (!exists || exists.length === 0) {
          await queryInterface.bulkInsert("role_permissions", [
            {
              role_permission_id: uuidv4(),
              role_id: r.role_id,
              permission_id: permId,
              is_active: true,
              created_at: now,
              updated_at: now,
            },
          ]);
        }
      }
    }
  },

  down: async (queryInterface) => {
    // Reversible steps
    await queryInterface.removeColumn("company_production_assignments", "license_id").catch(() => {});
    await queryInterface.dropTable("company_licenses").catch(() => {});
    await queryInterface.dropTable("license_types").catch(() => {});
  },
};
