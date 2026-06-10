"use strict";

const {
  createTableIfNotExists,
  dropTablesInOrder,
  dropIndexIfExists,
} = require("./helpers/schemaHelpers");

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await createTableIfNotExists(queryInterface, "performance_color_thresholds", {
      performance_color_threshold_id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      label: { type: Sequelize.STRING(100), allowNull: false },
      min_percentage: { type: Sequelize.INTEGER, allowNull: false },
      max_percentage: { type: Sequelize.INTEGER, allowNull: false },
      color_hex: { type: Sequelize.STRING(7), allowNull: false },
      sort_order: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
    });

    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_performance_color_thresholds_sort_order
      ON performance_color_thresholds (sort_order)
    `);
    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_performance_color_thresholds_is_active
      ON performance_color_thresholds (is_active)
    `);

    await createTableIfNotExists(queryInterface, "branding_settings", {
      branding_setting_id: { type: Sequelize.UUID, primaryKey: true, allowNull: false },
      government_structure_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: "government_structures", key: "government_structure_id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      system_name_full: { type: Sequelize.STRING(255), allowNull: false },
      system_name_short: { type: Sequelize.STRING(50), allowNull: false },
      system_tagline: { type: Sequelize.STRING(255), allowNull: true },
      logo_primary_path: { type: Sequelize.STRING(500), allowNull: true },
      logo_secondary_path: { type: Sequelize.STRING(500), allowNull: true },
      favicon_path: { type: Sequelize.STRING(500), allowNull: true },
      primary_color: { type: Sequelize.STRING(7), allowNull: false },
      secondary_color: { type: Sequelize.STRING(7), allowNull: false },
      accent_color: { type: Sequelize.STRING(7), allowNull: false },
      success_color: { type: Sequelize.STRING(7), allowNull: false },
      warning_color: { type: Sequelize.STRING(7), allowNull: false },
      error_color: { type: Sequelize.STRING(7), allowNull: false },
      info_color: { type: Sequelize.STRING(7), allowNull: false },
      background_color: { type: Sequelize.STRING(7), allowNull: false },
      surface_color: { type: Sequelize.STRING(7), allowNull: false },
      sidebar_color: { type: Sequelize.STRING(7), allowNull: false },
      header_color: { type: Sequelize.STRING(7), allowNull: false },
      text_primary_color: { type: Sequelize.STRING(7), allowNull: false },
      text_secondary_color: { type: Sequelize.STRING(7), allowNull: false },
      border_color: { type: Sequelize.STRING(7), allowNull: false },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
    });

    await createTableIfNotExists(queryInterface, "branding_audit_logs", {
      branding_audit_log_id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      branding_setting_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "branding_settings", key: "branding_setting_id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      changed_by: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "users", key: "user_id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },
      previous_values: { type: Sequelize.JSONB, allowNull: false },
      new_values: { type: Sequelize.JSONB, allowNull: false },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
    });

    await createTableIfNotExists(queryInterface, "system_audit_logs", {
      system_audit_log_id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      module: { type: Sequelize.STRING(100), allowNull: false },
      action: { type: Sequelize.STRING(50), allowNull: false },
      entity_id: { type: Sequelize.UUID, allowNull: true },
      entity_label: { type: Sequelize.STRING(255), allowNull: true },
      summary: { type: Sequelize.TEXT, allowNull: true },
      previous_values: { type: Sequelize.JSONB, allowNull: true },
      new_values: { type: Sequelize.JSONB, allowNull: true },
      changed_by: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "users", key: "user_id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },
      ip_address: { type: Sequelize.STRING(45), allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
    });

    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_system_audit_logs_module ON system_audit_logs (module)
    `);
    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_system_audit_logs_action ON system_audit_logs (action)
    `);
    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_system_audit_logs_changed_by ON system_audit_logs (changed_by)
    `);
    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_system_audit_logs_created_at ON system_audit_logs (created_at)
    `);
  },

  async down(queryInterface) {
    await dropIndexIfExists(queryInterface, "system_audit_logs", "idx_system_audit_logs_created_at");
    await dropIndexIfExists(queryInterface, "system_audit_logs", "idx_system_audit_logs_changed_by");
    await dropIndexIfExists(queryInterface, "system_audit_logs", "idx_system_audit_logs_action");
    await dropIndexIfExists(queryInterface, "system_audit_logs", "idx_system_audit_logs_module");
    await dropIndexIfExists(queryInterface, "performance_color_thresholds", "idx_performance_color_thresholds_is_active");
    await dropIndexIfExists(queryInterface, "performance_color_thresholds", "idx_performance_color_thresholds_sort_order");

    await dropTablesInOrder(queryInterface, [
      "system_audit_logs",
      "branding_audit_logs",
      "branding_settings",
      "performance_color_thresholds",
    ]);
  },
};
