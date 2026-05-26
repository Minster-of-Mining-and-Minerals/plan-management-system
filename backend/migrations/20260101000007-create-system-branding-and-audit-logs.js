"use strict";

const {
  timestampColumns,
  safeAddIndex,
  dropTableIfExists,
} = require("./_helpers/migrationUtils");

/**
 * Baseline 07 — Branding (final column names) + audit logs.
 * Replaces: 20260501000012, 00014, 00015, 20260525000001–00004, 20260601000006 (schema half)
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const ts = timestampColumns(Sequelize);

    await queryInterface.createTable("system_branding", {
      branding_id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      system_name: { type: Sequelize.STRING(255), allowNull: false },
      system_name_am: { type: Sequelize.STRING(255), allowNull: true },
      tagline: { type: Sequelize.STRING(500), allowNull: true },
      logo_url: {
        type: Sequelize.STRING(500),
        allowNull: false,
        defaultValue: "/nova-cure-logo.png",
      },
      logo_login_url: {
        type: Sequelize.STRING(500),
        allowNull: false,
        defaultValue: "/nova-cure-logo.png",
      },
      primary_hsl: {
        type: Sequelize.STRING(100),
        allowNull: false,
        defaultValue: "201 85% 18%",
      },
      accent_hsl: {
        type: Sequelize.STRING(100),
        allowNull: false,
        defaultValue: "45, 80%, 40%",
      },
      sidebar_hover_hsl: {
        type: Sequelize.STRING(100),
        allowNull: false,
        defaultValue: "43, 85%, 55%, 10%",
      },
      accent_hover_hsl: {
        type: Sequelize.STRING(100),
        allowNull: false,
        defaultValue: "45, 80%, 40%, 90%",
      },
      theme_json: { type: Sequelize.JSONB, allowNull: true },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      ...ts,
    });

    await queryInterface.createTable("audit_logs", {
      audit_id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      actor_user_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: "users", key: "user_id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      action: { type: Sequelize.STRING(64), allowNull: false },
      resource_type: { type: Sequelize.STRING(64), allowNull: false },
      resource_id: { type: Sequelize.UUID, allowNull: true },
      details: { type: Sequelize.JSONB, allowNull: true },
      ip_address: { type: Sequelize.STRING(64), allowNull: true },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
    });

    await safeAddIndex(queryInterface, "audit_logs", ["actor_user_id"]);
    await safeAddIndex(queryInterface, "audit_logs", [
      "resource_type",
      "resource_id",
    ]);
    await safeAddIndex(queryInterface, "audit_logs", ["created_at"]);
  },

  async down(queryInterface) {
    await dropTableIfExists(queryInterface, "audit_logs");
    await dropTableIfExists(queryInterface, "system_branding");
  },
};
