"use strict";

const { v4: uuidv4 } = require("uuid");
const { QueryTypes } = require("sequelize");

const SUPER_ADMIN_ROLE_ID = "00000000-0000-4000-8000-000000000002";
const COMPANY_ADMIN_ROLE_ID = "30000000-0000-4000-8000-000000000001";
const COMPANY_OFFICER_ROLE_ID = "30000000-0000-4000-8000-000000000002";
const COMPANY_VIEWER_ROLE_ID = "30000000-0000-4000-8000-000000000003";

const NEW_PERMISSIONS = [
  { resource: "company_production_targets", action: "approve" },
  { resource: "company_production_responsibilities", action: "create" },
  { resource: "company_production_responsibilities", action: "read" },
  { resource: "company_production_responsibilities", action: "update" },
  { resource: "company_production_responsibilities", action: "delete" },
  { resource: "company_production_responsibilities", action: "manage" },
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

    // 1. Extend company_production_targets
    const targetTableDesc = await queryInterface.describeTable("company_production_targets");

    if (!targetTableDesc.company_structure_id) {
      await queryInterface.addColumn("company_production_targets", "company_structure_id", {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: "company_structures",
          key: "company_structure_id",
        },
        onDelete: "SET NULL",
        onUpdate: "CASCADE",
      });
      await queryInterface.addIndex("company_production_targets", ["company_structure_id"], {
        name: "idx_comp_prod_targets_structure",
      });
    }

    if (!targetTableDesc.submission_notes) {
      await queryInterface.addColumn("company_production_targets", "submission_notes", {
        type: DataTypes.TEXT,
        allowNull: true,
      });
    }

    if (!targetTableDesc.review_comments) {
      await queryInterface.addColumn("company_production_targets", "review_comments", {
        type: DataTypes.TEXT,
        allowNull: true,
      });
    }

    if (!targetTableDesc.submitted_by) {
      await queryInterface.addColumn("company_production_targets", "submitted_by", {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: "users",
          key: "user_id",
        },
        onDelete: "SET NULL",
        onUpdate: "CASCADE",
      });
    }

    if (!targetTableDesc.submitted_at) {
      await queryInterface.addColumn("company_production_targets", "submitted_at", {
        type: DataTypes.DATE,
        allowNull: true,
      });
    }

    if (!targetTableDesc.reviewed_by) {
      await queryInterface.addColumn("company_production_targets", "reviewed_by", {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: "users",
          key: "user_id",
        },
        onDelete: "SET NULL",
        onUpdate: "CASCADE",
      });
    }

    if (!targetTableDesc.reviewed_at) {
      await queryInterface.addColumn("company_production_targets", "reviewed_at", {
        type: DataTypes.DATE,
        allowNull: true,
      });
    }

    // 2. Create company_production_target_approval_histories table
    const tableNames = await queryInterface.showAllTables();
    const hasHistoriesTable = tableNames.includes("company_production_target_approval_histories");

    if (!hasHistoriesTable) {
      await queryInterface.createTable("company_production_target_approval_histories", {
        history_id: {
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
        version_number: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 1,
        },
        action: {
          type: DataTypes.STRING(50),
          allowNull: false, // 'submitted', 'under_review', 'revision_requested', 'approved', 'rejected'
        },
        previous_status: {
          type: DataTypes.STRING(50),
          allowNull: true,
        },
        new_status: {
          type: DataTypes.STRING(50),
          allowNull: false,
        },
        comments: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        actor_id: {
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
      });

      await queryInterface.addIndex(
        "company_production_target_approval_histories",
        ["assignment_id", "version_number"],
        { name: "idx_comp_prod_target_history_assign_ver" }
      );
    }

    // 3. Create company_production_reporting_assignments table
    const hasRespTable = tableNames.includes("company_production_reporting_assignments");

    if (!hasRespTable) {
      await queryInterface.createTable("company_production_reporting_assignments", {
        assignment_responsibility_id: {
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
        company_structure_id: {
          type: DataTypes.UUID,
          allowNull: true,
          references: {
            model: "company_structures",
            key: "company_structure_id",
          },
          onDelete: "SET NULL",
          onUpdate: "CASCADE",
        },
        user_id: {
          type: DataTypes.UUID,
          allowNull: true,
          references: {
            model: "users",
            key: "user_id",
          },
          onDelete: "SET NULL",
          onUpdate: "CASCADE",
        },
        role_id: {
          type: DataTypes.UUID,
          allowNull: true,
          references: {
            model: "roles",
            key: "role_id",
          },
          onDelete: "SET NULL",
          onUpdate: "CASCADE",
        },
        target_version_number: {
          type: DataTypes.INTEGER,
          allowNull: true,
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

      await queryInterface.addIndex(
        "company_production_reporting_assignments",
        ["assignment_id", "company_id"],
        { name: "idx_comp_prod_resp_assign_comp" }
      );
      await queryInterface.addIndex(
        "company_production_reporting_assignments",
        ["company_structure_id"],
        { name: "idx_comp_prod_resp_structure" }
      );
      await queryInterface.addIndex(
        "company_production_reporting_assignments",
        ["user_id"],
        { name: "idx_comp_prod_resp_user" }
      );
    }

    // 4. Extend company_production_reports
    const reportTableDesc = await queryInterface.describeTable("company_production_reports");

    if (!reportTableDesc.license_id) {
      await queryInterface.addColumn("company_production_reports", "license_id", {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: "company_licenses",
          key: "license_id",
        },
        onDelete: "SET NULL",
        onUpdate: "CASCADE",
      });
      await queryInterface.addIndex("company_production_reports", ["license_id"], {
        name: "idx_comp_prod_reports_license",
      });
    }

    if (!reportTableDesc.approved_target_version) {
      await queryInterface.addColumn("company_production_reports", "approved_target_version", {
        type: DataTypes.INTEGER,
        allowNull: true,
      });
    }

    if (!reportTableDesc.company_structure_id) {
      await queryInterface.addColumn("company_production_reports", "company_structure_id", {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: "company_structures",
          key: "company_structure_id",
        },
        onDelete: "SET NULL",
        onUpdate: "CASCADE",
      });
    }

    // 5. Ensure and link permissions
    for (const perm of NEW_PERMISSIONS) {
      const permId = await ensurePermission(queryInterface, perm, now);
      // Link approve to Super Admin
      if (perm.action === "approve") {
        await linkPermissionToRole(queryInterface, SUPER_ADMIN_ROLE_ID, permId, now);
      }
      // Link responsibilities to Super Admin & Company Admin
      if (perm.resource === "company_production_responsibilities") {
        await linkPermissionToRole(queryInterface, SUPER_ADMIN_ROLE_ID, permId, now);
        await linkPermissionToRole(queryInterface, COMPANY_ADMIN_ROLE_ID, permId, now);
      }
    }
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable("company_production_reporting_assignments");
    await queryInterface.dropTable("company_production_target_approval_histories");
  },
};
