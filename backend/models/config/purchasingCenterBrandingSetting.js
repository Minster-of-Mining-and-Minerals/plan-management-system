"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class PurchasingCenterBrandingSetting extends Model {
    static associate(models) {
      PurchasingCenterBrandingSetting.belongsTo(models.PurchasingCenter, {
        foreignKey: "purchasing_center_id",
        as: "purchasingCenter",
      });
    }
  }

  PurchasingCenterBrandingSetting.init(
    {
      setting_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      purchasing_center_id: {
        type: DataTypes.UUID,
        allowNull: false,
        unique: true,
      },
      system_name_full: { type: DataTypes.STRING(255), allowNull: true },
      system_name_short: { type: DataTypes.STRING(100), allowNull: true },
      system_tagline: { type: DataTypes.STRING(255), allowNull: true },
      logo_primary_path: { type: DataTypes.STRING(500), allowNull: true },
      logo_secondary_path: { type: DataTypes.STRING(500), allowNull: true },
      logo_dark_path: { type: DataTypes.STRING(500), allowNull: true },
      favicon_path: { type: DataTypes.STRING(500), allowNull: true },
      primary_color: { type: DataTypes.STRING(50), allowNull: true, defaultValue: "#1e40af" },
      secondary_color: { type: DataTypes.STRING(50), allowNull: true, defaultValue: "#3b82f6" },
      accent_color: { type: DataTypes.STRING(50), allowNull: true, defaultValue: "#60a5fa" },
      success_color: { type: DataTypes.STRING(50), allowNull: true, defaultValue: "#10b981" },
      warning_color: { type: DataTypes.STRING(50), allowNull: true, defaultValue: "#f59e0b" },
      error_color: { type: DataTypes.STRING(50), allowNull: true, defaultValue: "#ef4444" },
      info_color: { type: DataTypes.STRING(50), allowNull: true, defaultValue: "#3b82f6" },
      background_color: { type: DataTypes.STRING(50), allowNull: true, defaultValue: "#f8fafc" },
      surface_color: { type: DataTypes.STRING(50), allowNull: true, defaultValue: "#ffffff" },
      sidebar_color: { type: DataTypes.STRING(50), allowNull: true, defaultValue: "#0f172a" },
      header_color: { type: DataTypes.STRING(50), allowNull: true, defaultValue: "#ffffff" },
      text_primary_color: { type: DataTypes.STRING(50), allowNull: true, defaultValue: "#0f172a" },
      text_secondary_color: { type: DataTypes.STRING(50), allowNull: true, defaultValue: "#64748b" },
      border_color: { type: DataTypes.STRING(50), allowNull: true, defaultValue: "#e2e8f0" },
      sidebar_nav_hover_color: { type: DataTypes.STRING(50), allowNull: true },
      sidebar_nav_active_color: { type: DataTypes.STRING(50), allowNull: true },
      sidebar_nav_active_text_color: { type: DataTypes.STRING(50), allowNull: true },
      sidebar_subnav_active_color: { type: DataTypes.STRING(50), allowNull: true },
      sidebar_subnav_active_text_color: { type: DataTypes.STRING(50), allowNull: true },
      sidebar_header_text_color: { type: DataTypes.STRING(50), allowNull: true },
      toolbar_button_color: { type: DataTypes.STRING(50), allowNull: true },
      toolbar_button_hover_color: { type: DataTypes.STRING(50), allowNull: true },
      toolbar_button_text_color: { type: DataTypes.STRING(50), allowNull: true },
      table_header_color: { type: DataTypes.STRING(50), allowNull: true },
      table_header_hover_color: { type: DataTypes.STRING(50), allowNull: true },
      table_header_text_color: { type: DataTypes.STRING(50), allowNull: true },
      theme_preference: { type: DataTypes.STRING(20), allowNull: true, defaultValue: "system" },
    },
    {
      sequelize,
      modelName: "PurchasingCenterBrandingSetting",
      tableName: "purchasing_center_branding_settings",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  return PurchasingCenterBrandingSetting;
};
