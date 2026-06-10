"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("branding_settings", {
      branding_setting_id: {
        type: Sequelize.UUID,
        primaryKey: true,
        allowNull: false,
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
      system_name_full: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      system_name_short: {
        type: Sequelize.STRING(50),
        allowNull: false,
      },
      system_tagline: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      logo_primary_path: {
        type: Sequelize.STRING(500),
        allowNull: true,
      },
      logo_secondary_path: {
        type: Sequelize.STRING(500),
        allowNull: true,
      },
      favicon_path: {
        type: Sequelize.STRING(500),
        allowNull: true,
      },
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
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn("NOW"),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn("NOW"),
      },
    });

    await queryInterface.createTable("branding_audit_logs", {
      branding_audit_log_id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      branding_setting_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "branding_settings",
          key: "branding_setting_id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      changed_by: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "users",
          key: "user_id",
        },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },
      previous_values: {
        type: Sequelize.JSONB,
        allowNull: false,
      },
      new_values: {
        type: Sequelize.JSONB,
        allowNull: false,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn("NOW"),
      },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("branding_audit_logs");
    await queryInterface.dropTable("branding_settings");
  },
};
