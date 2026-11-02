"use strict";

const { v4: uuidv4 } = require("uuid");
const { QueryTypes } = require("sequelize");

const SUPER_ADMIN_ROLE_ID = "00000000-0000-4000-8000-000000000002";
const REGIONAL_ADMIN_ROLE_ID = "20000000-0000-4000-8000-000000000001";

const ESCALATION_PERMISSIONS = [
  { resource: "regional_issues", action: "escalate", permission_tier: "standard" },
  { resource: "regional_issues", action: "recall_escalation", permission_tier: "standard" },
];

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. Create regional_issue_escalations table
    await queryInterface.createTable("regional_issue_escalations", {
      escalation_id: {
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
      escalation_number: {
        type: Sequelize.STRING(35),
        allowNull: false,
        unique: true,
      },
      escalated_by: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "users",
          key: "user_id",
        },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },
      escalated_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
        allowNull: false,
      },
      escalation_reason: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      requested_assistance: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      assistance_type: {
        type: Sequelize.STRING(50),
        allowNull: false,
        defaultValue: "technical_support",
      },
      escalation_priority: {
        type: Sequelize.STRING(30),
        allowNull: false,
        defaultValue: "high",
      },
      escalation_status: {
        type: Sequelize.STRING(40),
        allowNull: false,
        defaultValue: "escalated",
      },
      federal_assigned_to: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: "users",
          key: "user_id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      federal_response_summary: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      federal_action_taken: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      returned_reason: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      recalled_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      recalled_by: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: "users",
          key: "user_id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      recall_reason: {
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
      selected_attachment_ids: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: [],
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

    await queryInterface.addIndex("regional_issue_escalations", ["region_id", "escalation_status"], {
      name: "idx_escalations_region_status",
    });
    await queryInterface.addIndex("regional_issue_escalations", ["escalation_status"], {
      name: "idx_escalations_status",
    });
    await queryInterface.addIndex("regional_issue_escalations", ["regional_issue_id"], {
      name: "idx_escalations_regional_issue",
    });

    // 2. Create regional_issue_escalation_messages table
    await queryInterface.createTable("regional_issue_escalation_messages", {
      message_id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      escalation_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "regional_issue_escalations",
          key: "escalation_id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      sender_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "users",
          key: "user_id",
        },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },
      sender_scope: {
        type: Sequelize.STRING(20),
        allowNull: false,
      },
      message_type: {
        type: Sequelize.STRING(40),
        allowNull: false,
        defaultValue: "message",
      },
      message_text: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      attachments: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: [],
      },
      is_internal_federal_note: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
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

    await queryInterface.addIndex(
      "regional_issue_escalation_messages",
      ["escalation_id", "created_at"],
      { name: "idx_escalation_messages_date" }
    );

    // 3. Seed Permissions & Link to Super Admin & Regional Admin
    const now = new Date();
    for (const perm of ESCALATION_PERMISSIONS) {
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

      await assignToRole(SUPER_ADMIN_ROLE_ID);
      await assignToRole(REGIONAL_ADMIN_ROLE_ID);
    }
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable("regional_issue_escalation_messages");
    await queryInterface.dropTable("regional_issue_escalations");

    for (const perm of ESCALATION_PERMISSIONS) {
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

