"use strict";

const {
  timestampColumns,
  safeAddIndex,
  dropTableIfExists,
  createTableIfNotExists,
} = require("./_helpers/migrationUtils");

/**
 * Baseline 08 — Branding & audit logs.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const ts = timestampColumns(Sequelize);

    await createTableIfNotExists(queryInterface, "system_branding", {
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
      slip_config: { type: Sequelize.JSONB, allowNull: true },
      organization_address: { type: Sequelize.STRING(500), allowNull: true },
      organization_city: { type: Sequelize.STRING(120), allowNull: true },
      organization_region: { type: Sequelize.STRING(120), allowNull: true },
      organization_country: { type: Sequelize.STRING(120), allowNull: true },
      organization_branch: { type: Sequelize.STRING(255), allowNull: true },
      contact_phone: { type: Sequelize.STRING(64), allowNull: true },
      contact_email: { type: Sequelize.STRING(255), allowNull: true },
      license_info: { type: Sequelize.STRING(500), allowNull: true },
      prescription_config: { type: Sequelize.JSONB, allowNull: true },
      prescription_signature_file: { type: Sequelize.STRING(500), allowNull: true },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      ...ts,
    });

    await createTableIfNotExists(queryInterface, "audit_logs", {
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
