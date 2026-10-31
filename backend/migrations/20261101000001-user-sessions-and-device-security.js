"use strict";

const { v4: uuidv4 } = require("uuid");
const { QueryTypes } = require("sequelize");

const SUPER_ADMIN_ROLE_ID = "00000000-0000-4000-8000-000000000002";

const SESSION_PERMISSIONS = [
  // User Self-Management
  { resource: "user_session", action: "view_own", permission_tier: "standard" },
  { resource: "user_session", action: "terminate_own", permission_tier: "standard" },
  { resource: "user_session", action: "terminate_all_own", permission_tier: "standard" },
  { resource: "user_session", action: "restrict_own_device", permission_tier: "standard" },
  { resource: "user_session", action: "unrestrict_own_device", permission_tier: "standard" },

  // Administrative Management
  { resource: "user_session", action: "view", permission_tier: "standard" },
  { resource: "user_session", action: "terminate", permission_tier: "standard" },
  { resource: "user_session", action: "terminate_all", permission_tier: "standard" },
  { resource: "user_session", action: "restrict_device", permission_tier: "standard" },
  { resource: "user_session", action: "unrestrict_device", permission_tier: "standard" },
  { resource: "user_session", action: "restrict_ip", permission_tier: "standard" },
  { resource: "user_session", action: "unrestrict_ip", permission_tier: "standard" },
  { resource: "user_session", action: "view_audit", permission_tier: "standard" },
];

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. Create user_sessions table
    await queryInterface.createTable("user_sessions", {
      session_id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "users",
          key: "user_id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      session_token_hash: {
        type: Sequelize.STRING(128),
        allowNull: false,
      },
      refresh_token_hash: {
        type: Sequelize.STRING(128),
        allowNull: true,
      },
      device_fingerprint_hash: {
        type: Sequelize.STRING(128),
        allowNull: false,
      },
      device_name: {
        type: Sequelize.STRING(150),
        allowNull: true,
      },
      device_type: {
        type: Sequelize.STRING(50),
        defaultValue: "desktop",
      },
      operating_system: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      browser: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      browser_version: {
        type: Sequelize.STRING(50),
        allowNull: true,
      },
      ip_address: {
        type: Sequelize.STRING(64),
        allowNull: false,
      },
      location: {
        type: Sequelize.STRING(150),
        allowNull: true,
      },
      user_agent: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      domain: {
        type: Sequelize.STRING(50),
        defaultValue: "federal",
      },
      organization_type: {
        type: Sequelize.STRING(50),
        allowNull: true,
      },
      organization_id: {
        type: Sequelize.UUID,
        allowNull: true,
      },
      region_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: "regions",
          key: "region_id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      company_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: "companies",
          key: "company_id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      purchasing_center_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: "purchasing_centers",
          key: "purchasing_center_id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      government_structure_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: "government_structures",
          key: "government_structure_id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      status: {
        type: Sequelize.STRING(30),
        defaultValue: "active",
        allowNull: false,
      },
      last_activity_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
        allowNull: false,
      },
      expires_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      terminated_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      terminated_by: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: "users",
          key: "user_id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      termination_reason: {
        type: Sequelize.STRING(255),
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

    await queryInterface.addIndex("user_sessions", ["user_id"], { name: "idx_user_sessions_user_id" });
    await queryInterface.addIndex("user_sessions", ["session_token_hash"], { name: "idx_user_sessions_token_hash" });
    await queryInterface.addIndex("user_sessions", ["device_fingerprint_hash"], { name: "idx_user_sessions_device_hash" });
    await queryInterface.addIndex("user_sessions", ["status"], { name: "idx_user_sessions_status" });
    await queryInterface.addIndex("user_sessions", ["ip_address"], { name: "idx_user_sessions_ip" });
    await queryInterface.addIndex("user_sessions", ["domain", "organization_id"], { name: "idx_user_sessions_domain" });
    await queryInterface.addIndex("user_sessions", ["user_id", "status"], { name: "idx_user_sessions_active_user" });

    // 2. Create user_device_restrictions table
    await queryInterface.createTable("user_device_restrictions", {
      restriction_id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: "users",
          key: "user_id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      device_fingerprint_hash: {
        type: Sequelize.STRING(128),
        allowNull: false,
      },
      device_name: {
        type: Sequelize.STRING(150),
        allowNull: true,
      },
      device_type: {
        type: Sequelize.STRING(50),
        allowNull: true,
      },
      operating_system: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      browser: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      domain: {
        type: Sequelize.STRING(50),
        defaultValue: "federal",
      },
      organization_type: {
        type: Sequelize.STRING(50),
        allowNull: true,
      },
      organization_id: {
        type: Sequelize.UUID,
        allowNull: true,
      },
      region_id: {
        type: Sequelize.UUID,
        allowNull: true,
      },
      company_id: {
        type: Sequelize.UUID,
        allowNull: true,
      },
      purchasing_center_id: {
        type: Sequelize.UUID,
        allowNull: true,
      },
      restriction_reason: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      restricted_by: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "users",
          key: "user_id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      restricted_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
        allowNull: false,
      },
      expires_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
        allowNull: false,
      },
      unrestricted_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      unrestricted_by: {
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
    });

    await queryInterface.addIndex("user_device_restrictions", ["device_fingerprint_hash"], { name: "idx_device_restrictions_fingerprint" });
    await queryInterface.addIndex("user_device_restrictions", ["user_id", "is_active"], { name: "idx_device_restrictions_user_active" });
    await queryInterface.addIndex("user_device_restrictions", ["domain", "organization_id", "is_active"], { name: "idx_device_restrictions_domain_active" });

    // 3. Create ip_restrictions table
    await queryInterface.createTable("ip_restrictions", {
      restriction_id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      ip_address: {
        type: Sequelize.STRING(64),
        allowNull: false,
      },
      is_cidr: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false,
      },
      domain: {
        type: Sequelize.STRING(50),
        defaultValue: "federal",
      },
      organization_type: {
        type: Sequelize.STRING(50),
        allowNull: true,
      },
      organization_id: {
        type: Sequelize.UUID,
        allowNull: true,
      },
      region_id: {
        type: Sequelize.UUID,
        allowNull: true,
      },
      company_id: {
        type: Sequelize.UUID,
        allowNull: true,
      },
      purchasing_center_id: {
        type: Sequelize.UUID,
        allowNull: true,
      },
      restriction_reason: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      restricted_by: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "users",
          key: "user_id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      restricted_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
        allowNull: false,
      },
      expires_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
        allowNull: false,
      },
      unrestricted_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      unrestricted_by: {
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
    });

    await queryInterface.addIndex("ip_restrictions", ["ip_address", "is_active"], { name: "idx_ip_restrictions_ip" });
    await queryInterface.addIndex("ip_restrictions", ["domain", "organization_id", "is_active"], { name: "idx_ip_restrictions_domain" });

    // 4. Create session_security_logs table
    await queryInterface.createTable("session_security_logs", {
      log_id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      event_type: {
        type: Sequelize.STRING(60),
        allowNull: false,
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: "users",
          key: "user_id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      actor_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: "users",
          key: "user_id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      session_id: {
        type: Sequelize.UUID,
        allowNull: true,
      },
      device_fingerprint_hash: {
        type: Sequelize.STRING(128),
        allowNull: true,
      },
      ip_address: {
        type: Sequelize.STRING(64),
        allowNull: true,
      },
      user_agent: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      domain: {
        type: Sequelize.STRING(50),
        defaultValue: "federal",
      },
      organization_id: {
        type: Sequelize.UUID,
        allowNull: true,
      },
      region_id: {
        type: Sequelize.UUID,
        allowNull: true,
      },
      company_id: {
        type: Sequelize.UUID,
        allowNull: true,
      },
      purchasing_center_id: {
        type: Sequelize.UUID,
        allowNull: true,
      },
      details: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
        allowNull: false,
      },
    });

    await queryInterface.addIndex("session_security_logs", ["user_id", "created_at"], { name: "idx_session_logs_user" });
    await queryInterface.addIndex("session_security_logs", ["actor_id", "created_at"], { name: "idx_session_logs_actor" });
    await queryInterface.addIndex("session_security_logs", ["event_type", "created_at"], { name: "idx_session_logs_event" });
    await queryInterface.addIndex("session_security_logs", ["domain", "organization_id", "created_at"], { name: "idx_session_logs_domain" });

    // 5. Seed Permissions and grant to Super Admin role
    const now = new Date();
    for (const perm of SESSION_PERMISSIONS) {
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
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable("session_security_logs");
    await queryInterface.dropTable("ip_restrictions");
    await queryInterface.dropTable("user_device_restrictions");
    await queryInterface.dropTable("user_sessions");

    for (const perm of SESSION_PERMISSIONS) {
      await queryInterface.sequelize.query(
        `DELETE FROM permissions WHERE LOWER(resource) = LOWER(:resource) AND LOWER(action) = LOWER(:action)`,
        {
          replacements: { resource: perm.resource, action: perm.action },
        }
      );
    }
  },
};

