"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class CompanyBrandingSetting extends Model {
    static associate(models) {
      CompanyBrandingSetting.belongsTo(models.Company, {
        foreignKey: "company_id",
        as: "company",
      });
    }
  }

  CompanyBrandingSetting.init(
    {
      company_branding_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      company_id: {
        type: DataTypes.UUID,
        allowNull: false,
        unique: true,
      },
      system_name_full: { type: DataTypes.STRING(255), allowNull: false },
      system_name_short: { type: DataTypes.STRING(50), allowNull: false },
      system_tagline: { type: DataTypes.STRING(255), allowNull: true },
      logo_primary_path: { type: DataTypes.STRING(500), allowNull: true },
      logo_secondary_path: { type: DataTypes.STRING(500), allowNull: true },
      favicon_path: { type: DataTypes.STRING(500), allowNull: true },
      primary_color: { type: DataTypes.STRING(7), allowNull: false, defaultValue: "#0F766E" },
      secondary_color: { type: DataTypes.STRING(7), allowNull: false, defaultValue: "#64748B" },
      accent_color: { type: DataTypes.STRING(7), allowNull: false, defaultValue: "#D97706" },
      success_color: { type: DataTypes.STRING(7), allowNull: false, defaultValue: "#16A34A" },
      warning_color: { type: DataTypes.STRING(7), allowNull: false, defaultValue: "#D97706" },
      error_color: { type: DataTypes.STRING(7), allowNull: false, defaultValue: "#DC2626" },
      info_color: { type: DataTypes.STRING(7), allowNull: false, defaultValue: "#0284C7" },
      background_color: { type: DataTypes.STRING(7), allowNull: false, defaultValue: "#FFFFFF" },
      surface_color: { type: DataTypes.STRING(7), allowNull: false, defaultValue: "#FFFFFF" },
      sidebar_color: { type: DataTypes.STRING(7), allowNull: false, defaultValue: "#FFFFFF" },
      header_color: { type: DataTypes.STRING(7), allowNull: false, defaultValue: "#FFFFFF" },
      text_primary_color: { type: DataTypes.STRING(7), allowNull: false, defaultValue: "#0F172A" },
      text_secondary_color: { type: DataTypes.STRING(7), allowNull: false, defaultValue: "#64748B" },
      border_color: { type: DataTypes.STRING(7), allowNull: false, defaultValue: "#E2E8F0" },
      sidebar_nav_hover_color: { type: DataTypes.STRING(7), allowNull: false, defaultValue: "#CCFBF1" },
      sidebar_nav_active_color: { type: DataTypes.STRING(7), allowNull: false, defaultValue: "#0F766E" },
      sidebar_nav_active_text_color: { type: DataTypes.STRING(7), allowNull: false, defaultValue: "#FFFFFF" },
      sidebar_subnav_active_color: { type: DataTypes.STRING(7), allowNull: false, defaultValue: "#CCFBF1" },
      sidebar_subnav_active_text_color: { type: DataTypes.STRING(7), allowNull: false, defaultValue: "#0F766E" },
      sidebar_header_text_color: { type: DataTypes.STRING(7), allowNull: false, defaultValue: "#0F766E" },
      toolbar_button_color: { type: DataTypes.STRING(7), allowNull: false, defaultValue: "#0F766E" },
      toolbar_button_hover_color: { type: DataTypes.STRING(7), allowNull: false, defaultValue: "#115E59" },
      toolbar_button_text_color: { type: DataTypes.STRING(7), allowNull: false, defaultValue: "#FFFFFF" },
      table_header_color: { type: DataTypes.STRING(7), allowNull: false, defaultValue: "#0F766E" },
      table_header_hover_color: { type: DataTypes.STRING(7), allowNull: false, defaultValue: "#115E59" },
      table_header_text_color: { type: DataTypes.STRING(7), allowNull: false, defaultValue: "#FFFFFF" },
    },
    {
      sequelize,
      modelName: "CompanyBrandingSetting",
      tableName: "company_branding_settings",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  return CompanyBrandingSetting;
};
