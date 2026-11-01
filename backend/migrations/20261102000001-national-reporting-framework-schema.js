"use strict";

const { v4: uuidv4 } = require("uuid");
const { QueryTypes } = require("sequelize");

const SUPER_ADMIN_ROLE_ID = "00000000-0000-4000-8000-000000000002";
const REGIONAL_ADMIN_ROLE_ID = "20000000-0000-4000-8000-000000000001";
const REGIONAL_OFFICER_ROLE_ID = "20000000-0000-4000-8000-000000000002";

const NATIONAL_REPORTING_PERMISSIONS = [
  // Federal permissions
  { resource: "national_reporting", action: "create_requirement", permission_tier: "standard" },
  { resource: "national_reporting", action: "read_requirement", permission_tier: "standard" },
  { resource: "national_reporting", action: "update_requirement", permission_tier: "standard" },
  { resource: "national_reporting", action: "delete_requirement", permission_tier: "standard" },
  { resource: "national_reporting", action: "assign_region", permission_tier: "standard" },
  { resource: "national_reporting", action: "read_assignment", permission_tier: "standard" },
  { resource: "national_reporting", action: "read_published", permission_tier: "standard" },
  { resource: "national_reporting", action: "read_dashboard", permission_tier: "standard" },
  { resource: "national_reporting", action: "request_clarification", permission_tier: "standard" },
  { resource: "national_reporting", action: "manage", permission_tier: "standard" },

  // Regional permissions
  { resource: "regional_national_reporting", action: "read_assigned", permission_tier: "standard" },
  { resource: "regional_national_reporting", action: "create_mapping", permission_tier: "standard" },
  { resource: "regional_national_reporting", action: "update_mapping", permission_tier: "standard" },
  { resource: "regional_national_reporting", action: "delete_mapping", permission_tier: "standard" },
  { resource: "regional_national_reporting", action: "confirm_mapping", permission_tier: "standard" },
  { resource: "regional_national_reporting", action: "publish_validated", permission_tier: "standard" },
  { resource: "regional_national_reporting", action: "read_history", permission_tier: "standard" },
  { resource: "regional_national_reporting", action: "manage", permission_tier: "standard" },
];

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. Create national_reporting_requirements table
    await queryInterface.createTable("national_reporting_requirements", {
      requirement_id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      code: {
        type: Sequelize.STRING(60),
        allowNull: false,
        unique: true,
      },
      title: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      category: {
        type: Sequelize.STRING(100),
        allowNull: false,
        defaultValue: "mining_production",
      },
      expected_unit: {
        type: Sequelize.STRING(50),
        allowNull: false,
      },
      unit_category: {
        type: Sequelize.STRING(50),
        allowNull: false,
        defaultValue: "mass",
      },
      frequency: {
        type: Sequelize.STRING(50),
        allowNull: false,
        defaultValue: "quarterly",
      },
      requires_numeric: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      requires_narrative: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      requires_evidence: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      validation_rules: {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: {},
      },
      effective_start_date: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },
      effective_end_date: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      version_number: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },
      created_by: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: "users",
          key: "user_id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      updated_by: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: "users",
          key: "user_id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
        allowNull: false,
      },
      updated_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
        allowNull: false,
      },
      deleted_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
    });

    await queryInterface.addIndex("national_reporting_requirements", ["code"], {
      unique: true,
      name: "idx_nat_req_code",
    });
    await queryInterface.addIndex("national_reporting_requirements", ["category", "is_active"], {
      name: "idx_nat_req_category_active",
    });

    // 2. Create national_reporting_assignments table
    await queryInterface.createTable("national_reporting_assignments", {
      assignment_id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      requirement_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "national_reporting_requirements",
          key: "requirement_id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      region_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "regions",
          key: "region_id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      is_mandatory: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      effective_start_date: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },
      effective_end_date: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },
      frequency_override: {
        type: Sequelize.STRING(50),
        allowNull: true,
      },
      status: {
        type: Sequelize.STRING(50),
        allowNull: false,
        defaultValue: "active", // active, suspended, withdrawn
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      assigned_by: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: "users",
          key: "user_id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      assigned_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
        allowNull: false,
      },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
        allowNull: false,
      },
      updated_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
        allowNull: false,
      },
      deleted_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
    });

    await queryInterface.addIndex(
      "national_reporting_assignments",
      ["requirement_id", "region_id", "status"],
      { name: "idx_nat_assign_req_reg" }
    );
    await queryInterface.addIndex("national_reporting_assignments", ["region_id", "status"], {
      name: "idx_nat_assign_region_status",
    });

    // 3. Create regional_requirement_mappings table
    await queryInterface.createTable("regional_requirement_mappings", {
      mapping_id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      assignment_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "national_reporting_assignments",
          key: "assignment_id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      region_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "regions",
          key: "region_id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      regional_plan_version_id: {
        type: Sequelize.UUID,
        allowNull: true,
      },
      regional_plan_node_id: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      stage: {
        type: Sequelize.STRING(50),
        allowNull: false,
        defaultValue: "potential", // potential, confirmed, archived
      },
      local_unit: {
        type: Sequelize.STRING(50),
        allowNull: false,
      },
      unit_conversion_factor: {
        type: Sequelize.FLOAT,
        allowNull: false,
        defaultValue: 1.0,
      },
      contribution_ratio: {
        type: Sequelize.FLOAT,
        allowNull: false,
        defaultValue: 1.0,
      },
      confirmed_period_version_id: {
        type: Sequelize.UUID,
        allowNull: true,
      },
      confirmed_by: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: "users",
          key: "user_id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      confirmed_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      created_by: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: "users",
          key: "user_id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      updated_by: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: "users",
          key: "user_id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
        allowNull: false,
      },
      updated_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
        allowNull: false,
      },
      deleted_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
    });

    await queryInterface.addIndex("regional_requirement_mappings", ["assignment_id", "stage"], {
      name: "idx_reg_req_map_assign_stage",
    });
    await queryInterface.addIndex("regional_requirement_mappings", ["region_id", "stage"], {
      name: "idx_reg_req_map_region_stage",
    });
    await queryInterface.addIndex("regional_requirement_mappings", ["regional_plan_node_id"], {
      name: "idx_reg_req_map_node",
    });

    // 4. Create national_published_records table
    await queryInterface.createTable("national_published_records", {
      published_record_id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      publication_reference: {
        type: Sequelize.STRING(100),
        allowNull: false,
        unique: true,
      },
      requirement_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "national_reporting_requirements",
          key: "requirement_id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      assignment_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "national_reporting_assignments",
          key: "assignment_id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      mapping_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "regional_requirement_mappings",
          key: "mapping_id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      region_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "regions",
          key: "region_id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      regional_plan_node_id: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      regional_plan_version_id: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      reporting_year: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      reporting_period_label: {
        type: Sequelize.STRING(50),
        allowNull: false,
      },
      reporting_period_id: {
        type: Sequelize.UUID,
        allowNull: true,
      },
      planned_target: {
        type: Sequelize.FLOAT,
        allowNull: true,
      },
      reported_actual: {
        type: Sequelize.FLOAT,
        allowNull: true,
      },
      local_unit: {
        type: Sequelize.STRING(50),
        allowNull: false,
      },
      standardized_target: {
        type: Sequelize.FLOAT,
        allowNull: true,
      },
      standardized_actual: {
        type: Sequelize.FLOAT,
        allowNull: true,
      },
      standardized_unit: {
        type: Sequelize.STRING(50),
        allowNull: false,
      },
      achievement_percent: {
        type: Sequelize.FLOAT,
        allowNull: true,
      },
      narrative: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      evidence_attachments: {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: [],
      },
      regional_validated_by: {
        type: Sequelize.UUID,
        allowNull: true,
      },
      regional_validated_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      published_by: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: "users",
          key: "user_id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      published_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
        allowNull: false,
      },
      revision_number: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },
      superseded_by_id: {
        type: Sequelize.UUID,
        allowNull: true,
      },
      status: {
        type: Sequelize.STRING(50),
        allowNull: false,
        defaultValue: "published", // published, superseded, clarification_requested
      },
      clarification_notes: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      snapshot_data: {
        type: Sequelize.JSONB,
        allowNull: false,
      },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
        allowNull: false,
      },
      updated_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
        allowNull: false,
      },
      deleted_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
    });

    await queryInterface.addIndex("national_published_records", ["publication_reference"], {
      unique: true,
      name: "idx_nat_pub_reference",
    });
    await queryInterface.addIndex(
      "national_published_records",
      ["requirement_id", "region_id", "reporting_year", "reporting_period_label"],
      { name: "idx_nat_pub_req_reg_year_period" }
    );
    await queryInterface.addIndex("national_published_records", ["region_id", "status"], {
      name: "idx_nat_pub_region_status",
    });
    await queryInterface.addIndex("national_published_records", ["reporting_year", "reporting_period_label"], {
      name: "idx_nat_pub_year_period",
    });

    // 5. Seed Permissions & Link to Super Admin and Regional Admin Roles
    const now = new Date();
    for (const perm of NATIONAL_REPORTING_PERMISSIONS) {
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

      // Grant to Super Admin
      const existingSuperAdminPerm = await queryInterface.sequelize.query(
        `SELECT role_permission_id FROM role_permissions WHERE role_id = :roleId AND permission_id = :permId LIMIT 1`,
        {
          replacements: { roleId: SUPER_ADMIN_ROLE_ID, permId },
          type: QueryTypes.SELECT,
        }
      );

      if (!existingSuperAdminPerm || existingSuperAdminPerm.length === 0) {
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

      // Grant regional permissions to Regional Admin role
      if (perm.resource === "regional_national_reporting") {
        const existingRegionalAdminPerm = await queryInterface.sequelize.query(
          `SELECT role_permission_id FROM role_permissions WHERE role_id = :roleId AND permission_id = :permId LIMIT 1`,
          {
            replacements: { roleId: REGIONAL_ADMIN_ROLE_ID, permId },
            type: QueryTypes.SELECT,
          }
        );

        if (!existingRegionalAdminPerm || existingRegionalAdminPerm.length === 0) {
          await queryInterface.bulkInsert("role_permissions", [
            {
              role_permission_id: uuidv4(),
              role_id: REGIONAL_ADMIN_ROLE_ID,
              permission_id: permId,
              is_active: true,
              created_at: now,
              updated_at: now,
            },
          ]);
        }

        // Also grant read/history to Regional Officer
        if (["read_assigned", "read_history"].includes(perm.action)) {
          const existingRegionalOfficerPerm = await queryInterface.sequelize.query(
            `SELECT role_permission_id FROM role_permissions WHERE role_id = :roleId AND permission_id = :permId LIMIT 1`,
            {
              replacements: { roleId: REGIONAL_OFFICER_ROLE_ID, permId },
              type: QueryTypes.SELECT,
            }
          );

          if (!existingRegionalOfficerPerm || existingRegionalOfficerPerm.length === 0) {
            await queryInterface.bulkInsert("role_permissions", [
              {
                role_permission_id: uuidv4(),
                role_id: REGIONAL_OFFICER_ROLE_ID,
                permission_id: permId,
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
    await queryInterface.dropTable("national_published_records");
    await queryInterface.dropTable("regional_requirement_mappings");
    await queryInterface.dropTable("national_reporting_assignments");
    await queryInterface.dropTable("national_reporting_requirements");

    for (const perm of NATIONAL_REPORTING_PERMISSIONS) {
      await queryInterface.sequelize.query(
        `DELETE FROM permissions WHERE LOWER(resource) = LOWER(:resource) AND LOWER(action) = LOWER(:action)`,
        {
          replacements: { resource: perm.resource, action: perm.action },
        }
      );
    }
  },
};

