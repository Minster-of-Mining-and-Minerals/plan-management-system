"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class BrandingSetting extends Model {
    static associate(models) {
      BrandingSetting.belongsTo(models.GovernmentStructure, {
        foreignKey: "government_structure_id",
        as: "governmentStructure",
      });
      BrandingSetting.hasMany(models.BrandingAuditLog, {
        foreignKey: "branding_setting_id",
        as: "auditLogs",
      });
    }
  }

  BrandingSetting.init(
    {
      branding_setting_id: {
        type: DataTypes.UUID,
        primaryKey: true,
      },
      government_structure_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      system_name_full: { type: DataTypes.STRING(255), allowNull: false },
      system_name_short: { type: DataTypes.STRING(50), allowNull: false },
      system_tagline: { type: DataTypes.STRING(255), allowNull: true },
      logo_primary_path: { type: DataTypes.STRING(500), allowNull: true },
      logo_secondary_path: { type: DataTypes.STRING(500), allowNull: true },
      favicon_path: { type: DataTypes.STRING(500), allowNull: true },
      primary_color: { type: DataTypes.STRING(7), allowNull: false },
      secondary_color: { type: DataTypes.STRING(7), allowNull: false },
      accent_color: { type: DataTypes.STRING(7), allowNull: false },
      success_color: { type: DataTypes.STRING(7), allowNull: false },
      warning_color: { type: DataTypes.STRING(7), allowNull: false },
      error_color: { type: DataTypes.STRING(7), allowNull: false },
      info_color: { type: DataTypes.STRING(7), allowNull: false },
      background_color: { type: DataTypes.STRING(7), allowNull: false },
      surface_color: { type: DataTypes.STRING(7), allowNull: false },
      sidebar_color: { type: DataTypes.STRING(7), allowNull: false },
      header_color: { type: DataTypes.STRING(7), allowNull: false },
      text_primary_color: { type: DataTypes.STRING(7), allowNull: false },
      text_secondary_color: { type: DataTypes.STRING(7), allowNull: false },
      border_color: { type: DataTypes.STRING(7), allowNull: false },
      sidebar_nav_hover_color: { type: DataTypes.STRING(7), allowNull: false },
      sidebar_nav_active_color: { type: DataTypes.STRING(7), allowNull: false },
      sidebar_nav_active_text_color: { type: DataTypes.STRING(7), allowNull: false },
      sidebar_subnav_active_color: { type: DataTypes.STRING(7), allowNull: false },
      sidebar_subnav_active_text_color: { type: DataTypes.STRING(7), allowNull: false },
      sidebar_header_text_color: { type: DataTypes.STRING(7), allowNull: false },
      toolbar_button_color: { type: DataTypes.STRING(7), allowNull: false },
      toolbar_button_hover_color: { type: DataTypes.STRING(7), allowNull: false },
      toolbar_button_text_color: { type: DataTypes.STRING(7), allowNull: false },
      table_header_color: { type: DataTypes.STRING(7), allowNull: false },
      table_header_hover_color: { type: DataTypes.STRING(7), allowNull: false },
      table_header_text_color: { type: DataTypes.STRING(7), allowNull: false },
    },
    {
      sequelize,
      modelName: "BrandingSetting",
      tableName: "branding_settings",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  return BrandingSetting;
};
