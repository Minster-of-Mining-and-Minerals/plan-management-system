"use strict";

const { v4: uuidv4 } = require("uuid");
const { QueryTypes } = require("sequelize");

const SUPER_ADMIN_ROLE_ID = "00000000-0000-4000-8000-000000000002";
const REGIONAL_ADMIN_ROLE_ID = "20000000-0000-4000-8000-000000000001";
const REGIONAL_OFFICER_ROLE_ID = "20000000-0000-4000-8000-000000000002";

const REGIONAL_ISSUE_PERMISSIONS = [
  { resource: "regional_issues", action: "create", permission_tier: "standard" },
  { resource: "regional_issues", action: "read", permission_tier: "standard" },
  { resource: "regional_issues", action: "read_all", permission_tier: "standard" },
  { resource: "regional_issues", action: "edit", permission_tier: "standard" },
  { resource: "regional_issues", action: "review", permission_tier: "standard" },
  { resource: "regional_issues", action: "resolve", permission_tier: "standard" },
  { resource: "regional_issues", action: "close", permission_tier: "standard" },
  { resource: "regional_issues", action: "comment", permission_tier: "standard" },
  { resource: "regional_issues", action: "assign", permission_tier: "standard" },
  { resource: "regional_issues", action: "view_dashboard", permission_tier: "standard" },
];

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. Create regional_issues table
    await queryInterface.createTable("regional_issues", {
      regional_issue_id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      region_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "regions",
          key: "region_id",
        },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },
      regional_structure_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: "regional_structures",
          key: "regional_structure_id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      issue_number: {
        type: Sequelize.STRING(35),
        allowNull: false,
        unique: true,
      },
      title: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      issue_category_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: "issue_categories",
          key: "issue_category_id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      issue_priority_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: "issue_priorities",
          key: "issue_priority_id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      form_config_container_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: "form_config_containers",
          key: "form_config_container_id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      status: {
        type: Sequelize.STRING(30),
        allowNull: false,
        defaultValue: "submitted",
      },
      escalation_status: {
        type: Sequelize.STRING(30),
        allowNull: false,
        defaultValue: "none",
      },
      raised_by: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "users",
          key: "user_id",
        },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },
      assigned_to: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: "users",
          key: "user_id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      entity_type: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      entity_id: {
        type: Sequelize.UUID,
        allowNull: true,
      },
      current_value: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      suggested_value: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      form_data: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: {},
      },
      justification: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      response: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      rejection_reason: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      resolution_notes: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      resolved_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      closed_at: {
        type: Sequelize.DATE,
        allowNull: true,
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
    });

    await queryInterface.addIndex("regional_issues", ["region_id", "status"], {
      name: "idx_regional_issues_region_status",
    });
    await queryInterface.addIndex("regional_issues", ["region_id", "escalation_status"], {
      name: "idx_regional_issues_region_escalation",
    });
    await queryInterface.addIndex("regional_issues", ["region_id", "raised_by"], {
      name: "idx_regional_issues_region_raiser",
    });
    await queryInterface.addIndex("regional_issues", ["region_id", "assigned_to"], {
      name: "idx_regional_issues_region_assignee",
    });

    // 2. Create regional_issue_histories table
    await queryInterface.createTable("regional_issue_histories", {
      history_id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      regional_issue_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "regional_issues",
          key: "regional_issue_id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      action_type: {
        type: Sequelize.STRING(50),
        allowNull: false,
      },
      field_name: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      old_value: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      new_value: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      performed_by: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "users",
          key: "user_id",
        },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
        allowNull: false,
      },
    });

    await queryInterface.addIndex("regional_issue_histories", ["regional_issue_id", "created_at"], {
      name: "idx_reg_issue_histories_issue_date",
    });

    // 3. Create regional_issue_attachments table
    await queryInterface.createTable("regional_issue_attachments", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      regional_issue_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "regional_issues",
          key: "regional_issue_id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      attachment_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "attachments",
          key: "attachment_id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
        allowNull: false,
      },
    });

    await queryInterface.addIndex("regional_issue_attachments", ["regional_issue_id", "attachment_id"], {
      unique: true,
      name: "idx_reg_issue_attachments_unique",
    });

    // 4. Create regional_issue_comments table
    await queryInterface.createTable("regional_issue_comments", {
      comment_id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      regional_issue_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "regional_issues",
          key: "regional_issue_id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "users",
          key: "user_id",
        },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },
      comment_text: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      is_internal: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
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
    });

    await queryInterface.addIndex("regional_issue_comments", ["regional_issue_id", "created_at"], {
      name: "idx_reg_issue_comments_issue_date",
    });

    // 5. Seed Permissions & Link to Super Admin, Regional Admin, and Regional Officer Roles
    const now = new Date();
    for (const perm of REGIONAL_ISSUE_PERMISSIONS) {
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

      // Helper to assign permission to role if not present
      const assignToRole = async (roleId) => {
        const existingRolePerm = await queryInterface.sequelize.query(
          `SELECT role_permission_id FROM role_permissions WHERE role_id = :roleId AND permission_id = :permId LIMIT 1`,
          {
            replacements: { roleId, permId },
            type: QueryTypes.SELECT,
          }
        );

        if (!existingRolePerm || existingRolePerm.length === 0) {
          await queryInterface.bulkInsert("role_permissions", [
            {
              role_permission_id: uuidv4(),
              role_id: roleId,
              permission_id: permId,
              created_at: now,
              updated_at: now,
            },
          ]);
        }
      };

      // Super Admin gets all
      await assignToRole(SUPER_ADMIN_ROLE_ID);

      // Regional Admin gets all
      await assignToRole(REGIONAL_ADMIN_ROLE_ID);

      // Regional Officer gets create, read, edit, comment, view_dashboard
      if (["create", "read", "edit", "comment", "view_dashboard"].includes(perm.action)) {
        await assignToRole(REGIONAL_OFFICER_ROLE_ID);
      }
    }
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable("regional_issue_comments");
    await queryInterface.dropTable("regional_issue_attachments");
    await queryInterface.dropTable("regional_issue_histories");
    await queryInterface.dropTable("regional_issues");

    // Remove permissions
    for (const perm of REGIONAL_ISSUE_PERMISSIONS) {
      const existing = await queryInterface.sequelize.query(
        `SELECT permission_id FROM permissions WHERE LOWER(resource) = LOWER(:resource) AND LOWER(action) = LOWER(:action) LIMIT 1`,
        {
          replacements: { resource: perm.resource, action: perm.action },
          type: QueryTypes.SELECT,
        }
      );
      if (existing && existing.length > 0) {
        const permId = existing[0].permission_id;
        await queryInterface.bulkDelete("role_permissions", { permission_id: permId });
        await queryInterface.bulkDelete("permissions", { permission_id: permId });
      }
    }
  },
};
